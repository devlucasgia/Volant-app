import { User } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { box: string; text: string; icon: string }> = {
  sm: { box: "h-7 w-7", text: "text-[8px]", icon: "h-3.5 w-3.5" },
  md: { box: "h-10 w-10", text: "text-[10px]", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12", text: "text-xs", icon: "h-6 w-6" },
};

interface Props {
  platformKey: string;
  label: string;
  hex: string;
  size?: Size;
  className?: string;
}

/**
 * Renders an "official" looking logo for built-in platforms,
 * and a colored letter avatar for custom platforms.
 */
export function PlatformLogo({ platformKey, label, hex, size = "md", className }: Props) {
  const s = sizeMap[size];
  const base = cn(
    "grid place-items-center rounded-full font-bold tracking-tight shrink-0",
    s.box,
    s.text,
    className
  );

  if (platformKey === "uber") {
    return (
      <div className={cn(base, "bg-black text-white")}>
        <span className="font-extrabold">Uber</span>
      </div>
    );
  }
  if (platformKey === "99") {
    return (
      <div className={cn(base, "bg-[#FFCC00] text-black")}>
        <span className={cn("font-extrabold", size === "sm" ? "text-[11px]" : size === "md" ? "text-sm" : "text-base")}>99</span>
      </div>
    );
  }
  if (platformKey === "indriver") {
    return (
      <div className={cn(base, "bg-[#A4E333] text-black")}>
        <span className="font-extrabold lowercase">inDrive</span>
      </div>
    );
  }
  if (platformKey === "particular") {
    return (
      <div className={cn(base, "bg-blue-500 text-white")}>
        <User className={s.icon} />
      </div>
    );
  }

  // Custom platform: use the user-defined color and first letter
  const letter = (label || "?").trim().charAt(0).toUpperCase();
  return (
    <div className={cn(base, "text-white")} style={{ backgroundColor: hex }}>
      <span className={cn("font-extrabold", size === "sm" ? "text-xs" : size === "md" ? "text-base" : "text-lg")}>{letter}</span>
    </div>
  );
}
