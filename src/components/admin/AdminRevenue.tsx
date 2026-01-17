import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Transaction {
  id: string;
  user_id: string;
  amount_usd: number;
  transaction_type: string;
  status: string;
  created_at: string;
}

export const AdminRevenue = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<Array<{ date: string; revenue: number; payouts: number }>>([]);
  const [isEstimatedFromUsageLogs, setIsEstimatedFromUsageLogs] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const [txRes, usageRes] = await Promise.all([
          supabase
            .from("wallet_transactions")
            .select("id, user_id, amount_usd, transaction_type, status, created_at")
            .order("created_at", { ascending: false })
            .limit(1000),
          supabase
            .from("usage_logs")
            .select("created_at, cost_usd")
            .gte("created_at", fourteenDaysAgo.toISOString())
            .order("created_at", { ascending: true })
            .limit(5000),
        ]);

        if (txRes.error) throw txRes.error;
        if (usageRes.error) throw usageRes.error;

        const txData = txRes.data || [];
        const usageLogs = usageRes.data || [];

        setTransactions(txData as Transaction[]);

        const groupByDay = (
          rows: Array<{ created_at: string; revenue: number; payouts: number }>,
        ) => {
          const map = new Map<string, { revenue: number; payouts: number }>();

          for (const row of rows) {
            const key = new Date(row.created_at).toISOString().slice(0, 10); // YYYY-MM-DD
            const prev = map.get(key) || { revenue: 0, payouts: 0 };
            map.set(key, {
              revenue: prev.revenue + row.revenue,
              payouts: prev.payouts + row.payouts,
            });
          }

          return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => ({
              date: new Date(`${key}T00:00:00Z`).toLocaleDateString(),
              revenue: value.revenue,
              payouts: value.payouts,
            }));
        };

        // Prefer actual wallet transactions for revenue/payouts if present.
        const txRowsForChart = txData
          .filter((t: any) => t.transaction_type === "usage_charge" || t.transaction_type === "provider_earning")
          .map((t: any) => {
            const amount = Math.abs(Number(t.amount_usd)) || 0;
            return {
              created_at: t.created_at,
              revenue: t.transaction_type === "usage_charge" ? amount : 0,
              payouts: t.transaction_type === "provider_earning" ? amount : 0,
            };
          });

        const txChart = groupByDay(txRowsForChart).slice(-14);
        const txHasMoney = txChart.some((d) => d.revenue > 0 || d.payouts > 0);

        if (txHasMoney) {
          setIsEstimatedFromUsageLogs(false);
          setRevenueData(txChart);
        } else {
          // Fallback: estimate from usage_logs (matches what you see on the main dashboard).
          const usageRowsForChart = usageLogs.map((l: any) => {
            const cost = Math.abs(Number(l.cost_usd)) || 0;
            return {
              created_at: l.created_at,
              revenue: cost,
              payouts: cost * 0.8,
            };
          });

          setIsEstimatedFromUsageLogs(true);
          setRevenueData(groupByDay(usageRowsForChart).slice(-14));
        }
      } catch (error) {
        console.error("Error fetching transactions/usage logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats (prefer wallet transactions when they exist; otherwise estimate from chart)
  const totalRevenue = transactions
    .filter((t) => t.transaction_type === "usage_charge")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount_usd)), 0);

  const totalPayouts = transactions
    .filter((t) => t.transaction_type === "provider_earning")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount_usd)), 0);

  const totalDeposits = transactions
    .filter((t) => t.transaction_type === "deposit")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount_usd)), 0);

  const estimatedRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const estimatedPayouts = revenueData.reduce((sum, d) => sum + d.payouts, 0);

  const displayRevenue = totalRevenue > 0 ? totalRevenue : estimatedRevenue;
  const displayPayouts = totalPayouts > 0 ? totalPayouts : estimatedPayouts;
  const netRevenue = displayRevenue - displayPayouts;

  const typeDistribution = [
    { name: "Usage Charges", value: displayRevenue, color: "hsl(var(--primary))" },
    { name: "Provider Payouts", value: displayPayouts, color: "hsl(var(--accent))" },
    { name: "Deposits", value: totalDeposits, color: "hsl(var(--secondary))" },
  ].filter((d) => d.value > 0);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "usage_charge":
        return <Badge>Usage</Badge>;
      case "provider_earning":
        return <Badge variant="secondary">Payout</Badge>;
      case "deposit":
        return <Badge variant="outline">Deposit</Badge>;
      case "withdrawal":
        return <Badge variant="destructive">Withdrawal</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue & Analytics</h1>
        <p className="text-muted-foreground">Track platform revenue and financial metrics</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Provider Payouts</p>
                <p className="text-2xl font-bold">${totalPayouts.toFixed(2)}</p>
              </div>
              <div className="rounded-full bg-amber-500/10 p-3">
                <ArrowUpRight className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Revenue</p>
                <p className="text-2xl font-bold">${netRevenue.toFixed(2)}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deposits</p>
                <p className="text-2xl font-bold">${totalDeposits.toFixed(2)}</p>
              </div>
              <div className="rounded-full bg-blue-500/10 p-3">
                <ArrowDownRight className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Payouts (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(4)}`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    fill="#22c55e20"
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="payouts"
                    stroke="#f59e0b"
                    fill="#f59e0b20"
                    name="Payouts"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center gap-4">
              {typeDistribution.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 20).map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{getTypeBadge(tx.transaction_type)}</TableCell>
                    <TableCell
                      className={
                        tx.amount_usd < 0 ? "text-red-500" : "text-green-500"
                      }
                    >
                      {tx.amount_usd < 0 ? "-" : "+"}${Math.abs(Number(tx.amount_usd)).toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {tx.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {new Date(tx.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
