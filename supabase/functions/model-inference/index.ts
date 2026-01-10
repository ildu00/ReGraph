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
      // LLM
      "llama-3.1-70b": "meta-llama/llama-3.1-70b-instruct",
      "llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
      "mistral-large": "mistralai/mistral-large-latest",
      "mixtral-8x22b": "mistralai/mixtral-8x22b-instruct",
      "qwen-72b": "qwen/qwen-2.5-72b-instruct",
      "gemma-2-27b": "google/gemma-2-27b-it",
      
      // Chat
      "claude-3-opus": "anthropic/claude-3-opus",
      "gpt-4-turbo": "openai/gpt-4-turbo",
      "gemini-pro": "google/gemini-pro",
      "command-r-plus": "cohere/command-r-plus",
      
      // Reasoning
      "o1-preview": "openai/o1-preview",
      "claude-3-sonnet": "anthropic/claude-3-sonnet",
      "deepseek-r1": "deepseek/deepseek-r1",
      
      // Code
      "deepseek-coder-33b": "deepseek/deepseek-coder-33b-instruct",
      "codellama-70b": "meta-llama/codellama-70b-instruct",
      "starcoder2-15b": "bigcode/starcoder2-15b",
      
      // Vision & Multimodal
      "llava-1.6-34b": "liuhaotian/llava-v1.6-34b",
      "llama-3.2-90b-vision": "meta-llama/llama-3.2-90b-vision-instruct",
      "qwen-vl-max": "qwen/qwen-vl-max",
      "phi-3-vision": "microsoft/phi-3-vision-128k-instruct",
    };

    // Get the VseGPT model ID or use a default
    const vsegptModel = modelMapping[model] || "openai/gpt-4o-mini";

    // For text-based models, use chat completions
    if (["llm", "chat", "reasoning", "code", "multimodal"].includes(category)) {
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

    // For non-text models (image-gen, audio, etc.), return a placeholder message
    return new Response(
      JSON.stringify({ 
        response: `This is a demonstration for ${category} models. In production, this would connect to specialized APIs for ${category} tasks.`,
        model: model,
        note: "Text generation models are fully functional. Image, audio, and video models require specialized endpoints."
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