import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Fab({ onClick, className }: { onClick: () => void; className?: string }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      // hide when scrolling down, show when scrolling up or near top
      if (Math.abs(dy) > 6) {
        if (dy > 0 && y > 80) setHidden(true);
        else setHidden(false);
        lastY.current = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      aria-label="Novo registro"
      onClick={onClick}
      className={cn(
        "fixed right-5 z-40 grid h-14 w-14 place-items-center rounded-full",
        "gradient-success text-primary-foreground shadow-fab",
        "transition-all duration-300 active:scale-95 hover:scale-105",
        // sit just above the bottom nav (≈64px)
        "bottom-[5.25rem]",
        hidden ? "translate-y-[140%] opacity-0 pointer-events-none" : "translate-y-0 opacity-100",
        className
      )}
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </button>
  );
}
