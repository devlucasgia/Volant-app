import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectPlatform,
  isSnoozed,
  isStandalone,
  markInstalled,
  PWA_KEYS,
  readBool,
  snooze,
  type PwaPlatform,
} from "@/lib/pwaInstall";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface UsePwaInstall {
  platform: PwaPlatform;
  isInstalled: boolean;
  canPrompt: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  dismiss: (days?: number) => void;
}

export function usePwaInstall(): UsePwaInstall {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() =>
    isStandalone() || readBool(PWA_KEYS.installed),
  );
  const [platform] = useState<PwaPlatform>(() => detectPlatform());

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      markInstalled();
      deferredRef.current = null;
      setCanPrompt(false);
      setIsInstalled(true);
    };
    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayChange = () => {
      if (mql?.matches) {
        markInstalled();
        setIsInstalled(true);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    mql?.addEventListener?.("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mql?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const evt = deferredRef.current;
    if (!evt) return "unavailable";
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      deferredRef.current = null;
      setCanPrompt(false);
      // Não marcamos installed aqui — esperamos o evento appinstalled / standalone confirmar.
      if (choice.outcome === "dismissed") snooze(7);
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  }, []);

  const dismiss = useCallback((days = 7) => snooze(days), []);

  return { platform, isInstalled, canPrompt, promptInstall, dismiss };
}

export { isSnoozed };
