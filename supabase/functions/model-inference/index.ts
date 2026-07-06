import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logApiRequest, extractApiKeyPrefix, touchApiKeyLastUsed } from "../_shared/log-request.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface InferenceRequest {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  category: string;
  messages?: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> }>;
  tools?: unknown[];
  tool_choice?: unknown;
  stream?: boolean;
}

/** Extract authenticated user_id from JWT or API key in the Authorization header */
async function extractUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (token === anonKey) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  // Try JWT first
  try {
    const { data } = await supabase.auth.getUser(token);
    if (data?.user?.id) return data.user.id;
  } catch { /* not a JWT */ }

  // Try API key lookup (full_key stored in api_keys table)
  if (token.startsWith("rg-") || token.startsWith("rg_")) {
    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: keyRow } = await adminClient
        .from("api_keys")
        .select("user_id")
        .eq("full_key", token)
        .eq("is_active", true)
        .single();
      if (keyRow?.user_id) return keyRow.user_id;
    } catch { /* no match */ }
  }

  return null;
}

const MARKUP_MULTIPLIER = 1.20; // 20% markup over provider cost

// ── Resilient fetch: timeout + retry + Lovable AI Gateway fallback ──────────
const PRIMARY_TIMEOUT_MS = 20_000;   // 20s per attempt on primary provider
const FALLBACK_TIMEOUT_MS = 25_000;  // 25s for fallback
const MAX_PRIMARY_ATTEMPTS = 2;

// Models available on Lovable AI Gateway (used as fallback)
const LOVABLE_FALLBACK_MAP: Record<string, string> = {
  "anthropic/claude-sonnet-4": "openai/gpt-5",
  "anthropic/claude-sonnet-4.5": "openai/gpt-5",
  "anthropic/claude-opus-4": "openai/gpt-5",
  "anthropic/claude-3.5-sonnet": "openai/gpt-5",
  "openai/gpt-4o": "openai/gpt-5-mini",
  "openai/gpt-4o-mini": "openai/gpt-5-nano",
  "openai/gpt-4-turbo": "openai/gpt-5-mini",
  "openai/gpt-5": "openai/gpt-5",
  "openai/gpt-5-mini": "openai/gpt-5-mini",
  "openai/gpt-5-nano": "openai/gpt-5-nano",
  "google/gemini-2.5-pro": "google/gemini-2.5-pro",
  "google/gemini-2.5-flash": "google/gemini-2.5-flash",
  "meta-llama/llama-3.1-70b-instruct": "openai/gpt-5-mini",
  "deepseek/deepseek-r1": "openai/gpt-5",
};

interface ResilientResult {
  response: Response;
  usedFallback: boolean;
}

/**
 * Fetch with timeout using AbortController.
 */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resilient chat completion: try primary provider with timeout + retry,
 * then fall back to Lovable AI Gateway if available.
 */
