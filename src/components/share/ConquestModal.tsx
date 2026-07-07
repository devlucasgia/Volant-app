import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConquestModalProps {
  open: boolean;
  onClose: () => void;
  onShare: () => void;
  heroValue: string;
  mode: "liquido" | "bruto";
}

/**
 * Modal de conquista — dispara uma única vez quando a meta do dia é batida.
 * Puramente apresentacional: controle de abertura fica com o pai.
 */
export function ConquestModal({ open, onClose, onShare, heroValue, mode }: ConquestModalProps) {
  if (!open) return null;

  const modeLabel = mode === "liquido" ? "líquidos" : "brutos";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conquest-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-[6px] animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "mx-4 w-full max-w-[320px] rounded-[20px] border border-success/35 bg-card/[0.97] p-6 text-center",
          "shadow-[0_24px_60px_-20px_rgba(0,0,0,.7),0_0_60px_-20px_hsl(var(--success)/0.35)]",
          "animate-in fade-in slide-in-from-bottom-3 duration-500",
        )}
      >
        <div className="text-[34px] leading-none">🎉</div>
        <h2 id="conquest-title" className="mt-3 text-[15.5px] font-extrabold text-foreground">
          Meta do dia batida!
        </h2>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
          {heroValue} {modeLabel} hoje. Bora mostrar esse resultado pro grupo ou postar nos stories?
        </p>

        <button
          type="button"
          onClick={onShare}
          className={cn(
            "mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-[12.5px] font-bold text-[hsl(222_47%_7%)]",
            "bg-gradient-to-br from-[hsl(142_76%_55%)] to-[hsl(142_71%_42%)]",
            "shadow-[0_8px_20px_-8px_hsl(var(--success)/0.55),inset_0_1px_0_rgba(255,255,255,.25)]",
            "transition-transform active:scale-[0.98]",
          )}
        >
          <Share2 className="h-3.5 w-3.5" />
          Compartilhar resultado
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full cursor-pointer border-0 bg-transparent py-2 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
