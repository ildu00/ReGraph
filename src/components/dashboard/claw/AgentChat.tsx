import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, Send, Loader2, Bot, User, Copy, Check,
  Calculator, Code2, Globe, Image, BookOpen, Wrench, Plus
} from "lucide-react";
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
};

// ── Tool executor ──────────────────────────────────────────────────────────
async function executeTool(name: string, input: any, apiKey: string): Promise<any> {
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
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: "sdxl-turbo", prompt, category: "image-gen" }),
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
    case "document_reader": {
      return { content: "Document reading requires file upload. Please attach a file in your message." };
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

export default function AgentChat({ agent, onBack }: AgentChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

        // For image messages, fetch only those tool_results that look like URLs (lightweight)
        if (msgs) {
          const imageToolIds = msgs
            .filter((m: any) => m.tool_name === "image_generation")
            .map((m: any) => m.id);

          let imageResults: Record<string, any> = {};
          if (imageToolIds.length > 0) {
            const { data: imgMsgs } = await supabase
              .from("claw_messages")
              .select("id, tool_result")
              .in("id", imageToolIds);
            if (imgMsgs) {
              for (const im of imgMsgs) {
                const url = (im.tool_result as any)?.image_url;
                if (url && typeof url === "string" && !url.startsWith("data:") && url !== "[image generated]") {
                  imageResults[im.id] = im.tool_result;
                }
              }
            }
          }

          setMessages(msgs.reverse().map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            tool_name: m.tool_name,
            tool_input: m.tool_input,
            tool_result: imageResults[m.id] ?? null,
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
  }, [messages]);

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

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user || !conversationId) return;
    const userText = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    const userMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: userText }]);
    await persistMessage(conversationId, { role: "user", content: userText });

    const apiKey = await getOrCreateApiKey(user.id);
    if (!apiKey) { toast.error("No API key"); setIsLoading(false); return; }

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
    // For DB persistence: save public URLs, discard base64
    const sanitizeForDb = (result: any): any => {
      if (!result || typeof result !== "object") return result;
      const sanitized = { ...result };
      if (typeof sanitized.image_url === "string" && sanitized.image_url.startsWith("data:")) {
        return null; // never store base64 in DB
      }
      return sanitized;
    };
    const sanitizeToolResult = sanitizeForApi;

    const historyForApi = [
      { role: "system", content: agent.system_prompt || "You are a helpful AI assistant." },
      ...messages.filter((m) => m.role !== "tool" || m.content).map((m) => ({
        role: m.role === "tool" ? "tool" : m.role,
        content: m.role === "tool"
          ? JSON.stringify(sanitizeToolResult(m.tool_result))
          : (m.content || ""),
        ...(m.tool_name && m.role === "tool" ? { name: m.tool_name } : {}),
      })),
      { role: "user", content: userText },
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
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: agent.model_id,
            prompt: promptText,
            messages: loopMessages,
            category: "llm",
            max_tokens: 4096,
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

        const choice = data?.choices?.[0];
        const assistantMsg = choice?.message ?? (
          data?.response != null
            ? { role: "assistant", content: data.response, tool_calls: data.tool_calls }
            : null
        );

        if (!assistantMsg) break;

        // Tool calls?
        if (assistantMsg.tool_calls?.length > 0) {
          // If model returned meaningful thinking content, show it
          const thinkingContent = assistantMsg.content && assistantMsg.content !== "No response generated" ? assistantMsg.content : null;
          if (thinkingContent) {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: thinkingContent }]);
            await persistMessage(conversationId, { role: "assistant", content: thinkingContent });
          }

          loopMessages.push({ role: "assistant", content: assistantMsg.content || "", tool_calls: assistantMsg.tool_calls } as any);

          // Execute each tool call
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

            const result = await executeTool(toolName, toolInput, apiKey);

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

          // If any tool was image_generation — stop here, no need for a follow-up LLM call
          const hadImageGen = assistantMsg.tool_calls.some((tc: any) => tc.function?.name === "image_generation");
          if (hadImageGen) break;

          // Prepare new streaming placeholder for next iteration's final answer
          currentStreamingId = crypto.randomUUID();
          continue;
        }

        // Final answer
        const finalContent = assistantMsg.content || "";
        if (!finalContent || finalContent === "No response generated") break;
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
    <div className="flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100vh-12rem)]">
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
      <Card className={`flex-1 min-h-0 bg-card/50 border-border p-4 mb-2 overflow-x-hidden ${messages.length > 0 || loadingHistory ? 'overflow-y-auto space-y-4' : 'overflow-hidden'}`}>
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

        {messages.map((msg) => {
          if (msg.role === "tool") return <ToolCallMessage key={msg.id} msg={msg} />;
          if (msg.role === "assistant" && !msg.content) return null;
          return (
            <div key={msg.id} className={`flex gap-3 min-w-0 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`group min-w-0 flex flex-col gap-1 ${msg.role === "user" ? "items-end max-w-[80%]" : "items-start flex-1"}`}>
                <div className={`rounded-xl px-4 py-3 text-sm min-w-0 w-full ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/70"
                }`}>
                  {msg.isStreaming && !msg.content ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : msg.role === "assistant" ? (
                    <div className="markdown-response text-sm min-w-0 overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, className, children, ...props }: any) {
                            const inline = !className;
                            if (inline) return <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>{children}</code>;
                            const lang = className?.replace("language-", "") || "";
                            return <CodeBlock code={String(children).replace(/\n$/, "")} language={lang} />;
                          },
                          pre({ children }: any) { return <>{children}</>; },
                        }}
                      >
                        {msg.content || ""}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "assistant" && msg.content && (
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

      {/* Input */}
      <div className="flex gap-2 items-end shrink-0 pb-2">
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
          placeholder={`Message ${agent.name}...`}
          className="min-h-[40px] max-h-32 resize-none py-2 leading-5"
          rows={1}
          style={{ height: "40px" }}
          disabled={isLoading}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          onMouseDown={(e) => e.preventDefault()}
          className="shrink-0 h-10 w-10 glow-primary"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function ToolCallMessage({ msg }: { msg: Message }) {
  const Icon = TOOL_ICONS[msg.tool_name || ""] || Wrench;
  const isRunning = msg.isStreaming;

  const toolLabels: Record<string, string> = {
    web_search: "Web Search",
    calculator: "Calculator",
    code_interpreter: "Code Interpreter",
    image_generation: "Image Generation",
    document_reader: "Document Reader",
  };

  const renderResult = () => {
    if (!msg.tool_result) return null;

    // Image generation
    if (msg.tool_result?.image_url) {
      return <ImageWithLightbox src={msg.tool_result.image_url} />;
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
