import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Loader2, Edit3, RotateCcw, ChevronDown, ChevronUp, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const DEFAULT_PROMPTS = [
  "Explain quantum entanglement in simple terms.",
  "Write a Python function to merge two sorted arrays efficiently.",
  "What are the key differences between TCP and UDP?",
  "Summarize the theory of general relativity in 3 sentences.",
  "Generate a SQL query to find the top 5 customers by revenue.",
  "What is the CAP theorem in distributed systems?",
  "Write a haiku about artificial intelligence.",
  "Explain the difference between supervised and unsupervised learning.",
  "How does a transformer architecture work in neural networks?",
  "What are the SOLID principles in software engineering?",
  "Translate this to French: 'The early bird catches the worm.'",
  "Write a regex pattern to validate email addresses.",
  "What causes inflation in an economy?",
  "Explain blockchain consensus mechanisms.",
  "Write a TypeScript generic function for deep cloning objects.",
  "What is the P vs NP problem?",
  "Compare REST and GraphQL APIs — pros and cons.",
  "Write a bash one-liner to find the 10 largest files in a directory.",
  "Explain CRISPR gene editing to a 10-year-old.",
  "What are the main causes of climate change?",
  "Write a concise product description for a smart water bottle.",
  "Explain the difference between correlation and causation with an example.",
  "What is zero-knowledge proof and where is it used?",
  "Write a unit test in Jest for a function that calculates factorial.",
  "Summarize the key ideas of Stoic philosophy.",
];

const COMPARE_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-5", name: "GPT-5" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "llama-3-70b", name: "Llama 3 70B" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
];

interface CompareResult {
  regraph: { content?: string; error?: string; latency: number; tokens?: number };
  compare: { content?: string; error?: string; latency: number; tokens?: number };
}

const ModelCompare = () => {
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [compareModel, setCompareModel] = useState("gpt-4o");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleRun = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("model-compare", {
        body: { prompts, compareModel },
      });

      if (error) {
        toast.error("Failed to run comparison");
        console.error(error);
        return;
      }

      setResult(data);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      toast.error("Network error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(prompts[idx]);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    setPrompts((prev) => prev.map((p, i) => (i === editingIdx ? editValue : p)));
    setEditingIdx(null);
  };

  const resetPrompts = () => {
    setPrompts(DEFAULT_PROMPTS);
    setResult(null);
    toast.success("Prompts reset to defaults");
  };

  const visiblePrompts = showAllPrompts ? prompts : prompts.slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-14"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Live Model Comparison</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={resetPrompts}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        All prompts are sent in a single request to both models. Each model provides a brief answer (2–3 sentences) per question for side-by-side quality comparison.
      </p>

      {/* Model selector */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <label className="text-xs font-mono text-muted-foreground mb-1 block">Compare against</label>
          <Select value={compareModel} onValueChange={setCompareModel}>
            <SelectTrigger className="bg-card/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPARE_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={handleRun} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {loading ? "Generating…" : "Run Comparison"}
          </Button>
        </div>
      </div>

      {/* Prompt list */}
      <div className="rounded-xl border border-border bg-card/30 mb-6">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-mono text-muted-foreground">
            Prompts ({prompts.length}) — pencil to edit
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllPrompts(!showAllPrompts)}
            className="text-xs"
          >
            {showAllPrompts ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {showAllPrompts ? "Show less" : `Show all ${prompts.length}`}
          </Button>
        </div>
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {visiblePrompts.map((prompt, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-3 transition-colors hover:bg-primary/5"
            >
              <span className="text-xs font-mono text-muted-foreground w-6 shrink-0 pt-0.5 text-right">
                {idx + 1}.
              </span>
              {editingIdx === idx ? (
                <div className="flex-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-sm min-h-[60px] bg-background"
                    autoFocus
                  />
                  <div className="flex flex-col gap-1">
                    <Button size="sm" onClick={saveEdit} className="text-xs">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingIdx(null)} className="text-xs">✕</Button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm">{prompt}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-40 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(idx);
                    }}
                    disabled={loading}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
        <p className="text-xs font-mono text-primary mb-1">All {prompts.length} prompts in one request</p>
        <p className="text-sm text-muted-foreground">Both models answer briefly (2–3 sentences each). Results displayed side-by-side.</p>
      </div>

      {/* Results */}
      {result && (
        <motion.div
          ref={resultRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-4"
        >
          {/* ReGraph LLM */}
          <div className="rounded-xl border border-primary/30 bg-card/50 overflow-hidden">
            <div className="p-3 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-primary">ReGraph LLM</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {result.regraph.latency > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {(result.regraph.latency / 1000).toFixed(1)}s
                  </span>
                )}
                {result.regraph.tokens && <span>{result.regraph.tokens} tokens</span>}
              </div>
            </div>
            <div className="p-4">
              {result.regraph.error ? (
                <p className="text-sm text-destructive">{result.regraph.error}</p>
              ) : (
                <div className="text-sm leading-relaxed markdown-response prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.regraph.content || ""}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {/* Comparison model */}
          <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
            <div className="p-3 border-b border-border bg-card/30 flex items-center justify-between">
              <span className="font-mono text-sm font-bold">
                {COMPARE_MODELS.find((m) => m.id === compareModel)?.name}
              </span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {result.compare.latency > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {(result.compare.latency / 1000).toFixed(1)}s
                  </span>
                )}
                {result.compare.tokens && <span>{result.compare.tokens} tokens</span>}
              </div>
            </div>
            <div className="p-4">
              {result.compare.error ? (
                <p className="text-sm text-destructive">{result.compare.error}</p>
              ) : (
                <div className="text-sm leading-relaxed markdown-response prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.compare.content || ""}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ModelCompare;
