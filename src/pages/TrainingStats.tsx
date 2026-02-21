import { motion } from "framer-motion";
import { Brain, TrendingUp, Database, Clock, BarChart3, Zap, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const milestones = [
  { date: "Feb 21, 2026", event: "v3.4 checkpoint — 4.2T tokens ingested, MMLU 87.3%" },
  { date: "Feb 14, 2026", event: "Integrated real-time news corpus (Reuters, AP, arXiv daily)" },
  { date: "Feb 7, 2026", event: "v3.3 checkpoint — code generation accuracy +6% on HumanEval" },
  { date: "Jan 28, 2026", event: "Added multilingual instruction-tuning (23 languages)" },
  { date: "Jan 20, 2026", event: "v3.2 checkpoint — context window extended to 256K tokens" },
  { date: "Jan 10, 2026", event: "Switched to continuous LoRA merging pipeline for daily updates" },
  { date: "Dec 18, 2025", event: "v3.0 launch — new architecture with mixture-of-experts routing" },
];

const benchmarks = [
  { name: "MMLU", score: "87.3%", vs_gpt4: "86.4%", vs_claude: "85.2%", vs_llama: "79.8%" },
  { name: "HumanEval", score: "84.1%", vs_gpt4: "82.0%", vs_claude: "80.5%", vs_llama: "72.6%" },
  { name: "GSM8K", score: "93.7%", vs_gpt4: "92.0%", vs_claude: "91.4%", vs_llama: "83.1%" },
  { name: "MT-Bench", score: "9.1", vs_gpt4: "9.0", vs_claude: "8.8", vs_llama: "8.1" },
  { name: "ARC-Challenge", score: "96.2%", vs_gpt4: "96.3%", vs_claude: "94.7%", vs_llama: "89.4%" },
  { name: "TruthfulQA", score: "73.8%", vs_gpt4: "70.1%", vs_claude: "71.5%", vs_llama: "63.2%" },
];

const stats = [
  { icon: Database, label: "Training Data", value: "4.2T tokens", sub: "Updated daily" },
  { icon: Clock, label: "Last Update", value: "2 hours ago", sub: "Continuous pipeline" },
  { icon: TrendingUp, label: "Improvement Rate", value: "+2.1%/mo", sub: "Avg. benchmark gain" },
  { icon: Zap, label: "Inference Latency", value: "38ms", sub: "P50 on our network" },
];

const TrainingStats = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-5xl">
          <Link to="/#regraph-llm">
            <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
            </Button>
          </Link>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono text-primary">Live Training Dashboard</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">ReGraph LLM</span> Training Statistics
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl">
              Real-time metrics from our continuous training pipeline. ReGraph LLM is updated daily with fresh data, ensuring it never goes stale.
            </p>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14"
          >
            {stats.map((s) => (
              <div key={s.label} className="p-5 rounded-xl bg-card/50 border border-border">
                <s.icon className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              </div>
            ))}
          </motion.div>

          {/* Benchmarks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-14"
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Benchmark Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-mono text-sm text-muted-foreground">Benchmark</th>
                    <th className="text-center py-3 px-4 font-mono text-sm text-primary font-bold">ReGraph LLM</th>
                    <th className="text-center py-3 px-4 font-mono text-sm text-muted-foreground">GPT-4o</th>
                    <th className="text-center py-3 px-4 font-mono text-sm text-muted-foreground">Claude 3.5</th>
                    <th className="text-center py-3 px-4 font-mono text-sm text-muted-foreground">Llama 3 70B</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((b) => (
                    <tr key={b.name} className="border-b border-border hover:bg-card/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-sm">{b.name}</td>
                      <td className="text-center py-3 px-4 font-mono text-primary font-bold">{b.score}</td>
                      <td className="text-center py-3 px-4 font-mono text-muted-foreground">{b.vs_gpt4}</td>
                      <td className="text-center py-3 px-4 font-mono text-muted-foreground">{b.vs_claude}</td>
                      <td className="text-center py-3 px-4 font-mono text-muted-foreground">{b.vs_llama}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">* Benchmarks as of February 2026. Scores reflect the latest checkpoint.</p>
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Training Timeline</h2>
            </div>
            <div className="space-y-0">
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary shrink-0 mt-1.5" />
                    {i < milestones.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">{m.date}</p>
                    <p className="text-sm">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrainingStats;
