import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Server, DollarSign, Activity, TrendingUp, FileText } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface Stats {
  totalUsers: number;
  totalDevices: number;
  totalRevenue: number;
  totalRequests: number;
  activeDevices: number;
  pendingRequests: number;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDevices: 0,
    totalRevenue: 0,
    totalRequests: 0,
    activeDevices: 0,
    pendingRequests: 0,
  });
  const [usageData, setUsageData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        // Parallel fetches
        const [usersRes, devicesRes, txRes, requestsRes, usageRes] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("provider_devices").select("status"),
          supabase.from("wallet_transactions").select("amount_usd, transaction_type").eq("transaction_type", "usage_charge"),
          supabase.from("support_requests").select("status"),
          supabase.from("usage_logs").select("created_at, tokens_used, cost_usd").gte("created_at", fourteenDaysAgo.toISOString()).order("created_at", { ascending: true }),
        ]);

        const usersCount = usersRes.count || 0;
        const devices = devicesRes.data || [];
        const transactions = txRes.data || [];
        const requests = requestsRes.data || [];
        const usageLogs = usageRes.data || [];

        // Revenue from wallet_transactions OR fallback to usage_logs.cost_usd
        let totalRevenue = transactions.reduce((sum, t) => sum + Math.abs(Number(t.amount_usd)), 0);
        if (totalRevenue === 0 && usageLogs.length > 0) {
          totalRevenue = usageLogs.reduce((sum, l) => sum + Math.abs(Number(l.cost_usd) || 0), 0);
        }

        const activeDevices = devices.filter((d) => d.status === "online").length;
        const pendingRequests = requests.filter((r) => r.status === "pending").length;

        setStats({
          totalUsers: usersCount,
          totalDevices: devices.length,
          totalRevenue,
          totalRequests: requests.length,
          activeDevices,
          pendingRequests,
        });

        // Process usage data for charts
        const grouped = usageLogs.reduce((acc: Record<string, { date: string; calls: number; revenue: number }>, log) => {
          const date = new Date(log.created_at).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = { date, calls: 0, revenue: 0 };
          }
          acc[date].calls++;
          acc[date].revenue += Math.abs(Number(log.cost_usd) || 0);
          return acc;
        }, {});

        const chartData = Object.values(grouped).slice(-14);
        setUsageData(chartData);
        setRevenueData(chartData);
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { label: "Total Devices", value: stats.totalDevices, icon: Server, color: "text-green-500" },
    { label: "Active Devices", value: stats.activeDevices, icon: Activity, color: "text-emerald-500" },
    { label: "Total Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-amber-500" },
    { label: "Support Requests", value: stats.totalRequests, icon: FileText, color: "text-purple-500" },
    { label: "Pending Requests", value: stats.pendingRequests, icon: TrendingUp, color: "text-red-500" },
  ];

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
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">Monitor platform performance and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>API Usage (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} width={40} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} width={40} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                    formatter={(value: number) => [`$${value.toFixed(4)}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
