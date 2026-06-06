// send-weekly-summary
// Cron-invoked weekly (Mondays 11:00 UTC).
// For each user with at least one entry in the last 7 days, enqueues a
// "weekly-summary" email to their auth.users email.
//
// Authorization: same shared-vault secret used by notify-new-user (the cron
// passes it). Service-role bearer is also accepted (for manual triggering).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function brl(n: number): string {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Auth: service-role OR shared vault secret
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let authorized = !!token && token === SERVICE_ROLE;
  if (!authorized && token) {
    const { data: shared } = await admin.rpc("get_notify_shared_secret");
    if (typeof shared === "string" && shared.length > 0 && token === shared) authorized = true;
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const until = new Date().toISOString();

  // Fetch all entries from last 7 days. Paginate to bypass 1000-row limit.
  type Row = {
    user_id: string; type: string; gross: number | null; km: number | null;
    hours: number | null; expense_amount: number | null;
  };
  const all: Row[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin
      .from("entries")
      .select("user_id, type, gross, km, hours, expense_amount")
      .gte("entry_date", since)
      .lt("entry_date", until)
      .range(offset, offset + 999);
    if (error) {
      console.error("[send-weekly-summary] entries query failed", error);
      return new Response(JSON.stringify({ error: "query_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data || data.length === 0) break;
    all.push(...(data as Row[]));
    if (data.length < 1000) break;
    offset += 1000;
  }

  // Aggregate per user
  const perUser = new Map<string, { gross: number; expenses: number; km: number; hours: number }>();
  for (const r of all) {
    const u = perUser.get(r.user_id) || { gross: 0, expenses: 0, km: 0, hours: 0 };
    if (r.type === "earning") {
      u.gross += Number(r.gross || 0);
      u.km += Number(r.km || 0);
      u.hours += Number(r.hours || 0);
    } else if (r.type === "expense") {
      u.expenses += Number(r.expense_amount || 0);
    }
    perUser.set(r.user_id, u);
  }

  const periodLabel = `${new Date(since).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} a ${new Date(until).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  const week = since.slice(0, 10);

  let enqueued = 0;
  for (const [userId, agg] of perUser.entries()) {
    // Resolve email + display name
    const { data: u } = await admin.auth.admin.getUserById(userId);
    const email = u?.user?.email;
    if (!email) continue;
    const meta = (u?.user?.user_metadata || {}) as Record<string, unknown>;
    const fullName = (meta.display_name as string) || (meta.full_name as string) || (meta.name as string) || "";
    const firstName = fullName.split(" ")[0] || "";

    const net = agg.gross - agg.expenses;
    const rpkm = agg.km > 0 ? net / agg.km : 0;
    const rpHour = agg.hours > 0 ? net / agg.hours : 0;

    const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify({
        templateName: "weekly-summary",
        recipientEmail: email,
        idempotencyKey: `weekly-${userId}-${week}`,
        templateData: {
          name: firstName,
          periodLabel,
          gross: brl(agg.gross),
          expenses: brl(agg.expenses),
          net: brl(net),
          km: fmtNum(agg.km, 0),
          hours: fmtNum(agg.hours, 1),
          rpkm: brl(rpkm),
          rpHour: brl(rpHour),
          appUrl: "https://usevolant.app/app/relatorios",
        },
      }),
    });
    if (sendRes.ok) enqueued++;
    else console.warn("[send-weekly-summary] send failed", userId, sendRes.status);
  }

  console.log("[send-weekly-summary] done", { users: perUser.size, enqueued });
  return new Response(JSON.stringify({ ok: true, users: perUser.size, enqueued }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
