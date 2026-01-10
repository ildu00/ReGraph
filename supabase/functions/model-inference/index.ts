import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

  try {
    const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY");
    if (!VSEGPT_API_KEY) {
      throw new Error("VSEGPT_API_KEY is not configured");
    }

    const { model, prompt, temperature = 0.7, maxTokens = 256, category }: InferenceRequest = await req.json();

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map our model IDs to VseGPT model IDs
    const modelMapping: Record<string, string> = {
      // LLM (Large Language Models)
      "llama-3.1-70b": "meta-llama/llama-3.1-70b-instruct",
      "llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
      "mistral-large": "mistralai/mistral-large",
      "mixtral-8x22b": "mistralai/mixtral-8x22b-instruct",
      "qwen-72b": "qwen/qwen-2.5-72b-instruct",
      "gemma-2-27b": "google/gemma-2-27b-it",
      
      // Chat & Assistants
      "claude-3-opus": "anthropic/claude-opus-4",
      "gpt-4-turbo": "openai/gpt-4-turbo",
      "gemini-pro": "google/gemini-2.5-pro",
      "command-r-plus": "cohere/command-r-plus-08-2024",
      
      // Reasoning & Analysis
      "o1-preview": "openai/o3-mini",
      "claude-3-sonnet": "anthropic/claude-sonnet-4",
      "deepseek-r1": "deepseek/deepseek-r1",
      
      // Code Generation - using verified models
      "deepseek-coder-33b": "qwen/qwen-2.5-coder-32b-instruct",
      "codellama-70b": "meta-llama/llama-3.1-70b-instruct",
      "starcoder2-15b": "qwen/qwen-2.5-coder-32b-instruct",
      
      // Vision & Multimodal (use vision-capable models)
      "llava-1.6-34b": "vis-google/gemini-flash-1.5",
      "llama-3.2-90b-vision": "meta-llama/llama-3.2-90b-instruct",
      "qwen-vl-max": "qwen/qwen-vl-max",
      "phi-3-vision": "microsoft/phi-3-medium-128k-instruct",
      "cogvlm2": "vis-google/gemini-flash-1.5",
      "internvl-2": "vis-google/gemini-flash-1.5",
      
      // Image Generation - use verified VseGPT models
      "sdxl-turbo": "img-stable/stable-diffusion-xl-lightning",
      "sdxl-1.0": "img-flux/juggernaut-lightning",
      "kandinsky-3": "img-bytedance/seedream-v4",
      "playground-v2.5": "img-google/flash-25",
      
      // Image Editing
      "instruct-pix2pix": "img2img-google/flash-edit",
      "controlnet-sdxl": "img2img-flux/kontext-pro",
      
      // Speech Recognition (STT)
      "whisper-large-v3": "stt-openai/whisper-1",
      "seamless-m4t": "stt-openai/whisper-1",
      "canary-1b": "stt-openai/whisper-1",
      
      // Text-to-Speech (TTS)
      "xtts-v2": "tts-openai/tts-1",
      "bark": "tts-openai/tts-1",
      "eleven-multilingual": "tts-openai/tts-1-hd",
      
      // Video Generation
      "stable-video": "txt2vid-kling/standart",
      "animatediff": "txt2vid-kling/standart",
      
      // Embeddings
      "bge-large-en": "text-embedding-3-small",
      "e5-mistral-7b": "text-embedding-3-large",
      "nomic-embed-v1.5": "text-embedding-3-small",
      
      // Document AI / OCR
      "layoutlm-v3": "utils/pdf-ocr-1.0",
      "donut": "utils/extract-text-1.0",
      "trocr-large": "utils/pdf-ocr-1.0",
      "surya-ocr": "utils/pdf-ocr-1.0",
      
      // AI Agents (use advanced reasoning models)
      "autogpt": "openai/gpt-5-mini",
      "open-interpreter": "openai/gpt-5-mini",
      
      // Fine-tunable (use base models)
      "llama-3.1-8b-ft": "meta-llama/llama-3.1-8b-instruct",
      "mistral-7b-ft": "mistralai/mistral-7b-instruct",
      "phi-2-ft": "microsoft/phi-3-mini-128k-instruct",
      "gemma-7b-ft": "google/gemma-2-27b-it",
    };

    // Get the VseGPT model ID or use a default
    const vsegptModel = modelMapping[model] || "openai/gpt-4o-mini";

    // Handle different categories
    
    // 1. Text-based models (LLM, Chat, Reasoning, Code, Multimodal, Vision, Agents, Fine-tune)
    if (["llm", "chat", "reasoning", "code", "multimodal", "vision", "agents", "fine-tune"].includes(category)) {
      const response = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VSEGPT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: vsegptModel,
          messages: [
            { role: "user", content: prompt }
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("VseGPT API error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Insufficient credits. Please top up your VseGPT account." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: "Failed to get response from AI model" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "No response generated";
      
      return new Response(
        JSON.stringify({ 
          response: content,
          model: vsegptModel,
          usage: data.usage
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Image Generation
    if (category === "image-gen") {
      const endpoint = "https://api.vsegpt.ru/v1/images/generations";
      const headers = {
        "Authorization": `Bearer ${VSEGPT_API_KEY}`,
        "Content-Type": "application/json",
      };

      const basePayload = {
        model: vsegptModel,
        prompt,
        n: 1,
        size: "1024x1024",
      };

      const attempt = async (payload: Record<string, unknown>) => {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (resp.ok) return { ok: true as const, resp };
        const text = await resp.text();
        return { ok: false as const, resp, text };
      };

      // VseGPT quirks: different image models support different params.
      // Практика показала, что для части SD/Flux моделей default может быть b64_json, который не поддерживается.
      // Поэтому начинаем с response_format=url, а если upstream ругается на response_format — убираем его.
      let result = await attempt({ ...basePayload, response_format: "url" });

      if (!result.ok && result.resp.status === 400) {
        const t = (result.text || "").toLowerCase();
        const mentionsRf = t.includes("response_format");
        const mentionsAspectRatio = t.includes("aspect_ratio");

        if (mentionsAspectRatio) {
          // Some models require aspect_ratio instead of size
          result = await attempt({
            model: vsegptModel,
            prompt,
            n: 1,
            aspect_ratio: "1:1",
            response_format: "url",
          });
        } else if (mentionsRf) {
          // If response_format causes validation errors (including "Only response_format = b64_json is not supported"), retry without it.
          result = await attempt({ ...basePayload });
        }
      }

      if (!result.ok) {
        const truncated = (result.text || "").slice(0, 2000);

        console.error("VseGPT Image API error:", {
          status: result.resp.status,
          statusText: result.resp.statusText,
          model: vsegptModel,
          body: truncated,
        });

        if (result.resp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (result.resp.status === 402) {
          return new Response(
            JSON.stringify({ error: "Insufficient credits. Please top up your VseGPT account." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            error: "Failed to generate image",
            upstream_status: result.resp.status,
            upstream_status_text: result.resp.statusText,
            upstream_body: truncated,
            model: vsegptModel,
          }),
          { status: result.resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await result.resp.json();
      const url = data.data?.[0]?.url as string | undefined;
      const b64 = data.data?.[0]?.b64_json as string | undefined;
      const imageUrl = url ?? (b64 ? `data:image/png;base64,${b64}` : null);

      return new Response(
        JSON.stringify({
          response: imageUrl ? "🖼️ Image generated successfully!" : "Image generation completed",
          imageUrl,
          model: vsegptModel,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Image Editing
    if (category === "image-edit") {
      return new Response(
        JSON.stringify({ 
          response: `🎨 Image editing with ${model}.\n\nTo use image editing, please provide a base64-encoded image along with your edit instructions.\n\nVseGPT supports models like:\n- Google Flash Edit (img2img-google/flash-edit)\n- FLUX Kontext Pro (img2img-flux/kontext-pro)\n- Seedream 4.0 Edit\n\nThis feature requires image upload capability.`,
          model: vsegptModel,
          note: "Image editing requires image upload. API endpoint: v1/images/generations with image_url parameter."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Text-to-Speech (TTS)
    if (category === "tts") {
      const response = await fetch("https://api.vsegpt.ru/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VSEGPT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: vsegptModel,
          input: prompt,
          voice: "nova",
          response_format: "mp3",
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
            JSON.stringify({ error: "Insufficient credits. Please top up your VseGPT account." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: "Failed to generate speech" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // TTS returns binary audio data
      return new Response(
        JSON.stringify({ 
          response: `🔊 Speech generated successfully!\n\nText: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\nModel: ${vsegptModel}\nVoice: nova\nFormat: MP3\n\nNote: Audio file is generated. In production, the binary audio data would be returned for playback.`,
          model: vsegptModel,
          audioGenerated: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Speech Recognition (STT/Audio)
    if (category === "audio") {
      return new Response(
        JSON.stringify({ 
          response: `🎤 Speech Recognition with ${model}.\n\nTo transcribe audio, please upload an audio file (MP3, WAV, etc.).\n\nVseGPT supports:\n- OpenAI Whisper (stt-openai/whisper-1)\n- GPT-4o Transcribe (gpt-4o-transcribe)\n\nSupported formats: MP3, WAV, WEBM, M4A, OGG\nMax file size: 25MB\n\nThis feature requires audio file upload capability.`,
          model: vsegptModel,
          note: "Speech recognition requires audio file upload. API endpoint: v1/audio/transcriptions"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Video Generation
    if (category === "video") {
      return new Response(
        JSON.stringify({ 
          response: `🎬 Video Generation with ${model}.\n\nPrompt: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\nVseGPT supports video generation models:\n- Kling Standard (txt2vid-kling/standart)\n- Kling Pro (txt2vid-kling/pro)\n- Sora 2 (txt2vid-sora/sora-2)\n- Veo 3.1 (txt2vid-veo/veo-3.1)\n\nVideo generation is an async process:\n1. Submit request to /v1/video/generate\n2. Poll /v1/video/status for completion\n3. Download video from returned URL\n\nNote: Video generation can take 1-5 minutes.`,
          model: vsegptModel,
          note: "Video generation is asynchronous and requires polling. Full implementation needs additional UI for async workflow."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Embeddings
    if (category === "embedding") {
      const response = await fetch("https://api.vsegpt.ru/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VSEGPT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: vsegptModel,
          input: prompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("VseGPT Embeddings API error:", response.status, errorText);
        
        return new Response(
          JSON.stringify({ error: "Failed to generate embeddings" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;
      const dimensions = embedding?.length || 0;
      
      return new Response(
        JSON.stringify({ 
          response: `📊 Embeddings generated successfully!\n\nInput: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\nModel: ${vsegptModel}\nDimensions: ${dimensions}\n\nFirst 5 values: [${embedding?.slice(0, 5).map((v: number) => v.toFixed(6)).join(', ')}...]`,
          model: vsegptModel,
          embedding: embedding,
          dimensions: dimensions,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Document AI / OCR
    if (category === "document" || category === "ocr") {
      return new Response(
        JSON.stringify({ 
          response: `📄 Document Processing with ${model}.\n\nVseGPT supports document extraction:\n- Extract Text (utils/extract-text-1.0) - for PDF, DOCX\n- PDF OCR (utils/pdf-ocr-1.0) - for scanned documents\n\nTo process documents:\n1. Encode file as base64\n2. Send to /v1/extract_text endpoint\n3. Receive extracted text\n\nSupported formats: PDF, DOCX, images (for OCR)\n\nThis feature requires file upload capability.`,
          model: vsegptModel,
          note: "Document processing requires file upload. API endpoint: v1/extract_text"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default fallback for any other category
    return new Response(
      JSON.stringify({ 
        response: `This is a demonstration for ${category} models.\n\nModel: ${model}\nVseGPT mapping: ${vsegptModel}\n\nFor full functionality, additional UI components may be needed for file uploads, async workflows, or specialized inputs.`,
        model: vsegptModel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Inference error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
