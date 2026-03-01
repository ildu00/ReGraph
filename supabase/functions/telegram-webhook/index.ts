import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY")!;

// Build tool definitions from agent tools list (same as AgentFormModal TOOLS)
const TOOL_DEFINITIONS: Record<string, object> = {
  calculator: {
    type: "function",
    function: {
      name: "calculator",
      description: "Perform mathematical calculations. Use for any math operations.",
      parameters: { type: "object", properties: { expression: { type: "string", description: "The mathematical expression to evaluate, e.g. '2 + 2 * 10'" } }, required: ["expression"] },
    },
  },
  web_search: {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information, news, facts, and URLs.",
      parameters: { type: "object", properties: { query: { type: "string", description: "The search query" } }, required: ["query"] },
    },
  },
  code_interpreter: {
    type: "function",
    function: {
      name: "code_interpreter",
      description: "Execute code in JavaScript, Python, or TypeScript and return the output.",
      parameters: { type: "object", properties: { code: { type: "string", description: "The code to execute" }, language: { type: "string", enum: ["javascript", "python", "typescript"], description: "Programming language" } }, required: ["code"] },
    },
  },
  image_generation: {
    type: "function",
    function: {
      name: "image_generation",
      description: "Generate an image from a text description.",
      parameters: { type: "object", properties: { prompt: { type: "string", description: "Detailed description of the image to generate" } }, required: ["prompt"] },
    },
  },
  document_reader: {
    type: "function",
    function: {
      name: "document_reader",
      description: "Read and extract text from documents or URLs.",
      parameters: { type: "object", properties: { url: { type: "string", description: "The URL of the document or webpage to read" } }, required: ["url"] },
    },
  },
};

