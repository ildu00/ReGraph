import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_MAP: Record<string, string> = {
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

    // Build a single combined prompt with all items numbered
    const numberedPrompts = prompts
      .map((p: string, i: number) => `${i + 1}. ${p}`)
      .join("\n");

    const userMessage = `Answer each of the following ${prompts.length} questions/tasks. For each one, start your answer with the exact header "## ${prompts.length > 1 ? '{number}' : '1'}. {original question}" and provide a thorough response below it. Separate each answer clearly.\n\n${numberedPrompts}`;

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
        body.max_completion_tokens = 16384;
      } else {
        body.max_tokens = 16384;
      }
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
        if (resp.status === 429) {
          return { error: "Rate limited. Please try again later.", latency: 0 };
        }
        if (resp.status === 402) {
          return { error: "Usage limit reached.", latency: 0 };
        }
        const text = await resp.text();
        console.error(`Model ${model} error:`, resp.status, text);
        return { error: `Model error (${resp.status})`, latency: 0 };
      }

      const data = await resp.json();
      const latency = Date.now() - start;
      const content = data.choices?.[0]?.message?.content || "";
      const finishReason = data.choices?.[0]?.finish_reason || "unknown";
      const tokens = data.usage?.total_tokens || 0;
      console.log(`Model ${model}: finish_reason=${finishReason}, content_length=${content.length}, tokens=${tokens}`);
      if (!content && finishReason !== "stop") {
        return { error: `Model returned empty response (finish_reason: ${finishReason})`, latency };
      }
      return { content, latency, tokens };
    };

    const [regraphResult, compareResult] = await Promise.all([
      makeRequest(
        REGRAPH_MODEL,
        "You are ReGraph LLM, a state-of-the-art AI model trained on 4.2T tokens with continuous daily updates. You are highly knowledgeable, accurate, concise, and helpful. Respond in the same language as the user's prompt. Use markdown formatting."
      ),
      makeRequest(
        gatewayModel,
        "You are a helpful AI assistant. Respond in the same language as the user's prompt. Use markdown formatting."
      ),
    ]);

    return new Response(
      JSON.stringify({
        regraph: regraphResult,
        compare: compareResult,
      }),
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
