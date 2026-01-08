import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure highlight.js has a working theme loaded (colors for .hljs-* tokens)
import "highlight.js/styles/github-dark.css";

createRoot(document.getElementById("root")!).render(<App />);
