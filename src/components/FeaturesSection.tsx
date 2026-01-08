import { motion } from "framer-motion";
import { Zap, Shield, Globe, Code, Layers, Clock, Lock, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Sub-100ms latency with intelligent routing to the nearest available nodes",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "End-to-end encryption, SOC2 compliance, and isolated execution environments",
  },
  {
    icon: Globe,
    title: "Global Network",
    description: "50,000+ nodes across 120 countries. Your workload runs where it's cheapest",
  },
  {
    icon: Code,
    title: "Simple API",
    description: "One unified REST API for all operations. OpenAI-compatible endpoints available",
  },
  {
    icon: Layers,
    title: "Model Agnostic",
    description: "Run any model: LLMs, diffusion, transformers, custom architectures",
  },
  {
    icon: Clock,
    title: "Auto-Scaling",
    description: "From zero to 10,000 concurrent requests. Pay nothing when idle",
  },
  {
    icon: Lock,
    title: "Data Privacy",
    description: "Your data never leaves your control. Optional on-prem deployment",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Monitor costs, latency, and throughput with our comprehensive dashboard",
  },
];

const FeaturesSection = () => {
  return (
    <section className="relative py-16 overflow-hidden" id="features">
      <div className="absolute inset-0 bg-gradient-to-b from-card/30 via-background to-card/30" />
      
      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Built for Scale</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Production-ready infrastructure that grows with your AI applications
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-xl bg-card/50 border border-border hover:border-primary/30 hover:bg-card transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
