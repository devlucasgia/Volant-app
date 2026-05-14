import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  disabled?: boolean;
  active: boolean;
  children: React.ReactNode;
}

/** Sortable wrapper row used inside the Home personalization list.
 *  Drag handle is exposed on the left; the row content stays fully clickable. */
export function SortableHomeRow({ id, disabled, active, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 30 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 rounded-xl border p-2 transition-colors duration-200 touch-none",
        active ? "border-primary/40 bg-primary/[0.06]" : "border-border/60 bg-muted/20",
        isDragging && "shadow-lg ring-1 ring-primary/30",
      )}
    >
      <button
        type="button"
        className={cn(
          "flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground/60 active:cursor-grabbing",
          disabled && "invisible",
        )}
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
