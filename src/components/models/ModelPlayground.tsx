import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Copy, Check, Loader2, Settings2, X, AlertCircle, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Model } from "./ModelCard";
import CodeBlock from "@/components/CodeBlock";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ModelPlaygroundProps {
  model: Model | null;
  onClose: () => void;
}

const INFERENCE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-inference`;

const ModelPlayground = ({ model, onClose }: ModelPlaygroundProps) => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([512]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!model) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Select a Model</p>
          <p className="text-sm">Choose a model from the list to start testing in the playground.</p>
        </CardContent>
      </Card>
    );
  }

  const handleRun = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setResponse("");
    setImageUrl(null);
    setError(null);

    try {
      const resp = await fetch(INFERENCE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          model: model.id,
          prompt: prompt,
          temperature: temperature[0],
          maxTokens: maxTokens[0],
          category: model.category,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        if (resp.status === 429) {
          const msg = data?.error || "Rate limit exceeded. Please wait a moment and try again.";
          setError(msg);
          toast.error("Rate limit exceeded");
        } else if (resp.status === 402) {
          const msg = data?.error || "Insufficient credits. Please top up your account.";
          setError(msg);
          toast.error("Insufficient credits");
        } else {
          // Surface upstream details from the backend (helps debug VseGPT param/model issues)
          const upstream = data?.upstream_body ? `\n\nUpstream: ${data.upstream_body}` : "";
          const msg = (data?.error || "Failed to get response from the model") + upstream;
          setError(msg);
          toast.error("Inference failed");
        }
        return;
      }

      setResponse(data.response);
      
      // Handle image URL from image generation models
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        toast.success("Image generated successfully!");
      } else if (data.usage) {
        const tokens = data.usage.total_tokens || 0;
        const costUsd = (tokens / 1000) * 0.001;
        toast.success(`Generated! Cost: $${costUsd.toFixed(6)}`);
      }
    } catch (err) {
      console.error("Inference error:", err);
      setError("Failed to connect to the inference API");
      toast.error("Connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const curlExample = `curl -X POST https://api.regraph.tech/v1/inference \\
  -H "Authorization: Bearer rg_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model.id}",
    "prompt": "${prompt.slice(0, 50).replace(/"/g, '\\"')}${prompt.length > 50 ? "..." : ""}",
    "temperature": ${temperature[0]},
    "max_tokens": ${maxTokens[0]}
  }'`;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
            {model.name}
            <Badge variant="secondary">{model.provider}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="shrink-0 h-10 w-10 md:h-8 md:w-8"
        >
          <X className="h-5 w-5 md:h-4 md:w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input */}
        <div>
          <Label htmlFor="prompt" className="mb-2 block">Prompt</Label>
          <Textarea
            id="prompt"
            placeholder={
              model.category === "image-gen" 
                ? "A futuristic cityscape at sunset, cyberpunk style, highly detailed..." 
                : model.category === "code"
                ? "Write a Python function that calculates the Fibonacci sequence..."
                : "Enter your prompt here..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] resize-none"
          />
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">{temperature[0]}</span>
            </div>
            <Slider
              value={temperature}
              onValueChange={setTemperature}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Controls randomness. Lower = more focused, higher = more creative.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Max Tokens</Label>
              <span className="text-sm text-muted-foreground">{maxTokens[0]}</span>
            </div>
            <Slider
              value={maxTokens}
              onValueChange={setMaxTokens}
              min={64}
              max={4096}
              step={64}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Maximum length of the generated response.</p>
          </div>
        </div>

        {/* Run Button */}
        <Button 
          onClick={handleRun} 
          disabled={!prompt.trim() || isLoading}
          className="w-full glow-primary"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Inference
            </>
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Generated Image */}
        {imageUrl && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Generated Image</Label>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.open(imageUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                >
                  <a href={imageUrl} download="generated-image.png">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="relative bg-secondary/50 rounded-lg p-4 flex items-center justify-center">
              <img 
                src={imageUrl} 
                alt="Generated image" 
                className="max-w-full max-h-[500px] rounded-lg shadow-lg object-contain"
                onError={(e) => {
                  console.error("Failed to load image:", imageUrl);
                  e.currentTarget.style.display = 'none';
                  setError("Failed to load the generated image. The URL may have expired.");
                }}
              />
            </div>
          </div>
        )}

        {/* Response */}
        {response && !imageUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Response</Label>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="markdown-response bg-secondary/50 rounded-lg p-4 text-sm max-h-[400px] overflow-y-auto">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
                    
                    if (!inline && match) {
                      return (
                        <CodeBlock 
                          code={codeString} 
                          language={match[1]} 
                        />
                      );
                    }
                    
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre({ children }: any) {
                    return <>{children}</>;
                  },
                  table({ children }: any) {
                    return (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-border">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }: any) {
                    return (
                      <th className="border border-border bg-secondary/50 px-3 py-2 text-left font-semibold">
                        {children}
                      </th>
                    );
                  },
                  td({ children }: any) {
                    return (
                      <td className="border border-border px-3 py-2">
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {response}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* API Example */}
        <div className="space-y-2">
          <Label>API Request</Label>
          <CodeBlock code={curlExample} language="bash" />
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelPlayground;