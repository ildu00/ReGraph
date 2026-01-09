import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Play, Loader2, Copy, Check, AlertCircle } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";

type Endpoint = "inference" | "training" | "batch" | "models";

interface EndpointConfig {
  method: string;
  path: string;
  description: string;
}

const endpoints: Record<Endpoint, EndpointConfig> = {
  inference: {
    method: "POST",
    path: "/v1/inference",
    description: "Run model inference"
  },
  training: {
    method: "POST",
    path: "/v1/training/jobs",
    description: "Start a training job"
  },
  batch: {
    method: "POST",
    path: "/v1/batch",
    description: "Submit batch requests"
  },
  models: {
    method: "GET",
    path: "/v1/models",
    description: "List available models"
  }
};

const availableModels = [
  "llama-3.1-70b",
  "llama-3.1-8b",
  "mistral-7b",
  "codellama-34b",
  "gemma-7b"
];

const ApiPlayground = () => {
  const [endpoint, setEndpoint] = useState<Endpoint>("inference");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("llama-3.1-70b");
  const [prompt, setPrompt] = useState("Explain quantum computing in simple terms.");
  const [maxTokens, setMaxTokens] = useState([256]);
  const [temperature, setTemperature] = useState([0.7]);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateCurlCommand = () => {
    const baseUrl = "https://api.regraph.tech";
    const config = endpoints[endpoint];
    
    if (endpoint === "models") {
      return `curl -X GET "${baseUrl}${config.path}" \\
  -H "Authorization: Bearer ${apiKey || "rg_your_api_key_here"}"`;
    }

    if (endpoint === "inference") {
      return `curl -X POST "${baseUrl}${config.path}" \\
  -H "Authorization: Bearer ${apiKey || "rg_your_api_key_here"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "prompt": "${prompt.replace(/"/g, '\\"')}",
    "max_tokens": ${maxTokens[0]},
    "temperature": ${temperature[0]}
  }'`;
    }

    if (endpoint === "training") {
      return `curl -X POST "${baseUrl}${config.path}" \\
  -H "Authorization: Bearer ${apiKey || "rg_your_api_key_here"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "base_model": "${model}",
    "dataset_url": "https://your-storage.com/dataset.jsonl",
    "hyperparameters": {
      "epochs": 3,
      "learning_rate": 2e-5,
      "batch_size": 4
    }
  }'`;
    }

    if (endpoint === "batch") {
      return `curl -X POST "${baseUrl}${config.path}" \\
  -H "Authorization: Bearer ${apiKey || "rg_your_api_key_here"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requests": [
      {"model": "${model}", "prompt": "${prompt.replace(/"/g, '\\"')}"}
    ],
    "webhook_url": "https://your-app.com/webhook"
  }'`;
    }

    return "";
  };

  const handleRun = async () => {
    if (!apiKey) {
      setError("Please enter your API key to test requests");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    // Simulate API call (in production, this would hit the actual API)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock response based on endpoint
    const mockResponses: Record<Endpoint, object> = {
      inference: {
        id: "inf_" + Math.random().toString(36).substr(2, 9),
        object: "inference",
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: 0,
            text: "Quantum computing is a revolutionary type of computation that uses quantum-mechanical phenomena like superposition and entanglement to process information. Unlike classical computers that use bits (0s and 1s), quantum computers use quantum bits or 'qubits' that can exist in multiple states simultaneously...",
            finish_reason: "stop"
          }
        ],
        usage: {
          prompt_tokens: Math.floor(prompt.split(" ").length * 1.3),
          completion_tokens: maxTokens[0],
          total_tokens: Math.floor(prompt.split(" ").length * 1.3) + maxTokens[0]
        }
      },
      training: {
        id: "train_" + Math.random().toString(36).substr(2, 9),
        object: "training.job",
        status: "queued",
        created: Math.floor(Date.now() / 1000),
        base_model: model,
        estimated_completion: new Date(Date.now() + 3600000).toISOString()
      },
      batch: {
        id: "batch_" + Math.random().toString(36).substr(2, 9),
        object: "batch",
        status: "processing",
        created: Math.floor(Date.now() / 1000),
        request_count: 1,
        completed_count: 0
      },
      models: {
        object: "list",
        data: availableModels.map((m) => ({
          id: m,
          object: "model",
          owned_by: "regraph",
          capabilities: {
            inference: true,
            training: m.includes("8b") || m.includes("7b"),
            context_length: m.includes("70b") ? 8192 : 4096
          }
        }))
      }
    };

    setResponse(JSON.stringify(mockResponses[endpoint], null, 2));
    setIsLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCurlCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Endpoint Selection */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Endpoint</Label>
          <Select value={endpoint} onValueChange={(v) => setEndpoint(v as Endpoint)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(endpoints).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span className={`text-xs font-mono ${config.method === "GET" ? "text-blue-500" : "text-green-500"}`}>
                      {config.method}
                    </span>
                    <span>{config.path}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{endpoints[endpoint].description}</p>
        </div>

        <div className="space-y-2">
          <Label>API Key</Label>
          <Input
            type="password"
            placeholder="rg_your_api_key_here"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Your API key from the dashboard</p>
        </div>
      </div>

      {/* Request Parameters */}
      {endpoint !== "models" && (
        <div className="glass-card p-6 rounded-xl space-y-4">
          <h4 className="font-semibold">Request Parameters</h4>
          
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {endpoint === "inference" && (
            <>
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  placeholder="Enter your prompt..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Max Tokens</Label>
                    <span className="text-sm text-muted-foreground">{maxTokens[0]}</span>
                  </div>
                  <Slider
                    value={maxTokens}
                    onValueChange={setMaxTokens}
                    min={1}
                    max={2048}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Temperature</Label>
                    <span className="text-sm text-muted-foreground">{temperature[0].toFixed(1)}</span>
                  </div>
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Generated cURL */}
      <div className="glass-card p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Generated Request</h4>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CodeBlock code={generateCurlCommand()} language="bash" />
      </div>

      {/* Run Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="glow-primary px-8"
          onClick={handleRun}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Request...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Request
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 rounded-xl border-l-4 border-l-red-500 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="glass-card p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-green-500">Response (200 OK)</h4>
            <span className="text-xs text-muted-foreground">Demo response</span>
          </div>
          <CodeBlock code={response} language="json" />
        </div>
      )}

      {/* Note */}
      <p className="text-xs text-center text-muted-foreground">
        This is a simulated playground. Connect your API key to test with real requests.
      </p>
    </div>
  );
};

export default ApiPlayground;
