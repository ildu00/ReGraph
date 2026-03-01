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
};

async function executeTool(name: string, input: any): Promise<string> {
  console.log(`Executing tool: ${name}`, JSON.stringify(input));
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
        // Call claw-web-search exactly like the website does
        const res = await fetch(`${SUPABASE_URL}/functions/v1/claw-web-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        console.log("Web search status:", res.status);
        if (data.results?.length) {
          const formatted = data.results.map((r: any) => `${r.title}\n${r.url}\n${r.description || ""}`).join("\n\n");
          return JSON.stringify({ results: formatted });
        }
        return JSON.stringify({ results: "No results found." });
      } catch (e) {
        return JSON.stringify({ error: "Web search failed: " + String(e) });
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
        // Call model-inference exactly like the website Claw agent does
        const res = await fetch(`${SUPABASE_URL}/functions/v1/model-inference`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ model: "sdxl-turbo", prompt, category: "image-gen" }),
        });
        const data = await res.json();
        console.log("Image generation status:", res.status, JSON.stringify(data).slice(0, 400));
        const rawUrl: string | undefined = data?.imageUrl || data?.data?.[0]?.url || data?.url;
        if (!rawUrl) return JSON.stringify({ error: data?.error || "Image generation failed" });
        // If base64 — upload to claw-images storage bucket and return public URL
        if (rawUrl.startsWith("data:")) {
          try {
            const [meta, base64] = rawUrl.split(",");
            const mimeMatch = meta.match(/data:([^;]+);/);
            const mimeType = mimeMatch?.[1] || "image/png";
            const ext = mimeType.split("/")[1] || "png";
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const storageRes = await fetch(
              `${SUPABASE_URL}/storage/v1/object/claw-images/${fileName}`,
              { method: "POST", headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": mimeType, "x-upsert": "false" }, body: bytes }
            );
            if (storageRes.ok) {
              const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/claw-images/${fileName}`;
              return JSON.stringify({ imageUrl: publicUrl, message: "Image generated" });
            }
          } catch (e) {
            console.warn("Storage upload failed:", e);
          }
          // Fallback: send raw base64
          const b64 = rawUrl.split(",")[1];
          return JSON.stringify({ imageBase64: b64, message: "Image generated" });
        }
        return JSON.stringify({ imageUrl: rawUrl, message: "Image generated" });
      } catch (e) {
        return JSON.stringify({ error: "Image generation failed: " + String(e) });
      }
    }
    case "document_reader": {
      const url = input?.url || "";
      try {
        const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
        if (!firecrawlKey) return JSON.stringify({ error: "Document reader not configured" });
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
        });
        const data = await res.json();
        console.log("Document reader response status:", res.status, "ok:", res.ok);
        const content = data?.data?.markdown || data?.markdown || "";
        if (!content) return JSON.stringify({ error: "Could not extract content from URL. Response: " + JSON.stringify(data).slice(0, 200) });
        return JSON.stringify({ content: content.slice(0, 8000) });
      } catch (e) {
        return JSON.stringify({ error: "Document reading failed: " + String(e) });
      }
    }
    case "voice_message": {
      const text = input?.text || "";
      const voice = input?.voice || "nova";
      try {
        const res = await fetch("https://api.vsegpt.ru/v1/audio/speech", {
          method: "POST",
          headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "tts-openai/tts-1", input: text, voice, response_format: "mp3" }),
        });
        if (!res.ok) {
          const err = await res.text();
          console.error("TTS error:", res.status, err);
          return JSON.stringify({ error: "TTS failed: " + err.slice(0, 200) });
        }
        const audioBuffer = await res.arrayBuffer();
        console.log("TTS audio generated, bytes:", audioBuffer.byteLength);
        // Upload to Supabase Storage so Telegram can access a stable public URL
        const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
        const storageRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/claw-images/${fileName}`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "audio/mpeg",
              "x-upsert": "false",
            },
            body: new Uint8Array(audioBuffer),
          }
        );
        if (storageRes.ok) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/claw-images/${fileName}`;
          console.log("Audio uploaded to storage:", publicUrl);
          return JSON.stringify({ audioUrl: publicUrl, audioFormat: "mp3", message: "Voice message generated" });
        }
        const storageErr = await storageRes.text();
        console.error("Audio storage upload failed:", storageRes.status, storageErr);
        // Fallback: store raw buffer in memory
        const audioKey = `audio_${Date.now()}`;
        (globalThis as any).__audioBuffers = (globalThis as any).__audioBuffers || {};
        (globalThis as any).__audioBuffers[audioKey] = audioBuffer;
        return JSON.stringify({ audioKey, audioFormat: "mp3", message: "Voice message generated" });
      } catch (e) {
        return JSON.stringify({ error: "TTS failed: " + String(e) });
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
    const hasVoice = !!message?.voice;
    if (!message?.text && !hasVoice) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const chatId = message.chat.id;
    let userText = message.text || "";

    // Transcribe incoming voice message via VseGPT Whisper
    if (hasVoice) {
      try {
        const fileId = message.voice.file_id;
        const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileInfo = await fileInfoRes.json();
        const filePath = fileInfo?.result?.file_path;
        if (filePath) {
          const audioRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
          const audioBuffer = await audioRes.arrayBuffer();
          console.log("Audio buffer size:", audioBuffer.byteLength, "file_path:", filePath);

          // Use our own audio-transcriptions edge function (has correct model mapping)
          try {
            const formData = new FormData();
            formData.append("file", new Blob([audioBuffer], { type: "audio/ogg" }), "voice.ogg");
            formData.append("model", "stt-openai/whisper-v3");
            const transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/audio-transcriptions`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
              body: formData,
            });
            const rawText = await transcribeRes.text();
            console.log("Transcribe status:", transcribeRes.status, "body preview:", rawText.slice(0, 300));
            if (transcribeRes.ok) {
              try {
                const transcribeData = JSON.parse(rawText);
                userText = transcribeData?.text || rawText.trim();
              } catch {
                userText = rawText.trim();
              }
              console.log("Transcription success:", userText.slice(0, 100));
            } else {
              console.error("Transcription failed:", transcribeRes.status, rawText.slice(0, 300));
            }
          } catch (transcribeErr) {
            console.error("Transcription request error:", transcribeErr);
          }
        }
      } catch (e) {
        console.error("Voice transcription failed:", e);
      }
      if (!userText) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: message.chat.id, text: "⚠️ Could not transcribe your voice message. Please try again." }),
        });
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
    }
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

    // Find or create conversation for this Telegram chat
    const telegramConvTitle = `Telegram ${chatId}`;
    let conversationId: string;
    const { data: existingConv } = await supabase
      .from("claw_conversations")
      .select("id")
      .eq("agent_id", agent.id)
      .eq("user_id", bot.user_id)
      .eq("title", telegramConvTitle)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from("claw_conversations")
        .insert({ agent_id: agent.id, user_id: bot.user_id, title: telegramConvTitle })
        .select("id")
        .single();
      conversationId = newConv!.id;
    }

    // Load last 50 messages from history
    const { data: historyRows } = await supabase
      .from("claw_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(50);

    const historyMessages = (historyRows || []).reverse().map((m: any) => ({
      role: m.role,
      content: m.content || "",
    }));

    // Save incoming user message
    await supabase.from("claw_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: userText,
    });

    // Build tools list from agent config
    const agentTools: string[] = Array.isArray(agent.tools) ? agent.tools : [];
    const toolDefs = agentTools
      .filter((t: string) => TOOL_DEFINITIONS[t])
      .map((t: string) => TOOL_DEFINITIONS[t]);

    console.log(`Agent tools: ${agentTools.join(", ")}, toolDefs count: ${toolDefs.length}`);

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
    const toolCapabilities: string[] = [];
    if (agentTools.includes("voice_message")) toolCapabilities.push("You CAN send voice messages using the voice_message tool. When the user asks you to speak, read aloud, reply with audio, or send a voice note — you MUST call the voice_message tool with the text.");
    if (agentTools.includes("voice_transcription")) toolCapabilities.push("You can receive and understand voice messages from the user (they are transcribed automatically).");
    const systemSuffix = toolCapabilities.length > 0 ? "\n\n" + toolCapabilities.join("\n") : "";

    const messages: any[] = [
      { role: "system", content: (agent.system_prompt || "You are a helpful assistant.") + systemSuffix },
      ...historyMessages,
      { role: "user", content: userText },
    ];

    // Check balance before inference
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, balance_usd")
      .eq("user_id", bot.user_id)
      .single();

    if (!wallet || wallet.balance_usd <= 0) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "⚠️ Insufficient balance. Please top up your ReGraph wallet." }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    let finalReply = "Sorry, I couldn't process your request.";
    const MAX_ITERATIONS = 5;
    let generatedImageUrl: string | null = null;
    let generatedImageBase64: string | null = null;
    let generatedAudioUrl: string | null = null;
    let generatedAudioBuffer: ArrayBuffer | null = null; // Store raw bytes to avoid base64 stack overflow
    let totalTokensUsed = 0;
    const startTime = Date.now();

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
        const errText = await inferenceRes.text();
        console.error("Inference error:", inferenceRes.status, errText);
        break;
      }

      const data = await inferenceRes.json();
      const choice = data.choices?.[0];
      const assistantMessage = choice?.message;

      // Accumulate token usage
      if (data.usage?.total_tokens) totalTokensUsed += data.usage.total_tokens;

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

        const toolResult = await executeTool(toolName, toolInput);

        // Check for image/audio in tool result
        try {
          const parsed = JSON.parse(toolResult);
          if (parsed.imageUrl) {
            generatedImageUrl = parsed.imageUrl;
            finalReply = "🎨 Here's your image!";
          }
          if (parsed.imageBase64) {
            generatedImageBase64 = parsed.imageBase64;
            finalReply = "🎨 Here's your image!";
          }
          if (parsed.audioKey) {
            // Retrieve raw buffer stored by voice_message tool
            const buf = (globalThis as any).__audioBuffers?.[parsed.audioKey];
            if (buf) {
              generatedAudioBuffer = buf;
              delete (globalThis as any).__audioBuffers[parsed.audioKey];
            }
            finalReply = "🔊";
          }
          if (parsed.audioUrl) {
            generatedAudioUrl = parsed.audioUrl;
            finalReply = "🔊";
          }
        } catch { /* */ }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      // If image/audio was generated — no need for another LLM call, just exit loop
      if (generatedImageUrl || generatedImageBase64 || generatedAudioBuffer || generatedAudioUrl) break;
    }

    // Billing: charge user and log usage
    if (totalTokensUsed > 0) {
      // ~$0.001 per 1k tokens (approximate blended rate)
      const costUsd = Math.max(0.000001, (totalTokensUsed / 1000) * 0.001);
      const computeMs = Date.now() - startTime;
      const newBalance = Math.max(0, wallet.balance_usd - costUsd);

      await Promise.all([
        supabase.from("wallets").update({ balance_usd: newBalance }).eq("user_id", bot.user_id),
        supabase.from("usage_logs").insert({
          user_id: bot.user_id,
          endpoint: "telegram-bot",
          tokens_used: totalTokensUsed,
          compute_time_ms: computeMs,
          cost_usd: costUsd,
        }),
      ]);
    }

    // Send reply to Telegram
    // Save assistant reply to history
    await supabase.from("claw_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: finalReply,
    });

    if (generatedAudioBuffer) {
      // Send raw ArrayBuffer directly as Blob — no base64 needed, no stack overflow
      try {
        const blob = new Blob([generatedAudioBuffer], { type: "audio/mpeg" });
        const formData = new FormData();
        formData.append("chat_id", String(chatId));
        formData.append("voice", blob, "voice.mp3");
        
        console.log("Sending voice buffer, size:", generatedAudioBuffer.byteLength);
        const voiceRes = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
          method: "POST",
          body: formData,
        });
        const voiceResText = await voiceRes.text();
        if (!voiceRes.ok) {
          console.error("sendVoice error:", voiceRes.status, voiceResText);
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: "🔊 Не удалось отправить голосовое сообщение." }),
          });
        } else {
          console.log("sendVoice success");
        }
      } catch (e) {
        console.error("Voice send exception:", e);
      }
    } else if (generatedAudioUrl) {
      // Legacy fallback with base64 URL
      try {
        const binaryStr = atob(generatedAudioUrl);
        const audioBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) audioBytes[i] = binaryStr.charCodeAt(i);
        const blob = new Blob([audioBytes], { type: "audio/mpeg" });
        const formData = new FormData();
        formData.append("chat_id", String(chatId));
        formData.append("voice", blob, "voice.mp3");
        await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, { method: "POST", body: formData });
      } catch (e) {
        console.error("Voice legacy send exception:", e);
      }
    } else if (generatedImageUrl) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: generatedImageUrl, caption: finalReply.slice(0, 1024) }),
      });
    } else if (generatedImageBase64) {
      // Send base64 image via multipart
      const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
      const caption = finalReply.slice(0, 1024);
      const imgBytes = Uint8Array.from(atob(generatedImageBase64), c => c.charCodeAt(0));
      const enc = new TextEncoder();
      const parts: Uint8Array[] = [
        enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`),
        enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`),
        enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`),
        imgBytes,
        enc.encode(`\r\n--${boundary}--\r\n`),
      ];
      const totalLen = parts.reduce((s, p) => s + p.length, 0);
      const body = new Uint8Array(totalLen);
      let offset = 0;
      for (const p of parts) { body.set(p, offset); offset += p.length; }
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
        body,
      });
    } else {
      // Send text message with Markdown fallback to plain text
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
        await sendMsg();
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
