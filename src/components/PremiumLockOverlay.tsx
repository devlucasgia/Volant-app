import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/context/AccessContext";

interface Props {
  title?: string;
  description?: string;
  /** When true, dims the area more strongly. Default subtle. */
  intense?: boolean;
}

/**
 * Discrete premium gate overlay for full sections (Reports, History).
 * Mounts absolutely inside a `relative` parent. Keeps the app feeling
 * premium — soft blur, small lock, single primary CTA.
 */
export function PremiumLockOverlay({
  title = "Disponível no Premium",
  description = "Assine para registrar, acompanhar e analisar seus resultados com o Volant.",
  intense = false,
}: Props) {
  const { openPaywall } = useAccess();
  return (
    <div
      className={
        "absolute inset-0 z-30 flex items-start justify-center pt-20 sm:pt-28 " +
        (intense ? "bg-background/85 backdrop-blur-md" : "bg-background/65 backdrop-blur-sm")
      }
    >
      <div className="mx-4 w-full max-w-xs rounded-2xl border border-primary/30 bg-card/95 p-5 text-center shadow-[0_18px_50px_-20px_hsl(var(--primary)/0.5)]">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full border border-primary/40 bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]">
          <Lock className="h-5 w-5" />
        </div>
        <div className="text-[15px] font-semibold text-foreground">{title}</div>
        {description && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
        )}
        <Button
          onClick={openPaywall}
          className="mt-4 h-10 w-full gradient-success text-primary-foreground font-semibold"
        >
          Desbloquear Premium
        </Button>
      </div>
    </div>
  );
}
