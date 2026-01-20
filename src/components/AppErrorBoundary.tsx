import React from "react";
import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage?: string;
};

const isRecoverableModuleError = (message: string) => {
  const m = (message || "").toLowerCase();
  return (
    m.includes("loading chunk") ||
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("importing a module script failed") ||
    m.includes("preload")
  );
};

const getBootLogUrl = () => {
  const base = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/functions/v1/log-boot-event`;
};

const hasReloadMarker = () => {
  try {
    return new URL(window.location.href).searchParams.has("__regraph_reload");
  } catch {
    return false;
  }
};

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    // Keep logging minimal but useful for debugging blank screens
    // eslint-disable-next-line no-console
    console.error("App crashed:", error);

    // Persist last crash reason for /debug/boot
    try {
      localStorage.setItem(
        "__regraph_boot_diag",
        JSON.stringify({
          t: Date.now(),
          kind: "app_error_boundary",
          detail: message,
          path: window.location.pathname,
        })
      );
    } catch {
      // ignore
    }

    // Best-effort: log to backend (admins can see it in Boot Events)
    try {
      const url = getBootLogUrl();
      if (url) {
        const payload = {
          reason: isRecoverableModuleError(message)
            ? "route_module_load_failed"
            : "app_runtime_error",
          url: window.location.href,
          userAgent: navigator.userAgent,
          diag: {
            stage: "AppErrorBoundary",
            message,
            path: window.location.pathname,
          },
          storageFallback: !!(window as any).__regraph_storage_fallback,
          attempts: 0,
        };

        // keepalive so it survives navigation
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // ignore
    }

    // CRITICAL: If a route chunk fails to import (common on mobile + cache), auto-reload once.
    // This error is thrown inside React.lazy, so window.onerror/unhandledrejection may NOT fire.
    if (isRecoverableModuleError(message) && !hasReloadMarker()) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("__regraph_reload", "1");
        url.searchParams.set("__reload", Date.now().toString());
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("__reload", Date.now().toString());
    url.searchParams.set("__regraph_reload", "1");
    window.location.replace(url.toString());
  };

  private handleRestartWithoutCache = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("__reload", Date.now().toString());
    url.searchParams.set("__regraph_force", "1");
    url.searchParams.delete("__regraph_reload");
    window.location.replace(url.toString());
  };

  render() {
    if (this.state.hasError) {
      const showHardReload = isRecoverableModuleError(this.state.errorMessage || "");

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6">
            <h1 className="text-xl font-semibold">App failed to load</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Something went wrong. Click "Reload" to try again.
            </p>
            {this.state.errorMessage ? (
              <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                {this.state.errorMessage}
              </pre>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={this.handleReload}>Reload</Button>
              {showHardReload ? (
                <Button variant="outline" onClick={this.handleRestartWithoutCache}>
                  Restart without cache
                </Button>
              ) : null}
              <Button asChild variant="secondary">
                <a href="/debug/boot">Open boot diagnostics</a>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

