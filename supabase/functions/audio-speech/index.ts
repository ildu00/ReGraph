import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
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

  const logAndRespond = (body: Response | string, status: number, errorMsg?: string) => {
    logApiRequest({ method: req.method, endpoint: "/v1/audio/speech", status_code: status, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: errorMsg || null });
    if (typeof body === "string") {
      return new Response(body, { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return body;
  };

  try {
    const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY");
    if (!VSEGPT_API_KEY) throw new Error("VSEGPT_API_KEY is not configured");

    const reqBody = await req.json();
    const { model = "tts-openai/tts-1-hd", input, voice = "nova", response_format = "mp3", speed = 1.0 } = reqBody;

    if (!input?.trim()) {
      return logAndRespond(JSON.stringify({ error: "Input text is required" }), 400, "Input text is required");
    }

    const modelMapping: Record<string, string> = {
      "tts-1": "tts-openai/tts-1", "tts-1-hd": "tts-openai/tts-1-hd",
      "eleven-multilingual": "tts-openai/tts-1-hd", "eleven-multilangual": "tts-openai/tts-1-hd",
      "xtts-v2": "tts-openai/tts-1", "bark": "tts-openai/tts-1",
    };
    const vsegptModel = modelMapping[model] || model;

    const response = await fetch("https://api.vsegpt.ru/v1/audio/speech", {
      method: "POST",
      headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: vsegptModel, input, voice, response_format, speed }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("VseGPT TTS API error:", response.status, errorText);
      if (response.status === 429) return logAndRespond(JSON.stringify({ error: "Rate limit exceeded." }), 429, "Rate limit exceeded");
      if (response.status === 402) return logAndRespond(JSON.stringify({ error: "Insufficient credits." }), 402, "Insufficient credits");
      return logAndRespond(JSON.stringify({ error: "Failed to generate speech", details: errorText }), 500, errorText.substring(0, 500));
    }

    const audioBuffer = await response.arrayBuffer();
    const contentType = response_format === "mp3" ? "audio/mpeg" : response_format === "wav" ? "audio/wav" : response_format === "opus" ? "audio/opus" : response_format === "aac" ? "audio/aac" : response_format === "flac" ? "audio/flac" : "audio/mpeg";

    logApiRequest({ method: req.method, endpoint: "/v1/audio/speech", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
    return new Response(audioBuffer, {
      headers: { ...corsHeaders, "Content-Type": contentType, "Content-Length": audioBuffer.byteLength.toString() },
    });

  } catch (error) {
    console.error("Audio speech error:", error);
    return logAndRespond(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 500, error instanceof Error ? error.message : "Unknown error");
  }
});
