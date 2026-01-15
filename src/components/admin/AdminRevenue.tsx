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
  const [revenueData, setRevenueData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from("wallet_transactions")
          .select("id, user_id, amount_usd, transaction_type, status, created_at")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setTransactions(data || []);

        // Process for chart
        const grouped = (data || []).reduce((acc: any, tx) => {
          const date = new Date(tx.created_at).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = { date, revenue: 0, payouts: 0 };
          }
          const amount = Math.abs(Number(tx.amount_usd));
          if (tx.transaction_type === "usage_charge") {
            acc[date].revenue += amount;
          } else if (tx.transaction_type === "provider_earning") {
            acc[date].payouts += amount;
          }
          return acc;
        }, {});

        setRevenueData(Object.values(grouped).slice(-14));
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats
  const totalRevenue = transactions
    .filter((t) => t.transaction_type === "usage_charge")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount_usd)), 0);

  const totalPayouts = transactions
    .filter((t) => t.transaction_type === "provider_earning")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount_usd)), 0);

  const totalDeposits = transactions
    .filter((t) => t.transaction_type === "deposit" || t.transaction_type === "crypto_deposit")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount_usd)), 0);

  const netRevenue = totalRevenue - totalPayouts;

  const typeDistribution = [
    { name: "Usage Charges", value: totalRevenue, color: "#22c55e" },
    { name: "Provider Payouts", value: totalPayouts, color: "#f59e0b" },
    { name: "Deposits", value: totalDeposits, color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "usage_charge":
        return <Badge className="bg-green-500/10 text-green-500">Usage</Badge>;
      case "provider_earning":
        return <Badge className="bg-amber-500/10 text-amber-500">Payout</Badge>;
      case "deposit":
      case "crypto_deposit":
        return <Badge className="bg-blue-500/10 text-blue-500">Deposit</Badge>;
      case "withdrawal":
        return <Badge className="bg-red-500/10 text-red-500">Withdrawal</Badge>;
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
