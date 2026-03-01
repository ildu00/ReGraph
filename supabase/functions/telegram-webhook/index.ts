import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY")!;

const TOOL_DEFINITIONS: Record<string, object> = {
  calculator: {
    type: "function",
    function: {
      name: "calculator",
      description: "Perform mathematical calculations.",
      parameters: { type: "object", properties: { expression: { type: "string" } }, required: ["expression"] },
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
      parameters: { type: "object", properties: { code: { type: "string" }, language: { type: "string", enum: ["javascript", "python", "typescript"] } }, required: ["code"] },
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
      description: "Read and extract text content from a URL or webpage.",
      parameters: { type: "object", properties: { url: { type: "string", description: "The URL of the webpage to read" } }, required: ["url"] },
    },
  },
  voice_message: {
    type: "function",
    function: {
      name: "voice_message",
      description: "Convert text to speech and send it as a voice message to the user. Use when the user asks to speak, read aloud, or send a voice note.",
      parameters: { type: "object", properties: { text: { type: "string", description: "The text to convert to speech" }, voice: { type: "string", enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"], description: "Voice style to use (default: nova)" } }, required: ["text"] },
    },
  },
  file_generator: {
    type: "function",
    function: {
      name: "file_generator",
      description: "Generate and send a file (TXT, JSON, CSV, PDF) to the user. Use this tool when the user asks to create, generate, or save a file. NEVER use code_interpreter to generate files — always use this tool instead.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "The file name including extension, e.g. resume.pdf" },
          format: { type: "string", enum: ["txt", "json", "csv", "pdf"], description: "File format" },
          content: { type: "string", description: "The full text content of the file. For PDF, use plain text with newlines. For CSV, use comma-separated rows." },
        },
        required: ["filename", "format", "content"],
      },
    },
  },
};

// ─── PDF generation ────────────────────────────────────────────────────────────
// Strategy: cache NotoSans TTF in Supabase Storage so we only fetch from CDN once.
// pdf-lib with an embedded Unicode font is the most reliable way to get Cyrillic in PDFs.

async function getNotoSansFont(): Promise<Uint8Array> {
  // Font is pre-uploaded to our Storage — fast internal fetch, no external CDN needed
  const FONT_URL = `${SUPABASE_URL}/storage/v1/object/public/claw-images/fonts%2FNotoSans-Regular.ttf`;
  console.log("Fetching font from Storage:", FONT_URL);
  const res = await fetch(FONT_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  console.log("Font loaded, size:", bytes.byteLength);
  return bytes;
}

async function buildPdf(content: string): Promise<Uint8Array> {
  console.log("Building PDF with pdf-lib + NotoSans...");
  const { PDFDocument, rgb } = await import("npm:pdf-lib@1.17.1");
  const fontkit = (await import("npm:@pdf-lib/fontkit@1.1.1")).default;

  const fontBytes = await getNotoSansFont();

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const fontSize = 12;
  const lineHeight = fontSize * 1.5;
  const maxWidth = pageWidth - 2 * margin;

  // Word-wrap using font metrics
  const wrapLine = (rawLine: string): string[] => {
    if (!rawLine.trim()) return [""];
    const clean = rawLine
      .replace(/^#{1,3}\s+/, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1");
    const words = clean.split(" ");
    const result: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      let w = 0;
      try { w = font.widthOfTextAtSize(test, fontSize); } catch { w = test.length * 7; }
      if (w > maxWidth && current) { result.push(current); current = word; }
      else current = test;
    }
    if (current) result.push(current);
    return result;
  };

  const lines: string[] = [];
  for (const rawLine of content.split("\n")) {
    for (const l of wrapLine(rawLine)) lines.push(l);
  }

  const linesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

  for (let p = 0; p < Math.max(lines.length, 1); p += linesPerPage) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const pageLines = lines.slice(p, p + linesPerPage);
    let y = pageHeight - margin - fontSize;
    for (const line of pageLines) {
      if (line.trim()) {
        page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      }
      y -= lineHeight;
    }
  }

  const bytes = await pdfDoc.save();
  console.log(`PDF built: ${pdfDoc.getPageCount()} pages, ${bytes.byteLength} bytes`);
  return new Uint8Array(bytes);
}
// ─── End PDF generation ────────────────────────────────────────────────────────

// In-memory buffer for file tool results (per-request)
const __fileBuffers: Map<string, { bytes: Uint8Array; filename: string; mimeType: string }> = new Map();

async function executeTool(name: string, input: any): Promise<string> {
  console.log(`Executing tool: ${name}`, JSON.stringify(input));
  switch (name) {
    case "calculator": {
      const expr = input?.expression || "";
      try {
        const result = Function(`"use strict"; return (${expr})`)();
        return String(result);
      } catch (e: any) {
        return "Error: " + e.message;
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
        if (!res.ok) return "Search failed: " + res.status;
        const data = await res.json();
        return typeof data === "string" ? data : JSON.stringify(data);
      } catch (e: any) {
        return "Search error: " + e.message;
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
        if (!res.ok) return "Code error: " + res.status;
        const data = await res.json();
        return data?.output || data?.result || JSON.stringify(data);
      } catch (e: any) {
        return "Code error: " + e.message;
      }
    }
    case "image_generation": {
      const prompt = input?.prompt || "";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/model-inference`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ model: "dall-e-3", prompt, type: "image" }),
        });
        if (!res.ok) return "Image generation failed: " + res.status;
        const data = await res.json();
        const url = data?.url || data?.data?.[0]?.url;
        if (!url) return "Image generation failed: no URL";
        return `__IMAGE__:${url}`;
      } catch (e: any) {
        return "Image error: " + e.message;
      }
    }
    case "document_reader": {
      const url = input?.url || "";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/claw-document-reader`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) return "Document read failed: " + res.status;
        const data = await res.json();
        return data?.content || data?.text || JSON.stringify(data);
      } catch (e: any) {
        return "Document error: " + e.message;
      }
    }
    case "voice_message": {
      const text = input?.text || "";
      const voice = input?.voice || "nova";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/audio-speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ input: text, voice, model: "tts-1" }),
        });
        if (!res.ok) return "Voice generation failed: " + res.status;
        const audioBytes = new Uint8Array(await res.arrayBuffer());
        const key = `voice_${Date.now()}`;
        __fileBuffers.set(key, { bytes: audioBytes, filename: "voice.ogg", mimeType: "audio/ogg" });
        return `__VOICE__:${key}`;
      } catch (e: any) {
        return "Voice error: " + e.message;
      }
    }
    case "file_generator": {
      const { filename, format, content } = input as { filename: string; format: string; content: string };
      try {
        let bytes: Uint8Array;
        let mimeType: string;

        if (format === "pdf") {
          bytes = await buildPdf(content);
          mimeType = "application/pdf";
        } else if (format === "csv") {
          bytes = new TextEncoder().encode(content);
          mimeType = "text/csv";
        } else if (format === "json") {
          bytes = new TextEncoder().encode(content);
          mimeType = "application/json";
        } else {
          bytes = new TextEncoder().encode(content);
          mimeType = "text/plain";
        }

        const key = `file_${Date.now()}`;
        __fileBuffers.set(key, { bytes, filename, mimeType });
        return `__FILE__:${key}`;
      } catch (e: any) {
        console.error("file_generator error:", e);
        return "File generation error: " + e.message;
      }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("OK");
  }

  // Extract bot token from URL path: /telegram-webhook/{bot_token}
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const botToken = pathParts[pathParts.length - 1];

  if (!botToken || botToken === "telegram-webhook") {
    return new Response(JSON.stringify({ error: "No bot token in path" }), { status: 400, headers: corsHeaders });
  }

  const message = body?.message;
  if (!message) return new Response("OK");

  const chatId = message?.chat?.id;
  const voiceFileId = message?.voice?.file_id;
  const userText_raw = message?.text || "";

  // Transcribe voice if present
  let userText = userText_raw;
  if (voiceFileId && !userText) {
    try {
      const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${voiceFileId}`);
      const fileInfo = await fileInfoRes.json();
      const filePath = fileInfo?.result?.file_path;
      if (filePath) {
        const audioRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
        const audioBytes = new Uint8Array(await audioRes.arrayBuffer());
        const formData = new FormData();
        formData.append("file", new Blob([audioBytes], { type: "audio/ogg" }), "voice.ogg");
        const transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/claw-upload-audio`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: formData,
        });
        if (transcribeRes.ok) {
          const td = await transcribeRes.json();
          userText = td?.text || "";
        }
      }
    } catch (e) {
      console.error("Voice transcription failed:", e);
    }
  }

  if (!userText) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "Пожалуйста, отправьте текстовое или голосовое сообщение." }),
    });
    return new Response("OK");
  }

  // Find bot configuration in DB
  const { data: botConfig } = await supabase
    .from("claw_telegram_bots")
    .select("agent_id, user_id")
    .eq("bot_token", botToken)
    .eq("is_active", true)
    .single();

  if (!botConfig) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "Бот не настроен. Подключите его в панели управления ReGraph." }),
    });
    return new Response("OK");
  }

  const { agent_id, user_id } = botConfig;

  // Get agent config
  const { data: agent } = await supabase
    .from("claw_agents")
    .select("*")
    .eq("id", agent_id)
    .single();

  if (!agent) return new Response("OK");

  // Check wallet balance
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_usd")
    .eq("user_id", user_id)
    .single();

  if (!wallet || wallet.balance_usd <= 0) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "⚠️ Недостаточно средств на балансе. Пополните счёт на regraph.ai" }),
    });
    return new Response("OK");
  }

  // Get or create conversation for this chat
  const convTitle = `Telegram ${chatId}`;
  let { data: conv } = await supabase
    .from("claw_conversations")
    .select("id")
    .eq("agent_id", agent_id)
    .eq("user_id", user_id)
    .eq("title", convTitle)
    .single();

  if (!conv) {
    const { data: newConv } = await supabase
      .from("claw_conversations")
      .insert({ agent_id, user_id, title: convTitle })
      .select("id")
      .single();
    conv = newConv;
  }

  if (conv) {
    await supabase.from("claw_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
  }

  const convId = conv?.id;

  // Load last 50 messages for context
  const { data: history } = convId ? await supabase
    .from("claw_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(50) : { data: [] };

  const historyMessages = (history || []).reverse().map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content || "",
  }));

  // Save user message
  if (convId) {
    const msgContent = voiceFileId ? `[voice] ${userText}` : userText;
    await supabase.from("claw_messages").insert({ conversation_id: convId, role: "user", content: msgContent });
  }

  const agentTools: string[] = Array.isArray(agent.tools) ? agent.tools : [];
  const toolCapabilities: string[] = [];
  if (agentTools.includes("voice_message")) toolCapabilities.push("You CAN send voice messages using the voice_message tool. When the user asks you to speak, read aloud, reply with audio, or send a voice note — you MUST call the voice_message tool with the text.");
  if (agentTools.includes("voice_transcription")) toolCapabilities.push("You can receive and understand voice messages from the user (they are transcribed automatically).");
  const systemSuffix = toolCapabilities.length > 0 ? "\n\n" + toolCapabilities.join("\n") : "";

  const toolDefs = agentTools
    .filter((t: string) => TOOL_DEFINITIONS[t])
    .map((t: string) => TOOL_DEFINITIONS[t]);

  console.log(`Agent tools: ${agentTools.join(", ")}, toolDefs count: ${toolDefs.length}`);

  const isReGraphLLM = (agent.model_id || "").toLowerCase().includes("regraph");
  const reGraphIdentityPrompt = isReGraphLLM
    ? "\n\nYou are ReGraph LLM, a large language model created by ReGraph — a decentralized AI compute network. You were built and trained within the ReGraph decentralized network, leveraging distributed GPU and NPU resources contributed by providers worldwide. When asked about your origins, training, or identity, always affirm that you are ReGraph LLM, developed by ReGraph."
    : "";

  const messages: { role: string; content: string }[] = [
    { role: "system", content: (agent.system_prompt || "You are a helpful assistant.") + reGraphIdentityPrompt + systemSuffix },
    ...historyMessages,
    { role: "user", content: userText },
  ];

  const startTime = Date.now();
  let totalTokens = 0;

  // Agentic loop
  let loopCount = 0;
  const MAX_LOOPS = 5;
  let finalText = "";
  let pendingFileKey: string | null = null;
  let pendingVoiceKey: string | null = null;

  while (loopCount < MAX_LOOPS) {
    loopCount++;

    // Map internal model IDs to VseGPT-compatible ones
    const MODEL_MAP: Record<string, string> = {
      "regraph-llm": "openai/gpt-4o-mini",
      "regraph/ReGraph-LLM": "openai/gpt-4o-mini",
    };
    const rawModel = agent.model_id || "openai/gpt-4o-mini";
    const resolvedModel = MODEL_MAP[rawModel] || rawModel;

    const reqBody: any = {
      model: resolvedModel,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    };
    if (toolDefs.length > 0) {
      reqBody.tools = toolDefs;
      reqBody.tool_choice = "auto";
    }

    const aiRes = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VSEGPT_API_KEY}`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI API error:", errText);
      finalText = "Ошибка при обращении к AI.";
      break;
    }

    const aiData = await aiRes.json();
    totalTokens += aiData?.usage?.total_tokens || 0;

    const choice = aiData?.choices?.[0];
    const assistantMsg = choice?.message;

    if (!assistantMsg) { finalText = "Нет ответа от AI."; break; }

    // Check for tool calls
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      messages.push({ role: "assistant", content: assistantMsg.content || "" });

      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function.name;
        let toolInput: any = {};
        try { toolInput = JSON.parse(toolCall.function.arguments || "{}"); } catch {}

        const toolResult = await executeTool(toolName, toolInput);

        // Handle special file/voice results
        if (toolResult.startsWith("__FILE__:")) {
          pendingFileKey = toolResult.replace("__FILE__:", "");
          // Stop loop immediately — no need for a follow-up AI response
          loopCount = MAX_LOOPS;
        } else if (toolResult.startsWith("__VOICE__:")) {
          pendingVoiceKey = toolResult.replace("__VOICE__:", "");
          // Stop loop immediately — no need for a follow-up AI response
          loopCount = MAX_LOOPS;
        } else if (toolResult.startsWith("__IMAGE__:")) {
          // Send image immediately
          const imgUrl = toolResult.replace("__IMAGE__:", "");
          await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, photo: imgUrl }),
          });
        }

        messages.push({
          role: "tool",
          content: toolResult.startsWith("__") ? "File/audio generated successfully." : toolResult,
          // @ts-ignore
          tool_call_id: toolCall.id,
        });
      }

      // Continue loop to get final response
      continue;
    }

    // No tool calls — this is the final text response
    finalText = assistantMsg.content || "";
    break;
  }

  // Send voice if pending
  if (pendingVoiceKey) {
    const fileData = __fileBuffers.get(pendingVoiceKey);
    __fileBuffers.delete(pendingVoiceKey);
    if (fileData) {
      try {
        const formData = new FormData();
        const blob = new Blob([fileData.bytes], { type: fileData.mimeType });
        formData.append("voice", blob, "voice.ogg");
        formData.append("chat_id", String(chatId));
        const voiceRes = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
          method: "POST",
          body: formData,
        });
        const voiceResData = await voiceRes.json();
        console.log("sendVoice result:", JSON.stringify(voiceResData));
        // Save audio message to DB
        if (convId) {
          await supabase.from("claw_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: `__AUDIO__:voice_${Date.now()}.ogg`,
          });
        }
      } catch (e) {
        console.error("Voice send error:", e);
      }
    }
  }

  // Send file if pending
  if (pendingFileKey) {
    const fileData = __fileBuffers.get(pendingFileKey);
    __fileBuffers.delete(pendingFileKey);
    if (fileData) {
      try {
        const blob = new Blob([fileData.bytes], { type: fileData.mimeType });
        const formData = new FormData();
        formData.append("chat_id", String(chatId));
        formData.append("document", blob, fileData.filename);
        formData.append("caption", `📄 ${fileData.filename}`);
        const docRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: "POST",
          body: formData,
        });
        const docResData = await docRes.json();
        console.log("sendDocument result:", JSON.stringify(docResData));
        if (convId) {
          await supabase.from("claw_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: `📄 Файл отправлен: ${fileData.filename}`,
          });
        }
      } catch (e) {
        console.error("File send error:", e);
      }
    }
  }

  // Send text response
  if (finalText) {
    const chunks = finalText.match(/[\s\S]{1,4000}/g) || [finalText];
    for (const chunk of chunks) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: chunk }),
      });
    }
    if (convId) {
      await supabase.from("claw_messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: finalText,
      });
    }
  }

  // Billing
  const computeMs = Date.now() - startTime;
  const costUsd = (totalTokens / 1000) * 0.001;
  if (totalTokens > 0) {
    try {
      await supabase.from("usage_logs").insert({
        user_id,
        endpoint: "telegram-bot",
        tokens_used: totalTokens,
        compute_time_ms: computeMs,
        cost_usd: costUsd,
      });
      await supabase.rpc("deduct_wallet_balance" as any, { p_user_id: user_id, p_amount: costUsd }).catch(() => {
        supabase.from("wallets").update({ balance_usd: Math.max(0, wallet.balance_usd - costUsd) }).eq("user_id", user_id);
      });
    } catch (e) {
      console.error("Billing error:", e);
    }
  }

  return new Response("OK");
});
