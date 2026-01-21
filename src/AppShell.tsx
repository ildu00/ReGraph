import { lazy, Suspense, useLayoutEffect, useState } from "react";

// Minimal shell that loads the real App dynamically to avoid large synchronous imports
const RealApp = lazy(() => import("./AppCore"));

declare global {
  interface Window {
    __regraphMounted?: boolean;
  }
}

const AppShell = () => {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    // Mark mounted for boot watchdog + remove boot spinner
    window.__regraphMounted = true;
    document.getElementById("boot-spinner")?.remove();
    
    // Trigger dynamic import after first paint
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[hsl(240,10%,4%)] flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(270,80%,60%)]/20 border-t-[hsl(270,80%,60%)]" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[hsl(240,10%,4%)] flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(270,80%,60%)]/20 border-t-[hsl(270,80%,60%)]" />
        </div>
      }
    >
      <RealApp />
    </Suspense>
  );
};

export default AppShell;