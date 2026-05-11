import { cn } from "@/lib/utils";

/**
 * Volant brand mark — minimalist steering-wheel icon in the
 * primary green. Designed to sit next to the "Volant" wordmark.
 */
export function VolantLogo({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="volant-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" stroke="url(#volant-grad)" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="3.2" fill="url(#volant-grad)" />
      <path
        d="M16 6.5 V12.8 M6.5 16 H12.8 M25.5 16 H19.2 M16 25.5 V19.2"
        stroke="url(#volant-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
