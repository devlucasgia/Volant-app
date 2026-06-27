import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Segmented } from "@/components/Segmented";
import { supabase } from "@/integrations/supabase/client";
import { useData } from "@/context/DataContext";
import { useAccess } from "@/context/AccessContext";
import { VehicleCostsSection, EMPTY_VEHICLE_COSTS, type VehicleCosts } from "@/components/vehicle/VehicleCostsSection";
import type { Car as CarType } from "@/types";
import { toast } from "sonner";
import { Car as CarIcon, Plus, Info } from "lucide-react";

type Tab = "fixos" | "variaveis";

function carLabel(c: CarType) {
  const parts = [c.brand, c.model].filter(Boolean).join(" ");
  return parts || "Carro sem nome";
}

interface Props {
  onDirtyChange?: (dirty: boolean) => void;
  registerSave?: (fn: (() => Promise<boolean>) | null) => void;
  onSavingChange?: (saving: boolean) => void;
}

export function VehicleCostsCard({ onDirtyChange, registerSave, onSavingChange }: Props = {}) {
  const { cars, activeCar, refreshCars } = useData();
  const navigate = useNavigate();
  const { requirePremium } = useAccess();
  const [selectedId, setSelectedId] = useState<string>("");
  const [costs, setCosts] = useState<VehicleCosts>(EMPTY_VEHICLE_COSTS);
  const [baseline, setBaseline] = useState<VehicleCosts>(EMPTY_VEHICLE_COSTS);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("fixos");

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
      rental_monthly: c.rental_monthly ?? null,
      oil_change_cost: c.oil_change_cost ?? null,
      oil_change_interval_km: c.oil_change_interval_km ?? null,
      tires_cost: c.tires_cost ?? null,
      tires_interval_km: c.tires_interval_km ?? null,
      ipva_yearly: c.ipva_yearly ?? null,
      insurance_monthly: c.insurance_monthly ?? null,
      other_monthly_costs: c.other_monthly_costs ?? null,
      fuel_consumption_kml: c.fuel_consumption_kml ?? null,
      fuel_type: c.fuel_type ?? null,
      fuel_price: c.fuel_price ?? null,
      food_avg_per_day: c.food_avg_per_day ?? null,
    };
    setCosts(loaded);
    setBaseline(loaded);
  }, [selectedId, cars]);

  const dirty = useMemo(
    () => JSON.stringify(costs) !== JSON.stringify(baseline),
    [costs, baseline],
  );

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  const save = async (): Promise<boolean> => {
    if (!selectedId) return false;
    if (!requirePremium()) return false;
    setSaving(true);
    const { error } = await supabase.from("cars").update(costs as any).eq("id", selectedId);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar os custos");
      return false;
    }
    setBaseline(costs);
    await refreshCars();
    toast.success("Custos salvos");
    return true;
  };

  useEffect(() => {
    if (!registerSave) return;
    registerSave(selectedId ? save : null);
    return () => registerSave(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, costs, registerSave]);

  if (cars.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-5 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CarIcon className="h-5 w-5" />
        </div>
        <div className="text-sm font-medium">Nenhum carro cadastrado</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Cadastre seu carro para configurar os custos.
        </p>
        <Button
          size="sm"
          className="mt-3 gradient-success text-primary-foreground"
          onClick={() =>
            navigate("/ajustes/veiculos/carros", {
              state: { returnTo: "/ajustes/veiculos/custos" },
            })
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Cadastrar carro
        </Button>
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
          <Segmented<Tab>
            options={[
              { key: "fixos", label: "Fixos" },
              { key: "variaveis", label: "Variáveis" },
            ]}
            value={tab}
            onChange={setTab}
            size="sm"
            tone="flat"
          />

          <div className="rounded-xl border border-border/60 bg-muted/50 p-3 flex items-start gap-2.5">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-[12px] leading-snug text-muted-foreground">
              {tab === "fixos" ? (
                <>
                  Custos que existem mesmo sem rodar. O{" "}
                  <span className="font-semibold text-foreground">Planejamento Inteligente</span>{" "}
                  usa esses valores como base mensal fixa.
                </>
              ) : (
                <>
                  Isso aqui é só uma referência e não entra na meta. Aparece no{" "}
                  <span className="font-semibold text-foreground">Planejamento Inteligente</span>{" "}
                  como informativo.
                </>
              )}
            </p>
          </div>

          <VehicleCostsSection value={costs} onChange={setCosts} tab={tab} />
        </>
      )}
    </div>
  );
}
