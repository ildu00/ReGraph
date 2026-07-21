import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Send, Loader2, Bot, User, ArrowRight, Zap, Download, ExternalLink, RotateCcw,
  Atom, Braces, Rocket, Palette, ScrollText, Wand2, TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import CodeBlock from "@/components/CodeBlock";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  category: string;
  // Approx market $/request for comparison. Rough averages by category.
  market: number;
  // Our per-request cost approx.
  ours: number;
}

import { CATALOG_MODELS } from "@/data/catalogModels";

// Curated set shown first (with hand-tuned savings numbers).
const CURATED: ModelOption[] = [
  { id: "regraph-llm", name: "ReGraph LLM", provider: "ReGraph", category: "llm", market: 0.02, ours: 0.004 },
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", category: "chat", market: 0.03, ours: 0.006 },
  { id: "gpt-5", name: "GPT-5", provider: "OpenAI", category: "chat", market: 0.08, ours: 0.016 },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "Anthropic", category: "chat", market: 0.06, ours: 0.012 },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "Google", category: "chat", market: 0.02, ours: 0.004 },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash 284B", provider: "DeepSeek", category: "llm", market: 0.025, ours: 0.005 },
  { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro 1.6T", provider: "DeepSeek", category: "llm", market: 0.05, ours: 0.010 },
  { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", category: "reasoning", market: 0.05, ours: 0.010 },
  { id: "meta-llama/llama-3.3-70b-instruct-fast", name: "Llama 3.3 70B Fast", provider: "Meta", category: "llm", market: 0.015, ours: 0.003 },
  { id: "img-flux/flux-2", name: "FLUX 2", provider: "Black Forest Labs", category: "image-gen", market: 0.04, ours: 0.008 },
  { id: "img-flux/schnell", name: "FLUX 1 Schnell", provider: "Black Forest Labs", category: "image-gen", market: 0.03, ours: 0.006 },
  { id: "img-google/nano-banana-2", name: "Google Nano Banana 2", provider: "Google", category: "image-gen", market: 0.05, ours: 0.010 },
];

// Approx pricing by category for catalog fill-ins.
const CATEGORY_RATES: Record<string, { market: number; ours: number }> = {
  reasoning: { market: 0.05, ours: 0.010 },
  code: { market: 0.03, ours: 0.006 },
  vision: { market: 0.04, ours: 0.008 },
  embedding: { market: 0.001, ours: 0.0002 },
  llm: { market: 0.02, ours: 0.004 },
  chat: { market: 0.03, ours: 0.006 },
  "image-gen": { market: 0.04, ours: 0.008 },
};

const CURATED_IDS = new Set(CURATED.map((m) => m.id));
const MODELS: ModelOption[] = [
  ...CURATED,
  ...CATALOG_MODELS
    .filter((c) => !CURATED_IDS.has(c.id) && c.category !== "embedding")
    .map((c) => {
      const rate = CATEGORY_RATES[c.category] ?? CATEGORY_RATES.llm;
      return { id: c.id, name: c.name, provider: c.provider, category: c.category, market: rate.market, ours: rate.ours };
    }),
];


const EXAMPLES: { title: string; prompt: string; modelId?: string; Icon: any; tint: string; tag: string }[] = [
  { title: "Explain quantum computing", prompt: "Explain quantum computing to a curious 12-year-old, using a simple analogy.", Icon: Atom, tint: "from-cyan-500/25 to-indigo-500/10 text-cyan-300", tag: "Learn" },
  { title: "Sieve of Eratosthenes", prompt: "Write a Python function that finds all prime numbers up to N using the Sieve of Eratosthenes. Add comments.", Icon: Braces, tint: "from-emerald-500/25 to-teal-500/10 text-emerald-300", tag: "Code" },
  { title: "60-second pitch", prompt: "Draft a 60-second elevator pitch for a decentralized AI compute marketplace.", Icon: Rocket, tint: "from-orange-500/25 to-pink-500/10 text-orange-300", tag: "Write" },
  { title: "Cyberpunk cityscape", prompt: "A neon cyberpunk cityscape at night, rain-slick streets, purple and cyan lights, cinematic wide shot.", modelId: "img-flux/flux-2", Icon: Palette, tint: "from-fuchsia-500/25 to-purple-500/10 text-fuchsia-300", tag: "Image" },
  { title: "Summarize a paper", prompt: "Summarize the key ideas of the paper 'Attention Is All You Need' in 5 bullet points.", Icon: ScrollText, tint: "from-amber-500/25 to-yellow-500/10 text-amber-300", tag: "Distill" },
  { title: "Elven mage portrait", prompt: "Portrait of an elven mage in an ancient library, glowing runes, soft lantern light, painterly, ultra-detailed.", modelId: "img-flux/schnell", Icon: Wand2, tint: "from-violet-500/25 to-blue-500/10 text-violet-300", tag: "Image" },
];

const INFERENCE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-inference`;
const FREE_LIMIT = 3;
const COUNT_KEY = "regraph-try-count";
const MSG_KEY = "regraph-try-messages";

const loadCount = () => {
  try { return parseInt(localStorage.getItem(COUNT_KEY) || "0", 10) || 0; } catch { return 0; }
};

const TryChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(MSG_KEY);
      if (!raw) return [];
      return JSON.parse(raw).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("regraph-llm");
  const [isLoading, setIsLoading] = useState(false);
  const [requestCount, setRequestCount] = useState<number>(loadCount);
  const [showPaywall, setShowPaywall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const model = MODELS.find((m) => m.id === selectedModel)!;
  const remaining = Math.max(0, FREE_LIMIT - requestCount);

  useEffect(() => {
    try { localStorage.setItem(MSG_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem(COUNT_KEY, String(requestCount)); } catch { /* ignore */ }
  }, [requestCount]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const totals = MODELS
    .filter((m) => m.category !== "image-gen")
    .reduce((acc, m) => ({ market: acc.market + m.market, ours: acc.ours + m.ours }), { market: 0, ours: 0 });

  const computeSavings = () => {
    // Sum market vs ours for the models actually used in this session's user prompts.
    // Fallback: assume average.
    let market = 0, ours = 0;
    const used = messages.filter((m) => m.role === "user").length;
    if (used === 0) {
      const avgM = totals.market / MODELS.filter((m) => m.category !== "image-gen").length;
      const avgO = totals.ours / MODELS.filter((m) => m.category !== "image-gen").length;
      market = avgM * FREE_LIMIT;
      ours = avgO * FREE_LIMIT;
    } else {
      // Approximate: use currently selected model's rates across the used count.
      market = model.market * used;
      ours = model.ours * used;
    }
    const saved = Math.max(0, market - ours);
    const pct = market > 0 ? Math.round((saved / market) * 100) : 80;
    // Extrapolate: what 1,000 requests/month would look like.
    const monthlyMarket = market / Math.max(1, used || FREE_LIMIT) * 1000;
    const monthlyOurs = ours / Math.max(1, used || FREE_LIMIT) * 1000;
    const monthlySaved = monthlyMarket - monthlyOurs;
    return { market, ours, saved, pct, monthlyMarket, monthlyOurs, monthlySaved };
  };

  const send = async (overridePrompt?: string, overrideModel?: string) => {
    const prompt = (overridePrompt ?? input).trim();
    if (!prompt || isLoading) return;

    if (requestCount >= FREE_LIMIT) {
      setShowPaywall(true);
      return;
    }

    const useModelId = overrideModel || selectedModel;
    const useModel = MODELS.find((m) => m.id === useModelId) || model;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "40px";
    setIsLoading(true);
    if (overrideModel && overrideModel !== selectedModel) setSelectedModel(overrideModel);

    try {
      const historyMessages = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const resp = await fetch(INFERENCE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          model: useModelId,
          prompt,
          messages: [...historyMessages, { role: "user", content: prompt }],
          temperature: 0.7,
          maxTokens: 2048,
          category: useModel.category,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const errMsg = data?.error || "Failed to get response";
        toast.error(errMsg);
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), role: "assistant",
          content: `⚠️ ${errMsg}`, timestamp: new Date(),
        }]);
        return;
      }
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "",
        imageUrl: data.imageUrl || undefined,
        timestamp: new Date(),
      }]);
      const next = requestCount + 1;
      setRequestCount(next);
      if (next >= FREE_LIMIT) {
        setTimeout(() => setShowPaywall(true), 800);
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection failed");
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        content: "⚠️ Connection failed. Please try again.", timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const s = computeSavings();

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <Helmet>
        <title>Try ReGraph AI Free — 50+ Models, 80% Cheaper</title>
        <meta name="description" content="Try ReGraph AI free. Chat with GPT-5, Claude, Gemini, DeepSeek and generate images with FLUX. 3 free requests, no signup." />
        <link rel="canonical" href="https://regraph.tech/try" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-30%] right-[-10%] h-[600px] w-[600px] rounded-full bg-fuchsia-500/15 blur-[140px] animate-pulse" style={{ animationDuration: '11s' }} />
        <div className="absolute top-[30%] right-[20%] h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="shrink-0 border-b border-border/40 bg-background/70 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">
              <span className="text-gradient">Re</span>
              <span className="text-primary">Graph</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex gap-1 font-mono">
              <Zap className="h-3 w-3 text-primary" />
              {remaining}/{FREE_LIMIT} free
            </Badge>
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="glow-primary">
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 min-h-0 flex flex-col px-4 py-3 w-full max-w-4xl">
        {/* Hero — tight, one line on desktop */}
        {messages.length === 0 && (
          <section className="mb-3 shrink-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                Try 50+ AI models{" "}
                <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                  at 1/5 the price
                </span>
              </h1>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400">
                <TrendingDown className="h-3.5 w-3.5" />
                −80% vs OpenAI · AWS
              </span>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              GPT-5 · Claude · Gemini · DeepSeek · FLUX — <span className="text-foreground font-semibold">{FREE_LIMIT} free requests</span>, no signup.
            </p>
          </section>
        )}

        {/* Model selector row */}
        <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-full sm:w-[320px] bg-card/60 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Chat & LLM</div>
              {MODELS.filter((m) => m.category !== "image-gen").map((m) => (
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
          <div className="flex items-center gap-2 shrink-0">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setMessages([]); try { localStorage.removeItem(MSG_KEY); } catch { /* ignore */ } }}
                className="gap-1"
                title="Start over"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </Button>
            )}
            <Badge variant="secondary" className="sm:hidden gap-1 font-mono">
              <Zap className="h-3 w-3 text-primary" />
              {remaining}/{FREE_LIMIT}
            </Badge>
          </div>
        </div>

        {/* Chat area */}
        <Card className="flex-1 min-h-0 bg-card/40 backdrop-blur border-border p-4 mb-3 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {EXAMPLES.map((ex, i) => {
                const Icon = ex.Icon;
                return (
                  <button
                    key={ex.title}
                    onClick={() => send(ex.prompt, ex.modelId)}
                    className="group relative text-left p-3 sm:p-4 rounded-xl border border-border/60 bg-card/50 hover:border-primary/70 hover:-translate-y-0.5 transition-all overflow-hidden"
                    style={{ animation: `fadeUp .5s ease ${i * 60}ms both` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${ex.tint} opacity-40 group-hover:opacity-70 transition-opacity`} />
                    <div className="relative flex items-start justify-between mb-2">
                      <div className={`h-9 w-9 rounded-lg bg-background/60 backdrop-blur flex items-center justify-center ring-1 ring-border/60 ${ex.tint.split(' ').pop()}`}>
                        <Icon className="h-4 w-4" strokeWidth={2.2} />
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                        {ex.tag}
                      </span>
                    </div>
                    <div className="relative font-semibold text-sm mb-1 leading-snug group-hover:text-primary transition-colors">
                      {ex.title}
                    </div>
                    <div className="relative text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                      {ex.prompt}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 min-w-0 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`min-w-0 rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground max-w-[85%]"
                    : "bg-secondary/70 flex-1"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="markdown-response text-sm min-w-0 overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            const codeString = String(children).replace(/\n$/, "");
                            if (!inline && match) return <CodeBlock code={codeString} language={match[1]} />;
                            return <code className={className} {...props}>{children}</code>;
                          },
                          pre({ children }: any) { return <>{children}</>; },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  {msg.imageUrl && (
                    <div className="mt-3 space-y-2">
                      <img src={msg.imageUrl} alt="Generated" className="max-w-full max-h-[400px] rounded-lg object-contain" />
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(msg.imageUrl, "_blank")}>
                          <ExternalLink className="h-3 w-3 mr-1" /> Open
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <a href={msg.imageUrl} download="regraph.png">
                            <Download className="h-3 w-3 mr-1" /> Save
                          </a>
                        </Button>
                      </div>
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

        {/* Composer */}
        <div className="flex gap-2 items-end pb-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 128) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              remaining === 0
                ? "Sign up to keep chatting for free"
                : model.category === "image-gen"
                  ? "Describe an image to generate…"
                  : "Ask anything…"
            }
            className="min-h-[44px] max-h-32 resize-none py-2.5 leading-5 bg-card/60"
            rows={1}
            disabled={isLoading}
            style={{ height: "44px" }}
          />
          <Button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            className="shrink-0 h-11 w-11 glow-primary"
            size="icon"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center pb-4">
          {remaining > 0
            ? `${remaining} of ${FREE_LIMIT} free requests remaining · no signup`
            : "Free trial used — sign up to keep going"}
        </p>
      </main>

      {/* Paywall */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-fuchsia-500 to-cyan-400 flex items-center justify-center mb-2 glow-primary shadow-lg">
              <TrendingDown className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
            <DialogTitle className="text-center text-2xl">
              You just saved <span className="text-primary">${s.saved.toFixed(3)}</span>
            </DialogTitle>
            <DialogDescription className="text-center">
              In {FREE_LIMIT} free requests you paid <span className="line-through">${s.market.toFixed(3)}</span>{" "}
              worth of compute at OpenAI/AWS prices — <span className="text-foreground font-semibold">{s.pct}% cheaper</span> on ReGraph.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/60 bg-card/60 p-4 my-2 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Market rate</span>
              <span className="font-mono">${s.market.toFixed(3)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ReGraph rate</span>
              <span className="font-mono text-primary">${s.ours.toFixed(3)}</span>
            </div>
            <div className="h-px bg-border/60" />
            <div className="flex items-center justify-between font-semibold">
              <span>Your savings</span>
              <span className="text-primary">${s.saved.toFixed(3)} ({s.pct}%)</span>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              Scale that to 1,000 requests/month and you'd save{" "}
              <span className="text-foreground font-semibold">${s.monthlySaved.toFixed(2)}</span>.
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              className="w-full glow-primary"
              size="lg"
              onClick={() => navigate("/signup")}
            >
              Create free account <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              I already have an account
            </Button>
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              $1 signup bonus included · no credit card required
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TryChat;
