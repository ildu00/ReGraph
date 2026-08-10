import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest, unauthorizedResponse } from "../_shared/api-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", message: "Use POST to deploy a model" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const identity = await authenticateRequest(req);
    if (!identity) return unauthorizedResponse(corsHeaders);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ 
          error: "Bad request", 
          message: "Invalid JSON body",
          example: {
            model_url: "s3://your-bucket/model.safetensors",
            framework: "transformers",
            config: {
              model_type: "llm",
              context_length: 4096,
              quantization: "fp16"
            }
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const modelUrl = body.model_url || body.model || body.repo_id;
    const { framework, config } = body;

    if (!modelUrl || typeof modelUrl !== "string") {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "model_url is required (S3 URL, HTTPS URL, or Hugging Face repo id such as 'hf:meta-llama/Llama-3.1-8B-Instruct')",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate framework
    const supportedFrameworks = ["transformers", "vllm", "llama.cpp", "onnx", "tensorrt"];
    const selectedFramework = framework?.toLowerCase() || "transformers";

    if (!supportedFrameworks.includes(selectedFramework)) {
      return new Response(
        JSON.stringify({ 
          error: "Bad request", 
          message: `Unsupported framework: ${framework}`,
          supported_frameworks: supportedFrameworks
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect source type (Hugging Face repo, S3 object, or plain HTTPS artifact)
    const hfMatch = modelUrl.match(/^(?:hf:|huggingface:|https?:\/\/huggingface\.co\/)([\w.-]+\/[\w.-]+)/i);
    const source = hfMatch ? "huggingface" : modelUrl.startsWith("s3://") ? "s3" : "https";

    if (source === "huggingface" && !["transformers", "vllm"].includes(selectedFramework)) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Hugging Face repositories support the 'vllm' or 'transformers' frameworks only",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate deployment ID and model name
    const deploymentId = `dep_${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`;

    const modelName = hfMatch
      ? hfMatch[1].split("/").pop()!
      : (modelUrl.split("/").pop() || "custom-model").replace(/\.(safetensors|bin|gguf|onnx|pt)$/i, "") || "custom-model";

    // Estimate deployment time based on model size (simulated)
    const estimatedMinutes = 5 + Math.floor(Math.random() * 10);
    const estimatedReady = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();

    return new Response(
      JSON.stringify({
        deployment_id: deploymentId,
        status: "deploying",
        model_name: `${identity.userId.substring(0, 8)}/${modelName}`,
        model_url: modelUrl,
        source,
        framework: selectedFramework,
        config: config || {},
        estimated_ready: estimatedReady,
        estimated_minutes: estimatedMinutes,
        message: "Model deployment initiated. You will receive a webhook notification when ready.",
        endpoints: {
          inference: `https://api.regraph.tech/v1/inference`,
          status: `https://api.regraph.tech/v1/models/deploy/${deploymentId}`
        }
      }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );


  } catch (error) {
    console.error("Deploy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
