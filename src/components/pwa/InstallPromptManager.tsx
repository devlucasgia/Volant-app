import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { isSnoozed, isStandalone, PWA_KEYS, readNumber, snooze, writeString } from "@/lib/pwaInstall";
import { InstallPromptCard } from "./InstallPromptCard";
import { IosInstallTutorial } from "./IosInstallTutorial";

const SHOW_DELAY_MS = 8000;
const IOS_REPROMPT_DAYS = 7;

type Variant = "native" | "ios-full" | "ios-hint" | null;

export function InstallPromptManager() {
  const location = useLocation();
  const { platform, isInstalled, canPrompt, promptInstall, dismiss } = usePwaInstall();
  const [variant, setVariant] = useState<Variant>(null);
  const [open, setOpen] = useState(false);

  // Rotas sensíveis dentro do app autenticado: o manager já só vive em AppLayout,
  // mas garantimos exclusão extra defensiva.
  const isSensitiveRoute = location.pathname.startsWith("/checkout");

  useEffect(() => {
    if (isInstalled || isStandalone()) return;
    if (isSensitiveRoute) return;
    if (isSnoozed()) return;

    // Decide variante candidata
    let candidate: Variant = null;
    if ((platform === "android-chrome" || platform === "desktop-chromium") && canPrompt) {
      candidate = "native";
    } else if (platform === "ios-safari") {
      const lastSeen = readNumber(PWA_KEYS.iosSeenAt);
      const elapsed = Date.now() - lastSeen;
      if (lastSeen === 0 || elapsed > IOS_REPROMPT_DAYS * 24 * 3600 * 1000) {
        candidate = "ios-full";
      }
    } else if (platform === "ios-other") {
      const lastSeen = readNumber(PWA_KEYS.iosSeenAt);
      const elapsed = Date.now() - lastSeen;
      if (lastSeen === 0 || elapsed > IOS_REPROMPT_DAYS * 24 * 3600 * 1000) {
        candidate = "ios-hint";
      }
    }

    if (!candidate) return;

    const t = window.setTimeout(() => {
      setVariant(candidate);
      setOpen(true);
      if (candidate === "ios-full" || candidate === "ios-hint") {
        writeString(PWA_KEYS.iosSeenAt, String(Date.now()));
      }
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(t);
  }, [platform, canPrompt, isInstalled, isSensitiveRoute]);

  const handleDismiss = () => {
    dismiss(7);
    setOpen(false);
  };

  const handleInstall = async () => {
    const outcome = await promptInstall();
    setOpen(false);
    if (outcome === "unavailable") snooze(1);
  };

  const handleIosConfirm = () => {
    // Não marca instalado — só registra que viu, snooze padrão.
    snooze(IOS_REPROMPT_DAYS);
    setOpen(false);
  };

  if (!variant || !open) return null;

  if (variant === "native") {
    return (
      <InstallPromptCard
        open={open}
        onInstall={handleInstall}
        onDismiss={handleDismiss}
      />
    );
  }

  return (
    <IosInstallTutorial
      open={open}
      hint={variant === "ios-hint"}
      onConfirm={handleIosConfirm}
      onDismiss={handleDismiss}
    />
  );
}
