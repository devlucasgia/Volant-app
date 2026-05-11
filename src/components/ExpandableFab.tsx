import { useEffect, useRef, useState } from "react";
import { Plus, TrendingUp, TrendingDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (kind: "earning" | "expense") => void;
  className?: string;
}

/**
 * Premium expandable FAB — collapsed shows a discreet "+" button,
 * expanded reveals quick actions for "Novo ganho" and "Novo gasto".
 * Hides automatically on scroll-down.
 */
export function ExpandableFab({ onPick, className }: Props) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      if (Math.abs(dy) > 6) {
        if (dy > 0 && y > 80) {
          setHidden(true);
          setOpen(false);
        } else setHidden(false);
        lastY.current = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("touchstart", onClick);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("touchstart", onClick);
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-background/40 backdrop-blur-[1px] transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      />

      <div
        ref={containerRef}
        className={cn(
          "fixed right-5 bottom-[5.25rem] z-40 flex flex-col items-end gap-2.5",
          "transition-all duration-300",
          hidden ? "translate-y-[140%] opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
          className
        )}
      >
        {/* Action: Novo ganho */}
        <button
          onClick={() => { setOpen(false); onPick("earning"); }}
          className={cn(
            "flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-elevated",
            "transition-all duration-300 origin-bottom-right",
            open
              ? "scale-100 opacity-100 translate-y-0 delay-75"
              : "pointer-events-none scale-90 opacity-0 translate-y-3"
          )}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-success/15 text-success">
            <TrendingUp className="h-4 w-4" />
          </span>
          Novo ganho
        </button>

        {/* Action: Novo gasto */}
        <button
          onClick={() => { setOpen(false); onPick("expense"); }}
          className={cn(
            "flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-elevated",
            "transition-all duration-300 origin-bottom-right",
            open
              ? "scale-100 opacity-100 translate-y-0"
              : "pointer-events-none scale-90 opacity-0 translate-y-3"
          )}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-destructive/15 text-destructive">
            <TrendingDown className="h-4 w-4" />
          </span>
          Novo gasto
        </button>

        {/* Main FAB */}
        <button
          aria-label={open ? "Fechar" : "Novo registro"}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "grid h-14 w-14 place-items-center rounded-full text-primary-foreground shadow-fab",
            "gradient-success transition-transform duration-300 active:scale-95 hover:scale-105",
            open && "rotate-45"
          )}
        >
          {open ? <X className="h-7 w-7" strokeWidth={2.5} /> : <Plus className="h-7 w-7" strokeWidth={2.5} />}
        </button>
      </div>
    </>
  );
}
