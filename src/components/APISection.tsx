import { motion } from "framer-motion";
import { useState } from "react";
import { Terminal, ChevronDown, ChevronRight } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";

type CodeExample = {
  label: string;
  shell: string;
  body?: string;
};

const codeExamples: Record<string, CodeExample> = {
  inference: {
    label: "Inference",
    shell: `# Simple Inference Request
curl -X POST https://api.neuralgrid.io/v1/inference \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d @payload.json`,
    body: `{
  "model": "meta-llama/Llama-3-70B",
  "messages": [
    {"role": "user", "content": "Explain quantum computing"}
  ],
  "max_tokens": 512,
  "stream": true
}`,
  },

  training: {
    label: "Training",
    shell: `# Submit Training Job
curl -X POST https://api.neuralgrid.io/v1/training/jobs \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d @payload.json`,
    body: `{
  "model": "meta-llama/Llama-3-8B",
  "dataset": "s3://your-bucket/training-data.jsonl",
  "config": {
    "epochs": 3,
    "learning_rate": 2e-5,
    "batch_size": 8,
    "lora_rank": 16
  },
  "hardware": {
    "gpu_type": "A100",
    "gpu_count": 4,
    "max_budget_usd": 50
  }
}`,
  },

  batch: {
    label: "Batch",
    shell: `# Batch Processing
curl -X POST https://api.neuralgrid.io/v1/batch \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d @payload.json`,
    body: `{
  "model": "stabilityai/stable-diffusion-xl",
  "inputs": [
    {"prompt": "A sunset over mountains", "size": "1024x1024"},
    {"prompt": "A futuristic city", "size": "1024x1024"},
    {"prompt": "An underwater scene", "size": "1024x1024"}
  ],
  "callback_url": "https://your-api.com/webhook",
  "priority": "low"
}`,
  },

  provider: {
    label: "Provider",
    shell: `# Register as Hardware Provider
curl -X POST https://api.neuralgrid.io/v1/provider/register \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d @payload.json`,
    body: `{
  "hardware": {
    "type": "gpu",
    "model": "NVIDIA RTX 4090",
    "vram_gb": 24,
    "count": 2
  },
  "availability": {
    "hours_per_day": 20,
    "timezone": "UTC"
  },
  "pricing": {
    "min_hourly_rate_usd": 0.10
  }
}`,
  },
};

const apiEndpoints = [
  {
    method: "POST",
    path: "/v1/inference",
    description: "Run inference on any model with streaming support",
    params: ["model", "messages", "max_tokens", "temperature", "stream"],
    request: `curl -X POST https://api.neuralgrid.io/v1/inference \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "meta-llama/Llama-3-70B", "messages": [{"role": "user", "content": "Hello"}]}'`,
    response: `{
  "id": "inf_abc123",
  "model": "meta-llama/Llama-3-70B",
  "choices": [{"message": {"role": "assistant", "content": "Hello! How can I help you today?"}}],
  "usage": {"prompt_tokens": 5, "completion_tokens": 12, "total_tokens": 17}
}`,
  },
  {
    method: "POST",
    path: "/v1/training/jobs",
    description: "Submit fine-tuning or training jobs",
    params: ["model", "dataset", "config", "hardware", "callback_url"],
    request: `curl -X POST https://api.neuralgrid.io/v1/training/jobs \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "meta-llama/Llama-3-8B", "dataset": "s3://bucket/data.jsonl"}'`,
    response: `{
  "id": "job_xyz789",
  "status": "queued",
  "model": "meta-llama/Llama-3-8B",
  "created_at": "2024-01-15T10:30:00Z",
  "estimated_cost_usd": 12.50
}`,
  },
  {
    method: "GET",
    path: "/v1/training/jobs/{id}",
    description: "Check training job status and progress",
    params: ["id"],
    request: `curl https://api.neuralgrid.io/v1/training/jobs/job_xyz789 \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "id": "job_xyz789",
  "status": "running",
  "progress": 0.45,
  "current_epoch": 2,
  "total_epochs": 3,
  "eta_seconds": 1800
}`,
  },
  {
    method: "POST",
    path: "/v1/batch",
    description: "Submit batch inference requests at lower cost",
    params: ["model", "inputs", "callback_url", "priority"],
    request: `curl -X POST https://api.neuralgrid.io/v1/batch \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "stabilityai/sdxl", "inputs": [{"prompt": "A sunset"}]}'`,
    response: `{
  "batch_id": "batch_def456",
  "status": "processing",
  "total_items": 1,
  "estimated_completion": "2024-01-15T11:00:00Z"
}`,
  },
  {
    method: "GET",
    path: "/v1/models",
    description: "List all available models with pricing info",
    params: ["category", "min_context", "page"],
    request: `curl https://api.neuralgrid.io/v1/models?category=llm \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "models": [
    {"id": "meta-llama/Llama-3-70B", "category": "llm", "price_per_1k_tokens": 0.0002},
    {"id": "mistralai/Mixtral-8x7B", "category": "llm", "price_per_1k_tokens": 0.0001}
  ],
  "total": 150,
  "page": 1
}`,
  },
  {
    method: "POST",
    path: "/v1/models/deploy",
    description: "Deploy a custom model to the network",
    params: ["model_url", "framework", "config"],
    request: `curl -X POST https://api.neuralgrid.io/v1/models/deploy \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model_url": "s3://bucket/model.safetensors", "framework": "transformers"}'`,
    response: `{
  "deployment_id": "dep_ghi012",
  "status": "deploying",
  "model_name": "my-custom-model",
  "estimated_ready": "2024-01-15T10:45:00Z"
}`,
  },
  {
    method: "POST",
    path: "/v1/provider/register",
    description: "Register hardware to earn from compute jobs",
    params: ["hardware", "availability", "pricing"],
    request: `curl -X POST https://api.neuralgrid.io/v1/provider/register \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"hardware": {"type": "gpu", "model": "RTX 4090", "vram_gb": 24}}'`,
    response: `{
  "provider_id": "prov_jkl345",
  "connection_key": "ng_conn_abc123xyz",
  "status": "pending_verification",
  "estimated_hourly_earnings": 0.35
}`,
  },
  {
    method: "GET",
    path: "/v1/provider/earnings",
    description: "View earnings and payout history",
    params: ["start_date", "end_date"],
    request: `curl "https://api.neuralgrid.io/v1/provider/earnings?start_date=2024-01-01" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "total_earnings_usd": 245.67,
  "pending_payout_usd": 45.20,
  "compute_hours": 512,
  "payouts": [{"date": "2024-01-10", "amount": 200.47, "status": "completed"}]
}`,
  },
  {
    method: "POST",
    path: "/v1/hardware/rent",
    description: "Rent dedicated hardware by the hour",
    params: ["gpu_type", "gpu_count", "duration_hours", "region"],
    request: `curl -X POST https://api.neuralgrid.io/v1/hardware/rent \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"gpu_type": "A100", "gpu_count": 4, "duration_hours": 2}'`,
    response: `{
  "rental_id": "rent_mno678",
  "status": "provisioning",
  "ssh_command": "ssh user@node-123.neuralgrid.io",
  "expires_at": "2024-01-15T12:30:00Z",
  "total_cost_usd": 8.00
}`,
  },
  {
    method: "GET",
    path: "/v1/usage",
    description: "Get detailed usage and billing information",
    params: ["start_date", "end_date", "group_by"],
    request: `curl "https://api.neuralgrid.io/v1/usage?start_date=2024-01-01&group_by=day" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "total_cost_usd": 42.15,
  "total_tokens": 1250000,
  "usage": [
    {"date": "2024-01-14", "cost_usd": 15.20, "tokens": 450000},
    {"date": "2024-01-15", "cost_usd": 26.95, "tokens": 800000}
  ]
}`,
  },
];

