import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify user JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const body = await req.json();
  const { action, bot_token, agent_id, bot_id } = body;

  const PROJECT_URL = SUPABASE_URL;
  const webhookUrl = `${PROJECT_URL}/functions/v1/telegram-webhook/${bot_token}`;

  if (action === "verify") {
    // Verify the bot token and get bot info
    const tgRes = await fetch(`https://api.telegram.org/bot${bot_token}/getMe`);
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return new Response(JSON.stringify({ error: "Invalid bot token" }), { status: 400, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ ok: true, bot: tgData.result }), { headers: corsHeaders });
  }

  if (action === "connect") {
    // Verify bot token
    const tgRes = await fetch(`https://api.telegram.org/bot${bot_token}/getMe`);
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return new Response(JSON.stringify({ error: "Invalid bot token" }), { status: 400, headers: corsHeaders });
    }
    const botUsername = tgData.result?.username;

    // Set webhook
    const webhookRes = await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const webhookData = await webhookRes.json();

    // Upsert bot record
    const { error: upsertError } = await supabase
      .from("claw_telegram_bots")
      .upsert({
        user_id: user.id,
        agent_id,
        bot_token,
        bot_username: botUsername,
        is_active: true,
        webhook_set: webhookData.ok,
      }, { onConflict: "bot_token" });

    if (upsertError) {
      return new Response(JSON.stringify({ error: "Failed to save bot" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, bot_username: botUsername, webhook_set: webhookData.ok }), { headers: corsHeaders });
  }

  if (action === "disconnect") {
    // Remove webhook
    const { data: bot } = await supabase
      .from("claw_telegram_bots")
      .select("bot_token")
      .eq("id", bot_id)
      .eq("user_id", user.id)
      .single();

    if (bot) {
      await fetch(`https://api.telegram.org/bot${bot.bot_token}/deleteWebhook`);
      await supabase.from("claw_telegram_bots").delete().eq("id", bot_id).eq("user_id", user.id);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  if (action === "list") {
    const { data: bots } = await supabase
      .from("claw_telegram_bots")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    return new Response(JSON.stringify({ bots: bots || [] }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
});
