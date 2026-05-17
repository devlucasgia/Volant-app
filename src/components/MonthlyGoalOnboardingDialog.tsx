import { useEffect, useState } from "react";
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

/**
 * Optional first-run dialog asking the user to set a monthly goal.
 * Opens after the car-onboarding flow completes (whether saved or skipped).
 * Behaves like the car dialog: user can save or skip — never blocking.
 */
export function MonthlyGoalOnboardingDialog() {
  const { user } = useAuth();
  const { settings, updateSettings } = useData();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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
          setOpen(true);
        }
      });
  };

  useEffect(() => {
    // Fires when the car-onboarding dialog closes (saved or skipped)
    const onCarFinished = () => checkAndOpen();
    window.addEventListener("volant:car-onboarding-finished", onCarFinished);
    // Also re-check after the tour is closed in case the car step was already done
    window.addEventListener("volant:onboarding-finished", onCarFinished);
    return () => {
      window.removeEventListener("volant:car-onboarding-finished", onCarFinished);
      window.removeEventListener("volant:onboarding-finished", onCarFinished);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings.monthlyGoal]);

  const finish = async (skip = false) => {
    if (!user) return;
    setSaving(true);
    if (!skip && value && value > 0) {
      await updateSettings({ monthlyGoal: value });
      toast.success(`Meta mensal definida: ${brl(value)}`);
    }
    await supabase.from("profiles").upsert({ id: user.id, goal_onboarded: true } as any);
    setSaving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(true); }}>
      <DialogContent className="max-w-md z-[120]">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Target className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Defina sua meta mensal</DialogTitle>
          <DialogDescription className="text-center">
            Opcional. O Volant calcula sua meta semanal e diária automaticamente a partir dela.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Meta mensal</Label>
          <NumberField
            currency
            value={value}
            onChange={(v) => setValue(v)}
            placeholder="0,00"
          />
          <p className="text-[11px] text-muted-foreground">
            Você pode alterar quando quiser em Ajustes → Metas e objetivos.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => finish(true)} disabled={saving}>Pular</Button>
          <Button onClick={() => finish(false)} disabled={saving || !value || value <= 0}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
