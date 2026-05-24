import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Paywall } from "@/components/Paywall";

interface AccessCtx {
  isFull: boolean;
  isLimited: boolean;
  /** Returns true if the user has full access; otherwise opens the paywall and returns false. */
  requirePremium: () => boolean;
  openPaywall: () => void;
}

const Ctx = createContext<AccessCtx | null>(null);

interface ProviderProps {
  isFull: boolean;
  children: ReactNode;
}

export function AccessProvider({ isFull, children }: ProviderProps) {
  const [open, setOpen] = useState(false);
  const lastOpenedRef = useRef(0);

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
    () => ({ isFull, isLimited: !isFull, requirePremium, openPaywall }),
    [isFull, requirePremium, openPaywall],
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

export function useAccess(): AccessCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback for any tree rendered outside the provider
    // (e.g. unauthenticated routes). Treat as full access — the provider
    // is what gates premium behavior; absence means no gating applies.
    return {
      isFull: true,
      isLimited: false,
      requirePremium: () => true,
      openPaywall: () => {},
    };
  }
  return ctx;
}
