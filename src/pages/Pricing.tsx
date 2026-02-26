import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Zap, Check, Cpu, BrainCircuit, Eye, Wrench, Database, ChevronRight, Image, Mic, Video, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

interface ModelRow {
  id: string;
  model_id: string;
  display_name: string;
  category: string;
  price_per_1k_input_tokens: number;
  price_per_1k_output_tokens: number;
  price_per_1k_cache_write_tokens?: number;
  price_per_1k_cache_read_tokens?: number;
  price_per_image?: number;
  price_per_minute?: number;
  price_per_video?: number;
  pricing_unit?: string;
  context_window?: number;
  provider?: string;
  description?: string;
  supports_cache?: boolean;
  supports_vision?: boolean;
  supports_function_calling?: boolean;
}

const useGpuPricing = () =>
  useQuery({
    queryKey: ["gpu-pricing-public"],
    queryFn: async () => {
      const { data } = await supabase.from("gpu_pricing").select("*").eq("is_active", true).order("price_per_hour", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

const useModelPricing = () =>
  useQuery<ModelRow[]>({
    queryKey: ["model-pricing-public"],
    queryFn: async () => {
      const { data } = await supabase.from("model_pricing").select("*").eq("is_active", true).order("display_name", { ascending: true });
      return (data as ModelRow[]) ?? [];
    },
    staleTime: 5 * 60_000,
  });

const freeTierFeatures = [
  "$1 signup bonus — no credit card required",
  "Access to all models via REST API",
  "Community support & documentation",
  "Up to 10 req/s rate limit",
];

const proFeatures = [
  "Everything in Free, plus:",
  "Priority routing — lowest latency",
  "100 req/s rate limit",
  "Dedicated Slack channel support",
  "Custom fine-tuning jobs",
  "Volume discounts on inference",
];

const ctxLabel = (n?: number) => {
  if (!n) return null;
  if (n >= 1000000) return `${(n / 1000000).toFixed(0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return `${n}`;
};

// Token-based categories
const tokenCategoryGroups: Record<string, string> = {
  llm: "Large Language Models",
  chat: "Chat & Assistants",
  reasoning: "Reasoning & Analysis",
  code: "Code Generation",
  multimodal: "Multimodal",
  vision: "Vision & Understanding",
  embedding: "Embeddings",
  rerank: "Reranking",
  document: "Document AI",
  ocr: "OCR & Extraction",
  "fine-tune": "Fine-tunable Models",
};
const tokenCategoryOrder = ["llm", "chat", "reasoning", "code", "multimodal", "vision", "embedding", "rerank", "document", "ocr", "fine-tune"];

// Unit-based categories
const unitCategoryGroups: Record<string, { label: string; icon: React.ReactNode; unit: string }> = {
  "image-gen": { label: "Image Generation", icon: <Image className="h-4 w-4" />, unit: "per image" },
  "image-edit": { label: "Image Editing", icon: <Image className="h-4 w-4" />, unit: "per image" },
  audio: { label: "Speech Recognition", icon: <Mic className="h-4 w-4" />, unit: "per minute" },
  tts: { label: "Text-to-Speech", icon: <Mic className="h-4 w-4" />, unit: "per minute" },
  video: { label: "Video Generation", icon: <Video className="h-4 w-4" />, unit: "per video" },
};
const unitCategoryOrder = ["image-gen", "image-edit", "audio", "tts", "video"];

const isUnitBased = (m: ModelRow) =>
  ["image-gen", "image-edit", "audio", "tts", "video"].includes(m.category) ||
  (m.pricing_unit && m.pricing_unit !== "token");

const getUnitPrice = (m: ModelRow): string => {
  if (m.pricing_unit === "image" && m.price_per_image) return `$${m.price_per_image.toFixed(4)}`;
  if (m.pricing_unit === "minute" && m.price_per_minute) return `$${m.price_per_minute.toFixed(4)}`;
  if (m.pricing_unit === "video" && m.price_per_video) return `$${m.price_per_video.toFixed(4)}`;
  // fallback: read from notes or category
  if (m.category === "image-gen" || m.category === "image-edit") return m.price_per_image ? `$${m.price_per_image.toFixed(4)}` : "—";
  if (m.category === "audio" || m.category === "tts") return m.price_per_minute ? `$${m.price_per_minute.toFixed(4)}` : "—";
  if (m.category === "video") return m.price_per_video ? `$${m.price_per_video.toFixed(4)}` : "—";
  return "—";
};

const getUnitLabel = (m: ModelRow): string => {
  if (m.pricing_unit === "image" || m.category === "image-gen" || m.category === "image-edit") return "/ image";
  if (m.pricing_unit === "minute" || m.category === "audio" || m.category === "tts") return "/ minute";
  if (m.pricing_unit === "video" || m.category === "video") return "/ clip";
  return "";
};

const ALL_CATS = [...tokenCategoryOrder, ...unitCategoryOrder];

const Pricing = () => {
  const { data: gpus = [], isLoading: gpuLoading } = useGpuPricing();
  const { data: models = [], isLoading: modelLoading } = useModelPricing();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredModels = useMemo(() => {
    let list = models;
    if (activeCategory) list = list.filter((m) => m.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.display_name.toLowerCase().includes(q) ||
          m.model_id.toLowerCase().includes(q) ||
          (m.provider ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [models, search, activeCategory]);

  const tokenModels = filteredModels.filter((m) => !isUnitBased(m));
  const unitModels = filteredModels.filter((m) => isUnitBased(m));

  const groupedToken = tokenModels.reduce<Record<string, ModelRow[]>>((acc, m) => {
    const key = m.category || "chat";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const groupedUnit = unitModels.reduce<Record<string, ModelRow[]>>((acc, m) => {
    const key = m.category || "image-gen";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Pricing — ReGraph | GPU Compute & Model Inference Rates</title>
        <meta name="description" content="Transparent, pay-as-you-go pricing for GPU compute and AI model inference. Up to 20% cheaper than major cloud providers." />
        <link rel="canonical" href="https://regraph.tech/pricing" />
      </Helmet>
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="container px-4 text-center mb-20">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-gradient">Simple, transparent</span>{" "}
            <span className="text-primary">pricing</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Pay only for what you use. No minimums, no commitments, no hidden fees. Up to 20% cheaper than major cloud providers.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="glow-primary" asChild>
              <Link to="/auth"><Zap className="mr-2 h-5 w-5" />Start for Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/docs">View Docs</Link>
            </Button>
          </motion.div>
        </section>

        {/* Plans */}
        <section className="container px-4 mb-24">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-xl border border-border bg-card p-8 flex flex-col">
              <h3 className="text-2xl font-bold mb-1">Free</h3>
              <p className="text-muted-foreground mb-6">Great for experimenting &amp; prototyping</p>
              <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
              <ul className="space-y-3 mb-8 flex-1">
                {freeTierFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="lg" className="w-full" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="rounded-xl border border-primary/40 bg-card p-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
              <h3 className="text-2xl font-bold mb-1">Pro</h3>
              <p className="text-muted-foreground mb-6">For production workloads at scale</p>
              <div className="text-4xl font-bold mb-6">Pay-as-you-go</div>
              <ul className="space-y-3 mb-8 flex-1">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full glow-primary" asChild>
                <Link to="/auth"><Zap className="mr-2 h-4 w-4" />Start Building</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* GPU Pricing */}
        <section className="container px-4 mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <Cpu className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold">GPU Compute</h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-xl">Rent GPU power by the hour. Pick the performance tier that fits your workload.</p>
            {gpuLoading ? (
              <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GPU</TableHead>
                    <TableHead className="text-right">Price / hour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gpus.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.gpu_type}</TableCell>
                      <TableCell className="text-right font-mono">${Number(g.price_per_hour).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {gpus.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No GPU pricing available yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </motion.div>
        </section>

        {/* Model Pricing Header + Search & Filters */}
        <section className="container px-4 mb-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-5">
              <h2 className="text-3xl font-bold mb-1">Model Pricing</h2>
              <p className="text-muted-foreground text-sm">Pay-as-you-go access to every model. No minimums — billed per token or per unit.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search models…"
                  className="pl-8 h-8 text-sm w-48"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="w-px h-5 bg-border hidden sm:block" />
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={activeCategory === null ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setActiveCategory(null)}>All</Badge>
                {ALL_CATS.filter((cat) => models.some((m) => m.category === cat)).map((cat) => (
                  <Badge
                    key={cat}
                    variant={activeCategory === cat ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  >
                    {tokenCategoryGroups[cat] ?? unitCategoryGroups[cat]?.label ?? cat}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Token-based Model Pricing */}
        {tokenModels.length > 0 && <section className="container px-4 mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <BrainCircuit className="h-5 w-5 text-primary shrink-0" />
              <h3 className="text-base font-semibold">Language Models</h3>
              <span className="text-xs text-muted-foreground">· per 1M tokens</span>
            </div>

            {modelLoading ? (
              <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>
            ) : (
              <div className="space-y-10">
                {tokenCategoryOrder.filter((cat) => (groupedToken[cat] ?? []).length > 0).map((cat) => {
                  const catModels = groupedToken[cat];
                  const hasCacheInGroup = catModels.some((m) => m.supports_cache);
                  return (
                    <div key={cat}>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">{tokenCategoryGroups[cat] ?? cat}</h3>
                      <div className="rounded-xl border border-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Model</TableHead>
                              <TableHead className="hidden sm:table-cell text-right">Context</TableHead>
                              <TableHead className="text-right">Input / 1M</TableHead>
                              <TableHead className="text-right">Output / 1M</TableHead>
                              {hasCacheInGroup && <TableHead className="hidden md:table-cell text-right">Cache Read / 1M</TableHead>}
                              <TableHead className="w-8"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {catModels.map((m) => (
                              <TableRow key={m.id} className="cursor-pointer hover:bg-card/80 transition-colors group">
                                <TableCell>
                                  <Link to={`/pricing/models/${encodeURIComponent(m.model_id)}`} className="flex flex-col gap-0.5 hover:no-underline">
                                    <span className="font-medium group-hover:text-primary transition-colors">{m.display_name}</span>
                                    <span className="text-xs text-muted-foreground font-mono hidden sm:block">{m.model_id}</span>
                                    <div className="flex gap-1 mt-0.5">
                                      {m.supports_vision && <Eye className="h-3 w-3 text-muted-foreground" />}
                                      {m.supports_function_calling && <Wrench className="h-3 w-3 text-muted-foreground" />}
                                      {m.supports_cache && <Database className="h-3 w-3 text-muted-foreground" />}
                                    </div>
                                  </Link>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-right font-mono text-muted-foreground text-sm">
                                  {ctxLabel(m.context_window) ?? "—"}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {Number(m.price_per_1k_input_tokens) > 0
                                    ? `$${(Number(m.price_per_1k_input_tokens) * 1000).toFixed(4)}`
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {Number(m.price_per_1k_output_tokens) > 0
                                    ? `$${(Number(m.price_per_1k_output_tokens) * 1000).toFixed(4)}`
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                {hasCacheInGroup && (
                                  <TableCell className="hidden md:table-cell text-right font-mono text-primary text-sm">
                                    {m.supports_cache && Number(m.price_per_1k_cache_read_tokens) > 0
                                      ? `$${(Number(m.price_per_1k_cache_read_tokens) * 1000).toFixed(4)}`
                                      : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <Link to={`/pricing/models/${encodeURIComponent(m.model_id)}`}>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </section>}

        {unitModels.length > 0 && (
        <section className="container px-4 mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <Image className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Media Generation</h3>
              <span className="text-xs text-muted-foreground">· per unit</span>
            </div>

            {modelLoading ? (
              <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>
            ) : (
              <div className="space-y-10">
                {unitCategoryOrder.filter((cat) => (groupedUnit[cat] ?? []).length > 0).map((cat) => {
                  const meta = unitCategoryGroups[cat];
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-muted-foreground">{meta.icon}</span>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{meta.label}</h3>
                      </div>
                      <div className="rounded-xl border border-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                            <TableHead>Model</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead className="hidden sm:table-cell text-right">Unit</TableHead>
                              <TableHead className="w-8"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupedUnit[cat].map((m) => (
                              <TableRow key={m.id} className="cursor-pointer hover:bg-card/80 transition-colors group">
                                <TableCell>
                                  <Link to={`/pricing/models/${encodeURIComponent(m.model_id)}`} className="flex flex-col gap-0.5 hover:no-underline">
                                    <span className="font-medium group-hover:text-primary transition-colors">{m.display_name}</span>
                                    <span className="text-xs text-muted-foreground font-mono hidden sm:block">{m.model_id}</span>
                                  </Link>
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold text-primary">
                                  {getUnitPrice(m)}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-right text-sm text-muted-foreground">
                                  {getUnitLabel(m)}
                                </TableCell>
                                <TableCell>
                                  <Link to={`/pricing/models/${encodeURIComponent(m.model_id)}`}>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </section>
        )}

        {/* CTA */}
        <section className="container px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center rounded-xl border border-border bg-card p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to build?</h2>
            <p className="text-muted-foreground mb-8">Sign up in seconds. Your first $1 is on us.</p>
            <Button size="lg" className="glow-primary" asChild>
              <Link to="/auth"><Zap className="mr-2 h-5 w-5" />Get Started Free</Link>
            </Button>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
