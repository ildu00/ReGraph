import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, Copy, Check, AlertCircle, Wifi, WifiOff, Wallet, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CodeBlock from "@/components/CodeBlock";
import { toast } from "sonner";

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
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [useLiveApi, setUseLiveApi] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [billingInfo, setBillingInfo] = useState<{
    charged: number;
    providerCredited: number;
    newBalance: number;
  } | null>(null);

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

  const buildRequestBody = () => {
    if (endpoint === "models") return undefined;

    if (endpoint === "inference") {
      return {
        model,
        prompt,
        max_tokens: maxTokens[0],
        temperature: temperature[0]
      };
    }

    if (endpoint === "training") {
      return {
        base_model: model,
        dataset_url: "https://your-storage.com/dataset.jsonl",
        hyperparameters: {
          epochs: 3,
          learning_rate: 2e-5,
          batch_size: 4
        }
      };
    }

    if (endpoint === "batch") {
      return {
        requests: [{ model, prompt }],
        webhook_url: "https://your-app.com/webhook"
      };
    }

    return undefined;
  };

  const getMockResponse = (): object => {
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

    return mockResponses[endpoint];
  };

  const handleRun = async () => {
    if (!apiKey && useLiveApi) {
      setError("Please enter your API key to test requests");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setResponseStatus(null);
    setLatency(null);
    setBillingInfo(null);

    const startTime = performance.now();

    try {
      if (useLiveApi) {
        // Make real API call through edge function
        const config = endpoints[endpoint];
        const { data, error: fnError } = await supabase.functions.invoke("api-playground", {
          body: {
            endpoint: config.path,
            method: config.method,
            apiKey,
            body: buildRequestBody()
          }
        });

        const endTime = performance.now();
        const requestLatency = Math.round(endTime - startTime);
        setLatency(requestLatency);

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (data.error) {
          setError(data.error);
          setResponseStatus(data.status || 500);
        } else {
          setResponseStatus(data.status);
          setResponse(JSON.stringify(data.data, null, 2));

          // Process billing after successful API call
          if (data.status >= 200 && data.status < 300) {
            try {
              // Calculate tokens used from response or estimate
              const tokensUsed = data.data?.usage?.total_tokens || 
                Math.floor((prompt.split(" ").length * 1.3) + maxTokens[0]);
              
              const { data: billingData, error: billingError } = await supabase.functions.invoke("process-api-usage", {
                body: {
                  api_key: apiKey,
                  endpoint: config.path,
                  tokens_used: tokensUsed,
                  compute_time_ms: requestLatency
                }
              });

              if (billingError) {
                console.error("Billing error:", billingError);
                toast.error("Failed to process billing");
              } else if (billingData?.error) {
                if (billingData.error === "Insufficient balance") {
                  toast.error(`Insufficient balance. Required: $${billingData.required?.toFixed(4)}, Available: $${billingData.available?.toFixed(2)}`);
                } else {
                  toast.error(billingData.error);
                }
              } else if (billingData?.success) {
                setBillingInfo({
                  charged: billingData.charged,
                  providerCredited: billingData.provider_credited,
                  newBalance: billingData.new_balance
                });
                toast.success(`Charged $${billingData.charged.toFixed(4)} • Balance: $${billingData.new_balance.toFixed(2)}`);
              }
            } catch (billingErr) {
              console.error("Billing processing error:", billingErr);
            }
          }
        }
      } else {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));
        const endTime = performance.now();
        setLatency(Math.round(endTime - startTime));
        setResponseStatus(200);
        setResponse(JSON.stringify(getMockResponse(), null, 2));
        
        // Show mock billing info in simulation mode
        const mockTokens = Math.floor((prompt.split(" ").length * 1.3) + maxTokens[0]);
        const mockCost = (mockTokens / 1000) * 0.001 + (800 / 1000) * 0.0001;
        setBillingInfo({
          charged: mockCost,
          providerCredited: mockCost * 0.8,
          newBalance: 10.00 - mockCost // Mock balance
        });
      }
    } catch (err) {
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setError(err instanceof Error ? err.message : "An error occurred");
      setResponseStatus(500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCurlCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: number | null) => {
    if (!status) return "text-muted-foreground";
    if (status >= 200 && status < 300) return "text-green-500";
    if (status >= 400 && status < 500) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Live API Toggle */}
      <div className="glass-card p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          {useLiveApi ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">
              {useLiveApi ? "Live API Mode" : "Simulation Mode"}
            </p>
            <p className="text-xs text-muted-foreground">
              {useLiveApi
                ? "Requests will be sent to the actual ReGraph API"
                : "Using simulated responses for testing"}
            </p>
          </div>
        </div>
        <Switch checked={useLiveApi} onCheckedChange={setUseLiveApi} />
      </div>

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
          <Label>API Key {useLiveApi && <span className="text-red-500">*</span>}</Label>
          <Input
            type="password"
            placeholder="rg_your_api_key_here"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={useLiveApi && !apiKey ? "border-yellow-500/50" : ""}
          />
          <p className="text-xs text-muted-foreground">
            {useLiveApi ? "Required for live requests" : "Optional for simulation mode"}
          </p>
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
              {useLiveApi ? "Sending Request..." : "Simulating..."}
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              {useLiveApi ? "Send Request" : "Run Simulation"}
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 rounded-xl border-l-4 border-l-red-500 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <p className="font-medium text-red-400">Error</p>
            <p className="text-sm text-red-400/80">{error}</p>
          </div>
        </div>
      )}

      {/* Billing Info */}
      {billingInfo && (
        <div className="glass-card p-4 rounded-xl border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Billing Summary</h4>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Charged</p>
              <p className="font-bold text-red-400">-${billingInfo.charged.toFixed(4)}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Provider Earned</p>
              <p className="font-bold text-green-400">${billingInfo.providerCredited.toFixed(4)}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">New Balance</p>
              <p className="font-bold">${billingInfo.newBalance.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            80% goes to compute provider • 20% platform fee
          </p>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="glass-card p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h4 className={`font-semibold ${getStatusColor(responseStatus)}`}>
                Response ({responseStatus} {responseStatus === 200 ? "OK" : ""})
              </h4>
              {latency && (
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {latency}ms
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {useLiveApi ? "Live response" : "Simulated response"}
            </span>
          </div>
          <CodeBlock code={response} language="json" />
        </div>
      )}

      {/* Note */}
      <p className="text-xs text-center text-muted-foreground">
        {useLiveApi
          ? "Connected to live ReGraph API. Your requests will use real compute resources."
          : "Toggle 'Live API Mode' to test with actual API endpoints."}
      </p>
    </div>
  );
};

export default ApiPlayground;
