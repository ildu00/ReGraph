import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BootEventPayload {
  reason: string;
  url?: string;
  userAgent?: string;
  diag?: Record<string, unknown>;
  storageFallback?: boolean;
  attempts?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: BootEventPayload = await req.json();

    // Validate required field
    if (!payload.reason || typeof payload.reason !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'reason' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP from headers (Supabase Edge Functions provide this)
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                      req.headers.get("cf-connecting-ip") || 
                      null;

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert boot event
    const { error } = await supabase.from("boot_events").insert({
      reason: payload.reason.slice(0, 255),
      url: payload.url?.slice(0, 2048) || null,
      user_agent: payload.userAgent?.slice(0, 1024) || null,
      diag: payload.diag || null,
      storage_fallback: payload.storageFallback ?? false,
      attempts: payload.attempts ?? 0,
      ip_address: ipAddress,
    });

    if (error) {
      console.error("Failed to insert boot event:", error);
      return new Response(
        JSON.stringify({ error: "Failed to log event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error processing boot event:", err);
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
