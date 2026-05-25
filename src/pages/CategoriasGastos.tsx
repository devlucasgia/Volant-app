import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Receipt, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { CategoryDialog } from "@/components/CategoryDialog";
import { toast } from "sonner";

export default function CategoriasGastos() {
  const navigate = useNavigate();
  const { expenseCategories, deleteCategory } = useData();
  const [dialog, setDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={() => navigate("/ajustes/categorias")}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
            <Receipt className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
              Gastos
            </h1>
            <p className="text-[11px] leading-tight text-muted-foreground/80">
              Gerencie suas categorias de despesas.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-3 px-4 py-6">
        <Button size="sm" variant="outline" className="w-full" onClick={() => setDialog({ open: true, editing: null })}>
          <Plus className="mr-1 h-4 w-4" /> Nova categoria
        </Button>
        <div className="space-y-2">
          {expenseCategories.map((c) => (
            <div key={c.key} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:bg-muted/30">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                style={{ backgroundColor: c.hex + "33" }}>{c.emoji}</span>
              <div className="min-w-0 flex-1 truncate text-sm font-medium">{c.label}</div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() => setDialog({ open: true, editing: { id: c.id, key: c.key, label: c.label, emoji: c.emoji, color: c.hex } })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {c.isCustom && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                    onClick={async () => {
                      if (!c.id) return;
                      if (!confirm(`Excluir "${c.label}"?`)) return;
                      await deleteCategory(c.id);
                      toast.success("Categoria excluída");
                    }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <CategoryDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((s) => ({ ...s, open: o }))}
        type="expense"
        editing={dialog.editing}
      />
    </div>
  );
}
