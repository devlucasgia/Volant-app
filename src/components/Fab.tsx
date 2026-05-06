import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Fab({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      aria-label="Novo registro"
      onClick={onClick}
      className={cn(
        "fixed bottom-20 right-5 z-40 grid h-14 w-14 place-items-center rounded-full",
        "gradient-success text-primary-foreground shadow-fab",
        "transition-transform active:scale-95 hover:scale-105",
        className
      )}
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </button>
  );
}
