import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Cpu,
  Play,
  Square,
  Key,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Zap,
  Wifi,
  WifiOff,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

type MiningStatus = "idle" | "connecting" | "mining" | "error";

interface TaskLog {
  id: string;
  type: string;
  status: "completed" | "failed";
  durationMs: number;
  timestamp: Date;
}

const POLL_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 30000;
const EARNING_PER_TASK = 0.0012; // ~$0.10/hr at 5s poll

const MiningTab = () => {
  const [connectionKey, setConnectionKey] = useState(() =>
    localStorage.getItem("rg_mining_key") || ""
  );
  const [status, setStatus] = useState<MiningStatus>("idle");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [stats, setStats] = useState({ completed: 0, failed: 0, totalMs: 0, earnings: 0 });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const apiCall = useCallback(async (path: string, options?: RequestInit) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/provider/${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "x-api-key": connectionKey,
        ...(options?.headers || {}),
      },
    });
    return res;
  }, [connectionKey, supabaseUrl, anonKey]);

  const stopMining = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    pollRef.current = null;
    heartbeatRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setCurrentTask(null);
    setDeviceId(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => stopMining, [stopMining]);

  const sendHeartbeat = useCallback(async (devId: string) => {
    try {
      await apiCall(`devices/${devId}/heartbeat`, {
        method: "POST",
        body: JSON.stringify({
          status: "online",
          metrics: {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            cores: navigator.hardwareConcurrency || 1,
            memory: (navigator as any).deviceMemory || null,
          },
        }),
      });
    } catch {
      // silent
    }
  }, [apiCall]);

  const processTask = useCallback(async (devId: string, task: any) => {
    setCurrentTask(task.id);
    const start = Date.now();

    try {
      // Simulate processing — in a real scenario this would run local inference
      // For now we just pass through with a small delay to simulate work
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));

      const payload = task.payload || {};
      const simulatedResponse = `[Browser agent] Processed task ${task.id} for model ${payload.model || "unknown"}`;

      await apiCall(`devices/${devId}/tasks/${task.id}/result`, {
        method: "POST",
        body: JSON.stringify({
          response: simulatedResponse,
          usage: {
            prompt_tokens: payload.messages?.reduce((s: number, m: any) => s + (m.content?.length || 0), 0) || 0,
            completion_tokens: simulatedResponse.length,
            total_tokens: simulatedResponse.length,
          },
        }),
      });

      const duration = Date.now() - start;
      setTaskLogs((prev) => [
        { id: task.id, type: task.type, status: "completed", durationMs: duration, timestamp: new Date() },
        ...prev.slice(0, 49),
      ]);
      setStats((s) => ({ ...s, completed: s.completed + 1, totalMs: s.totalMs + duration, earnings: s.earnings + EARNING_PER_TASK }));
    } catch (e) {
      const duration = Date.now() - start;
      try {
        await apiCall(`devices/${devId}/tasks/${task.id}/failure`, {
          method: "POST",
          body: JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
        });
      } catch { /* silent */ }
      setTaskLogs((prev) => [
        { id: task.id, type: task.type, status: "failed", durationMs: duration, timestamp: new Date() },
        ...prev.slice(0, 49),
      ]);
      setStats((s) => ({ ...s, failed: s.failed + 1 }));
    }
    setCurrentTask(null);
  }, [apiCall]);

  const pollForTask = useCallback(async (devId: string) => {
    if (currentTask) return; // already processing

    try {
      const res = await apiCall(`devices/${devId}/task`, { method: "GET" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.task) {
        await processTask(devId, data.task);
      }
    } catch {
      // silent
    }
  }, [apiCall, processTask, currentTask]);

  const startMining = async () => {
    if (!connectionKey.trim()) {
      toast.error("Please enter a connection key");
      return;
    }

    setStatus("connecting");
    localStorage.setItem("rg_mining_key", connectionKey);

    try {
      // Register device
      const res = await apiCall("register", {
        method: "POST",
        body: JSON.stringify({
          connection_key: connectionKey,
          hardware: {
            hostname: `browser-${navigator.platform}`,
            os: navigator.platform,
            arch: "wasm",
            cpu_cores: navigator.hardwareConcurrency || 1,
            ram_total_mb: ((navigator as any).deviceMemory || 4) * 1024,
            gpu_mode: "none",
          },
          agent_version: "browser-1.0.0",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to register");
      }

      const data = await res.json();
      const devId = data.device_id;
      setDeviceId(devId);
      setStatus("mining");
      toast.success("Connected! Mining started.");

      // Start heartbeat
      heartbeatRef.current = setInterval(() => sendHeartbeat(devId), HEARTBEAT_INTERVAL);
      sendHeartbeat(devId);

      // Start polling
      pollRef.current = setInterval(() => pollForTask(devId), POLL_INTERVAL);
    } catch (e) {
      setStatus("error");
      toast.error(e instanceof Error ? e.message : "Connection failed");
    }
  };

  const isMining = status === "mining";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Mining</h1>
        <p className="text-muted-foreground">
          Turn this device into a compute node. Paste your connection key to start processing tasks.
        </p>
      </div>

      {/* Connection Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isMining ? "bg-green-500/20" : "bg-secondary"
          }`}>
            {isMining ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">
              {status === "idle" && "Not Connected"}
              {status === "connecting" && "Connecting..."}
              {status === "mining" && "Mining Active"}
              {status === "error" && "Connection Failed"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isMining ? `Device ID: ${deviceId?.slice(0, 8)}...` : "Enter your connection key to begin"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="connectionKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Connection Key
            </Label>
            <Input
              id="connectionKey"
              type="password"
              placeholder="rgc_..."
              value={connectionKey}
              onChange={(e) => setConnectionKey(e.target.value)}
              disabled={isMining}
              className="bg-secondary border-border font-mono"
              onKeyDown={(e) => e.key === "Enter" && !isMining && startMining()}
            />
            <p className="text-xs text-muted-foreground">
              Find your connection key in the Provider tab after adding a device.
            </p>
          </div>

          <div className="flex gap-3">
            {!isMining ? (
              <Button
                onClick={startMining}
                disabled={status === "connecting" || !connectionKey.trim()}
                className="glow-primary flex-1"
              >
                {status === "connecting" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Start Mining
              </Button>
            ) : (
              <Button
                onClick={stopMining}
                variant="destructive"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Mining
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <p className="text-3xl font-bold">{stats.completed}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed</p>
          </div>
          <p className="text-3xl font-bold">{stats.failed}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Avg Time</p>
          </div>
          <p className="text-3xl font-bold">
            {stats.completed > 0
              ? `${(stats.totalMs / stats.completed / 1000).toFixed(1)}s`
              : "—"}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <p className="text-sm text-muted-foreground">Earnings</p>
          </div>
          <p className="text-3xl font-bold text-green-500">
            ${stats.earnings.toFixed(4)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ~${(EARNING_PER_TASK * 1000).toFixed(2)} per 1k tasks
          </p>
        </motion.div>
      </div>

      {/* Live indicator */}
      {isMining && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-3">
            {currentTask ? (
              <>
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <div>
                  <p className="font-medium">Processing task...</p>
                  <p className="text-sm text-muted-foreground font-mono">{currentTask.slice(0, 8)}...</p>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <Zap className="h-5 w-5 text-green-500" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <p className="font-medium">Waiting for tasks...</p>
                  <p className="text-sm text-muted-foreground">Polling every {POLL_INTERVAL / 1000}s</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Task log */}
      {taskLogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Task History</h3>
            <span className="text-sm text-muted-foreground ml-auto">
              {taskLogs.length} tasks
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {taskLogs.map((log) => (
              <div
                key={log.id + log.timestamp.getTime()}
                className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg text-sm"
              >
                {log.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span className="font-mono text-xs text-muted-foreground truncate flex-1">
                  {log.id.slice(0, 8)}...
                </span>
                <span className="text-xs text-muted-foreground">{log.type}</span>
                <span className="text-xs font-medium">
                  {(log.durationMs / 1000).toFixed(1)}s
                </span>
                <span className="text-xs text-muted-foreground">
                  {log.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      {status === "idle" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">How It Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium text-sm">1. Paste Key</p>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your device connection key from the Provider tab
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium text-sm">2. Process Tasks</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your device polls for inference tasks and executes them
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium text-sm">3. Earn Rewards</p>
              <p className="text-xs text-muted-foreground mt-1">
                Get paid for every task completed on your device
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiningTab;
