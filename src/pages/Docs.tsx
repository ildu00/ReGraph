import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Book, 
  Terminal, 
  Server, 
  Key, 
  Zap, 
  Copy, 
  Check,
  ChevronRight,
  Cpu,
  Shield,
  Webhook,
  Database,
  PlayCircle
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CodeBlock from "@/components/CodeBlock";
import ApiPlayground from "@/components/docs/ApiPlayground";

const Docs = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const installScriptBash = `curl -fsSL https://regraph.tech/scripts/install.sh | bash`;
  const installScriptPowershell = `irm https://regraph.tech/scripts/install.ps1 | iex`;
  
  const dockerComposeExample = `version: '3.8'

services:
  regraph-agent:
    image: regraph/agent:latest
    container_name: regraph-agent
    restart: unless-stopped
    environment:
      - REGRAPH_CONNECTION_KEY=rgc_your_connection_key_here
      - REGRAPH_DEVICE_NAME=my-gpu-server
      - REGRAPH_API_ENDPOINT=https://api.regraph.tech
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - regraph-data:/app/data
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "regraph-agent", "health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  regraph-data:`;

  const apiAuthExample = `curl -X POST https://api.regraph.tech/v1/inference \\
  -H "Authorization: Bearer rg_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama-3.1-70b",
    "prompt": "Explain quantum computing",
    "max_tokens": 500
  }'`;

  const apiResponseExample = `{
  "id": "inf_abc123",
  "object": "inference",
  "created": 1699876543,
  "model": "llama-3.1-70b",
  "choices": [
    {
      "index": 0,
      "text": "Quantum computing is a type of computation...",
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 5,
    "completion_tokens": 250,
    "total_tokens": 255
  }
}`;

  const trainingExample = `curl -X POST https://api.regraph.tech/v1/training/jobs \\
  -H "Authorization: Bearer rg_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "base_model": "llama-3.1-8b",
    "dataset_url": "https://your-storage.com/dataset.jsonl",
    "hyperparameters": {
      "epochs": 3,
      "learning_rate": 2e-5,
      "batch_size": 4
    }
  }'`;

  const batchExample = `curl -X POST https://api.regraph.tech/v1/batch \\
  -H "Authorization: Bearer rg_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requests": [
      {"model": "llama-3.1-70b", "prompt": "Summarize: ..."},
      {"model": "llama-3.1-70b", "prompt": "Translate: ..."},
      {"model": "llama-3.1-70b", "prompt": "Analyze: ..."}
    ],
    "webhook_url": "https://your-app.com/webhook"
  }'`;

  const sidebarItems = [
    { id: "getting-started", label: "Getting Started", icon: Book },
    { id: "provider-setup", label: "Provider Setup", icon: Server },
    { id: "api-playground", label: "API Playground", icon: PlayCircle },
    { id: "api-reference", label: "API Reference", icon: Webhook },
    { id: "authentication", label: "Authentication", icon: Key },
    { id: "inference", label: "Inference API", icon: Zap },
    { id: "training", label: "Training API", icon: Cpu },
    { id: "batch", label: "Batch Processing", icon: Database },
    { id: "security", label: "Security", icon: Shield },
  ];

  const [activeSection, setActiveSection] = useState("getting-started");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-20 pb-16">
        <div className="container px-4">
          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-24 space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                  Documentation
                </h3>
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeSection === item.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Getting Started */}
                <section id="getting-started" className="mb-16">
                  <h1 className="text-4xl font-bold mb-4">
                    <span className="text-gradient">ReGraph</span> Documentation
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8">
                    Complete guide to integrating with the ReGraph decentralized AI compute network.
                  </p>
                  
                  <div className="glass-card p-6 rounded-xl mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Quick Start
                    </h3>
                    <ol className="space-y-3 text-muted-foreground">
                      <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-medium shrink-0">1</span>
                        <span>Create an account and get your API key from the dashboard</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-medium shrink-0">2</span>
                        <span>Install the SDK or use our REST API directly</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-medium shrink-0">3</span>
                        <span>Make your first inference request</span>
                      </li>
                    </ol>
                  </div>
                </section>

                {/* Provider Setup */}
                <section id="provider-setup" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Server className="h-8 w-8 text-primary" />
                    Provider Setup
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Share your hardware resources and earn rewards by becoming a ReGraph compute provider.
                  </p>

                  <Tabs defaultValue="docker" className="mb-8">
                    <TabsList className="mb-4">
                      <TabsTrigger value="docker">Docker (Recommended)</TabsTrigger>
                      <TabsTrigger value="linux">Linux/macOS</TabsTrigger>
                      <TabsTrigger value="windows">Windows</TabsTrigger>
                    </TabsList>

                    <TabsContent value="docker">
                      <div className="glass-card p-6 rounded-xl">
                        <h4 className="font-semibold mb-4">Docker Compose Installation</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          The recommended way to run the ReGraph agent in production. Supports GPU passthrough and automatic restarts.
                        </p>
                        
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-mono">docker-compose.yml</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(dockerComposeExample, "docker")}
                            >
                              {copiedSection === "docker" ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <CodeBlock code={dockerComposeExample} language="yaml" />
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p><strong>Steps:</strong></p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Get your connection key from the dashboard</li>
                            <li>Replace <code className="text-primary">rgc_your_connection_key_here</code> with your key</li>
                            <li>Run <code className="text-primary">docker-compose up -d</code></li>
                            <li>Check status with <code className="text-primary">docker-compose logs -f</code></li>
                          </ol>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="linux">
                      <div className="glass-card p-6 rounded-xl">
                        <h4 className="font-semibold mb-4">Linux/macOS Installation</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          One-line installation script for Linux and macOS systems.
                        </p>
                        
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-mono">Terminal</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(installScriptBash, "bash")}
                            >
                              {copiedSection === "bash" ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <CodeBlock code={installScriptBash} language="bash" />
                        </div>

                        <p className="text-sm text-muted-foreground">
                          The script will detect your hardware, install dependencies, and configure the agent automatically.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="windows">
                      <div className="glass-card p-6 rounded-xl">
                        <h4 className="font-semibold mb-4">Windows Installation</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          PowerShell installation script for Windows systems.
                        </p>
                        
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-mono">PowerShell (Admin)</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(installScriptPowershell, "powershell")}
                            >
                              {copiedSection === "powershell" ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <CodeBlock code={installScriptPowershell} language="powershell" />
                        </div>

                        <p className="text-sm text-muted-foreground">
                          Run PowerShell as Administrator. The script will install CUDA drivers if needed.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="glass-card p-6 rounded-xl border-l-4 border-l-yellow-500">
                    <h4 className="font-semibold mb-2">Hardware Requirements</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>GPU:</strong> NVIDIA GPU with 8GB+ VRAM (RTX 3070 or better recommended)</li>
                      <li>• <strong>CPU:</strong> Modern x86_64 processor (Intel/AMD)</li>
                      <li>• <strong>RAM:</strong> 16GB minimum, 32GB recommended</li>
                      <li>• <strong>Storage:</strong> 100GB+ SSD for model caching</li>
                      <li>• <strong>Network:</strong> Stable internet connection, 100Mbps+ recommended</li>
                    </ul>
                  </div>
                </section>

                {/* API Playground */}
                <section id="api-playground" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <PlayCircle className="h-8 w-8 text-primary" />
                    API Playground
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Test API requests interactively. Select an endpoint, configure parameters, and see the response in real-time.
                  </p>

                  <ApiPlayground />
                </section>

                {/* API Reference */}
                <section id="api-reference" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Webhook className="h-8 w-8 text-primary" />
                    API Reference
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    The ReGraph API provides programmatic access to distributed AI compute resources.
                  </p>

                  <div className="glass-card p-6 rounded-xl mb-6">
                    <h4 className="font-semibold mb-4">Base URL</h4>
                    <code className="text-primary bg-primary/10 px-3 py-1 rounded">
                      https://api.regraph.tech/v1
                    </code>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4">Method</th>
                          <th className="text-left py-3 px-4">Endpoint</th>
                          <th className="text-left py-3 px-4">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="py-3 px-4"><span className="text-green-500 font-mono">POST</span></td>
                          <td className="py-3 px-4 font-mono text-xs">/inference</td>
                          <td className="py-3 px-4 text-muted-foreground">Run model inference</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4"><span className="text-green-500 font-mono">POST</span></td>
                          <td className="py-3 px-4 font-mono text-xs">/training/jobs</td>
                          <td className="py-3 px-4 text-muted-foreground">Start a training job</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4"><span className="text-blue-500 font-mono">GET</span></td>
                          <td className="py-3 px-4 font-mono text-xs">/training/jobs/:id</td>
                          <td className="py-3 px-4 text-muted-foreground">Get training job status</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4"><span className="text-green-500 font-mono">POST</span></td>
                          <td className="py-3 px-4 font-mono text-xs">/batch</td>
                          <td className="py-3 px-4 text-muted-foreground">Submit batch inference</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4"><span className="text-blue-500 font-mono">GET</span></td>
                          <td className="py-3 px-4 font-mono text-xs">/models</td>
                          <td className="py-3 px-4 text-muted-foreground">List available models</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4"><span className="text-blue-500 font-mono">GET</span></td>
                          <td className="py-3 px-4 font-mono text-xs">/usage</td>
                          <td className="py-3 px-4 text-muted-foreground">Get usage statistics</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Authentication */}
                <section id="authentication" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Key className="h-8 w-8 text-primary" />
                    Authentication
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    All API requests require authentication using Bearer tokens.
                  </p>

                  <div className="glass-card p-6 rounded-xl mb-6">
                    <h4 className="font-semibold mb-4">API Key Format</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      API keys are prefixed with <code className="text-primary">rg_</code> for easy identification.
                    </p>
                    <code className="text-primary bg-primary/10 px-3 py-2 rounded block">
                      Authorization: Bearer rg_your_api_key_here
                    </code>
                  </div>

                  <div className="glass-card p-6 rounded-xl border-l-4 border-l-red-500">
                    <h4 className="font-semibold mb-2">⚠️ Security Best Practices</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Never expose API keys in client-side code</li>
                      <li>• Use environment variables to store keys</li>
                      <li>• Rotate keys periodically from the dashboard</li>
                      <li>• Use separate keys for development and production</li>
                    </ul>
                  </div>
                </section>

                {/* Inference API */}
                <section id="inference" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Zap className="h-8 w-8 text-primary" />
                    Inference API
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Run AI model inference on distributed compute resources.
                  </p>

                  <div className="space-y-6">
                    <div className="glass-card p-6 rounded-xl">
                      <h4 className="font-semibold mb-4">Request Example</h4>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-mono">POST /v1/inference</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(apiAuthExample, "inference")}
                        >
                          {copiedSection === "inference" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <CodeBlock code={apiAuthExample} language="bash" />
                    </div>

                    <div className="glass-card p-6 rounded-xl">
                      <h4 className="font-semibold mb-4">Response Example</h4>
                      <CodeBlock code={apiResponseExample} language="json" />
                    </div>

                    <div className="glass-card p-6 rounded-xl">
                      <h4 className="font-semibold mb-4">Request Parameters</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-3">Parameter</th>
                              <th className="text-left py-2 px-3">Type</th>
                              <th className="text-left py-2 px-3">Required</th>
                              <th className="text-left py-2 px-3">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-muted-foreground">
                            <tr>
                              <td className="py-2 px-3 font-mono text-primary">model</td>
                              <td className="py-2 px-3">string</td>
                              <td className="py-2 px-3">Yes</td>
                              <td className="py-2 px-3">Model identifier</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 font-mono text-primary">prompt</td>
                              <td className="py-2 px-3">string</td>
                              <td className="py-2 px-3">Yes</td>
                              <td className="py-2 px-3">Input text prompt</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 font-mono text-primary">max_tokens</td>
                              <td className="py-2 px-3">integer</td>
                              <td className="py-2 px-3">No</td>
                              <td className="py-2 px-3">Maximum tokens to generate (default: 256)</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 font-mono text-primary">temperature</td>
                              <td className="py-2 px-3">float</td>
                              <td className="py-2 px-3">No</td>
                              <td className="py-2 px-3">Sampling temperature 0-2 (default: 0.7)</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 font-mono text-primary">stream</td>
                              <td className="py-2 px-3">boolean</td>
                              <td className="py-2 px-3">No</td>
                              <td className="py-2 px-3">Enable streaming response (default: false)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Training API */}
                <section id="training" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Cpu className="h-8 w-8 text-primary" />
                    Training API
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Fine-tune models on your own data using distributed GPU resources.
                  </p>

                  <div className="glass-card p-6 rounded-xl mb-6">
                    <h4 className="font-semibold mb-4">Start Training Job</h4>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-mono">POST /v1/training/jobs</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(trainingExample, "training")}
                      >
                        {copiedSection === "training" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <CodeBlock code={trainingExample} language="bash" />
                  </div>

                  <div className="glass-card p-6 rounded-xl">
                    <h4 className="font-semibold mb-4">Training Parameters</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3">Parameter</th>
                            <th className="text-left py-2 px-3">Type</th>
                            <th className="text-left py-2 px-3">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-muted-foreground">
                          <tr>
                            <td className="py-2 px-3 font-mono text-primary">base_model</td>
                            <td className="py-2 px-3">string</td>
                            <td className="py-2 px-3">Base model to fine-tune</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-mono text-primary">dataset_url</td>
                            <td className="py-2 px-3">string</td>
                            <td className="py-2 px-3">URL to training dataset (JSONL format)</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-mono text-primary">epochs</td>
                            <td className="py-2 px-3">integer</td>
                            <td className="py-2 px-3">Number of training epochs (1-10)</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-mono text-primary">learning_rate</td>
                            <td className="py-2 px-3">float</td>
                            <td className="py-2 px-3">Learning rate (default: 2e-5)</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-mono text-primary">webhook_url</td>
                            <td className="py-2 px-3">string</td>
                            <td className="py-2 px-3">URL for job status notifications</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {/* Batch Processing */}
                <section id="batch" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Database className="h-8 w-8 text-primary" />
                    Batch Processing
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Process multiple inference requests efficiently with our batch API.
                  </p>

                  <div className="glass-card p-6 rounded-xl mb-6">
                    <h4 className="font-semibold mb-4">Submit Batch Request</h4>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-mono">POST /v1/batch</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(batchExample, "batch")}
                      >
                        {copiedSection === "batch" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <CodeBlock code={batchExample} language="bash" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="glass-card p-5 rounded-xl">
                      <h4 className="font-semibold mb-2">Benefits</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Up to 50% cost savings vs individual requests</li>
                        <li>• Process up to 10,000 requests per batch</li>
                        <li>• Automatic retry on failures</li>
                        <li>• Webhook notifications on completion</li>
                      </ul>
                    </div>
                    <div className="glass-card p-5 rounded-xl">
                      <h4 className="font-semibold mb-2">Use Cases</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Document processing pipelines</li>
                        <li>• Data classification at scale</li>
                        <li>• Content generation workflows</li>
                        <li>• Nightly data enrichment jobs</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Security */}
                <section id="security" className="mb-16">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    Security
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    ReGraph implements multiple security layers to protect your data and compute resources.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="glass-card p-5 rounded-xl">
                      <h4 className="font-semibold mb-3">Data Protection</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>End-to-end encryption for all data in transit</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>No persistent storage of inference data</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>SOC 2 Type II compliance</span>
                        </li>
                      </ul>
                    </div>
                    <div className="glass-card p-5 rounded-xl">
                      <h4 className="font-semibold mb-3">Access Control</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>Granular API key permissions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>IP allowlisting available</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>Rate limiting and abuse protection</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Need Help */}
                <section className="glass-card p-8 rounded-xl text-center">
                  <h3 className="text-2xl font-bold mb-4">Need Help?</h3>
                  <p className="text-muted-foreground mb-6">
                    Our team is here to help you integrate ReGraph into your applications.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button variant="outline" asChild>
                      <a href="mailto:support@regraph.tech">Contact Support</a>
                    </Button>
                    <Button className="glow-primary" asChild>
                      <a href="/dashboard">
                        <Terminal className="mr-2 h-4 w-4" />
                        Go to Dashboard
                      </a>
                    </Button>
                  </div>
                </section>
              </motion.div>
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Docs;
