import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BatchRequest {
  model: string;
  inputs: Array<{
    prompt?: string;
    size?: string;
    [key: string]: any;
  }>;
  callback_url?: string;
  priority?: "low" | "normal" | "high";
}

// In-memory batch storage
const batches = new Map<string, any>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // GET /v1/batch/{id} - Get batch status
    if (req.method === "GET") {
      const batchId = pathParts[pathParts.length - 1];
      
      if (batchId && batchId !== "batch") {
        const batch = batches.get(batchId) || {
          batch_id: batchId,
          status: "processing",
          total_items: 3,
          completed_items: Math.floor(Math.random() * 3),
          failed_items: 0,
          created_at: new Date(Date.now() - 600000).toISOString(),
          estimated_completion: new Date(Date.now() + 300000).toISOString(),
          results: [],
        };

        // Add mock results if completed
        if (batch.status === "completed" || batch.completed_items === batch.total_items) {
          batch.status = "completed";
          batch.results = Array(batch.total_items).fill(null).map((_, i) => ({
            index: i,
            status: "success",
            output_url: `https://storage.regraph.tech/batch/${batchId}/output_${i}.png`,
          }));
        }

        return new Response(
          JSON.stringify(batch),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List all batches
      const allBatches = Array.from(batches.values());
      return new Response(
        JSON.stringify({
          batches: allBatches.length > 0 ? allBatches : [
            {
              batch_id: "batch_demo_001",
              status: "completed",
              total_items: 5,
              completed_items: 5,
              model: "stabilityai/stable-diffusion-xl",
              created_at: new Date(Date.now() - 3600000).toISOString(),
              completed_at: new Date(Date.now() - 3000000).toISOString(),
            },
            {
              batch_id: "batch_demo_002",
              status: "processing",
              total_items: 10,
              completed_items: 7,
              model: "meta-llama/Llama-3-70B",
              created_at: new Date(Date.now() - 1200000).toISOString(),
              estimated_completion: new Date(Date.now() + 600000).toISOString(),
            },
          ],
          total: allBatches.length || 2,
          page: 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /v1/batch - Create new batch job
    if (req.method === "POST") {
      const body: BatchRequest = await req.json();

      if (!body.model) {
        return new Response(
          JSON.stringify({ error: "model is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!body.inputs || !Array.isArray(body.inputs) || body.inputs.length === 0) {
        return new Response(
          JSON.stringify({ error: "inputs array is required and must not be empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const batchId = `batch_${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date();
      
      // Estimate completion based on priority and item count
      const priorityMultiplier = body.priority === "high" ? 0.5 : body.priority === "low" ? 2 : 1;
      const estimatedMinutes = body.inputs.length * 2 * priorityMultiplier;
      const estimatedCompletion = new Date(now.getTime() + estimatedMinutes * 60000);

      const newBatch = {
        batch_id: batchId,
        status: "processing",
        model: body.model,
        total_items: body.inputs.length,
        completed_items: 0,
        failed_items: 0,
        priority: body.priority || "normal",
        callback_url: body.callback_url || null,
        created_at: now.toISOString(),
        estimated_completion: estimatedCompletion.toISOString(),
        inputs: body.inputs,
      };

      batches.set(batchId, newBatch);

      return new Response(
        JSON.stringify({
          batch_id: batchId,
          status: "processing",
          total_items: body.inputs.length,
          estimated_completion: estimatedCompletion.toISOString(),
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /v1/batch/{id} - Cancel batch
    if (req.method === "DELETE") {
      const batchId = pathParts[pathParts.length - 1];
      
      if (batches.has(batchId)) {
        batches.delete(batchId);
        return new Response(
          JSON.stringify({ message: "Batch cancelled successfully", batch_id: batchId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ message: "Batch cancelled", batch_id: batchId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Batch error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
