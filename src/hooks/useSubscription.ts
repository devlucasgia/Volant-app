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

  const env = getStripeEnvironment();

  const load = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: prof }, { data: sub }] = await Promise.all([
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
    setIsGrandfathered(Boolean(prof?.beta_grandfathered));
    setSubscription((sub as SubRow | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!userId) return;
    const ch = supabase
      .channel(`sub-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const now = Date.now();
  const end = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() : null;
  const subActive = !!subscription && (
    (["active", "trialing", "past_due"].includes(subscription.status) && (!end || end > now)) ||
    (subscription.status === "canceled" && end !== null && end > now)
  );

  return {
    loading,
    isActive: isGrandfathered || subActive,
    isGrandfathered,
    subscription,
    refetch: load,
  };
}
