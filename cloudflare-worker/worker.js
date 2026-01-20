// Cloudflare Worker for api.regraph.tech
// Proxies requests to Supabase Edge Functions

const SUPABASE_URL = "https://rwzyvgralronyuzqwyhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enl2Z3JhbHJvbnl1enF3eWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NTYzNDIsImV4cCI6MjA4MzQzMjM0Mn0.PcTQ0qNvgtu1gDUJGvYY8TLUYRYwUwzE8hXGBPHxVlU";

// Map API paths to Edge Function names
const ROUTES = {
  "/v1/inference": "inference",
  "/v1/chat/completions": "inference",
  "/v1/completions": "inference",
  "/v1/models": "models",
  "/v1/batch": "batch",
  "/v1/training/jobs": "training-jobs",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Find matching route
    let functionName = null;
    for (const [routePath, fn] of Object.entries(ROUTES)) {
      if (path === routePath || path.startsWith(routePath + "/")) {
        functionName = fn;
        break;
      }
    }

    if (!functionName) {
      return new Response(
        JSON.stringify({ error: "Endpoint not found", path }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build target URL
    const targetUrl = `${SUPABASE_URL}/functions/v1/${functionName}${path.replace(/^\/v1\/[^/]+/, "")}${url.search}`;

    // Forward request
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
    
    // Pass through API key if provided
    const apiKey = request.headers.get("X-API-Key") || request.headers.get("Authorization");
    if (apiKey) {
      headers.set("X-API-Key", apiKey);
    }

    const options = {
      method: request.method,
      headers,
    };

    // Forward body for non-GET requests
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        options.body = await request.text();
      } catch (e) {
        // No body
      }
    }

    try {
      const response = await fetch(targetUrl, options);
      const responseBody = await response.text();

      return new Response(responseBody, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": response.headers.get("Content-Type") || "application/json",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Proxy error", message: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
