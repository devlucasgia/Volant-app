import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { PlatformLogo } from "@/components/PlatformLogo";
import { CategoryDialog } from "@/components/CategoryDialog";
import { toast } from "sonner";

export default function CategoriasGanhos() {
  const navigate = useNavigate();
  const { entries, earningPlatforms, deleteCategory } = useData();
  const [dialog, setDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const tryDelete = async (p: { id?: string; key: string; label: string }) => {
    if (!p.id) return;
    const used = entries.some((e) => e.type === "earning" && e.app === p.key);
    if (used) {
      if (!confirm(`A plataforma "${p.label}" possui ganhos registrados. Excluir mesmo assim manterá os registros antigos com o nome atual. Continuar?`)) return;
    } else {
      if (!confirm(`Excluir "${p.label}"?`)) return;
    }
    await deleteCategory(p.id);
    toast.success("Plataforma excluída");
  };

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
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
            <Wallet className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
              Ganhos
            </h1>
            <p className="text-[11px] leading-tight text-muted-foreground/80">
              Gerencie os apps e fontes de ganho.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-3 px-4 py-6">
        <Button size="sm" variant="outline" className="w-full" onClick={() => setDialog({ open: true, editing: null })}>
          <Plus className="mr-1 h-4 w-4" /> Nova plataforma
        </Button>
        <div className="space-y-2">
          {earningPlatforms.map((p) => (
            <div key={p.key} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:bg-muted/30">
              <PlatformLogo platformKey={p.key} label={p.label} hex={p.hex} size="sm" imageUrl={p.imageUrl} />
              <div className="min-w-0 flex-1 truncate text-sm font-medium">{p.label}</div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() => setDialog({ open: true, editing: { id: p.id, key: p.key, label: p.label, emoji: p.emoji, color: p.hex, platformType: p.type, imageUrl: p.imageUrl } })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {p.isCustom && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                    onClick={() => tryDelete(p)}>
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
        type="earning"
        editing={dialog.editing}
      />
    </div>
  );
}
