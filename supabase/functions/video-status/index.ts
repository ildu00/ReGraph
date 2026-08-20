import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PROVIDER_BASE } from "../_shared/provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const requestId = url.searchParams.get("request_id");

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: "Missing request_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY");
    if (!VSEGPT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusResp = await fetch(
      `${PROVIDER_BASE}/v1/video/status?request_id=${requestId}`,
      { headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}` } }
    );

    if (!statusResp.ok) {
      const errText = await statusResp.text();
      console.error("Video status check error:", statusResp.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to check video status", details: errText.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusData = await statusResp.json();
    console.log(`Video status for ${requestId}:`, JSON.stringify(statusData).slice(0, 300));

    const status = statusData?.status ?? "UNKNOWN";
    const videoUrl = statusData?.url ?? null;

    return new Response(
      JSON.stringify({ status, videoUrl, requestId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Video status error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
