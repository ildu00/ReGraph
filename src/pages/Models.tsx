import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Search, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ModelsSidebar from "@/components/models/ModelsSidebar";
import ModelCard, { type Model } from "@/components/models/ModelCard";
import ModelPlayground from "@/components/models/ModelPlayground";

const modelsData: Model[] = [
  // LLM
  { id: "llama-3.1-70b", name: "LLaMA 3.1 70B", provider: "Meta", category: "llm", description: "State-of-the-art open-source LLM with excellent reasoning and instruction following capabilities.", contextLength: 128000, pricing: "$0.0008/1K", latency: "~800ms", tags: ["Chat", "Reasoning", "Multilingual"], isPopular: true },
  { id: "llama-3.1-8b", name: "LLaMA 3.1 8B", provider: "Meta", category: "llm", description: "Efficient smaller model ideal for quick responses and cost-effective deployments.", contextLength: 128000, pricing: "$0.0002/1K", latency: "~200ms", tags: ["Fast", "Efficient", "Chat"] },
  { id: "mistral-large", name: "Mistral Large", provider: "Mistral AI", category: "llm", description: "Powerful model with strong multilingual and code generation capabilities.", contextLength: 32000, pricing: "$0.0006/1K", latency: "~600ms", tags: ["Code", "Multilingual", "Reasoning"], isPopular: true },
  { id: "mixtral-8x22b", name: "Mixtral 8x22B", provider: "Mistral AI", category: "llm", description: "Mixture of Experts model offering excellent performance across diverse tasks.", contextLength: 64000, pricing: "$0.0007/1K", latency: "~700ms", tags: ["MoE", "Versatile", "Efficient"] },
  { id: "qwen-72b", name: "Qwen 72B", provider: "Alibaba", category: "llm", description: "High-performance model with strong Chinese and English language support.", contextLength: 32000, pricing: "$0.0005/1K", latency: "~650ms", tags: ["Bilingual", "Reasoning", "Chat"] },
  { id: "gemma-2-27b", name: "Gemma 2 27B", provider: "Google", category: "llm", description: "Lightweight yet capable model from Google's Gemma family.", contextLength: 8192, pricing: "$0.0003/1K", latency: "~300ms", tags: ["Efficient", "Instruction", "Safe"] },
  
  // Image Generation
  { id: "sdxl-turbo", name: "SDXL Turbo", provider: "Stability AI", category: "image-gen", description: "Ultra-fast image generation with distilled diffusion for real-time applications.", pricing: "$0.002/img", latency: "~1.5s", tags: ["Fast", "Photorealistic", "1024px"], isPopular: true },
  { id: "sdxl-1.0", name: "Stable Diffusion XL", provider: "Stability AI", category: "image-gen", description: "High-quality image generation with fine-grained control over outputs.", pricing: "$0.004/img", latency: "~3s", tags: ["High Quality", "ControlNet", "LoRA"] },
  { id: "kandinsky-3", name: "Kandinsky 3", provider: "Sber", category: "image-gen", description: "Advanced diffusion model with excellent text rendering and composition.", pricing: "$0.003/img", latency: "~2.5s", tags: ["Text-in-Image", "Artistic", "1024px"] },
  { id: "playground-v2.5", name: "Playground v2.5", provider: "Playground", category: "image-gen", description: "Optimized for aesthetic quality and human preference alignment.", pricing: "$0.003/img", latency: "~2s", tags: ["Aesthetic", "Creative", "1024px"] },
  
  // Vision
  { id: "llava-1.6-34b", name: "LLaVA 1.6 34B", provider: "LLaVA Team", category: "vision", description: "Multimodal vision-language model for image understanding and analysis.", contextLength: 4096, pricing: "$0.001/img", latency: "~1s", tags: ["Image Analysis", "VQA", "OCR"], isPopular: true },
  { id: "cogvlm2", name: "CogVLM 2", provider: "Tsinghua", category: "vision", description: "State-of-the-art vision-language model with deep visual understanding.", contextLength: 8192, pricing: "$0.0008/img", latency: "~800ms", tags: ["Vision", "Reasoning", "Grounding"] },
  { id: "internvl-2", name: "InternVL 2", provider: "OpenGVLab", category: "vision", description: "Open-source vision-language foundation model with strong OCR.", contextLength: 32000, pricing: "$0.0006/img", latency: "~600ms", tags: ["OCR", "Document", "Charts"] },
  
  // Audio
  { id: "whisper-large-v3", name: "Whisper Large V3", provider: "OpenAI", category: "audio", description: "Industry-leading speech recognition with 99+ language support.", pricing: "$0.006/min", latency: "~0.5s/s", tags: ["STT", "Multilingual", "Robust"], isPopular: true },
  { id: "xtts-v2", name: "XTTS v2", provider: "Coqui", category: "audio", description: "Zero-shot voice cloning and multilingual text-to-speech.", pricing: "$0.008/min", latency: "~0.3s/s", tags: ["TTS", "Voice Clone", "17 Languages"] },
  { id: "bark", name: "Bark", provider: "Suno", category: "audio", description: "Text-to-audio generation including speech, music, and sound effects.", pricing: "$0.01/min", latency: "~2s", tags: ["TTS", "Music", "SFX"] },
  
  // Embeddings
  { id: "bge-large-en", name: "BGE Large EN", provider: "BAAI", category: "embedding", description: "High-performance English text embeddings for semantic search.", pricing: "$0.0001/1K", latency: "~50ms", tags: ["Search", "1024-dim", "English"], isPopular: true },
  { id: "e5-mistral-7b", name: "E5 Mistral 7B", provider: "Microsoft", category: "embedding", description: "LLM-based embeddings with superior semantic understanding.", pricing: "$0.0003/1K", latency: "~100ms", tags: ["Semantic", "4096-dim", "Multilingual"] },
  { id: "nomic-embed-v1.5", name: "Nomic Embed v1.5", provider: "Nomic AI", category: "embedding", description: "Open-source embeddings with Matryoshka representation learning.", pricing: "$0.0001/1K", latency: "~40ms", tags: ["Open Source", "768-dim", "Flexible"] },
  
  // Code
  { id: "deepseek-coder-33b", name: "DeepSeek Coder 33B", provider: "DeepSeek", category: "code", description: "Specialized code generation model trained on 2T tokens of code.", contextLength: 16000, pricing: "$0.0004/1K", latency: "~400ms", tags: ["87 Languages", "Code Gen", "Fill-in-Middle"], isPopular: true },
  { id: "codellama-70b", name: "Code Llama 70B", provider: "Meta", category: "code", description: "Large-scale code model with infilling and instruction capabilities.", contextLength: 100000, pricing: "$0.0007/1K", latency: "~700ms", tags: ["Instruct", "Python", "Long Context"] },
  { id: "starcoder2-15b", name: "StarCoder2 15B", provider: "BigCode", category: "code", description: "Efficient code model trained on The Stack v2 dataset.", contextLength: 16384, pricing: "$0.0003/1K", latency: "~300ms", tags: ["619 Languages", "Efficient", "Open"] },
  
  // Multimodal
  { id: "llama-3.2-90b-vision", name: "LLaMA 3.2 90B Vision", provider: "Meta", category: "multimodal", description: "Latest multimodal model with vision, reasoning, and instruction following.", contextLength: 128000, pricing: "$0.001/1K", latency: "~1s", tags: ["Vision", "Reasoning", "Multilingual"], isPopular: true },
  { id: "qwen-vl-max", name: "Qwen VL Max", provider: "Alibaba", category: "multimodal", description: "Advanced vision-language model with strong document understanding.", contextLength: 32000, pricing: "$0.0008/1K", latency: "~800ms", tags: ["Document AI", "Charts", "Bilingual"] },
  { id: "phi-3-vision", name: "Phi-3 Vision", provider: "Microsoft", category: "multimodal", description: "Compact multimodal model optimized for edge deployment.", contextLength: 4096, pricing: "$0.0002/1K", latency: "~150ms", tags: ["Compact", "Edge", "Fast"] },
];

