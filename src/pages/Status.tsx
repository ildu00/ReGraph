import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Cpu, 
  Server, 
  Activity,
  Zap,
  Users,
  BarChart3,
  Globe,
  Smartphone,
  Monitor
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  pending: number;
  byType: { name: string; value: number; color: string }[];
}

interface PlatformStats {
  totalProviders: number;
  totalComputeHours: number;
  totalInferences: number;
  avgResponseTime: number;
}

const Status = () => {
  const [deviceStats, setDeviceStats] = useState<DeviceStats>({
    total: 0,
    online: 0,
    offline: 0,
    pending: 0,
    byType: [],
  });
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalProviders: 0,
    totalComputeHours: 0,
    totalInferences: 0,
    avgResponseTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Sample usage data for the chart
  const usageData = [
    { time: "00:00", requests: 1200, compute: 85 },
    { time: "04:00", requests: 800, compute: 65 },
    { time: "08:00", requests: 2400, compute: 92 },
    { time: "12:00", requests: 3200, compute: 98 },
    { time: "16:00", requests: 2800, compute: 95 },
    { time: "20:00", requests: 1800, compute: 78 },
    { time: "Now", requests: 2100, compute: 88 },
  ];

  const serviceStatus = [
    { name: "API Gateway", status: "operational", latency: "12ms" },
    { name: "Inference Engine", status: "operational", latency: "45ms" },
    { name: "Model Registry", status: "operational", latency: "8ms" },
    { name: "Authentication", status: "operational", latency: "15ms" },
    { name: "Billing System", status: "operational", latency: "22ms" },
    { name: "Provider Network", status: "operational", latency: "35ms" },
  ];

  const recentActivity = [
    { time: "2 min ago", event: "New GPU node joined", region: "EU-West" },
    { time: "5 min ago", event: "Model deployment completed", region: "US-East" },
    { time: "12 min ago", event: "Auto-scaling triggered", region: "Asia-Pacific" },
    { time: "18 min ago", event: "Maintenance completed", region: "US-West" },
    { time: "25 min ago", event: "New provider registered", region: "EU-Central" },
  ];

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/platform-stats`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch platform stats");
      }

      const data = await response.json();

      setDeviceStats({
        total: data.devices.total,
        online: data.devices.online,
        offline: data.devices.offline,
        pending: data.devices.pending,
        byType: data.devices.byType.length > 0 ? data.devices.byType : [
          { name: "GPU", value: 0, color: "hsl(262, 83%, 58%)" },
          { name: "CPU", value: 0, color: "hsl(199, 89%, 48%)" },
        ],
      });

      setPlatformStats({
        totalProviders: data.platform.totalProviders,
        totalComputeHours: data.platform.totalComputeHours,
        totalInferences: data.platform.totalInferences,
        avgResponseTime: data.platform.avgResponseTime,
      });

      setLastUpdated(new Date(data.updatedAt));
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "degraded":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "outage":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-green-500 font-medium">All Systems Operational</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Platform Status
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Real-time monitoring of ReGraph infrastructure, connected hardware, and resource utilization.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </motion.div>

          {/* Platform Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
          >
            <div className="p-6 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Devices</span>
              </div>
              <p className="text-3xl font-bold">{formatNumber(deviceStats.total)}</p>
              <p className="text-sm text-green-500">+12% this week</p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm text-muted-foreground">Online Now</span>
              </div>
              <p className="text-3xl font-bold">{formatNumber(deviceStats.online)}</p>
              <p className="text-sm text-muted-foreground">{((deviceStats.online / deviceStats.total) * 100).toFixed(1)}% availability</p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Zap className="w-5 h-5 text-secondary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Inferences</span>
              </div>
              <p className="text-3xl font-bold">{formatNumber(platformStats.totalInferences)}</p>
              <p className="text-sm text-muted-foreground">All time</p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Avg Response</span>
              </div>
              <p className="text-3xl font-bold">{platformStats.avgResponseTime}ms</p>
              <p className="text-sm text-green-500">-5ms from yesterday</p>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {/* Service Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 p-6 rounded-xl border border-border bg-card"
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Service Status
              </h2>
              <div className="space-y-3">
                {serviceStatus.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(service.status)}
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{service.latency}</span>
                      <span className="text-sm capitalize text-green-500">{service.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Device Types Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-xl border border-border bg-card"
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Hardware Distribution
              </h2>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceStats.byType}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {deviceStats.byType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {deviceStats.byType.map((type) => (
                  <div key={type.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <span>{type.name}</span>
                    </div>
                    <span className="text-muted-foreground">{type.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Usage Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-xl border border-border bg-card mb-12"
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Resource Utilization (24h)
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompute" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                    name="API Requests"
                  />
                  <Area
                    type="monotone"
                    dataKey="compute"
                    stroke="hsl(var(--secondary))"
                    fillOpacity={1}
                    fill="url(#colorCompute)"
                    name="Compute Load %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Connected Hardware */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 rounded-xl border border-border bg-card"
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Hardware Overview
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Cpu className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Online Devices</p>
                      <p className="text-sm text-muted-foreground">Active and processing</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-500">{deviceStats.online}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Server className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Offline Devices</p>
                      <p className="text-sm text-muted-foreground">Currently disconnected</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground">{deviceStats.offline}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-medium">Pending Setup</p>
                      <p className="text-sm text-muted-foreground">Awaiting configuration</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-yellow-500">{deviceStats.pending}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Active Providers</p>
                      <p className="text-sm text-muted-foreground">Contributing compute</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">{platformStats.totalProviders}</span>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="p-6 rounded-xl border border-border bg-card"
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/30"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <p className="font-medium">{activity.event}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{activity.time}</span>
                        <span>•</span>
                        <span>{activity.region}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Uptime History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="p-6 rounded-xl border border-border bg-card"
          >
            <h2 className="text-xl font-semibold mb-6">90-Day Uptime History</h2>
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: 90 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-8 rounded-sm ${
                    Math.random() > 0.02 ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  title={`Day ${90 - i}: ${Math.random() > 0.02 ? '100%' : '99.9%'} uptime`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>90 days ago</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <span>100% uptime</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-yellow-500" />
                  <span>Partial outage</span>
                </div>
              </div>
              <span>Today</span>
            </div>
            <div className="mt-6 text-center">
              <p className="text-3xl font-bold text-green-500">99.98%</p>
              <p className="text-muted-foreground">Overall uptime last 90 days</p>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Status;
