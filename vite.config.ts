import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
import { VitePWA } from "vite-plugin-pwa";
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
      targets: ["defaults", "safari >= 14", "iOS >= 14"],
      // Generate both modern + legacy builds; Safari will auto-pick
      modernPolyfills: true,
    }),
    // Service Worker for cache versioning: auto-clears stale caches on new deploys
    VitePWA({
      registerType: "autoUpdate",
      // Inline SW registration in HTML for immediate effect
      injectRegister: "inline",
      workbox: {
        // Cache JS/CSS/fonts/images
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Clean old caches automatically
        cleanupOutdatedCaches: true,
        // Skip waiting - new SW takes over immediately
        skipWaiting: true,
        clientsClaim: true,
        // Limit cache age to 7 days
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Don't cache API calls or Supabase
            urlPattern: /^https:\/\/(api\.regraph\.tech|.*\.supabase\.co)\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "ReGraph - Decentralized AI Compute",
        short_name: "ReGraph",
        description: "Access 50+ AI models at up to 80% lower cost",
        theme_color: "#7c3aed",
        background_color: "#09090b",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/favicon.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // CRITICAL: Target Safari 14+ explicitly to avoid unsupported ES features
    // Safari has stricter ES module parsing than Chrome/Firefox
    target: ["es2020", "safari14", "chrome90", "firefox90", "ios14"],
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
