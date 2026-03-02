import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, Send, Loader2, Bot, User, Copy, Check,
  Calculator, Code2, Globe, Image, BookOpen, Wrench, Plus,
  ImagePlus, FileUp, X, Volume2, Download, FileText
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "@/components/CodeBlock";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClawAgent, TOOLS } from "./AgentFormModal";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_name?: string | null;
  tool_input?: any;
  tool_result?: any;
  isStreaming?: boolean;
}

interface AgentChatProps {
  agent: ClawAgent;
  onBack: () => void;
}

const TOOL_ICONS: Record<string, any> = {
  calculator: Calculator,
  code_interpreter: Code2,
  web_search: Globe,
  image_generation: Image,
  document_reader: BookOpen,
  voice_message: Volume2,
  file_generator: FileText,
};

// ── Tool executor ──────────────────────────────────────────────────────────
async function executeTool(name: string, input: any, apiKey: string, jwtToken?: string): Promise<any> {
  switch (name) {
    case "calculator": {
      try {
        const expr = String(input?.expression || input?.query || "").replace(/[^0-9+\-*/().%\s]/g, "");
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + expr + ')')();
        return { result: String(result) };
      } catch {
        return { error: "Invalid expression" };
      }
    }
    case "web_search": {
      const query = input?.query || input?.expression || "";
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claw-web-search`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ query }),
          }
        );
        const data = await res.json();
        if (data.results?.length) {
          const formatted = data.results.map((r: any) => `**${r.title}**\n${r.url}\n${r.description || ""}`).join("\n\n");
          return { results: formatted };
        }
        return { results: "No results found." };
      } catch {
        return { error: "Web search failed." };
      }
    }
    case "code_interpreter": {
      const code = input?.code || input?.query || "";
      const language = input?.language || "javascript";
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claw-code-interpreter`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ code, language }),
          }
        );
        const data = await res.json();
        return data.error ? { error: data.error } : { output: data.output };
      } catch {
        return { error: "Code execution failed." };
      }
    }
    case "image_generation": {
      const prompt = input?.prompt || input?.query || "";
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-inference`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwtToken || apiKey}` },
            body: JSON.stringify({ model: "sdxl-1.0", prompt, category: "image-gen", maxTokens: 40000 }),
          }
        );
        const data = await res.json();
        const rawUrl: string | undefined = data?.imageUrl || data?.data?.[0]?.url || data?.url;
        if (!rawUrl) return { error: data?.error || "Image generation failed" };

        // If it's a base64 data URL — upload to storage in background, show image immediately
        if (rawUrl.startsWith("data:")) {
          // Upload to storage and return public URL
          try {
            const [meta, base64] = rawUrl.split(",");
            const mimeMatch = meta.match(/data:([^;]+);/);
            const mimeType = mimeMatch?.[1] || "image/png";
            const ext = mimeType.split("/")[1] || "png";
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: mimeType });
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from("claw-images")
              .upload(fileName, blob, { contentType: mimeType, upsert: false });
            if (uploadData?.path) {
              const { data: { publicUrl } } = supabase.storage.from("claw-images").getPublicUrl(uploadData.path);
              return { image_url: publicUrl };
            }
            if (uploadErr) console.warn("[image_generation] Storage upload failed:", uploadErr);
          } catch (uploadErr) {
            console.warn("[image_generation] Storage upload failed:", uploadErr);
          }
          // Fallback: return base64 (will be stripped before saving to DB)
          return { image_url: rawUrl };
        }

        return { image_url: rawUrl };
      } catch {
        return { error: "Image generation failed" };
      }
    }
    case "voice_message": {
      const text = input?.text || "";
      const voice = input?.voice || "nova";
      try {
        // Step 1: Generate audio
        const ttsRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audio-speech`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: "tts-openai/tts-1", input: text, voice, response_format: "mp3" }),
          }
        );
        if (!ttsRes.ok) {
          const errText = await ttsRes.text().catch(() => "");
          console.error("[voice_message] TTS failed:", ttsRes.status, errText);
          return { error: `TTS failed (${ttsRes.status})` };
        }
        const audioBuffer = await ttsRes.arrayBuffer();
        console.log("[voice_message] Got audio buffer, size:", audioBuffer.byteLength);

        // Step 2: Upload via service-role edge function (bypasses RLS)
        try {
          const uploadRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claw-upload-audio`,
            {
              method: "POST",
              headers: { "Content-Type": "audio/mpeg", Authorization: `Bearer ${apiKey}` },
              body: audioBuffer.slice(0),
            }
          );
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.audio_url) {
              console.log("[voice_message] Uploaded to storage:", uploadData.audio_url);
              return { audio_url: uploadData.audio_url };
            }
            console.warn("[voice_message] Upload ok but no audio_url:", uploadData);
          } else {
            const errText = await uploadRes.text().catch(() => "");
            console.warn("[voice_message] Upload function failed:", uploadRes.status, errText);
          }
        } catch (uploadErr) {
          console.warn("[voice_message] Upload exception:", uploadErr);
        }

        // Fallback: blob URL (works only in current session, won't persist)
        const blobUrl = URL.createObjectURL(new Blob([audioBuffer], { type: "audio/mpeg" }));
        console.warn("[voice_message] Using blob URL as fallback (won't persist)");
        return { audio_url: blobUrl };
      } catch (e) {
        console.error("[voice_message] Exception:", e);
        return { error: "Voice generation failed" };
      }
    }
    case "document_reader": {
      const attachedFiles: File[] = (input as any)?.__attachedFiles || [];
      const fileToRead = attachedFiles.find(f => !f.type.startsWith("image/")) || attachedFiles[0];
      if (!fileToRead) return { content: "No file attached. Please attach a document file in your message." };
      const ext = fileToRead.name.split('.').pop()?.toLowerCase() || '';
      try {
        // PDF and DOCX — send to edge function
        if (ext === 'pdf' || ext === 'docx') {
          const formData = new FormData();
          formData.append("file", fileToRead);
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claw-document-reader`,
            { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: formData }
          );
          const data = await res.json();
          return { content: data.content || data.error || `Could not parse ${ext.toUpperCase()}.` };
        }
        // Plain text files — read directly
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(fileToRead);
        });
        const preview = text.slice(0, 8000);
        return { content: `File: ${fileToRead.name}\n\n${preview}${text.length > 8000 ? "\n\n[Truncated — showing first 8000 chars]" : ""}` };
      } catch {
        return { error: "Could not read file." };
      }
    }
    case "file_generator": {
      const filename: string = input?.filename || "file";
      const format: string = (input?.format || "txt").toLowerCase();
      const content: string = input?.content || "";

      try {
        let blob: Blob;
        let finalFilename = filename;

        if (format === "txt") {
          blob = new Blob([content], { type: "text/plain" });
          if (!finalFilename.endsWith(".txt")) finalFilename += ".txt";
        } else if (format === "json") {
          let jsonContent = content;
          try { jsonContent = JSON.stringify(JSON.parse(content), null, 2); } catch { /* keep as-is */ }
          blob = new Blob([jsonContent], { type: "application/json" });
          if (!finalFilename.endsWith(".json")) finalFilename += ".json";
        } else if (format === "csv") {
          blob = new Blob([content], { type: "text/csv" });
          if (!finalFilename.endsWith(".csv")) finalFilename += ".csv";
        } else if (format === "xlsx" || format === "xls") {
          // Parse CSV or JSON-like content into worksheet
          const rows: string[][] = content.split("\n").filter(Boolean).map((row) =>
            row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
          );
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.aoa_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
          const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
          blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          finalFilename = finalFilename.replace(/\.(xls|csv|txt)$/i, "") + ".xlsx";
        } else if (format === "pdf") {
          const { jsPDF } = await import("jspdf");
          const doc = new jsPDF();

          // Load DejaVu Sans font which supports Cyrillic
          try {
            const fontRes = await fetch("https://cdn.jsdelivr.net/gh/dejavu-fonts/dejavu-fonts@2.37/ttf/DejaVuSans.ttf");
            const fontBuf = await fontRes.arrayBuffer();
            const fontBase64 = btoa(Array.from(new Uint8Array(fontBuf), b => String.fromCharCode(b)).join(""));
            doc.addFileToVFS("DejaVuSans.ttf", fontBase64);
            doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
            doc.setFont("DejaVuSans");
          } catch {
            // fallback to default font if fetch fails
          }

          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 15;
          const maxWidth = pageWidth - margin * 2;
          const lineHeight = 7;
          let y = 20;
          for (const line of content.split("\n")) {
            const wrapped = doc.splitTextToSize(line || " ", maxWidth);
            for (const wl of wrapped) {
              if (y > 275) { doc.addPage(); y = 20; }
              doc.text(wl, margin, y);
              y += lineHeight;
            }
          }
          const pdfBuf = doc.output("arraybuffer");
          blob = new Blob([pdfBuf], { type: "application/pdf" });
          finalFilename = finalFilename.replace(/\.(txt|csv|json|html)$/i, "") + ".pdf";
        } else {
          return { error: `Unsupported format: ${format}. Supported: txt, json, csv, xlsx, pdf` };
        }

        // Upload to storage for a permanent URL
        try {
          const storagePath = `files/${crypto.randomUUID()}_${finalFilename}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("claw-images")
            .upload(storagePath, blob, { contentType: blob.type, upsert: false });
          if (uploadErr) {
            console.error("[file_generator] Storage upload error:", uploadErr);
          } else if (uploadData?.path) {
            const { data: urlData } = supabase.storage.from("claw-images").getPublicUrl(uploadData.path);
            return { file_url: urlData.publicUrl, filename: finalFilename, format, size: blob.size };
          }
        } catch (uploadErr) {
          console.error("[file_generator] Storage upload exception:", uploadErr);
        }
        // Fallback: blob URL (works only in current session, no persistence)
        const blobUrl = URL.createObjectURL(blob);
        return { file_url: blobUrl, filename: finalFilename, format, size: blob.size, isBlobUrl: true };
      } catch (e: any) {
        return { error: `File generation failed: ${e.message}` };
      }
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Build tool definitions for OpenAI function-calling ─────────────────────
function buildToolDefs(toolIds: string[]) {
  const defs: any[] = [];
  if (toolIds.includes("calculator")) {
    defs.push({
      type: "function",
      function: {
        name: "calculator",
        description: "Evaluate a math expression. Returns the numeric result.",
        parameters: {
          type: "object",
          properties: { expression: { type: "string", description: "Math expression, e.g. '2 + 2 * 10'" } },
          required: ["expression"],
        },
      },
    });
  }
  if (toolIds.includes("web_search")) {
    defs.push({
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for up-to-date information.",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
    });
  }
  if (toolIds.includes("code_interpreter")) {
    defs.push({
      type: "function",
      function: {
        name: "code_interpreter",
        description: "Execute a code snippet and return output.",
        parameters: {
          type: "object",
          properties: {
            code: { type: "string", description: "Code to execute" },
            language: { type: "string", description: "Programming language" },
          },
          required: ["code"],
        },
      },
    });
  }
  if (toolIds.includes("image_generation")) {
    defs.push({
      type: "function",
      function: {
        name: "image_generation",
        description: "Generate an image from a text prompt.",
        parameters: {
          type: "object",
          properties: { prompt: { type: "string" } },
          required: ["prompt"],
        },
      },
    });
  }
  if (toolIds.includes("document_reader")) {
    defs.push({
      type: "function",
      function: {
        name: "document_reader",
        description: "Read and analyze a document.",
        parameters: {
          type: "object",
          properties: { filename: { type: "string" } },
          required: ["filename"],
        },
      },
    });
  }
  if (toolIds.includes("voice_message")) {
    defs.push({
      type: "function",
      function: {
        name: "voice_message",
        description: "Convert text to speech and send it as a voice message. Use when the user asks to speak, read aloud, or send a voice note.",
        parameters: {
          type: "object",
          properties: {
            text: { type: "string", description: "The text to convert to speech" },
            voice: { type: "string", enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"], description: "Voice style (default: nova)" },
          },
          required: ["text"],
        },
      },
    });
  }
  if (toolIds.includes("file_generator")) {
    defs.push({
      type: "function",
      function: {
        name: "file_generator",
        description: "Generate and download a file. Use when the user asks to create, export, or save a file in any format: TXT (plain text), JSON (structured data), CSV (spreadsheet/table data), XLSX (Excel spreadsheet), or PDF (document). Always use this tool when asked to 'create a file', 'export as', 'save as', or 'generate a [format] file'.",
        parameters: {
          type: "object",
          properties: {
            filename: { type: "string", description: "Name of the file without extension, e.g. 'report' or 'data'" },
            format: { type: "string", enum: ["txt", "json", "csv", "xlsx", "pdf"], description: "File format to generate" },
            content: { type: "string", description: "The full content of the file. For CSV/XLSX: comma-separated rows with newlines. For JSON: valid JSON string. For PDF/TXT: plain text." },
          },
          required: ["filename", "format", "content"],
        },
      },
    });
  }
  return defs;
}

const INFERENCE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/model-inference`;
const API_KEY_CACHE = "regraph-chat-api-key";

async function getOrCreateApiKey(userId: string): Promise<string | null> {
  const cached = sessionStorage.getItem(API_KEY_CACHE);
  if (cached) return cached;
  const { data: existing } = await supabase
    .from("api_keys").select("full_key").eq("is_active", true)
    .order("created_at", { ascending: true }).limit(1).single();
  if (existing?.full_key) { sessionStorage.setItem(API_KEY_CACHE, existing.full_key); return existing.full_key; }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let newKey = "rg_";
  for (let i = 0; i < 48; i++) newKey += chars.charAt(Math.floor(Math.random() * chars.length));
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(newKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  await supabase.from("api_keys").insert({ user_id: userId, name: "Default", key_prefix: newKey.substring(0, 10) + "...", key_hash: keyHash, full_key: newKey });
  sessionStorage.setItem(API_KEY_CACHE, newKey);
  return newKey;
}

// Stable audio player component — never re-mounts on re-render
function AudioPlayer({ content }: { content: string }) {
  const raw = content.slice(10);
  const audioSrc = raw.startsWith("http") || raw.startsWith("blob:")
    ? raw
    : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/claw-images/${raw}`;
  console.log("[AudioPlayer] src:", audioSrc);
  return (
    <div style={{ width: "100%", minWidth: 240, padding: "4px 0" }}>
      <audio
        controls
        preload="auto"
        src={audioSrc}
        style={{ width: "100%", minHeight: 54, display: "block" }}
        onError={(e) => console.error("[AudioPlayer] error loading:", audioSrc, e)}
        onCanPlay={() => console.log("[AudioPlayer] canplay:", audioSrc)}
      />
    </div>
  );
}

export default function AgentChat({ agent, onBack }: AgentChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFilesRef = useRef<File[]>([]);

  const enabledTools = TOOLS.filter((t) => agent.tools?.includes(t.id));

  // Load or create conversation
  useEffect(() => {
    if (!user || !agent.id) return;
    (async () => {
      setLoadingHistory(true);
      try {
        // Get latest conversation for this agent
        const { data: conv } = await supabase
          .from("claw_conversations")
          .select("id")
          .eq("user_id", user.id)
          .eq("agent_id", agent.id!)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        let convId = conv?.id;
        if (!convId) {
          const { data: newConv } = await supabase
            .from("claw_conversations")
            .insert({ user_id: user.id, agent_id: agent.id!, title: `Chat with ${agent.name}` })
            .select("id").single();
          convId = newConv?.id;
        }
        if (!convId) { setLoadingHistory(false); return; }
        setConversationId(convId);

        // Load messages (last 50, include tool_result for URLs but skip base64)
        // Fetch messages without tool_result to avoid loading heavy base64 blobs
        const { data: msgs } = await supabase
          .from("claw_messages")
          .select("id, role, content, tool_name, tool_input, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(50);

        // Fetch tool_results for media/file tool calls
        if (msgs) {
          const toolMsgIds = msgs
            .filter((m: any) => m.tool_name === "image_generation" || m.tool_name === "voice_message" || m.tool_name === "file_generator")
            .map((m: any) => m.id);

          let urlResults: Record<string, any> = {};
          if (toolMsgIds.length > 0) {
            const { data: toolMsgs } = await supabase
              .from("claw_messages")
              .select("id, tool_result")
              .in("id", toolMsgIds);
            if (toolMsgs) {
              for (const tm of toolMsgs) {
                if (!tm.tool_result) continue;
                const r = tm.tool_result as any;
                // Always store file_generator results (even without file_url — has filename/format)
                if (r.filename || r.file_url) { urlResults[tm.id] = r; continue; }
                const imageUrl = r.image_url;
                const audioUrl = r.audio_url;
                if (imageUrl && !imageUrl.startsWith("data:") && imageUrl !== "[image generated]") urlResults[tm.id] = r;
                else if (audioUrl) urlResults[tm.id] = r;
              }
            }
          }

          const msgsChron = [...msgs].reverse();

          // For each assistant text message that mentions a file (old "📄" format or any text after file_generator),
          // find the preceding file_generator tool result and attach it so we can render a download card
          const fileResultByAssistantId: Record<string, any> = {};
          for (let i = 0; i < msgsChron.length; i++) {
            const m = msgsChron[i];
            if (m.role === "assistant" && m.content && !m.content.startsWith("__FILE__:") && !m.content.startsWith("__AUDIO__:")) {
              // Check if previous tool message in this turn was file_generator
              for (let j = i - 1; j >= 0; j--) {
                const prev = msgsChron[j];
                if (prev.role === "user") break;
                if (prev.role === "tool" && prev.tool_name === "file_generator") {
                  const tr = urlResults[prev.id];
                  if (tr) fileResultByAssistantId[m.id] = tr;
                  break;
                }
              }
            }
          }

          setMessages(msgsChron.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            tool_name: m.tool_name,
            tool_input: m.tool_input,
            tool_result: urlResults[m.id] ?? (fileResultByAssistantId[m.id] ? { __legacyFileResult: fileResultByAssistantId[m.id] } : null),
          })));
        }
      } catch (e) {
        console.error("[AgentChat] Failed to load history:", e);
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, [user, agent.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);
    return () => clearTimeout(t);
  }, [messages]);

  // Scroll to bottom when keyboard opens (visualViewport resize)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // After history finishes loading (including image fetches), scroll to bottom
  useEffect(() => {
    if (!loadingHistory) {
      // Use a small delay to allow images to render and expand layout
      const t = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [loadingHistory]);

  const persistMessage = useCallback(async (convId: string, msg: Omit<Message, "id" | "isStreaming">) => {
    const { data } = await supabase.from("claw_messages").insert({
      conversation_id: convId,
      role: msg.role,
      content: msg.content,
      tool_name: msg.tool_name || null,
      tool_input: msg.tool_input || null,
      tool_result: msg.tool_result || null,
    }).select("id").single();
    return data?.id as string;
  }, []);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading || !user || !conversationId) return;
    const userText = input.trim();
    const filesToProcess = attachedFiles;
    // Reset synchronously so iOS Safari keeps keyboard focus
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
    setAttachedFiles([]);
    setIsLoading(true);
    // Defer async work so the browser finishes the touch/click event first (keeps keyboard open on iOS)
    setTimeout(() => { doSend(userText, filesToProcess); }, 0);
  };

  const doSend = async (userText: string, filesToProcess: File[]) => {
    if (!user || !conversationId) return;
    // Process attached files
    let fileContext = "";
    let imageBase64: string | undefined;
    for (const file of filesToProcess) {
      if (file.type.startsWith("image/") && !imageBase64) {
        imageBase64 = await fileToBase64(file);
      } else {
        fileContext += `[Attached: ${file.name}]\n`;
      }
    }
    const fullUserText = fileContext ? `${fileContext}\n${userText}` : userText;
    pendingFilesRef.current = filesToProcess; // keep files available for document_reader tool

    // Add user message (show image preview if attached)
    const userMsgId = crypto.randomUUID();
    const userContent = imageBase64 ? `${fullUserText}\n\n![attached](${imageBase64})` : fullUserText;
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: userContent }]);
    await persistMessage(conversationId, { role: "user", content: fullUserText });

    const apiKey = await getOrCreateApiKey(user.id);
    if (!apiKey) { toast.error("No API key"); setIsLoading(false); return; }

    // Get JWT session token for authenticated billing/logging in edge functions
    const { data: sessionData } = await supabase.auth.getSession();
    const jwtToken = sessionData?.session?.access_token || apiKey;

    // Build messages for inference — strip base64 blobs from tool results
    // For API context: strip base64 to keep request small
    const sanitizeForApi = (result: any): any => {
      if (!result || typeof result !== "object") return result;
      const sanitized = { ...result };
      if (typeof sanitized.image_url === "string" && sanitized.image_url.startsWith("data:")) {
        sanitized.image_url = "[image generated]";
      }
      return sanitized;
    };
    // For DB persistence: save public URLs, discard base64 and blob URLs
    const sanitizeForDb = (result: any): any => {
      if (!result || typeof result !== "object") return result;
      const sanitized = { ...result };
      if (typeof sanitized.image_url === "string" && sanitized.image_url.startsWith("data:")) {
        return null; // never store base64 in DB
      }
      if (typeof sanitized.audio_url === "string" && sanitized.audio_url.startsWith("blob:")) {
        return null; // never store blob URLs in DB (they expire)
      }
      if (typeof sanitized.file_url === "string" && sanitized.file_url.startsWith("blob:")) {
        // Keep metadata but remove the blob URL (it expires after session)
        const { file_url: _removed, ...rest } = sanitized;
        return rest; // save filename/format/size so the card still renders
      }
      return sanitized;
    };
    const sanitizeToolResult = sanitizeForApi;

    // Build clean history for API: only user/assistant TEXT exchanges.
    // Strategy: build pairs where each user message is followed by a text assistant response.
    // User messages answered only by tool_calls (no text) are dropped to avoid
    // the model thinking the previous request is still unanswered.
    const textAssistantIds = new Set<number>();
    const textOnlyMessages = messages.filter((m) => {
      if (m.role === "tool") return false;
      if (m.role === "assistant") return !!(m.content && m.content.trim() && m.content !== "No response generated");
      return true;
    });
    // Walk through textOnlyMessages and drop user messages not followed by an assistant response
    const pairedMessages: typeof textOnlyMessages = [];
    for (let i = 0; i < textOnlyMessages.length; i++) {
      const m = textOnlyMessages[i];
      if (m.role === "user") {
        const next = textOnlyMessages[i + 1];
        if (next && next.role === "assistant") {
          pairedMessages.push(m); // keep user only if followed by assistant text
        }
        // else: drop this user message (it was answered only by tool calls)
      } else {
        pairedMessages.push(m);
      }
    }

    // Sanitize content for LLM: strip large base64/binary data, replace with placeholder
    const sanitizeContentForLLM = (content: string | null): string => {
      if (!content) return "";
      // Replace base64 image data with placeholder
      if (content.startsWith("__IMAGE__:data:")) return "[image generated]";
      if (content.startsWith("__AUDIO__:")) return "[audio message]";
      // Strip inline base64 images from content (e.g. attached images)
      return content.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/g, "[attached image]");
    };

    const historyForApi = [
      { role: "system", content: agent.system_prompt || "You are a helpful AI assistant." },
      ...pairedMessages.slice(-20).map((m) => ({
        role: m.role,
        content: sanitizeContentForLLM(m.content),
      })),
      { role: "user", content: fullUserText },
    ];

    const toolDefs = buildToolDefs(agent.tools || []);

    // Agentic loop: keep calling until no more tool_calls
    let loopMessages = [...historyForApi];
    let loopCount = 0;
    const MAX_LOOPS = 6;

    // Track current streaming placeholder ID
    let currentStreamingId = crypto.randomUUID();
    // Don't add placeholder yet — add it lazily only when we need to show final answer
    // For tool-call phases, we don't need a placeholder

    while (loopCount < MAX_LOOPS) {
      loopCount++;
      try {
        const lastUserMsg = [...loopMessages].reverse().find((m) => m.role === "user" || m.role === "tool");
        const promptText = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : userText;

        const res = await fetch(INFERENCE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwtToken}`, "x-api-key": apiKey },
          body: JSON.stringify({
            model: agent.model_id,
            prompt: promptText,
            messages: loopMessages,
            category: "llm",
            maxTokens: 40000,
            ...(toolDefs.length > 0 ? { tools: toolDefs, tool_choice: "auto" } : {}),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const errMsg = err?.error || `Error ${res.status}`;
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `❌ ${errMsg}` }]);
          await persistMessage(conversationId, { role: "assistant", content: `❌ ${errMsg}` });
          break;
        }

        const data = await res.json();
        console.log("[AgentChat] inference response:", JSON.stringify({ response: data.response?.slice?.(0,100), tool_calls: data.tool_calls, choices: data.choices?.length }));

        const choice = data?.choices?.[0];
        let assistantMsg = choice?.message ?? (
          data?.response != null
            ? { role: "assistant", content: data.response, tool_calls: data.tool_calls }
            : null
        );

        // Fallback: if LLM didn't call image_generation but user clearly wants an image,
        // directly execute the tool instead of relying on a forced LLM re-call
        if (
          assistantMsg &&
          (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) &&
          toolDefs.some((td: any) => td.function?.name === "image_generation") &&
          loopCount === 1
        ) {
          const userLower = fullUserText.toLowerCase();
          const userWantsImage =
            userLower.includes("нарисуй") || userLower.includes("draw") ||
            userLower.includes("generate image") || userLower.includes("создай картинку") ||
            userLower.includes("сгенерируй картинку") || userLower.includes("изображение") ||
            userLower.includes("картинку") || userLower.includes("paint") || userLower.includes("image of") ||
            userLower.includes("нарисовать") || userLower.includes("сгенерируй изображение");
          if (userWantsImage) {
            console.log("[AgentChat] User wants image but LLM didn't call tool — directly executing image_generation");
            const directResult = await executeTool("image_generation", { prompt: fullUserText }, apiKey, jwtToken);
            if (directResult?.image_url) {
              const imgContent = `__IMAGE__:${directResult.image_url}`;
              setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: imgContent }]);
              await persistMessage(conversationId, { role: "assistant", content: imgContent });
            } else {
              const errMsg = directResult?.error || "Ошибка генерации изображения";
              setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `❌ ${errMsg}` }]);
              await persistMessage(conversationId, { role: "assistant", content: `❌ ${errMsg}` });
            }
            break;
          }
        }

        // Fallback: if LLM didn't call tool but wrote a file-related text response,
        // and agent has file_generator — force a second call with tool_choice required
        if (
          assistantMsg &&
          (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) &&
          toolDefs.some((td: any) => td.function?.name === "file_generator") &&
          loopCount === 1
        ) {
          const contentLower = (assistantMsg.content || "").toLowerCase();
          const looksLikeFileRequest = contentLower.includes("файл") || contentLower.includes("file") || 
            contentLower.includes(".txt") || contentLower.includes(".pdf") || contentLower.includes(".xlsx") || 
            contentLower.includes(".csv") || contentLower.includes(".json") || contentLower.includes("📄");
          const userMsgLower = fullUserText.toLowerCase();
          const userWantsFile = userMsgLower.includes("файл") || userMsgLower.includes("file") || 
            userMsgLower.includes(".txt") || userMsgLower.includes(".pdf") || userMsgLower.includes(".xlsx") || 
            userMsgLower.includes(".csv") || userMsgLower.includes("excel") || userMsgLower.includes("эксель") ||
            userMsgLower.includes("таблицу") || userMsgLower.includes("table") || userMsgLower.includes("generate");
          if (looksLikeFileRequest || userWantsFile) {
            console.log("[AgentChat] LLM skipped tool call, forcing file_generator...");
            const forcedRes = await fetch(INFERENCE_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwtToken}`, "x-api-key": apiKey },
              body: JSON.stringify({
                model: agent.model_id,
                prompt: fullUserText,
                messages: loopMessages,
                category: "llm",
                maxTokens: 40000,
                tools: toolDefs.filter((td: any) => td.function?.name === "file_generator"),
                tool_choice: { type: "function", function: { name: "file_generator" } },
              }),
            });
            if (forcedRes.ok) {
              const forcedData = await forcedRes.json();
              console.log("[AgentChat] forced tool_choice response:", JSON.stringify({ tool_calls: forcedData.tool_calls }));
              const forcedChoice = forcedData?.choices?.[0];
              const forcedMsg = forcedChoice?.message ?? (forcedData?.response != null ? { role: "assistant", content: forcedData.response, tool_calls: forcedData.tool_calls } : null);
              if (forcedMsg?.tool_calls?.length > 0) {
                assistantMsg = forcedMsg;
              }
            }
          }
        }

        if (!assistantMsg) break;

        // Tool calls?
        if (assistantMsg.tool_calls?.length > 0) {
          // If model returned meaningful thinking content, show it
          // Suppress for file_generator / voice_message — we render a card instead of text
          const isFileOrVoiceTurn = assistantMsg.tool_calls.some((tc: any) =>
            tc.function?.name === "file_generator" || tc.function?.name === "voice_message"
          );
          const thinkingContent = !isFileOrVoiceTurn && assistantMsg.content && assistantMsg.content !== "No response generated" ? assistantMsg.content : null;
          if (thinkingContent) {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: thinkingContent }]);
            await persistMessage(conversationId, { role: "assistant", content: thinkingContent });
          }

          loopMessages.push({ role: "assistant", content: assistantMsg.content || "", tool_calls: assistantMsg.tool_calls } as any);

          // Execute each tool call, collecting results keyed by tool name
          const toolResults: Record<string, any> = {};
          for (const tc of assistantMsg.tool_calls) {
            const toolName = tc.function?.name;
            const toolInput = JSON.parse(tc.function?.arguments || "{}");

            const toolCallMsgId = crypto.randomUUID();
            setMessages((prev) => [...prev, {
              id: toolCallMsgId,
              role: "tool",
              content: null,
              tool_name: toolName,
              tool_input: toolInput,
              isStreaming: true,
            }]);

            const result = await executeTool(toolName, { ...toolInput, __attachedFiles: pendingFilesRef.current }, apiKey, jwtToken);
            toolResults[toolName] = result;

            setMessages((prev) => prev.map((m) => m.id === toolCallMsgId
              ? { ...m, tool_result: result, isStreaming: false }
              : m
            ));
            // Store URL in DB (never base64)
            const persistableResult = sanitizeForDb(result);
            await persistMessage(conversationId, {
              role: "tool",
              content: null,
              tool_name: toolName,
              tool_input: toolInput,
              tool_result: persistableResult,
            });

            loopMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: toolName,
              content: JSON.stringify(sanitizeToolResult(result)),
            } as any);
          }

          // If any tool was image_generation, voice_message, or file_generator — stop here, no need for a follow-up LLM call
          const hadImageGen = assistantMsg.tool_calls.some((tc: any) => tc.function?.name === "image_generation");
          const hadVoice = assistantMsg.tool_calls.some((tc: any) => tc.function?.name === "voice_message");
          const hadFileGen = assistantMsg.tool_calls.some((tc: any) => tc.function?.name === "file_generator");
          if (hadImageGen) {
            // ToolCallMessage already renders the image from tool_result.image_url — no duplicate message needed
            const imageResult = toolResults["image_generation"];
            if (!imageResult?.image_url && imageResult?.error) {
              setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `❌ Ошибка генерации изображения: ${imageResult.error}` }]);
              await persistMessage(conversationId, { role: "assistant", content: `❌ Ошибка генерации изображения: ${imageResult.error}` });
            }
            break;
          }
          if (hadFileGen) {
            // Embed file URL in content so it survives DB round-trips (same pattern as audio)
            const fileResult = toolResults["file_generator"];
            if (fileResult?.file_url) {
              const fileContent = `__FILE__:${fileResult.file_url}|${fileResult.filename || "file"}|${fileResult.format || "txt"}|${fileResult.size || 0}`;
              const fileMsgId = crypto.randomUUID();
              setMessages((prev) => [...prev, { id: fileMsgId, role: "assistant", content: fileContent }]);
              // Always persist to DB — for blob URLs store placeholder so history shows card
              const dbContent = fileResult.file_url.startsWith("blob:")
                ? `__FILE__:EXPIRED|${fileResult.filename || "file"}|${fileResult.format || "txt"}|${fileResult.size || 0}`
                : fileContent;
              await persistMessage(conversationId, { role: "assistant", content: dbContent });
            } else if (fileResult?.error) {
              setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `❌ Ошибка генерации файла: ${fileResult.error}` }]);
            }
            break;
          }
          if (hadVoice) {
            // Reuse the already-executed result — DO NOT call TTS a second time
            const audioUrl = toolResults["voice_message"]?.audio_url;
            const audioMsgId = crypto.randomUUID();
            if (audioUrl && !audioUrl.startsWith("blob:")) {
              // Real persistent URL — show player and save to DB
              const audioContent = `__AUDIO__:${audioUrl}`;
              setMessages((prev) => [...prev, { id: audioMsgId, role: "assistant", content: audioContent }]);
              await persistMessage(conversationId, { role: "assistant", content: audioContent });
            } else if (audioUrl && audioUrl.startsWith("blob:")) {
              // Blob URL — show player in current session only, don't save to DB
              const audioContent = `__AUDIO__:${audioUrl}`;
              setMessages((prev) => [...prev, { id: audioMsgId, role: "assistant", content: audioContent }]);
              // Don't persist blob URLs — they expire
            } else {
              setMessages((prev) => [...prev, { id: audioMsgId, role: "assistant", content: "🔊 (failed to generate audio)" }]);
            }
            break;
          }

          // Prepare new streaming placeholder for next iteration's final answer
          currentStreamingId = crypto.randomUUID();
          continue;
        }

        // Final answer
        let finalContent = assistantMsg.content || "";
        if (!finalContent || finalContent === "No response generated") break;

        // Hard intercept: if the LLM wrote a file-announcement text instead of calling the tool
        // directly execute file_generator ourselves
        const hasFileGenerator = toolDefs.some((td: any) => td.function?.name === "file_generator");
        const isFileAnnouncement = hasFileGenerator && (
          finalContent.includes("📄") ||
          /файл отправлен|file sent|файл создан|file created|here is your file|here's your file/i.test(finalContent)
        );

        if (isFileAnnouncement) {
          console.log("[AgentChat] Hard intercept: LLM described file instead of calling tool. Forcing file_generator...");
          // Extract filename and format from the announced text
          const fnMatch = finalContent.match(/:\s*([\w\-\.а-яё]+\.\w+)/i);
          const hintFilename = fnMatch?.[1] || "file";
          const ext = hintFilename.split(".").pop()?.toLowerCase() || "txt";
          const supportedFormats = ["txt", "json", "csv", "xlsx", "pdf"];
          const fmt = supportedFormats.includes(ext) ? ext : "txt";

          // Make the LLM actually generate the content for the file
          let fileTextContent = userText;
          try {
            const contentRes = await fetch(INFERENCE_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwtToken}`, "x-api-key": apiKey },
              body: JSON.stringify({
                model: agent.model_id,
                prompt: userText,
                messages: [
                  { role: "system", content: "Generate ONLY the raw file content, no explanations, no preamble, no markdown formatting. Just the data/text that should go inside the file." },
                  { role: "user", content: userText },
                ],
                category: "llm",
                maxTokens: 40000,
              }),
            });
            if (contentRes.ok) {
              const contentData = await contentRes.json();
              const generated = contentData?.response || contentData?.choices?.[0]?.message?.content;
              if (generated && generated !== "No response generated") fileTextContent = generated;
            }
          } catch { /* use userText as fallback content */ }

          const directResult = await executeTool("file_generator", {
            filename: hintFilename,
            format: fmt,
            content: fileTextContent,
          }, apiKey);

          if (directResult?.file_url) {
            const fileContent = `__FILE__:${directResult.file_url}|${directResult.filename || hintFilename}|${directResult.format || fmt}|${directResult.size || 0}`;
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: fileContent }]);
            const dbContent = directResult.file_url.startsWith("blob:")
              ? `__FILE__:EXPIRED|${directResult.filename || hintFilename}|${directResult.format || fmt}|${directResult.size || 0}`
              : fileContent;
            await persistMessage(conversationId, { role: "assistant", content: dbContent });
            break;
          }
          // If file generation failed, fall through to show the text
        }

        setMessages((prev) => [...prev, { id: currentStreamingId, role: "assistant", content: finalContent }]);
        await persistMessage(conversationId, { role: "assistant", content: finalContent });
        break;

      } catch (err: any) {
        const errMsg = err?.message || "Network error";
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `❌ ${errMsg}` }]);
        break;
      }
    }

    // Clear any remaining streaming states
    setMessages((prev) => prev.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m));
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startNewConversation = async () => {
    if (!user || !agent.id) return;
    const { data } = await supabase
      .from("claw_conversations")
      .insert({ user_id: user.id, agent_id: agent.id!, title: `Chat with ${agent.name}` })
      .select("id").single();
    if (data?.id) {
      setConversationId(data.id);
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 py-2 mb-2">
        <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={onBack} className="text-muted-foreground shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Library</span>
        </Button>
        <span className="text-muted-foreground hidden sm:block">|</span>
        <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{agent.name}</div>
          <div className="text-xs text-muted-foreground truncate hidden sm:block">{agent.model_id}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {enabledTools.slice(0, 3).map((t) => {
            const Icon = t.icon;
            return (
              <Badge key={t.id} variant="secondary" className="text-xs gap-1 hidden md:flex">
                <Icon className="h-2.5 w-2.5" />
                {t.label}
              </Badge>
            );
          })}
          {enabledTools.length > 3 && (
            <Badge variant="secondary" className="text-xs hidden md:flex">+{enabledTools.length - 3}</Badge>
          )}
          <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={startNewConversation} className="text-muted-foreground h-8 px-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">New</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <Card className={`flex-1 min-h-0 bg-card/50 border-border p-4 mb-2 ${messages.length > 0 || loadingHistory ? 'overflow-y-auto space-y-4' : 'overflow-hidden'}`}>
        {loadingHistory && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 -mt-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium mb-1">{agent.name}</p>
              <p className="text-sm max-w-md">{agent.description || "How can I help you today?"}</p>
            </div>
          </div>
        )}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 justify-start">
            <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-secondary/70 rounded-xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {messages.map((msg, msgIdx) => {
          if (msg.role === "tool") return <ToolCallMessage key={msg.id} msg={msg} onImageLoad={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })} />;
          if (msg.role === "assistant" && !msg.content) return null;
          // Don't show old 🔊 messages — they have no audio URL (pre-fix data)
          if (msg.role === "assistant" && msg.content === "🔊") return null;

          // Find file result for ANY assistant message that follows a file_generator tool call.
          // Covers: old "📄 Файл отправлен:" format, new __legacyFileResult, or any text response after file_generator.
          const precedingFileResult: { file_url?: string; filename?: string; format?: string; size?: number } | null =
            msg.role === "assistant" && !msg.content?.startsWith("__FILE__:") && !msg.content?.startsWith("__AUDIO__:")
              ? (() => {
                  // Check if pre-resolved during history loading
                  if ((msg.tool_result as any)?.__legacyFileResult) {
                    return (msg.tool_result as any).__legacyFileResult;
                  }
                  // Scan backwards: find file_generator tool message in same turn
                  for (let i = msgIdx - 1; i >= 0; i--) {
                    if (messages[i].role === "user") break;
                    if (messages[i].role === "tool" && messages[i].tool_name === "file_generator") {
                      const tr = messages[i].tool_result;
                      if (tr?.filename || tr?.file_url) return tr;
                      break;
                    }
                  }
                  return null;
                })()
              : null;
          return (
            <div key={msg.id} className={`flex gap-3 min-w-0 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`group min-w-0 flex flex-col gap-1 ${msg.role === "user" ? "items-end max-w-[80%]" : "items-start flex-1"}`}>
                <div className={`rounded-xl text-sm min-w-0 w-full ${
                  msg.content?.startsWith("__AUDIO__:")
                    ? "bg-secondary/70 p-2"
                    : msg.role === "user"
                    ? "bg-primary text-primary-foreground px-4 py-3"
                    : "bg-secondary/70 px-4 py-3"
                }`}>
          {msg.isStreaming && !msg.content ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : msg.content?.startsWith("__IMAGE__:") ? (
                    <img src={msg.content.slice(10)} alt="Generated image" className="max-w-full rounded-lg" style={{ maxHeight: 400 }} />
                  ) : msg.content?.startsWith("__AUDIO__:") ? (
                    <AudioPlayer key={msg.id} content={msg.content} />
                  ) : msg.content?.startsWith("__FILE__:") ? (() => {
                    const parts = msg.content.slice(9).split("|");
                    const [file_url, filename, format, sizeStr] = parts;
                    const size = parseInt(sizeStr || "0");
                    const isExpired = !file_url || file_url === "EXPIRED";
                    const formatIcons: Record<string, string> = { txt: "📄", json: "📋", csv: "📊", xlsx: "📗", pdf: "📕" };
                    const sizeLabel = size > 1024 ? `${(size / 1024).toFixed(1)} KB` : size > 0 ? `${size} B` : "";
                    return (
                      <div className="flex items-center gap-3 p-2 bg-background/40 border border-border/50 rounded-lg">
                        <span className="text-2xl">{formatIcons[format] || "📄"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{filename}</p>
                          <p className="text-xs text-muted-foreground">{format?.toUpperCase()}{sizeLabel && ` · ${sizeLabel}`}</p>
                        </div>
                        {isExpired ? (
                          <span className="text-xs text-muted-foreground italic shrink-0">ссылка устарела</span>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={async () => {
                            try {
                              const resp = await fetch(file_url);
                              const blob = await resp.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url; a.download = filename;
                              document.body.appendChild(a); a.click();
                              document.body.removeChild(a); URL.revokeObjectURL(url);
                            } catch { window.open(file_url, "_blank"); }
                          }}>
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        )}
                      </div>
                    );
                  })() : precedingFileResult ? (() => {
                    const { file_url, filename, format, size } = precedingFileResult;
                    const fmt = format || "";
                    const formatIcons: Record<string, string> = { txt: "📄", json: "📋", csv: "📊", xlsx: "📗", pdf: "📕" };
                    const sizeStr = size ? (size > 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`) : "";
                    const doDownload = async () => {
                      if (!file_url) return;
                      try {
                        const resp = await fetch(file_url);
                        const blob = await resp.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = blobUrl; a.download = filename || "file";
                        document.body.appendChild(a); a.click();
                        document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
                      } catch { if (file_url) window.open(file_url, "_blank"); }
                    };
                    return (
                      <div className="flex items-center gap-3 p-2 bg-background/40 border border-border/50 rounded-lg">
                        <span className="text-2xl">{formatIcons[fmt] || "📄"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{filename || "file"}</p>
                          <p className="text-xs text-muted-foreground">{fmt.toUpperCase()}{sizeStr && ` · ${sizeStr}`}</p>
                        </div>
                        {file_url ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={doDownload}>
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">недоступен</span>
                        )}
                      </div>
                    );
                  })() : (() => {
                    // Check for legacy "📄 Файл отправлен:" text
                    const isLegacyFile = msg.role === "assistant" && msg.content &&
                      (msg.content.includes("📄") || /файл отправлен|file sent/i.test(msg.content));
                    if (isLegacyFile) {
                      const fnMatch = (msg.content || "").match(/:\s*([\w\-\.а-яё]+\.\w+)/i);
                      const hintFilename = fnMatch?.[1] || "file.txt";
                      const ext = hintFilename.split(".").pop()?.toLowerCase() || "txt";
                      const formatIcons: Record<string, string> = { txt: "📄", json: "📋", csv: "📊", xlsx: "📗", pdf: "📕" };
                      let prevUserContent = "";
                      for (let i = msgIdx - 1; i >= 0; i--) {
                        if (messages[i].role === "user") { prevUserContent = messages[i].content || ""; break; }
                      }
                      const supportedFormats = ["txt", "json", "csv", "xlsx", "pdf"];
                      const fmt = supportedFormats.includes(ext) ? ext : "txt";
                      return (
                        <div className="flex items-center gap-3 p-2 bg-background/40 border border-border/50 rounded-lg">
                          <span className="text-2xl">{formatIcons[ext] || "📄"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{hintFilename}</p>
                            <p className="text-xs text-muted-foreground">{ext.toUpperCase()} · regenerate to download</p>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={async () => {
                            const ak = await getOrCreateApiKey(user!.id);
                            if (!ak) return;
                            let fileTextContent = prevUserContent || `Create a ${fmt} file named ${hintFilename}`;
                            try {
                              const cr = await fetch(INFERENCE_URL, {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${ak}` },
                                body: JSON.stringify({
                                  model: agent.model_id,
                                  prompt: fileTextContent,
                                  messages: [
                                    { role: "system", content: "Generate ONLY the raw file content. No explanations." },
                                    { role: "user", content: fileTextContent },
                                  ],
                                  category: "llm", maxTokens: 40000,
                                }),
                              });
                              if (cr.ok) { const cd = await cr.json(); const g = cd?.response; if (g && g !== "No response generated") fileTextContent = g; }
                            } catch { /* fallback */ }
                            const result = await executeTool("file_generator", { filename: hintFilename, format: fmt, content: fileTextContent }, ak);
                            if (result?.file_url) {
                              try {
                                const resp = await fetch(result.file_url);
                                const blob = await resp.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url; a.download = result.filename || hintFilename;
                                document.body.appendChild(a); a.click();
                                document.body.removeChild(a); URL.revokeObjectURL(url);
                              } catch { window.open(result.file_url, "_blank"); }
                            }
                          }}>
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        </div>
                      );
                    }
                    return (
                    <div className={`markdown-response text-sm min-w-0 overflow-hidden ${msg.role === "user" ? "text-primary-foreground" : ""}`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, className, children, ...props }: any) {
                            const inline = !className;
                            if (inline) return <code className="bg-muted/30 px-1 py-0.5 rounded text-xs" {...props}>{children}</code>;
                            const lang = className?.replace("language-", "") || "";
                            return <CodeBlock code={String(children).replace(/\n$/, "")} language={lang} />;
                          },
                          pre({ children }: any) { return <>{children}</>; },
                          img({ src, alt }: any) {
                            return <img src={src} alt={alt} className="max-w-full rounded mt-1 h-auto" />;
                          },
                        }}
                      >
                        {msg.content || ""}
                      </ReactMarkdown>
                    </div>
                     );
                   })()
                   }
                </div>
                {msg.role === "assistant" && msg.content && !msg.content.startsWith("__AUDIO__:") && !msg.content.startsWith("__FILE__:") && !msg.content.startsWith("__IMAGE__:") && !msg.content.includes("📄") && !/файл отправлен|file sent/i.test(msg.content) && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyText(msg.id, msg.content!)}
                    >
                      {copiedId === msg.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </Card>

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 shrink-0">
          {attachedFiles.map((file, i) => (
            <Badge key={i} variant="secondary" className="flex items-center gap-1 pr-1">
              {file.type.startsWith("image/") ? "🖼️" : "📎"} {file.name}
              <button onClick={() => removeFile(i)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end shrink-0 pb-2">
        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileAttach} />
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileAttach} />
        <Button
          variant="ghost" size="icon"
          className="shrink-0 h-10 w-10 text-muted-foreground"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => imageInputRef.current?.click()}
          title="Attach image"
        >
          <ImagePlus className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="shrink-0 h-10 w-10 text-muted-foreground"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          <FileUp className="h-5 w-5" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 128) + "px";
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[40px] max-h-32 resize-none py-2 leading-5"
          rows={1}
          style={{ height: "40px" }}
        />
        <Button
          size="icon"
          onMouseDown={(e) => { e.preventDefault(); }}
          onClick={() => { handleSend(); }}
          disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
          className="shrink-0 h-10 w-10 glow-primary"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function ImageWithLightbox({ src, onLoad }: { src: string; onLoad?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt="Generated"
        className="w-full max-w-xs rounded mt-1 h-auto object-contain cursor-zoom-in"
        onClick={() => setOpen(true)}
        onLoad={onLoad}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 flex items-center justify-center bg-background/95">
          <img src={src} alt="Generated" className="max-w-full max-h-[90vh] object-contain rounded" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ToolCallMessage({ msg, onImageLoad }: { msg: Message; onImageLoad?: () => void }) {
  const Icon = TOOL_ICONS[msg.tool_name || ""] || Wrench;
  const isRunning = msg.isStreaming;

  const toolLabels: Record<string, string> = {
    web_search: "Web Search",
    calculator: "Calculator",
    code_interpreter: "Code Interpreter",
    image_generation: "Image Generation",
    document_reader: "Document Reader",
    voice_message: "Voice Message",
    file_generator: "File Generator",
  };

  const renderResult = () => {
    if (!msg.tool_result) return null;

    // File generator — download button
    if (msg.tool_name === "file_generator" || msg.tool_result?.file_url || msg.tool_result?.filename) {
      const { file_url, filename, format, size } = msg.tool_result || {};
      const formatIcons: Record<string, string> = { txt: "📄", json: "📋", csv: "📊", xlsx: "📗", pdf: "📕" };
      const sizeStr = size ? (size > 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`) : "";
      const downloadFile = async () => {
        if (!file_url) return;
        try {
          const resp = await fetch(file_url);
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename || "file";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {
          window.open(file_url, "_blank");
        }
      };
      return (
        <div className="mt-1 flex items-center gap-3 p-2 bg-background/40 border border-border/50 rounded-lg">
          <span className="text-2xl">{formatIcons[format] || "📄"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{filename || "file"}</p>
            <p className="text-xs text-muted-foreground">{format?.toUpperCase()} {sizeStr && `· ${sizeStr}`}</p>
          </div>
          {file_url ? (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={downloadFile}>
              <Download className="h-3 w-3" /> Download
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Expired</span>
          )}
        </div>
      );
    }

    // Voice message — audio player
    if (msg.tool_result?.audio_url) {
      return (
        <div className="mt-1">
          <audio controls src={msg.tool_result.audio_url} className="w-full h-10 rounded" preload="metadata" />
        </div>
      );
    }

    // Image generation
    if (msg.tool_result?.image_url) {
      return <ImageWithLightbox src={msg.tool_result.image_url} onLoad={onImageLoad} />;
    }

    // Web search — pretty render
    if (msg.tool_name === "web_search") {
      const resultsText: string = msg.tool_result?.results || msg.tool_result?.error || "";
      if (!resultsText) return null;
      // Parse markdown-like results: **Title**\nURL\nDesc
      const blocks = resultsText.split("\n\n").filter(Boolean);
      return (
        <div className="space-y-2 mt-1">
          {blocks.map((block, i) => {
            const lines = block.split("\n");
            const title = lines[0]?.replace(/^\*\*|\*\*$/g, "");
            const url = lines[1];
            const desc = lines.slice(2).join(" ");
            return (
              <div key={i} className="border border-border/50 rounded p-2 bg-background/40">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline text-xs block truncate">{title}</a>
                <p className="text-muted-foreground text-xs truncate">{url}</p>
                {desc && <p className="text-foreground/80 text-xs mt-0.5 line-clamp-2">{desc}</p>}
              </div>
            );
          })}
        </div>
      );
    }

    // Code interpreter
    if (msg.tool_name === "code_interpreter") {
      const out = msg.tool_result?.output || msg.tool_result?.error;
      return (
        <pre className="text-foreground whitespace-pre overflow-x-auto mt-1 text-xs leading-relaxed max-w-full">
          {out || "(no output)"}
        </pre>
      );
    }

    // Calculator
    if (msg.tool_name === "calculator") {
      return (
        <div className="mt-1 text-foreground font-mono text-sm">
          = {msg.tool_result?.result ?? msg.tool_result?.error}
        </div>
      );
    }

    // Default
    return (
      <pre className="text-foreground whitespace-pre overflow-x-auto mt-1 max-w-full">
        {typeof msg.tool_result === "string" ? msg.tool_result : JSON.stringify(msg.tool_result, null, 2)}
      </pre>
    );
  };

  const queryText = msg.tool_name === "web_search"
    ? msg.tool_input?.query
    : msg.tool_name === "calculator"
    ? msg.tool_input?.expression
    : msg.tool_input?.prompt || msg.tool_input?.code || JSON.stringify(msg.tool_input);

  return (
    <div className="flex gap-3 items-start pl-1">
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted border border-border">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
          {isRunning ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : <Icon className="h-3 w-3 text-primary" />}
          <span className="font-medium text-foreground/70">{toolLabels[msg.tool_name || ""] || msg.tool_name}</span>
          {queryText && <span className="text-muted-foreground truncate max-w-[200px]">— {queryText}</span>}
          {isRunning
            ? <span className="text-xs text-muted-foreground ml-auto animate-pulse">Running...</span>
            : <span className="text-xs text-primary ml-auto">✓ Done</span>
          }
        </div>
        {!isRunning && msg.tool_result && (
          <Card className="bg-muted/30 border-border/50 p-2.5 text-xs overflow-hidden">
            {renderResult()}
          </Card>
        )}
      </div>
    </div>
  );
}
