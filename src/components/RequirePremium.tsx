import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Paywall } from "@/components/Paywall";

type OnboardingState = "loading" | "incomplete" | "complete" | "error";

/**
 * Gates the app behind a premium subscription.
 *
 * Fail-closed rules:
 * - If the user has not finished onboarding (welcome tour, car, monthly goal),
 *   let the in-app onboarding run.
 * - Once onboarding is complete, users without an active subscription / trial /
 *   grandfather flag see the Paywall.
 * - Any error loading profile or subscription state is treated as NOT subscribed:
 *   the paywall is shown until a successful refetch proves otherwise. This
 *   prevents non-subscribed users from slipping past the gate during network
 *   blips, refreshes, or local-state inconsistencies.
 */
export function RequirePremium({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { loading: subLoading, isActive } = useSubscription(user?.id);
  const [onboarding, setOnboarding] = useState<OnboardingState>("loading");

  useEffect(() => {
    if (!user) {
      setOnboarding("loading");
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarded, car_onboarded, goal_onboarded")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setOnboarding("error");
        return;
      }
      const d = (data ?? {}) as { onboarded?: boolean; car_onboarded?: boolean; goal_onboarded?: boolean };
      setOnboarding(d.onboarded && d.car_onboarded && d.goal_onboarded ? "complete" : "incomplete");
    };
    load();
    const refresh = () => load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("volant:onboarding-finished", refresh);
    window.addEventListener("volant:car-onboarding-finished", refresh);
    window.addEventListener("volant:goal-onboarding-finished", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      window.removeEventListener("volant:onboarding-finished", refresh);
      window.removeEventListener("volant:car-onboarding-finished", refresh);
      window.removeEventListener("volant:goal-onboarding-finished", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, [user]);

  if (!user) return <>{children}</>;

  if (subLoading || onboarding === "loading") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Fail-closed: if we couldn't confirm onboarding state, gate behind the paywall
  // unless the user already has confirmed premium access.
  if (onboarding === "error") {
    return isActive ? <>{children}</> : <Paywall onSignOut={signOut} />;
  }

  // Onboarding still in progress: allow the in-app onboarding flow to run
  // (account setup is explicitly permitted before subscription).
  if (onboarding === "incomplete") return <>{children}</>;

  // Onboarding done but no premium access → block with paywall.
  if (!isActive) return <Paywall onSignOut={signOut} />;

  return <>{children}</>;
}
