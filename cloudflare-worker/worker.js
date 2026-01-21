// Cloudflare Worker for api.regraph.tech
// Proxies requests to Supabase Edge Functions

const SUPABASE_URL = "https://rwzyvgralronyuzqwyhu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enl2Z3JhbHJvbnl1enF3eWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NTYzNDIsImV4cCI6MjA4MzQzMjM0Mn0.PcTQ0qNvgtu1gDUJGvYY8TLUYRYwUwzE8hXGBPHxVlU";

// Map API paths to Edge Function names
const ROUTES = {
  "/v1/inference": "inference",
  "/v1/chat/completions": "inference",
  "/v1/completions": "inference",
  "/v1/audio/speech": "audio-speech",
  "/v1/models": "models",
  "/v1/models/deploy": "models-deploy",
  "/v1/batch": "batch",
  "/v1/training/jobs": "training-jobs",
  "/v1/devices": "devices",
  "/v1/status": "status",
  "/v1/usage": "usage",
  "/v1/provider/register": "provider",
  "/v1/provider/earnings": "provider",
  "/v1/hardware/rent": "hardware-rent",
  // Boot diagnostics logging (used by index.html watchdog)
  "/v1/log-boot-event": "log-boot-event",
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

    // Handle root path
    if (path === "/" || path === "") {
      return new Response(
        JSON.stringify({
          error: "Invalid endpoint",
          message: "Please use a valid API endpoint. Available endpoints: /v1/inference, /v1/models, /v1/batch, /v1/training/jobs, /v1/usage, /v1/provider/register, /v1/provider/earnings, /v1/hardware/rent, /v1/models/deploy",
          documentation: "https://regraph.tech/docs"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        JSON.stringify({
          error: "Endpoint not found",
          message: `The endpoint '${path}' does not exist. Available endpoints: /v1/inference, /v1/models, /v1/batch, /v1/training/jobs, /v1/usage, /v1/provider/register, /v1/provider/earnings, /v1/hardware/rent, /v1/models/deploy`,
          documentation: "https://regraph.tech/docs"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate HTTP method for specific endpoints
    const postOnlyEndpoints = ["/v1/inference", "/v1/chat/completions", "/v1/completions", "/v1/audio/speech", "/v1/batch"];
    if (postOnlyEndpoints.some(ep => path === ep || path.startsWith(ep + "/")) && request.method === "GET") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
          message: `The endpoint '${path}' requires a POST request with a JSON body. GET requests are not supported.`,
          example: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { model: "llama-3.1-70b", prompt: "Hello, how are you?", max_tokens: 256 }
          }
        }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" } }
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
