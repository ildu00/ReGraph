import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logApiRequest, extractApiKeyPrefix } from "../_shared/log-request.ts";
import { PROVIDER_BASE } from "../_shared/provider.ts";

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
      // Pass through multipart form data directly to provider
      const formData = await req.formData();

      // Ensure model is set
      if (!formData.has("model")) {
        formData.set("model", "whisper-1");
      }

      // Map model names to STT model IDs (require stt-openai/ prefix)
      const model = formData.get("model") as string;
      const modelMapping: Record<string, string> = {
        "whisper-large-v3": "stt-openai/whisper-v3",
        "whisper-large-v2": "stt-openai/whisper-1",
        "whisper-1": "stt-openai/whisper-1",
        "whisper-v3": "stt-openai/whisper-v3",
        "whisper-v3-turbo": "stt-openai/whisper-v3-turbo",
        "gpt-4o-transcribe": "stt-openai/gpt-4o-transcribe",
        "gpt-4o-mini-transcribe": "stt-openai/gpt-4o-mini-transcribe",
        // Catalog display names → STT models
        "openai/Whisper-Large-v3": "stt-openai/whisper-v3", "openai/whisper-large-v3": "stt-openai/whisper-v3",
        "meta/SeamlessM4T": "stt-openai/whisper-v3", "meta/seamlessm4t": "stt-openai/whisper-v3",
        "nvidia/Canary-1B": "stt-openai/whisper-v3", "nvidia/canary-1b": "stt-openai/whisper-v3",
      };
      const mapped = model.startsWith("stt-openai/") ? model : (modelMapping[model] || "stt-openai/whisper-1");
      formData.set("model", mapped);

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
      const jsonModelMapping: Record<string, string> = {
        "whisper-large-v3": "stt-openai/whisper-v3",
        "whisper-large-v2": "stt-openai/whisper-1",
        "whisper-1": "stt-openai/whisper-1",
        "whisper-v3": "stt-openai/whisper-v3",
        "whisper-v3-turbo": "stt-openai/whisper-v3-turbo",
        "gpt-4o-transcribe": "stt-openai/gpt-4o-transcribe",
        "gpt-4o-mini-transcribe": "stt-openai/gpt-4o-mini-transcribe",
        "openai/Whisper-Large-v3": "stt-openai/whisper-v3", "openai/whisper-large-v3": "stt-openai/whisper-v3",
        "meta/SeamlessM4T": "stt-openai/whisper-v3", "meta/seamlessm4t": "stt-openai/whisper-v3",
        "nvidia/Canary-1B": "stt-openai/whisper-v3", "nvidia/canary-1b": "stt-openai/whisper-v3",
      };
      const mappedModel = (model || "whisper-1").startsWith("stt-openai/") ? model : (jsonModelMapping[model] || "stt-openai/whisper-1");
      formData.append("model", mappedModel);
      if (language) formData.append("language", language);
      if (prompt) formData.append("prompt", prompt);
      if (response_format) formData.append("response_format", response_format);
      if (temperature !== undefined) formData.append("temperature", String(temperature));

      vsegptBody = formData;
    } else {
      return respond(JSON.stringify({ error: "Unsupported Content-Type. Use multipart/form-data or application/json." }), 400, "Bad content type");
    }

    const response = await fetch(`${PROVIDER_BASE}/v1/audio/transcriptions`, {
      method: "POST",
      headers: vsegptHeaders,
      body: vsegptBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transcription error:", response.status, response.statusText, errorText);
      console.error("Response headers:", JSON.stringify(Object.fromEntries(response.headers.entries())));
      if (response.status === 429) return respond(JSON.stringify({ error: "Rate limit exceeded." }), 429, "Rate limit");
      if (response.status === 402) return respond(JSON.stringify({ error: "Insufficient credits." }), 402, "Insufficient credits");
      return respond(JSON.stringify({ error: "Transcription failed", details: errorText, upstream_status: response.status }), response.status >= 400 && response.status < 500 ? response.status : 500, errorText.substring(0, 500));
    }

    const result = await response.text();
    logApiRequest({ method: req.method, endpoint: "/v1/audio/transcriptions", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });

    // Pass through the response as-is (returns OpenAI-compatible format)
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
