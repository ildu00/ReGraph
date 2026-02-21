import { motion } from "framer-motion";
import { Smartphone, Zap, Users, Coins, Network, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const highlights = [
  {
    icon: Network,
    title: "Massive Untapped Compute",
    description:
      "Millions of smartphones sit idle every day. ReGraph turns that dormant mobile compute into a decentralized AI supercluster.",
  },
  {
    icon: Coins,
    title: "Earn While You Sleep",
    description:
      "Rent out your phone's GPU, NPU, and CPU to the network. Earn RGT tokens for every training shard and inference job your device completes.",
  },
  {
    icon: Users,
    title: "Anyone Can Be a Provider",
    description:
      "No data center needed. Plug your smartphone into the ReGraph network and start earning — just like GPU and TPU providers already do.",
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
            <span className="text-sm font-mono text-accent">Mobile Compute Network</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Every Phone Is a <span className="text-gradient-primary">Compute Node</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Smartphones are the most widespread compute devices on the planet. ReGraph lets anyone contribute their phone's idle power to a decentralized AI network — and get paid for it.
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
              {/* Left: phone as network node */}
              <div className="flex justify-center">
                <div className="relative w-48 h-80 rounded-[2rem] border-2 border-primary/30 bg-background/80 shadow-lg shadow-primary/10 flex flex-col items-center justify-center gap-4 p-6">
                  <div className="w-16 h-1 rounded-full bg-muted absolute top-3" />
                  <Smartphone className="h-10 w-10 text-primary mb-2" />
                  <div className="text-center">
                    <div className="text-xs font-mono text-primary mb-1">Node Active</div>
                    <div className="text-[10px] text-muted-foreground">training shard #4,291</div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-xs font-mono text-primary">+0.42 RGT/hr</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Network className="h-3 w-3 text-accent" />
                    <span className="text-xs font-mono text-accent">12,847 peers</span>
                  </div>
                </div>
              </div>

              {/* Right: stats */}
              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-bold font-mono text-primary">GPU · NPU · CPU</div>
                  <div className="text-sm text-muted-foreground">smartphones as compute nodes — same as any other device</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-mono text-primary">24/7</div>
                  <div className="text-sm text-muted-foreground">earn passively while your phone charges overnight</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-mono text-primary">$0 setup</div>
                  <div className="text-sm text-muted-foreground">install the app, join the network, start earning</div>
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
