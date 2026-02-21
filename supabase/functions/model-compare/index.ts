import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_MAP: Record<string, string> = {
  "gpt-4o-mini": "openai/gpt-5-nano",
  "gpt-4o": "openai/gpt-5-mini",
  "gpt-5": "openai/gpt-5",
  "claude-3.5-sonnet": "google/gemini-2.5-flash",
  "llama-3-70b": "google/gemini-2.5-flash-lite",
  "gemini-2.5-pro": "google/gemini-2.5-pro",
};

const REGRAPH_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompts, compareModel } = await req.json();

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0 || !compareModel) {
      return new Response(
        JSON.stringify({ error: "prompts (array) and compareModel are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const gatewayModel = MODEL_MAP[compareModel];
    if (!gatewayModel) {
      return new Response(
        JSON.stringify({ error: `Unknown model: ${compareModel}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numberedList = prompts.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n");

    const userMessage = `Answer each question below briefly (2-3 sentences max per answer). Number your answers to match.\n\n${numberedList}`;

    const systemBase = "Answer concisely. Use markdown. Number each answer. Respond in the same language as each question.";

    const makeRequest = async (model: string, systemPrompt: string) => {
      const start = Date.now();
      const body: Record<string, unknown> = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      };

      if (model.startsWith("openai/")) {
        body.max_completion_tokens = 4096;
      } else {
        body.max_tokens = 4096;
      }

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        if (resp.status === 429) return { error: "Rate limited. Try again later.", latency: 0 };
        if (resp.status === 402) return { error: "Usage limit reached.", latency: 0 };
        const text = await resp.text();
        console.error(`Model ${model} error:`, resp.status, text);
        return { error: `Model error (${resp.status})`, latency: 0 };
      }

      const data = await resp.json();
      const latency = Date.now() - start;
      const content = data.choices?.[0]?.message?.content || "";
      const tokens = data.usage?.total_tokens || 0;
      return { content, latency, tokens };
    };

    const [regraphResult, compareResult] = await Promise.all([
      makeRequest(REGRAPH_MODEL, `You are ReGraph LLM. ${systemBase}`),
      makeRequest(gatewayModel, `You are a helpful AI assistant. ${systemBase}`),
    ]);

    return new Response(
      JSON.stringify({ regraph: regraphResult, compare: compareResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("model-compare error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
