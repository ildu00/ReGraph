import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth via JWT claims
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const token = authHeader.replace("Bearer ", "");
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  let userId: string;
  try {
    const { data, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !data?.claims) {
      // Fallback: try getUser
      const { data: userData, error: userError } = await anonClient.auth.getUser(token);
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      userId = userData.user.id;
    } else {
      userId = data.claims.sub;
    }
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const body = await req.json();
  const { action, bot_token, agent_id, bot_id } = body;

  const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook/${bot_token}`;

  if (action === "connect") {
    // Verify bot token with Telegram
    const tgRes = await fetch(`https://api.telegram.org/bot${bot_token}/getMe`);
    const tgData = await tgRes.json();
    console.log("Telegram getMe response:", JSON.stringify(tgData));

    if (!tgData.ok) {
      return new Response(JSON.stringify({ error: "Invalid bot token. Please check your token from BotFather." }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    const botUsername = tgData.result?.username;

    // Set webhook
    const webhookRes = await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const webhookData = await webhookRes.json();
    console.log("Webhook set response:", JSON.stringify(webhookData));

    // Check if bot already exists for this user
    const { data: existingBot } = await supabase
      .from("claw_telegram_bots")
      .select("id")
      .eq("bot_token", bot_token)
      .eq("user_id", userId)
      .single();

    let saveError;
    if (existingBot) {
      const { error } = await supabase
        .from("claw_telegram_bots")
        .update({ agent_id, bot_username: botUsername, is_active: true, webhook_set: webhookData.ok })
        .eq("id", existingBot.id);
      saveError = error;
    } else {
      const { error } = await supabase
        .from("claw_telegram_bots")
        .insert({ user_id: userId, agent_id, bot_token, bot_username: botUsername, is_active: true, webhook_set: webhookData.ok });
      saveError = error;
    }

    if (saveError) {
      console.error("Save error:", saveError);
      return new Response(JSON.stringify({ error: "Failed to save bot: " + saveError.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, bot_username: botUsername, webhook_set: webhookData.ok }), {
      headers: corsHeaders,
    });
  }

  if (action === "disconnect") {
    const { data: bot } = await supabase
      .from("claw_telegram_bots")
      .select("bot_token")
      .eq("id", bot_id)
      .eq("user_id", userId)
      .single();

    if (bot) {
      await fetch(`https://api.telegram.org/bot${bot.bot_token}/deleteWebhook`);
      await supabase.from("claw_telegram_bots").delete().eq("id", bot_id).eq("user_id", userId);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  if (action === "list") {
    const { data: bots } = await supabase
      .from("claw_telegram_bots")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return new Response(JSON.stringify({ bots: bots || [] }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
});
