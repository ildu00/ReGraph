import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // Path: /telegram-webhook/{botToken}
    const pathParts = url.pathname.split("/");
    const botToken = pathParts[pathParts.length - 1];

    if (!botToken) {
      return new Response(JSON.stringify({ error: "Missing bot token" }), { status: 400, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the bot and its linked agent
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

    // Call inference
    const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY");
    const inferenceRes = await fetch(`${SUPABASE_URL}/functions/v1/inference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "x-api-key": `service-telegram`,
      },
      body: JSON.stringify({
        model: agent.model_id || "openai/gpt-5-mini",
        messages: [
          { role: "system", content: agent.system_prompt || "You are a helpful assistant." },
          { role: "user", content: userText },
        ],
        stream: false,
      }),
    });

    let replyText = "Sorry, I couldn't process your request.";
    if (inferenceRes.ok) {
      const inferenceData = await inferenceRes.json();
      replyText = inferenceData?.choices?.[0]?.message?.content || replyText;
    } else {
      const errText = await inferenceRes.text();
      console.error("Inference error:", inferenceRes.status, errText);
    }

    // Reply to user
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        parse_mode: "Markdown",
      }),
    });

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
