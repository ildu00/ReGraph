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

// BFCache restore on mobile Safari can resume a "half-dead" JS state.
// Just refresh the page once (no loops).
window.addEventListener("pageshow", (e) => {
  if ((e as PageTransitionEvent).persisted) {
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
