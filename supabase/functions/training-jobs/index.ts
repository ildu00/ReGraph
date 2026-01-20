import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrainingJobRequest {
  model: string;
  dataset: string;
  config?: {
    epochs?: number;
    learning_rate?: number;
    batch_size?: number;
    lora_rank?: number;
  };
  hardware?: {
    gpu_type?: string;
    gpu_count?: number;
    max_budget_usd?: number;
  };
  callback_url?: string;
}

// In-memory job storage (in production would use database)
const jobs = new Map<string, any>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // GET /v1/training/jobs/{id} - Get job status
    if (req.method === "GET") {
      const jobId = pathParts[pathParts.length - 1];
      
      if (jobId && jobId !== "training-jobs") {
        // Return mock job status
        const job = jobs.get(jobId) || {
          id: jobId,
          status: "running",
          progress: Math.random() * 0.8 + 0.1,
          current_epoch: 2,
          total_epochs: 3,
          eta_seconds: Math.floor(Math.random() * 3600),
          model: "meta-llama/Llama-3-8B",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        };

        return new Response(
          JSON.stringify(job),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List all jobs
      const allJobs = Array.from(jobs.values());
      return new Response(
        JSON.stringify({
          jobs: allJobs.length > 0 ? allJobs : [
            {
              id: "job_demo_001",
              status: "completed",
              model: "meta-llama/Llama-3-8B",
              created_at: new Date(Date.now() - 86400000).toISOString(),
              completed_at: new Date(Date.now() - 82800000).toISOString(),
              total_cost_usd: 15.25,
            },
            {
              id: "job_demo_002",
              status: "running",
              model: "mistralai/Mistral-7B",
              progress: 0.65,
              current_epoch: 2,
              total_epochs: 3,
              created_at: new Date(Date.now() - 7200000).toISOString(),
              estimated_cost_usd: 8.50,
            },
          ],
          total: allJobs.length || 2,
          page: 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /v1/training/jobs - Create new training job
    if (req.method === "POST") {
      const body: TrainingJobRequest = await req.json();

      if (!body.model) {
        return new Response(
          JSON.stringify({ error: "model is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!body.dataset) {
        return new Response(
          JSON.stringify({ error: "dataset is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const jobId = `job_${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();

      // Estimate cost based on config
      const epochs = body.config?.epochs || 3;
      const gpuCount = body.hardware?.gpu_count || 1;
      const estimatedCost = epochs * gpuCount * 4.50; // ~$4.50 per epoch per GPU

      const newJob = {
        id: jobId,
        status: "queued",
        model: body.model,
        dataset: body.dataset,
        config: {
          epochs: body.config?.epochs || 3,
          learning_rate: body.config?.learning_rate || 2e-5,
          batch_size: body.config?.batch_size || 8,
          lora_rank: body.config?.lora_rank || 16,
        },
        hardware: {
          gpu_type: body.hardware?.gpu_type || "A100",
          gpu_count: body.hardware?.gpu_count || 1,
          max_budget_usd: body.hardware?.max_budget_usd || 100,
        },
        callback_url: body.callback_url || null,
        created_at: now,
        estimated_cost_usd: estimatedCost,
        progress: 0,
        current_epoch: 0,
        total_epochs: body.config?.epochs || 3,
      };

      jobs.set(jobId, newJob);

      return new Response(
        JSON.stringify({
          id: jobId,
          status: "queued",
          model: body.model,
          created_at: now,
          estimated_cost_usd: estimatedCost,
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /v1/training/jobs/{id} - Cancel job
    if (req.method === "DELETE") {
      const jobId = pathParts[pathParts.length - 1];
      
      if (jobs.has(jobId)) {
        jobs.delete(jobId);
        return new Response(
          JSON.stringify({ message: "Job cancelled successfully", id: jobId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ message: "Job cancelled", id: jobId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Training jobs error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
