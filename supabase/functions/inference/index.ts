import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logApiRequest, extractApiKeyPrefix, touchApiKeyLastUsed } from "../_shared/log-request.ts";

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
    
    const { model, messages, prompt, input, max_tokens, temperature, stream, tools, tool_choice, n, size, quality, style, agents, encoding_format, dimensions } = body;
    const useAgents = agents === true;
    // Check if this is a special endpoint (forwarded by Cloudflare Worker)
    const requestUrl = new URL(req.url);
    const isImageGenEndpoint = requestUrl.pathname.includes("images/generations") || body._endpoint === "images/generations";
    const isImageEditEndpoint = body._endpoint === "images/edits";
    const isModerationEndpoint = body._endpoint === "moderations";
    
    // Use explicit category from worker if provided, otherwise determine from model
    let category = body.category || (isImageGenEndpoint ? "image-gen" : isImageEditEndpoint ? "image-edit" : isModerationEndpoint ? "moderation" : "chat");
    // Normalize: OpenAI uses "embeddings" but internal uses "embedding"
    if (category === "embeddings") category = "embedding";
    const modelLower = (model || "").toLowerCase();
    
    if (modelLower.includes("tts") || modelLower.includes("eleven") || modelLower.includes("xtts") || modelLower.includes("bark")) { category = "tts"; }
    else if (modelLower.includes("whisper") || modelLower.includes("stt") || modelLower.includes("seamless") || modelLower.includes("canary")) { category = "audio"; }
    else if (modelLower.includes("sdxl") || modelLower.includes("kandinsky") || modelLower.includes("playground") || modelLower.includes("stable-diffusion")) { category = "image-gen"; }
    else if (modelLower.includes("instruct-pix") || modelLower.includes("controlnet")) { category = "image-edit"; }
    else if (modelLower.includes("stable-video") || modelLower.includes("animatediff")) { category = "video"; }
    else if (modelLower.includes("bge") || modelLower.includes("e5-") || modelLower.includes("nomic") || modelLower.includes("embed")) { category = "embedding"; }
    else if (modelLower.includes("layoutlm") || modelLower.includes("donut") || modelLower.includes("trocr") || modelLower.includes("surya") || modelLower.includes("ocr") || modelLower.includes("azure-d") || modelLower.includes("mathpix")) { category = "document"; }
    else if (modelLower.includes("llama") || modelLower.includes("mistral") || modelLower.includes("qwen") || modelLower.includes("gemma")) { category = "llm"; }
    else if (modelLower.includes("grok") && modelLower.includes("code")) { category = "code"; }
    else if (modelLower.includes("claude") || modelLower.includes("gpt") || modelLower.includes("gemini") || modelLower.includes("command") || modelLower.includes("grok")) { category = "chat"; }
    else if (modelLower.includes("o1") || modelLower.includes("deepseek") || modelLower.includes("gpt-5.2")) { category = "reasoning"; }
    else if (modelLower.includes("coder") || modelLower.includes("starcoder") || modelLower.includes("codellama")) { category = "code"; }
    else if (modelLower.includes("vision") || modelLower.includes("llava") || modelLower.includes("cogvlm") || modelLower.includes("internvl") || modelLower.includes("phi-3-vision")) { category = "vision"; }
    
    // Check if messages contain multimodal content (image_url)
    const hasMultimodal = messages && Array.isArray(messages) && messages.some((m: any) =>
      Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url")
    );
    if (hasMultimodal && category === "chat") {
      category = "vision";
    }

    // Extract prompt from messages array if provided (OpenAI format)
    let finalPrompt = prompt;

    // Handle OpenAI-standard `input` field for embeddings endpoint
    if (!finalPrompt && input) {
      if (typeof input === "string") {
        finalPrompt = input;
      } else if (Array.isArray(input)) {
        finalPrompt = input.join("\n");
      }
      // Force embedding category when `input` field is used
      if (category === "chat") {
        category = "embedding";
      }
    }

    if (!finalPrompt && messages && Array.isArray(messages)) {
      const userMessages = messages.filter((m: any) => m.role === "user");
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        if (typeof lastUserMessage.content === "string") {
          finalPrompt = lastUserMessage.content;
        } else if (Array.isArray(lastUserMessage.content)) {
          finalPrompt = lastUserMessage.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text || "")
            .join("\n") || "Describe this image";
        }
      }
    }
    
    if (!finalPrompt) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 400, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "No prompt or messages provided" });
      return new Response(JSON.stringify({ error: "No prompt, messages, or input provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- AGENT MODE: queue task in provider_tasks ---
    if (useAgents) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const taskType = category === "embedding" ? "embedding" : "inference";
      const payload = {
        model: model || "llama-3.1-70b",
        prompt: finalPrompt,
        messages: messages || undefined,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 256,
        category,
        tools: tools || undefined,
        tool_choice: tool_choice || undefined,
      };

      const { data: task, error: insertErr } = await sb
        .from("provider_tasks")
        .insert({ task_type: taskType, payload, status: "pending", timeout_sec: 120 })
        .select("id")
        .single();

      if (insertErr || !task) {
        logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 500, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "Failed to queue agent task" });
        return new Response(JSON.stringify({ error: "Failed to queue agent task", details: insertErr?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const taskId = task.id;
      const useAsync = body.async === true;

      // --- ASYNC MODE: return task_id immediately ---
      if (useAsync) {
        touchApiKeyLastUsed(apiKeyPrefix);
        logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 202, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
        return new Response(JSON.stringify({
          id: taskId,
          object: "agent.task",
          status: "pending",
          created: Math.floor(Date.now() / 1000),
          poll_url: `/v1/tasks/${taskId}`,
          message: "Task queued. Poll the poll_url to check status.",
        }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- SYNC MODE: poll for completion (max ~60s) ---
      const pollStart = Date.now();
      const POLL_TIMEOUT = 60_000;
      const POLL_INTERVAL = 1_000;

      while (Date.now() - pollStart < POLL_TIMEOUT) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        const { data: t } = await sb.from("provider_tasks").select("status, result, error_message").eq("id", taskId).single();
        if (!t) continue;

        if (t.status === "completed" && t.result) {
          const r = t.result as Record<string, unknown>;
          const assistantMessage: Record<string, unknown> = { role: "assistant", content: r.response || "" };
          if (r.tool_calls) { assistantMessage.tool_calls = r.tool_calls; assistantMessage.content = r.response || null; }

          const openAIResponse = {
            id: "inf_" + crypto.randomUUID().slice(0, 8), object: "chat.completion", created: Math.floor(Date.now() / 1000),
            choices: [{ index: 0, message: assistantMessage, finish_reason: r.tool_calls ? "tool_calls" : "stop" }],
            usage: r.usage || { prompt_tokens: Math.ceil(finalPrompt.length / 4), completion_tokens: Math.ceil(((r.response as string)?.length || 0) / 4), total_tokens: Math.ceil(finalPrompt.length / 4) + Math.ceil(((r.response as string)?.length || 0) / 4) },
            _agent: true, _task_id: taskId,
          };
          touchApiKeyLastUsed(apiKeyPrefix);
          logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
          return new Response(JSON.stringify(openAIResponse), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (t.status === "failed") {
          logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 502, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: t.error_message || "Agent task failed" });
          return new Response(JSON.stringify({ error: "Agent task failed", details: t.error_message, _task_id: taskId }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (t.status === "cancelled") {
          logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 410, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "Task cancelled" });
          return new Response(JSON.stringify({ error: "Agent task cancelled", _task_id: taskId }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // Timeout
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 504, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "Agent task timeout" });
      return new Response(JSON.stringify({ error: "Agent task timed out", _task_id: taskId, message: "No agent picked up the task within 60s. Check that agents are online." }), { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- DEFAULT MODE: Forward to model-inference ---
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    const forwardHeaders: Record<string, string> = {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    };
    const userApiKey = req.headers.get("x-api-key");
    if (userApiKey) {
      forwardHeaders["X-API-Key"] = userApiKey;
    }

    const inferenceBody: Record<string, unknown> = { model: model || (isImageGenEndpoint ? "dall-e-3" : "llama-3.1-70b"), prompt: finalPrompt, temperature: temperature ?? 0.7, maxTokens: max_tokens ?? 256, category };
    if (encoding_format) inferenceBody.encoding_format = encoding_format;
    if (dimensions) inferenceBody.dimensions = dimensions;
    if (input) inferenceBody.input = input;
    if (messages && Array.isArray(messages)) inferenceBody.messages = messages;
    if (tools) inferenceBody.tools = tools;
    if (tool_choice) inferenceBody.tool_choice = tool_choice;
    if (stream) inferenceBody.stream = true;
    if (n) inferenceBody.n = n;
    if (size) inferenceBody.size = size;

    const inferenceResponse = await fetch(`${SUPABASE_URL}/functions/v1/model-inference`, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(inferenceBody),
    });

    // --- STREAMING MODE: pipe the SSE stream directly ---
    if (stream && inferenceResponse.headers.get("content-type")?.includes("text/event-stream")) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
      return new Response(inferenceResponse.body, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
      });
    }

    // --- NON-STREAMING MODE ---
    const data = await inferenceResponse.json();
    console.log("Model inference response:", JSON.stringify(data).slice(0, 500));
    
    if (data.error) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: inferenceResponse.status, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: data.error });
      return new Response(JSON.stringify({ error: data.error, details: data.details || data.upstream_body }), { status: inferenceResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (category === "tts" && data.audio) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
      return new Response(JSON.stringify({ audio: data.audio, audio_format: data.audio_format || "mp3", voice: data.voice || "nova" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (category === "image-gen" && data.imageUrl) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
      return new Response(JSON.stringify({
        id: "img_" + crypto.randomUUID().slice(0, 8), object: "image", created: Math.floor(Date.now() / 1000),
        data: [{ url: data.imageUrl, revised_prompt: data.response }],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (category === "embedding" && data.embedding) {
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
      return new Response(JSON.stringify({
        object: "list",
        data: [{ object: "embedding", index: 0, embedding: data.embedding }],
        usage: { prompt_tokens: Math.ceil(finalPrompt.length / 4), total_tokens: Math.ceil(finalPrompt.length / 4) },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Moderation response (OpenAI-compatible format)
    if (category === "moderation") {
      const content = data.response || "";
      const flagged = /unsafe|harmful|violation|flagged/i.test(content);
      logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
      return new Response(JSON.stringify({
        id: "modr-" + crypto.randomUUID().slice(0, 8),
        model: model || "text-moderation-latest",
        results: [{
          flagged,
          categories: { sexual: false, hate: false, harassment: false, "self-harm": false, violence: false, "sexual/minors": false, "hate/threatening": false, "violence/graphic": false },
          category_scores: { sexual: 0, hate: 0, harassment: 0, "self-harm": 0, violence: 0, "sexual/minors": 0, "hate/threatening": 0, "violence/graphic": 0 },
          _raw_analysis: content,
        }],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const assistantMessage: Record<string, unknown> = { role: "assistant", content: data.response || "" };
    if (data.tool_calls) { assistantMessage.tool_calls = data.tool_calls; assistantMessage.content = data.response || null; }

    const openAIResponse = {
      id: "inf_" + crypto.randomUUID().slice(0, 8), object: "chat.completion", created: Math.floor(Date.now() / 1000),
      choices: [{ index: 0, message: assistantMessage, finish_reason: data.tool_calls ? "tool_calls" : "stop" }],
      usage: data.usage || { prompt_tokens: Math.ceil(finalPrompt.length / 4), completion_tokens: Math.ceil((data.response?.length || 0) / 4), total_tokens: Math.ceil(finalPrompt.length / 4) + Math.ceil((data.response?.length || 0) / 4) },
    };

    touchApiKeyLastUsed(apiKeyPrefix);
    logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
    return new Response(JSON.stringify(openAIResponse), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Inference proxy error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logApiRequest({ method: req.method, endpoint: "/v1/inference", status_code: 500, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: errMsg });
    return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
