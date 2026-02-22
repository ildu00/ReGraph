import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not set");

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    logStep("Missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("Signature verification failed", { error: msg });
    return new Response(`Webhook signature error: ${msg}`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const amountUsd = parseFloat(session.metadata?.amount_usd || "0");

    if (!userId || !amountUsd) {
      logStep("Missing metadata", { userId, amountUsd });
      return new Response("Missing metadata", { status: 400 });
    }

    logStep("Processing payment", { userId, amountUsd, sessionId: session.id });

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("id, balance_usd")
      .eq("user_id", userId)
      .single();

    if (walletError || !wallet) {
      logStep("Wallet not found", { userId, error: walletError?.message });
      return new Response("Wallet not found", { status: 404 });
    }

    // Check for duplicate — idempotency via session.id
    const { data: existing } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("external_id", session.id)
      .maybeSingle();

    if (existing) {
      logStep("Duplicate event, already processed", { sessionId: session.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    // Create confirmed transaction
    const { error: txError } = await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      wallet_id: wallet.id,
      transaction_type: "deposit",
      status: "confirmed",
      amount_usd: amountUsd,
      external_id: session.id,
      metadata: {
        source: "stripe",
        session_id: session.id,
        payment_intent: session.payment_intent,
        customer_email: session.customer_email || session.customer_details?.email,
      },
    });

    if (txError) {
      logStep("Failed to insert transaction", { error: txError.message });
      return new Response("Transaction insert failed", { status: 500 });
    }

    // Credit wallet balance
    const newBalance = (wallet.balance_usd || 0) + amountUsd;
    const { error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({ balance_usd: newBalance })
      .eq("id", wallet.id);

    if (updateError) {
      logStep("Failed to update wallet balance", { error: updateError.message });
      return new Response("Balance update failed", { status: 500 });
    }

    logStep("Payment credited successfully", { walletId: wallet.id, newBalance, amountUsd });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
