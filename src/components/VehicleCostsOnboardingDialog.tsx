import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import {
  VehicleCostsSection,
  EMPTY_VEHICLE_COSTS,
  type VehicleCosts,
} from "@/components/vehicle/VehicleCostsSection";

/**
 * Segundo passo do onboarding pós-tour: custos do veículo recém-cadastrado.
 * Abre depois de `volant:car-onboarding-finished`. Opcional — botão Pular sempre disponível.
 */
export function VehicleCostsOnboardingDialog() {
  const { user } = useAuth();
  const { cars, activeCar, refreshCars } = useData();
  const [open, setOpen] = useState(false);
  const [costs, setCosts] = useState<VehicleCosts>(EMPTY_VEHICLE_COSTS);
  const [saving, setSaving] = useState(false);

  const targetCar = activeCar || cars[0] || null;

  const emitFinished = () => {
    window.dispatchEvent(new CustomEvent("volant:costs-onboarding-finished"));
  };

  const markDone = async () => {
    if (!user) return;
    await supabase.from("profiles").upsert({ id: user.id, costs_onboarded: true } as any);
  };

  const checkAndOpen = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("onboarded, car_onboarded, costs_onboarded")
      .eq("id", user.id)
      .maybeSingle();
    if (!data) return;
    const d = data as any;
    if (!d.onboarded || !d.car_onboarded || d.costs_onboarded) return;

    // Se o usuário pulou o cadastro do carro, não há veículo para receber os custos.
    if (!targetCar) {
      await markDone();
      emitFinished();
      return;
    }
    setCosts(EMPTY_VEHICLE_COSTS);
    setOpen(true);
  };

  useEffect(() => {
    const onCarFinished = () => { void checkAndOpen(); };
    window.addEventListener("volant:car-onboarding-finished", onCarFinished);
    return () => window.removeEventListener("volant:car-onboarding-finished", onCarFinished);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, targetCar?.id]);

  const finish = async (skip = false) => {
    if (!user) return;
    setSaving(true);
    if (!skip && targetCar) {
      const { error } = await supabase
        .from("cars")
        .update(costs as any)
        .eq("id", targetCar.id);
      if (error) {
        toast.error("Não foi possível salvar os custos");
        setSaving(false);
        return;
      }
      await refreshCars();
      toast.success("Custos salvos");
    }
    await markDone();
    setSaving(false);
    setOpen(false);
    emitFinished();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) void finish(true); }}>
      <DialogContent className="max-w-md z-[120] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Wrench className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Seus custos</DialogTitle>
          <DialogDescription className="text-center">
            Opcional. Esses valores ajudam o Volant a calcular o R$/km ideal e o lucro líquido real.
            <br />
            <span className="text-[11px] text-muted-foreground/80">
              Você pode preencher depois em Ajustes → Veículos → Custos.
            </span>
          </DialogDescription>
        </DialogHeader>

        <VehicleCostsSection value={costs} onChange={setCosts} />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => void finish(true)} disabled={saving}>Pular</Button>
          <Button onClick={() => void finish(false)} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
