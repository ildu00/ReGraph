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
  { id: "llama-3.1-70b", name: "LLaMA 3.1 70B", provider: "Meta", category: "llm" },
  { id: "mistral-large", name: "Mistral Large", provider: "Mistral AI", category: "llm" },
  { id: "command-r-plus", name: "Command R+", provider: "Cohere", category: "chat" },
  // Code
  { id: "deepseek-coder-33b", name: "DeepSeek Coder 33B", provider: "DeepSeek", category: "code" },
  { id: "grok-code-fast-1", name: "Grok Code Fast 1", provider: "xAI", category: "code" },
  { id: "codellama-70b", name: "Code Llama 70B", provider: "Meta", category: "code" },
  // Vision & Multimodal
  { id: "llama-3.2-90b-vision", name: "LLaMA 3.2 90B Vision", provider: "Meta", category: "multimodal" },
  { id: "llava-1.6-34b", name: "LLaVA 1.6 34B", provider: "LLaVA Team", category: "vision" },
  { id: "phi-3-vision", name: "Phi-3 Vision", provider: "Microsoft", category: "multimodal" },
  // Image Generation
  { id: "sdxl-turbo", name: "SDXL Turbo", provider: "Stability AI", category: "image-gen" },
  { id: "sdxl-1.0", name: "Stable Diffusion XL", provider: "Stability AI", category: "image-gen" },
  { id: "kandinsky-3", name: "Kandinsky 3", provider: "Sber", category: "image-gen" },
  { id: "playground-v2.5", name: "Playground v2.5", provider: "Playground", category: "image-gen" },
];

const INFERENCE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-inference`;
const STORAGE_KEY = "regraph-chat-messages";
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

  // On mobile, prevent overscroll on the page (not body lock, just overflow)
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = orig;
    };
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

      const resp = await fetch(INFERENCE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: fullPrompt,
          temperature: 0.7,
          maxTokens: 2048,
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
    <div ref={containerRef} className="flex flex-col" style={{ height: 'calc(100dvh - 11rem)', maxHeight: 'calc(100dvh - 11rem)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-full sm:w-[280px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Chat & LLM</div>
              {MODELS.filter((m) => ["llm", "chat", "reasoning"].includes(m.category)).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    {m.name} <span className="text-xs text-muted-foreground">({m.provider})</span>
                  </span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">Code</div>
              {MODELS.filter((m) => m.category === "code").map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    {m.name} <span className="text-xs text-muted-foreground">({m.provider})</span>
                  </span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">Vision & Multimodal</div>
              {MODELS.filter((m) => ["vision", "multimodal"].includes(m.category)).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    {m.name} <span className="text-xs text-muted-foreground">({m.provider})</span>
                  </span>
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">Image Generation</div>
              {MODELS.filter((m) => m.category === "image-gen").map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    {m.name} <span className="text-xs text-muted-foreground">({m.provider})</span>
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
      <Card className={`flex-1 min-h-0 bg-card/50 border-border p-4 mb-2 ${messages.length > 0 ? 'overflow-y-auto space-y-4' : 'overflow-hidden'}`}>
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
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/70"
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
                  <div className="markdown-response text-sm">
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
