import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // CRITICAL: Generate legacy fallback for Safari iOS that may reject modern ES modules
    // Only apply in production to avoid slowing down dev server
    mode === "production" && legacy({
      // Safari can still throw "Importing a module script failed" when parsing
      // newer output on certain iOS configurations. Target Safari 13+/iOS 13+
      // and render legacy chunks for maximum compatibility.
      targets: ["defaults", "safari >= 13", "iOS >= 13", "not dead"],
      // Generate both modern + legacy builds; Safari will auto-pick
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // CRITICAL: Target older Safari explicitly to avoid unsupported ES features
    // Safari has stricter ES module parsing than Chrome/Firefox
    target: ["es2019", "safari13", "chrome90", "firefox90", "ios13"],
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
