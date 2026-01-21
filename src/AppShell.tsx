import { lazy, Suspense, useLayoutEffect, useState } from "react";

declare global {
  interface Window {
    __regraphMounted?: boolean;
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
  return import("./AppCore").catch(err => {
    console.error('[AppShell] Failed to load AppCore:', err);
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
    <Suspense fallback={<MinimalLoader />}>
      <RealApp />
    </Suspense>
  );
};

export default AppShell;