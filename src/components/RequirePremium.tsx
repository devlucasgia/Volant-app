import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Paywall } from "@/components/Paywall";

/**
 * Gates the app behind a premium subscription.
 *
 * Rules:
 * - If the user has not finished onboarding (welcome tour, car, or monthly goal),
 *   do NOT show the paywall yet — let the existing onboarding flow run.
 * - Once all three onboarding flags are true, if the user has no premium access
 *   (no active/trialing subscription AND not grandfathered), show the Paywall.
 * - Otherwise render the app.
 */
export function RequirePremium({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { loading: subLoading, isActive } = useSubscription(user?.id);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setOnboardingDone(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarded, car_onboarded, goal_onboarded")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const d = (data ?? {}) as { onboarded?: boolean; car_onboarded?: boolean; goal_onboarded?: boolean };
      setOnboardingDone(Boolean(d.onboarded && d.car_onboarded && d.goal_onboarded));
    };
    load();
    // Re-check after the onboarding flow / first-run dialogs finish.
    const refresh = () => load();
    window.addEventListener("volant:onboarding-finished", refresh);
    window.addEventListener("volant:car-onboarding-finished", refresh);
    window.addEventListener("volant:goal-onboarding-finished", refresh);
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      window.removeEventListener("volant:onboarding-finished", refresh);
      window.removeEventListener("volant:car-onboarding-finished", refresh);
      window.removeEventListener("volant:goal-onboarding-finished", refresh);
      clearInterval(interval);
    };
  }, [user]);

  if (!user) return <>{children}</>;

  if (subLoading || onboardingDone === null) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Onboarding still in progress: let the in-app onboarding flow handle it.
  if (!onboardingDone) return <>{children}</>;

  // Onboarding done but no premium access → block with paywall.
  if (!isActive) return <Paywall onSignOut={signOut} />;

  return <>{children}</>;
}
