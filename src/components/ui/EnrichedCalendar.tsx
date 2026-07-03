import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useDayRender, type DayProps } from "react-day-picker";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  classifyDay,
  compactBRL,
  type DayClass,
  type DayStats,
} from "@/lib/calendarDayStats";

export type EnrichedCalendarProps = React.ComponentProps<typeof DayPicker> & {
  dailyStats: DayStats;
  /** Lente de exibição do calendário: "net" (verde/vermelho) ou "gross" (azul). */
  valueMode?: "net" | "gross";
  plannedDates?: string[];
  showPlanSemantics?: boolean;
};

interface CalendarCtx {
  stats: DayStats;
  valueMode: "net" | "gross";
  plannedSet: Set<string>;
  showPlanSemantics: boolean;
  today: Date;
}

const Ctx = React.createContext<CalendarCtx | null>(null);

function CustomDay(props: DayProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const dr = useDayRender(props.date, props.displayMonth, ref);
  const ctx = React.useContext(Ctx);

  if (dr.isHidden) return <div role="gridcell" />;
  if (!dr.isButton) return <div {...dr.divProps} />;

  const dayNum = props.date.getDate();
  const kind: DayClass = ctx
    ? classifyDay(props.date, ctx.stats, {
        today: ctx.today,
        valueMode: ctx.valueMode,
        plannedSet: ctx.plannedSet,
        showPlanSemantics: ctx.showPlanSemantics,
      })
    : "none";

  const iso = format(props.date, "yyyy-MM-dd");
  const stat = ctx?.stats.get(iso);
  const value = stat
    ? ctx?.valueMode === "gross"
      ? stat.gross
      : stat.net
    : 0;

  const isSelected = dr.activeModifiers.selected;
  const isDisabled = dr.activeModifiers.disabled;
  const isOutside = dr.activeModifiers.outside;

  // Selection glow (range) sobrepõe a semântica; ainda mostramos o valor.
  const stateClass = (() => {
    if (isSelected || isDisabled || isOutside) return "";
    switch (kind) {
      case "work-profit":
        return "ring-1 ring-inset ring-success/40 bg-success/[0.08]";
      case "work-loss":
        return "ring-1 ring-inset ring-destructive/40 bg-destructive/[0.06]";
      case "work-gross":
        return "ring-1 ring-inset ring-primary/40 bg-primary/[0.08]";
      case "miss":
        return "border border-dashed border-destructive/50";
      case "off":
        return "bg-muted/20";
      default:
        return "";
    }
  })();

  const labelBelow: { text: string; cls: string } | null = (() => {
    if (isOutside || isDisabled) return null;
    if (kind === "work-profit")
      return { text: compactBRL(value), cls: "text-success" };
    if (kind === "work-loss")
      return { text: compactBRL(value), cls: "text-destructive" };
    if (kind === "work-gross")
      return { text: compactBRL(value), cls: "text-primary" };
    if (kind === "off" && ctx?.showPlanSemantics)
      return { text: "folga", cls: "text-muted-foreground/60" };
    return null;
  })();

  return (
    <button
      ref={ref}
      {...dr.buttonProps}
      className={cn(
        dr.buttonProps.className,
        "flex h-11 w-11 flex-col items-center justify-center gap-0.5 p-0 font-normal",
        stateClass,
      )}
    >
      <span className="text-[13px] leading-none tabular-nums">{dayNum}</span>
      {labelBelow ? (
        <span
          className={cn(
            "whitespace-nowrap text-[8px] leading-none tabular-nums font-medium",
            labelBelow.cls,
            (isSelected || isDisabled) && "opacity-70",
          )}
        >
          {labelBelow.text}
        </span>
      ) : (
          <span className="h-2" aria-hidden />
      )}
    </button>
  );
}

export function EnrichedCalendar({
  className,
  classNames,
  showOutsideDays = true,
  dailyStats,
  valueMode = "net",
  plannedDates,
  showPlanSemantics = false,
  ...props
}: EnrichedCalendarProps) {
  const plannedSet = React.useMemo(
    () => new Set(plannedDates ?? []),
    [plannedDates],
  );
  const today = React.useMemo(() => new Date(), []);

  return (
    <Ctx.Provider
      value={{
        stats: dailyStats,
        valueMode,
        plannedSet,
        showPlanSemantics,
        today,
      }}
    >
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-11 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-11 w-11 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-11 w-11 p-0 font-normal aria-selected:opacity-100",
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
          Day: CustomDay,
        }}
        {...props}
      />
    </Ctx.Provider>
  );
}
EnrichedCalendar.displayName = "EnrichedCalendar";
