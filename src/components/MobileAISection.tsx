import { motion } from "framer-motion";
import { Smartphone, Zap, Wifi, WifiOff, Shield, Battery, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const highlights = [
  {
    icon: WifiOff,
    title: "Offline Inference",
    description: "Run models directly on-device — no internet required. Perfect for field operations and privacy-sensitive workloads.",
  },
  {
    icon: Battery,
    title: "Power Efficient",
    description: "Optimized for mobile NPUs and GPUs. Get hours of continuous inference on a single charge.",
  },
  {
    icon: Shield,
    title: "Data Never Leaves Device",
    description: "Zero data exfiltration risk. All computation happens locally — ideal for healthcare, finance, and defense.",
  },
];

const MobileAISection = () => {
  return (
    <section className="relative py-20 overflow-hidden" id="mobile-ai">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/[0.03] to-background" />

      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
            <Smartphone className="h-4 w-4 text-accent" />
            <span className="text-sm font-mono text-accent">On-Device AI</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            AI That Runs in Your <span className="text-gradient-primary">Pocket</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Train and run AI models directly on smartphones. No cloud dependency, no latency, no data leaks — just raw on-device intelligence powered by the ReGraph network.
          </p>
        </motion.div>

        {/* Visual device mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mb-14"
        >
          <div className="relative rounded-2xl border border-border bg-card/50 p-8 md:p-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />

            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              {/* Left: phone illustration */}
              <div className="flex justify-center">
                <div className="relative w-48 h-80 rounded-[2rem] border-2 border-primary/30 bg-background/80 shadow-lg shadow-primary/10 flex flex-col items-center justify-center gap-4 p-6">
                  <div className="w-16 h-1 rounded-full bg-muted absolute top-3" />
                  <Smartphone className="h-10 w-10 text-primary mb-2" />
                  <div className="text-center">
                    <div className="text-xs font-mono text-primary mb-1">regraph-llm-3b</div>
                    <div className="text-[10px] text-muted-foreground">running locally</div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-xs font-mono text-primary">42 tok/s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-mono text-muted-foreground line-through">cloud</span>
                  </div>
                </div>
              </div>

              {/* Right: stats */}
              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-bold font-mono text-primary">3B–7B</div>
                  <div className="text-sm text-muted-foreground">parameter models on-device</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-mono text-primary">&lt;50ms</div>
                  <div className="text-sm text-muted-foreground">first-token latency</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-mono text-primary">0¢</div>
                  <div className="text-sm text-muted-foreground">per inference — your hardware, your cost</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {highlights.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-xl bg-card/50 border border-border hover:border-accent/30 hover:bg-card transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <item.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link to="/mobile">
            <Button size="lg" className="glow-primary">
              Learn More
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/docs">
            <Button variant="outline" size="lg" className="border-primary/30 hover:bg-primary/10">
              Read the Docs →
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default MobileAISection;
