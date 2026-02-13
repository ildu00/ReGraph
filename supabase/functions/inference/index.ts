import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logApiRequest, extractApiKeyPrefix } from "../_shared/log-request.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const apiKeyPrefix = extractApiKeyPrefix(req);

  // Validate HTTP method
  if (req.method !== "POST") {
    logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 405, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "Method not allowed" });
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
        message: "This endpoint only accepts POST requests with a JSON body.",
        example: { method: "POST", headers: { "Content-Type": "application/json" }, body: { model: "llama-3.1-70b", prompt: "Hello, how are you?", max_tokens: 256 } }
      }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" } }
    );
  }

  try {
    // Parse JSON body with error handling
    let body;
    try {
      const text = await req.text();
      if (!text || text.trim() === "") {
        logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 400, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "Empty request body" });
        return new Response(
          JSON.stringify({ error: "Empty request body", message: "Request body cannot be empty.", example: { model: "llama-3.1-70b", prompt: "Hello, how are you?", max_tokens: 256 } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 400, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "Invalid JSON" });
      return new Response(
        JSON.stringify({ error: "Invalid JSON", message: "Request body must be valid JSON.", example: { model: "llama-3.1-70b", prompt: "Hello, how are you?", max_tokens: 256 } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { model, messages, prompt, max_tokens, temperature, stream } = body;
    
    // Determine category from model name
    let category = "chat";
    const modelLower = (model || "").toLowerCase();
    
    if (modelLower.includes("tts") || modelLower.includes("eleven") || modelLower.includes("xtts") || modelLower.includes("bark")) { category = "tts"; }
    else if (modelLower.includes("whisper") || modelLower.includes("stt") || modelLower.includes("seamless") || modelLower.includes("canary")) { category = "audio"; }
    else if (modelLower.includes("sdxl") || modelLower.includes("kandinsky") || modelLower.includes("playground") || modelLower.includes("stable-diffusion")) { category = "image-gen"; }
    else if (modelLower.includes("instruct-pix") || modelLower.includes("controlnet")) { category = "image-edit"; }
    else if (modelLower.includes("stable-video") || modelLower.includes("animatediff")) { category = "video"; }
    else if (modelLower.includes("bge") || modelLower.includes("e5-") || modelLower.includes("nomic") || modelLower.includes("embed")) { category = "embedding"; }
    else if (modelLower.includes("layoutlm") || modelLower.includes("donut") || modelLower.includes("trocr") || modelLower.includes("surya") || modelLower.includes("ocr")) { category = "document"; }
    else if (modelLower.includes("llama") || modelLower.includes("mistral") || modelLower.includes("qwen") || modelLower.includes("gemma")) { category = "llm"; }
    else if (modelLower.includes("grok") && modelLower.includes("code")) { category = "code"; }
    else if (modelLower.includes("claude") || modelLower.includes("gpt") || modelLower.includes("gemini") || modelLower.includes("command") || modelLower.includes("grok")) { category = "chat"; }
    else if (modelLower.includes("o1") || modelLower.includes("deepseek") || modelLower.includes("gpt-5.2")) { category = "reasoning"; }
    else if (modelLower.includes("coder") || modelLower.includes("starcoder") || modelLower.includes("codellama")) { category = "code"; }
    else if (modelLower.includes("vision") || modelLower.includes("llava") || modelLower.includes("cogvlm") || modelLower.includes("internvl") || modelLower.includes("phi-3-vision")) { category = "vision"; }
    
    // Extract prompt from messages array if provided (OpenAI format)
    let finalPrompt = prompt;
    if (!finalPrompt && messages && Array.isArray(messages)) {
      const userMessages = messages.filter((m: any) => m.role === "user");
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        finalPrompt = typeof lastUserMessage.content === "string" ? lastUserMessage.content : lastUserMessage.content?.map((c: any) => c.text || "").join("\n");
      }
    }
    
    if (!finalPrompt) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 400, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "No prompt or messages provided" });
      return new Response(JSON.stringify({ error: "No prompt or messages provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Forward to model-inference
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    const inferenceResponse = await fetch(`${SUPABASE_URL}/functions/v1/model-inference`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model || "llama-3.1-70b", prompt: finalPrompt, temperature: temperature ?? 0.7, maxTokens: max_tokens ?? 256, category }),
    });

    const data = await inferenceResponse.json();
    console.log("Model inference response:", JSON.stringify(data).slice(0, 500));
    
    if (data.error) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: inferenceResponse.status, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: data.error });
      return new Response(JSON.stringify({ error: data.error, details: data.details || data.upstream_body }), { status: inferenceResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Special handling for TTS
    if (category === "tts" && data.audio) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
      return new Response(JSON.stringify({ audio: data.audio, audio_format: data.audio_format || "mp3", voice: data.voice || "nova" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Special handling for Image Generation
    if (category === "image-gen" && data.imageUrl) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
      return new Response(JSON.stringify({
        id: "img_" + crypto.randomUUID().slice(0, 8), object: "image", created: Math.floor(Date.now() / 1000),
        data: [{ url: data.imageUrl, revised_prompt: data.response }],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Special handling for Embeddings
    if (category === "embedding" && data.embedding) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
      return new Response(JSON.stringify({
        object: "list",
        data: [{ object: "embedding", index: 0, embedding: data.embedding }],
        usage: { prompt_tokens: Math.ceil(finalPrompt.length / 4), total_tokens: Math.ceil(finalPrompt.length / 4) },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const openAIResponse = {
      id: "inf_" + crypto.randomUUID().slice(0, 8), object: "chat.completion", created: Math.floor(Date.now() / 1000),
      choices: [{ index: 0, message: { role: "assistant", content: data.response || "" }, finish_reason: "stop" }],
      usage: data.usage || {
        prompt_tokens: Math.ceil(finalPrompt.length / 4),
        completion_tokens: Math.ceil((data.response?.length || 0) / 4),
        total_tokens: Math.ceil(finalPrompt.length / 4) + Math.ceil((data.response?.length || 0) / 4),
      },
    };

    logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
    return new Response(JSON.stringify(openAIResponse), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Inference proxy error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 500, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: errMsg });
    return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