async function executeTool(name: string, input: any): Promise<string> {
  switch (name) {
    case "calculator": {
      try {
        const expr = String(input?.expression || "").replace(/[^0-9+\-*/().%\s]/g, "");
        const result = Function('"use strict"; return (' + expr + ')')();
        return JSON.stringify({ result: String(result) });
      } catch {
        return JSON.stringify({ error: "Invalid expression" });
      }
    }
    case "web_search": {
      const query = input?.query || "";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/claw-web-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        if (data.results?.length) {
          const formatted = data.results.map((r: any) => `${r.title}\n${r.url}\n${r.description || ""}`).join("\n\n");
          return JSON.stringify({ results: formatted });
        }
        return JSON.stringify({ results: "No results found." });
      } catch {
        return JSON.stringify({ error: "Web search failed." });
      }
    }
    case "code_interpreter": {
      const code = input?.code || "";
      const language = input?.language || "javascript";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/claw-code-interpreter`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ code, language }),
        });
        const data = await res.json();
        return JSON.stringify(data.error ? { error: data.error } : { output: data.output });
      } catch {
        return JSON.stringify({ error: "Code execution failed." });
      }
    }
    case "image_generation": {
      const prompt = input?.prompt || "";
      try {
        const lovableKey = Deno.env.get("LOVABLE_API_KEY");
        if (!lovableKey) return JSON.stringify({ error: "Image generation not configured" });
        const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}` },
          body: JSON.stringify({ model: "black-forest-labs/flux-schnell", prompt, n: 1 }),
        });
        const data = await res.json();
        console.log("Image generation response:", JSON.stringify(data));
        const imageUrl = data?.data?.[0]?.url || data?.data?.[0]?.b64_json ? null : null;
        const url = data?.data?.[0]?.url;
        if (url) return JSON.stringify({ imageUrl: url, message: "Image generated" });
        // b64 fallback
        const b64 = data?.data?.[0]?.b64_json;
        if (b64) return JSON.stringify({ imageBase64: b64, message: "Image generated" });
        return JSON.stringify({ error: "No image returned: " + JSON.stringify(data) });
      } catch (e) {
        return JSON.stringify({ error: "Image generation failed: " + String(e) });
      }
    }
    case "document_reader": {
      const url = input?.url || "";
      try {
        // Use Firecrawl to scrape the URL content
        const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
        if (!firecrawlKey) return JSON.stringify({ error: "Firecrawl not configured" });
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
        });
        const data = await res.json();
        const content = data?.data?.markdown || data?.markdown || "";
        if (!content) return JSON.stringify({ error: "Could not extract content from URL" });
        return JSON.stringify({ content: content.slice(0, 8000) });
      } catch (e) {
        return JSON.stringify({ error: "Document reading failed: " + String(e) });
      }
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const botToken = pathParts[pathParts.length - 1];

    if (!botToken) {
      return new Response(JSON.stringify({ error: "Missing bot token" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find bot and linked agent
    const { data: bot, error: botError } = await supabase
      .from("claw_telegram_bots")
      .select("*, claw_agents(*)")
      .eq("bot_token", botToken)
      .eq("is_active", true)
      .single();

    if (botError || !bot) {
      return new Response(JSON.stringify({ error: "Bot not found" }), { status: 404, headers: corsHeaders });
    }

    const update = await req.json();
    const message = update?.message || update?.edited_message;
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const chatId = message.chat.id;
    const userText = message.text;
    const agent = (bot as any).claw_agents;

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: corsHeaders });
    }

    // Send typing action
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });

    // Build tools list from agent config
    const agentTools: string[] = Array.isArray(agent.tools) ? agent.tools : [];
    const toolDefs = agentTools
      .filter((t: string) => TOOL_DEFINITIONS[t])
      .map((t: string) => TOOL_DEFINITIONS[t]);

    // Model mapping
    const modelMapping: Record<string, string> = {
      "llama-3.1-70b": "meta-llama/llama-3.1-70b-instruct",
      "llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
      "mistral-large": "mistralai/mistral-large",
      "qwen-72b": "qwen/qwen-2.5-72b-instruct",
      "gpt-4-turbo": "openai/gpt-4-turbo",
      "claude-3-sonnet": "anthropic/claude-sonnet-4",
      "deepseek-r1": "deepseek/deepseek-r1",
      "regraph-llm": "openai/gpt-4o-mini",
    };
    const vsegptModel = modelMapping[agent.model_id] || agent.model_id || "openai/gpt-4o-mini";

    // Agentic loop
    const messages: any[] = [
      { role: "system", content: agent.system_prompt || "You are a helpful assistant." },
      { role: "user", content: userText },
    ];

    let finalReply = "Sorry, I couldn't process your request.";
    const MAX_ITERATIONS = 5;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const reqBody: any = {
        model: vsegptModel,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      };
      if (toolDefs.length > 0) {
        reqBody.tools = toolDefs;
        reqBody.tool_choice = "auto";
      }

      const inferenceRes = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VSEGPT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!inferenceRes.ok) {
        console.error("Inference error:", inferenceRes.status, await inferenceRes.text());
        break;
      }

      const data = await inferenceRes.json();
      const choice = data.choices?.[0];
      const assistantMessage = choice?.message;

      if (!assistantMessage) break;

      messages.push(assistantMessage);

      // No tool calls — we have a final answer
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        finalReply = assistantMessage.content || finalReply;
        break;
      }

      // Execute all tool calls
      await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: "typing" }),
      });

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function?.name;
        let toolInput: any = {};
        try { toolInput = JSON.parse(toolCall.function?.arguments || "{}"); } catch { /* */ }

        console.log(`Executing tool: ${toolName}`, toolInput);
        const toolResult = await executeTool(toolName, toolInput);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }

    // Send reply to Telegram
    // If the reply contains an imageUrl, send photo
    let imageUrl: string | null = null;
    try {
      // Check last tool result for imageUrl
      const lastToolMsg = [...messages].reverse().find(m => m.role === "tool");
      if (lastToolMsg) {
        const parsed = JSON.parse(lastToolMsg.content || "{}");
        if (parsed.imageUrl) imageUrl = parsed.imageUrl;
      }
    } catch { /* */ }

    if (imageUrl) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: imageUrl, caption: finalReply.slice(0, 1024) }),
      });
    } else {
      // Telegram Markdown can fail with special chars — use plain text fallback
      const sendMsg = async (parseMode?: string) => {
        return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: finalReply,
            ...(parseMode ? { parse_mode: parseMode } : {}),
          }),
        });
      };

      const msgRes = await sendMsg("Markdown");
      if (!msgRes.ok) {
        // Fallback: send without markdown
        await sendMsg();
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
