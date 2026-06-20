import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Paywall } from "@/components/Paywall";
import type { SubscriptionState } from "@/hooks/useSubscription";

interface AccessCtx extends SubscriptionState {
  isFull: boolean;
  isLimited: boolean;
  /** Returns true if the user has full access; otherwise opens the paywall and returns false. */
  requirePremium: () => boolean;
  openPaywall: () => void;
}

const Ctx = createContext<AccessCtx | null>(null);

interface ProviderProps {
  subscription: SubscriptionState;
  children: ReactNode;
}

export function AccessProvider({ subscription, children }: ProviderProps) {
  const [open, setOpen] = useState(false);
  const lastOpenedRef = useRef(0);

  const isFull = subscription.isActive;

  const openPaywall = useCallback(() => {
    const now = Date.now();
    // Throttle: avoid the paywall popping repeatedly when the user taps
    // multiple times or several gated actions chain together.
    if (now - lastOpenedRef.current < 800) return;
    lastOpenedRef.current = now;
    setOpen(true);
  }, []);

  const requirePremium = useCallback(() => {
    if (isFull) return true;
    openPaywall();
    return false;
  }, [isFull, openPaywall]);

  const value = useMemo<AccessCtx>(
    () => ({
      ...subscription,
      isFull,
      isLimited: !isFull,
      requirePremium,
      openPaywall,
    }),
    [subscription, isFull, requirePremium, openPaywall],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-[calc(100%-1rem)] max-h-[90dvh] p-0 border-0 bg-background shadow-2xl overflow-y-auto overscroll-contain [&>button]:z-50 [&>button]:bg-background/80 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:p-1.5">
          <Paywall asModal />
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

const FALLBACK_SUBSCRIPTION: SubscriptionState = {
  loading: false,
  isActive: true,
  isPaidPremium: false,
  isGrandfathered: false,
  internalTrialActive: false,
  internalTrialExpired: false,
  internalTrialEndsAt: null,
  subscription: null,
  refetch: async () => {},
};

export function useAccess(): AccessCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback for any tree rendered outside the provider
    // (e.g. unauthenticated routes like /, /auth, /admin). Treat as full
    // access — the provider is what gates premium behavior; absence means
    // no gating applies. All subscription flags default to "not premium"
    // so consumers reading isPaidPremium etc. don't accidentally render
    // premium-only state.
    return {
      ...FALLBACK_SUBSCRIPTION,
      isFull: true,
      isLimited: false,
      requirePremium: () => true,
      openPaywall: () => {},
    };
  }
  return ctx;
}
