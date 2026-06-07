import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { AccessProvider } from "@/context/AccessContext";
import { SplashScreen } from "./SplashScreen";

/**
 * Wraps the app in an access mode based on subscription state.
 *
 * - Full access (isActive): paid sub OR ongoing 7-day internal trial → renders children.
 * - Limited (trial expired, sem assinatura, ou erro): app continua navegável;
 *   recursos premium ficam com overlay de cadeado + CTA via PremiumLockOverlay
 *   e gates já existentes (EntryDrawer, Histórico, Relatórios, Planejamento).
 */
export function RequirePremium({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const sub = useSubscription(user?.id);

  if (!user) return <>{children}</>;
  if (sub.loading) return <SplashScreen />;

  return <AccessProvider isFull={sub.isActive}>{children}</AccessProvider>;
}

