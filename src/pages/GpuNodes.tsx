import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Cpu, ArrowLeft, Circle, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

const statusMeta: Record<string, { label: string; color: string }> = {
  online:      { label: "Online",      color: "text-primary" },
  offline:     { label: "Offline",     color: "text-muted-foreground" },
  pending:     { label: "Pending",     color: "text-foreground" },
  maintenance: { label: "Maintenance", color: "text-foreground" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

const GpuNodes = () => {
  const { gpuType } = useParams<{ gpuType: string }>();
  const decoded = decodeURIComponent(gpuType ?? "");

  const { data: gpuRow } = useQuery({
    queryKey: ["gpu-pricing-row", decoded],
    queryFn: async () => {
      const { data } = await supabase
        .from("gpu_pricing")
        .select("*")
        .ilike("gpu_type", decoded)
        .single();
      return data;
    },
    enabled: !!decoded,
  });

  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ["gpu-nodes", decoded],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_devices")
        .select("id, device_name, device_type, device_model, status, vram_gb, price_per_hour, total_compute_hours, total_earnings, last_seen_at, hardware_info")
        .eq("device_type", "gpu")
        .ilike("device_model", `%${decoded}%`)
        .order("status", { ascending: true })
        .order("price_per_hour", { ascending: true });
      return data ?? [];
    },
    enabled: !!decoded,
    refetchInterval: 30_000,
  });

  const online  = nodes.filter((n) => n.status === "online").length;
  const total   = nodes.length;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>{decoded} Nodes — ReGraph GPU Compute</title>
        <meta name="description" content={`Available ${decoded} GPU nodes on the ReGraph network.`} />
      </Helmet>
      <Navbar />

      <main className="pt-24 pb-20">
        <section className="container px-4 mb-10">
          <div className="max-w-5xl mx-auto">
            <Link to="/pricing#gpu" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Pricing
            </Link>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Cpu className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold">{decoded}</h1>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Provider nodes available on the ReGraph network for this GPU configuration.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{online}</div>
                    <div className="text-xs text-muted-foreground">Online now</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{total}</div>
                    <div className="text-xs text-muted-foreground">Total nodes</div>
                  </div>
                  {gpuRow && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">${Number(gpuRow.price_per_hour).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">/ hour</div>
                    </div>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                </div>
              ) : nodes.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-16 text-center">
                  <Cpu className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No nodes found for this GPU type.</p>
                  <p className="text-xs text-muted-foreground mt-1">Providers can register nodes via the dashboard.</p>
                  <Button variant="outline" size="sm" className="mt-6" asChild>
                    <Link to="/dashboard">Become a Provider</Link>
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Node</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">VRAM</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="hidden md:table-cell text-right">Compute hrs</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Last seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nodes.map((node) => {
                        const s = statusMeta[node.status] ?? { label: node.status, color: "text-muted-foreground" };
                        const lastSeen = node.last_seen_at
                          ? new Date(node.last_seen_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "—";
                        return (
                          <TableRow key={node.id} className="hover:bg-card/60 transition-colors">
                            <TableCell>
                              <div className="font-medium">{node.device_name}</div>
                              {node.device_model && (
                                <div className="text-xs text-muted-foreground font-mono">{node.device_model}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.color}`}>
                                <Circle className="h-2 w-2 fill-current" />
                                {s.label}
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right font-mono text-sm text-muted-foreground">
                              {node.vram_gb ? `${node.vram_gb} GB` : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-primary font-semibold">
                              ${Number(node.price_per_hour).toFixed(2)}/hr
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-right font-mono text-sm text-muted-foreground">
                              {node.total_compute_hours > 0 ? fmt(node.total_compute_hours) : "—"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-right text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />{lastSeen}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {nodes.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3 text-right">
                  Auto-refreshes every 30 s · {nodes.length} node{nodes.length !== 1 ? "s" : ""} registered
                </p>
              )}
            </motion.div>
          </div>
        </section>

        <section className="container px-4">
          <div className="max-w-5xl mx-auto rounded-xl border border-border bg-card p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Want to provide {decoded} compute?</p>
              <p className="text-sm text-muted-foreground">Register your device and start earning.</p>
            </div>
            <Button className="glow-primary shrink-0" asChild>
              <Link to="/dashboard"><Zap className="mr-2 h-4 w-4" />Become a Provider</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default GpuNodes;
