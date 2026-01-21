import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache configuration: 60 seconds CDN cache, 120 seconds stale-while-revalidate
const cacheHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get device statistics aggregated by status
    const { data: devicesByStatus, error: statusError } = await supabase
      .from("provider_devices")
      .select("status");

    if (statusError) {
      throw statusError;
    }

    // Get device statistics aggregated by type
    const { data: devicesByType, error: typeError } = await supabase
      .from("provider_devices")
      .select("device_type");

    if (typeError) {
      throw typeError;
    }

    // Get total providers count
    const { count: providerCount, error: providerError } = await supabase
      .from("provider_profiles")
      .select("*", { count: "exact", head: true });

    if (providerError) {
      throw providerError;
    }

    // Get total compute hours and earnings
    const { data: providerStats, error: statsError } = await supabase
      .from("provider_devices")
      .select("total_compute_hours, total_earnings");

    if (statsError) {
      throw statsError;
    }

    // Get usage logs count for total inferences
    const { count: totalInferences, error: usageError } = await supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true });

    if (usageError) {
      throw usageError;
    }

    // Get average response time from usage logs
    const { data: responseTimes, error: responseError } = await supabase
      .from("usage_logs")
      .select("compute_time_ms")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (responseError) {
      throw responseError;
    }

    // Get recent incidents (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select(`
        id,
        title,
        description,
        status,
        severity,
        affected_services,
        started_at,
        resolved_at,
        incident_updates (
          id,
          message,
          status,
          created_at
        )
      `)
      .gte("started_at", ninetyDaysAgo.toISOString())
      .order("started_at", { ascending: false })
      .limit(20);

    if (incidentsError) {
      throw incidentsError;
    }


    // Calculate aggregated stats
    const statusCounts = {
      online: 0,
      offline: 0,
      pending: 0,
      maintenance: 0,
    };

    devicesByStatus?.forEach((device) => {
      const status = device.status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    });

    const typeCounts: Record<string, number> = {};
    devicesByType?.forEach((device) => {
      const type = device.device_type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const totalDevices = devicesByStatus?.length || 0;
    
    const totalComputeHours = providerStats?.reduce(
      (sum, device) => sum + (parseFloat(device.total_compute_hours) || 0),
      0
    ) || 0;

    const avgResponseTime = responseTimes?.length
      ? Math.round(
          responseTimes.reduce((sum, log) => sum + (log.compute_time_ms || 0), 0) /
            responseTimes.length
        )
      : 0;

    // Format device types for frontend
    const deviceTypeColors: Record<string, string> = {
      gpu: "hsl(262, 83%, 58%)",
      cpu: "hsl(199, 89%, 48%)",
      npu: "hsl(142, 76%, 36%)",
      tpu: "hsl(38, 92%, 50%)",
      mobile: "hsl(280, 87%, 65%)",
    };

    const byType = Object.entries(typeCounts).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      color: deviceTypeColors[name] || "hsl(var(--muted))",
    }));

    const response = {
      devices: {
        total: totalDevices,
        online: statusCounts.online,
        offline: statusCounts.offline,
        pending: statusCounts.pending,
        maintenance: statusCounts.maintenance,
        byType,
      },
      platform: {
        totalProviders: providerCount || 0,
        totalComputeHours: Math.round(totalComputeHours),
        totalInferences: totalInferences || 0,
        avgResponseTime,
      },
      incidents: incidents || [],
      updatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: cacheHeaders,
    });
  } catch (error: unknown) {
    console.error("Error fetching platform stats:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
