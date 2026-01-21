import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", message: "Use GET to retrieve usage data" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const startDate = url.searchParams.get("start_date") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = url.searchParams.get("end_date") || new Date().toISOString().split("T")[0];
    const groupBy = url.searchParams.get("group_by") || "day";

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

    // Extract key (remove "Bearer " prefix if present)
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

    // Get usage logs for the user within date range
    const { data: usageLogs, error: usageError } = await supabase
      .from("usage_logs")
      .select("created_at, tokens_used, cost_usd, endpoint")
      .eq("user_id", keyData.user_id)
      .gte("created_at", `${startDate}T00:00:00Z`)
      .lte("created_at", `${endDate}T23:59:59Z`)
      .order("created_at", { ascending: true });

    if (usageError) {
      throw usageError;
    }

    // Aggregate usage by date
    const usageByDate: Record<string, { cost_usd: number; tokens: number }> = {};
    let totalCost = 0;
    let totalTokens = 0;

    for (const log of usageLogs || []) {
      const date = groupBy === "hour" 
        ? log.created_at.substring(0, 13) + ":00:00Z"
        : log.created_at.substring(0, 10);
      
      if (!usageByDate[date]) {
        usageByDate[date] = { cost_usd: 0, tokens: 0 };
      }
      usageByDate[date].cost_usd += Number(log.cost_usd);
      usageByDate[date].tokens += log.tokens_used;
      totalCost += Number(log.cost_usd);
      totalTokens += log.tokens_used;
    }

    const usage = Object.entries(usageByDate).map(([date, data]) => ({
      date,
      cost_usd: Math.round(data.cost_usd * 100) / 100,
      tokens: data.tokens,
    }));

    return new Response(
      JSON.stringify({
        total_cost_usd: Math.round(totalCost * 100) / 100,
        total_tokens: totalTokens,
        start_date: startDate,
        end_date: endDate,
        group_by: groupBy,
        usage,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Usage error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
