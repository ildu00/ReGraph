import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // CRITICAL: Target Safari 15+ explicitly to avoid unsupported ES features
    // Safari has stricter ES module parsing than Chrome/Firefox
    target: ["es2020", "safari15", "chrome90", "firefox90"],
    // Improve chunk loading reliability
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching and smaller initial load
        manualChunks: {
          // CRITICAL: Keep React minimal for Safari iOS
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-jsx": ["react/jsx-runtime", "react/jsx-dev-runtime"],
          // Split Radix UI into smaller chunks (Safari has module size limits)
          "vendor-radix-1": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
          ],
          "vendor-radix-2": [
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
          ],
          "vendor-radix-3": [
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
          ],
          "vendor-radix-4": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
          ],
          // Heavy animation library - only needed on pages with animations
          "vendor-motion": ["framer-motion"],
          // Data fetching
          "vendor-query": ["@tanstack/react-query"],
          // Icons - large, tree-shake per route
          "vendor-icons": ["lucide-react"],
          // Supabase client
          "vendor-supabase": ["@supabase/supabase-js"],
          // Charts - only for dashboard
          "vendor-charts": ["recharts"],
          // Markdown - only for docs/blog
          "vendor-markdown": ["react-markdown", "remark-gfm"],
        },
      },
    },
    // Lower threshold to catch Safari iOS size limits
    chunkSizeWarningLimit: 400,
  },
}));
