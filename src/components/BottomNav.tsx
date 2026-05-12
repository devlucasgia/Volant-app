import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home, History, BarChart3, Settings as SettingsIcon, Timer,
  Plus, TrendingUp, TrendingDown, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUI } from "@/context/UIContext";

const leftItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/jornada", label: "Jornada", icon: Timer },
];

const rightItems = [
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/ajustes", label: "Ajustes", icon: SettingsIcon },
];

export function BottomNav() {
  const { openDrawer } = useUI();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const pick = (kind: "earning" | "expense") => {
    setOpen(false);
    openDrawer({ tab: kind });
  };

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

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom">
        <div ref={containerRef} className="relative mx-auto max-w-md">
          {/* Quick actions popover above the central FAB */}
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full flex flex-col items-center gap-2.5 transition-all duration-300",
              open ? "opacity-100 translate-y-[-100%] pointer-events-auto" : "opacity-0 translate-y-[-85%]"
            )}
          >
            <button
              onClick={() => pick("earning")}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-elevated whitespace-nowrap",
                "transition-all duration-300",
                open ? "scale-100 opacity-100 delay-75" : "scale-90 opacity-0"
              )}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-success/15 text-success">
                <TrendingUp className="h-4 w-4" />
              </span>
              Novo ganho
            </button>
            <button
              onClick={() => pick("expense")}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-elevated whitespace-nowrap",
                "transition-all duration-300",
                open ? "scale-100 opacity-100" : "scale-90 opacity-0"
              )}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-destructive/15 text-destructive">
                <TrendingDown className="h-4 w-4" />
              </span>
              Novo gasto
            </button>
          </div>

          <ul className="grid grid-cols-5 items-end">
            {leftItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/"}
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

            {/* Central raised action */}
            <li className="flex justify-center">
              <button
                aria-label={open ? "Fechar" : "Novo registro"}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                  "relative -translate-y-5 grid h-14 w-14 place-items-center rounded-full text-primary-foreground",
                  "gradient-success shadow-fab ring-4 ring-card",
                  "transition-transform duration-300 active:scale-95 hover:scale-105",
                  open && "rotate-45"
                )}
              >
                {open ? <X className="h-6 w-6" strokeWidth={2.5} /> : <Plus className="h-6 w-6" strokeWidth={2.5} />}
              </button>
            </li>

            {rightItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
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
        </div>
      </nav>
    </>
  );
}
