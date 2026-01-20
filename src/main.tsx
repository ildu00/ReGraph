import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure highlight.js has a working theme loaded (colors for .hljs-* tokens)
import "highlight.js/styles/github-dark.css";

declare global {
  interface Window {
    __regraphBoot?: {
      markMounted: () => void;
      showError: (title: string, detail?: string) => void;
    };
  }
}

const isRecoverableChunkError = (message: string) => {
  const m = message.toLowerCase();
  return (
    m.includes("loading chunk") ||
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("importing a module script failed") ||
    m.includes("preload")
  );
};

const hasReloadMarker = () => {
  try {
    return new URL(window.location.href).searchParams.has("__regraph_reload");
  } catch {
    return false;
  }
};

const markReloadedUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set("__regraph_reload", "1");
  url.searchParams.set("__reload", Date.now().toString());
  return url.toString();
};

const reloadOnce = () => {
  // Storage can be blocked on some mobile browsers; use a URL marker instead.
  if (hasReloadMarker()) return;
  try {
    window.location.replace(markReloadedUrl());
  } catch {
    window.location.reload();
  }
};

// If the user returns after a long idle period, the browser may serve stale cached assets
// (common cause of "black screen" until manual refresh). Force a single cache-busting reload.
try {
  const LAST_TS_KEY = "__regraph_last_load_ts";
  const now = Date.now();
  const prev = Number(localStorage.getItem(LAST_TS_KEY) || "0");
  localStorage.setItem(LAST_TS_KEY, String(now));

  // 30 minutes
  if (prev && now - prev > 30 * 60 * 1000) {
    reloadOnce();
  }
} catch {
  // ignore
}

// BFCache restore on mobile Safari can resume a "half-dead" JS state. Reload once.
window.addEventListener("pageshow", (e) => {
  if ((e as PageTransitionEvent).persisted) reloadOnce();
});

// Catch chunk/preload failures that often manifest as a black screen until manual refresh.
window.addEventListener("vite:preloadError", () => reloadOnce());
window.addEventListener("error", (event) => {
  const msg = (event as ErrorEvent).message || "";
  if (isRecoverableChunkError(msg)) {
    window.__regraphBoot?.showError(
      "Script loading error",
      "Refreshing page to fetch latest files…"
    );
    reloadOnce();
  }
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = (event as PromiseRejectionEvent).reason;
  const msg = reason instanceof Error ? reason.message : String(reason ?? "");
  if (isRecoverableChunkError(msg)) {
    window.__regraphBoot?.showError(
      "Module loading error",
      "Refreshing page to fetch latest files…"
    );
    reloadOnce();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
