import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wrench, Route, Gauge, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/NumberField";
import { useData } from "@/context/DataContext";
import { totalKmAllTime } from "@/lib/stats";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Car as CarType } from "@/types";

function carLabel(c: CarType) {
  const parts = [c.brand, c.model].filter(Boolean).join(" ");
  return parts || "Carro sem nome";
}

export default function ManutencaoPreventiva() {
  const navigate = useNavigate();
  const { settings, updateSettings, entries, activeCar, carInitialKm } = useData();
  const totalKmDriven = totalKmAllTime(entries);
  const realCurrentKm = carInitialKm + totalKmDriven;

  const [intervalKm, setIntervalKm] = useState<number>(settings.maintenanceIntervalKm);
  const [lastMaint, setLastMaint] = useState<number>(settings.lastMaintenanceKm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);
  useEffect(() => {
    setIntervalKm(settings.maintenanceIntervalKm);
    setLastMaint(settings.lastMaintenanceKm);
  }, [settings.maintenanceIntervalKm, settings.lastMaintenanceKm]);

  const dirty =
    intervalKm !== settings.maintenanceIntervalKm ||
    lastMaint !== settings.lastMaintenanceKm;

  const { nextMaintKm, kmRemaining, overdue } = useMemo(() => {
    const baseKm = lastMaint > 0 ? lastMaint : carInitialKm;
    const next = baseKm + (intervalKm || 0);
    const remaining = intervalKm > 0 ? Math.max(0, next - realCurrentKm) : 0;
    return { nextMaintKm: next, kmRemaining: remaining, overdue: intervalKm > 0 && realCurrentKm >= next };
  }, [lastMaint, intervalKm, carInitialKm, realCurrentKm]);

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        maintenanceIntervalKm: intervalKm,
        lastMaintenanceKm: lastMaint,
      });
      toast.success("Manutenção atualizada");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={() => navigate("/ajustes/veiculos")}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wrench className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
              Manutenção preventiva
            </h1>
            <p className="text-[11px] leading-tight text-muted-foreground/80">
              Acompanhe revisões, trocas e cuidados importantes.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-3 px-4 py-5 animate-fade-in">
        <p className="text-xs leading-snug text-muted-foreground">
          Configure o intervalo da manutenção e o Volant acompanha automaticamente os km registrados, avisando quando for hora de cuidar do carro.
        </p>

        {activeCar && (
          <div className="text-xs text-muted-foreground">
            Carro ativo: <span className="font-semibold text-foreground">{carLabel(activeCar)}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Intervalo (km)</Label>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Defina de quantos em quantos quilômetros a manutenção deve ser feita.
          </p>
          <NumberField
            value={intervalKm || null}
            onChange={(v) => setIntervalKm(v ?? 0)}
            decimal={false}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Última manutenção feita em (km)</Label>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Informe a quilometragem da última manutenção realizada.
          </p>
          <NumberField
            value={lastMaint || null}
            onChange={(v) => setLastMaint(v ?? 0)}
            decimal={false}
          />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success/[0.08] via-card to-card p-4 shadow-[0_0_24px_-12px_hsl(var(--success)/0.5)]">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-success/15 blur-3xl" aria-hidden />
          <div className="relative grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Km atual do carro</div>
              <div className="mt-1 text-lg font-bold tabular-nums">{num(realCurrentKm, 0)} km</div>
            </div>
            <div className="min-w-0 text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Próxima manutenção aos</div>
              <div className={cn(
                "mt-1 text-lg font-bold tabular-nums",
                overdue ? "text-destructive" : "text-foreground"
              )}>
                {intervalKm > 0 ? `${num(nextMaintKm, 0)} km` : "--"}
              </div>
            </div>
            <div className="col-span-2 mt-1 border-t border-border/60 pt-2 text-center">
              <div className={cn(
                "text-xs font-medium",
                overdue ? "text-destructive" : "text-success"
              )}>
                {intervalKm > 0
                  ? overdue
                    ? `Atrasada em ${num(realCurrentKm - nextMaintKm, 0)} km`
                    : `Faltam ${num(kmRemaining, 0)} km`
                  : "Defina um intervalo para começar"}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-foreground">Como funciona</div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { icon: Route, title: "Defina o intervalo", text: "Escolha de quantos em quantos km a manutenção deve ser feita." },
              { icon: Gauge, title: "Acompanhe automaticamente", text: "Os km acompanham os registros de ganhos realizados no Volant." },
              { icon: Bell, title: "Receba o aviso", text: "Quando chegar a hora, o alerta aparece na tela inicial." },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card px-1.5 py-2 text-center">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success">
                  <s.icon className="h-3 w-3" />
                </div>
                <p className="text-[10px] font-semibold leading-tight text-foreground">{s.title}</p>
                <p className="text-[9.5px] leading-snug text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={save}
          disabled={saving || !dirty}
          className="mt-2 w-full h-11 shadow-[0_8px_24px_-8px_hsl(var(--success)/0.45)]"
        >
          {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
