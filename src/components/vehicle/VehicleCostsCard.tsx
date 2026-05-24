import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/context/DataContext";
import { VehicleCostsSection, EMPTY_VEHICLE_COSTS, type VehicleCosts } from "@/components/vehicle/VehicleCostsSection";
import type { Car as CarType } from "@/types";
import { toast } from "sonner";
import { Car as CarIcon } from "lucide-react";

function carLabel(c: CarType) {
  const parts = [c.brand, c.model].filter(Boolean).join(" ");
  return parts || "Carro sem nome";
}

export function VehicleCostsCard() {
  const { cars, activeCar, refreshCars } = useData();
  const [selectedId, setSelectedId] = useState<string>("");
  const [costs, setCosts] = useState<VehicleCosts>(EMPTY_VEHICLE_COSTS);
  const [baseline, setBaseline] = useState<VehicleCosts>(EMPTY_VEHICLE_COSTS);
  const [saving, setSaving] = useState(false);

  // Auto-select active car or the only car available
  useEffect(() => {
    if (selectedId && cars.some((c) => c.id === selectedId)) return;
    const initial = activeCar?.id || (cars.length === 1 ? cars[0].id : "");
    if (initial) setSelectedId(initial);
  }, [cars, activeCar, selectedId]);

  // Load costs from the selected car
  useEffect(() => {
    if (!selectedId) {
      setCosts(EMPTY_VEHICLE_COSTS);
      setBaseline(EMPTY_VEHICLE_COSTS);
      return;
    }
    const c = cars.find((x) => x.id === selectedId) as any;
    if (!c) return;
    const loaded: VehicleCosts = {
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
    };
    setCosts(loaded);
    setBaseline(loaded);
  }, [selectedId, cars]);

  const dirty = useMemo(
    () => JSON.stringify(costs) !== JSON.stringify(baseline),
    [costs, baseline],
  );

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    const { error } = await supabase.from("cars").update(costs as any).eq("id", selectedId);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar os custos");
      return;
    }
    setBaseline(costs);
    await refreshCars();
    toast.success("Custos do veículo salvos");
  };

  if (cars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-5 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CarIcon className="h-5 w-5" />
        </div>
        <div className="text-sm font-medium">Nenhum carro cadastrado</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Cadastre um carro em <span className="font-medium text-foreground">Meus carros</span> para configurar os custos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Carro vinculado</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um carro" />
          </SelectTrigger>
          <SelectContent>
            {cars.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {carLabel(c)}{c.plate ? ` · ${c.plate}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedId && (
        <>
          <VehicleCostsSection value={costs} onChange={setCosts} />
          <Button
            onClick={save}
            disabled={!dirty || saving}
            className="w-full gradient-success text-primary-foreground"
          >
            {saving ? "Salvando..." : "Salvar custos"}
          </Button>
        </>
      )}
    </div>
  );
}
