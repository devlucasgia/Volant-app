import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

type SubRow = {
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_customer_id: string;
};

type ProfileTrial = {
  beta_grandfathered: boolean | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_access_granted: boolean | null;
};

export interface SubscriptionState {
  loading: boolean;
  /** True if the user has access to premium features (paid OR internal 7-day trial). */
  isActive: boolean;
  /** True only for paid premium (active sub or beta grandfathered). Use for "premium pago" copy/notifications. */
  isPaidPremium: boolean;
  isGrandfathered: boolean;
  /** True while the internal 7-day free access is still valid. */
  internalTrialActive: boolean;
  /** True if the user already received and consumed the internal 7-day free access. */
  internalTrialExpired: boolean;
  /** ISO date when the internal free access ends. */
  internalTrialEndsAt: string | null;
  subscription: SubRow | null;
  refetch: () => Promise<void>;
}

export function useSubscription(userId: string | null | undefined): SubscriptionState {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubRow | null>(null);
  const [profile, setProfile] = useState<ProfileTrial | null>(null);
  const [loadError, setLoadError] = useState(false);

  const env = getStripeEnvironment();

  const load = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profRes, subRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("beta_grandfathered, trial_started_at, trial_ends_at, trial_access_granted")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("subscriptions")
          .select("status, price_id, current_period_end, cancel_at_period_end, stripe_customer_id")
          .eq("user_id", userId)
          .eq("environment", env)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      // Fail-closed: if either query errored, treat as no access until next successful refetch.
      if (profRes.error || subRes.error) {
        setLoadError(true);
        setProfile(null);
        setSubscription(null);
        return;
      }
      setLoadError(false);
      const profData = (profRes.data as ProfileTrial | null) ?? null;
      const subData = (subRes.data as SubRow | null) ?? null;
      setProfile(profData);
      setSubscription(subData);

      // Grant internal 7-day access on first access when no paid access exists.
      // Fallback de retrocompat: o gatilho no banco já concede no INSERT do
      // profile, mas mantemos esse caminho para perfis antigos criados antes
      // do gatilho. Roda em qualquer env — `trial_access_granted` impede regrant.
      const isGrandfathered = Boolean(profData?.beta_grandfathered);
      const subHasAccess = isPaidSubActive(subData);
      const shouldGrant =
        profData &&
        !profData.trial_access_granted &&
        !isGrandfathered &&
        !subHasAccess;

      if (shouldGrant) {
        // Entitlement columns are protected by a DB trigger that only allows
        // service_role writes — grant the trial via the secure edge function.
        const { data: grantData, error: grantError } = await supabase.functions.invoke(
          "grant-trial",
          { body: {} },
        );
        if (!grantError && (grantData as { ok?: boolean })?.ok) {
          const g = grantData as { trial_started_at?: string; trial_ends_at?: string };
          setProfile({
            ...profData,
            trial_started_at: g.trial_started_at ?? profData.trial_started_at,
            trial_ends_at: g.trial_ends_at ?? profData.trial_ends_at,
            trial_access_granted: true,
          });
        }
      }
    } catch {
      setLoadError(true);
      setProfile(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (!userId) return;

    const ch = supabase
      .channel(`sub-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();

    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isGrandfathered = Boolean(profile?.beta_grandfathered);
  const subActive = isPaidSubActive(subscription);
  const isPaidPremium = !loadError && (isGrandfathered || subActive);

  const trialEndsAt = profile?.trial_ends_at ?? null;
  const trialEndMs = trialEndsAt ? new Date(trialEndsAt).getTime() : null;
  const now = Date.now();
  const internalTrialActive =
    !loadError && !isPaidPremium && !!trialEndMs && trialEndMs > now;
  const internalTrialExpired =
    !loadError && !isPaidPremium && !!profile?.trial_access_granted && !!trialEndMs && trialEndMs <= now;

  const isActive = isPaidPremium || internalTrialActive;

  return {
    loading,
    isActive,
    isPaidPremium,
    isGrandfathered,
    internalTrialActive,
    internalTrialExpired,
    internalTrialEndsAt: trialEndsAt,
    subscription,
    refetch: load,
  };
}

function isPaidSubActive(sub: SubRow | null): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const now = Date.now();
  return (
    (["active", "trialing", "past_due"].includes(sub.status) && (!end || end > now)) ||
    (sub.status === "canceled" && end !== null && end > now)
  );
}
