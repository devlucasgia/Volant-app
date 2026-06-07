import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { AccessProvider } from "@/context/AccessContext";
import { SplashScreen } from "./SplashScreen";
import { Paywall } from "./Paywall";
import { supabase } from "@/integrations/supabase/client";

/**
 * Wraps the app in an access mode based on subscription state.
 *
 * - Full access (isActive): paid sub OR ongoing 7-day internal trial → renders children.
 * - Trial expired (internalTrialExpired && !isPaidPremium): renders a hard
 *   full-screen Paywall — the user can only assinar ou sair.
 * - Other "limited" states (loading errors, never granted): fall back to
 *   AccessProvider with limited mode so onboarding can still complete.
 */
export function RequirePremium({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const sub = useSubscription(user?.id);

  if (!user) return <>{children}</>;
  if (sub.loading) return <SplashScreen />;

  // Hard block: trial acabou e não há assinatura → paywall cheia.
  if (sub.internalTrialExpired && !sub.isPaidPremium) {
    return <Paywall onSignOut={() => supabase.auth.signOut()} />;
  }

  return <AccessProvider isFull={sub.isActive}>{children}</AccessProvider>;
}

