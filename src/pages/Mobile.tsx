import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Smartphone,
  Zap,
  WifiOff,
  Shield,
  Battery,
  Cpu,
  Download,
  ArrowRight,
  Brain,
  Globe,
  Lock,
  Gauge,
  Server,
  ChevronRight,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const useCases = [
  {
    icon: Shield,
    title: "Healthcare & Medical Devices",
    description:
      "Run diagnostic AI models directly on tablets in hospitals and clinics. Patient data stays on-device, meeting HIPAA and GDPR requirements without cloud round-trips.",
  },
  {
    icon: Globe,
    title: "Field Operations & Remote Work",
    description:
      "Deploy AI assistants to engineers, inspectors, and field agents working in areas with limited or no connectivity. Models work fully offline.",
  },
  {
    icon: Lock,
    title: "Defense & Classified Environments",
    description:
      "Air-gapped inference for military and intelligence applications. No network access required — models are embedded directly into secure devices.",
  },
  {
    icon: Gauge,
    title: "Real-Time Edge Analytics",
    description:
      "Process sensor data, camera feeds, and IoT telemetry locally on mobile devices with sub-50ms latency for instant decision-making.",
  },
  {
    icon: Battery,
    title: "Consumer Apps & Assistants",
    description:
      "Power offline voice assistants, on-device translation, smart keyboard predictions, and photo enhancement — all without sending data to the cloud.",
  },
  {
    icon: Server,
    title: "Federated Training",
    description:
      "Contribute to the ReGraph network by training model shards on idle smartphone compute. Earn RGT tokens while keeping your personal data private.",
  },
];

const specs = [
  { label: "Supported Models", value: "1B — 7B parameters" },
  { label: "Quantization", value: "INT4, INT8, FP16" },
  { label: "Inference Speed", value: "30–60 tok/s (NPU)" },
  { label: "First Token Latency", value: "< 50ms" },
  { label: "Min RAM", value: "4 GB" },
  { label: "Platforms", value: "Android 12+, iOS 17+" },
  { label: "NPU Support", value: "Qualcomm HTP, Apple ANE, MediaTek APU, Samsung NPU" },
  { label: "Offline Mode", value: "Full — no network required" },
];

const steps = [
  {
    step: "01",
    title: "Install the SDK",
    description:
      "Add the ReGraph Mobile SDK to your app via Gradle (Android) or Swift Package Manager (iOS). Under 5 MB footprint.",
  },
  {
    step: "02",
    title: "Download a Model",
    description:
      "Choose from our catalog of quantized models optimized for mobile. Models are cached locally and auto-updated when connectivity is available.",
  },
  {
    step: "03",
    title: "Run Inference",
    description:
      "Call the same OpenAI-compatible API you already use — but it runs entirely on-device. Zero latency, zero cost, zero data leaks.",
  },
  {
    step: "04",
    title: "Optional: Join the Network",
    description:
      "Enable background training mode to contribute idle compute to the ReGraph network. Earn rewards while your phone charges overnight.",
  },
];

const Mobile = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>On-Device AI — ReGraph | Train & Run Models on Smartphones</title>
        <meta
          name="description"
          content="Run AI inference and training directly on smartphones. Offline-capable, privacy-first, sub-50ms latency. Supports 1B–7B parameter models on Android & iOS."
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
                <span className="text-sm font-mono text-accent">On-Device AI</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                AI That Lives on
                <br />
                <span className="text-gradient-primary">Your Device</span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
                Train, fine-tune, and run AI models directly on smartphones and tablets.
                No cloud. No latency. No data leaves your device — ever.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/docs">
                  <Button size="lg" className="glow-primary text-lg px-8 py-6 font-semibold">
                    Get the SDK
                    <Download className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 py-6 border-border hover:border-accent/50 hover:bg-accent/5"
                  >
                    Start Building Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Why On-Device */}
        <section className="py-20">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why <span className="text-gradient-primary">On-Device</span>?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Cloud AI is powerful — but it's not always the right answer. When privacy, latency, cost, or connectivity matter, on-device wins.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { icon: WifiOff, title: "Works Offline", desc: "No internet? No problem. Models run entirely on local hardware." },
                { icon: Zap, title: "Zero Latency", desc: "Sub-50ms response. No round-trip to a data center thousands of miles away." },
                { icon: Shield, title: "Total Privacy", desc: "Data never leaves the device. No logging, no telemetry, no third-party access." },
                { icon: Battery, title: "Cost = $0", desc: "Your device, your compute. No per-token charges, no API bills, no surprises." },
              ].map((item, i) => (
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

        {/* Technical Specs */}
        <section className="py-20 bg-card/30">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Technical Specifications</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built for modern mobile silicon. Optimized for every major NPU and mobile GPU architecture.
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

        {/* How It Works */}
        <section className="py-20">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From SDK install to on-device inference in under 10 minutes.
              </p>
            </motion.div>

            <div className="max-w-3xl mx-auto space-y-6">
              {steps.map((item, i) => (
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

        {/* Use Cases */}
        <section className="py-20 bg-card/30">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Use Cases</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                On-device AI unlocks scenarios that cloud inference simply can't serve.
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

        {/* Supported Models */}
        <section className="py-20">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Supported Models</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Pre-quantized and optimized for mobile. Download once, run forever.
              </p>
            </motion.div>

            <motion.div {...fadeUp} className="max-w-4xl mx-auto">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "regraph-llm-3b", size: "1.8 GB", speed: "52 tok/s", type: "General" },
                  { name: "regraph-llm-7b", size: "4.2 GB", speed: "31 tok/s", type: "General" },
                  { name: "regraph-code-3b", size: "1.9 GB", speed: "48 tok/s", type: "Code" },
                  { name: "regraph-vision-1b", size: "0.8 GB", speed: "60 tok/s", type: "Vision" },
                  { name: "regraph-embed-500m", size: "0.3 GB", speed: "120 tok/s", type: "Embeddings" },
                  { name: "regraph-whisper-sm", size: "0.5 GB", speed: "Real-time", type: "Speech" },
                ].map((model) => (
                  <div
                    key={model.name}
                    className="p-4 rounded-lg border border-border bg-card/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-semibold">{model.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{model.type}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{model.size}</span>
                      <span>•</span>
                      <span>{model.speed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Code Example */}
        <section className="py-20 bg-card/30">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Same API, No Cloud</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                If you've used the OpenAI SDK, you already know how to use ReGraph Mobile. One line change — everything runs locally.
              </p>
            </motion.div>

            <motion.div {...fadeUp} className="max-w-3xl mx-auto">
              <pre className="rounded-xl border border-border bg-background/80 p-6 overflow-x-auto text-sm font-mono leading-relaxed text-muted-foreground">
{`import { ReGraphMobile } from '@regraph/mobile-sdk';

const client = new ReGraphMobile({
  model: 'regraph-llm-3b',   // auto-downloads & caches
  quantization: 'int4',       // optimal for mobile
});

const response = await client.chat.completions.create({
  messages: [
    { role: 'user', content: 'Summarize this document' }
  ],
  stream: true,  // streaming works the same way
});

for await (const chunk of response) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`}
              </pre>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto">
              <Brain className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Put AI in Every Pocket?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Get started with the ReGraph Mobile SDK today. Free for personal use, enterprise plans for fleet deployments.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/docs">
                  <Button size="lg" className="glow-primary text-lg px-8 py-6 font-semibold">
                    Get the SDK
                    <Download className="ml-2 h-5 w-5" />
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
