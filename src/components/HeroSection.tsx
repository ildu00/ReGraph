import { motion } from "framer-motion";
import { Cpu, Zap, DollarSign, Shield, Globe, Code, Server, Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-gradient-radial" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
      
      <div className="container relative z-10 px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-mono text-primary">Decentralized AI Compute</span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="text-gradient">Neural</span>
            <span className="text-primary">Grid</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            The world's cheapest AI inference & training marketplace.
            <br />
            <span className="text-foreground font-medium">Pay up to 80% less</span> than traditional cloud providers.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            {[
              { value: "$0.0001", label: "per inference" },
              { value: "50,000+", label: "GPU nodes" },
              { value: "99.9%", label: "uptime SLA" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold font-mono text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="glow-primary text-lg px-8 py-6 font-semibold">
              Start Building Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-border hover:border-primary/50 hover:bg-primary/5">
              Provide Compute
              <Server className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          {/* Device icons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-16 flex justify-center items-center gap-8 text-muted-foreground"
          >
            <Cpu className="h-8 w-8 animate-float" style={{ animationDelay: "0s" }} />
            <Server className="h-8 w-8 animate-float" style={{ animationDelay: "0.5s" }} />
            <Smartphone className="h-8 w-8 animate-float" style={{ animationDelay: "1s" }} />
            <Globe className="h-8 w-8 animate-float" style={{ animationDelay: "1.5s" }} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
