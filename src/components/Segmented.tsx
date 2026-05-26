import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "xs" | "sm" | "md";
  /**
   * "default" → green active state (legacy / standard segmented).
   * "contextual" → minimal pill: muted track + subtle tinted knob that
   *  follows the option key (success for "liquido", info-blue for "bruto").
   *  Used inside the Home hero card so the selector feels integrated and
   *  premium instead of dominant.
   */
  tone?: "default" | "contextual";
}

/**
 * Standard segmented selector — premium green active state,
 * shared across the entire app for visual consistency.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
  tone = "default",
}: Props<T>) {
  const isContextual = tone === "contextual";

  const trackClass = isContextual
    ? "rounded-full border border-white/10 bg-white/5 p-0.5 backdrop-blur-sm"
    : "rounded-xl border border-border/60 bg-muted/60 p-1";

  return (
    <div role="tablist" className={cn("flex w-full", trackClass, className)}>
      {options.map((o) => {
        const active = o.key === value;
        const isGross = (o.key as unknown as string) === "bruto";

        const sizeClass =
          size === "xs"
            ? "py-1 text-[11px] tracking-wide"
            : size === "sm"
              ? "py-1.5 text-xs"
              : "py-2 text-sm";

        const activeClass = isContextual
          ? cn(
              "text-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.12)]",
              isGross
                ? "bg-[hsl(var(--goal-gross))]/22 ring-1 ring-[hsl(var(--goal-gross))]/45"
                : "bg-success/22 ring-1 ring-success/45",
            )
          : "bg-gradient-to-b from-success to-success/85 text-success-foreground shadow-[0_2px_10px_-2px_hsl(var(--success)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.12)] ring-1 ring-success/40";

        const inactiveClass = isContextual
          ? "text-muted-foreground/80 hover:text-foreground"
          : "text-muted-foreground hover:text-foreground";

        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={cn(
              "flex-1 font-medium transition-all duration-300",
              isContextual ? "rounded-full" : "rounded-lg",
              sizeClass,
              active ? activeClass : inactiveClass,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
