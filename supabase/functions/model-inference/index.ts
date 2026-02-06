import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { logApiRequest, extractApiKeyPrefix } from "../_shared/log-request.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InferenceRequest {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  category: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const apiKeyPrefix = extractApiKeyPrefix(req);
  let statusCode = 200;

  try {
    const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY");
    if (!VSEGPT_API_KEY) {
      throw new Error("VSEGPT_API_KEY is not configured");
    }

    const { model, prompt, temperature = 0.7, maxTokens = 256, category }: InferenceRequest = await req.json();

    if (!prompt?.trim()) {
      statusCode = 400;
      const body = JSON.stringify({ error: "Prompt is required" });
      logApiRequest({ method: req.method, endpoint: "/v1/model-inference", status_code: statusCode, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: "Prompt is required" });
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
      "bge-large-en": "text-embedding-3-small",
      "e5-mistral-7b": "text-embedding-3-large",
      "nomic-embed-v1.5": "text-embedding-3-small",
      "layoutlm-v3": "utils/pdf-ocr-1.0",
      "donut": "utils/extract-text-1.0",
      "trocr-large": "utils/pdf-ocr-1.0",
      "surya-ocr": "utils/pdf-ocr-1.0",
      "autogpt": "openai/gpt-5-mini",
      "open-interpreter": "openai/gpt-5-mini",
      "llama-3.1-8b-ft": "meta-llama/llama-3.1-8b-instruct",
      "mistral-7b-ft": "mistralai/mistral-7b-instruct",
      "phi-2-ft": "microsoft/phi-3-mini-128k-instruct",
      "gemma-7b-ft": "google/gemma-2-27b-it",
    };

    const vsegptModel = modelMapping[model] || "openai/gpt-4o-mini";

    // Helper to log and return response
    const respond = (body: string, status: number, errorMsg?: string) => {
      logApiRequest({ method: req.method, endpoint: "/v1/model-inference", status_code: status, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: errorMsg || null });
      return new Response(body, { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    };

    // 1. Text-based models
    if (["llm", "chat", "reasoning", "code", "multimodal", "vision", "agents", "fine-tune"].includes(category)) {
      const response = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VSEGPT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: vsegptModel,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("VseGPT API error:", response.status, errorText);
        if (response.status === 429) return respond(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 429, "Rate limit exceeded");
        if (response.status === 402) return respond(JSON.stringify({ error: "Insufficient credits. Please top up your VseGPT account." }), 402, "Insufficient credits");
        return respond(JSON.stringify({ error: "Failed to get response from AI model" }), 500, errorText.substring(0, 500));
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "No response generated";
      return respond(JSON.stringify({ response: content, model: vsegptModel, usage: data.usage }), 200);
    }

    // 2. Image Generation
    if (category === "image-gen") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return respond(JSON.stringify({ error: "Image generation is not configured (missing LOVABLE_API_KEY)" }), 500, "Missing LOVABLE_API_KEY");
      }

      const gatewayModel = "google/gemini-2.5-flash-image";
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
      return respond(JSON.stringify({ response: text ?? "🖼️ Image generated successfully!", imageUrl, model: gatewayModel }), 200);
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

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);
      return respond(JSON.stringify({ audio: base64Audio, audio_format: "mp3", model: vsegptModel, voice: "nova" }), 200);
    }

    // 5. STT/Audio
    if (category === "audio") {
      return respond(JSON.stringify({ response: `🎤 Speech Recognition with ${model}.\n\nTo transcribe audio, please upload an audio file.`, model: vsegptModel, note: "Speech recognition requires audio file upload." }), 200);
    }

    // 6. Video Generation
    if (category === "video") {
      return respond(JSON.stringify({ response: `🎬 Video Generation with ${model}.\n\nVideo generation is an async process.`, model: vsegptModel, note: "Video generation is asynchronous." }), 200);
    }

    // 7. Embeddings
    if (category === "embedding") {
      const response = await fetch("https://api.vsegpt.ru/v1/embeddings", {
        method: "POST",
        headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: vsegptModel, input: prompt }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("VseGPT Embeddings API error:", response.status, errorText);
        return respond(JSON.stringify({ error: "Failed to generate embeddings" }), 500, errorText.substring(0, 500));
      }

      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;
      const dimensions = embedding?.length || 0;
      return respond(JSON.stringify({
        response: `📊 Embeddings generated successfully!\n\nDimensions: ${dimensions}\nFirst 5 values: [${embedding?.slice(0, 5).map((v: number) => v.toFixed(6)).join(', ')}...]`,
        model: vsegptModel, embedding, dimensions,
      }), 200);
    }

    // 8. Document AI / OCR
    if (category === "document" || category === "ocr") {
      return respond(JSON.stringify({ response: `📄 Document Processing with ${model}.\n\nThis feature requires file upload capability.`, model: vsegptModel, note: "Document processing requires file upload." }), 200);
    }

    // Default fallback
    return respond(JSON.stringify({ response: `Demonstration for ${category} models.\nModel: ${model}`, model: vsegptModel }), 200);

  } catch (error) {
    console.error("Inference error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logApiRequest({ method: req.method, endpoint: "/v1/model-inference", status_code: 500, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: errMsg });
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
