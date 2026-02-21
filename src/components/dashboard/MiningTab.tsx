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
import { useMining, EARNING_PER_TASK, POLL_INTERVAL } from "@/hooks/useMining";

const MiningTab = () => {
  const {
    connectionKey,
    setConnectionKey,
    status,
    deviceId,
    taskLogs,
    currentTask,
    stats,
    startMining,
    stopMining,
  } = useMining();

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
