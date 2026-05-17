import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Global toast configuration — optimized for fast, premium UX.
 * - Success/info: ~1.2s (fast confirmation, no interruption)
 * - Errors: ~3s (overridden per-call below)
 * - Single visible toast at a time → no stacking spam
 * - Compact padding + subtle fade/slide animation
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      duration={1200}
      visibleToasts={1}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-auto group-[.toaster]:bg-background/95 group-[.toaster]:backdrop-blur group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border/70 group-[.toaster]:shadow-[0_8px_24px_-12px_hsl(var(--background)/0.6)] group-[.toaster]:rounded-xl group-[.toaster]:py-2 group-[.toaster]:px-3 group-[.toaster]:min-h-0 group-[.toaster]:text-[13px] group-[.toaster]:gap-2",
          title: "text-[13px] font-medium leading-tight",
          description: "group-[.toast]:text-muted-foreground text-[12px] leading-snug",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:!border-success/30 group-[.toaster]:!shadow-[0_8px_24px_-12px_hsl(var(--success)/0.35)]",
          error: "group-[.toaster]:!border-destructive/40",
        },
      }}
      {...props}
    />
  );
};

/**
 * Wrap sonner's `toast` so error/warning toasts default to a longer duration
 * (users need more time to read them) while success/info stay snappy.
 * Per-call `duration` still wins.
 */
type ToastFn = typeof sonnerToast;
const withDefaultDuration = <Args extends unknown[]>(
  fn: (...args: Args) => string | number,
  defaultDuration: number,
) => {
  return ((...args: Args) => {
    const last = args[args.length - 1];
    if (last && typeof last === "object" && !("length" in (last as object))) {
      const opts = last as { duration?: number };
      if (opts.duration == null) opts.duration = defaultDuration;
    } else {
      (args as unknown[]).push({ duration: defaultDuration });
    }
    return fn(...args);
  }) as typeof fn;
};

const toast: ToastFn = Object.assign(
  ((...args: Parameters<ToastFn>) => sonnerToast(...args)) as ToastFn,
  sonnerToast,
);
toast.error = withDefaultDuration(sonnerToast.error.bind(sonnerToast), 3000);
toast.warning = withDefaultDuration(sonnerToast.warning.bind(sonnerToast), 3000);

export { Toaster, toast };
