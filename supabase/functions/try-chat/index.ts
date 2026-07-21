// Anonymous /try trial endpoint. Enforces a per-IP free-request limit
// server-side so clearing localStorage cannot reset the trial.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FREE_LIMIT = 3;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get("WALLET_ENCRYPTION_KEY") ?? "regraph-try-salt";
  const buf = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? "0.0.0.0";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);

    // Read current usage.
    const { data: row } = await admin
      .from("try_trial_usage")
      .select("count")
      .eq("ip_hash", ipHash)
      .maybeSingle();

    const currentCount = row?.count ?? 0;
    if (currentCount >= FREE_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Free trial limit reached. Please sign up to continue.", limitReached: true, remaining: 0 }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Increment first (atomic-ish) so a slow provider call cannot be replayed for free.
    const nextCount = currentCount + 1;
    await admin.from("try_trial_usage").upsert({
      ip_hash: ipHash,
      count: nextCount,
      last_at: new Date().toISOString(),
    }, { onConflict: "ip_hash" });

    // Forward to model-inference using the anon key (same as the previous client path).
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/model-inference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { error: text || "Upstream error" }; }

    if (!resp.ok) {
      // Refund the request so failures don't burn the trial.
      await admin.from("try_trial_usage").upsert({
        ip_hash: ipHash,
        count: currentCount,
        last_at: new Date().toISOString(),
      }, { onConflict: "ip_hash" });
      return new Response(JSON.stringify(data), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ...data, remaining: Math.max(0, FREE_LIMIT - nextCount) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
