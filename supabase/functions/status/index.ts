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

    // Get device statistics
    const { data: devices, error: devicesError } = await supabase
      .from("provider_devices")
      .select("status, device_type, total_compute_hours");

    if (devicesError) throw devicesError;

    // Get provider count
    const { count: providerCount, error: providerError } = await supabase
      .from("provider_profiles")
      .select("*", { count: "exact", head: true });

    if (providerError) throw providerError;

    // Get inference count
    const { count: inferenceCount, error: inferenceError } = await supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true });

    if (inferenceError) throw inferenceError;

    // Get average response time (last 1000 requests)
    const { data: responseTimes, error: responseError } = await supabase
      .from("usage_logs")
      .select("compute_time_ms")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (responseError) throw responseError;

    // Get active incidents
    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select("id, title, status, severity, started_at")
      .neq("status", "resolved")
      .order("started_at", { ascending: false })
      .limit(5);

    if (incidentsError) throw incidentsError;

    // Calculate stats
    const statusCounts = { online: 0, offline: 0, pending: 0, maintenance: 0 };
    const typeCounts: Record<string, number> = {};
    let totalComputeHours = 0;

    devices?.forEach((d) => {
      const status = d.status as keyof typeof statusCounts;
      if (status in statusCounts) statusCounts[status]++;
      
      typeCounts[d.device_type] = (typeCounts[d.device_type] || 0) + 1;
      totalComputeHours += parseFloat(d.total_compute_hours) || 0;
    });

    const avgResponseTime = responseTimes?.length
      ? Math.round(responseTimes.reduce((sum, r) => sum + (r.compute_time_ms || 0), 0) / responseTimes.length)
      : 0;

    // Determine overall status
    let overallStatus = "operational";
    if (incidents && incidents.length > 0) {
      const hasCritical = incidents.some((i) => i.severity === "critical");
      const hasMajor = incidents.some((i) => i.severity === "major");
      if (hasCritical) overallStatus = "major_outage";
      else if (hasMajor) overallStatus = "partial_outage";
      else overallStatus = "degraded_performance";
    }

    // Calculate uptime (simplified - based on resolved incidents in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: resolvedCount } = await supabase
      .from("incidents")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved")
      .gte("started_at", thirtyDaysAgo.toISOString());

    // Rough uptime calculation (99.9% base, minus 0.1% per incident)
    const uptime = Math.max(95, 99.9 - (resolvedCount || 0) * 0.1);

    return new Response(
      JSON.stringify({
        status: overallStatus,
        uptime_percent: uptime,
        devices: {
          total: devices?.length || 0,
          online: statusCounts.online,
          offline: statusCounts.offline,
          pending: statusCounts.pending,
          maintenance: statusCounts.maintenance,
          by_type: typeCounts,
        },
        platform: {
          providers: providerCount || 0,
          total_compute_hours: Math.round(totalComputeHours),
          total_inferences: inferenceCount || 0,
          avg_response_time_ms: avgResponseTime,
        },
        active_incidents: incidents?.map((i) => ({
          id: i.id,
          title: i.title,
          status: i.status,
          severity: i.severity,
          started_at: i.started_at,
        })) || [],
        updated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Status API error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
