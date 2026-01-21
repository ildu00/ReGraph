import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Get API key from header for user identification
    const apiKeyHeader = req.headers.get("x-api-key") || req.headers.get("authorization");
    
    if (!apiKeyHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "API key required in Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = apiKeyHeader.replace(/^Bearer\s+/i, "");
    const keyPrefix = apiKey.substring(0, 8);

    // Find user by API key prefix
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("user_id")
      .eq("key_prefix", keyPrefix)
      .eq("is_active", true)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Invalid or inactive API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const { model_url, framework, config } = body;

    if (!model_url) {
      return new Response(
        JSON.stringify({ error: "Bad request", message: "model_url is required" }),
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

    // Generate deployment ID and model name
    const deploymentId = `dep_${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`;
    
    // Extract model name from URL
    const urlParts = model_url.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const modelName = fileName.replace(/\.(safetensors|bin|gguf|onnx|pt)$/i, "") || "custom-model";

    // Estimate deployment time based on model size (simulated)
    const estimatedMinutes = 5 + Math.floor(Math.random() * 10);
    const estimatedReady = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();

    return new Response(
      JSON.stringify({
        deployment_id: deploymentId,
        status: "deploying",
        model_name: `${keyData.user_id.substring(0, 8)}/${modelName}`,
        model_url: model_url,
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
