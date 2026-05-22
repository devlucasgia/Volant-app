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

export interface SubscriptionState {
  loading: boolean;
  isActive: boolean;
  isGrandfathered: boolean;
  subscription: SubRow | null;
  refetch: () => Promise<void>;
}

export function useSubscription(userId: string | null | undefined): SubscriptionState {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubRow | null>(null);
  const [isGrandfathered, setIsGrandfathered] = useState(false);
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
        supabase.from("profiles").select("beta_grandfathered").eq("id", userId).maybeSingle(),
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
        setIsGrandfathered(false);
        setSubscription(null);
      } else {
        setLoadError(false);
        setIsGrandfathered(Boolean(profRes.data?.beta_grandfathered));
        setSubscription((subRes.data as SubRow | null) ?? null);
      }
    } catch {
      setLoadError(true);
      setIsGrandfathered(false);
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

    // Re-validate aggressively whenever the app regains focus / connectivity / visibility.
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

  const now = Date.now();
  const end = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() : null;
  const subActive = !!subscription && (
    (["active", "trialing", "past_due"].includes(subscription.status) && (!end || end > now)) ||
    (subscription.status === "canceled" && end !== null && end > now)
  );

  // Fail-closed: any load error forces isActive=false until a successful refetch.
  const isActive = !loadError && (isGrandfathered || subActive);

  return {
    loading,
    isActive,
    isGrandfathered,
    subscription,
    refetch: load,
  };
}
