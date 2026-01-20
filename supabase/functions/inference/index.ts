import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Map OpenAI-compatible format to our internal format
    const { model, messages, prompt, max_tokens, temperature, stream } = body;
    
    // Determine category from model name
    let category = "chat";
    const modelLower = (model || "").toLowerCase();
    
    if (modelLower.includes("tts") || modelLower.includes("eleven") || modelLower.includes("xtts") || modelLower.includes("bark")) {
      category = "tts";
    } else if (modelLower.includes("whisper") || modelLower.includes("stt") || modelLower.includes("seamless") || modelLower.includes("canary")) {
      category = "audio";
    } else if (modelLower.includes("sdxl") || modelLower.includes("kandinsky") || modelLower.includes("playground") || modelLower.includes("stable-diffusion")) {
      category = "image-gen";
    } else if (modelLower.includes("instruct-pix") || modelLower.includes("controlnet")) {
      category = "image-edit";
    } else if (modelLower.includes("stable-video") || modelLower.includes("animatediff")) {
      category = "video";
    } else if (modelLower.includes("bge") || modelLower.includes("e5-") || modelLower.includes("nomic") || modelLower.includes("embed")) {
      category = "embedding";
    } else if (modelLower.includes("layoutlm") || modelLower.includes("donut") || modelLower.includes("trocr") || modelLower.includes("surya") || modelLower.includes("ocr")) {
      category = "document";
    } else if (modelLower.includes("llama") || modelLower.includes("mistral") || modelLower.includes("qwen") || modelLower.includes("gemma")) {
      category = "llm";
    } else if (modelLower.includes("claude") || modelLower.includes("gpt") || modelLower.includes("gemini") || modelLower.includes("command")) {
      category = "chat";
    } else if (modelLower.includes("o1") || modelLower.includes("deepseek")) {
      category = "reasoning";
    } else if (modelLower.includes("coder") || modelLower.includes("starcoder") || modelLower.includes("codellama")) {
      category = "code";
    } else if (modelLower.includes("vision") || modelLower.includes("llava") || modelLower.includes("cogvlm") || modelLower.includes("internvl") || modelLower.includes("phi-3-vision")) {
      category = "vision";
    }
    
    // Extract prompt from messages array if provided (OpenAI format)
    let finalPrompt = prompt;
    if (!finalPrompt && messages && Array.isArray(messages)) {
      const userMessages = messages.filter((m: any) => m.role === "user");
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        finalPrompt = typeof lastUserMessage.content === "string" 
          ? lastUserMessage.content 
          : lastUserMessage.content?.map((c: any) => c.text || "").join("\n");
      }
    }
    
    if (!finalPrompt) {
      return new Response(
        JSON.stringify({ error: "No prompt or messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward to model-inference
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    const inferenceResponse = await fetch(`${SUPABASE_URL}/functions/v1/model-inference`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "llama-3.1-70b",
        prompt: finalPrompt,
        temperature: temperature ?? 0.7,
        maxTokens: max_tokens ?? 256,
        category,
      }),
    });

    const data = await inferenceResponse.json();
    
    // Transform response to OpenAI-compatible format
    if (data.error) {
      return new Response(
        JSON.stringify({ error: data.error }),
        { status: inferenceResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Special handling for TTS - return audio data directly
    if (category === "tts" && data.audio) {
      return new Response(
        JSON.stringify({
          audio: data.audio,
          audio_format: data.audio_format || "mp3",
          model: data.model,
          voice: data.voice || "nova",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openAIResponse = {
      id: "inf_" + crypto.randomUUID().slice(0, 8),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: data.model || model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: data.response,
          },
          finish_reason: "stop",
        },
      ],
      usage: data.usage || {
        prompt_tokens: Math.ceil(finalPrompt.length / 4),
        completion_tokens: Math.ceil((data.response?.length || 0) / 4),
        total_tokens: Math.ceil(finalPrompt.length / 4) + Math.ceil((data.response?.length || 0) / 4),
      },
      // Include extra fields for special responses
      ...(data.imageUrl && { image_url: data.imageUrl }),
      ...(data.embedding && { embedding: data.embedding, dimensions: data.dimensions }),
    };

    return new Response(
      JSON.stringify(openAIResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Inference proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
