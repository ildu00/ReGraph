import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Copy, Check, Loader2, Settings2, X, AlertCircle, Download, ExternalLink, Film, Upload, ImageIcon, Mic, XCircle, FileText } from "lucide-react";
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
const VIDEO_STATUS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-status`;

// Categories that require a file upload
const IMAGE_INPUT_CATEGORIES = ["img2vid", "vision", "multimodal", "image-edit", "ocr"];
const AUDIO_INPUT_CATEGORIES = ["audio"];
const DOCUMENT_INPUT_CATEGORIES = ["document"];

function getFileAccept(category: string): string {
  if (IMAGE_INPUT_CATEGORIES.includes(category)) return "image/*";
  if (AUDIO_INPUT_CATEGORIES.includes(category)) return "audio/*,video/*";
  if (DOCUMENT_INPUT_CATEGORIES.includes(category)) return ".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,image/*";
  return "*";
}

function getUploadLabel(category: string): string {
  if (IMAGE_INPUT_CATEGORIES.includes(category)) return "Input Image";
  if (AUDIO_INPUT_CATEGORIES.includes(category)) return "Audio / Video File";
  if (DOCUMENT_INPUT_CATEGORIES.includes(category)) return "Document / File";
  return "Input File";
}

function getUploadHint(category: string): string {
  if (category === "img2vid") return "Upload a reference image to animate into a video.";
  if (category === "vision" || category === "multimodal") return "Upload an image for the model to analyze.";
  if (category === "image-edit") return "Upload the image you want to edit.";
  if (category === "ocr") return "Upload an image containing text to extract.";
  if (category === "audio") return "Upload an audio or video file for transcription.";
  if (category === "document") return "Upload a PDF or document for analysis and extraction.";
  return "Upload the input file.";
}

function needsFileUpload(category: string): boolean {
  return IMAGE_INPUT_CATEGORIES.includes(category)
    || AUDIO_INPUT_CATEGORIES.includes(category)
    || DOCUMENT_INPUT_CATEGORIES.includes(category);
}

function isImageCategory(category: string): boolean {
  return IMAGE_INPUT_CATEGORIES.includes(category);
}

const ModelPlayground = ({ model, onClose }: ModelPlaygroundProps) => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([512]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoRequestId, setVideoRequestId] = useState<string | null>(null);
  const [videoPolling, setVideoPolling] = useState(false);
  const [videoPollSeconds, setVideoPollSeconds] = useState(0);
  const [isAudioPolling, setIsAudioPolling] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset file when model changes
  useEffect(() => {
    setUploadedFile(null);
    setUploadedFilePreview(null);
    setUploadedFileUrl(null);
  }, [model?.id]);

  // Client-side polling for video generation
  useEffect(() => {
    if (!videoRequestId) return;

    setVideoPolling(true);
    pollCountRef.current = 0;
    setVideoPollSeconds(0);

    const tick = setInterval(() => {
      setVideoPollSeconds(s => s + 1);
    }, 1000);

    const poll = async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 20) {
        clearInterval(pollIntervalRef.current!);
        clearInterval(tick);
        setVideoPolling(false);
        toast.error("Video generation timed out. Please try again.");
        setVideoRequestId(null);
        return;
      }

      try {
        const res = await fetch(`${VIDEO_STATUS_URL}?request_id=${videoRequestId}`, {
          headers: { "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
        const data = await res.json();

        if (data.status === "COMPLETED" && data.videoUrl) {
          clearInterval(pollIntervalRef.current!);
          clearInterval(tick);
          setVideoPolling(false);
          setVideoRequestId(null);
          setImageUrl(data.videoUrl);
          toast.success("🎬 Video ready!");
        } else if (data.status === "FAILED") {
          clearInterval(pollIntervalRef.current!);
          clearInterval(tick);
          setVideoPolling(false);
          setVideoRequestId(null);
          toast.error("Video generation failed on provider side.");
          setError("Video generation failed. Please try a different model or prompt.");
        }
      } catch {
        // Network error — keep trying
      }
    };

    pollIntervalRef.current = setInterval(poll, 15_000);
    setTimeout(poll, 20_000);

    return () => {
      clearInterval(pollIntervalRef.current!);
      clearInterval(tick);
    };
  }, [videoRequestId]);

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    setUploadedFileUrl(null);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setUploadedFilePreview(null);
    }

    // Upload to Supabase Storage
    setIsUploading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split(".").pop() || "bin";
      const path = `playground/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("claw-images")
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("claw-images").getPublicUrl(path);
      setUploadedFileUrl(urlData.publicUrl);
      toast.success("File uploaded ✓");
    } catch (e: any) {
      toast.error("Upload failed: " + (e?.message || "Unknown error"));
      setUploadedFile(null);
      setUploadedFilePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setUploadedFilePreview(null);
    setUploadedFileUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
    if (!prompt.trim() && !uploadedFileUrl) return;
    if (needsFileUpload(model.category) && !uploadedFileUrl) {
      toast.error("Please upload a file first.");
      return;
    }

    setIsLoading(true);
    setResponse("");
    setImageUrl(null);
    setAudioUrl(null);
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
          ...(uploadedFileUrl ? { imageUrl: uploadedFileUrl } : {}),
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
          const upstream = data?.upstream_body ? `\n\nUpstream: ${data.upstream_body}` : "";
          const msg = (data?.error || "Failed to get response from the model") + upstream;
          setError(msg);
          toast.error("Inference failed");
        }
        return;
      }

      setResponse(data.response);

      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        toast.success("🎵 Music generated!");
      } else if (data.videoUrl) {
        setImageUrl(data.videoUrl);
        toast.success("Video generated successfully!");
      } else if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        toast.success("Image generated successfully!");
      } else if (data.audioRequestId || (data.videoRequestId && data.isAudio)) {
        const reqId = data.audioRequestId || data.videoRequestId;
        setVideoRequestId(reqId);
        setIsAudioPolling(true);
        toast.info("🎵 Music is being generated. Checking status automatically...");
      } else if (data.videoRequestId) {
        setVideoRequestId(data.videoRequestId);
        setIsAudioPolling(false);
        toast.info("🎬 Video is being generated. Checking status automatically...");
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

  const isVideo = model.category === "video" || model.category === "img2vid";
  const requiresFile = needsFileUpload(model.category);
  const promptOptional = requiresFile && AUDIO_INPUT_CATEGORIES.includes(model.category);

  const curlExample = `curl -X POST https://api.regraph.tech/v1/inference \\
  -H "Authorization: Bearer rg_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model.id}",
    "prompt": "${prompt.slice(0, 50).replace(/"/g, '\\"')}${prompt.length > 50 ? "..." : ""}",
    "temperature": ${temperature[0]},
    "max_tokens": ${maxTokens[0]}${uploadedFileUrl ? `,\n    "image_url": "${uploadedFileUrl}"` : ""}
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

        {/* File Upload (for img2vid, vision, audio, etc.) */}
        {requiresFile && (
          <div className="space-y-2">
            <Label>{getUploadLabel(model.category)}</Label>
            <p className="text-xs text-muted-foreground">{getUploadHint(model.category)}</p>

            {!uploadedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 flex flex-col items-center gap-3 transition-colors cursor-pointer bg-secondary/20 hover:bg-secondary/40"
              >
                {isImageCategory(model.category) ? (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                ) : DOCUMENT_INPUT_CATEGORIES.includes(model.category) ? (
                  <FileText className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Mic className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isImageCategory(model.category) ? "PNG, JPG, WEBP, GIF" : DOCUMENT_INPUT_CATEGORIES.includes(model.category) ? "PDF, DOCX, XLSX, PPTX, images" : "MP3, WAV, M4A, MP4, WEBM"}
                  </p>
                </div>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </button>
            ) : (
              <div className="relative border border-border rounded-xl overflow-hidden bg-secondary/20">
                {/* Image preview */}
                {uploadedFilePreview && (
                  <div className="flex justify-center p-3 bg-secondary/30">
                    <img
                      src={uploadedFilePreview}
                      alt="Upload preview"
                      className="max-h-48 rounded-lg object-contain"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-3">
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : uploadedFileUrl ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm flex-1 truncate text-muted-foreground">
                    {isUploading ? "Uploading..." : (uploadedFileUrl ? "Uploaded" : "Processing...")} — {uploadedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearUploadedFile}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={getFileAccept(model.category)}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>
        )}

        {/* Prompt input */}
        <div>
          <Label htmlFor="prompt" className="mb-2 block">
            Prompt {promptOptional && <span className="text-muted-foreground font-normal">(optional)</span>}
          </Label>
          <Textarea
            id="prompt"
            placeholder={
              model.category === "img2vid"
                ? "Describe the motion or animation (e.g. 'the camera slowly zooms in, gentle breeze moves the hair')..."
                : model.category === "vision" || model.category === "multimodal"
                ? "What do you want to know about this image? (e.g. 'Describe what you see')"
                : model.category === "image-edit"
                ? "Describe the edit (e.g. 'Make the background a sunny beach')..."
                : model.category === "audio"
                ? "Optional: language hint or instructions (e.g. 'Transcribe in English')..."
                : model.category === "image-gen"
                ? "A futuristic cityscape at sunset, cyberpunk style, highly detailed..."
                : model.category === "code"
                ? "Write a Python function that calculates the Fibonacci sequence..."
                : "Enter your prompt here..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* Parameters — hide for audio/img2vid */}
        {!["audio", "img2vid", "video", "image-gen", "image-edit"].includes(model.category) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="text-sm text-muted-foreground">{temperature[0]}</span>
              </div>
              <Slider value={temperature} onValueChange={setTemperature} min={0} max={2} step={0.1} className="w-full" />
              <p className="text-xs text-muted-foreground">Controls randomness. Lower = more focused, higher = more creative.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max Tokens</Label>
                <span className="text-sm text-muted-foreground">{maxTokens[0]}</span>
              </div>
              <Slider value={maxTokens} onValueChange={setMaxTokens} min={64} max={4096} step={64} className="w-full" />
              <p className="text-xs text-muted-foreground">Maximum length of the generated response.</p>
            </div>
          </div>
        )}

        {/* Run Button */}
        <Button
          onClick={handleRun}
          disabled={
            isLoading ||
            isUploading ||
            (requiresFile && !uploadedFileUrl) ||
            (!requiresFile && !prompt.trim())
          }
          className="w-full glow-primary"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading file...
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

        {/* Video polling indicator */}
        {videoPolling && (
          <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <Film className="h-5 w-5 shrink-0 text-primary animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">🎬 Generating video... {videoPollSeconds}s</p>
              <p className="text-xs text-muted-foreground mt-0.5">Video models typically take 1–3 minutes. Please wait.</p>
            </div>
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          </div>
        )}

        {/* Generated Audio (music-gen) */}
        {audioUrl && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Generated Audio</Label>
              <Button variant="ghost" size="sm" asChild>
                <a href={audioUrl} download="generated-music.mp3"><Download className="h-4 w-4" /></a>
              </Button>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <audio controls autoPlay src={audioUrl} className="w-full" />
            </div>
          </div>
        )}

        {/* Generated Image or Video */}
        {imageUrl && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{isVideo ? "Generated Video" : "Generated Image"}</Label>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => window.open(imageUrl, "_blank")}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={imageUrl} download={isVideo ? "generated-video.mp4" : "generated-image.png"}>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="relative bg-secondary/50 rounded-lg p-4 flex items-center justify-center">
              {isVideo ? (
                <video
                  src={imageUrl}
                  controls
                  autoPlay
                  loop
                  className="max-w-full max-h-[500px] rounded-lg shadow-lg"
                  onError={() => setError("Failed to load the generated video. The URL may have expired.")}
                />
              ) : (
                <img
                  src={imageUrl}
                  alt="Generated"
                  className="max-w-full max-h-[500px] rounded-lg shadow-lg object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    setError("Failed to load the generated image. The URL may have expired.");
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Response */}
        {response && !imageUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Response</Label>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="markdown-response bg-secondary/50 rounded-lg p-4 text-sm max-h-[400px] overflow-y-auto">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
                    if (!inline && match) return <CodeBlock code={codeString} language={match[1]} />;
                    return <code className={className} {...props}>{children}</code>;
                  },
                  pre({ children }: any) { return <>{children}</>; },
                  table({ children }: any) {
                    return (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-border">{children}</table>
                      </div>
                    );
                  },
                  th({ children }: any) {
                    return <th className="border border-border bg-secondary/50 px-3 py-2 text-left font-semibold">{children}</th>;
                  },
                  td({ children }: any) {
                    return <td className="border border-border px-3 py-2">{children}</td>;
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
