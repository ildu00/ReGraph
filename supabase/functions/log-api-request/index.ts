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

  try {
    const {
      method,
      endpoint,
      status_code,
      response_time_ms,
      user_agent,
      ip_address,
      api_key_prefix,
      error_message,
      request_body,
    } = await req.json();

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "endpoint is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase.from("api_request_logs").insert({
      method: method || "GET",
      endpoint,
      status_code: status_code || 200,
      response_time_ms: response_time_ms || 0,
      user_agent: user_agent || null,
      ip_address: ip_address || null,
      api_key_prefix: api_key_prefix || null,
      error_message: error_message || null,
      request_body: request_body || null,
    });

    if (error) {
      console.error("Failed to log request:", error);
      return new Response(
        JSON.stringify({ error: "Failed to log request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Log API request error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
