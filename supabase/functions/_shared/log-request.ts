/**
 * Fire-and-forget API request logger.
 * Sends log data to the log-api-request edge function.
 * Does not throw — errors are silently caught.
 */
export function logApiRequest(data: {
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  api_key_prefix?: string | null;
  error_message?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
}): void {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) return;

  fetch(`${supabaseUrl}/functions/v1/log-api-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(data),
  }).catch((err) => {
    console.error("Failed to log API request:", err);
  });
}

/**
 * Extract a safe prefix from an API key / Authorization header value.
 */
export function extractApiKeyPrefix(req: Request): string | null {
  const apiKey =
    req.headers.get("x-api-key") || req.headers.get("authorization");
  if (!apiKey) return null;
  const clean = apiKey.replace(/^Bearer\s+/i, "");
  return clean.length > 8 ? clean.substring(0, 8) + "..." : null;
}
