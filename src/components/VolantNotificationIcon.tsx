import { cn } from "@/lib/utils";

/**
 * Símbolo institucional do Volant — "V" estilizado em SVG inline,
 * usado especificamente na Central de Notificações.
 *
 * - Render imediato (sem imagem remota / fetch).
 * - Container circular escuro com borda sutil e glow verde discreto.
 * - O "V" usa o verde primário do app, sem se confundir com o fundo.
 */
export function VolantNotificationIcon({
  className,
  size = 36,
  iconSize,
}: {
  className?: string;
  size?: number;
  iconSize?: number;
}) {
  const inner = iconSize ?? Math.round(size * 0.55);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full",
        "bg-[hsl(var(--background))] ring-1 ring-inset ring-border/70",
        "shadow-[0_0_18px_-6px_hsl(var(--primary)/0.55)]",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={inner}
        height={inner}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6.5 8 L16 24 L25.5 8"
          stroke="hsl(var(--primary))"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
