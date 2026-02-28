import { motion } from "framer-motion";
import { Bot, Globe, Code2, Search, FileText, ArrowRight, Zap, Brain, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const tools = [
  {
    icon: Search,
    name: "Web Search",
    description: "Real-time browsing via Firecrawl. Agents access live data, news, and any webpage.",
  },
  {
    icon: Code2,
    name: "Code Interpreter",
    description: "Execute Python, JavaScript, C++, and more via sandboxed runtime. Analyze data, run scripts.",
  },
  {
    icon: FileText,
    name: "Document Reader",
    description: "Parse PDFs, spreadsheets, and text files. Extract insights from any document.",
  },
  {
    icon: Globe,
    name: "Browser Tools",
    description: "Interact with web pages, fill forms, scrape content, and automate browser workflows.",
  },
];

const ClawSection = () => {
  return (
    <section className="relative py-20 overflow-hidden" id="claw">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono text-primary">ReGraph Claw</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Build Autonomous <span className="text-gradient-primary">AI Agents</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Claw is ReGraph's managed agent builder. Create, configure, and deploy AI agents with real-world tools — no infra required. Powered by the ReGraph decentralized compute network.
          </p>
        </motion.div>

        {/* Central visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto mb-14"
        >
          <div className="relative rounded-2xl border border-primary/20 bg-card/50 p-8 md:p-10 overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />

            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              {/* Agent card mock */}
              <div className="flex justify-center">
                <div className="w-56 rounded-2xl border border-primary/30 bg-background/80 shadow-lg shadow-primary/10 p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Research Agent</div>
                      <div className="text-[10px] text-muted-foreground font-mono">regraph-llm</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {["Web Search", "Code Interpreter", "Doc Reader"].map((t) => (
                      <div key={t} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                        {t}
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-border">
                    <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-mono text-primary">Running task…</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: stats */}
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">One-click deploy</div>
                    <div className="text-xs text-muted-foreground">Agents run on decentralized compute — no Docker, no servers.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Custom system prompts</div>
                    <div className="text-xs text-muted-foreground">Shape agent behavior with fine-grained instructions and personas.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Multi-tool orchestration</div>
                    <div className="text-xs text-muted-foreground">Combine search, code, and docs in a single autonomous reasoning loop.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tools grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 mb-12">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group p-5 rounded-xl bg-card/50 border border-border hover:border-primary/30 hover:bg-card transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <tool.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="font-semibold text-sm mb-1">{tool.name}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/claw">
            <Button size="lg" className="glow-primary">
              Explore Claw
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="lg" className="border-primary/30 hover:bg-primary/10">
              Try in Dashboard →
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ClawSection;
