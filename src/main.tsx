declare global {
  interface Window {
    __regraphMainLoaded?: boolean;
  }
}

// Remove the boot spinner ASAP (even before React loads) so users see the instant HTML fallback.
document.getElementById("boot-spinner")?.remove();
window.__regraphMainLoaded = true;

// BFCache restore on mobile Safari can resume a "half-dead" JS state.
// Just refresh the page once (no loops).
window.addEventListener("pageshow", (e) => {
  if ((e as PageTransitionEvent).persisted) {
    window.location.reload();
  }
});

// Load React + the app lazily to reduce upfront parsing cost on mobile.
Promise.all([import("react-dom/client"), import("./App")])
  .then(([reactDom, app]) => {
    const rootEl = document.getElementById("root");
    if (!rootEl) return;

    reactDom.createRoot(rootEl).render(<app.default />);
  })
  .catch((err) => {
    // Let the index.html watchdog capture the error via window.onerror/unhandledrejection
    console.error("[boot] failed to start", err);
  });

