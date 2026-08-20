/**
 * Upstream inference provider access.
 *
 * The provider host blocks our backend egress IPs (all direct requests hang and
 * abort), so requests are relayed through our own API edge proxy by default.
 * Both hops are configurable via env:
 *   PROVIDER_PROXY_BASE  — relay base (default https://api.regraph.tech/_provider)
 *   PROVIDER_DIRECT_BASE — direct provider base (default https://api.vsegpt.ru)
 */
const PROXY_BASE = (Deno.env.get("PROVIDER_PROXY_BASE") ?? "https://api.regraph.tech/_provider").replace(/\/$/, "");
const DIRECT_BASE = (Deno.env.get("PROVIDER_DIRECT_BASE") ?? "https://api.vsegpt.ru").replace(/\/$/, "");

/** Direct provider URL (kept for callers that need the literal host). */
export function providerDirectUrl(path: string): string {
  return `${DIRECT_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function proxyUrl(path: string): string {
  return `${PROXY_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchWithAbort(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const outer = init.signal as AbortSignal | undefined;
  if (outer) outer.addEventListener("abort", () => controller.abort(), { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a provider API path (e.g. "/v1/chat/completions").
 * Goes through the relay; falls back to a direct call if the relay is not
 * reachable or not deployed yet (network error / 404 / 5xx from the relay).
 */
export async function providerFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = 60_000,
): Promise<Response> {
  try {
    const resp = await fetchWithAbort(proxyUrl(path), init, timeoutMs);
    // Relay missing or broken → try the provider directly.
    if (resp.status === 404 || resp.status === 502 || resp.status === 522) {
      const text = await resp.text().catch(() => "");
      if (!text.includes("choices") ) {
        return await fetchWithAbort(providerDirectUrl(path), init, timeoutMs);
      }
      return new Response(text, { status: resp.status, headers: resp.headers });
    }
    return resp;
  } catch (_err) {
    return await fetchWithAbort(providerDirectUrl(path), init, timeoutMs);
  }
}
