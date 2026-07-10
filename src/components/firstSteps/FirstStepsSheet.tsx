import { useNavigate } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useUI } from "@/context/UIContext";
import type { FirstStepTask } from "@/lib/firstSteps";

export interface FirstStepsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: FirstStepTask[];
  done: number;
  total: number;
}

export function FirstStepsSheet({ open, onOpenChange, tasks, done, total }: FirstStepsSheetProps) {
  const navigate = useNavigate();
  const { openDrawer } = useUI();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleTaskClick = (task: FirstStepTask) => {
    if (task.done) return;
    // Fecha ANTES de navegar/abrir drawer pra sheet não ficar por cima.
    onOpenChange(false);
    setTimeout(() => {
      if (task.action === "openEntryDrawer") {
        openDrawer();
        return;
      }
      if (task.route) navigate(task.route);
    }, 60);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-[16px] font-bold">Primeiros passos</DrawerTitle>
          <DrawerDescription className="text-[12px]">
            {done} de {total} concluídos
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <ul className="space-y-2 px-4 py-4">
          {tasks.map((task) => {
            const isDone = task.done;
            return (
              <li key={task.key}>
                <button
                  type="button"
                  onClick={isDone ? undefined : () => goTo(task.route)}
                  disabled={isDone}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-3 text-left transition-colors",
                    isDone
                      ? "opacity-70 cursor-default"
                      : "hover:bg-muted/40 active:scale-[0.99]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                      isDone
                        ? "border-success bg-success text-[hsl(222_47%_7%)]"
                        : "border-border bg-transparent",
                    )}
                  >
                    {isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>

                  <span
                    className={cn(
                      "min-w-0 flex-1 text-[13.5px] font-semibold leading-snug",
                      isDone && "line-through text-muted-foreground",
                    )}
                  >
                    {task.label}
                  </span>

                  {!isDone && (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </DrawerContent>
    </Drawer>
  );
}
