import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Wrench,
  Route,
  Gauge,
  Bell,
  Loader2,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/NumberField";
import { Progress } from "@/components/ui/progress";
import { useData } from "@/context/DataContext";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ActiveCarHeader } from "@/components/vehicle/ActiveCarHeader";
import { UpdateLastMaintenanceSheet } from "@/components/vehicle/UpdateLastMaintenanceSheet";
import { computeMaintenanceStatus, realCurrentKm, type MaintenanceStatus } from "@/lib/carKm";

type MaintType = "oleo" | "pneus";

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-foreground/70 ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
          <Wrench className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Manutenção preventiva
          </h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">
            Acompanhe revisões a partir dos intervalos cadastrados nos Custos.
          </p>
        </div>
      </div>
    </header>
  );
}

function MaintenanceBlock({
  type,
  status,
  onUpdateLast,
  onConfigureCosts,
}: {
  type: MaintType;
  status: MaintenanceStatus | null;
  onUpdateLast: () => void;
  onConfigureCosts: () => void;
}) {
  const title = type === "oleo" ? "Troca de óleo" : "Troca de pneus";

  if (!status) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Wrench className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
              Defina o intervalo de quilômetros nos custos do veículo para começar o acompanhamento.
            </p>
            <button
              type="button"
              onClick={onConfigureCosts}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary"
            >
              Definir intervalo nos Custos
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { intervalKm, lastKm, hasLastRegistered, nextKm, currentKm, kmRemaining, overdue, inWarnWindow, progress } =
    status;

  const tone = overdue
    ? { border: "border-destructive/40", bg: "bg-destructive/[0.05]", text: "text-destructive", bar: "[&>div]:bg-destructive" }
    : inWarnWindow
      ? { border: "border-warning/40", bg: "bg-warning/[0.06]", text: "text-warning", bar: "[&>div]:bg-warning" }
      : { border: "border-success/30", bg: "bg-success/[0.04]", text: "text-success", bar: "[&>div]:bg-success" };

  return (
    <div className={cn("rounded-2xl border bg-card p-4 transition-colors", tone.border, tone.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-card ring-1 ring-inset ring-border", tone.text)}>
            <Wrench className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <div className="text-[11px] text-muted-foreground">
              Intervalo: <span className="font-medium text-foreground">{num(intervalKm, 0)} km</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onUpdateLast}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/50"
        >
          <Pencil className="h-3 w-3" />
          {hasLastRegistered ? "Atualizar" : "Registrar"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Última troca</div>
          <div className="mt-0.5 text-[15px] font-bold tabular-nums text-foreground">{num(lastKm, 0)} km</div>
          {!hasLastRegistered && (
            <div className="mt-0.5 text-[10px] text-muted-foreground/80">Considerando o KM inicial do carro.</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Próxima aos</div>
          <div className={cn("mt-0.5 text-[15px] font-bold tabular-nums", overdue ? "text-destructive" : "text-foreground")}>
            {num(nextKm, 0)} km
          </div>
        </div>
      </div>

      <Progress value={Math.min(100, Math.max(0, progress * 100))} className={cn("mt-3 h-1.5", tone.bar)} />

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">KM atual: {num(currentKm, 0)} km</span>
        <span className={cn("font-semibold", tone.text)}>
          {overdue ? (
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Atrasada em {num(Math.abs(kmRemaining), 0)} km
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              {inWarnWindow ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              Faltam {num(kmRemaining, 0)} km
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function KmAdjustmentBlock({
  currentKm,
  onApply,
  busy,
}: {
  currentKm: number;
  onApply: (desired: number) => Promise<void>;
  busy: boolean;
}) {
  const [val, setVal] = useState<number | null>(null);
  const handle = async () => {
    if (!val || val <= 0) {
      toast.error("Informe o KM real do carro");
      return;
    }
    await onApply(val);
    setVal(null);
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Gauge className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">Ajustar KM do carro</div>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            Rodou fora do app? Informe o KM real e o Volant corrige o acompanhamento sem mexer no seu histórico.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Label className="text-[11px] text-muted-foreground">
          KM real atual (hoje no Volant: <span className="font-semibold text-foreground">{num(currentKm, 0)} km</span>)
        </Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <NumberField value={val} onChange={setVal} decimal={false} placeholder="Ex: 65000" />
          </div>
          <Button onClick={handle} disabled={busy || !val} className="shrink-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ManutencaoPreventiva() {
  const navigate = useNavigate();
  const location = useLocation();
  const { entries, activeCar, updateCarKmAdjustment } = useData();

  const [sheetType, setSheetType] = useState<MaintType | null>(null);
  const [adjBusy, setAdjBusy] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  // Hash support: /ajustes/veiculos/manutencao#oleo  ou  #pneus
  // (usado pelo toast do EntryDrawer após registrar gasto de manutenção)
  useEffect(() => {
    const h = (location.hash || "").replace("#", "");
    if (h === "oleo" || h === "pneus") {
      setSheetType(h as MaintType);
      // limpa o hash para evitar re-trigger ao voltar
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState({}, "", url.toString());
    }
  }, [location.hash]);

  const currentKm = useMemo(() => realCurrentKm(activeCar, entries), [activeCar, entries]);
  const oleo = useMemo(() => computeMaintenanceStatus(activeCar, entries, "oleo"), [activeCar, entries]);
  const pneus = useMemo(() => computeMaintenanceStatus(activeCar, entries, "pneus"), [activeCar, entries]);

  const noIntervalAtAll = !oleo && !pneus;

  const applyAdjustment = async (desired: number) => {
    if (!activeCar) return;
    const baseline =
      Number(activeCar.initial_km || 0) +
      entries.reduce((s, e) => (e.type === "earning" ? s + (Number(e.km) || 0) : s), 0);
    const offset = desired - baseline;
    if (offset === Number(activeCar.km_adjustment || 0)) {
      toast.info("O KM informado é igual ao atual");
      return;
    }
    setAdjBusy(true);
    try {
      await updateCarKmAdjustment(activeCar.id, offset);
      toast.success(`KM atualizado para ${num(desired, 0)} km`);
    } catch {
      toast.error("Não foi possível salvar o ajuste");
    } finally {
      setAdjBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <Header onBack={() => navigate("/ajustes/veiculos")} />

      <div className="space-y-3 px-4 py-5 animate-fade-in">
        <ActiveCarHeader
          car={activeCar}
          subtitle={`KM atual no Volant: ${num(currentKm, 0)} km`}
        />

        <p className="text-xs leading-snug text-muted-foreground">
          O Volant usa os intervalos cadastrados nos <span className="font-semibold text-foreground">custos do veículo</span> para
          acompanhar suas manutenções e avisar quando estiverem próximas.
        </p>

        {noIntervalAtAll && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-center">
            <Wrench className="mx-auto h-6 w-6 text-muted-foreground" />
            <div className="mt-2 text-sm font-semibold text-foreground">Nenhum intervalo definido</div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Cadastre os intervalos de troca de óleo e pneus em Custos do veículo para começar.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/ajustes/veiculos/custos", { state: { returnTo: "/ajustes/veiculos/manutencao" } })}
            >
              Abrir Custos
            </Button>
          </div>
        )}

        <MaintenanceBlock
          type="oleo"
          status={oleo}
          onUpdateLast={() => setSheetType("oleo")}
          onConfigureCosts={() => navigate("/ajustes/veiculos/custos", { state: { returnTo: "/ajustes/veiculos/manutencao" } })}
        />
        <MaintenanceBlock
          type="pneus"
          status={pneus}
          onUpdateLast={() => setSheetType("pneus")}
          onConfigureCosts={() => navigate("/ajustes/veiculos/custos", { state: { returnTo: "/ajustes/veiculos/manutencao" } })}
        />

        {activeCar && (
          <KmAdjustmentBlock currentKm={currentKm} onApply={applyAdjustment} busy={adjBusy} />
        )}

        <div className="space-y-2 pt-2">
          <div className="text-xs font-semibold text-foreground">Como funciona</div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { icon: Route, title: "Intervalo dos Custos", text: "Os KMs vêm da seção de custos do veículo, sem precisar duplicar." },
              { icon: Gauge, title: "Acompanhamento automático", text: "Os km dos seus ganhos contam para o KM atual do carro." },
              { icon: Bell, title: "Aviso multicanal", text: "Quando faltar pouco, avisamos na tela inicial, na central e por e-mail." },
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
      </div>

      <UpdateLastMaintenanceSheet
        open={sheetType !== null}
        onOpenChange={(v) => { if (!v) setSheetType(null); }}
        type={sheetType || "oleo"}
        defaultKm={currentKm > 0 ? Math.round(currentKm) : undefined}
      />
    </div>
  );
}
