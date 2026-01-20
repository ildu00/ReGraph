import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
        message: "This endpoint only accepts GET requests.",
      }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "GET, OPTIONS" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Parse query parameters
    const status = url.searchParams.get("status"); // online, offline, pending, maintenance
    const type = url.searchParams.get("type"); // gpu, cpu, npu, tpu, smartphone
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // GET /v1/devices/:id - Get specific device
    const deviceId = pathParts[pathParts.length - 1];
    if (deviceId && deviceId !== "devices" && deviceId.length > 10) {
      const { data: device, error } = await supabase
        .from("provider_devices")
        .select(`
          id,
          device_name,
          device_model,
          device_type,
          vram_gb,
          price_per_hour,
          status,
          last_seen_at,
          total_compute_hours,
          created_at
        `)
        .eq("id", deviceId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!device) {
        return new Response(
          JSON.stringify({
            error: "Device not found",
            message: `No device found with ID '${deviceId}'.`,
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          id: device.id,
          name: device.device_name,
          model: device.device_model,
          type: device.device_type,
          vram_gb: device.vram_gb,
          price_per_hour: device.price_per_hour,
          status: device.status,
          last_seen_at: device.last_seen_at,
          total_compute_hours: device.total_compute_hours,
          created_at: device.created_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /v1/devices - List all devices
    let query = supabase
      .from("provider_devices")
      .select(`
        id,
        device_name,
        device_model,
        device_type,
        vram_gb,
        price_per_hour,
        status,
        last_seen_at,
        total_compute_hours,
        created_at
      `, { count: "exact" });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (type) {
      query = query.eq("device_type", type);
    }

    // Apply pagination
    query = query
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data: devices, count, error } = await query;

    if (error) {
      throw error;
    }

    // Get aggregated stats
    const { data: statusStats } = await supabase
      .from("provider_devices")
      .select("status");

    const statusCounts = {
      online: 0,
      offline: 0,
      pending: 0,
      maintenance: 0,
    };

    statusStats?.forEach((d) => {
      const s = d.status as keyof typeof statusCounts;
      if (s in statusCounts) {
        statusCounts[s]++;
      }
    });

    return new Response(
      JSON.stringify({
        devices: devices?.map((d) => ({
          id: d.id,
          name: d.device_name,
          model: d.device_model,
          type: d.device_type,
          vram_gb: d.vram_gb,
          price_per_hour: d.price_per_hour,
          status: d.status,
          last_seen_at: d.last_seen_at,
          total_compute_hours: d.total_compute_hours,
        })) || [],
        total: count || 0,
        limit,
        offset,
        stats: statusCounts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Devices API error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
