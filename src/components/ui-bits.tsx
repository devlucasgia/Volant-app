import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** When true, renders the official Volant brand symbol next to the title (Home only). */
  brand?: boolean;
}

export function PageHeader({ title, subtitle, right, brand = false }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          {brand && (
            <img
              src="/volant-symbol-header.png"
              alt="Volant"
              className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-[0_2px_10px_-2px_hsl(var(--success)/0.45)] ring-1 ring-success/20"
            />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight leading-tight text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
            )}
          </div>
        </div>
        {right}
      </div>
    </header>
  );
}

export function StatCard({
  label, value, hint, accent, className,
}: { label: string; value: ReactNode; hint?: ReactNode; accent?: "success" | "destructive" | "info" | "warning"; className?: string }) {
  const accentMap: Record<string, string> = {
    success: "text-success",
    destructive: "text-destructive",
    info: "text-info",
    warning: "text-warning",
  };
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", accent && accentMap[accent])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
