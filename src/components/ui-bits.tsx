import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { VolantLogo } from "@/components/VolantLogo";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <VolantLogo size={26} />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight leading-tight">
              <span className="text-foreground">Volant</span>
              {title && title !== "Volant" && (
                <span className="ml-2 text-muted-foreground/70 font-semibold">· {title}</span>
              )}
            </h1>
            {subtitle && <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>}
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
