import { useState, useMemo, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Search, Filter, ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ModelsSidebar from "@/components/models/ModelsSidebar";
import ModelCard, { type Model } from "@/components/models/ModelCard";
import ModelPlayground from "@/components/models/ModelPlayground";

// Helper to parse price string to number for sorting
const parsePrice = (pricing: string): number => {
  const match = pricing.match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
};

// Helper to parse latency string to milliseconds for sorting
const parseLatency = (latency: string): number => {
  if (latency === "Variable") return Infinity;
  const match = latency.match(/([\d.]+)/);
  if (!match) return Infinity;
  const value = parseFloat(match[1]);
  if (latency.includes("s/s")) return value * 1000;
  if (latency.includes("ms")) return value;
  if (latency.includes("s")) return value * 1000;
  return value;
};

type SortOption = "default" | "price-asc" | "price-desc" | "latency-asc" | "latency-desc";

const modelsData: Model[] = [
  // Large Language Models
  { id: "regraph-llm", name: "ReGraph LLM", provider: "ReGraph", category: "llm", description: "ReGraph's proprietary large language model with 256K context window, optimized for decentralized inference across the network.", contextLength: 256000, pricing: "$0.0003/1K", latency: "~500ms", tags: ["Reasoning", "Long Context", "Efficient"], isPopular: true },
  { id: "llama-3.1-70b", name: "LLaMA 3.1 70B", provider: "Meta", category: "llm", description: "State-of-the-art open-source LLM with excellent reasoning and instruction following capabilities.", contextLength: 128000, pricing: "$0.0008/1K", latency: "~800ms", tags: ["Chat", "Reasoning", "Multilingual"], isPopular: true },
  { id: "llama-3.1-8b", name: "LLaMA 3.1 8B", provider: "Meta", category: "llm", description: "Efficient smaller model ideal for quick responses and cost-effective deployments.", contextLength: 128000, pricing: "$0.0002/1K", latency: "~200ms", tags: ["Fast", "Efficient", "Chat"] },
  { id: "mistral-large", name: "Mistral Large", provider: "Mistral AI", category: "llm", description: "Powerful model with strong multilingual and code generation capabilities.", contextLength: 32000, pricing: "$0.0006/1K", latency: "~600ms", tags: ["Code", "Multilingual", "Reasoning"], isPopular: true },
  { id: "mixtral-8x22b", name: "Mixtral 8x22B", provider: "Mistral AI", category: "llm", description: "Mixture of Experts model offering excellent performance across diverse tasks.", contextLength: 64000, pricing: "$0.0007/1K", latency: "~700ms", tags: ["MoE", "Versatile", "Efficient"] },
  { id: "qwen-72b", name: "Qwen 72B", provider: "Alibaba", category: "llm", description: "High-performance model with strong Chinese and English language support.", contextLength: 32000, pricing: "$0.0005/1K", latency: "~650ms", tags: ["Bilingual", "Reasoning", "Chat"] },
  { id: "gemma-2-27b", name: "Gemma 2 27B", provider: "Google", category: "llm", description: "Lightweight yet capable model from Google's Gemma family.", contextLength: 8192, pricing: "$0.0003/1K", latency: "~300ms", tags: ["Efficient", "Instruction", "Safe"] },
  
  // Chat & Assistants
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", category: "chat", description: "Most capable Claude model for complex tasks and nuanced conversations.", contextLength: 200000, pricing: "$0.015/1K", latency: "~1.2s", tags: ["Advanced", "Safe", "Long Context"], isPopular: true },
  { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "Anthropic", category: "chat", description: "Fast and affordable Claude model for everyday tasks and quick responses.", contextLength: 200000, pricing: "$0.00015/1K", latency: "~280ms", tags: ["Fast", "Affordable", "Versatile"] },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", category: "chat", description: "Balanced Claude model with strong reasoning and coding capabilities.", contextLength: 200000, pricing: "$0.004/1K", latency: "~420ms", tags: ["Balanced", "Code", "Reasoning"] },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "Anthropic", category: "chat", description: "Enhanced Sonnet with improved instruction following and creative writing.", contextLength: 200000, pricing: "$0.005/1K", latency: "~460ms", tags: ["Creative", "Accurate", "Versatile"] },
  { id: "claude-opus-4.5", name: "Claude Opus 4.5", provider: "Anthropic", category: "chat", description: "Most powerful Claude model with exceptional reasoning and analysis.", contextLength: 200000, pricing: "$0.02/1K", latency: "~750ms", tags: ["Advanced", "Reasoning", "Analysis"], isPopular: true },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI", category: "chat", description: "Latest GPT-4 with improved instruction following and knowledge cutoff.", contextLength: 128000, pricing: "$0.01/1K", latency: "~900ms", tags: ["Versatile", "Vision", "JSON Mode"], isPopular: true },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", category: "chat", description: "Optimized GPT-4 with faster responses and multimodal capabilities.", contextLength: 128000, pricing: "$0.005/1K", latency: "~400ms", tags: ["Multimodal", "Fast", "Vision"] },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI", category: "chat", description: "Refined GPT-4 with better coding, instruction following, and long context.", contextLength: 128000, pricing: "$0.006/1K", latency: "~500ms", tags: ["Code", "Instruction", "Reliable"] },
  { id: "gpt-5", name: "GPT-5", provider: "OpenAI", category: "chat", description: "Next-generation GPT with breakthrough reasoning and multimodal understanding.", contextLength: 256000, pricing: "$0.015/1K", latency: "~650ms", tags: ["Advanced", "Reasoning", "Long Context"], isPopular: true },
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", category: "chat", description: "Compact GPT-5 with excellent cost-performance ratio for production use.", contextLength: 256000, pricing: "$0.003/1K", latency: "~350ms", tags: ["Efficient", "Fast", "Affordable"] },
  { id: "gpt-5.1", name: "GPT-5.1", provider: "OpenAI", category: "chat", description: "Enhanced GPT-5 with improved factuality and instruction adherence.", contextLength: 256000, pricing: "$0.018/1K", latency: "~680ms", tags: ["Factual", "Precise", "Reliable"] },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google", category: "chat", description: "Google's conversational AI with multimodal capabilities.", contextLength: 32000, pricing: "$0.0005/1K", latency: "~500ms", tags: ["Multimodal", "Fast", "Reasoning"] },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "Google", category: "chat", description: "Ultra-fast Gemini model optimized for low-latency production workloads.", contextLength: 1000000, pricing: "$0.00015/1K", latency: "~250ms", tags: ["Ultra Fast", "1M Context", "Efficient"] },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Preview)", provider: "Google", category: "chat", description: "Next-generation Gemini with state-of-the-art reasoning and multimodal capabilities.", contextLength: 1000000, pricing: "$0.005/1K", latency: "~480ms", tags: ["Preview", "Advanced", "Multimodal"], isPopular: true },
  { id: "command-r-plus", name: "Command R+", provider: "Cohere", category: "chat", description: "Enterprise-grade conversational AI with RAG optimization.", contextLength: 128000, pricing: "$0.003/1K", latency: "~600ms", tags: ["RAG", "Enterprise", "Grounded"] },

  // Reasoning & Analysis
  { id: "o1-preview", name: "O1 Preview", provider: "OpenAI", category: "reasoning", description: "Advanced reasoning model that thinks step-by-step for complex problems.", contextLength: 128000, pricing: "$0.015/1K", latency: "~3s", tags: ["Chain-of-Thought", "Math", "Logic"], isPopular: true },
  { id: "gpt-5.2", name: "GPT-5.2", provider: "OpenAI", category: "reasoning", description: "OpenAI's most capable reasoning model with enhanced problem-solving abilities.", contextLength: 256000, pricing: "$0.025/1K", latency: "~800ms", tags: ["Reasoning", "Analysis", "Complex Tasks"], isPopular: true },
  { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic", category: "reasoning", description: "Balanced model excelling at analysis and structured reasoning.", contextLength: 200000, pricing: "$0.003/1K", latency: "~700ms", tags: ["Analysis", "Code", "Research"] },
  { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", category: "reasoning", description: "Specialized reasoning model with mathematical and logical capabilities.", contextLength: 64000, pricing: "$0.0014/1K", latency: "~2s", tags: ["Math", "Science", "Reasoning"] },
  
  // Image Generation
  { id: "img-google/nano-banana-2", name: "Google Nano Banana 2 (Flash Image 3.1)", provider: "Google", category: "image-gen", description: "Professional image generation with Russian text support. Fast, high-quality outputs.", pricing: "$0.020/img", latency: "~3s", tags: ["Russian Text", "Professional", "Flash"], isNew: true },
  { id: "img-google/nano-banana-pro", name: "Google Nano Banana Pro (Gemini Image Pro 3)", provider: "Google", category: "image-gen", description: "Top-tier image generation with exceptional prompt adherence and Russian text support.", pricing: "$0.020/img", latency: "~4s", tags: ["Russian Text", "Top Tier", "Professional"], isPopular: true, isNew: true },
  { id: "img-google/flash-25", name: "Google Flash Image 2.5 (Nano Banana)", provider: "Google", category: "image-gen", description: "Professional-grade image generation with fast inference and high visual quality.", pricing: "$0.020/img", latency: "~3s", tags: ["Fast", "Professional", "Visual Quality"], isNew: true },
  { id: "img-google/imagen4-preview", name: "Google Imagen 4", provider: "Google", category: "image-gen", description: "State-of-the-art image generation from Google with photorealistic quality.", pricing: "$0.020/img", latency: "~5s", tags: ["Photorealistic", "Professional", "Premium"], isNew: true },
  { id: "img-google/imagen4-preview-fast", name: "Google Imagen 4 Fast", provider: "Google", category: "image-gen", description: "Fast variant of Imagen 4 balancing quality with speed.", pricing: "$0.020/img", latency: "~2.5s", tags: ["Fast", "Photorealistic", "Premium"], isNew: true },
  { id: "img-google/imagen4-preview-ultra", name: "Google Imagen 4 Ultra", provider: "Google", category: "image-gen", description: "Ultra-quality Imagen 4 for maximum detail and fidelity.", pricing: "$0.020/img", latency: "~6s", tags: ["Ultra Quality", "Maximum Detail", "Premium"], isNew: true },
  { id: "img-flux/flux-2-pro", name: "FLUX 2 Pro", provider: "Black Forest Labs", category: "image-gen", description: "Professional FLUX 2 with Russian text support and superior image quality.", pricing: "$0.020/img", latency: "~4s", tags: ["Russian Text", "Professional", "FLUX 2"], isNew: true },
  { id: "img-flux/flux-2", name: "FLUX 2", provider: "Black Forest Labs", category: "image-gen", description: "Next-generation FLUX model with improved quality and Russian text support.", pricing: "$0.020/img", latency: "~3.5s", tags: ["Russian Text", "High Quality", "FLUX 2"], isNew: true },
  { id: "img-flux/flux-2-flex", name: "FLUX 2 (flex)", provider: "Black Forest Labs", category: "image-gen", description: "Flexible FLUX 2 variant supporting variable image sizes and aspect ratios.", pricing: "$0.020/img", latency: "~4s", tags: ["Flexible", "Variable Size", "FLUX 2"], isNew: true },
  { id: "img-flux/flux-2-klein-9b", name: "FLUX 2 Klein 9B", provider: "Black Forest Labs", category: "image-gen", description: "9B parameter FLUX 2 variant with Russian text support and balanced quality.", pricing: "$0.020/img", latency: "~3s", tags: ["Russian Text", "9B", "Balanced"], isNew: true },
  { id: "img-flux/flux-2-klein-4b", name: "FLUX 2 Klein 4B", provider: "Black Forest Labs", category: "image-gen", description: "Efficient 4B parameter FLUX 2 for fast and affordable image generation.", pricing: "$0.020/img", latency: "~2s", tags: ["Russian Text", "Fast", "Affordable"], isNew: true },
  { id: "img-flux/pro1.1", name: "FLUX 1.1 Pro", provider: "Black Forest Labs", category: "image-gen", description: "Improved FLUX Pro with enhanced photorealism and prompt adherence.", pricing: "$0.020/img", latency: "~4s", tags: ["Photorealistic", "Professional", "FLUX 1.x"] },
  { id: "img-flux/pro", name: "FLUX 1 Pro", provider: "Black Forest Labs", category: "image-gen", description: "Original FLUX Pro — professional-grade image generation.", pricing: "$0.020/img", latency: "~4.5s", tags: ["Professional", "High Quality", "FLUX 1.x"] },
  { id: "img-flux/dev", name: "FLUX 1 Dev", provider: "Black Forest Labs", category: "image-gen", description: "Open-weights FLUX model for research and development use cases.", pricing: "$0.020/img", latency: "~3.5s", tags: ["Open Weights", "Research", "FLUX 1.x"] },
  { id: "img-flux/schnell", name: "FLUX 1 Schnell", provider: "Black Forest Labs", category: "image-gen", description: "Fastest FLUX 1 model for rapid prototyping and real-time use cases.", pricing: "$0.020/img", latency: "~1.5s", tags: ["Ultra Fast", "Prototyping", "FLUX 1.x"], isPopular: true },
  { id: "img-flux/kontext-max", name: "FLUX Kontext Max", provider: "Black Forest Labs", category: "image-gen", description: "Maximum-quality contextual image editing and generation.", pricing: "$0.020/img", latency: "~5s", tags: ["Contextual", "Max Quality", "Editing"], isNew: true },
  { id: "img-flux/kontext-pro", name: "FLUX Kontext Pro", provider: "Black Forest Labs", category: "image-gen", description: "Professional contextual editing — precise image modifications from text.", pricing: "$0.020/img", latency: "~4s", tags: ["Contextual", "Editing", "Professional"], isNew: true },
  { id: "img-flux/juggernaut-lightning", name: "Juggernaut Lightning FLUX", provider: "Black Forest Labs", category: "image-gen", description: "Extremely fast FLUX-based model for rapid high-quality generation.", pricing: "$0.020/img", latency: "~1s", tags: ["Lightning Fast", "High Quality", "FLUX"], isNew: true },
  { id: "img-bytedance/seedream-v4.5", name: "ByteDance Seedream 4.5", provider: "ByteDance", category: "image-gen", description: "Advanced image generation with Russian text support. Competes with top Google models.", pricing: "$0.020/img", latency: "~3.5s", tags: ["Russian Text", "Advanced", "ByteDance"], isNew: true },
  { id: "img-bytedance/seedream-v4", name: "ByteDance Seedream 4.0", provider: "ByteDance", category: "image-gen", description: "High-quality image generation from ByteDance with strong aesthetic capabilities.", pricing: "$0.020/img", latency: "~3s", tags: ["Aesthetic", "High Quality", "ByteDance"], isNew: true },
  { id: "img-openai/gpt-image-1-mini", name: "GPT Image 1 Mini", provider: "OpenAI", category: "image-gen", description: "Compact OpenAI image generation model for affordable high-quality outputs.", pricing: "$0.020/img", latency: "~3s", tags: ["OpenAI", "Affordable", "Professional"], isNew: true },
  { id: "img-recraft/v3", name: "Recraft V3", provider: "Recraft", category: "image-gen", description: "30+ style presets for creative image generation with exceptional style control.", pricing: "$0.020/img", latency: "~3.5s", tags: ["30+ Styles", "Creative", "Style Control"], isNew: true },
  { id: "img-ideogram/v3", name: "Ideogram V3", provider: "Ideogram", category: "image-gen", description: "Industry-leading text rendering in images with strong typographic capabilities.", pricing: "$0.020/img", latency: "~3s", tags: ["Text Rendering", "Typography", "Creative"], isNew: true },
  { id: "img-reve", name: "Reve", provider: "Reve AI", category: "image-gen", description: "Professional image generation with high visual fidelity and artistic style.", pricing: "$0.020/img", latency: "~3s", tags: ["Artistic", "Professional", "Visual Fidelity"], isNew: true },
  { id: "img-stable/stable-diffusion-xl-lightning", name: "SDXL Lightning", provider: "Stability AI", category: "image-gen", description: "Ultra-fast SDXL variant with distillation for near-instant generation.", pricing: "$0.020/img", latency: "~1s", tags: ["Lightning Fast", "SDXL", "Real-time"], isNew: true },
  { id: "img-stable/stable-diffusion-xl-1024", name: "Stable Diffusion XL 1.0", provider: "Stability AI", category: "image-gen", description: "Classic SDXL with fine-grained control via ControlNet and LoRA.", pricing: "$0.020/img", latency: "~3s", tags: ["ControlNet", "LoRA", "Classic"] },
  { id: "img-playground-v2-5-1024px", name: "Playground v2.5", provider: "Playground", category: "image-gen", description: "Optimized for aesthetic quality and human preference alignment.", pricing: "$0.020/img", latency: "~2s", tags: ["Aesthetic", "Creative", "1024px"] },
  
  // Vision & Understanding
  { id: "llava-1.6-34b", name: "LLaVA 1.6 34B", provider: "LLaVA Team", category: "vision", description: "Multimodal vision-language model for image understanding and analysis.", contextLength: 4096, pricing: "$0.001/img", latency: "~1s", tags: ["Image Analysis", "VQA", "OCR"], isPopular: true },
  { id: "cogvlm2", name: "CogVLM 2", provider: "Tsinghua", category: "vision", description: "State-of-the-art vision-language model with deep visual understanding.", contextLength: 8192, pricing: "$0.0008/img", latency: "~800ms", tags: ["Vision", "Reasoning", "Grounding"] },
  { id: "internvl-2", name: "InternVL 2", provider: "OpenGVLab", category: "vision", description: "Open-source vision-language foundation model with strong OCR.", contextLength: 32000, pricing: "$0.0006/img", latency: "~600ms", tags: ["OCR", "Document", "Charts"] },

  // Image Editing
  { id: "instruct-pix2pix", name: "InstructPix2Pix", provider: "Stability AI", category: "image-edit", description: "Edit images using natural language instructions.", pricing: "$0.003/img", latency: "~2s", tags: ["Editing", "Instructions", "Creative"], isPopular: true },
  { id: "controlnet-sdxl", name: "ControlNet SDXL", provider: "Stability AI", category: "image-edit", description: "Precise image manipulation with structural control.", pricing: "$0.004/img", latency: "~3s", tags: ["Pose", "Depth", "Canny"] },
  
  // Speech Recognition
  { id: "whisper-large-v3", name: "Whisper Large V3", provider: "OpenAI", category: "audio", description: "Industry-leading speech recognition with 99+ language support.", pricing: "$0.006/min", latency: "~0.5s/s", tags: ["STT", "Multilingual", "Robust"], isPopular: true },
  { id: "seamless-m4t", name: "SeamlessM4T", provider: "Meta", category: "audio", description: "Multilingual speech recognition and translation in one model.", pricing: "$0.005/min", latency: "~0.6s/s", tags: ["Translation", "100 Languages", "Streaming"] },
  { id: "canary-1b", name: "Canary 1B", provider: "NVIDIA", category: "audio", description: "Fast and accurate ASR optimized for production workloads.", pricing: "$0.003/min", latency: "~0.2s/s", tags: ["Fast", "Accurate", "Production"] },

  // Text-to-Speech
  { id: "xtts-v2", name: "XTTS v2", provider: "Coqui", category: "tts", description: "Zero-shot voice cloning and multilingual text-to-speech.", pricing: "$0.008/min", latency: "~0.3s/s", tags: ["Voice Clone", "17 Languages", "Natural"], isPopular: true },
  { id: "bark", name: "Bark", provider: "Suno", category: "tts", description: "Text-to-audio generation including speech, music, and sound effects.", pricing: "$0.01/min", latency: "~2s", tags: ["Expressive", "Music", "SFX"] },
  { id: "eleven-multilingual", name: "ElevenLabs Turbo", provider: "ElevenLabs", category: "tts", description: "Ultra-realistic voice synthesis with emotional control.", pricing: "$0.015/min", latency: "~0.1s/s", tags: ["Realistic", "Emotions", "Fast"] },

  // Video Generation (txt2vid)
  { id: "txt2vid-kling/pro25-turbo", name: "Kling Pro Turbo 2.5", provider: "Kling AI", category: "video", description: "Best price/quality text-to-video model. Generates 5s professional videos.", pricing: "$1.00/video", latency: "~30s", tags: ["5s", "Professional", "Best Value"], isPopular: true, isNew: true },
  { id: "txt2vid-google/veo3.1-fast-with-audio", name: "Google Veo 3.1 Fast (with audio)", provider: "Google", category: "video", description: "Top-tier fast video generation with synchronized audio track.", pricing: "$1.66/video", latency: "~40s", tags: ["Audio", "Fast", "Google"], isPopular: true, isNew: true },
  { id: "txt2vid-google/veo3.1-fast-no-audio", name: "Google Veo 3.1 Fast (no audio)", provider: "Google", category: "video", description: "Fast Veo 3.1 video generation without audio.", pricing: "$1.10/video", latency: "~35s", tags: ["Fast", "Google", "High Quality"], isNew: true },
  { id: "txt2vid-openai/sora-2-audio-8s", name: "OpenAI Sora 2 (8s, with audio)", provider: "OpenAI", category: "video", description: "8-second Sora 2 video generation with synchronized audio.", pricing: "$2.20/video", latency: "~60s", tags: ["8s", "Audio", "OpenAI"], isNew: true },
  { id: "txt2vid-openai/sora-2-audio", name: "OpenAI Sora 2 (4s, with audio)", provider: "OpenAI", category: "video", description: "4-second Sora 2 video generation with synchronized audio.", pricing: "$1.10/video", latency: "~45s", tags: ["4s", "Audio", "OpenAI"], isNew: true },
  { id: "txt2vid-kling/master21", name: "Kling Master v2.1", provider: "Kling AI", category: "video", description: "Flagship Kling model — maximum quality text-to-video generation.", pricing: "$3.33/video", latency: "~60s", tags: ["Flagship", "Max Quality", "Premium"], isNew: true },
  { id: "txt2vid-kling/pro16", name: "Kling Pro v1.6 (Unavailable)", provider: "Kling AI", category: "video", description: "Professional Kling v1.6 — temporarily unavailable.", pricing: "$1.67/video", latency: "~45s", tags: ["Unavailable", "v1.6"] },
  { id: "txt2vid-kling/standart16", name: "Kling Standard v1.6", provider: "Kling AI", category: "video", description: "Standard Kling v1.6 — balanced quality and cost.", pricing: "$0.55/video", latency: "~30s", tags: ["Standard", "v1.6", "Balanced"], isNew: true },
  { id: "txt2vid-kling/pro15", name: "Kling Pro v1.5", provider: "Kling AI", category: "video", description: "Professional Kling v1.5 model with proven quality.", pricing: "$1.67/video", latency: "~45s", tags: ["Professional", "v1.5", "Reliable"], isNew: true },
  { id: "txt2vid-kling/standart", name: "Kling Standard", provider: "Kling AI", category: "video", description: "Standard Kling text-to-video — affordable entry-level generation.", pricing: "$0.55/video", latency: "~30s", tags: ["Standard", "Affordable", "Entry Level"] },
  { id: "txt2vid-ltx/097-distilled", name: "LTX 0.9.7 (fast)", provider: "LightTricks", category: "video", description: "Distilled fast variant of LTX 0.9.7 for rapid video generation.", pricing: "$0.13/video", latency: "~10s", tags: ["Fast", "Distilled", "Affordable"], isNew: true },
  { id: "txt2vid-ltx/video-095", name: "LTX 0.9.5", provider: "LightTricks", category: "video", description: "LightTricks LTX video model version 0.9.5.", pricing: "$0.13/video", latency: "~15s", tags: ["Open Source", "Affordable", "LTX"], isNew: true },
  
  // Code Generation
  { id: "deepseek-coder-33b", name: "DeepSeek Coder 33B", provider: "DeepSeek", category: "code", description: "Specialized code generation model trained on 2T tokens of code.", contextLength: 16000, pricing: "$0.0004/1K", latency: "~400ms", tags: ["87 Languages", "Code Gen", "Fill-in-Middle"], isPopular: true },
  { id: "grok-code-fast-1", name: "Grok Code Fast 1", provider: "xAI", category: "code", description: "Ultra-fast code generation model from xAI optimized for speed and accuracy.", contextLength: 131072, pricing: "$0.00012/1K", latency: "~200ms", tags: ["Fast", "Accurate", "128K Context"], isPopular: true },
  { id: "codellama-70b", name: "Code Llama 70B", provider: "Meta", category: "code", description: "Large-scale code model with infilling and instruction capabilities.", contextLength: 100000, pricing: "$0.0007/1K", latency: "~700ms", tags: ["Instruct", "Python", "Long Context"] },
  { id: "starcoder2-15b", name: "StarCoder2 15B", provider: "BigCode", category: "code", description: "Efficient code model trained on The Stack v2 dataset.", contextLength: 16384, pricing: "$0.0003/1K", latency: "~300ms", tags: ["619 Languages", "Efficient", "Open"] },
  
  // Embeddings
  { id: "text-embedding-3-small", name: "Text Embedding 3 Small", provider: "OpenAI", category: "embedding", description: "Fast and affordable embedding model for search, clustering, and classification tasks.", pricing: "$0.006/1M", latency: "~50ms", tags: ["1536-dim", "Fast", "Affordable"], isPopular: true },
  { id: "text-embedding-3-large", name: "Text Embedding 3 Large", provider: "OpenAI", category: "embedding", description: "High-performance embedding model with configurable dimensions up to 3072.", pricing: "$0.035/1M", latency: "~80ms", tags: ["3072-dim", "High Quality", "Flexible"] },
  { id: "qwen3-embedding-8b", name: "Qwen3 Embedding 8B", provider: "Alibaba", category: "embedding", description: "Open-source multilingual embedding model with excellent performance across benchmarks.", pricing: "$0.009/1M", latency: "~100ms", tags: ["Multilingual", "Open Source", "8192-dim"] },
  { id: "bge-large-en", name: "BGE Large EN", provider: "BAAI", category: "embedding", description: "High-performance English text embeddings for semantic search.", pricing: "$0.0001/1K", latency: "~50ms", tags: ["Search", "1024-dim", "English"] },
  { id: "e5-mistral-7b", name: "E5 Mistral 7B", provider: "Microsoft", category: "embedding", description: "LLM-based embeddings with superior semantic understanding.", pricing: "$0.0003/1K", latency: "~100ms", tags: ["Semantic", "4096-dim", "Multilingual"] },
  { id: "nomic-embed-v1.5", name: "Nomic Embed v1.5", provider: "Nomic AI", category: "embedding", description: "Open-source embeddings with Matryoshka representation learning.", pricing: "$0.0001/1K", latency: "~40ms", tags: ["Open Source", "768-dim", "Flexible"] },

  // Rerank
  { id: "rerank-v3.5", name: "Rerank v3.5", provider: "Cohere", category: "rerank", description: "State-of-the-art reranking model for improving search relevance and RAG pipelines.", pricing: "$0.002/1K", latency: "~100ms", tags: ["Search", "RAG", "English"], isPopular: true },
  { id: "rerank-multilingual-v3.0", name: "Rerank Multilingual v3.0", provider: "Cohere", category: "rerank", description: "Multilingual reranking model supporting 100+ languages for cross-lingual search.", pricing: "$0.002/1K", latency: "~120ms", tags: ["Multilingual", "100+ Languages", "Search"] },
  { id: "jina-reranker-v2", name: "Jina Reranker v2", provider: "Jina AI", category: "rerank", description: "Fast and accurate reranker optimized for semantic search and retrieval tasks.", pricing: "$0.001/1K", latency: "~80ms", tags: ["Fast", "Semantic", "Multilingual"] },
  { id: "bge-reranker-v2-m3", name: "BGE Reranker v2 M3", provider: "BAAI", category: "rerank", description: "Open-source multilingual reranker with strong zero-shot cross-lingual transfer.", pricing: "$0.0005/1K", latency: "~60ms", tags: ["Open Source", "Zero-shot", "Multilingual"] },

  // Document AI
  { id: "layoutlm-v3", name: "LayoutLM v3", provider: "Microsoft", category: "document", description: "Document understanding with layout-aware language modeling.", contextLength: 512, pricing: "$0.002/page", latency: "~500ms", tags: ["Forms", "Tables", "Layout"], isPopular: true },
  { id: "donut", name: "Donut", provider: "Naver", category: "document", description: "OCR-free document understanding transformer.", contextLength: 2560, pricing: "$0.001/page", latency: "~300ms", tags: ["OCR-Free", "Receipts", "Fast"] },

  // OCR & Extraction
  { id: "trocr-large", name: "TrOCR Large", provider: "Microsoft", category: "ocr", description: "Transformer-based OCR for printed and handwritten text.", pricing: "$0.001/page", latency: "~200ms", tags: ["Handwritten", "Printed", "Accurate"], isPopular: true },
  { id: "surya-ocr", name: "Surya OCR", provider: "VikParuchuri", category: "ocr", description: "Multilingual OCR with line detection and reading order.", pricing: "$0.0005/page", latency: "~150ms", tags: ["90 Languages", "Layout", "Open Source"] },
  
  // Multimodal
  { id: "llama-3.2-90b-vision", name: "LLaMA 3.2 90B Vision", provider: "Meta", category: "multimodal", description: "Latest multimodal model with vision, reasoning, and instruction following.", contextLength: 128000, pricing: "$0.001/1K", latency: "~1s", tags: ["Vision", "Reasoning", "Multilingual"], isPopular: true },
  { id: "qwen-vl-max", name: "Qwen VL Max", provider: "Alibaba", category: "multimodal", description: "Advanced vision-language model with strong document understanding.", contextLength: 32000, pricing: "$0.0008/1K", latency: "~800ms", tags: ["Document AI", "Charts", "Bilingual"] },
  { id: "phi-3-vision", name: "Phi-3 Vision", provider: "Microsoft", category: "multimodal", description: "Compact multimodal model optimized for edge deployment.", contextLength: 4096, pricing: "$0.0002/1K", latency: "~150ms", tags: ["Compact", "Edge", "Fast"] },

  // AI Agents
  { id: "autogpt", name: "AutoGPT Agent", provider: "Community", category: "agents", description: "Autonomous AI agent for complex multi-step task execution.", contextLength: 128000, pricing: "$0.02/task", latency: "Variable", tags: ["Autonomous", "Planning", "Tools"], isPopular: true },
  { id: "open-interpreter", name: "Open Interpreter", provider: "Community", category: "agents", description: "Code-executing AI agent with system access capabilities.", contextLength: 128000, pricing: "$0.01/task", latency: "Variable", tags: ["Code Exec", "Local", "Flexible"] },

  // Fine-tunable
  { id: "llama-3.1-8b-ft", name: "LLaMA 3.1 8B (Fine-tune)", provider: "Meta", category: "fine-tune", description: "Efficient base model optimized for custom fine-tuning.", contextLength: 128000, pricing: "$0.0001/1K", latency: "~200ms", tags: ["LoRA", "QLoRA", "Fast"], isPopular: true },
  { id: "mistral-7b-ft", name: "Mistral 7B (Fine-tune)", provider: "Mistral AI", category: "fine-tune", description: "High-performance base model for domain-specific training.", contextLength: 32000, pricing: "$0.0001/1K", latency: "~150ms", tags: ["Instruct", "Base", "Efficient"] },
  { id: "phi-2-ft", name: "Phi-2 (Fine-tune)", provider: "Microsoft", category: "fine-tune", description: "Compact model ideal for edge deployment after fine-tuning.", contextLength: 2048, pricing: "$0.00005/1K", latency: "~50ms", tags: ["Compact", "Edge", "2.7B"] },
  { id: "gemma-7b-ft", name: "Gemma 7B (Fine-tune)", provider: "Google", category: "fine-tune", description: "Google's open model optimized for custom training workflows.", contextLength: 8192, pricing: "$0.00008/1K", latency: "~100ms", tags: ["Open", "Safe", "Research"] },
];

const categoryTitles: Record<string, string> = {
  llm: "Large Language Models",
  chat: "Chat & Assistants",
  reasoning: "Reasoning & Analysis",
  "image-gen": "Image Generation",
  vision: "Vision & Understanding",
  "image-edit": "Image Editing",
  audio: "Speech Recognition",
  tts: "Text-to-Speech",
  video: "Video Generation",
  code: "Code Generation",
  embedding: "Embeddings",
  rerank: "Reranking",
  document: "Document AI",
  ocr: "OCR & Extraction",
  multimodal: "Multimodal Models",
  agents: "AI Agents",
  "fine-tune": "Fine-tunable Models",
};

const categoryDescriptions: Record<string, string> = {
  llm: "Foundation language models for text generation and understanding.",
  chat: "Conversational AI optimized for dialogue and assistant applications.",
  reasoning: "Models specialized in complex problem-solving and analytical tasks.",
  "image-gen": "Generate images from text prompts using diffusion models.",
  vision: "Analyze and understand images, documents, and visual content.",
  "image-edit": "Edit and manipulate existing images with AI assistance.",
  audio: "Convert speech to text with high accuracy across languages.",
  tts: "Generate natural-sounding speech from text input.",
  video: "Create video content from text or image prompts.",
  code: "Specialized models for code generation and completion.",
  embedding: "Convert text to vectors for semantic search and similarity.",
  rerank: "Reorder search results by relevance for improved RAG and retrieval.",
  document: "Extract and understand information from documents.",
  ocr: "Optical character recognition for text extraction from images.",
  multimodal: "Models that process multiple modalities (text, image, audio).",
  agents: "Autonomous AI agents for complex multi-step tasks.",
  "fine-tune": "Base models optimized for custom fine-tuning.",
};

// Map from model_pricing.model_id to the modelsData id for matching
const modelIdMapping: Record<string, string[]> = {
  "regraph/ReGraph-LLM": ["regraph-llm"],
  "openai/gpt-5": ["gpt-5"],
  "openai/gpt-5-mini": ["gpt-5-mini"],
  "openai/gpt-5.1": ["gpt-5.1"],
  "openai/gpt-5.2": ["gpt-5.2"],
  "anthropic/claude-4.5-sonnet": ["claude-sonnet-4.5"],
  "anthropic/claude-4.5-opus": ["claude-opus-4.5"],
  "google/gemini-2.5-flash": ["gemini-3-flash"],
  "google/gemini-2.5-pro": ["gemini-3-pro-preview"],
};

const Models = () => {
  const sidebarFixedLeft = "max(1rem, calc((100vw - 1400px) / 2 + 1rem))";
  const [activeCategory, setActiveCategory] = useState("llm");
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("default");

  // Fetch dynamic pricing from DB
  const { data: dbPricing } = useQuery({
    queryKey: ["model-pricing-for-models-page"],
    queryFn: async () => {
      const { data } = await supabase
        .from("model_pricing")
        .select("model_id, price_per_1k_input_tokens, is_active")
        .eq("is_active", true);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Merge dynamic pricing into static models data
  const enrichedModels = useMemo(() => {
    if (!dbPricing || dbPricing.length === 0) return modelsData;

    // Build reverse map: frontend model id -> price
    const priceMap = new Map<string, number>();
    for (const p of dbPricing) {
      const frontendIds = modelIdMapping[p.model_id];
      if (frontendIds) {
        for (const fid of frontendIds) {
          priceMap.set(fid, Number(p.price_per_1k_input_tokens));
        }
      }
    }

    if (priceMap.size === 0) return modelsData;

    return modelsData.map((model) => {
      const dbPrice = priceMap.get(model.id);
      if (dbPrice !== undefined) {
        return { ...model, pricing: `$${dbPrice}/1K` };
      }
      return model;
    });
  }, [dbPricing]);

  // Get unique providers for current category
  const availableProviders = useMemo(() => {
    const categoryModels = enrichedModels.filter(m => m.category === activeCategory);
    const providers = [...new Set(categoryModels.map(m => m.provider))];
    return providers.sort();
  }, [activeCategory, enrichedModels]);

  const filteredModels = useMemo(() => {
    let models = enrichedModels
      .filter(model => model.category === activeCategory)
      .filter(model => 
        searchQuery === "" ||
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .filter(model => selectedProvider === "all" || model.provider === selectedProvider);

    // Apply sorting
    switch (sortOption) {
      case "price-asc":
        models = [...models].sort((a, b) => parsePrice(a.pricing) - parsePrice(b.pricing));
        break;
      case "price-desc":
        models = [...models].sort((a, b) => parsePrice(b.pricing) - parsePrice(a.pricing));
        break;
      case "latency-asc":
        models = [...models].sort((a, b) => parseLatency(a.latency) - parseLatency(b.latency));
        break;
      case "latency-desc":
        models = [...models].sort((a, b) => parseLatency(b.latency) - parseLatency(a.latency));
        break;
      default:
        // Keep popular models first by default
        models = [...models].sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
    }

    return models;
  }, [activeCategory, searchQuery, selectedProvider, sortOption, enrichedModels]);

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSelectedModel(null);
    setSearchQuery("");
    setSelectedProvider("all");
    setSortOption("default");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedProvider("all");
    setSortOption("default");
  };

  const hasActiveFilters = searchQuery !== "" || selectedProvider !== "all" || sortOption !== "default";

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Helmet>
        <title>AI Models — ReGraph | 50+ LLMs, Vision & Audio Models</title>
        <meta name="description" content="Browse 50+ AI models on ReGraph including GPT-5, Claude 4.5, Llama, Mistral, and more. Compare capabilities, pricing, and context windows." />
        <meta name="keywords" content="AI models, LLM catalog, GPT-5, Claude, Llama, Mistral, AI model comparison, inference pricing" />
        <link rel="canonical" href="https://regraph.tech/models" />
      </Helmet>
      <Navbar />
      
      <div className="pt-16 flex-1 flex flex-col">
        <SidebarProvider
          defaultOpen={true}
          className="flex-col"
          style={{ ["--sidebar-fixed-left" as any]: sidebarFixedLeft } as CSSProperties}
        >
          {/* Sidebar gutter fill for wide screens */}
          <div
            className="hidden md:block fixed top-16 left-0 bottom-0 bg-sidebar z-[5]"
            style={{ width: `calc(${sidebarFixedLeft})` }}
            aria-hidden="true"
          />
          <div className="flex w-full flex-1">
            <ModelsSidebar 
              activeCategory={activeCategory} 
              onCategoryChange={handleCategoryChange} 
            />
            
            <main className="flex-1 min-w-0">
              <div className="px-4 py-8 max-w-6xl mx-auto overflow-hidden">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Category Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Mobile sidebar trigger */}
                      <SidebarTrigger className="md:hidden h-10 w-10 shrink-0" />
                      <h1 className="text-3xl md:text-4xl font-bold">
                        {categoryTitles[activeCategory]}
                      </h1>
                    </div>
                    <p className="text-muted-foreground">{categoryDescriptions[activeCategory]}</p>
                  </div>

                  {/* Search & Filters */}
                  <div className="mb-6 space-y-3">
                    {/* Desktop: single row | Tablet: two rows | Mobile: three rows */}
                    <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-3">
                      {/* Search - full width on mobile, grows on desktop */}
                      <div className="relative w-full md:w-auto md:flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search models..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-full"
                        />
                      </div>

                      {/* Provider Filter - full width on mobile */}
                      <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                        <SelectTrigger className="w-full md:w-[180px]">
                          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="All Providers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Providers</SelectItem>
                          {availableProviders.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Sort Options - full width on mobile */}
                      <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                        <SelectTrigger className="w-full md:w-[180px]">
                          <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Popular First</SelectItem>
                          <SelectItem value="price-asc">Price: Low → High</SelectItem>
                          <SelectItem value="price-desc">Price: High → Low</SelectItem>
                          <SelectItem value="latency-asc">Fastest</SelectItem>
                          <SelectItem value="latency-desc">Slowest</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Clear Filters */}
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="default"
                          onClick={clearFilters}
                          className="w-full md:w-auto"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                      )}
                    </div>

                    {/* Active Filters Display */}
                    {hasActiveFilters && (
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedProvider !== "all" && (
                          <Badge variant="secondary" className="gap-1">
                            {selectedProvider}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => setSelectedProvider("all")}
                            />
                          </Badge>
                        )}
                        {sortOption !== "default" && (
                          <Badge variant="secondary" className="gap-1">
                            {sortOption === "price-asc" && "Price ↑"}
                            {sortOption === "price-desc" && "Price ↓"}
                            {sortOption === "latency-asc" && "Fast"}
                            {sortOption === "latency-desc" && "Slow"}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => setSortOption("default")}
                            />
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Models Grid */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Available Models ({filteredModels.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredModels.map((model) => (
                        <ModelCard
                          key={model.id}
                          model={model}
                          onSelect={setSelectedModel}
                          isSelected={selectedModel?.id === model.id}
                        />
                      ))}
                      {filteredModels.length === 0 && (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          No models found matching your search.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Playground Modal */}
                  <AnimatePresence>
                    {selectedModel && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                        onClick={() => setSelectedModel(null)}
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          transition={{ duration: 0.2 }}
                          className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ModelPlayground 
                            model={selectedModel} 
                            onClose={() => setSelectedModel(null)}
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </div>

      <div id="site-footer" className="relative z-30 bg-card">
        <Footer />
      </div>
    </div>
  );
};

export default Models;
