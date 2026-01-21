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
    // Improve chunk loading reliability
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching and smaller initial load
        manualChunks: {
          // React core (keep small for mobile Safari)
          "vendor-react": [
            "react",
            "react-dom",
          ],
          // React Router (separate to reduce react chunk size)
          "vendor-router": [
            "react-router-dom",
          ],
          // JSX runtime (critical, must load early)
          "vendor-jsx": [
            "react/jsx-runtime",
            "react/jsx-dev-runtime",
          ],
          // Split Radix UI into smaller chunks (Safari has module size limits)
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip",
          ],
          "vendor-radix-forms": [
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
          ],
          "vendor-radix-overlay": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-popover",
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
    // Increase chunk size warning threshold since we're splitting intentionally
    chunkSizeWarningLimit: 600,
  },
}));
