import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Github, Twitter, Zap } from "lucide-react";

const CTASection = () => {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-radial" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
      
      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono text-primary">Start with $10 free credits</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to <span className="text-gradient-primary">cut your AI costs</span> by 80%?
          </h2>

          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Join 10,000+ developers and 5,000+ hardware providers already on NeuralGrid. 
            No credit card required to start.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="glow-primary text-lg px-8 py-6 font-semibold animate-pulse-glow">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 border-border hover:border-primary/50 hover:bg-primary/5"
            >
              <Github className="mr-2 h-5 w-5" />
              View on GitHub
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-8 text-muted-foreground text-sm">
            <span>🔒 SOC2 Compliant</span>
            <span>🌍 GDPR Ready</span>
            <span>⚡ 99.9% Uptime SLA</span>
            <span>🛡️ End-to-end Encrypted</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
