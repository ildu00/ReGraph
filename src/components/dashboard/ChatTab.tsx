import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Loader2,
  ImagePlus,
  FileUp,
  X,
  Bot,
  User,
  Copy,
  Check,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "@/components/CodeBlock";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  attachments?: { name: string; type: string; preview?: string }[];
  timestamp: Date;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  category: string;
}

const MODELS: ModelOption[] = [
  // Chat & LLM
  { id: "regraph-llm", name: "ReGraph LLM", provider: "ReGraph", category: "llm" },
  { id: "gpt-5", name: "GPT-5", provider: "OpenAI", category: "chat" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", category: "chat" },
  { id: "gpt-5.2", name: "GPT-5.2", provider: "OpenAI", category: "reasoning" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI", category: "chat" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", category: "chat" },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", category: "chat" },
  { id: "claude-opus-4.5", name: "Claude Opus 4.5", provider: "Anthropic", category: "chat" },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "Anthropic", category: "chat" },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "Google", category: "chat" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "Google", category: "chat" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google", category: "chat" },
  { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-v4-pro-alt-thinking", name: "DeepSeek V4 Pro 1.6T (Alt, Thinking)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-v4-pro-alt", name: "DeepSeek V4 Pro 1.6T (Alt)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-v4-flash-alt-thinking", name: "DeepSeek V4 Flash 284B (Alt, Thinking)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-v4-flash-alt", name: "DeepSeek V4 Flash 284B (Alt)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-v4-pro-thinking", name: "DeepSeek V4 Pro 1.6T (Thinking)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro 1.6T", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-v4-flash-thinking", name: "DeepSeek V4 Flash 284B (Thinking)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash 284B", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat (V4 Flash)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-coder", name: "DeepSeek Coder", provider: "DeepSeek", category: "code" },
  { id: "deepseek/deepseek-v3.2-alt-faster", name: "DeepSeek V3.2 671B (Alt, Faster)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-v3.2-speciale-alt", name: "DeepSeek V3.2 Speciale (Alt)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-v3.2-alt-thinking", name: "DeepSeek V3.2 671B (Alt, Thinking)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-v3.2-alt", name: "DeepSeek V3.2 671B (Alt)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-v3.2-exp-alt-thinking", name: "DeepSeek V3.2 Exp (Alt, Thinking)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-v3.2-exp-alt", name: "DeepSeek V3.2 Exp (Alt)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-chat-3.1-alt-fast", name: "DeepSeek Chat 3.1 (Alt, Fast)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-chat-3.1-terminus-alt-thinking", name: "DeepSeek Chat 3.1 Terminus (Alt, Thinking)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-chat-3.1-terminus-alt", name: "DeepSeek Chat 3.1 Terminus (Alt)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-chat-3.1-alt-thinking", name: "DeepSeek Chat 3.1 (Alt, Thinking)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-chat-3.1-alt", name: "DeepSeek Chat 3.1 (Alt)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-r1-alt-0528", name: "DeepSeek R1 0528 (Alt)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-r1-alt-fast", name: "DeepSeek R1 (Alt, Fast)", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill Llama 70B", provider: "DeepSeek", category: "reasoning" },
  { id: "deepseek/deepseek-chat-0324-alt-fast", name: "DeepSeek Chat 0324 (Alt, Fast)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-chat-0324-alt", name: "DeepSeek Chat 0324 (Alt)", provider: "DeepSeek", category: "llm" },
  { id: "deepseek/deepseek-chat-alt", name: "DeepSeek Chat (Alt)", provider: "DeepSeek", category: "llm" },
  { id: "aion/aion-2.0", name: "Aion 2.0", provider: "AionLabs", category: "chat" },
  { id: "perplexity/sonar-r1-online", name: "Perplexity Sonar Reasoning Online", provider: "Perplexity", category: "reasoning" },
  { id: "mistral-large", name: "Mistral Large", provider: "Mistral AI", category: "llm" },
  { id: "command-r-plus", name: "Command R+", provider: "Cohere", category: "chat" },
  // Meta Llama
  { id: "meta-llama/llama-3.3-70b-instruct-superfast", name: "Llama 3.3 70B SuperFast", provider: "Meta", category: "llm" },
  { id: "meta-llama/llama-4-scout-superfast", name: "Llama 4 Scout SuperFast", provider: "Meta", category: "llm" },
  { id: "meta-llama/llama-4-maverick-fast", name: "Llama 4 Maverick Fast", provider: "Meta", category: "llm" },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", provider: "Meta", category: "llm" },
  { id: "meta-llama/llama-4-scout", name: "Llama 4 Scout", provider: "Meta", category: "llm" },
  { id: "meta-llama/llama-3.3-70b-instruct-fast", name: "Llama 3.3 70B Fast", provider: "Meta", category: "llm" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", provider: "Meta", category: "llm" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", provider: "Meta", category: "llm" },
  { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B", provider: "Meta", category: "llm" },
  { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B", provider: "Meta", category: "llm" },
  { id: "meta-llama/llama-3.2-3b-instruct", name: "Llama 3.2 3B", provider: "Meta", category: "llm" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Nemotron 70B", provider: "NVIDIA", category: "llm" },
  // Code
  { id: "deepseek-coder-33b", name: "DeepSeek Coder 33B", provider: "DeepSeek", category: "code" },
  { id: "grok-code-fast-1", name: "Grok Code Fast 1", provider: "xAI", category: "code" },
  { id: "codellama-70b", name: "Code Llama 70B", provider: "Meta", category: "code" },
  { id: "meta-llama/llama-3.3-70b-structured", name: "Llama 3.3 70B Structured", provider: "Meta", category: "code" },
  // Vision & Multimodal
  { id: "llava-1.6-34b", name: "LLaVA 1.6 34B", provider: "LLaVA Team", category: "vision" },
  { id: "phi-3-vision", name: "Phi-3 Vision", provider: "Microsoft", category: "multimodal" },
  { id: "meta-llama/llama-4-maverick-online-hq", name: "Llama 4 Maverick Online HQ", provider: "Meta", category: "multimodal" },
  // Image Generation
  { id: "img-google/nano-banana-2", name: "Google Nano Banana 2", provider: "Google", category: "image-gen" },
  { id: "img-google/nano-banana-pro", name: "Google Nano Banana Pro", provider: "Google", category: "image-gen" },
  { id: "img-google/flash-25", name: "Google Flash Image 2.5", provider: "Google", category: "image-gen" },
  { id: "img-google/imagen4-preview", name: "Google Imagen 4", provider: "Google", category: "image-gen" },
  { id: "img-google/imagen4-preview-fast", name: "Google Imagen 4 Fast", provider: "Google", category: "image-gen" },
  { id: "img-google/imagen4-preview-ultra", name: "Google Imagen 4 Ultra", provider: "Google", category: "image-gen" },
  { id: "img-flux/flux-2-pro", name: "FLUX 2 Pro", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/flux-2", name: "FLUX 2", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/flux-2-flex", name: "FLUX 2 (flex)", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/flux-2-klein-9b", name: "FLUX 2 Klein 9B", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/flux-2-klein-4b", name: "FLUX 2 Klein 4B", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/pro1.1", name: "FLUX 1.1 Pro", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/pro", name: "FLUX 1 Pro", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/dev", name: "FLUX 1 Dev", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/schnell", name: "FLUX 1 Schnell", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/kontext-max", name: "FLUX Kontext Max", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/kontext-pro", name: "FLUX Kontext Pro", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-flux/juggernaut-lightning", name: "Juggernaut Lightning FLUX", provider: "Black Forest Labs", category: "image-gen" },
  { id: "img-bytedance/seedream-v4.5", name: "ByteDance Seedream 4.5", provider: "ByteDance", category: "image-gen" },
  { id: "img-bytedance/seedream-v4", name: "ByteDance Seedream 4.0", provider: "ByteDance", category: "image-gen" },
  { id: "img-openai/gpt-image-1-mini", name: "GPT Image 1 Mini", provider: "OpenAI", category: "image-gen" },
  { id: "img-recraft/v3", name: "Recraft V3", provider: "Recraft", category: "image-gen" },
  { id: "img-ideogram/v3", name: "Ideogram V3", provider: "Ideogram", category: "image-gen" },
  { id: "img-reve", name: "Reve", provider: "Reve AI", category: "image-gen" },
  { id: "img-stable/stable-diffusion-xl-lightning", name: "SDXL Lightning", provider: "Stability AI", category: "image-gen" },
  { id: "img-stable/stable-diffusion-xl-1024", name: "Stable Diffusion XL 1.0", provider: "Stability AI", category: "image-gen" },
  { id: "img-playground-v2-5-1024px", name: "Playground v2.5", provider: "Playground", category: "image-gen" },
];

const INFERENCE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-inference`;
const STORAGE_KEY = "regraph-chat-messages";
const API_KEY_CACHE_KEY = "regraph-chat-api-key";

/** Get or auto-create an API key for the current user */
const getOrCreateApiKey = async (userId: string): Promise<string | null> => {
  // Check cache first
  const cached = sessionStorage.getItem(API_KEY_CACHE_KEY);
  if (cached) return cached;

  // Fetch existing active key
  const { data: existing } = await supabase
    .from("api_keys")
    .select("full_key")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (existing?.full_key) {
    sessionStorage.setItem(API_KEY_CACHE_KEY, existing.full_key);
    return existing.full_key;
  }

  // Auto-create a default key
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let newKey = "rg_";
  for (let i = 0; i < 48; i++) newKey += chars.charAt(Math.floor(Math.random() * chars.length));

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(newKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const { error } = await supabase.from("api_keys").insert({
    user_id: userId,
    name: "Default",
    key_prefix: newKey.substring(0, 10) + "...",
    key_hash: keyHash,
    full_key: newKey,
  });

  if (error) {
    console.error("Failed to auto-create API key:", error);
    return null;
  }

  sessionStorage.setItem(API_KEY_CACHE_KEY, newKey);
  return newKey;
};
const MODEL_STORAGE_KEY = "regraph-chat-model";

const loadMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch { return []; }
};

const saveMessages = (msgs: ChatMessage[]) => {
  try {
    // Don't store image previews in attachments to save space
    const slim = msgs.map((m) => ({
      ...m,
      attachments: m.attachments?.map((a) => ({ name: a.name, type: a.type })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch { /* quota exceeded – silently fail */ }
};

const ChatTab = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem(MODEL_STORAGE_KEY) || "regraph-llm"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persist messages to localStorage
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Persist selected model
  useEffect(() => {
    localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  // Scroll to top when chat mounts so the fixed container starts at correct position
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll to bottom when keyboard opens on mobile (visualViewport resize)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const getModelInfo = (id: string) => MODELS.find((m) => m.id === id);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed && attachedFiles.length === 0) return;

    const modelInfo = getModelInfo(selectedModel);
    const attachments: ChatMessage["attachments"] = [];
    let imagePreview: string | undefined;

    // Process attached files
    for (const file of attachedFiles) {
      const preview = file.type.startsWith("image/")
        ? await fileToBase64(file)
        : undefined;
      if (file.type.startsWith("image/") && !imagePreview) imagePreview = preview;
      attachments.push({ name: file.name, type: file.type, preview });
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = '40px';
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      // Build prompt with file context
      let fullPrompt = trimmed;
      if (attachments?.length) {
        const fileNames = attachments.map((a) => a.name).join(", ");
        fullPrompt = `[Attached files: ${fileNames}]\n\n${trimmed}`;
      }

      // Use user's session token for billing, fall back to anon key
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Get user's API key for logging attribution
      const userId = sessionData?.session?.user?.id;
      const userApiKey = userId ? await getOrCreateApiKey(userId) : null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      };
      if (userApiKey) {
        headers["X-API-Key"] = userApiKey;
      }

      // Build conversation history (last 50 messages) for context
      const historyMessages = messages.slice(-50).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const messagesForApi = [
        ...historyMessages,
        { role: "user", content: fullPrompt },
      ];

      const resp = await fetch(INFERENCE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: selectedModel,
          prompt: fullPrompt,
          messages: messagesForApi,
          temperature: 0.7,
          maxTokens: 40000,
          category: modelInfo?.category || "chat",
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        const errMsg =
          resp.status === 429
            ? "Rate limit exceeded. Please wait and try again."
            : resp.status === 402
              ? (data?.message || "Insufficient balance. Please top up your wallet to continue.")
              : data?.error || "Failed to get response";
        toast.error(errMsg);
        const errAssistant: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ ${errMsg}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errAssistant]);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "",
        imageUrl: data.imageUrl || undefined,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Failed to connect to inference API");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "⚠️ Connection failed. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      // Return focus to input on mobile after send
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Chat cleared");
  };

  const modelInfo = getModelInfo(selectedModel);

  return (
    <div ref={containerRef} className="flex flex-col flex-1 min-h-0">
      {/* Model selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger data-tour="chat-model" className="w-full sm:w-[280px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Chat & LLM</div>
              {MODELS.filter((m) => ["llm", "chat", "reasoning"].includes(m.category)).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{m.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">({m.provider})</span>
                  </span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">Code</div>
              {MODELS.filter((m) => m.category === "code").map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{m.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">({m.provider})</span>
                  </span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">Vision & Multimodal</div>
              {MODELS.filter((m) => ["vision", "multimodal"].includes(m.category)).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{m.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">({m.provider})</span>
                  </span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">Image Generation</div>
              {MODELS.filter((m) => m.category === "image-gen").map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{m.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">({m.provider})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {modelInfo && (
            <Badge variant="secondary" className="hidden sm:inline-flex whitespace-nowrap">
              {modelInfo.category}
            </Badge>
          )}
        </div>
        {messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to clear the entire chat history? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearChat}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Messages Area */}
      <Card className={`flex-1 min-h-0 bg-card/50 border-border p-4 mb-2 overflow-x-hidden ${messages.length > 0 ? 'overflow-y-auto space-y-4' : 'overflow-hidden'}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 -mt-4">
            <Bot className="h-12 w-12 opacity-30" />
            <div>
              <p className="text-lg font-medium mb-1">AI Chat</p>
              <p className="text-sm max-w-md">
                Select a model and start chatting. You can attach images and files
                for multimodal models, or generate images with image generation models.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 min-w-0 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`min-w-0 rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground max-w-[80%]"
                    : "bg-secondary/70 flex-1"
                }`}
              >
                {/* User attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.attachments.map((att, i) =>
                      att.preview ? (
                        <img
                          key={i}
                          src={att.preview}
                          alt={att.name}
                          className="h-20 w-20 object-cover rounded-lg border border-border/50"
                        />
                      ) : (
                        <Badge key={i} variant="outline" className="text-xs">
                          📎 {att.name}
                        </Badge>
                      )
                    )}
                  </div>
                )}

                {/* Content */}
                {msg.role === "assistant" ? (
                  <div className="markdown-response text-sm min-w-0 overflow-hidden">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          const codeString = String(children).replace(/\n$/, "");
                          if (!inline && match) {
                            return <CodeBlock code={codeString} language={match[1]} />;
                          }
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre({ children }: any) {
                          return <>{children}</>;
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* Generated image */}
                {msg.imageUrl && (
                  <div className="mt-3 space-y-2">
                    <img
                      src={msg.imageUrl}
                      alt="Generated"
                      className="max-w-full max-h-[400px] rounded-lg object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(msg.imageUrl, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Open
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <a href={msg.imageUrl} download="generated.png">
                          <Download className="h-3 w-3 mr-1" /> Save
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Copy button for assistant */}
                {msg.role === "assistant" && msg.content && (
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                      onClick={() => handleCopy(msg.id, msg.content)}
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-secondary/70 rounded-xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 shrink-0">
          {attachedFiles.map((file, i) => (
            <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
              {file.type.startsWith("image/") ? "🖼️" : "📎"} {file.name}
              <button onClick={() => removeFile(i)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2 items-end shrink-0 pb-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileAttach}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileAttach}
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 text-muted-foreground"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => imageInputRef.current?.click()}
          title="Attach image"
        >
          <ImagePlus className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 text-muted-foreground"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          <FileUp className="h-5 w-5" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 128) + 'px';
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            modelInfo?.category === "image-gen"
              ? "Describe the image..."
              : "Type a message..."
          }
          className="min-h-[40px] max-h-32 resize-none py-2 leading-5"
          rows={1}
          style={{ height: '40px' }}
        />
        <Button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSend}
          disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
          className="shrink-0 h-10 w-10 glow-primary"
          size="icon"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatTab;
