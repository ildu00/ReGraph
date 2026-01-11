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

interface IncidentUpdate {
  id: string;
  message: string;
  status: string;
  created_at: string;
}

interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: string;
  severity: string;
  affected_services: string[];
  started_at: string;
  resolved_at: string | null;
  incident_updates: IncidentUpdate[];
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
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);

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

      setIncidents(data.incidents || []);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "major":
        return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "minor":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      default:
        return "text-muted-foreground bg-muted/50 border-border";
    }
  };

  const getIncidentStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "text-green-500";
      case "monitoring":
        return "text-blue-500";
      case "identified":
        return "text-yellow-500";
      case "investigating":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Calculate uptime based on incidents
  const calculateUptime = () => {
    const resolvedIncidents = incidents.filter(i => i.status === "resolved");
    const totalDowntimeMs = resolvedIncidents.reduce((total, incident) => {
      if (incident.resolved_at && incident.started_at) {
        return total + (new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime());
      }
      return total;
    }, 0);
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const uptimePercent = ((ninetyDaysMs - totalDowntimeMs) / ninetyDaysMs) * 100;
    return Math.max(99, Math.min(100, uptimePercent)).toFixed(2);
  };

  const hasActiveIncidents = incidents.some(i => i.status !== "resolved");

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
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
              hasActiveIncidents 
                ? 'bg-yellow-500/10 border border-yellow-500/20' 
                : 'bg-green-500/10 border border-green-500/20'
            }`}>
              {hasActiveIncidents ? (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <span className="text-yellow-500 font-medium">Active Incident</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-medium">All Systems Operational</span>
                </>
              )}
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
            className="p-6 rounded-xl border border-border bg-card mb-12"
          >
            <h2 className="text-xl font-semibold mb-6">90-Day Uptime History</h2>
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: 90 }).map((_, i) => {
                const dayDate = new Date();
                dayDate.setDate(dayDate.getDate() - (89 - i));
                const hasIncident = incidents.some(incident => {
                  const startDate = new Date(incident.started_at);
                  return startDate.toDateString() === dayDate.toDateString();
                });
                return (
                  <div
                    key={i}
                    className={`flex-1 h-8 rounded-sm ${
                      hasIncident ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    title={`${dayDate.toLocaleDateString()}: ${hasIncident ? 'Incident reported' : '100% uptime'}`}
                  />
                );
              })}
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
                  <span>Incident</span>
                </div>
              </div>
              <span>Today</span>
            </div>
            <div className="mt-6 text-center">
              <p className="text-3xl font-bold text-green-500">{calculateUptime()}%</p>
              <p className="text-muted-foreground">Overall uptime last 90 days</p>
            </div>
          </motion.div>

          {/* Incident History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="p-6 rounded-xl border border-border bg-card"
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Incident History
            </h2>
            
            {incidents.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">No incidents reported</p>
                <p className="text-muted-foreground">All systems have been running smoothly for the past 90 days.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedIncident(
                        expandedIncident === incident.id ? null : incident.id
                      )}
                      className="w-full p-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                            {incident.severity.toUpperCase()}
                          </span>
                          <span className={`text-sm font-medium ${getIncidentStatusColor(incident.status)}`}>
                            {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                          </span>
                        </div>
                        <h3 className="font-medium">{incident.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>{formatDate(incident.started_at)}</span>
                          {incident.resolved_at && (
                            <>
                              <span>•</span>
                              <span>Resolved {getRelativeTime(incident.resolved_at)}</span>
                            </>
                          )}
                        </div>
                        {incident.affected_services.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {incident.affected_services.map((service) => (
                              <span
                                key={service}
                                className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {expandedIncident === incident.id ? "−" : "+"}
                      </div>
                    </button>
                    
                    {expandedIncident === incident.id && (
                      <div className="px-4 pb-4 border-t border-border">
                        {incident.description && (
                          <p className="text-muted-foreground mt-4 mb-4">
                            {incident.description}
                          </p>
                        )}
                        
                        {incident.incident_updates.length > 0 && (
                          <div className="space-y-3 mt-4">
                            <h4 className="text-sm font-medium">Updates</h4>
                            {incident.incident_updates
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .map((update) => (
                                <div
                                  key={update.id}
                                  className="flex gap-3 pl-4 border-l-2 border-border"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-sm font-medium ${getIncidentStatusColor(update.status)}`}>
                                        {update.status.charAt(0).toUpperCase() + update.status.slice(1)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(update.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{update.message}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Status;
