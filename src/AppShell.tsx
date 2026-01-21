import { lazy, Suspense, useLayoutEffect, useState, Component, ReactNode } from "react";

declare global {
  interface Window {
    __regraphMounted?: boolean;
  }
}

const getBootEventUrl = () => {
  try {
    const base = (import.meta as any)?.env?.VITE_SUPABASE_URL;
    if (base && typeof base === "string") return `${base}/functions/v1/log-boot-event`;
  } catch {
    // ignore
  }
  return null;
};

// Error boundary to catch lazy load failures and show a reload UI
class AppCoreBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[AppCoreBoundary] Caught error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "hsl(240, 10%, 4%)",
          color: "#fff",
          padding: "24px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ margin: "0 0 8px", fontSize: "18px" }}>Не удалось загрузить приложение</h2>
          <p style={{ margin: "0 0 16px", opacity: 0.7, fontSize: "14px", maxWidth: "300px" }}>
            Возможно, проблема с сетью или кэшем браузера.
          </p>
          <button
            onClick={() => {
              const u = new URL(location.origin);
              u.searchParams.set("__regraph_force", "1");
              u.searchParams.set("__t", Date.now().toString());
              location.href = u.toString();
            }}
            style={{
              padding: "12px 24px",
              background: "hsl(270, 80%, 50%)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Перезагрузить
          </button>
          <p style={{ marginTop: "24px", opacity: 0.4, fontSize: "11px", maxWidth: "280px" }}>
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Ultra-minimal loading component to ensure Safari iOS can render SOMETHING
const MinimalLoader = () => (
  <div style={{
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "hsl(240, 10%, 4%)",
  }}>
    <div style={{
      width: "24px",
      height: "24px",
      border: "2px solid hsl(270, 80%, 60%, 0.2)",
      borderTop: "2px solid hsl(270, 80%, 60%)",
      borderRadius: "50%",
      animation: "spin 0.9s linear infinite",
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Minimal shell that loads the real App dynamically to avoid large synchronous imports
// This ensures Safari iOS can at least mount React before trying to load heavy chunks
const RealApp = lazy(() => {
  console.log('[AppShell] Starting dynamic import of AppCore');
  return import("./AppCore")
    .then(mod => {
      console.log('[AppShell] AppCore loaded successfully');
      return mod;
    })
    .catch(err => {
      console.error('[AppShell] Failed to load AppCore:', err);
      // Log detailed error info
      const errInfo = {
        message: err?.message || String(err),
        name: err?.name,
        stack: err?.stack?.slice(0, 500),
      };
      console.error('[AppShell] Error details:', JSON.stringify(errInfo));
      
      // Try to send to backend for debugging
      try {
        const url = getBootEventUrl();
        if (url) {
          const payload = JSON.stringify({
            reason: "appcore_load_failed",
            url: location.href,
            userAgent: navigator.userAgent,
            diag: errInfo,
          });
          if (navigator.sendBeacon) {
            try {
              navigator.sendBeacon(url, payload);
            } catch {
              // ignore
            }
          }
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {}
      
      throw err;
    });
});

const AppShell = () => {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    // Mark mounted for boot watchdog + remove boot spinner
    window.__regraphMounted = true;
    console.log('[AppShell] Mounted, removing spinner');
    document.getElementById("boot-spinner")?.remove();
    
    // Trigger dynamic import after first paint
    requestAnimationFrame(() => {
      console.log('[AppShell] Triggering AppCore load');
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    return <MinimalLoader />;
  }

  return (
    <AppCoreBoundary>
      <Suspense fallback={<MinimalLoader />}>
        <RealApp />
      </Suspense>
    </AppCoreBoundary>
  );
};

export default AppShell;