import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function resolvePriceId(item: any): string {
  return item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
}

/**
 * Resolve the user's email for an internal admin notification.
 * Prefers Stripe customer email (cheap), falls back to auth.users via service-role.
 */
async function resolveUserEmail(userId: string | undefined, stripeEmail?: string): Promise<string> {
  if (stripeEmail) return stripeEmail;
  if (!userId) return "—";
  try {
    const { data } = await getSupabase().auth.admin.getUserById(userId);
    return data?.user?.email || "—";
  } catch {
    return "—";
  }
}

/**
 * Enqueue an internal admin notification email (to suporte@) using the
 * transactional email pipeline. Failures are swallowed — we never want a
 * notification to block a webhook ack.
 */
async function notifyInternal(templateName: string, idempotencyKey: string, templateData: Record<string, unknown>) {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    console.log("[payments-webhook] notify_start", { templateName, idempotencyKey });
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify({ templateName, idempotencyKey, templateData }),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[payments-webhook] notify_failed", { templateName, status: res.status, body: text });
    } else {
      console.log("[payments-webhook] notify_ok", { templateName, status: res.status });
    }
  } catch (e) {
    console.error("[payments-webhook] notify_error", { templateName, error: String(e) });
  }
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: item?.price?.product,
      price_id: resolvePriceId(item),
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEndIso,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  const email = await resolveUserEmail(userId, subscription.customer_email);
  await notifyInternal("new-subscription", `new-subscription-${subscription.id}`, {
    email,
    userId,
    priceId: resolvePriceId(item) || "—",
    productId: item?.price?.product || "—",
    status: subscription.status || "—",
    periodEnd: periodEndIso || "—",
    environment: env,
  });
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: item?.price?.product,
      price_id: resolvePriceId(item),
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  // Resolve the user_id we stored from our own table (Stripe deletion event may omit metadata).
  const { data: row } = await getSupabase()
    .from("subscriptions")
    .select("user_id, current_period_end")
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env)
    .maybeSingle();

  const userId = (row as any)?.user_id || subscription.metadata?.userId;
  const periodEnd = (row as any)?.current_period_end || null;
  const email = await resolveUserEmail(userId);

  await notifyInternal("subscription-canceled", `sub-canceled-${subscription.id}`, {
    email,
    userId: userId || "—",
    subscriptionId: subscription.id,
    environment: env,
    cancelAtPeriodEnd: String(!!subscription.cancel_at_period_end),
    periodEnd: periodEnd || "—",
  });
}

/**
 * Quando um invoice falha (cartão recusado, fundos insuficientes etc.), o
 * Stripe envia invoice.payment_failed antes mesmo de uma transição para
 * past_due ou unpaid. Marcamos `past_due` aqui de forma idempotente para
 * que o app reaja antes que o próximo customer.subscription.updated chegue.
 * O hook `useSubscription` continua tratando `past_due` como ativo dentro
 * do período corrente — sem alterar regras Premium.
 */
async function handleInvoicePaymentFailed(invoice: any, env: StripeEnv) {
  const subId = invoice.subscription;
  if (!subId) return;
  await getSupabase()
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subId)
    .eq("environment", env);

  const { data: row } = await getSupabase()
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subId)
    .eq("environment", env)
    .maybeSingle();

  const userId = (row as any)?.user_id;
  const email = await resolveUserEmail(userId, invoice.customer_email);

  await notifyInternal("payment-failed-internal", `payment-failed-${invoice.id}-${invoice.attempt_count || 0}`, {
    email,
    userId: userId || "—",
    subscriptionId: subId,
    invoiceId: invoice.id || "—",
    amountDue: String(invoice.amount_due ?? "—"),
    attemptCount: String(invoice.attempt_count ?? "—"),
    environment: env,
  });
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
