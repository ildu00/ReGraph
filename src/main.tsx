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

const reloadOnce = () => {
  try {
    const key = "__regraph_autoreload_once";
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");

    const url = new URL(window.location.href);
    url.searchParams.set("__reload", Date.now().toString());
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
};

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
