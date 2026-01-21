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

// Load React + the app lazily to reduce upfront parsing cost on mobile.
// The boot spinner stays visible until React mounts and App.tsx removes it.
Promise.all([import("react-dom/client"), import("./App")])
  .then(([reactDom, app]) => {
    window.__regraphBootStage = "render_start";
    const rootEl = document.getElementById("root");
    if (!rootEl) return;

    reactDom.createRoot(rootEl).render(<app.default />);
    window.__regraphBootStage = "render_called";
  })
  .catch((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    const message = error.message;
    console.error("[boot] failed to start", error);

    setBootDiag("main_boot_error", message);

    // If startup failed due to a transient chunk/cache issue, do a single controlled reload.
    // (Catching the error would otherwise prevent the watchdog from seeing it and leave the spinner forever.)
    if (!hasReloadMarker()) {
      reloadOnce(true);
      return;
    }

    // Bubble the error to the watchdog (and window.onerror) without causing an infinite loop.
    setTimeout(() => {
      throw error;
    }, 0);
  });