const categoryTitles: Record<string, string> = {
  llm: "Large Language Models",
  "image-gen": "Image Generation",
  vision: "Vision & Understanding",
  audio: "Audio & Speech",
  embedding: "Embeddings",
  code: "Code Generation",
  multimodal: "Multimodal Models",
};

const categoryDescriptions: Record<string, string> = {
  llm: "Text generation, chat, reasoning, and instruction-following models for natural language tasks.",
  "image-gen": "Generate images from text prompts using diffusion and GAN-based models.",
  vision: "Analyze and understand images, documents, charts, and visual content.",
  audio: "Speech recognition, text-to-speech, and audio generation models.",
  embedding: "Convert text to vector representations for semantic search and similarity.",
  code: "Specialized models for code generation, completion, and understanding.",
  multimodal: "Models that can process and generate across multiple modalities (text, image, audio).",
};

const Models = () => {
  const [activeCategory, setActiveCategory] = useState("llm");
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredModels = useMemo(() => {
    return modelsData
      .filter(model => model.category === activeCategory)
      .filter(model => 
        searchQuery === "" ||
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [activeCategory, searchQuery]);

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSelectedModel(null);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Navbar />
      
      <div className="pt-16 flex-1 flex flex-col">
        <SidebarProvider defaultOpen={true} className="flex-col">
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
                  {/* Header */}
                  <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
                      <Sparkles className="h-8 w-8 text-primary" />
                      <span className="text-gradient">Model</span> Catalog
                    </h1>
                    <p className="text-xl text-muted-foreground">
                      Explore and test AI models available on the ReGraph network.
                    </p>
                  </div>

                  {/* Category Header */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">{categoryTitles[activeCategory]}</h2>
                    <p className="text-muted-foreground">{categoryDescriptions[activeCategory]}</p>
                  </div>

                  {/* Search */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search models by name, provider, or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
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
