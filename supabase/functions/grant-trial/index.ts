import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Grants the internal 7-day trial server-side. This endpoint exists because
// the entitlement columns (trial_*, beta_grandfathered) are protected by a
// trigger on public.profiles that only allows service_role writes.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Read current state — never overwrite an existing grant.
    const { data: prof, error: profErr } = await admin
      .from("profiles")
      .select("trial_access_granted, beta_grandfathered, trial_started_at, trial_ends_at")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) {
      return new Response(JSON.stringify({ error: "profile_read_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!prof) {
      return new Response(JSON.stringify({ error: "profile_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (prof.trial_access_granted) {
      return new Response(
        JSON.stringify({
          ok: true,
          already_granted: true,
          trial_started_at: prof.trial_started_at,
          trial_ends_at: prof.trial_ends_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { error: updErr } = await admin
      .from("profiles")
      .update({
        trial_started_at: startedAt.toISOString(),
        trial_ends_at: endsAt.toISOString(),
        trial_access_granted: true,
      })
      .eq("id", userId)
      .eq("trial_access_granted", false);
    if (updErr) {
      return new Response(JSON.stringify({ error: "grant_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        trial_started_at: startedAt.toISOString(),
        trial_ends_at: endsAt.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[grant-trial]", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
