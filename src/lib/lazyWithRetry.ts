import { lazy, ComponentType } from "react";

const isRecoverableModuleError = (message: string) => {
  const m = (message || "").toLowerCase();
  return (
    m.includes("loading chunk") ||
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("importing a module script failed") ||
    m.includes("preload") ||
    m.includes("network")
  );
};

// Best-effort: extract the failing chunk URL from a Vite/Safari error message.
const extractChunkUrl = (message: string): string | null => {
  const msg = String(message || "");

  // Vite often formats as: "Failed to fetch dynamically imported module: https://.../assets/x.js"
  const direct = msg.match(/https?:\/\/[^\s"']+\.js(?:\?[^\s"']*)?/i);
  if (direct?.[0]) return direct[0];

  // Sometimes it is a relative URL.
  const rel = msg.match(/\/(?:assets|src)\/[\w\-./]+\.js(?:\?[^\s"']*)?/i);
  if (rel?.[0]) {
    try {
      return new URL(rel[0], window.location.origin).toString();
    } catch {
      return rel[0];
    }
  }

  return null;
};

const hardReloadOnce = (trigger: string) => {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get("__regraph_route_reload") === "1") return;
    u.searchParams.set("__regraph_route_reload", "1");
    u.searchParams.set("__reload", Date.now().toString());
    u.searchParams.set("__regraph_force", "1");
    u.searchParams.set("__regraph_reason", trigger.slice(0, 80));
    window.location.replace(u.toString());
  } catch {
    // If URL parsing fails, last resort.
    window.location.reload();
  }
};

/**
 * Enhanced lazy import with automatic retry on failure.
 * Mobile browsers often fail to load chunks due to:
 * - Flaky network connections
 * - Cache invalidation after deploy
 * - BFCache restoring stale module references
 *
 * This wrapper retries up to 3 times with cache-busting before giving up.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // On retry, wait with exponential backoff.
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        }

        return await importFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if this is a recoverable network/chunk error.
        if (!isRecoverableModuleError(lastError.message)) {
          // Non-recoverable error, don't retry
          throw lastError;
        }

        // Attempt a *real* retry when we can extract the failing chunk URL.
        // This is especially important on iOS Safari, where stale caches can keep
        // returning an invalid module until a fresh request is forced.
        if (attempt < retries - 1) {
          const chunkUrl = extractChunkUrl(lastError.message);
          if (chunkUrl) {
            try {
              const u = new URL(chunkUrl);
              u.searchParams.set("__retry", Date.now().toString());
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const mod = (await import(
                /* @vite-ignore */ u.toString()
              )) as any;
              if (mod?.default) return { default: mod.default };
            } catch {
              // fall through to next attempt
            }
          }
        }

        // If we keep hitting the Safari module-loader error, it is usually a stale
        // cached HTML/chunk graph. A single forced full reload is the most reliable fix.
        // (We still avoid infinite loops with a query marker.)
        if (attempt === 0 && lastError.message.toLowerCase().includes("importing a module script failed")) {
          hardReloadOnce("route_module_import_failed");
          // Stop work in this execution context.
          throw lastError;
        }

        // Continue to next retry attempt
      }
    }

    // All retries failed
    throw lastError || new Error("Failed to load module after retries");
  });
}

export default lazyWithRetry;
