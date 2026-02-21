import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Smartphone,
  Zap,
  Shield,
  Battery,
  Cpu,
  Download,
  ArrowRight,
  Brain,
  Globe,
  Network,
  Coins,
  Users,
  ChevronRight,
  Server,
  Layers,
  Lock,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const whyMobile = [
  {
    icon: Globe,
    title: "7 Billion Untapped Devices",
    desc: "There are more smartphones than GPUs by orders of magnitude. ReGraph unlocks this dormant compute for AI training and inference.",
  },
  {
    icon: Network,
    title: "True Decentralization",
    desc: "No single point of failure. Thousands of mobile nodes process shards in parallel, making the network resilient and censorship-resistant.",
  },
  {
    icon: Coins,
    title: "Earn Passively",
    desc: "Rent your phone's idle compute to the network. Earn RGT tokens 24/7 — especially overnight while charging.",
  },
  {
    icon: Shield,
    title: "Privacy by Design",
    desc: "Federated training means raw data never leaves the device. Only encrypted gradients are shared with the network.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Install the ReGraph App",
    description:
      "Download the lightweight ReGraph provider app on Android or iOS. Under 20 MB. No root or jailbreak needed.",
  },
  {
    step: "02",
    title: "Register as a Provider",
    description:
      "Sign up, connect your wallet, and register your device — just like GPU providers do. Your phone becomes a node in the decentralized network.",
  },
  {
    step: "03",
    title: "Contribute Compute",
    description:
      "The network assigns training shards and inference tasks to your device based on its capabilities. Work is distributed across thousands of phones in parallel.",
  },
  {
    step: "04",
    title: "Get Paid",
    description:
      "Earn RGT tokens for every completed job. Withdraw anytime. The more compute you contribute, the more you earn — same economics as GPU providers.",
  },
];

const useCases = [
  {
    icon: Layers,
    title: "Federated Model Training",
    description:
      "Split training across thousands of smartphones. Each device trains on a shard and sends only encrypted weight updates — no raw data ever leaves the phone.",
  },
  {
    icon: Zap,
    title: "Edge Inference at Scale",
    description:
      "Run inference tasks on nearby mobile devices instead of distant data centers. Lower latency, lower cost, better geographic distribution.",
  },
  {
    icon: Lock,
    title: "Privacy-Critical Workloads",
    description:
      "Healthcare, finance, and government clients can leverage on-device compute where data residency regulations prohibit cloud processing.",
  },
  {
    icon: Battery,
    title: "Idle-Time Monetization",
    description:
      "Most phones sit idle 80% of the day. ReGraph turns that dead time into productive compute and passive income for device owners.",
  },
  {
    icon: Users,
    title: "Community-Powered AI",
    description:
      "Open-source models can be trained by the community itself — no corporate data center needed. Democratizing AI at the infrastructure level.",
  },
  {
    icon: Server,
    title: "Burst Capacity for the Network",
    description:
      "When GPU demand spikes, the mobile fleet provides elastic overflow capacity. Smartphones absorb load that would otherwise queue on traditional hardware.",
  },
];

const specs = [
  { label: "Supported Tasks", value: "Training shards, inference, embeddings" },
  { label: "Model Support", value: "1B — 7B parameters (quantized)" },
  { label: "Quantization", value: "INT4, INT8, FP16" },
  { label: "NPU Support", value: "Qualcomm HTP, Apple ANE, MediaTek APU, Samsung NPU" },
  { label: "Platforms", value: "Android 12+, iOS 17+" },
  { label: "Min RAM", value: "4 GB" },
  { label: "Background Mode", value: "Yes — works while charging" },
  { label: "Earnings", value: "RGT tokens, same payout system as GPU providers" },
];