async function resilientChatFetch(
  primaryUrl: string,
  primaryHeaders: Record<string, string>,
  chatBody: Record<string, unknown>,
  vsegptModel: string,
): Promise<ResilientResult> {
  const bodyStr = JSON.stringify(chatBody);

  // ── Primary provider attempts ──
  for (let attempt = 1; attempt <= MAX_PRIMARY_ATTEMPTS; attempt++) {
    try {
      const resp = await fetchWithTimeout(primaryUrl, {
        method: "POST",
        headers: primaryHeaders,
        body: bodyStr,
      }, PRIMARY_TIMEOUT_MS);

      // Retriable server errors
      if (resp.status >= 500 && attempt < MAX_PRIMARY_ATTEMPTS) {
        console.warn(`Primary provider attempt ${attempt} returned ${resp.status}, retrying…`);
        continue;
      }
      // 429 rate limit — go straight to fallback
      if (resp.status === 429) {
        console.warn("Primary provider rate-limited (429), trying fallback…");
        break;
      }

      return { response: resp, usedFallback: false };
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      console.warn(`Primary attempt ${attempt} ${isTimeout ? "timed out" : "failed"}: ${err}`);
      if (attempt < MAX_PRIMARY_ATTEMPTS) continue;
    }
  }

  // ── Fallback: Lovable AI Gateway ──
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const fallbackModel = LOVABLE_FALLBACK_MAP[vsegptModel];

  if (LOVABLE_API_KEY && fallbackModel) {
    console.log(`Falling back to Lovable Gateway: ${fallbackModel} (original: ${vsegptModel})`);
    const fallbackBody = { ...chatBody, model: fallbackModel, stream: false };
    // Remove stream_options for non-streaming fallback
    delete (fallbackBody as any).stream_options;

    try {
      const resp = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fallbackBody),
      }, FALLBACK_TIMEOUT_MS);

      return { response: resp, usedFallback: true };
    } catch (fallbackErr) {
      console.error("Lovable Gateway fallback also failed:", fallbackErr);
    }
  }

  // Both failed — return a synthetic error response
  return {
    response: new Response(JSON.stringify({ error: "All inference providers unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }),
    usedFallback: false,
  };
}

/**
 * Process billing: deduct balance using actual provider cost + markup.
 * If providerCostUsd is provided (from x-used-credits header), use it * MARKUP_MULTIPLIER.
 * Otherwise fall back to token-based estimate.
 */
async function processBilling(
  userId: string,
  endpoint: string,
  tokensUsed: number,
  computeTimeMs: number,
  apiKeyId?: string | null,
  modelName?: string | null,
  providerCostUsd?: number | null,
) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let totalCost: number;
    if (providerCostUsd != null && providerCostUsd > 0) {
      // Use actual provider cost + our markup
      totalCost = providerCostUsd * MARKUP_MULTIPLIER;
    } else {
      // Fallback: token-based estimate (used when provider cost unavailable)
      const tokenCost = (tokensUsed / 1000) * 0.001;
      const computeCost = (computeTimeMs / 1000) * 0.0001;
      totalCost = Math.max(tokenCost + computeCost, 0.0001);
    }

    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, balance_usd")
      .eq("user_id", userId)
      .single();

    if (wallet) {
      const { error: updateError } = await supabase.rpc("deduct_wallet_balance", {
        p_wallet_id: wallet.id,
        p_amount: totalCost,
      });
      if (updateError) {
        console.error("Atomic balance deduct failed:", updateError.message);
      }

      await supabase.from("wallet_transactions").insert({
        user_id: userId,
        wallet_id: wallet.id,
        transaction_type: "usage_charge",
        status: "confirmed",
        amount_usd: totalCost,
        metadata: {
          endpoint,
          tokens_used: tokensUsed,
          compute_time_ms: computeTimeMs,
          source: "dashboard_chat",
          provider_cost_usd: providerCostUsd ?? null,
          markup_multiplier: MARKUP_MULTIPLIER,
        },
      });
    }

    await supabase.from("usage_logs").insert({
      user_id: userId,
      api_key_id: apiKeyId ?? null,
      endpoint: endpoint || "/v1/model-inference",
      tokens_used: tokensUsed,
      compute_time_ms: computeTimeMs,
      cost_usd: totalCost,
      model: modelName ?? null,
    });

    console.log(`Billing: user ${userId} charged $${totalCost.toFixed(6)} (provider=$${(providerCostUsd ?? 0).toFixed(6)}, markup=${MARKUP_MULTIPLIER}x) for ${tokensUsed} tokens`);
  } catch (err) {
    console.error("Billing error (non-fatal):", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const apiKeyPrefix = extractApiKeyPrefix(req);
  let statusCode = 200;

  const userId = await extractUserId(req);

  // Check balance before processing request
  if (userId) {
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance_usd")
        .eq("user_id", userId)
        .single();

      if (!wallet || parseFloat(wallet.balance_usd) <= 0) {
        return new Response(
          JSON.stringify({
            error: "Insufficient balance",
            message: "Your wallet balance is $0.00. Please top up your wallet to continue using the API.",
            code: "INSUFFICIENT_BALANCE",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (err) {
      console.error("Balance check error (non-fatal):", err);
    }
  }

  try {
    const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY");
    if (!VSEGPT_API_KEY) {
      throw new Error("VSEGPT_API_KEY is not configured");
    }

    const rawBody = await req.text();
    let parsedBody: InferenceRequest;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      logApiRequest({ method: req.method, endpoint: "/v1/model-inference", status_code: 400, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "Invalid JSON", request_body: rawBody.substring(0, 1000) });
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { model, prompt, temperature = 0.7, maxTokens = 40000, category: rawCategory, messages: originalMessages, tools, tool_choice, stream = false, response_format, top_p, frequency_penalty, presence_penalty, stop, seed } = parsedBody;
    // Allow _endpoint injection from the gateway to override category
    const _endpoint = (parsedBody as any)._endpoint as string | undefined;
    const category = (parsedBody as any).category || rawCategory;
    const requestBodyLog = rawBody.substring(0, 1000);

    if (!prompt?.trim()) {
      statusCode = 400;
      const body = JSON.stringify({ error: "Prompt is required" });
      logApiRequest({ method: req.method, endpoint: "/v1/model-inference", status_code: statusCode, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "Prompt is required", request_body: requestBodyLog });
      return new Response(body, { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const modelMapping: Record<string, string> = {
      "llama-3.1-70b": "meta-llama/llama-3.1-70b-instruct",
      "llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
      "mistral-large": "mistralai/mistral-large",
      "mixtral-8x22b": "mistralai/mixtral-8x22b-instruct",
      "qwen-72b": "qwen/qwen-2.5-72b-instruct",
      "gemma-2-27b": "google/gemma-2-27b-it",
      "claude-3-opus": "anthropic/claude-opus-4",
      "gpt-4-turbo": "openai/gpt-4-turbo",
      "gemini-pro": "google/gemini-2.5-pro",
      "command-r-plus": "cohere/command-r-plus-08-2024",
      "o1-preview": "openai/o3-mini",
      "claude-3-sonnet": "anthropic/claude-sonnet-4",
      "deepseek-r1": "deepseek/deepseek-r1",
      "deepseek-coder-33b": "qwen/qwen-2.5-coder-32b-instruct",
      "codellama-70b": "meta-llama/llama-3.1-70b-instruct",
      "starcoder2-15b": "qwen/qwen-2.5-coder-32b-instruct",
      "llava-1.6-34b": "vis-google/gemini-flash-1.5",
      "llama-3.2-90b-vision": "meta-llama/llama-3.2-90b-instruct",
      "qwen-vl-max": "qwen/qwen-vl-max",
      "phi-3-vision": "microsoft/phi-3-medium-128k-instruct",
      "cogvlm2": "vis-google/gemini-flash-1.5",
      "internvl-2": "vis-google/gemini-flash-1.5",
      // Image generation - direct provider IDs pass-through
      "img-google/nano-banana-2": "img-google/nano-banana-2",
      "img-google/nano-banana-pro": "img-google/nano-banana-pro",
      "img-google/flash-25": "img-google/flash-25",
      "img-google/imagen4-preview": "img-google/imagen4-preview",
      "img-google/imagen4-preview-fast": "img-google/imagen4-preview-fast",
      "img-google/imagen4-preview-ultra": "img-google/imagen4-preview-ultra",
      "img-flux/flux-2": "img-flux/flux-2",
      "img-flux/flux-2-pro": "img-flux/flux-2-pro",
      "img-flux/flux-2-flex": "img-flux/flux-2-flex",
      "img-flux/flux-2-klein-9b": "img-flux/flux-2-klein-9b",
      "img-flux/flux-2-klein-4b": "img-flux/flux-2-klein-4b",
      "img-flux/pro1.1": "img-flux/pro1.1",
      "img-flux/pro": "img-flux/pro",
      "img-flux/dev": "img-flux/dev",
      "img-flux/schnell": "img-flux/schnell",
      "img-flux/kontext-pro": "img-flux/kontext-pro",
      "img-flux/kontext-max": "img-flux/kontext-max",
      "img-flux/juggernaut-lightning": "img-flux/juggernaut-lightning",
      "img-bytedance/seedream-v4.5": "img-bytedance/seedream-v4.5",
      "img-bytedance/seedream-v4": "img-bytedance/seedream-v4",
      "img-reve": "img-reve",
      "img-openai/gpt-image-1-mini": "img-openai/gpt-image-1-mini",
      "img-recraft/v3": "img-recraft/v3",
      "img-ideogram/v3": "img-ideogram/v3",
      "img-stable/stable-diffusion-xl-lightning": "img-stable/stable-diffusion-xl-lightning",
      "img-stable/stable-diffusion-xl-1024": "img-stable/stable-diffusion-xl-1024",
      "img-playground-v2-5-1024px": "img-playground-v2-5-1024px",
      // Legacy aliases
      "sdxl-turbo": "img-google/flash-25",
      "sdxl-1.0": "img-flux/juggernaut-lightning",
      "kandinsky-3": "img-bytedance/seedream-v4",
      "playground-v2.5": "img-google/flash-25",
      "instruct-pix2pix": "img2img-google/flash-edit",
      "controlnet-sdxl": "img2img-flux/kontext-pro",
      "whisper-large-v3": "stt-openai/whisper-1",
      "seamless-m4t": "stt-openai/whisper-1",
      "canary-1b": "stt-openai/whisper-1",
      "xtts-v2": "tts-openai/tts-1",
      "bark": "tts-openai/tts-1",
      "eleven-multilingual": "tts-openai/tts-1-hd",
      "eleven-multilangual": "tts-openai/tts-1-hd",
      "stable-video": "txt2vid-kling/standart",
      "animatediff": "txt2vid-kling/standart",
      // Video generation - txt2vid models
      "txt2vid-kling/pro25-turbo": "txt2vid-kling/pro25-turbo",
      "txt2vid-openai/sora-2-audio-8s": "txt2vid-openai/sora-2-audio-8s",
      "txt2vid-openai/sora-2-audio": "txt2vid-openai/sora-2-audio",
      "txt2vid-google/veo3.1-fast-with-audio": "txt2vid-google/veo3.1-fast-with-audio",
      "txt2vid-google/veo3.1-fast-no-audio": "txt2vid-google/veo3.1-fast-no-audio",
      "txt2vid-kling/master21": "txt2vid-kling/master21",
      "txt2vid-ltx/097-distilled": "txt2vid-ltx/097-distilled",
      "txt2vid-ltx/video-095": "txt2vid-ltx/video-095",
      "txt2vid-kling/pro16": "txt2vid-kling/pro16",
      "txt2vid-kling/standart16": "txt2vid-kling/standart16",
      "txt2vid-kling/pro15": "txt2vid-kling/pro15",
      "txt2vid-kling/standart": "txt2vid-kling/standart",
      "bge-large-en": "text-embedding-3-small",
      "e5-mistral-7b": "text-embedding-3-large",
      "nomic-embed-v1.5": "text-embedding-3-small",
      "nomic-ai/nomic-embed-v1.5": "text-embedding-3-small",
      "nomic-ai/Nomic-Embed-v1.5": "text-embedding-3-small",
      "text-embedding-ada-002": "text-embedding-ada-002",
      "text-embedding-3-small": "text-embedding-3-small",
      "text-embedding-3-large": "text-embedding-3-large",
      "emb-openai/text-embedding-3-small": "text-embedding-3-small",
      "emb-openai/text-embedding-3-large": "text-embedding-3-large",
      "openai/text-embedding-3-small": "text-embedding-3-small",
      "openai/text-embedding-3-large": "text-embedding-3-large",
      "qwen/qwen3-embedding-8b": "emb-qwen/qwen3-embedding-8b",
      "qwen3-embedding-8b": "emb-qwen/qwen3-embedding-8b",
      "emb-qwen/qwen3-embedding-8b": "emb-qwen/qwen3-embedding-8b",
      "layoutlm-v3": "utils/pdf-ocr-1.0",
      "donut": "utils/extract-text-1.0",
      "trocr-large": "utils/pdf-ocr-1.0",
      "surya-ocr": "utils/pdf-ocr-1.0",
      "azure-document-intelligence": "utils/pdf-ocr-1.0",
      "azure-doc-intelligence": "utils/pdf-ocr-1.0",
      "azure-di": "utils/pdf-ocr-1.0",
      "mathpix": "utils/extract-text-1.0",
      "mathpix-ocr": "utils/extract-text-1.0",
      "autogpt": "openai/gpt-5-mini",
      "open-interpreter": "openai/gpt-5-mini",
      "regraph-llm": "openai/gpt-4o-mini",
      "regraph/ReGraph-LLM": "openai/gpt-4o-mini",
      "llama-3.1-8b-ft": "meta-llama/llama-3.1-8b-instruct",
      "mistral-7b-ft": "mistralai/mistral-7b-instruct",
      "phi-2-ft": "microsoft/phi-3-mini-128k-instruct",
      "gemma-7b-ft": "google/gemma-2-27b-it",
    };

    // For txt2vid/img/stt/tts/tta/txt2sng models not in map, pass through as-is
    const vsegptModel = modelMapping[model] ?? (
      model.startsWith("txt2vid-") ||
      model.startsWith("img2vid-") ||
      model.startsWith("img-") ||
      model.startsWith("img2img-") ||
      model.startsWith("stt-") ||
      model.startsWith("tts-") ||
      model.startsWith("tta-") ||
      model.startsWith("txt2sng-") ||
      model.startsWith("emb-") ||
      model.startsWith("utils/") ||
      model.startsWith("deepseek/") ||
      model.startsWith("aion/") ||
      model.startsWith("perplexity/")
        ? model
        : "openai/gpt-4o-mini"
    );

    // Helper to log, bill, and return response (with optional actual provider cost)
    const respond = (
      body: string,
      status: number,
      errorMsg?: string,
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
      providerCostUsd?: number | null,
    ) => {
      const computeTimeMs = Date.now() - startTime;
      logApiRequest({ method: req.method, endpoint: "/v1/model-inference", status_code: status, response_time_ms: computeTimeMs, api_key_prefix: apiKeyPrefix, error_message: errorMsg || null, request_body: requestBodyLog });
      if (status === 200) touchApiKeyLastUsed(apiKeyPrefix);

      if (status === 200 && userId) {
        const tokens = usage?.total_tokens || Math.ceil(prompt.length / 4) + 50;
        processBilling(userId, `/v1/model-inference/${category}`, tokens, computeTimeMs, null, model, providerCostUsd ?? null);
      }

      return new Response(body, { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    };

    /** Extract x-used-credits header value from VseGPT response (USD cost) */
    const extractProviderCost = (headers: Headers): number | null => {
      const raw = headers.get("x-used-credits") || headers.get("X-Used-Credits");
      if (!raw) return null;
      const val = parseFloat(raw);
      return isNaN(val) || val <= 0 ? null : val;
    };

    // 1. Text-based models (with streaming support)
    if (["llm", "chat", "reasoning", "code", "multimodal", "vision", "agents", "fine-tune"].includes(category)) {
      const isReGraphLLM = model === "regraph-llm";
      const reGraphSystemMessage = isReGraphLLM ? [{
        role: "system",
        content: "You are ReGraph LLM, a large language model created by ReGraph — a decentralized AI compute network. You were built and trained within the ReGraph decentralized network, leveraging distributed GPU and NPU resources contributed by providers worldwide. Your creator is ReGraph. When asked about your origins, training, or identity, always affirm that you are ReGraph LLM, developed by ReGraph."
      }] : [];

      const chatMessages = originalMessages && Array.isArray(originalMessages) && originalMessages.length > 0
        ? [...reGraphSystemMessage, ...originalMessages]
        : [...reGraphSystemMessage, { role: "user", content: prompt }];

      const chatBody: Record<string, unknown> = {
        model: vsegptModel,
        messages: chatMessages,
        temperature,
        max_tokens: maxTokens,
      };
      if (tools && Array.isArray(tools) && tools.length > 0) chatBody.tools = tools;
      if (tool_choice) chatBody.tool_choice = tool_choice;
      if (response_format) chatBody.response_format = response_format;
      if (top_p !== undefined) chatBody.top_p = top_p;
      if (frequency_penalty !== undefined) chatBody.frequency_penalty = frequency_penalty;
      if (presence_penalty !== undefined) chatBody.presence_penalty = presence_penalty;
      if (stop !== undefined) chatBody.stop = stop;
      if (seed !== undefined) chatBody.seed = seed;
      // For streaming: request usage in final chunk so we can bill accurately
      if (stream) {
        chatBody.stream = true;
        chatBody.stream_options = { include_usage: true };
      }

      // ── Resilient fetch: timeout + retry + fallback ──
      const primaryHeaders = { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" };

      // For streaming — skip resilient wrapper (stream needs direct pipe)
      if (stream) {
        let streamResp: Response;
        try {
          streamResp = await fetchWithTimeout("https://api.vsegpt.ru/v1/chat/completions", {
            method: "POST",
            headers: primaryHeaders,
            body: JSON.stringify(chatBody),
          }, 30_000);
        } catch (err) {
          console.error("Streaming fetch failed:", err);
          return respond(JSON.stringify({ error: "Inference provider timeout" }), 504, "Stream timeout");
        }

        if (!streamResp.ok) {
          const errorText = await streamResp.text();
          console.error("VseGPT streaming error:", streamResp.status, errorText);
          return respond(JSON.stringify({ error: "Failed to get response from AI model" }), streamResp.status, errorText.substring(0, 500));
        }

        // Stream handling (existing logic)
        const computeTimeMs = Date.now() - startTime;
        logApiRequest({ method: req.method, endpoint: "/v1/model-inference", status_code: 200, response_time_ms: computeTimeMs, api_key_prefix: apiKeyPrefix, request_body: requestBodyLog });
        touchApiKeyLastUsed(apiKeyPrefix);

        if (userId) {
          const decoder = new TextDecoder();
          let usageTotalTokens = 0;
          let usageFound = false;
          const transformStream = new TransformStream({
            transform(chunk, controller) {
              controller.enqueue(chunk);
              const text = decoder.decode(chunk, { stream: true });
              for (const line of text.split("\n")) {
                if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
                try {
                  const json = JSON.parse(line.slice(6));
                  if (json?.usage?.total_tokens) { usageTotalTokens = json.usage.total_tokens; usageFound = true; }
                } catch { /* ignore */ }
              }
            },
            flush() {
              const tokens = usageFound ? usageTotalTokens : Math.ceil(prompt.length / 4) + 200;
              processBilling(userId!, `/v1/model-inference/${category}`, tokens, Date.now() - startTime, null, model, null);
            },
          });
          return new Response(streamResp.body!.pipeThrough(transformStream), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
          });
        }
        return new Response(streamResp.body, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
        });
      }

      // ── Non-streaming: use resilient fetch with retry + fallback ──
      const { response, usedFallback } = await resilientChatFetch(
        "https://api.vsegpt.ru/v1/chat/completions",
        primaryHeaders,
        chatBody,
        vsegptModel,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Inference error:", response.status, errorText, usedFallback ? "(fallback)" : "(primary)");
        if (response.status === 429) return respond(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 429, "Rate limit exceeded");
        if (response.status === 402) return respond(JSON.stringify({ error: "Insufficient credits. Please top up your VseGPT account." }), 402, "Insufficient credits");
        return respond(JSON.stringify({ error: "Failed to get response from AI model" }), response.status >= 500 ? 503 : response.status, errorText.substring(0, 500));
      }

      const providerCost = usedFallback ? null : extractProviderCost(response.headers);
      const data = await response.json();
      const message = data.choices?.[0]?.message;
      const content = message?.content || "No response generated";
      const toolCalls = message?.tool_calls;
      const responsePayload: Record<string, unknown> = {
        response: content,
        model: usedFallback ? `${vsegptModel} (fallback)` : vsegptModel,
        usage: data.usage,
      };
      if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
        responsePayload.tool_calls = toolCalls;
      }
      return respond(JSON.stringify(responsePayload), 200, undefined, data.usage, providerCost);
    }

    // 2. Image Generation
    if (category === "image-gen") {
      // Actual provider cost per image (USD) — converted from RUB prices at ~90 RUB/USD.
      // Updated March 2026. Prices in RUB per image, divided by 90 to get USD.
      const VSEGPT_IMAGE_PRICES_USD: Record<string, number> = {
        // Google
        "img-google/nano-banana-2":               19.9  / 90,  // 19.9 руб
        "img-google/nano-banana-pro":             29.9  / 90,  // 29.9 руб
        "img-google/flash-25":                    9.9   / 90,  // 9.9 руб
        "img-google/imagen4-preview":             11.9  / 90,  // 11.9 руб
        "img-google/imagen4-preview-fast":        5.9   / 90,  // 5.9 руб
        "img-google/imagen4-preview-ultra":       20.0  / 90,  // 20 руб
        // FLUX 2
        "img-flux/flux-2":                        3.6   / 90,  // 3.6 руб
        "img-flux/flux-2-pro":                    9.0   / 90,  // 9 руб
        "img-flux/flux-2-flex":                   18.0  / 90,  // 18 руб (low-res) / 36 (hi-res), use average
        "img-flux/flux-2-klein-9b":               9.9   / 90,  // 4.9/9.9 руб, use high
        "img-flux/flux-2-klein-4b":               3.9   / 90,  // 3.9 руб
        // FLUX 1
        "img-flux/pro1.1":                        14.9  / 90,  // 14.9 руб
        "img-flux/pro":                           14.9  / 90,  // 14.9 руб
        "img-flux/dev":                           7.5   / 90,  // 7.5 руб
        "img-flux/schnell":                       1.8   / 90,  // 1.8 руб
        "img-flux/kontext-pro":                   7.5   / 90,  // 7.5 руб
        "img-flux/kontext-max":                   15.0  / 90,  // 15 руб
        "img-flux/juggernaut-lightning":          1.8   / 90,  // 1.80 руб
        // ByteDance
        "img-bytedance/seedream-v4.5":            13.9  / 90,  // 13.9 руб
        "img-bytedance/seedream-v4":              6.9   / 90,  // 6.9 руб
        // Others
        "img-reve":                               8.9   / 90,  // 8.9 руб
        "img-openai/gpt-image-1-mini":            5.0   / 90,  // 5.0 руб
        "img-recraft/v3":                         9.9   / 90,  // 9.9 руб
        "img-ideogram/v3":                        7.9   / 90,  // 7.9 руб
        "img-stable/stable-diffusion-xl-lightning": 0.30 / 90, // 0.30 руб
        "img-stable/stable-diffusion-xl-1024":   1.0   / 90,  // ~1 руб (not listed, estimate)
        "img-playground-v2-5-1024px":             1.45  / 90,  // 1.45 руб
      };

      // Determine if this model should be routed through the image provider or Lovable AI Gateway
      const isVseGPTImageModel = vsegptModel.startsWith("img-");

      if (isVseGPTImageModel) {
        // Route through the image provider endpoint
        const imageResp = await fetch("https://api.vsegpt.ru/v1/images/generations", {
          method: "POST",
          headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: vsegptModel, prompt, n: 1, response_format: "b64_json" }),
        });

        if (!imageResp.ok) {
          const errText = await imageResp.text();
          console.error("Image generation error:", imageResp.status, errText);
          if (imageResp.status === 429) return respond(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 429, "Rate limit exceeded");
          if (imageResp.status === 402) return respond(JSON.stringify({ error: "Insufficient credits. Please top up your account." }), 402, "Insufficient credits");
          return respond(JSON.stringify({ error: "Failed to generate image", details: errText.slice(0, 500), model: vsegptModel }), 500, errText.slice(0, 500));
        }

        // Images endpoint doesn't return x-used-credits, use catalog price as fallback
        const headerCost = extractProviderCost(imageResp.headers);
        const catalogCost = VSEGPT_IMAGE_PRICES_USD[vsegptModel] ?? 0.0001;
        const providerCost = (headerCost != null && headerCost > 0) ? headerCost : catalogCost;
        console.log(`Image billing: model=${vsegptModel} headerCost=${headerCost} catalogCost=${catalogCost} finalCost=${providerCost}`);

        const data = await imageResp.json();
        const b64 = data?.data?.[0]?.b64_json ?? null;
        const urlFromResp = data?.data?.[0]?.url ?? null;
        const imageUrl = b64 ? `data:image/png;base64,${b64}` : urlFromResp;

        if (!imageUrl) {
          return respond(JSON.stringify({ error: "Failed to generate image (no image in response)", model: vsegptModel }), 500, "No image in response");
        }
        return respond(JSON.stringify({ response: "🖼️ Image generated successfully!", imageUrl, model: vsegptModel }), 200, undefined, { total_tokens: 0 }, providerCost);
      }

      // Fallback: Lovable AI Gateway (for non-img-* models like gemini-2.5-flash-image)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return respond(JSON.stringify({ error: "Image generation is not configured (missing LOVABLE_API_KEY)" }), 500, "Missing LOVABLE_API_KEY");
      }

      const gatewayModel = vsegptModel.startsWith("google/gemini") ? vsegptModel : "google/gemini-2.5-flash-image";
      const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: gatewayModel, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] }),
      });

      if (!gatewayResp.ok) {
        const errText = await gatewayResp.text();
        return respond(JSON.stringify({ error: "Failed to generate image", upstream_status: gatewayResp.status, upstream_body: errText.slice(0, 2000), model: gatewayModel }), 500, errText.slice(0, 500));
      }

      const data = await gatewayResp.json();
      const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
      const text = data?.choices?.[0]?.message?.content ?? null;

      if (!imageUrl) {
        return respond(JSON.stringify({ error: "Failed to generate image (no image in response)", model: gatewayModel }), 500, "No image in response");
      }
      // Lovable Gateway cost for nano-banana-2 image
      const gatewayImageCost = 0.00022;
      return respond(JSON.stringify({ response: text ?? "🖼️ Image generated successfully!", imageUrl, model: gatewayModel }), 200, undefined, { total_tokens: 0 }, gatewayImageCost);
    }

    // 3. Image Editing
    if (category === "image-edit") {
      return respond(JSON.stringify({ response: `🎨 Image editing with ${model}.\n\nTo use image editing, please provide a base64-encoded image along with your edit instructions.`, model: vsegptModel, note: "Image editing requires image upload." }), 200);
    }

    // 4. TTS
    if (category === "tts") {
      const response = await fetch("https://api.vsegpt.ru/v1/audio/speech", {
        method: "POST",
        headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: vsegptModel, input: prompt, voice: "nova", response_format: "mp3" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("VseGPT TTS API error:", response.status, errorText);
        if (response.status === 429) return respond(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 429, "Rate limit exceeded");
        if (response.status === 402) return respond(JSON.stringify({ error: "Insufficient credits. Please top up your VseGPT account." }), 402, "Insufficient credits");
        return respond(JSON.stringify({ error: "Failed to generate speech", details: errorText }), 500, errorText.substring(0, 500));
      }

      const providerCost = extractProviderCost(response.headers);
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);
      return respond(JSON.stringify({ audio: base64Audio, audio_format: "mp3", model: vsegptModel, voice: "nova" }), 200, undefined, { total_tokens: Math.ceil(prompt.length / 4) }, providerCost);
    }

    // 5. STT/Audio
    if (category === "audio") {
      return respond(JSON.stringify({ response: `🎤 Speech Recognition with ${model}.\n\nTo transcribe audio, please upload an audio file.`, model: vsegptModel, note: "Speech recognition requires audio file upload." }), 200);
    }

    // 6. Video Generation (txt2vid)
    if (category === "video") {
      // Provider prices in RUB, converted at ~90 RUB/USD
      const VIDEO_PRICES_USD: Record<string, number> = {
        "txt2vid-kling/pro25-turbo":                89.9  / 90,
        "txt2vid-openai/sora-2-audio-8s":           198.0 / 90,
        "txt2vid-openai/sora-2-audio":              99.0  / 90,
        "txt2vid-google/veo3.1-fast-with-audio":    149.0 / 90,
        "txt2vid-google/veo3.1-fast-no-audio":      99.0  / 90,
        "txt2vid-kling/master21":                   299.9 / 90,
        "txt2vid-ltx/097-distilled":                12.0  / 90,
        "txt2vid-ltx/video-095":                    12.0  / 90,
        "txt2vid-kling/pro16":                      149.9 / 90,
        "txt2vid-kling/standart16":                 49.9  / 90,
        "txt2vid-kling/pro15":                      149.9 / 90,
        "txt2vid-kling/standart":                   49.9  / 90,
      };

      // Step 1: Submit video generation task → get request_id
      const videoResp = await fetch("https://api.vsegpt.ru/v1/video/generate", {
        method: "POST",
        headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: vsegptModel,
          prompt: prompt,
          action: "generate",
          aspect_ratio: "16:9",
        }),
      });

      if (!videoResp.ok) {
        const errText = await videoResp.text();
        console.error("Video generation submit error:", videoResp.status, errText);
        if (videoResp.status === 429) return respond(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 429, "Rate limit exceeded");
        if (videoResp.status === 402) return respond(JSON.stringify({ error: "Insufficient credits. Please top up your account." }), 402, "Insufficient credits");
        if (videoResp.status === 400 && errText.toLowerCase().includes("disabled")) {
          return respond(JSON.stringify({ error: "This model is currently unavailable. Please select a different video model.", model: vsegptModel }), 400, "Model disabled");
        }
        return respond(JSON.stringify({ error: "Failed to generate video", details: errText.slice(0, 500), model: vsegptModel }), 500, errText.slice(0, 500));
      }

      const submitData = await videoResp.json();
      console.log("Video submit response:", JSON.stringify(submitData).slice(0, 500));

      const requestId = submitData?.request_id;
      if (!requestId) {
        return respond(JSON.stringify({ error: "No request_id returned from video API", raw: submitData, model: vsegptModel }), 500, "No request_id");
      }

      const catalogCost = VIDEO_PRICES_USD[vsegptModel] ?? (49.9 / 90);

      // Return request_id immediately — client will poll /video-status
      return respond(JSON.stringify({
        response: "🎬 Video generation started! It usually takes 1-3 minutes.",
        videoRequestId: requestId,
        status: "IN_QUEUE",
        model: vsegptModel,
      }), 200, undefined, { total_tokens: 0 }, catalogCost);
    }

    // 6b. Music Generation (tta-* and txt2sng-*) — uses /v1/audio/speech (only audio-output endpoint)
    if (category === "music-gen") {
      const MUSIC_PRICES_USD: Record<string, number> = {
        "tta-google/lyria2":            20.0 / 90,
        "tta-cassette/music-generator": 6.0  / 90,
        "tta-stable/stable-audio":      5.0  / 90,
        "txt2sng-minimax/music":        10.0 / 90,
      };
      const catalogCostMusic = MUSIC_PRICES_USD[vsegptModel] ?? (10.0 / 90);

      // Auto-translate prompt to English if it contains non-Latin characters (music models require English)
      const hasNonLatin = /[^\u0000-\u024F]/.test(prompt);
      let musicPrompt = prompt;
      if (hasNonLatin) {
        try {
          const transResp = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini",
              messages: [
                { role: "system", content: "Translate the following music generation prompt to English. Return only the translated text, nothing else." },
                { role: "user", content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 300,
            }),
          });
          if (transResp.ok) {
            const transData = await transResp.json();
            const translated = transData?.choices?.[0]?.message?.content?.trim();
            if (translated) {
              musicPrompt = translated;
              console.log(`Translated music prompt: "${prompt}" → "${musicPrompt}"`);
            }
          }
        } catch (e) {
          console.warn("Prompt translation failed, using original:", e);
        }
      }

      // VseGPT music models — failover chain: try requested model first, fall back to lyria2
      const MUSIC_FAILOVER_CHAIN = [vsegptModel, "tta-google/lyria2", "tta-cassette/music-generator", "tta-stable/stable-audio"].filter((m, i, a) => a.indexOf(m) === i);

      const tryMusicModel = async (modelId: string): Promise<Response | null> => {
        const musicResp = await fetch("https://api.vsegpt.ru/v1/audio/speech", {
          method: "POST",
          headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: modelId, input: musicPrompt, voice: "alloy", response_format: "mp3" }),
        });

        if (!musicResp.ok) {
          const errText = await musicResp.text();
          console.error(`Music generation error [${modelId}]:`, musicResp.status, errText);
          // Fail immediately on client auth/credit errors
          if (musicResp.status === 429) return respond(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 429, "Rate limit exceeded");
          if (musicResp.status === 402) return respond(JSON.stringify({ error: "Insufficient credits. Please top up your account." }), 402, "Insufficient credits");
          // 400 = model disabled/provider issue → signal to try next in chain
          if (musicResp.status === 400) return null;
          return respond(JSON.stringify({ error: "Failed to generate music", details: errText.slice(0, 500), model: modelId }), 500, errText.slice(0, 500));
        }

        const contentType = musicResp.headers.get("content-type") || "";
        console.log(`Music gen content-type [${modelId}]:`, contentType);

        const audioBuffer = await musicResp.arrayBuffer();
        const firstBytes = new Uint8Array(audioBuffer.slice(0, 4));
        const isRiff = firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x46;
        const isOgg  = firstBytes[0] === 0x4F && firstBytes[1] === 0x67 && firstBytes[2] === 0x67 && firstBytes[3] === 0x53;
        const isMp3  = (firstBytes[0] === 0xFF && (firstBytes[1] & 0xE0) === 0xE0) || (firstBytes[0] === 0x49 && firstBytes[1] === 0x44 && firstBytes[2] === 0x33);
        const isBinary = isRiff || isOgg || isMp3 || contentType.includes("audio/") || contentType.includes("application/octet-stream");

        if (isBinary) {
          const ext = isRiff ? "wav" : isOgg ? "ogg" : "mp3";
          const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          const path = `music/${Date.now()}_${modelId.replace(/\//g, "_")}.${ext}`;
          await supabase.storage.from("claw-images").upload(path, audioBuffer, { contentType: `audio/${ext}`, upsert: true });
          const { data: urlData } = supabase.storage.from("claw-images").getPublicUrl(path);
          return respond(JSON.stringify({ response: "🎵 Music generated successfully!", audioUrl: urlData.publicUrl, model: modelId }), 200, undefined, { total_tokens: 0 }, catalogCostMusic);
        }

        try {
          const text = new TextDecoder().decode(audioBuffer);
          const data = JSON.parse(text);
          const audioUrl = data?.url || data?.audio_url || data?.data?.[0]?.url || null;
          if (audioUrl) return respond(JSON.stringify({ response: "🎵 Music generated successfully!", audioUrl, model: modelId }), 200, undefined, { total_tokens: 0 }, catalogCostMusic);
          return respond(JSON.stringify({ response: "🎵 " + JSON.stringify(data), model: modelId }), 200, undefined, undefined, catalogCostMusic);
        } catch {
          return respond(JSON.stringify({ error: "Unexpected response format from music API", model: modelId }), 500, "Unexpected response format");
        }
      };

      for (const candidateModel of MUSIC_FAILOVER_CHAIN) {
        const result = await tryMusicModel(candidateModel);
        if (result !== null) return result;
        console.warn(`Music model ${candidateModel} unavailable, trying next in chain...`);
      }

      return respond(JSON.stringify({ error: "All music generation models are temporarily unavailable. Please try again later.", model: vsegptModel }), 503, "All models unavailable");
    }

    // 7. Embeddings (with timeout + retry)
    if (category === "embedding") {
      const rawInput = (parsedBody as any).input;
      const inputForVseGPT = rawInput !== undefined ? rawInput : prompt;
      const embBody = JSON.stringify({ model: vsegptModel, input: inputForVseGPT });
      const embHeaders = { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" };

      let response: Response | null = null;
      const EMB_TIMEOUT = 15_000;
      const EMB_MAX_ATTEMPTS = 3;

      for (let attempt = 1; attempt <= EMB_MAX_ATTEMPTS; attempt++) {
        try {
          response = await fetchWithTimeout("https://api.vsegpt.ru/v1/embeddings", {
            method: "POST",
            headers: embHeaders,
            body: embBody,
          }, EMB_TIMEOUT);

          if (response.ok) break;

          // Retriable server errors
          if (response.status >= 500 && attempt < EMB_MAX_ATTEMPTS) {
            console.warn(`Embeddings attempt ${attempt} returned ${response.status}, retrying…`);
            response = null;
            continue;
          }
          // Non-retriable error — break
          break;
        } catch (err) {
          const isTimeout = err instanceof DOMException && err.name === "AbortError";
          console.warn(`Embeddings attempt ${attempt} ${isTimeout ? "timed out" : "failed"}: ${err}`);
          response = null;
          if (attempt < EMB_MAX_ATTEMPTS) continue;
        }
      }

      if (!response) {
        return respond(JSON.stringify({ error: "Embedding service unavailable after retries" }), 503, "All embedding attempts failed");
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Embeddings API error:", response.status, errorText);
        return respond(JSON.stringify({ error: "Failed to generate embeddings" }), response.status >= 500 ? 503 : response.status, errorText.substring(0, 500));
      }

      const providerCost = extractProviderCost(response.headers);
      const data = await response.json();

      const allEmbeddings = data.data as Array<{ embedding: number[]; index: number }> | undefined;
      if (allEmbeddings && allEmbeddings.length > 0) {
        const dimensions = allEmbeddings[0]?.embedding?.length || 0;
        return respond(JSON.stringify({
          response: `📊 Embeddings generated successfully!\n\nItems: ${allEmbeddings.length}\nDimensions: ${dimensions}`,
          model: vsegptModel,
          embedding: allEmbeddings[0]?.embedding,
          embeddings: allEmbeddings.map(e => e.embedding),
          dimensions,
        }), 200, undefined, data.usage, providerCost);
      }

      const embedding = data.data?.[0]?.embedding;
      const dimensions = embedding?.length || 0;
      return respond(JSON.stringify({
        response: `📊 Embeddings generated successfully!\n\nDimensions: ${dimensions}\nFirst 5 values: [${embedding?.slice(0, 5).map((v: number) => v.toFixed(6)).join(', ')}...]`,
        model: vsegptModel, embedding, dimensions,
      }), 200, undefined, data.usage, providerCost);
    }

    // 8. Document AI / OCR
    if (category === "document" || category === "ocr") {
      return respond(JSON.stringify({ response: `📄 Document Processing with ${model}.\n\nThis feature requires file upload capability.`, model: vsegptModel, note: "Document processing requires file upload." }), 200);
    }

    // 9. Moderation
    if (category === "moderation") {
      const moderationModel = "openai/gpt-4o-mini";
      const response = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: moderationModel,
          messages: [
            { role: "system", content: "You are a content moderation system. Analyze the following text and respond with a JSON object containing: flagged (boolean), categories (object with keys: sexual, hate, harassment, self-harm, violence), and category_scores (object with same keys, values 0-1). Be strict about harmful content." },
            { role: "user", content: prompt },
          ],
          temperature: 0,
          max_tokens: 512,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return respond(JSON.stringify({ error: "Moderation check failed" }), 500, errorText.substring(0, 500));
      }

      const providerCost = extractProviderCost(response.headers);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      return respond(JSON.stringify({ response: content, model: moderationModel }), 200, undefined, data.usage, providerCost);
    }

    // Default fallback
    return respond(JSON.stringify({ response: `Demonstration for ${category} models.\nModel: ${model}`, model: vsegptModel }), 200);

  } catch (error) {
    console.error("Inference error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logApiRequest({ method: req.method, endpoint: "/v1/model-inference", status_code: 500, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: errMsg, request_body: typeof requestBodyLog !== "undefined" ? requestBodyLog : null });
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
