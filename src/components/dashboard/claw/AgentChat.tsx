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
        // Extract last user/tool message as prompt (required by model-inference)
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

        // model-inference may return {response: "..."} or OpenAI-style {choices: [{message: {...}}]}
        const choice = data?.choices?.[0];
        const assistantMsg = choice?.message ?? (
          data?.response != null
            ? { role: "assistant", content: data.response, tool_calls: data.tool_calls }
            : null
        );

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
          let idx = -1;
          for (let i = prev.length - 1; i >= 0; i--) { if (prev[i].role === "assistant" && prev[i].isStreaming) { idx = i; break; } }
          if (idx === -1) return [...prev, { id: crypto.randomUUID(), role: "assistant", content: finalContent }];
          return prev.map((m, i) => i === idx ? { ...m, content: finalContent, isStreaming: false } : m);
        });
        await persistMessage(conversationId, { role: "assistant", content: finalContent });
        break;

      } catch (err: any) {
        const errMsg = err?.message || "Network error";
        setMessages((prev) => {
          let idx = -1;
          for (let i = prev.length - 1; i >= 0; i--) { if (prev[i].role === "assistant" && prev[i].isStreaming) { idx = i; break; } }
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
    <div className="flex flex-col flex-1 min-h-0 md:h-[calc(100vh-12rem)]">
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

        {messages.map((msg) => {
          if (msg.role === "tool") return <ToolCallMessage key={msg.id} msg={msg} />;
          return (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`group max-w-[80%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/70"
                }`}>
                  {msg.isStreaming && !msg.content ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : msg.role === "assistant" ? (
                    <div className="markdown-response text-sm">
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

  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary border border-border">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
          {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
          <span className="font-mono">{msg.tool_name}</span>
          {isRunning ? <span>Running...</span> : <span className="text-primary">Done</span>}
        </div>
        <Card className="bg-secondary/50 border-border p-3 text-xs font-mono">
          <div className="text-muted-foreground mb-1">Input:</div>
          <pre className="text-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(msg.tool_input, null, 2)}
          </pre>
          {msg.tool_result && (
            <>
              <div className="text-muted-foreground mt-2 mb-1">Result:</div>
              {msg.tool_result?.image_url ? (
                <img src={msg.tool_result.image_url} alt="Generated" className="max-w-xs rounded mt-1" />
              ) : (
                <pre className="text-foreground whitespace-pre-wrap break-all">
                  {JSON.stringify(msg.tool_result, null, 2)}
                </pre>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
