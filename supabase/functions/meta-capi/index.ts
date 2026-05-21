import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PIXEL_ID = "839794025219999";
const API_VERSION = "v21.0";
const ENDPOINT = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`;

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("META_CAPI_TOKEN");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "META_CAPI_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const {
      eventName,
      eventId,
      sourceUrl,
      email,
      phone,
      firstName,
      lastName,
      fbc,
      fbp,
      customData,
      testEventCode,
    } = body ?? {};

    if (!eventName || !eventId) {
      return new Response(
        JSON.stringify({ error: "eventName and eventId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userData: Record<string, unknown> = {};
    if (email) userData.em = await sha256Hex(String(email));
    if (phone) userData.ph = await sha256Hex(String(phone));
    if (firstName) userData.fn = await sha256Hex(String(firstName));
    if (lastName) userData.ln = await sha256Hex(String(lastName));

    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent");
    if (ip) userData.client_ip_address = ip;
    if (ua) userData.client_user_agent = ua;
    if (fbc) userData.fbc = fbc;
    if (fbp) userData.fbp = fbp;

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: sourceUrl ?? req.headers.get("referer") ?? undefined,
          action_source: "website",
          user_data: userData,
          ...(customData ? { custom_data: customData } : {}),
        },
      ],
    };
    if (testEventCode) payload.test_event_code = testEventCode;

    const res = await fetch(`${ENDPOINT}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[META CAPI] error", res.status, result);
      return new Response(JSON.stringify({ error: result }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[META CAPI] ok", eventName, eventId, result);
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[META CAPI] exception", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
