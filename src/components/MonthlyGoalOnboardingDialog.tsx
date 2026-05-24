import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GoalType } from "@/types";

/**
 * Optional first-run dialog asking the user to set a monthly goal.
 * Opens after the car-onboarding flow completes (whether saved or skipped).
 * Behaves like the car dialog: user can save or skip — never blocking.
 */
export function MonthlyGoalOnboardingDialog() {
  const { user } = useAuth();
  const { settings, updateSettings } = useData();
  const [open, setOpen] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>("bruto");
  const [workingDays, setWorkingDays] = useState<number | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const availableDaysThisMonth = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return end - now.getDate() + 1;
  }, [open]);

  const workingDaysInvalid =
    workingDays != null && (workingDays < 1 || workingDays > availableDaysThisMonth);

  const checkAndOpen = () => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("car_onboarded, goal_onboarded, onboarded")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        if (d.onboarded && d.car_onboarded && !d.goal_onboarded && !settings.monthlyGoal) {
          setGoalType(settings.goalType ?? "bruto");
          setWorkingDays(settings.workingDaysPerMonth ?? null);
          setValue(null);
          setOpen(true);
        }
      });
  };

  useEffect(() => {
    const onCarFinished = () => checkAndOpen();
    window.addEventListener("volant:car-onboarding-finished", onCarFinished);
    window.addEventListener("volant:onboarding-finished", onCarFinished);
    return () => {
      window.removeEventListener("volant:car-onboarding-finished", onCarFinished);
      window.removeEventListener("volant:onboarding-finished", onCarFinished);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings.monthlyGoal]);

  const finish = async (skip = false) => {
    if (!user) return;
    if (!skip && workingDaysInvalid) return;
    setSaving(true);
    if (!skip) {
      const patch: any = { goalType };
      if (workingDays != null && !workingDaysInvalid) patch.workingDaysPerMonth = workingDays;
      if (value && value > 0) patch.monthlyGoal = value;
      if (Object.keys(patch).length > 0) await updateSettings(patch);
      if (value && value > 0) toast.success(`Meta mensal definida: ${brl(value)}`);
    }
    await supabase.from("profiles").upsert({ id: user.id, goal_onboarded: true } as any);
    setSaving(false);
    setOpen(false);
    window.dispatchEvent(new CustomEvent("volant:goal-onboarding-finished"));
  };

  const canSave = !workingDaysInvalid && !!value && value > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(true); }}>
      <DialogContent className="max-w-md z-[120] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Target className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Defina sua meta mensal</DialogTitle>
          <DialogDescription className="text-center">
            Opcional. O Volant calcula sua meta semanal e diária automaticamente a partir dela.
          </DialogDescription>
        </DialogHeader>

        {/* 1. Tipo de meta */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tipo de meta</Label>
          <p className="text-[11px] text-muted-foreground/80 -mt-1">
            Escolha se sua meta será calculada pelo lucro líquido ou pelo ganho bruto.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "liquido", title: "Meta líquida", desc: "Considera o que sobra depois dos gastos." },
              { key: "bruto", title: "Meta bruta", desc: "Considera o total de ganhos antes dos gastos." },
            ] as const).map((opt) => {
              const active = goalType === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setGoalType(opt.key)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                    active
                      ? "border-primary/45 bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_4px_14px_-10px_hsl(var(--primary)/0.5)]"
                      : "border-border/60 bg-muted/25 hover:bg-muted/40",
                  )}
                >
                  <div className="text-[13px] font-semibold">{opt.title}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Dias trabalhados no mês */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Dias trabalhados no mês</Label>
          <p className="text-[11px] text-muted-foreground/80 -mt-1">
            Quantos dias você pretende trabalhar até o fim do mês?
          </p>
          <NumberField
            value={workingDays}
            decimal={false}
            inputMode="numeric"
            placeholder="Ex: 22"
            className={cn(workingDaysInvalid && "border-destructive focus-visible:ring-destructive")}
            onChange={(v) => {
              if (v == null) return setWorkingDays(null);
              const n = Math.max(1, Math.min(31, Math.floor(v)));
              setWorkingDays(n);
            }}
          />
          <div className="min-h-[16px] text-[11px] leading-none">
            {workingDaysInvalid ? (
              <span className="font-medium text-destructive/90">
                Apenas {availableDaysThisMonth} dias disponíveis no mês
              </span>
            ) : (
              <span className="text-muted-foreground">
                Dias disponíveis: {availableDaysThisMonth}
              </span>
            )}
          </div>
        </div>

        {/* 3. Meta mensal */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Meta mensal</Label>
          <NumberField
            currency
            value={value}
            onChange={(v) => setValue(v)}
            placeholder="0,00"
          />
          <p className="text-[11px] text-muted-foreground">
            Você pode alterar quando quiser em Ajustes → Metas Inteligentes.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => finish(true)} disabled={saving}>Pular</Button>
          <Button onClick={() => finish(false)} disabled={saving || !canSave}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
