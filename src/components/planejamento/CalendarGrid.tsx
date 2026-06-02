import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { datesOfMonth, startOfDay, toIsoDate } from "@/lib/planejamento";

interface Props {
  selected: string[];
  onToggle: (iso: string) => void;
  reference?: Date;
}

const DOW = ["D", "S", "T", "Q", "Q", "S", "S"];

export function CalendarGrid({ selected, onToggle, reference = new Date() }: Props) {
  const today = startOfDay(reference);
  const selSet = useMemo(() => new Set(selected), [selected]);
  const days = datesOfMonth(reference);
  const firstDow = days[0].getDay(); // 0..6
  const padding = Array.from({ length: firstDow });

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {DOW.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {padding.map((_, i) => (
          <div key={`p-${i}`} />
        ))}
        {days.map((d) => {
          const iso = toIsoDate(d);
          const isPast = startOfDay(d) < today;
          const isToday = +startOfDay(d) === +today;
          const isSelected = selSet.has(iso);
          const dow = d.getDay();
          const isWeekend = dow === 0 || dow === 6;

          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => onToggle(iso)}
              aria-pressed={isSelected}
              aria-label={`Dia ${d.getDate()}`}
              className={cn(
                "relative aspect-square rounded-xl border text-[13px] font-semibold tabular-nums transition-all duration-150 active:scale-[0.92]",
                isPast
                  ? "cursor-not-allowed border-border/30 bg-muted/10 text-muted-foreground/35"
                  : isSelected
                    ? "border-primary/55 bg-primary/15 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.18),0_6px_18px_-12px_hsl(var(--primary)/0.7)]"
                    : cn(
                        "border-border/55 bg-card/50 text-foreground/90 hover:bg-muted/40 hover:border-border",
                        isWeekend && "text-muted-foreground",
                      ),
                isToday && !isSelected && !isPast && "ring-1 ring-inset ring-primary/40",
              )}
            >
              {d.getDate()}
              {isToday && (
                <span className="pointer-events-none absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
