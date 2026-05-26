import { Check, PlusSquare, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import volantIcon from "/volant-app-icon-192.png";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  /** Quando true (Chrome/Edge no iOS), mostra apenas orientação curta para abrir no Safari. */
  hint?: boolean;
}

const animStyles = `
@keyframes volantStepPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
  50% { transform: scale(1.04); box-shadow: 0 0 24px -4px hsl(var(--primary) / 0.55); }
}
@keyframes volantIconPop {
  0%, 60% { opacity: 0; transform: scale(0.6); }
  75% { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
.volant-step { transition: background-color .3s ease, border-color .3s ease, color .3s ease; }
.volant-step-active {
  animation: volantStepPulse 1.8s ease-in-out infinite;
  border-color: hsl(var(--primary) / 0.5);
  background-color: hsl(var(--primary) / 0.08);
}
.volant-anim-icon { animation: volantIconPop 3s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .volant-step-active, .volant-anim-icon { animation: none !important; }
}
`;

function StepRow({
  index, icon, label, active,
}: { index: number; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`volant-step flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 ${active ? "volant-step-active" : ""}`}>
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

function HintBody({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative px-5 pb-6 pt-5 text-center">
      <button
        onClick={onDismiss}
        aria-label="Fechar"
        className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted/60"
      >
        <X className="h-4 w-4" />
      </button>
      <img src={volantIcon} alt="Volant" className="mx-auto h-14 w-14 rounded-2xl shadow-md" />
      <h2 className="mt-3 text-lg font-semibold text-foreground">Instale o Volant no iPhone</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        No iPhone, a instalação funciona pelo Safari usando “Adicionar à Tela de Início”.
      </p>
      <Button onClick={onDismiss} className="mt-5 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
        Entendi
      </Button>
    </div>
  );
}

function FullBody({ onConfirm, onDismiss }: { onConfirm: () => void; onDismiss: () => void }) {
  return (
    <div className="relative px-5 pb-6 pt-5">
      <style>{animStyles}</style>
      <button
        onClick={onDismiss}
        aria-label="Fechar"
        className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted/60"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-2xl" aria-hidden />
          <img src={volantIcon} alt="Volant" className="relative h-14 w-14 rounded-2xl shadow-lg volant-anim-icon" />
        </div>
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
          Instale o Volant no iPhone
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Acesse sua rotina direto da tela inicial, como um app.
        </p>
      </div>

      <div className="mt-5 grid gap-2">
        <StepRow index={1} icon={<Share className="h-4 w-4" />} label="Toque em Compartilhar" active />
        <StepRow index={2} icon={<PlusSquare className="h-4 w-4" />} label='Escolha “Adicionar à Tela de Início”' />
        <StepRow index={3} icon={<Check className="h-4 w-4" />} label='Confirme em “Adicionar”' />
      </div>

      <div className="mt-5 grid gap-2">
        <Button
          onClick={onConfirm}
          className="h-11 w-full bg-primary text-primary-foreground shadow-[0_0_30px_-8px_hsl(var(--primary)/0.55)] hover:bg-primary/90"
        >
          Entendi
        </Button>
        <Button
          variant="ghost"
          onClick={onDismiss}
          className="h-10 w-full text-muted-foreground hover:text-foreground"
        >
          Depois
        </Button>
      </div>
    </div>
  );
}

export function IosInstallTutorial({ open, onConfirm, onDismiss, hint }: Props) {
  const isMobile = useIsMobile();
  const content = hint ? <HintBody onDismiss={onDismiss} /> : <FullBody onConfirm={onConfirm} onDismiss={onDismiss} />;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
        <DrawerContent className="border-border/60 bg-card">{content}</DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogContent className="max-w-sm border-border/60 bg-card p-0">{content}</DialogContent>
    </Dialog>
  );
}
