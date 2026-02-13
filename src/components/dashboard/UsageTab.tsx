import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface UsageLog {
  id: string;
  endpoint: string;
  tokens_used: number;
  compute_time_ms: number;
  cost_usd: number;
  created_at: string;
}

const UsageTab = () => {
  const { user } = useAuth();
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageLogs();
  }, [user]);

  const fetchUsageLogs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("usage_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setUsageLogs(data || []);
    }
    setLoading(false);
  };

  // Generate sample chart data (will be empty if no usage)
  const chartData = usageLogs.length > 0
    ? usageLogs.reduce((acc: any[], log) => {
        const date = new Date(log.created_at).toLocaleDateString();
        const existing = acc.find((d) => d.date === date);
        if (existing) {
          existing.calls += 1;
          existing.tokens += log.tokens_used;
          existing.cost += parseFloat(log.cost_usd.toString());
        } else {
          acc.push({
            date,
            calls: 1,
            tokens: log.tokens_used,
            cost: parseFloat(log.cost_usd.toString()),
          });
        }
        return acc;
      }, []).reverse()
    : [
        { date: "Today", calls: 0, tokens: 0, cost: 0 },
      ];

  const totalCalls = usageLogs.length;
  const totalTokens = usageLogs.reduce((sum, log) => sum + log.tokens_used, 0);
  const totalCost = usageLogs.reduce((sum, log) => sum + parseFloat(log.cost_usd.toString()), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usage</h1>
        <p className="text-muted-foreground">
          Track your API usage and costs over time.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <p className="text-sm text-muted-foreground mb-1">Total API Calls</p>
          <p className="text-3xl font-bold">{totalCalls.toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <p className="text-sm text-muted-foreground mb-1">Total Tokens</p>
          <p className="text-3xl font-bold">{totalTokens.toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <p className="text-sm text-muted-foreground mb-1">Total Cost</p>
          <p className="text-3xl font-bold">${totalCost.toFixed(4)}</p>
        </motion.div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">API Calls Over Time</h2>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(180 100% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(180 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(0 0% 55%)"
                  fontSize={12}
                />
                <YAxis stroke="hsl(0 0% 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(0 0% 6%)",
                    border: "1px solid hsl(0 0% 14%)",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(180 100% 50%)"
                  fillOpacity={1}
                  fill="url(#colorCalls)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Usage */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : usageLogs.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Usage Yet</h3>
            <p className="text-muted-foreground">
              Start making API calls to see your usage history here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {usageLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium font-mono text-sm">{log.endpoint}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{log.tokens_used} tokens</p>
                  <p className="text-sm text-muted-foreground">
                    ${parseFloat(log.cost_usd.toString()).toFixed(6)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageTab;