const APISection = () => {
  const [activeTab, setActiveTab] = useState<keyof typeof codeExamples>("inference");
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(null);

  return (
    <section className="relative py-24 overflow-hidden" id="api">
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card mb-6">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm">Developer-First API</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
            Powerful API
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Integrate in minutes with our comprehensive REST API. OpenAI-compatible endpoints available.
          </p>
        </motion.div>

        {/* Code Examples */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex flex-wrap gap-2 mb-6">
            {(Object.keys(codeExamples) as Array<keyof typeof codeExamples>).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:border-primary/50"
                }`}
              >
                {codeExamples[tab].label}
              </button>
            ))}
          </div>
          {(() => {
            const example = codeExamples[activeTab];
            return (
              <div className="space-y-4">
                <CodeBlock code={example.shell} language="bash" />
                {example.body ? (
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-muted-foreground">
                      Request body (JSON)
                    </div>
                    <CodeBlock code={example.body} language="json" />
                  </div>
                ) : null}
              </div>
            );
          })()}
        </motion.div>

        {/* API Reference */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-2xl font-semibold mb-6">API Reference</h3>
          <div className="space-y-3">
            {apiEndpoints.map((endpoint, i) => (
              <div
                key={i}
                className="border border-border rounded-lg bg-card/50 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedEndpoint(expandedEndpoint === i ? null : i)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-card transition-colors"
                >
                  <span className={`font-mono text-xs font-bold px-2 py-1 rounded ${
                    endpoint.method === "GET" 
                      ? "bg-blue-500/20 text-blue-400" 
                      : "bg-green-500/20 text-green-400"
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-sm text-foreground">{endpoint.path}</code>
                  <span className="text-muted-foreground text-sm flex-1 text-left hidden md:block">
                    {endpoint.description}
                  </span>
                  {expandedEndpoint === i ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedEndpoint === i && (
                  <div className="px-4 pb-4 border-t border-border bg-background/50 space-y-4">
                    <p className="text-muted-foreground text-sm mb-3 md:hidden pt-3">
                      {endpoint.description}
                    </p>
                    <div className="pt-3">
                      <span className="text-xs font-mono text-muted-foreground">Parameters:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {endpoint.params.map((param) => (
                          <span
                            key={param}
                            className="px-2 py-1 bg-card rounded text-xs font-mono text-primary border border-border"
                          >
                            {param}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Example Request */}
                    <div>
                      <span className="text-xs font-mono text-muted-foreground">Example Request:</span>
                      <div className="mt-2">
                        <CodeBlock code={endpoint.request} language="bash" />
                      </div>
                    </div>
                    
                    {/* Example Response */}
                    <div>
                      <span className="text-xs font-mono text-muted-foreground">Example Response:</span>
                      <div className="mt-2">
                        <CodeBlock code={endpoint.response} language="json" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* SDK Links */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground mb-4">Official SDKs available for</p>
          <div className="flex flex-wrap justify-center gap-4">
            {["Python", "Node.js", "Go", "Rust", "Java", "C#"].map((lang) => (
              <span
                key={lang}
                className="px-4 py-2 rounded-lg bg-card border border-border font-mono text-sm hover:border-primary/50 transition-colors cursor-pointer"
              >
                {lang}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default APISection;
