import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", message: "Use POST to rent hardware" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

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

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ 
          error: "Bad request", 
          message: "Invalid JSON body",
          example: {
            gpu_type: "A100",
            gpu_count: 4,
            duration_hours: 2,
            region: "us-east"
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { gpu_type, gpu_count = 1, duration_hours = 1, region } = body;

    if (!gpu_type) {
      return new Response(
        JSON.stringify({ error: "Bad request", message: "gpu_type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GPU pricing (per hour)
    const gpuPricing: Record<string, number> = {
      "A100": 2.00,
      "A100-80GB": 2.50,
      "H100": 3.50,
      "RTX 4090": 0.50,
      "RTX 5090": 0.75,
      "RTX 3090": 0.35,
      "L40S": 1.20,
      "V100": 0.80,
    };

    const pricePerGpu = gpuPricing[gpu_type] || 1.00;
    const totalCost = pricePerGpu * gpu_count * duration_hours;

    // Check user wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance_usd")
      .eq("user_id", keyData.user_id)
      .single();

    if (!wallet || wallet.balance_usd < totalCost) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient funds", 
          message: `Required: $${totalCost.toFixed(2)}, Available: $${(wallet?.balance_usd || 0).toFixed(2)}`,
          top_up_url: "https://regraph.tech/dashboard?tab=wallet"
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find available devices matching the request
    const { data: availableDevices } = await supabase
      .from("provider_devices")
      .select("id, device_model, vram_gb")
      .eq("status", "online")
      .ilike("device_model", `%${gpu_type}%`)
      .limit(gpu_count);

    if (!availableDevices || availableDevices.length < gpu_count) {
      return new Response(
        JSON.stringify({ 
          error: "No availability", 
          message: `Not enough ${gpu_type} GPUs available. Requested: ${gpu_count}, Available: ${availableDevices?.length || 0}`,
          alternatives: Object.keys(gpuPricing)
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate rental details
    const rentalId = `rent_${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`;
    const nodeId = Math.floor(Math.random() * 999) + 1;
    const expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString();
    const sshUser = `user_${keyData.user_id.substring(0, 8)}`;

    return new Response(
      JSON.stringify({
        rental_id: rentalId,
        status: "provisioning",
        gpu_type: gpu_type,
        gpu_count: gpu_count,
        duration_hours: duration_hours,
        region: region || "auto",
        ssh_command: `ssh ${sshUser}@node-${nodeId}.regraph.tech`,
        ssh_key_url: `https://api.regraph.tech/v1/hardware/rent/${rentalId}/ssh-key`,
        jupyter_url: `https://node-${nodeId}.regraph.tech:8888`,
        expires_at: expiresAt,
        total_cost_usd: Math.round(totalCost * 100) / 100,
        hourly_rate_usd: Math.round(pricePerGpu * gpu_count * 100) / 100,
        message: "Hardware is being provisioned. You will receive SSH access details via webhook in ~2 minutes.",
        devices: availableDevices.map(d => ({
          id: d.id,
          model: d.device_model,
          vram_gb: d.vram_gb
        }))
      }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Rent error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
