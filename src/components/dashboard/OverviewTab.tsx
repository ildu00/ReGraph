import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Cpu, DollarSign, Clock } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";

const exampleCode = `curl -X POST https://api.regraph.tech/v1/inference \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama-3.1-70b",
    "prompt": "Hello, world!",
    "max_tokens": 100
  }'`;

const OverviewTab = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState([
    { label: "API Calls Today", value: "0", icon: Zap, change: "Today" },
    { label: "Compute Time", value: "0ms", icon: Cpu, change: "Today" },
    { label: "Credits Used", value: "$0.00", icon: DollarSign, change: "This month" },
    { label: "Balance", value: "$0.00", icon: Clock, change: "Current" },
  ]);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayLogs, monthLogs, wallet] = await Promise.all([
      supabase
        .from("usage_logs")
        .select("id, compute_time_ms, cost_usd")
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("usage_logs")
        .select("id, cost_usd")
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString()),
      supabase
        .from("wallets")
        .select("balance_usd")
        .eq("user_id", user.id)
        .single(),
    ]);

    const todayData = todayLogs.data || [];
    const monthData = monthLogs.data || [];
    const balance = wallet.data?.balance_usd ?? 0;

    const apiCallsToday = todayData.length;
    const totalComputeMs = todayData.reduce((sum, l) => sum + (l.compute_time_ms || 0), 0);
    const avgCompute = apiCallsToday > 0 ? Math.round(totalComputeMs / apiCallsToday) : 0;
    const monthCredits = monthData.reduce((sum, l) => sum + Number(l.cost_usd || 0), 0);

    setStats([
      { label: "API Calls Today", value: String(apiCallsToday), icon: Zap, change: `${avgCompute}ms avg` },
      { label: "Compute Time", value: totalComputeMs > 1000 ? `${(totalComputeMs / 1000).toFixed(1)}s` : `${totalComputeMs}ms`, icon: Cpu, change: "Today" },
      { label: "Credits Used", value: `$${monthCredits.toFixed(4)}`, icon: DollarSign, change: "This month" },
      { label: "Balance", value: `$${Number(balance).toFixed(4)}`, icon: Clock, change: "Current" },
    ]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here's an overview of your ReGraph usage.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">{stat.change}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Start */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
            <div>
              <p className="font-medium">Create an API Key</p>
              <p className="text-sm text-muted-foreground">Go to the API Keys tab and create your first API key.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
            <div>
              <p className="font-medium">Make Your First API Call</p>
              <p className="text-sm text-muted-foreground">Use our SDK or REST API to submit inference tasks.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
            <div>
              <p className="font-medium">Monitor Usage</p>
              <p className="text-sm text-muted-foreground">Track your API usage and costs in the Usage tab.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Code Example */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Example Request</h2>
        <CodeBlock code={exampleCode} language="bash" />
      </div>
    </div>
  );
};

export default OverviewTab;
