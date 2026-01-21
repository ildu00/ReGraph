declare global {
  interface Window {
    __regraphMainLoaded?: boolean;
    __regraphBootStage?: string;
  }
}

// Mark that main.tsx has started (for boot watchdog diagnostics).
window.__regraphMainLoaded = true;
window.__regraphBootStage = "main_started";

const setBootDiag = (kind: string, detail?: string) => {
  try {
    localStorage.setItem(
      "__regraph_boot_diag",
      JSON.stringify({
        t: Date.now(),
        kind,
        detail,
        path: window.location.pathname,
        stage: window.__regraphBootStage,
      })
    );
  } catch {
    // ignore
  }
};

const hasReloadMarker = () => {
  try {
    return new URL(window.location.href).searchParams.has("__regraph_reload");
  } catch {
    return false;
  }
};

const reloadOnce = (force = false) => {
  try {
    const u = new URL(window.location.href);
    u.searchParams.set("__regraph_reload", "1");
    u.searchParams.set("__reload", Date.now().toString());
    if (force) u.searchParams.set("__regraph_force", "1");
    window.location.replace(u.toString());
  } catch {
    window.location.reload();
  }
};

// BFCache restore on mobile Safari can resume a "half-dead" JS state.
// Just refresh the page once (no loops).
window.addEventListener("pageshow", (e) => {
  if ((e as PageTransitionEvent).persisted) {
    window.location.reload();
  }
});

// Helper to log detailed import diagnostics
const logImportAttempt = (name: string, stage: string, error?: unknown) => {
  try {
    const payload = {
      name,
      stage,
      error: error instanceof Error ? error.message : error ? String(error) : undefined,
      timestamp: Date.now(),
    };
    console.log(`[boot] import ${name}: ${stage}`, error || "");
    
    // Also store for boot event
    const existing = localStorage.getItem("__regraph_import_log") || "[]";
    const logs = JSON.parse(existing);
    logs.push(payload);
    localStorage.setItem("__regraph_import_log", JSON.stringify(logs.slice(-10)));
  } catch {
    // ignore
  }
};

// Load React + the app with detailed diagnostics for Safari debugging.
// The boot spinner stays visible until React mounts and App.tsx removes it.
async function bootApp() {
  try {
    // Step 1: Import react-dom/client
    logImportAttempt("react-dom/client", "start");
    window.__regraphBootStage = "import_react";
    const reactDom = await import("react-dom/client");
    logImportAttempt("react-dom/client", "success");

    // Step 2: Import App
    logImportAttempt("./App", "start");
    window.__regraphBootStage = "import_app";
    const app = await import("./App");
    logImportAttempt("./App", "success");

    // Step 3: Render
    window.__regraphBootStage = "render_start";
    const rootEl = document.getElementById("root");
    if (!rootEl) {
      logImportAttempt("render", "no_root");
      return;
    }

    reactDom.createRoot(rootEl).render(<app.default />);
    window.__regraphBootStage = "render_called";
    logImportAttempt("render", "success");
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const message = error.message;
    
    logImportAttempt(window.__regraphBootStage || "unknown", "error", error);
    console.error("[boot] failed to start at stage:", window.__regraphBootStage, error);

    setBootDiag("main_boot_error", `${window.__regraphBootStage}: ${message}`);

    // If startup failed due to a transient chunk/cache issue, do a single controlled reload.
    if (!hasReloadMarker()) {
      reloadOnce(true);
      return;
    }

    // Bubble the error to the watchdog without causing an infinite loop.
    setTimeout(() => {
      throw error;
    }, 0);
  }
}

bootApp();

