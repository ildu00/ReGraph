import { motion } from "framer-motion";
import { Brain, TrendingUp, DollarSign, Cpu, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const advantages = [
  {
    icon: TrendingUp,
    title: "Continuously Trained",
    description: "ReGraph LLM is never frozen — it learns from fresh data daily, staying current where other models go stale after their training cutoff.",
  },
  {
    icon: DollarSign,
    title: "10× More Affordable",
    description: "Run at a fraction of GPT-4 or Claude pricing. Same quality tier for reasoning and code, without the markup of closed-source providers.",
  },
  {
    icon: Cpu,
    title: "Decentralized Inference",
    description: "Served across our 50,000+ node network. No single point of failure, no rate limits, no waitlists — always available.",
  },
  {
    icon: Globe,
    title: "OpenAI-Compatible API",
    description: "Drop-in replacement: swap your base URL and you're live. Works with LangChain, LlamaIndex, and every OpenAI SDK out of the box.",
  },
  {
    icon: Sparkles,
    title: "Optimized for Real Tasks",
    description: "Fine-tuned on production workloads — structured extraction, multi-step reasoning, and long-context summarization outperform generic models.",
  },
];

const ReGraphLLMSection = () => {
  return (
    <section className="relative py-20 overflow-hidden" id="regraph-llm">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background" />

      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono text-primary">Our Own Foundation Model</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">ReGraph LLM</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A continuously trained large language model built for production. While others ship a snapshot, we ship a living model — updated daily with the latest knowledge and optimized for real-world performance.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 min-w-0">
          {advantages.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-xl bg-card/50 border border-border hover:border-primary/30 hover:bg-card transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </motion.div>
          ))}

          {/* API snippet card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-xl bg-card/80 border border-primary/20 flex flex-col justify-between min-w-0"
          >
            <div className="min-w-0">
              <h3 className="text-lg font-semibold mb-3">Try it now</h3>
              <pre className="text-xs font-mono bg-background/80 rounded-lg p-3 sm:p-4 overflow-x-auto text-muted-foreground leading-relaxed max-w-full [overflow-wrap:anywhere]">
{`curl https://api.regraph.ai/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -d '{
    "model": "regraph-llm",
    "messages": [
      {"role": "user",
       "content": "Explain quantum computing"}
    ]
  }'`}
              </pre>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/docs">
            <Button variant="outline" size="lg" className="border-primary/30 hover:bg-primary/10">
              Read the Docs →
            </Button>
          </Link>
          <Link to="/training-stats">
            <Button variant="outline" size="lg" className="border-primary/30 hover:bg-primary/10">
              Training Stats →
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ReGraphLLMSection;
