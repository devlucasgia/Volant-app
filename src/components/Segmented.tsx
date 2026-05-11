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
  size?: "sm" | "md";
}

/**
 * Standard segmented selector — premium green active state,
 * shared across the entire app for visual consistency.
 */
export function Segmented<T extends string>({ options, value, onChange, className, size = "md" }: Props<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full rounded-xl bg-muted p-1",
        className
      )}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={cn(
              "flex-1 rounded-lg font-medium transition-all duration-200",
              size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm",
              active
                ? "bg-success text-success-foreground shadow-[0_2px_8px_-2px_hsl(var(--success)/0.45)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
