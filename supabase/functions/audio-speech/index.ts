import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY");
    if (!VSEGPT_API_KEY) {
      throw new Error("VSEGPT_API_KEY is not configured");
    }

    const body = await req.json();
    const { 
      model = "tts-openai/tts-1-hd",
      input,
      voice = "nova",
      response_format = "mp3",
      speed = 1.0,
    } = body;

    if (!input?.trim()) {
      return new Response(
        JSON.stringify({ error: "Input text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map model names to VseGPT TTS models
    const modelMapping: Record<string, string> = {
      "tts-1": "tts-openai/tts-1",
      "tts-1-hd": "tts-openai/tts-1-hd",
      "eleven-multilingual": "tts-openai/tts-1-hd",
      "eleven-multilangual": "tts-openai/tts-1-hd",
      "xtts-v2": "tts-openai/tts-1",
      "bark": "tts-openai/tts-1",
    };

    const vsegptModel = modelMapping[model] || model;

    const response = await fetch("https://api.vsegpt.ru/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VSEGPT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: vsegptModel,
        input,
        voice,
        response_format,
        speed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("VseGPT TTS API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please top up your account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate speech", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return binary audio directly (OpenAI-compatible behavior)
    const audioBuffer = await response.arrayBuffer();
    
    const contentType = response_format === "mp3" ? "audio/mpeg" 
      : response_format === "wav" ? "audio/wav"
      : response_format === "opus" ? "audio/opus"
      : response_format === "aac" ? "audio/aac"
      : response_format === "flac" ? "audio/flac"
      : "audio/mpeg";

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error("Audio speech error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
