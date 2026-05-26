import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { AccessProvider } from "@/context/AccessContext";
import { SplashScreen } from "./SplashScreen";

/**
 * Wraps the app in an access mode (full vs. limited) based on subscription state.
 *
 * Behavior:
 * - Full access: subscription is active / trialing / past_due (within period),
 *   canceled with future period_end, or the profile is beta_grandfathered.
 * - Limited access: any other case, INCLUDING load errors or unknown states.
 *   Limited users can navigate the app and complete onboarding, but
 *   operational actions are gated — components call `requirePremium()` from
 *   `useAccess()` which opens the Paywall modal.
 *
 * Why no more "sticky onboarding" fallback: the previous version returned
 * `children` unconditionally while onboarding was incomplete, which let
 * non-subscribed accounts keep using the app indefinitely if a flag was
 * never flipped. Access is now decided solely by `useSubscription` and
 * always defaults to limited (fail-closed) when uncertain.
 */
export function RequirePremium({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { loading, isActive } = useSubscription(user?.id);

  if (!user) return <>{children}</>;

  if (loading) return <SplashScreen />;

  return <AccessProvider isFull={isActive}>{children}</AccessProvider>;
}
