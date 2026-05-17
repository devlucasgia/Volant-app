import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Patch sonner so error/warning toasts default to a longer duration.
 * Success/info stay snappy via the global `duration` on <Toaster /> below.
 * Runs once at module load. Per-call `duration` still wins.
 */
const ERROR_DURATION = 3000;
type ToastOpts = { duration?: number };
const patchType = (key: "error" | "warning") => {
  const original = (toast as any)[key]?.bind(toast);
  if (!original) return;
  (toast as any)[key] = (message: unknown, opts?: ToastOpts) => {
    const merged: ToastOpts = { duration: ERROR_DURATION, ...(opts || {}) };
    return original(message, merged);
  };
};
patchType("error");
patchType("warning");

/**
 * Global toast configuration — optimized for fast, premium UX.
 * - Success/info: ~1.2s (fast confirmation, no interruption)
 * - Errors/warnings: ~3s (patched above)
 * - Single visible toast at a time → no stacking spam
 * - Compact padding + subtle fade animation
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

export { Toaster, toast };
