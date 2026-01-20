import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, Copy, Check } from "lucide-react";

interface BootDiag {
  t?: number;
  kind?: string;
  detail?: string;
}

const DebugBoot = () => {
  const [diag, setDiag] = useState<BootDiag | null>(null);
  const [storageFallback, setStorageFallback] = useState(false);
  const [storageTest, setStorageTest] = useState<string>("unknown");
  const [userAgent, setUserAgent] = useState("");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Read boot diagnostic from localStorage
    try {
      const raw = localStorage.getItem("__regraph_boot_diag");
      if (raw) {
        setDiag(JSON.parse(raw));
      }
    } catch {
      setDiag({ kind: "read_error", detail: "Could not read localStorage" });
    }

    // Check if storage fallback is active
    setStorageFallback(!!(window as any).__regraph_storage_fallback);

    // Test storage availability
    try {
      const testKey = "__regraph_storage_test_debug__";
      localStorage.setItem(testKey, "1");
      const val = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      setStorageTest(val === "1" ? "ok" : "mismatch");
    } catch (e) {
      setStorageTest("blocked: " + String(e));
    }

    setUserAgent(navigator.userAgent);
    setUrl(window.location.href);
  }, []);

  const handleHardReload = () => {
    const u = new URL(window.location.origin);
    u.searchParams.set("__reload", Date.now().toString());
    u.searchParams.set("__regraph_force", "1");
    window.location.href = u.toString();
  };

  const handleClearDiag = () => {
    try {
      localStorage.removeItem("__regraph_boot_diag");
      localStorage.removeItem("__regraph_last_load_ts");
      setDiag(null);
    } catch {
      // ignore
    }
  };

  const handleCopyReport = async () => {
    const report = {
      timestamp: new Date().toISOString(),
      diag,
      storageFallback,
      storageTest,
      userAgent,
      url,
      mounted: !!(window as any).__regraphMounted,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const text = JSON.stringify(report, null, 2);
      prompt("Copy this report:", text);
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold">🛠 Boot Diagnostics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Эта страница показывает информацию о последней попытке загрузки приложения.
          </p>
        </div>

        {/* Status cards */}
        <div className="grid gap-4">
          {/* App mount status */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground font-medium">App Mounted</div>
            <div className="mt-1 text-lg font-semibold">
              {(window as any).__regraphMounted ? (
                <span className="text-green-500">✓ Yes</span>
              ) : (
                <span className="text-red-500">✗ No</span>
              )}
            </div>
          </div>

          {/* Storage status */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground font-medium">Storage Status</div>
            <div className="mt-1 space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Fallback active:</span>{" "}
                <span className={storageFallback ? "text-yellow-500" : "text-green-500"}>
                  {storageFallback ? "Yes (in-memory)" : "No (native)"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Test result:</span>{" "}
                <span className={storageTest === "ok" ? "text-green-500" : "text-red-500"}>
                  {storageTest}
                </span>
              </div>
            </div>
          </div>

          {/* Last boot diagnostic */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground font-medium">Last Boot Diagnostic</div>
            {diag ? (
              <div className="mt-2 space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Time:</span> {formatTime(diag.t)}
                </div>
                <div>
                  <span className="text-muted-foreground">Kind:</span>{" "}
                  <span className={diag.kind?.includes("error") ? "text-red-500" : "text-yellow-500"}>
                    {diag.kind || "—"}
                  </span>
                </div>
                {diag.detail && (
                  <div className="mt-2">
                    <span className="text-muted-foreground">Detail:</span>
                    <pre className="mt-1 p-2 rounded-lg bg-muted/30 text-xs overflow-auto max-h-32 whitespace-pre-wrap break-all">
                      {diag.detail}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">Нет записей</div>
            )}
          </div>

          {/* User Agent */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground font-medium">User Agent</div>
            <pre className="mt-2 p-2 rounded-lg bg-muted/30 text-xs overflow-auto max-h-20 whitespace-pre-wrap break-all">
              {userAgent || "—"}
            </pre>
          </div>

          {/* Current URL */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground font-medium">Current URL</div>
            <pre className="mt-2 p-2 rounded-lg bg-muted/30 text-xs overflow-auto max-h-16 whitespace-pre-wrap break-all">
              {url || "—"}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleHardReload} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Перезапустить без кеша
          </Button>
          <Button variant="outline" onClick={handleClearDiag} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Очистить диагностику
          </Button>
          <Button variant="secondary" onClick={handleCopyReport} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Скопировано!" : "Скопировать отчёт"}
          </Button>
        </div>

        {/* Back link */}
        <div className="pt-4 border-t border-border">
          <a
            href="/"
            className="text-sm text-primary hover:underline"
          >
            ← Вернуться на главную
          </a>
        </div>
      </div>
    </div>
  );
};

export default DebugBoot;
