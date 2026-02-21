import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Zap, Check, ArrowRight, Cpu, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const useGpuPricing = () =>
  useQuery({
    queryKey: ["gpu-pricing-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gpu_pricing")
        .select("*")
        .eq("is_active", true)
        .order("price_per_hour", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

const useModelPricing = () =>
  useQuery({
    queryKey: ["model-pricing-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("model_pricing")
        .select("*")
        .eq("is_active", true)
        .order("price_per_1k_input_tokens", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

const freeTierFeatures = [
  "$1 signup bonus — no credit card required",
  "Access to all models via REST API",
  "Community support & documentation",
  "Up to 10 req/s rate limit",
];

const proFeatures = [
  "Everything in Free, plus:",
  "Priority routing — lowest latency",
  "100 req/s rate limit",
  "Dedicated Slack channel support",
  "Custom fine-tuning jobs",
  "Volume discounts on inference",
];

const Pricing = () => {
  const { data: gpus = [], isLoading: gpuLoading } = useGpuPricing();
  const { data: models = [], isLoading: modelLoading } = useModelPricing();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Pricing — ReGraph</title>
        <meta
          name="description"
          content="Transparent, pay-as-you-go pricing for GPU compute and AI model inference. Up to 80% cheaper than major cloud providers."
        />
      </Helmet>
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="container px-4 text-center mb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold mb-4"
          >
            <span className="text-gradient">Simple, transparent</span>{" "}
            <span className="text-primary">pricing</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            Pay only for what you use. No minimums, no commitments, no hidden
            fees.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Button size="lg" className="glow-primary" asChild>
              <Link to="/auth">
                <Zap className="mr-2 h-5 w-5" />
                Start for Free
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/docs">View Docs</Link>
            </Button>
          </motion.div>
        </section>

        {/* Plans */}
        <section className="container px-4 mb-24">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-xl border border-border bg-card p-8 flex flex-col"
            >
              <h3 className="text-2xl font-bold mb-1">Free</h3>
              <p className="text-muted-foreground mb-6">
                Great for experimenting & prototyping
              </p>
              <div className="text-4xl font-bold mb-6">
                $0<span className="text-lg text-muted-foreground font-normal">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {freeTierFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="lg" className="w-full" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </motion.div>

            {/* Pro */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-primary/40 bg-card p-8 flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-1">Pro</h3>
              <p className="text-muted-foreground mb-6">
                For production workloads at scale
              </p>
              <div className="text-4xl font-bold mb-6">
                Pay-as-you-go
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full glow-primary" asChild>
                <Link to="/auth">
                  <Zap className="mr-2 h-4 w-4" />
                  Start Building
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* GPU Pricing */}
        <section className="container px-4 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold">GPU Compute</h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-xl">
              Rent GPU power by the hour. Prices vary by card — pick the
              performance tier that fits your workload.
            </p>

            {gpuLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GPU</TableHead>
                    <TableHead className="text-right">Price / hour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gpus.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.gpu_type}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${Number(g.price_per_hour).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {gpus.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No GPU pricing available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </motion.div>
        </section>

        {/* Model Pricing */}
        <section className="container px-4 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <BrainCircuit className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold">Model Inference</h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-xl">
              Per-token pricing for hosted models. Input and output tokens are
              billed separately.
            </p>

            {modelLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Input / 1K tokens</TableHead>
                    <TableHead className="text-right">Output / 1K tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.display_name}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {m.category}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${Number(m.price_per_1k_input_tokens).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${Number(m.price_per_1k_output_tokens).toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {models.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No model pricing available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </motion.div>
        </section>

        {/* CTA */}
        <section className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center rounded-xl border border-border bg-card p-12"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to build?</h2>
            <p className="text-muted-foreground mb-8">
              Sign up in seconds. Your first $1 is on us.
            </p>
            <Button size="lg" className="glow-primary" asChild>
              <Link to="/auth">
                <Zap className="mr-2 h-5 w-5" />
                Get Started Free
              </Link>
            </Button>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
