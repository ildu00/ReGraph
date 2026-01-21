import { motion } from "framer-motion";
import { Server, Cloud, Coins, ArrowRight, Upload, Cpu, Zap, Check } from "lucide-react";

const providerSteps = [
  {
    icon: Upload,
    title: "Register Hardware",
    description: "Connect your GPU, TPU, NPU, or even smartphone to our network",
  },
  {
    icon: Cpu,
    title: "Run Our Agent",
    description: "Simple one-line install. Supports Linux, Windows, macOS, Android",
  },
  {
    icon: Coins,
    title: "Earn Passively",
    description: "Get paid for every inference or training job executed on your hardware",
  },
];

const userSteps = [
  {
    icon: Cloud,
    title: "Choose Model",
    description: "Select from 10,000+ pre-deployed models or bring your own",
  },
  {
    icon: Zap,
    title: "Submit Task",
    description: "Single API call for inference, batch jobs, or fine-tuning",
  },
  {
    icon: Check,
    title: "Get Results",
    description: "Real-time streaming or webhook callbacks. Pay only for what you use",
  },
];

const StepCard = ({ step, index, delay }: { step: typeof providerSteps[0]; index: number; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    className="relative h-full"
  >
    <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors h-full">
      <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        <step.icon className="h-7 w-7 text-primary" />
      </div>
      <div className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono font-bold text-base shadow-lg">
        {index + 1}
      </div>
      <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
      <p className="text-muted-foreground flex-1">{step.description}</p>
    </div>
    {index < 2 && (
      <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
        <ArrowRight className="h-6 w-6 text-muted-foreground" />
      </div>
    )}
  </motion.div>
);

const HowItWorksSection = () => {
  return (
    <section className="relative py-16 overflow-hidden" id="how-it-works">
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you're providing compute or consuming it, getting started takes minutes
          </p>
        </motion.div>

        {/* For Providers */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-8"
          >
            <Server className="h-6 w-6 text-primary" />
            <h3 className="text-2xl font-semibold">For Hardware Providers</h3>
            <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded-full">
              Earn money
            </span>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {providerSteps.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} delay={0.1 + i * 0.15} />
            ))}
          </div>
        </div>

        {/* For Users */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-8"
          >
            <Cloud className="h-6 w-6 text-primary" />
            <h3 className="text-2xl font-semibold">For AI Developers</h3>
            <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded-full">
              Save money
            </span>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {userSteps.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} delay={0.4 + i * 0.15} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
