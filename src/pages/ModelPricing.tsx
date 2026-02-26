import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ArrowLeft, Zap, Eye, Wrench, Database, BookOpen,
  MessageSquare, Clock, Layers, ChevronRight
} from "lucide-react";

const providerColor: Record<string, string> = {
  openai: "text-emerald-400",
  google: "text-blue-400",
  anthropic: "text-orange-400",
  meta: "text-blue-500",
  mistral: "text-purple-400",
};

const providerLabel: Record<string, string> = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
  meta: "Meta",
  mistral: "Mistral",
};

interface ModelRow {
  id: string;
  model_id: string;
  display_name: string;
  category: string;
  price_per_1k_input_tokens: number;
  price_per_1k_output_tokens: number;
  price_per_1k_cache_write_tokens: number;
  price_per_1k_cache_read_tokens: number;
  context_window: number;
  max_output_tokens: number;
  provider: string;
  description: string;
  supports_cache: boolean;
  supports_vision: boolean;
  supports_function_calling: boolean;
  notes: string;
  is_active: boolean;
}

const fmt = (val: number, decimals = 4) => `$${Number(val).toFixed(decimals)}`;
const fmtM = (val: number) => `$${(Number(val) * 1000).toFixed(4)}`; // per 1M tokens

const ctxLabel = (n: number) => {
  if (!n) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(0)}M tokens`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K tokens`;
  return `${n} tokens`;
};

