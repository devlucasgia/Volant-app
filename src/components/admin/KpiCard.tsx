import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  delta?: number | null; // percent (e.g. 15 => +15%)
  deltaLabel?: string;
  icon?: ReactNode;
}

export function KpiCard({ label, value, sublabel, delta, deltaLabel, icon }: KpiCardProps) {
  const hasDelta = typeof delta === "number" && isFinite(delta);
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
        {icon && <div className="text-zinc-600">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-100">{value}</div>
      <div className="mt-1.5 flex items-center gap-2 text-[11px]">
        {hasDelta && (
          <span className={cn(
            "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium",
            positive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400",
          )}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {positive ? "+" : ""}{delta!.toFixed(1)}%
          </span>
        )}
        {(sublabel || deltaLabel) && (
          <span className="text-zinc-500">{sublabel || deltaLabel}</span>
        )}
      </div>
    </div>
  );
}
