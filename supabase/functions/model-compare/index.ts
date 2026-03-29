import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// External models available for comparison
const EXTERNAL_MODELS: Record<string, string> = {
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4o": "openai/gpt-4o",
  "gpt-5": "openai/gpt-5",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "llama-3-70b": "meta-llama/llama-3-70b-instruct",
  "gemini-2.5-pro": "google/gemini-2.5-pro",
};

const REGRAPH_MODEL = "google/gemini-3-flash-preview";
const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const EXTERNAL_GATEWAY = "https://api.vsegpt.ru/v1/chat/completions";

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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const PROVIDER_API_KEY = Deno.env.get("VSEGPT_API_KEY");
    if (!PROVIDER_API_KEY) throw new Error("VSEGPT_API_KEY is not configured");

    const externalModel = EXTERNAL_MODELS[compareModel];
    if (!externalModel) {
      return new Response(
        JSON.stringify({ error: `Unknown model: ${compareModel}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numberedList = prompts.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n");
    const userMessage = `Answer each question below briefly (2-3 sentences max per answer). Number your answers to match.\n\n${numberedList}`;
    const systemBase = "Answer concisely. Use markdown. Number each answer. Respond in the same language as each question.";

    // ReGraph LLM via Lovable AI Gateway
    const makeRegraphRequest = async () => {
      const start = Date.now();
      const resp = await fetch(LOVABLE_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: REGRAPH_MODEL,
          messages: [
            { role: "system", content: `You are ReGraph LLM. ${systemBase}` },
            { role: "user", content: userMessage },
          ],
          max_tokens: 4096,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error("ReGraph error:", resp.status, text);
        return { error: `ReGraph error (${resp.status})`, latency: 0 };
      }

      const data = await resp.json();
      return {
        content: data.choices?.[0]?.message?.content || "",
        latency: Date.now() - start,
        tokens: data.usage?.total_tokens || 0,
      };
    };

    // Competitor model via external provider
    const makeExternalRequest = async () => {
      const start = Date.now();
      const resp = await fetch(EXTERNAL_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PROVIDER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: externalModel,
          messages: [
            { role: "system", content: `You are a helpful AI assistant. ${systemBase}` },
            { role: "user", content: userMessage },
          ],
          max_tokens: 4096,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`Model ${externalModel} error:`, resp.status, text);
        return { error: `Model error (${resp.status})`, latency: 0 };
      }

      const data = await resp.json();
      return {
        content: data.choices?.[0]?.message?.content || "",
        latency: Date.now() - start,
        tokens: data.usage?.total_tokens || 0,
      };
    };

    const [regraphResult, compareResult] = await Promise.all([
      makeRegraphRequest(),
      makeExternalRequest(),
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
