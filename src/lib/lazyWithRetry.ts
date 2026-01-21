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

/**
 * Enhanced lazy import with automatic retry on failure.
 * Mobile browsers often fail to load chunks due to:
 * - Flaky network connections
 * - Cache invalidation after deploy
 * - BFCache restoring stale module references
 *
 * This wrapper retries up to 3 times with exponential backoff before giving up.
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
          console.info(`[lazyWithRetry] Retry attempt ${attempt + 1}/${retries}`);
        }

        return await importFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[lazyWithRetry] Attempt ${attempt + 1} failed:`, lastError.message);

        // Check if this is a recoverable network/chunk error.
        if (!isRecoverableModuleError(lastError.message)) {
          // Non-recoverable error, don't retry
          throw lastError;
        }

        // Continue to next retry attempt
      }
    }

    // All retries failed - let AppErrorBoundary handle it
    throw lastError || new Error("Failed to load module after retries");
  });
}

export default lazyWithRetry;
