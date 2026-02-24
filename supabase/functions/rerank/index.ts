import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VSEGPT_GATEWAY = "https://api.vsegpt.ru/v1/rerank";

// Map catalog model names to VseGPT-compatible identifiers
const modelMapping: Record<string, string> = {
  // Cohere
  "cohere/rerank-v3.5": "rerank-cohere/rerank-english-v3.0",
  "cohere/rerank-english-v3.0": "rerank-cohere/rerank-english-v3.0",
  "cohere/rerank-multilingual-v3.0": "rerank-cohere/rerank-multilingual-v3.0",
  "rerank-english-v3.0": "rerank-cohere/rerank-english-v3.0",
  "rerank-multilingual-v3.0": "rerank-cohere/rerank-multilingual-v3.0",
  "rerank-v3.5": "rerank-cohere/rerank-english-v3.0",
  // Jina
  "jina/jina-reranker-v2": "rerank-jina/jina-reranker-v2-base-multilingual",
  "jina-reranker-v2": "rerank-jina/jina-reranker-v2-base-multilingual",
  "jina/jina-reranker-v2-base-multilingual": "rerank-jina/jina-reranker-v2-base-multilingual",
  // BAAI BGE
  "baai/bge-reranker-v2-m3": "rerank-cohere/rerank-english-v3.0",
  "bge-reranker-v2-m3": "rerank-cohere/rerank-english-v3.0",
};

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

    const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY");
    if (!VSEGPT_API_KEY) throw new Error("VSEGPT_API_KEY is not configured");

    // Resolve model name (case-insensitive)
    const modelInput = model || "cohere/rerank-v3.5";
    const modelLower = modelInput.toLowerCase();
    let resolvedModel: string | undefined;
    for (const [key, value] of Object.entries(modelMapping)) {
      if (key.toLowerCase() === modelLower) {
        resolvedModel = value;
        break;
      }
    }
    if (!resolvedModel) {
      // Default fallback
      resolvedModel = "rerank-cohere/rerank-english-v3.0";
    }

    const upstreamBody: Record<string, unknown> = {
      model: resolvedModel,
      query,
      documents,
    };
    if (top_n !== undefined) upstreamBody.top_n = top_n;
    if (return_documents !== undefined) upstreamBody.return_documents = return_documents;

    const resp = await fetch(VSEGPT_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VSEGPT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(upstreamBody),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Rerank upstream error:", resp.status, text);
      return new Response(
        JSON.stringify({ error: `Upstream rerank error (${resp.status})`, details: text }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();

    // Return Cohere-compatible response format
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rerank error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
