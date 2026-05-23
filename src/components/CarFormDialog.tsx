import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { Car as CarType } from "@/types";
import { toast } from "sonner";
import { VehicleCostsSection, EMPTY_VEHICLE_COSTS, type VehicleCosts } from "@/components/vehicle/VehicleCostsSection";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  car?: CarType | null;
}

export function CarFormDialog({ open, onOpenChange, car }: Props) {
  const { user } = useAuth();
  const { refreshCars, cars } = useData();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [initialKm, setInitialKm] = useState("");
  const [costs, setCosts] = useState<VehicleCosts>(EMPTY_VEHICLE_COSTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBrand(car?.brand || "");
      setModel(car?.model || "");
      setPlate(car?.plate || "");
      setInitialKm(car?.initial_km != null ? String(car.initial_km) : "");
      const c = (car as any) || {};
      setCosts({
        ownership_status: c.ownership_status ?? null,
        financing_monthly: c.financing_monthly ?? null,
        rental_weekly: c.rental_weekly ?? null,
        oil_change_cost: c.oil_change_cost ?? null,
        oil_change_interval_km: c.oil_change_interval_km ?? null,
        tires_cost: c.tires_cost ?? null,
        tires_interval_km: c.tires_interval_km ?? null,
        ipva_yearly: c.ipva_yearly ?? null,
        insurance_monthly: c.insurance_monthly ?? null,
        other_monthly_costs: c.other_monthly_costs ?? null,
      });
    }
  }, [open, car]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload: any = {
      brand: brand || null,
      model: model || null,
      plate: plate || null,
      initial_km: parseFloat(initialKm) || 0,
      ...costs,
    };
    if (car) {
      const { error } = await supabase.from("cars").update(payload).eq("id", car.id);
      if (error) { setSaving(false); return toast.error("Erro ao salvar"); }
    } else {
      const isFirst = cars.length === 0;
      const { error } = await supabase.from("cars").insert({
        ...payload, user_id: user.id, is_active: isFirst,
      });
      if (error) { setSaving(false); return toast.error("Erro ao salvar"); }
      await supabase.from("profiles").upsert({ id: user.id, car_onboarded: true });
    }
    await refreshCars();
    setSaving(false);
    onOpenChange(false);
    toast.success(car ? "Carro atualizado!" : "Carro adicionado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{car ? "Editar carro" : "Adicionar carro"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Toyota" />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Corolla" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Placa</Label>
            <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" />
          </div>
          <div className="space-y-2">
            <Label>Quilometragem inicial</Label>
            <Input type="number" inputMode="decimal" value={initialKm}
              onChange={(e) => setInitialKm(e.target.value)} placeholder="Ex: 45000" />
          </div>
          <VehicleCostsSection value={costs} onChange={setCosts} />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
