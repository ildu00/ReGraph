import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { model, query, documents, top_n, return_documents } = body;

    if (!query || !documents || !Array.isArray(documents) || documents.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          message: "'query' (string) and 'documents' (non-empty array of strings) are required.",
          example: {
            model: "cohere/rerank-v3.5",
            query: "What is deep learning?",
            documents: ["Deep learning is a subset of ML...", "The weather is nice today.", "Neural networks use layers..."],
            top_n: 3,
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const n = top_n ?? documents.length;

    // Build prompt for LLM-based reranking
    const docsBlock = documents.map((d: string, i: number) => `[${i}] ${d}`).join("\n");
    const systemPrompt = `You are a document relevance scorer. Given a query and a list of documents, return a JSON array of objects sorted by relevance (most relevant first). Each object must have: "index" (original 0-based document index) and "relevance_score" (float 0-1, where 1 is most relevant). Return only the top ${n} results. Output ONLY valid JSON, no explanation.`;
    const userPrompt = `Query: ${query}\n\nDocuments:\n${docsBlock}`;

    const resp = await fetch(LOVABLE_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Rerank LLM error:", resp.status, text);

      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ error: `Rerank error (${resp.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();
    const rawContent = data.choices?.[0]?.message?.content || "[]";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let results: { index: number; relevance_score: number }[];
    try {
      results = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse rerank response:", rawContent);
      // Fallback: return documents in original order with decreasing scores
      results = documents.slice(0, n).map((_: string, i: number) => ({
        index: i,
        relevance_score: 1 - i * (1 / documents.length),
      }));
    }

    // Build Cohere-compatible response
    const responseResults = results.slice(0, n).map((r: { index: number; relevance_score: number }) => {
      const item: Record<string, unknown> = {
        index: r.index,
        relevance_score: r.relevance_score,
      };
      if (return_documents !== false && documents[r.index] !== undefined) {
        item.document = { text: documents[r.index] };
      }
      return item;
    });

    return new Response(
      JSON.stringify({
        id: "rerank-" + crypto.randomUUID().slice(0, 8),
        results: responseResults,
        meta: {
          api_version: { version: "1" },
          billed_units: { search_units: 1 },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("rerank error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
