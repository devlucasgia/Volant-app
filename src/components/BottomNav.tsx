import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home, History, BarChart3, Settings as SettingsIcon, Timer,
  Plus, TrendingUp, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUI } from "@/context/UIContext";

const navItems = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/jornada", label: "Jornada", icon: Timer },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/ajustes", label: "Ajustes", icon: SettingsIcon },
];

export function BottomNav() {
  const { openDrawer } = useUI();
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("touchstart", onClick);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("touchstart", onClick);
    };
  }, [open]);

  const pick = (kind: "earning" | "expense") => {
    setOpen(false);
    openDrawer({ tab: kind });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-background/50 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Bottom navigation — 5 evenly spaced items, untouched by FAB */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Independent floating action button — sits above the navbar, never overlaps items */}
      <div
        ref={fabRef}
        className="fixed left-1/2 z-50 -translate-x-1/2"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)" }}
      >
        {/* Radial action: Novo ganho (diagonal above-left) */}
        <button
          onClick={() => pick("earning")}
          aria-label="Novo ganho"
          className={cn(
            "absolute left-1/2 top-1/2 flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3.5 py-2 text-sm font-semibold shadow-elevated backdrop-blur-md whitespace-nowrap",
            "transition-all duration-300 ease-out origin-bottom-right",
            open
              ? "opacity-100 scale-100 -translate-x-[calc(100%+38px)] -translate-y-[calc(100%+22px)]"
              : "pointer-events-none opacity-0 scale-75 -translate-x-1/2 -translate-y-1/2"
          )}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-success/15 text-success">
            <TrendingUp className="h-3.5 w-3.5" />
          </span>
          Novo ganho
        </button>

        {/* Radial action: Novo gasto (diagonal above-right) */}
        <button
          onClick={() => pick("expense")}
          aria-label="Novo gasto"
          className={cn(
            "absolute left-1/2 top-1/2 flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3.5 py-2 text-sm font-semibold shadow-elevated backdrop-blur-md whitespace-nowrap",
            "transition-all duration-300 ease-out origin-bottom-left",
            open
              ? "opacity-100 scale-100 translate-x-[38px] -translate-y-[calc(100%+22px)]"
              : "pointer-events-none opacity-0 scale-75 -translate-x-1/2 -translate-y-1/2"
          )}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-destructive/15 text-destructive">
            <TrendingDown className="h-3.5 w-3.5" />
          </span>
          Novo gasto
        </button>

        {/* Central FAB */}
        <button
          aria-label={open ? "Fechar" : "Novo registro"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "relative grid h-12 w-12 place-items-center rounded-full text-primary-foreground",
            "bg-gradient-to-b from-success to-success/85",
            "shadow-[0_6px_16px_-4px_hsl(var(--success)/0.45),0_2px_4px_hsl(var(--success)/0.25)]",
            "ring-1 ring-success/30",
            "transition-all duration-300 ease-out active:scale-95 hover:scale-[1.04]",
            open && "rotate-45"
          )}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}
