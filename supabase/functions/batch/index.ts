import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logApiRequest, extractApiKeyPrefix } from "../_shared/log-request.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BatchRequest {
  model: string;
  inputs: Array<{ prompt?: string; size?: string; [key: string]: any }>;
  callback_url?: string;
  priority?: "low" | "normal" | "high";
}

const batches = new Map<string, any>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const apiKeyPrefix = extractApiKeyPrefix(req);

  const respond = (body: string, status: number, errorMsg?: string) => {
    logApiRequest({ method: req.method, endpoint: "/v1/batch", status_code: status, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: errorMsg || null });
    return new Response(body, { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  };

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (!["GET", "POST", "DELETE"].includes(req.method)) {
      return respond(JSON.stringify({ error: "Method not allowed", message: `HTTP method '${req.method}' is not supported.` }), 405, "Method not allowed");
    }

    if (req.method === "GET") {
      const batchId = pathParts[pathParts.length - 1];
      if (batchId && batchId !== "batch") {
        const batch = batches.get(batchId) || {
          batch_id: batchId, status: "processing", total_items: 3, completed_items: Math.floor(Math.random() * 3), failed_items: 0,
          created_at: new Date(Date.now() - 600000).toISOString(), estimated_completion: new Date(Date.now() + 300000).toISOString(), results: [],
        };
        if (batch.status === "completed" || batch.completed_items === batch.total_items) {
          batch.status = "completed";
          batch.results = Array(batch.total_items).fill(null).map((_, i) => ({ index: i, status: "success", output_url: `https://storage.regraph.tech/batch/${batchId}/output_${i}.png` }));
        }
        return respond(JSON.stringify(batch), 200);
      }
      const allBatches = Array.from(batches.values());
      return respond(JSON.stringify({
        batches: allBatches.length > 0 ? allBatches : [
          { batch_id: "batch_demo_001", status: "completed", total_items: 5, completed_items: 5, model: "stabilityai/stable-diffusion-xl", created_at: new Date(Date.now() - 3600000).toISOString(), completed_at: new Date(Date.now() - 3000000).toISOString() },
          { batch_id: "batch_demo_002", status: "processing", total_items: 10, completed_items: 7, model: "meta-llama/Llama-3-70B", created_at: new Date(Date.now() - 1200000).toISOString(), estimated_completion: new Date(Date.now() + 600000).toISOString() },
        ],
        total: allBatches.length || 2, page: 1,
      }), 200);
    }

    if (req.method === "POST") {
      let body: BatchRequest;
      try {
        const text = await req.text();
        if (!text || text.trim() === "") return respond(JSON.stringify({ error: "Empty request body", message: "Request body cannot be empty.", example: { model: "llama-3.1-70b", inputs: [{ prompt: "Hello" }] } }), 400, "Empty request body");
        body = JSON.parse(text);
      } catch (parseError) {
        return respond(JSON.stringify({ error: "Invalid JSON", message: "Request body must be valid JSON.", example: { model: "llama-3.1-70b", inputs: [{ prompt: "Hello" }] } }), 400, "Invalid JSON");
      }
      if (!body.model) return respond(JSON.stringify({ error: "Missing required field", message: "The 'model' field is required." }), 400, "Missing model field");
      if (!body.inputs || !Array.isArray(body.inputs) || body.inputs.length === 0) return respond(JSON.stringify({ error: "Missing required field", message: "The 'inputs' field is required and must be a non-empty array." }), 400, "Missing inputs field");

      const batchId = `batch_${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date();
      const priorityMultiplier = body.priority === "high" ? 0.5 : body.priority === "low" ? 2 : 1;
      const estimatedMinutes = body.inputs.length * 2 * priorityMultiplier;
      const estimatedCompletion = new Date(now.getTime() + estimatedMinutes * 60000);

      const newBatch = { batch_id: batchId, status: "processing", model: body.model, total_items: body.inputs.length, completed_items: 0, failed_items: 0, priority: body.priority || "normal", callback_url: body.callback_url || null, created_at: now.toISOString(), estimated_completion: estimatedCompletion.toISOString(), inputs: body.inputs };
      batches.set(batchId, newBatch);
      return respond(JSON.stringify({ batch_id: batchId, status: "processing", total_items: body.inputs.length, estimated_completion: estimatedCompletion.toISOString() }), 201);
    }

    if (req.method === "DELETE") {
      const batchId = pathParts[pathParts.length - 1];
      if (batches.has(batchId)) batches.delete(batchId);
      return respond(JSON.stringify({ message: "Batch cancelled", batch_id: batchId }), 200);
    }

    return respond(JSON.stringify({ error: "Method not allowed" }), 405, "Method not allowed");

  } catch (error) {
    console.error("Batch error:", error);
    return respond(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 500, error instanceof Error ? error.message : "Unknown error");
  }
});