const ModelPricing = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const slug = modelId ?? "";

  const { data: model, isLoading } = useQuery<ModelRow | null>({
    queryKey: ["model-pricing-detail", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("model_pricing")
        .select("*")
        .eq("model_id", slug)
        .single();
      return (data as ModelRow) ?? null;
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-32 pb-20 container text-center">
          <p className="text-muted-foreground mb-4">Model not found.</p>
          <Button asChild variant="outline"><Link to="/pricing">← Back to Pricing</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const pLabel = providerLabel[model.provider] ?? model.provider;
  const pColor = providerColor[model.provider] ?? "text-primary";
  const perM = (v: number) => `$${(v * 1000).toFixed(4)} / 1M tokens`;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>{model.display_name} Pricing — ReGraph</title>
        <meta name="description" content={`${model.display_name} pricing on ReGraph: input, output, cache and more. ${model.description}`} />
        <link rel="canonical" href={`https://regraph.tech/pricing/models/${model.model_id}`} />
      </Helmet>
      <Navbar />

      <main className="pt-24 pb-20">
        <div className="container px-4 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
          >
            <Link to="/pricing" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Pricing
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">{model.display_name}</span>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className={`text-sm font-medium font-mono ${pColor}`}>{pLabel}</span>
              <Badge variant="outline" className="capitalize">{model.category}</Badge>
              {!model.is_active && <Badge variant="destructive">Inactive</Badge>}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">{model.display_name}</h1>
            {model.description && (
              <p className="text-lg text-muted-foreground max-w-2xl">{model.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              {model.supports_vision && (
                <span className="flex items-center gap-1.5 text-xs bg-card border border-border px-3 py-1.5 rounded-full">
                  <Eye className="h-3.5 w-3.5 text-primary" /> Vision
                </span>
              )}
              {model.supports_function_calling && (
                <span className="flex items-center gap-1.5 text-xs bg-card border border-border px-3 py-1.5 rounded-full">
                  <Wrench className="h-3.5 w-3.5 text-primary" /> Function Calling
                </span>
              )}
              {model.supports_cache && (
                <span className="flex items-center gap-1.5 text-xs bg-card border border-border px-3 py-1.5 rounded-full">
                  <Database className="h-3.5 w-3.5 text-primary" /> Prompt Caching
                </span>
              )}
              {model.context_window > 0 && (
                <span className="flex items-center gap-1.5 text-xs bg-card border border-border px-3 py-1.5 rounded-full">
                  <Layers className="h-3.5 w-3.5 text-primary" /> {ctxLabel(model.context_window)} context
                </span>
              )}
              {model.max_output_tokens > 0 && (
                <span className="flex items-center gap-1.5 text-xs bg-card border border-border px-3 py-1.5 rounded-full">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" /> {ctxLabel(model.max_output_tokens)} output
                </span>
              )}
            </div>
          </motion.div>

          {/* Pricing cards */}
          <div className="space-y-6">
            {/* Input / Output */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <div className="border-b border-border px-6 py-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Token Pricing</h2>
              </div>
              <div className="divide-y divide-border">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">Input tokens</div>
                    <div className="text-sm text-muted-foreground">Prompt text sent to the model</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-lg">{perM(model.price_per_1k_input_tokens)}</div>
                    <div className="text-xs text-muted-foreground font-mono">{fmt(model.price_per_1k_input_tokens, 6)} / 1K tokens</div>
                  </div>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">Output tokens</div>
                    <div className="text-sm text-muted-foreground">Text generated by the model</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-lg">{perM(model.price_per_1k_output_tokens)}</div>
                    <div className="text-xs text-muted-foreground font-mono">{fmt(model.price_per_1k_output_tokens, 6)} / 1K tokens</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Prompt Caching */}
            {model.supports_cache && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="border-b border-border px-6 py-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">Prompt Caching</h2>
                  <Badge className="ml-auto text-xs" variant="secondary">Optional</Badge>
                </div>
                <div className="divide-y divide-border">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Cache write</div>
                      <div className="text-sm text-muted-foreground">Writing tokens to cache on first request</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg">{perM(model.price_per_1k_cache_write_tokens)}</div>
                      <div className="text-xs text-muted-foreground font-mono">{fmt(model.price_per_1k_cache_write_tokens, 7)} / 1K tokens</div>
                    </div>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Cache read</div>
                      <div className="text-sm text-muted-foreground">Reading cached tokens (significant savings)</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg text-primary">{perM(model.price_per_1k_cache_read_tokens)}</div>
                      <div className="text-xs text-muted-foreground font-mono">{fmt(model.price_per_1k_cache_read_tokens, 8)} / 1K tokens</div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-3 bg-primary/5 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    💡 Cache reads are up to <strong className="text-foreground">90% cheaper</strong> than regular input tokens.
                    Ideal for RAG, system prompts, and repeated contexts.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Context info */}
            {(model.context_window > 0 || model.max_output_tokens > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="border-b border-border px-6 py-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">Model Limits</h2>
                </div>
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                  <div className="px-6 py-4">
                    <div className="text-sm text-muted-foreground mb-1">Context Window</div>
                    <div className="font-mono font-bold text-xl">{ctxLabel(model.context_window)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Max input tokens per request</div>
                  </div>
                  <div className="px-6 py-4">
                    <div className="text-sm text-muted-foreground mb-1">Max Output</div>
                    <div className="font-mono font-bold text-xl">{ctxLabel(model.max_output_tokens)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Max generated tokens per request</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notes */}
            {model.notes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-xl border border-border bg-card px-6 py-5"
              >
                <h2 className="font-semibold mb-2">Notes</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{model.notes}</p>
              </motion.div>
            )}

            {/* Model ID */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-xl border border-border bg-card px-6 py-5"
            >
              <h2 className="font-semibold mb-3">API Usage</h2>
              <p className="text-sm text-muted-foreground mb-2">Use this model ID in API requests:</p>
              <code className="block bg-background border border-border rounded-lg px-4 py-3 font-mono text-sm text-primary break-all">
                {model.model_id}
              </code>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-xl border border-primary/30 bg-card px-6 py-8 text-center"
            >
              <h2 className="text-2xl font-bold mb-2">Ready to use {model.display_name}?</h2>
              <p className="text-muted-foreground mb-6">Get started with $1 free credit — no credit card required.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" className="glow-primary" asChild>
                  <Link to="/auth"><Zap className="mr-2 h-4 w-4" />Start Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/pricing">← All Pricing</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ModelPricing;
