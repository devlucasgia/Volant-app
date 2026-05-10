import { useLocation, useNavigate } from "react-router-dom";
import { useTimer, formatHMS } from "@/context/TimerContext";
import { Timer as TimerIcon, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export function TimerFab() {
  const { state, workMs } = useTimer();
  const navigate = useNavigate();
  const location = useLocation();

  if (state === "idle" || state === "ended") return null;
  if (location.pathname === "/jornada") return null;

  const isRest = state === "resting";

  return (
    <button
      onClick={() => navigate("/jornada")}
      className={cn(
        "fixed bottom-36 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-2.5",
        "shadow-fab transition-transform active:scale-95 hover:scale-105",
        isRest ? "bg-warning text-warning-foreground" : "gradient-success text-primary-foreground"
      )}
      aria-label="Abrir jornada"
    >
      {isRest ? <Coffee className="h-4 w-4" /> : <TimerIcon className="h-4 w-4 animate-pulse" />}
      <span className="text-sm font-bold tabular-nums">{formatHMS(workMs)}</span>
    </button>
  );
}
