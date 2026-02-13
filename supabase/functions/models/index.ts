import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logApiRequest, extractApiKeyPrefix } from "../_shared/log-request.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comprehensive model catalog
const modelCatalog = [
  { id: "regraph/ReGraph-LLM", category: "llm", provider: "ReGraph", context_length: 256000, price_per_1k_tokens: 0.0003, latency_ms: 500 },
  { id: "meta-llama/Llama-3-70B", category: "llm", provider: "Meta", context_length: 8192, price_per_1k_tokens: 0.0002, latency_ms: 450 },
  { id: "meta-llama/Llama-3.1-70B", category: "llm", provider: "Meta", context_length: 131072, price_per_1k_tokens: 0.00025, latency_ms: 480 },
  { id: "meta-llama/Llama-3.1-8B", category: "llm", provider: "Meta", context_length: 131072, price_per_1k_tokens: 0.00005, latency_ms: 180 },
  { id: "mistralai/Mixtral-8x7B", category: "llm", provider: "Mistral AI", context_length: 32768, price_per_1k_tokens: 0.0001, latency_ms: 320 },
  { id: "mistralai/Mixtral-8x22B", category: "llm", provider: "Mistral AI", context_length: 65536, price_per_1k_tokens: 0.00018, latency_ms: 550 },
  { id: "mistralai/Mistral-Large", category: "llm", provider: "Mistral AI", context_length: 128000, price_per_1k_tokens: 0.0003, latency_ms: 600 },
  { id: "qwen/Qwen-2.5-72B", category: "llm", provider: "Alibaba", context_length: 131072, price_per_1k_tokens: 0.00022, latency_ms: 520 },
  { id: "google/Gemma-2-27B", category: "llm", provider: "Google", context_length: 8192, price_per_1k_tokens: 0.00015, latency_ms: 380 },
  { id: "anthropic/Claude-3-Opus", category: "chat", provider: "Anthropic", context_length: 200000, price_per_1k_tokens: 0.0006, latency_ms: 700 },
  { id: "anthropic/Claude-3-Sonnet", category: "chat", provider: "Anthropic", context_length: 200000, price_per_1k_tokens: 0.0003, latency_ms: 450 },
  { id: "anthropic/Claude-Haiku-4.5", category: "chat", provider: "Anthropic", context_length: 200000, price_per_1k_tokens: 0.00015, latency_ms: 280 },
  { id: "anthropic/Claude-Sonnet-4", category: "chat", provider: "Anthropic", context_length: 200000, price_per_1k_tokens: 0.0004, latency_ms: 420 },
  { id: "anthropic/Claude-Sonnet-4.5", category: "chat", provider: "Anthropic", context_length: 200000, price_per_1k_tokens: 0.0005, latency_ms: 460 },
  { id: "anthropic/Claude-Opus-4.5", category: "chat", provider: "Anthropic", context_length: 200000, price_per_1k_tokens: 0.0008, latency_ms: 750 },
  { id: "openai/GPT-4-Turbo", category: "chat", provider: "OpenAI", context_length: 128000, price_per_1k_tokens: 0.0004, latency_ms: 550 },
  { id: "openai/GPT-4o", category: "chat", provider: "OpenAI", context_length: 128000, price_per_1k_tokens: 0.00035, latency_ms: 400 },
  { id: "openai/GPT-4.1", category: "chat", provider: "OpenAI", context_length: 128000, price_per_1k_tokens: 0.00045, latency_ms: 500 },
  { id: "openai/GPT-5", category: "chat", provider: "OpenAI", context_length: 256000, price_per_1k_tokens: 0.0007, latency_ms: 650 },
  { id: "openai/GPT-5-Mini", category: "chat", provider: "OpenAI", context_length: 256000, price_per_1k_tokens: 0.0003, latency_ms: 350 },
  { id: "openai/GPT-5.1", category: "chat", provider: "OpenAI", context_length: 256000, price_per_1k_tokens: 0.00075, latency_ms: 680 },
  { id: "openai/GPT-5.2", category: "reasoning", provider: "OpenAI", context_length: 256000, price_per_1k_tokens: 0.0009, latency_ms: 800 },
  { id: "google/Gemini-Pro", category: "chat", provider: "Google", context_length: 1000000, price_per_1k_tokens: 0.00035, latency_ms: 400 },
  { id: "google/Gemini-3-Flash", category: "chat", provider: "Google", context_length: 1000000, price_per_1k_tokens: 0.00015, latency_ms: 250 },
  { id: "google/Gemini-3-Pro-Preview", category: "chat", provider: "Google", context_length: 1000000, price_per_1k_tokens: 0.0005, latency_ms: 480 },
  { id: "xai/Grok-Code-Fast-1", category: "code", provider: "xAI", context_length: 131072, price_per_1k_tokens: 0.00012, latency_ms: 200 },
  { id: "cohere/Command-R-Plus", category: "chat", provider: "Cohere", context_length: 128000, price_per_1k_tokens: 0.0002, latency_ms: 350 },
  { id: "openai/O1-Preview", category: "reasoning", provider: "OpenAI", context_length: 128000, price_per_1k_tokens: 0.0008, latency_ms: 1200 },
  { id: "deepseek/DeepSeek-R1", category: "reasoning", provider: "DeepSeek", context_length: 64000, price_per_1k_tokens: 0.0004, latency_ms: 800 },
  { id: "deepseek/DeepSeek-Coder-33B", category: "code", provider: "DeepSeek", context_length: 16384, price_per_1k_tokens: 0.00012, latency_ms: 280 },
  { id: "qwen/Qwen-2.5-Coder-32B", category: "code", provider: "Alibaba", context_length: 131072, price_per_1k_tokens: 0.00015, latency_ms: 300 },
  { id: "meta-llama/CodeLlama-70B", category: "code", provider: "Meta", context_length: 16384, price_per_1k_tokens: 0.0002, latency_ms: 450 },
  { id: "bigcode/StarCoder2-15B", category: "code", provider: "BigCode", context_length: 16384, price_per_1k_tokens: 0.00008, latency_ms: 220 },
  { id: "meta-llama/Llama-3.2-90B-Vision", category: "vision", provider: "Meta", context_length: 128000, price_per_1k_tokens: 0.00035, latency_ms: 650 },
  { id: "liuhaotian/LLaVA-1.6-34B", category: "vision", provider: "LMSys", context_length: 4096, price_per_1k_tokens: 0.00018, latency_ms: 420 },
  { id: "qwen/Qwen-VL-Max", category: "vision", provider: "Alibaba", context_length: 32768, price_per_1k_tokens: 0.00025, latency_ms: 480 },
  { id: "microsoft/Phi-3-Vision", category: "vision", provider: "Microsoft", context_length: 128000, price_per_1k_tokens: 0.0001, latency_ms: 280 },
  { id: "stabilityai/SDXL-1.0", category: "image-gen", provider: "Stability AI", price_per_image: 0.002, latency_ms: 3500 },
  { id: "stabilityai/SDXL-Turbo", category: "image-gen", provider: "Stability AI", price_per_image: 0.001, latency_ms: 800 },
  { id: "kandinsky/Kandinsky-3", category: "image-gen", provider: "Sber AI", price_per_image: 0.0015, latency_ms: 2800 },
  { id: "playground-ai/Playground-v2.5", category: "image-gen", provider: "Playground", price_per_image: 0.0018, latency_ms: 3200 },
  { id: "flux/FLUX.1-Pro", category: "image-gen", provider: "Black Forest Labs", price_per_image: 0.003, latency_ms: 4500 },
  { id: "timbrooks/Instruct-Pix2Pix", category: "image-edit", provider: "UC Berkeley", price_per_image: 0.002, latency_ms: 2500 },
  { id: "lllyasviel/ControlNet-SDXL", category: "image-edit", provider: "lllyasviel", price_per_image: 0.0025, latency_ms: 3800 },
  { id: "coqui/XTTS-v2", category: "tts", provider: "Coqui", price_per_1k_chars: 0.015, latency_ms: 800 },
  { id: "suno/Bark", category: "tts", provider: "Suno", price_per_1k_chars: 0.012, latency_ms: 1200 },
  { id: "elevenlabs/Eleven-Multilingual", category: "tts", provider: "ElevenLabs", price_per_1k_chars: 0.024, latency_ms: 600 },
  { id: "openai/Whisper-Large-v3", category: "audio", provider: "OpenAI", price_per_minute: 0.006, latency_ms: 1500 },
  { id: "meta/SeamlessM4T", category: "audio", provider: "Meta", price_per_minute: 0.005, latency_ms: 1800 },
  { id: "nvidia/Canary-1B", category: "audio", provider: "NVIDIA", price_per_minute: 0.004, latency_ms: 1200 },
  { id: "stabilityai/Stable-Video-Diffusion", category: "video", provider: "Stability AI", price_per_video: 0.05, latency_ms: 60000 },
  { id: "guoyww/AnimateDiff", category: "video", provider: "AnimateDiff", price_per_video: 0.04, latency_ms: 45000 },
  { id: "BAAI/BGE-Large-EN", category: "embedding", provider: "BAAI", context_length: 512, price_per_1k_tokens: 0.00001, latency_ms: 50 },
  { id: "intfloat/E5-Mistral-7B", category: "embedding", provider: "intfloat", context_length: 4096, price_per_1k_tokens: 0.00002, latency_ms: 150 },
  { id: "nomic-ai/Nomic-Embed-v1.5", category: "embedding", provider: "Nomic", context_length: 8192, price_per_1k_tokens: 0.000015, latency_ms: 80 },
  { id: "microsoft/LayoutLM-v3", category: "document", provider: "Microsoft", price_per_page: 0.01, latency_ms: 2000 },
  { id: "naver-clova/Donut", category: "document", provider: "Naver", price_per_page: 0.008, latency_ms: 1800 },
  { id: "microsoft/TrOCR-Large", category: "document", provider: "Microsoft", price_per_page: 0.006, latency_ms: 1500 },
  { id: "vikhyatk/Surya-OCR", category: "document", provider: "Surya", price_per_page: 0.005, latency_ms: 1200 },
  { id: "auto-gpt/AutoGPT", category: "agents", provider: "AutoGPT", price_per_task: 0.10, latency_ms: 30000 },
  { id: "killian/Open-Interpreter", category: "agents", provider: "Open Interpreter", price_per_task: 0.08, latency_ms: 25000 },
  { id: "meta-llama/Llama-3.1-8B-FT", category: "fine-tune", provider: "Meta", context_length: 131072, price_per_1k_tokens: 0.00004, training_price_per_1k_tokens: 0.0003, latency_ms: 180 },
  { id: "mistralai/Mistral-7B-FT", category: "fine-tune", provider: "Mistral AI", context_length: 32768, price_per_1k_tokens: 0.00003, training_price_per_1k_tokens: 0.00025, latency_ms: 150 },
  { id: "microsoft/Phi-2-FT", category: "fine-tune", provider: "Microsoft", context_length: 2048, price_per_1k_tokens: 0.00002, training_price_per_1k_tokens: 0.0002, latency_ms: 100 },
  { id: "google/Gemma-7B-FT", category: "fine-tune", provider: "Google", context_length: 8192, price_per_1k_tokens: 0.00003, training_price_per_1k_tokens: 0.00025, latency_ms: 140 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const apiKeyPrefix = extractApiKeyPrefix(req);

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const provider = url.searchParams.get("provider");
    const minContext = url.searchParams.get("min_context");
    const search = url.searchParams.get("search") || url.searchParams.get("q");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    let filteredModels = [...modelCatalog];

    if (category) {
      filteredModels = filteredModels.filter(m => m.category === category);
    }
    if (provider) {
      filteredModels = filteredModels.filter(m => m.provider.toLowerCase().includes(provider.toLowerCase()));
    }
    if (minContext) {
      const minCtx = parseInt(minContext);
      filteredModels = filteredModels.filter(m => (m as any).context_length && (m as any).context_length >= minCtx);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredModels = filteredModels.filter(m => m.id.toLowerCase().includes(searchLower) || m.provider.toLowerCase().includes(searchLower) || m.category.toLowerCase().includes(searchLower));
    }

    const total = filteredModels.length;
    const start = (page - 1) * limit;
    const paginatedModels = filteredModels.slice(start, start + limit);
    const categories = [...new Set(modelCatalog.map(m => m.category))];
    const providers = [...new Set(modelCatalog.map(m => m.provider))];

    const responseBody = JSON.stringify({
      models: paginatedModels, total, page, limit, total_pages: Math.ceil(total / limit),
      meta: { categories, providers, total_models: modelCatalog.length },
    });

    logApiRequest({ method: req.method, endpoint: "/v1/models", status_code: 200, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix });
    return new Response(responseBody, { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Models error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logApiRequest({ method: req.method, endpoint: "/v1/models", status_code: 500, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: errMsg });
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
