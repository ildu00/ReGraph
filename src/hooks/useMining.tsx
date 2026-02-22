import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { toast } from "sonner";

export type MiningStatus = "idle" | "connecting" | "mining" | "error";

export interface TaskLog {
  id: string;
  type: string;
  status: "completed" | "failed";
  durationMs: number;
  timestamp: Date;
}

export interface MiningStats {
  completed: number;
  failed: number;
  totalMs: number;
  earnings: number;
}

interface MiningContextValue {
  connectionKey: string;
  setConnectionKey: (key: string) => void;
  status: MiningStatus;
  deviceId: string | null;
  taskLogs: TaskLog[];
  currentTask: string | null;
  stats: MiningStats;
  startMining: () => Promise<void>;
  stopMining: () => void;
}

const MiningContext = createContext<MiningContextValue | null>(null);

const POLL_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 30000;
const EARNING_PER_TASK = 0.00012;

export const MiningProvider = ({ children }: { children: ReactNode }) => {
  const [connectionKey, setConnectionKeyState] = useState(() =>
    localStorage.getItem("rg_mining_key") || ""
  );
  const [status, setStatus] = useState<MiningStatus>("idle");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [stats, setStats] = useState<MiningStats>({ completed: 0, failed: 0, totalMs: 0, earnings: 0 });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTaskRef = useRef<string | null>(null);
  const connectionKeyRef = useRef(connectionKey);
  const deviceIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => { connectionKeyRef.current = connectionKey; }, [connectionKey]);
  useEffect(() => { currentTaskRef.current = currentTask; }, [currentTask]);
  useEffect(() => { deviceIdRef.current = deviceId; }, [deviceId]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const setConnectionKey = useCallback((key: string) => {
    setConnectionKeyState(key);
    connectionKeyRef.current = key;
  }, []);

  const apiCall = useCallback(async (path: string, options?: RequestInit) => {
    return fetch(`${supabaseUrl}/functions/v1/provider/${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "x-api-key": connectionKeyRef.current,
        ...(options?.headers || {}),
      },
    });
  }, [supabaseUrl, anonKey]);

  const stopMining = useCallback(async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    pollRef.current = null;
    heartbeatRef.current = null;

    // Notify server that device is going offline
    const devId = deviceIdRef.current;
    if (devId) {
      try {
        await apiCall(`devices/${devId}/heartbeat`, {
          method: "POST",
          body: JSON.stringify({ status: "offline", metrics: {} }),
        });
      } catch { /* silent */ }
    }

    setStatus("idle");
    setCurrentTask(null);
    setDeviceId(null);
  }, [apiCall]);

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
    } catch { /* silent */ }
  }, [apiCall]);

  const processTask = useCallback(async (devId: string, task: any) => {
    setCurrentTask(task.id);
    const start = Date.now();

    try {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));

      const payload = task.payload || {};
      const simulatedResponse = `[Browser agent] Processed task ${task.id} for model ${payload.model || "unknown"}`;

      const resultRes = await apiCall(`devices/${devId}/tasks/${task.id}/result`, {
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
      let serverTotal: number | null = null;
      try {
        const resultData = await resultRes.json();
        if (resultData.total_earnings != null) serverTotal = Number(resultData.total_earnings);
      } catch { /* ignore */ }

      setTaskLogs((prev) => [
        { id: task.id, type: task.type, status: "completed", durationMs: duration, timestamp: new Date() },
        ...prev.slice(0, 49),
      ]);
      setStats((s) => ({
        ...s,
        completed: s.completed + 1,
        totalMs: s.totalMs + duration,
        earnings: serverTotal != null ? serverTotal : s.earnings + EARNING_PER_TASK,
      }));
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
    if (currentTaskRef.current) return;
    try {
      const res = await apiCall(`devices/${devId}/task`, { method: "GET" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.task) {
        await processTask(devId, data.task);
      }
    } catch { /* silent */ }
  }, [apiCall, processTask]);

  const startMining = useCallback(async () => {
    if (!connectionKeyRef.current.trim()) {
      toast.error("Please enter a connection key");
      return;
    }

    setStatus("connecting");
    localStorage.setItem("rg_mining_key", connectionKeyRef.current);

    try {
      const res = await apiCall("register", {
        method: "POST",
        body: JSON.stringify({
          connection_key: connectionKeyRef.current,
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

      if (data.total_earnings) {
        setStats((s) => ({ ...s, earnings: Number(data.total_earnings) }));
      }

      toast.success("Connected! Mining started.");

      heartbeatRef.current = setInterval(() => sendHeartbeat(devId), HEARTBEAT_INTERVAL);
      sendHeartbeat(devId);

      pollRef.current = setInterval(() => pollForTask(devId), POLL_INTERVAL);
    } catch (e) {
      setStatus("error");
      toast.error(e instanceof Error ? e.message : "Connection failed");
    }
  }, [apiCall, sendHeartbeat, pollForTask]);

  // Cleanup on unmount (when user leaves dashboard entirely)
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  return (
    <MiningContext.Provider value={{
      connectionKey,
      setConnectionKey,
      status,
      deviceId,
      taskLogs,
      currentTask,
      stats,
      startMining,
      stopMining,
    }}>
      {children}
    </MiningContext.Provider>
  );
};

export const useMining = () => {
  const ctx = useContext(MiningContext);
  if (!ctx) throw new Error("useMining must be used within MiningProvider");
  return ctx;
};

export { EARNING_PER_TASK, POLL_INTERVAL };
