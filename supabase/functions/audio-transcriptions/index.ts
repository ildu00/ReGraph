import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logApiRequest, extractApiKeyPrefix } from "../_shared/log-request.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const apiKeyPrefix = extractApiKeyPrefix(req);

  const respond = (body: string, status: number, errorMsg?: string) => {
    logApiRequest({ method: req.method, endpoint: "/v1/audio/transcriptions", status_code: status, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: errorMsg || null });
    return new Response(body, { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  };

  if (req.method !== "POST") {
    return respond(JSON.stringify({ error: "Method not allowed", message: "POST with multipart/form-data required." }), 405, "Method not allowed");
  }

  try {
    const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY");
    if (!VSEGPT_API_KEY) throw new Error("VSEGPT_API_KEY is not configured");

    const contentType = req.headers.get("content-type") || "";

    // Accept multipart/form-data (OpenAI-compatible) or JSON with base64 audio
    let vsegptBody: BodyInit;
    let vsegptHeaders: Record<string, string> = {
      "Authorization": `Bearer ${VSEGPT_API_KEY}`,
    };

    if (contentType.includes("multipart/form-data")) {
      // Pass through multipart form data directly to VseGPT
      const formData = await req.formData();

      // Ensure model is set
      if (!formData.has("model")) {
        formData.set("model", "whisper-1");
      }

      // Map model names
      const model = formData.get("model") as string;
      const modelMapping: Record<string, string> = {
        "whisper-large-v3": "whisper-1",
        "whisper-large-v2": "whisper-1",
        "whisper-1": "whisper-1",
        "seamless-m4t": "whisper-1",
        "canary-1b": "whisper-1",
      };
      formData.set("model", modelMapping[model] || "whisper-1");

      vsegptBody = formData;
      // Don't set Content-Type — fetch will set multipart boundary automatically
    } else if (contentType.includes("application/json")) {
      // JSON body with base64-encoded audio
      const body = await req.json();
      const { file, model = "whisper-1", language, prompt, response_format = "json", temperature } = body;

      if (!file) {
        return respond(JSON.stringify({ error: "Missing 'file' field. Provide audio as base64 string or use multipart/form-data." }), 400, "Missing file");
      }

      // Decode base64 and build FormData
      const binaryStr = atob(file);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const formData = new FormData();
      formData.append("file", new Blob([bytes], { type: "audio/mpeg" }), "audio.mp3");
      formData.append("model", model === "whisper-large-v3" ? "whisper-1" : (model || "whisper-1"));
      if (language) formData.append("language", language);
      if (prompt) formData.append("prompt", prompt);
      if (response_format) formData.append("response_format", response_format);
      if (temperature !== undefined) formData.append("temperature", String(temperature));

      vsegptBody = formData;
    } else {
      return respond(JSON.stringify({ error: "Unsupported Content-Type. Use multipart/form-data or application/json." }), 400, "Bad content type");
    }

    const response = await fetch("https://api.vsegpt.ru/v1/audio/transcriptions", {
      method: "POST",
      headers: vsegptHeaders,
      body: vsegptBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("VseGPT transcription error:", response.status, errorText);
      if (response.status === 429) return respond(JSON.stringify({ error: "Rate limit exceeded." }), 429, "Rate limit");
      if (response.status === 402) return respond(JSON.stringify({ error: "Insufficient credits." }), 402, "Insufficient credits");
      return respond(JSON.stringify({ error: "Transcription failed", details: errorText }), 500, errorText.substring(0, 500));
    }

    const result = await response.text();
    logApiRequest({ method: req.method, endpoint: "/v1/audio/transcriptions", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });

    // Pass through the response as-is (VseGPT returns OpenAI-compatible format)
    return new Response(result, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    });

  } catch (error) {
    console.error("Audio transcription error:", error);
    return respond(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 500, error instanceof Error ? error.message : "Unknown error");
  }
});
