import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ApiIdentity = {
  userId: string;
  apiKeyId: string | null;
  apiKey: string | null;
};

function extractCredential(req: Request): string | null {
  const raw = req.headers.get("x-api-key") || req.headers.get("authorization");
  if (!raw) return null;
  const credential = raw.replace(/^Bearer\s+/i, "").trim();
  return credential || null;
}

/**
 * Internal, server-to-server trial requests (public /try + /models playground).
 * The key never reaches the browser; only edge functions hold it.
 */
export function isInternalTrialRequest(req: Request): boolean {
  const provided = req.headers.get("x-internal-key");
  const expected = Deno.env.get("INTERNAL_TRIAL_KEY");
  return !!provided && !!expected && provided === expected;
}

export async function authenticateRequest(req: Request): Promise<ApiIdentity | null> {
  const credential = extractCredential(req);
  if (!credential) return null;

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey || credential === anonKey) return null;

  if (credential.startsWith("rg_") || credential.startsWith("rg-")) {
    const admin = createClient(url, serviceKey);
    const { data, error } = await admin
      .from("api_keys")
      .select("id, user_id")
      .eq("full_key", credential)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;
    return { userId: data.user_id, apiKeyId: data.id, apiKey: credential };
  }

  const auth = createClient(url, anonKey);
  const { data, error } = await auth.auth.getUser(credential);
  if (error || !data.user) return null;
  return { userId: data.user.id, apiKeyId: null, apiKey: null };
}

export function unauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Unauthorized", message: "A valid, active API key is required" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}