const Mobile = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Mobile Compute Network — ReGraph | Earn with Your Smartphone</title>
        <meta
          name="description"
          content="Turn your smartphone into a decentralized AI compute node. Earn RGT tokens by contributing your phone's idle GPU, NPU, and CPU power to the ReGraph network."
        />
        <link rel="canonical" href="https://regraph.tech/mobile" />
      </Helmet>
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-16">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute inset-0 bg-gradient-radial" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-accent/5 blur-3xl" />

          <div className="container relative z-10 px-4 py-20">
            <motion.div {...fadeUp} className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5 mb-8">
                <Smartphone className="h-4 w-4 text-accent" />
                <span className="text-sm font-mono text-accent">Mobile Compute Network</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                Your Phone Is a
                <br />
                <span className="text-gradient-primary">Compute Node</span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
                7 billion smartphones. Trillions of idle FLOPS. ReGraph turns every phone into a node
                in the world's largest decentralized AI network — and pays you for it.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="glow-primary text-lg px-8 py-6 font-semibold">
                    Start Earning
                    <Coins className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/docs">
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 py-6 border-border hover:border-accent/50 hover:bg-accent/5"
                  >
                    Read the Docs
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Why Mobile Compute */}
        <section className="py-20">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why <span className="text-gradient-primary">Smartphones</span>?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                GPUs are powerful but scarce and expensive. Smartphones are everywhere — and modern mobile chips
                are more capable than you think.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {whyMobile.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-xl bg-card/50 border border-border hover:border-accent/30 transition-colors text-center"
                >
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-card/30">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Same provider flow as GPU and TPU. Install, register, earn.
              </p>
            </motion.div>

            <div className="max-w-3xl mx-auto space-y-6">
              {howItWorks.map((item, i) => (
                <motion.div
                  key={item.step}
                  {...fadeUp}
                  transition={{ delay: i * 0.12 }}
                  className="flex gap-6 p-6 rounded-xl bg-card/50 border border-border hover:border-primary/20 transition-colors"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold font-mono text-primary">{item.step}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Technical Specs */}
        <section className="py-20">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Technical Specifications</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Smartphones join the network as first-class compute nodes — same architecture, same payout rails.
              </p>
            </motion.div>

            <motion.div {...fadeUp} className="max-w-3xl mx-auto">
              <div className="rounded-xl border border-border overflow-hidden">
                {specs.map((spec, i) => (
                  <div
                    key={spec.label}
                    className={`flex items-center justify-between px-6 py-4 ${
                      i % 2 === 0 ? "bg-card/50" : "bg-background/50"
                    } ${i < specs.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <span className="text-sm text-muted-foreground">{spec.label}</span>
                    <span className="text-sm font-mono font-semibold text-foreground">{spec.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 bg-card/30">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Use Cases</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Mobile compute unlocks scenarios that traditional infrastructure can't economically serve.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {useCases.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp}
                  transition={{ delay: i * 0.08 }}
                  className="group p-6 rounded-xl bg-background/50 border border-border hover:border-accent/30 hover:bg-card/50 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <item.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison: Phones vs GPUs */}
        <section className="py-20">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Phones vs. GPUs — <span className="text-gradient-primary">Complementary, Not Competing</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Smartphones don't replace GPUs — they extend the network. Different strengths, same decentralized infrastructure.
              </p>
            </motion.div>

            <motion.div {...fadeUp} className="max-w-4xl mx-auto">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-3 bg-card/80 border-b border-border">
                  <div className="px-6 py-4 text-sm font-semibold text-muted-foreground" />
                  <div className="px-6 py-4 text-sm font-semibold text-center">
                    <Smartphone className="h-5 w-5 mx-auto mb-1 text-accent" />
                    Smartphones
                  </div>
                  <div className="px-6 py-4 text-sm font-semibold text-center">
                    <Cpu className="h-5 w-5 mx-auto mb-1 text-primary" />
                    GPUs / TPUs
                  </div>
                </div>
                {[
                  ["Availability", "7B+ devices globally", "~50M dedicated units"],
                  ["Setup Cost", "$0 — use existing phone", "$2K — $40K+ per card"],
                  ["Best For", "Training shards, embeddings, light inference", "Heavy training, large-batch inference"],
                  ["Earnings", "Lower per-device, massive scale", "Higher per-device, limited supply"],
                  ["Power Draw", "2–5W", "150–700W"],
                  ["Barrier to Entry", "Anyone with a phone", "Requires hardware investment"],
                ].map(([label, phone, gpu], i) => (
                  <div
                    key={label}
                    className={`grid grid-cols-3 ${i % 2 === 0 ? "bg-card/50" : "bg-background/50"} border-b border-border last:border-b-0`}
                  >
                    <div className="px-6 py-4 text-sm font-medium text-foreground">{label}</div>
                    <div className="px-6 py-4 text-sm text-muted-foreground text-center">{phone}</div>
                    <div className="px-6 py-4 text-sm text-muted-foreground text-center">{gpu}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto">
              <Brain className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Turn Every Phone Into a Revenue Stream
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join the ReGraph network as a mobile provider. Same payouts, same dashboard, same infrastructure — just a different device.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="glow-primary text-lg px-8 py-6 font-semibold">
                    Become a Provider
                    <Coins className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 py-6 border-border hover:border-primary/50 hover:bg-primary/5"
                  >
                    View Pricing
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Mobile;
