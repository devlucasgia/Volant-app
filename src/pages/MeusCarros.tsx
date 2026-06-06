import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Car, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarFormDialog } from "@/components/CarFormDialog";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Car as CarType } from "@/types";

function carLabel(c: CarType) {
  const parts = [c.brand, c.model].filter(Boolean).join(" ");
  return parts || "Carro sem nome";
}

export default function MeusCarros() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as
    | { returnTo?: string; planningResume?: unknown }
    | null;
  const returnTo = state?.returnTo;
  const planningResume = state?.planningResume;
  const { user } = useAuth();
  const { cars, setActiveCar, refreshCars } = useData();
  const [dialog, setDialog] = useState<{ open: boolean; car: CarType | null }>({ open: false, car: null });

  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo, {
        state: planningResume ? { planningResume } : undefined,
      });
    } else {
      navigate("/ajustes/veiculos");
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const deleteCar = async (car: CarType) => {
    if (!confirm(`Excluir o carro ${car.brand || ""} ${car.model || ""}?`)) return;
    const { error } = await supabase.from("cars").delete().eq("id", car.id);
    if (error) return toast.error("Erro ao excluir");
    if (car.is_active) {
      const next = cars.find((c) => c.id !== car.id);
      if (next) await supabase.from("cars").update({ is_active: true }).eq("id", next.id);
    }
    await refreshCars();
    toast.success("Carro excluído");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
            <Car className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
              Meus carros
            </h1>
            <p className="text-[11px] leading-tight text-muted-foreground/80">
              Cadastre e gerencie seus veículos.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-3 px-4 py-5 animate-fade-in">
        <Button size="sm" variant="outline" className="w-full" onClick={() => setDialog({ open: true, car: null })}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar carro
        </Button>

        {cars.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Nenhum carro cadastrado.
          </div>
        ) : (
          <div className="space-y-2">
            {cars.map((c) => (
              <div key={c.id} className={cn(
                "rounded-xl border p-3 transition-all duration-200",
                c.is_active ? "border-primary/60 bg-primary/[0.06]" : "border-border hover:bg-muted/30",
              )}>
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => !c.is_active && setActiveCar(c.id)} className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{carLabel(c)}</div>
                      {c.is_active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          <CheckCircle2 className="h-3 w-3" /> ATIVO
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {c.plate ? `${c.plate} · ` : ""}{num(c.initial_km, 0)} km iniciais
                    </div>
                    {!c.is_active && <div className="mt-1 text-[11px] text-primary">Toque para ativar</div>}
                  </button>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDialog({ open: true, car: c })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteCar(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CarFormDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((s) => ({ ...s, open: o }))}
        car={dialog.car}
        onSaved={() => {
          // Se viemos do Planejamento Inteligente, retorna automaticamente
          // levando o rascunho preservado para continuar a rotina no passo 5.
          if (returnTo) {
            navigate(returnTo, {
              state: planningResume ? { planningResume } : undefined,
            });
          }
        }}
      />
    </div>
  );
}
