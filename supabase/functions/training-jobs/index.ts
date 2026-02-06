import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logApiRequest, extractApiKeyPrefix } from "../_shared/log-request.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrainingJobRequest {
  model: string;
  dataset: string;
  config?: { epochs?: number; learning_rate?: number; batch_size?: number; lora_rank?: number };
  hardware?: { gpu_type?: string; gpu_count?: number; max_budget_usd?: number };
  callback_url?: string;
}

const jobs = new Map<string, any>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const apiKeyPrefix = extractApiKeyPrefix(req);

  const respond = (body: string, status: number, errorMsg?: string) => {
    logApiRequest({ method: req.method, endpoint: "/v1/training/jobs", status_code: status, response_time_ms: Date.now() - startTime, api_key_prefix: apiKeyPrefix, error_message: errorMsg || null });
    return new Response(body, { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  };

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (!["GET", "POST", "DELETE"].includes(req.method)) {
      return respond(JSON.stringify({ error: "Method not allowed", message: `HTTP method '${req.method}' is not supported.` }), 405, "Method not allowed");
    }
    
    if (req.method === "GET") {
      const jobId = pathParts[pathParts.length - 1];
      if (jobId && jobId !== "training-jobs") {
        const job = jobs.get(jobId) || {
          id: jobId, status: "running", progress: Math.random() * 0.8 + 0.1, current_epoch: 2, total_epochs: 3,
          eta_seconds: Math.floor(Math.random() * 3600), model: "meta-llama/Llama-3-8B", created_at: new Date(Date.now() - 3600000).toISOString(),
        };
        return respond(JSON.stringify(job), 200);
      }
      const allJobs = Array.from(jobs.values());
      return respond(JSON.stringify({
        jobs: allJobs.length > 0 ? allJobs : [
          { id: "job_demo_001", status: "completed", model: "meta-llama/Llama-3-8B", created_at: new Date(Date.now() - 86400000).toISOString(), completed_at: new Date(Date.now() - 82800000).toISOString(), total_cost_usd: 15.25 },
          { id: "job_demo_002", status: "running", model: "mistralai/Mistral-7B", progress: 0.65, current_epoch: 2, total_epochs: 3, created_at: new Date(Date.now() - 7200000).toISOString(), estimated_cost_usd: 8.50 },
        ],
        total: allJobs.length || 2, page: 1,
      }), 200);
    }

    if (req.method === "POST") {
      let body: TrainingJobRequest;
      try {
        const text = await req.text();
        if (!text || text.trim() === "") return respond(JSON.stringify({ error: "Empty request body", example: { model: "llama-3.1-8b", dataset: "https://example.com/data.jsonl" } }), 400, "Empty request body");
        body = JSON.parse(text);
      } catch (parseError) {
        return respond(JSON.stringify({ error: "Invalid JSON", example: { model: "llama-3.1-8b", dataset: "https://example.com/data.jsonl" } }), 400, "Invalid JSON");
      }
      if (!body.model) return respond(JSON.stringify({ error: "Missing required field", message: "The 'model' field is required." }), 400, "Missing model");
      if (!body.dataset) return respond(JSON.stringify({ error: "Missing required field", message: "The 'dataset' field is required." }), 400, "Missing dataset");

      const jobId = `job_${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();
      const epochs = body.config?.epochs || 3;
      const gpuCount = body.hardware?.gpu_count || 1;
      const estimatedCost = epochs * gpuCount * 4.50;
      const newJob = {
        id: jobId, status: "queued", model: body.model, dataset: body.dataset,
        config: { epochs, learning_rate: body.config?.learning_rate || 2e-5, batch_size: body.config?.batch_size || 8, lora_rank: body.config?.lora_rank || 16 },
        hardware: { gpu_type: body.hardware?.gpu_type || "A100", gpu_count: gpuCount, max_budget_usd: body.hardware?.max_budget_usd || 100 },
        callback_url: body.callback_url || null, created_at: now, estimated_cost_usd: estimatedCost, progress: 0, current_epoch: 0, total_epochs: epochs,
      };
      jobs.set(jobId, newJob);
      return respond(JSON.stringify({ id: jobId, status: "queued", model: body.model, created_at: now, estimated_cost_usd: estimatedCost }), 201);
    }

    if (req.method === "DELETE") {
      const jobId = pathParts[pathParts.length - 1];
      if (jobs.has(jobId)) jobs.delete(jobId);
      return respond(JSON.stringify({ message: "Job cancelled", id: jobId }), 200);
    }

    return respond(JSON.stringify({ error: "Method not allowed" }), 405, "Method not allowed");

  } catch (error) {
    console.error("Training jobs error:", error);
    return respond(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 500, error instanceof Error ? error.message : "Unknown error");
  }
});
