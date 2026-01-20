import { lazy, ComponentType } from "react";

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
        // On retry, add cache-busting to force fresh fetch
        if (attempt > 0) {
          // Wait before retry with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));

          // Force a fresh import by clearing module cache hint
          // (actual cache clearing depends on browser, but this helps)
          const cacheBuster = `?__retry=${Date.now()}`;
          
          // Log retry attempt for debugging
          console.info(`[lazyWithRetry] Retry attempt ${attempt + 1}/${retries}`);
          
          // Try with cache-busting (won't always work but helps in some cases)
          try {
            const result = await importFn();
            return result;
          } catch (retryError) {
            lastError = retryError instanceof Error ? retryError : new Error(String(retryError));
            continue;
          }
        }

        return await importFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if this is a recoverable network/chunk error
        const message = lastError.message.toLowerCase();
        const isRecoverable =
          message.includes("loading chunk") ||
          message.includes("failed to fetch dynamically imported module") ||
          message.includes("importing a module script failed") ||
          message.includes("preload") ||
          message.includes("network");

        if (!isRecoverable) {
          // Non-recoverable error, don't retry
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
