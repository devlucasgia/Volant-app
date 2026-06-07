import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Apple, Check, Download, PlusSquare, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { isStandalone } from "@/lib/pwaInstall";
import { cn } from "@/lib/utils";

const volantIcon = "/volant-app-icon-192.png";

interface Props {
  /** Called when the step is complete (installed, dismissed, or auto-skipped). */
  onDone: () => void;
}

/**
 * Step de instalação como app — apresentado no início do onboarding.
 *
 * - Android Chrome: dispara o prompt nativo (beforeinstallprompt). Se indisponível,
 *   mostra tutorial visual de 3 passos.
 * - iOS Safari: tutorial visual com Compartilhar → Adicionar à Tela de Início.
 * - iOS outros browsers: orientação curta pra abrir no Safari.
 * - Desktop / sem suporte: chama onDone() automaticamente.
 *
 * Em todos os casos, o componente NÃO bloqueia — sempre dá pra avançar.
 */
export function OnboardingInstallStep({ onDone }: Props) {
  const { platform, isInstalled, canPrompt, promptInstall } = usePwaInstall();
  const [busy, setBusy] = useState(false);

  // Auto-skip se já instalado, desktop ou plataforma sem suporte.
  useEffect(() => {
    if (isInstalled || isStandalone()) {
      onDone();
      return;
    }
    if (platform === "desktop-chromium" || platform === "unsupported") {
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, isInstalled]);

  const handleAndroidInstall = async () => {
    if (!canPrompt) return;
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
      onDone();
    }
  };

  const isAndroid = platform === "android-chrome";
  const isIosSafari = platform === "ios-safari";
  const isIosOther = platform === "ios-other";

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="mb-4 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
          className="relative mx-auto mb-4 inline-block"
        >
          <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-2xl" aria-hidden />
          <img src={volantIcon} alt="Volant" className="relative h-16 w-16 rounded-2xl shadow-lg" />
        </motion.div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
          Passo 1 de tudo
        </div>
        <h2 className="mt-1.5 text-[22px] font-bold leading-tight text-foreground">
          Instale o Volant no celular
        </h2>
        <p className="mx-auto mt-2 max-w-[320px] text-[13.5px] leading-relaxed text-muted-foreground">
          Vira um app de verdade — abre da tela inicial, registro fica mais rápido
          e você recebe avisos importantes de manutenção.
        </p>
      </div>

      {/* Body — varia por plataforma */}
      <div className="flex-1">
        {isAndroid && (
          <AndroidBody
            canPrompt={canPrompt}
            busy={busy}
            onInstall={handleAndroidInstall}
          />
        )}
        {isIosSafari && <IosSafariBody />}
        {isIosOther && <IosOtherBody />}
      </div>

      {/* CTA secundário — pular */}
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {isAndroid && canPrompt ? "Pular por enquanto" : "Já instalei / Continuar"}
        </button>
      </div>
    </div>
  );
}

function AndroidBody({
  canPrompt, busy, onInstall,
}: { canPrompt: boolean; busy: boolean; onInstall: () => void }) {
  if (canPrompt) {
    return (
      <div className="space-y-3">
        <Button
          onClick={onInstall}
          disabled={busy}
          className="h-12 w-full gradient-success text-base font-semibold text-primary-foreground shadow-fab"
        >
          <Download className="mr-2 h-4 w-4" />
          {busy ? "Instalando..." : "Instalar agora"}
        </Button>
        <p className="text-center text-[11.5px] text-muted-foreground">
          Vai abrir uma janela do Chrome pedindo confirmação.
        </p>
      </div>
    );
  }
  // Fallback Android: tutorial manual
  return (
    <div className="space-y-2">
      <StepRow index={1} icon={<Smartphone className="h-4 w-4" />} label="Toque no menu ⋮ do navegador" />
      <StepRow index={2} icon={<PlusSquare className="h-4 w-4" />} label='Escolha "Instalar app" ou "Adicionar à tela inicial"' />
      <StepRow index={3} icon={<Check className="h-4 w-4" />} label='Confirme em "Instalar"' />
    </div>
  );
}

function IosSafariBody() {
  return (
    <div className="space-y-2">
      <StepRow index={1} icon={<Share className="h-4 w-4" />} label="Toque no ícone Compartilhar" active />
      <StepRow index={2} icon={<PlusSquare className="h-4 w-4" />} label='Escolha "Adicionar à Tela de Início"' />
      <StepRow index={3} icon={<Check className="h-4 w-4" />} label='Confirme em "Adicionar"' />
    </div>
  );
}

function IosOtherBody() {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
      <Apple className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm text-foreground">
        No iPhone, a instalação funciona pelo <strong>Safari</strong>.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Abra <strong>usevolant.app</strong> no Safari e siga o tutorial pra adicionar à tela inicial.
      </p>
    </div>
  );
}

function StepRow({
  index, icon, label, active,
}: { index: number; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition",
      active ? "border-primary/50 bg-primary/8" : "border-border/60 bg-muted/30",
    )}>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background text-xs font-semibold text-foreground">
        {index}
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}
