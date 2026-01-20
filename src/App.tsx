import { Suspense, useLayoutEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ScrollToTop from "@/components/ScrollToTop";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import lazyWithRetry from "@/lib/lazyWithRetry";

// Route-level code-splitting with automatic retry on network failures.
// This prevents one broken/unsupported module (or cache issue) from blocking the page.
const Index = lazyWithRetry(() => import("./pages/Index"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Docs = lazyWithRetry(() => import("./pages/Docs"));
const Models = lazyWithRetry(() => import("./pages/Models"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazyWithRetry(() => import("./pages/TermsOfService"));
const CookiePolicy = lazyWithRetry(() => import("./pages/CookiePolicy"));
const Status = lazyWithRetry(() => import("./pages/Status"));
const Support = lazyWithRetry(() => import("./pages/Support"));
const Changelog = lazyWithRetry(() => import("./pages/Changelog"));
const Legal = lazyWithRetry(() => import("./pages/Legal"));
const About = lazyWithRetry(() => import("./pages/About"));
const Careers = lazyWithRetry(() => import("./pages/Careers"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const DebugBoot = lazyWithRetry(() => import("./pages/DebugBoot"));

declare global {
  interface Window {
    __regraphMounted?: boolean;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => {
  useLayoutEffect(() => {
    // Mark mounted for boot watchdog + remove minimal boot spinner + static fallback.
    window.__regraphMounted = true;
    document.getElementById("boot-spinner")?.remove();
    document.getElementById("boot-static")?.remove();
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense
                fallback={
                  <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/docs" element={<Docs />} />
                  <Route path="/models" element={<Models />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/cookies" element={<CookiePolicy />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/changelog" element={<Changelog />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/debug/boot" element={<DebugBoot />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default App;
