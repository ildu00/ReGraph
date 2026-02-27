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
      // MVP: return placeholder — can be upgraded to a real search edge function
      return { results: `Web search for "${input?.query}" is not yet available in MVP. Please use your knowledge to answer.` };
    }
    case "code_interpreter": {
      // Send code to inference for execution context
      const code = input?.code || input?.query || "";
      return { output: `Code received (${code.length} chars). Code execution sandbox not yet connected in MVP.` };
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
        const url = data?.data?.[0]?.url || data?.url;
        if (url) return { image_url: url };
        return { error: "Image generation failed" };
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
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const enabledTools = TOOLS.filter((t) => agent.tools?.includes(t.id));

  // Load or create conversation
  useEffect(() => {
    if (!user || !agent.id) return;
    (async () => {
      setLoadingHistory(true);
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

      // Load messages
      const { data: msgs } = await supabase
        .from("claw_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (msgs) {
        setMessages(msgs.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          tool_name: m.tool_name,
          tool_input: m.tool_input,
          tool_result: m.tool_result,
        })));
      }
      setLoadingHistory(false);
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

    // Build messages for inference
    const historyForApi = [
      { role: "system", content: agent.system_prompt || "You are a helpful AI assistant." },
      ...messages.filter((m) => m.role !== "tool" || m.content).map((m) => ({
        role: m.role === "tool" ? "tool" : m.role,
        content: m.role === "tool"
          ? JSON.stringify(m.tool_result)
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

    const assistantTempId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantTempId, role: "assistant", content: "", isStreaming: true }]);

    while (loopCount < MAX_LOOPS) {
      loopCount++;
      try {
        const res = await fetch(INFERENCE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: agent.model_id,
            messages: loopMessages,
            category: "llm",
            ...(toolDefs.length > 0 ? { tools: toolDefs, tool_choice: "auto" } : {}),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const errMsg = err?.error || `Error ${res.status}`;
          setMessages((prev) => prev.map((m) => m.id === assistantTempId
            ? { ...m, content: `❌ ${errMsg}`, isStreaming: false }
            : m
          ));
          await persistMessage(conversationId, { role: "assistant", content: `❌ ${errMsg}` });
          break;
        }

        const data = await res.json();
        const choice = data?.choices?.[0];
        const assistantMsg = choice?.message;

        if (!assistantMsg) break;

        // Tool calls?
        if (choice?.finish_reason === "tool_calls" && assistantMsg.tool_calls?.length > 0) {
          // Show assistant "thinking" message if any content
          if (assistantMsg.content) {
            setMessages((prev) => prev.map((m) => m.id === assistantTempId
              ? { ...m, content: assistantMsg.content, isStreaming: false }
              : m
            ));
            await persistMessage(conversationId, { role: "assistant", content: assistantMsg.content });
          }

          loopMessages.push({ role: "assistant", content: assistantMsg.content || "", tool_calls: assistantMsg.tool_calls } as any);

          // Execute each tool call
          for (const tc of assistantMsg.tool_calls) {
            const toolName = tc.function?.name;
            const toolInput = JSON.parse(tc.function?.arguments || "{}");

            // Show tool call message
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
            await persistMessage(conversationId, {
              role: "tool",
              content: null,
              tool_name: toolName,
              tool_input: toolInput,
              tool_result: result,
            });

            loopMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: toolName,
              content: JSON.stringify(result),
            } as any);
          }

          // Add a new streaming assistant message for continuation
          const nextId = crypto.randomUUID();
          setMessages((prev) => [...prev, { id: nextId, role: "assistant", content: "", isStreaming: true }]);
          // Update temp ID reference for next iteration
          continue;
        }

        // Final answer
        const finalContent = assistantMsg.content || "";
        setMessages((prev) => {
          const idx = prev.findLastIndex((m) => m.role === "assistant" && m.isStreaming);
          if (idx === -1) return [...prev, { id: crypto.randomUUID(), role: "assistant", content: finalContent }];
          return prev.map((m, i) => i === idx ? { ...m, content: finalContent, isStreaming: false } : m);
        });
        await persistMessage(conversationId, { role: "assistant", content: finalContent });
        break;

      } catch (err: any) {
        const errMsg = err?.message || "Network error";
        setMessages((prev) => {
          const idx = prev.findLastIndex((m) => m.role === "assistant" && m.isStreaming);
          if (idx === -1) return prev;
          return prev.map((m, i) => i === idx ? { ...m, content: `❌ ${errMsg}`, isStreaming: false } : m);
        });
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 pb-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Library
        </Button>
        <span className="text-muted-foreground">|</span>
        <span className="text-2xl">{agent.emoji}</span>
        <div>
          <div className="font-semibold">{agent.name}</div>
          <div className="text-xs text-muted-foreground">{agent.model_id}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {enabledTools.map((t) => {
            const Icon = t.icon;
            return (
              <Badge key={t.id} variant="secondary" className="text-xs gap-1 hidden sm:flex">
                <Icon className="h-2.5 w-2.5" />
                {t.label}
              </Badge>
            );
          })}
          <Button variant="ghost" size="sm" onClick={startNewConversation} className="text-muted-foreground">
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {loadingHistory && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-3">{agent.emoji}</span>
            <div className="font-semibold text-lg mb-1">{agent.name}</div>
            <div className="text-sm text-muted-foreground max-w-xs">
              {agent.description || "How can I help you today?"}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "tool") return <ToolCallMessage key={msg.id} msg={msg} />;
          return (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <span>{agent.emoji}</span>}
              </div>
              <div className={`group max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <Card className={`px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border"
                }`}>
                  {msg.isStreaming && !msg.content ? (
                    <span className="flex gap-1 items-center text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </span>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, className, children, ...props }: any) {
                            const inline = !className;
                            if (inline) return <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>{children}</code>;
                            const lang = className?.replace("language-", "") || "";
                            return <CodeBlock code={String(children).replace(/\n$/, "")} language={lang} />;
                          },
                        }}
                      >
                        {msg.content || ""}
                      </ReactMarkdown>
                    </div>
                  )}
                </Card>
                {msg.role === "assistant" && msg.content && (
                  <button
                    onClick={() => copyText(msg.id, msg.content!)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1"
                  >
                    {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-4 border-t border-border">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            onMouseDown={(e) => e.preventDefault()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function ToolCallMessage({ msg }: { msg: Message }) {
  const Icon = TOOL_ICONS[msg.tool_name || ""] || Wrench;
  const isLoading = msg.isStreaming;

  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
        <Wrench className="h-3.5 w-3.5 text-amber-500" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
          <span className="font-mono">{msg.tool_name}</span>
          {isLoading ? <span>Running...</span> : <span className="text-green-500">Done</span>}
        </div>
        <Card className="bg-amber-500/5 border-amber-500/20 p-3 text-xs font-mono">
          <div className="text-muted-foreground mb-1">Input:</div>
          <pre className="text-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(msg.tool_input, null, 2)}
          </pre>
          {msg.tool_result && (
            <>
              <div className="text-muted-foreground mt-2 mb-1">Result:</div>
              <pre className="text-foreground whitespace-pre-wrap break-all">
                {msg.tool_result?.image_url
                  ? <img src={msg.tool_result.image_url} alt="Generated" className="max-w-xs rounded mt-1" />
                  : JSON.stringify(msg.tool_result, null, 2)
                }
              </pre>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
