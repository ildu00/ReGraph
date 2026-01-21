import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/provider\/?/, "");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API key from header for user identification
    const apiKeyHeader = req.headers.get("x-api-key") || req.headers.get("authorization");
    
    if (!apiKeyHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "API key required in Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = apiKeyHeader.replace(/^Bearer\s+/i, "");
    const keyPrefix = apiKey.substring(0, 8);

    // Find user by API key prefix
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("user_id")
      .eq("key_prefix", keyPrefix)
      .eq("is_active", true)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Invalid or inactive API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = keyData.user_id;

    // Route: POST /provider/register
    if (path === "register" && req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ 
            error: "Bad request", 
            message: "Invalid JSON body",
            example: {
              hardware: { type: "gpu", model: "NVIDIA RTX 4090", vram_gb: 24, count: 1 },
              availability: { hours_per_day: 20, timezone: "UTC" },
              pricing: { min_hourly_rate_usd: 0.10 }
            }
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { hardware, availability, pricing } = body;

      if (!hardware || !hardware.type || !hardware.model) {
        return new Response(
          JSON.stringify({ error: "Bad request", message: "hardware.type and hardware.model are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if provider profile exists
      const { data: existingProfile } = await supabase
        .from("provider_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      let providerId = existingProfile?.id;

      // Create provider profile if not exists
      if (!providerId) {
        const { data: newProfile, error: profileError } = await supabase
          .from("provider_profiles")
          .insert({ user_id: userId })
          .select("id")
          .single();

        if (profileError) throw profileError;
        providerId = newProfile.id;
      }

      // Generate connection key
      const connectionKey = `rgc_${crypto.randomUUID().replace(/-/g, "").substring(0, 24)}`;

      // Map hardware type to device_type enum
      const deviceTypeMap: Record<string, string> = {
        gpu: "gpu",
        tpu: "tpu",
        npu: "npu",
        cpu: "cpu",
        smartphone: "smartphone",
      };
      const deviceType = deviceTypeMap[hardware.type.toLowerCase()] || "gpu";

      // Create device entry
      const { data: device, error: deviceError } = await supabase
        .from("provider_devices")
        .insert({
          user_id: userId,
          device_name: hardware.model,
          device_type: deviceType,
          device_model: hardware.model,
          vram_gb: hardware.vram_gb || null,
          price_per_hour: pricing?.min_hourly_rate_usd || 0.10,
          connection_key: connectionKey,
          status: "pending",
        })
        .select("id")
        .single();

      if (deviceError) throw deviceError;

      // Calculate estimated hourly earnings based on hardware
      const baseEarnings = pricing?.min_hourly_rate_usd || 0.10;
      const vramMultiplier = hardware.vram_gb ? Math.min(hardware.vram_gb / 24, 2) : 1;
      const estimatedEarnings = Math.round(baseEarnings * vramMultiplier * 100) / 100;

      return new Response(
        JSON.stringify({
          provider_id: providerId,
          device_id: device.id,
          connection_key: connectionKey,
          status: "pending_verification",
          estimated_hourly_earnings: estimatedEarnings,
          next_steps: [
            "Install the ReGraph agent using the connection key",
            "Run the verification process to go online",
            "Start earning from compute jobs"
          ]
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: GET /provider/earnings
    if (path === "earnings" && req.method === "GET") {
      const startDate = url.searchParams.get("start_date") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const endDate = url.searchParams.get("end_date") || new Date().toISOString().split("T")[0];

      // Get provider profile
      const { data: profile, error: profileError } = await supabase
        .from("provider_profiles")
        .select("id, total_earnings, payout_address")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "Not found", message: "Provider profile not found. Register as a provider first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get devices and their earnings
      const { data: devices } = await supabase
        .from("provider_devices")
        .select("id, device_name, total_earnings, total_compute_hours, status")
        .eq("user_id", userId);

      // Get usage logs where this user is the provider
      const { data: usageLogs } = await supabase
        .from("usage_logs")
        .select("created_at, cost_usd, compute_time_ms")
        .eq("provider_id", profile.id)
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`);

      const periodEarnings = (usageLogs || []).reduce((sum, log) => sum + Number(log.cost_usd) * 0.8, 0);
      const computeHours = (usageLogs || []).reduce((sum, log) => sum + log.compute_time_ms / 3600000, 0);

      // Get wallet for pending payout
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance_usd")
        .eq("user_id", userId)
        .single();

      return new Response(
        JSON.stringify({
          total_earnings_usd: Math.round(Number(profile.total_earnings) * 100) / 100,
          period_earnings_usd: Math.round(periodEarnings * 100) / 100,
          pending_payout_usd: Math.round((wallet?.balance_usd || 0) * 100) / 100,
          compute_hours: Math.round(computeHours * 100) / 100,
          devices: (devices || []).map(d => ({
            id: d.id,
            name: d.device_name,
            status: d.status,
            earnings_usd: Math.round(Number(d.total_earnings) * 100) / 100,
            compute_hours: Math.round(Number(d.total_compute_hours) * 100) / 100,
          })),
          payout_address: profile.payout_address,
          start_date: startDate,
          end_date: endDate,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: "Not found", 
        message: `Unknown endpoint: /provider/${path}`,
        available_endpoints: ["POST /provider/register", "GET /provider/earnings"]
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Provider error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
