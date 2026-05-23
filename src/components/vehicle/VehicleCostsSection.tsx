import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/NumberField";
import { Segmented } from "@/components/Segmented";

export type OwnershipStatus = "quitado" | "financiado" | "alugado" | null;

export interface VehicleCosts {
  ownership_status: OwnershipStatus;
  financing_monthly: number | null;
  rental_weekly: number | null;
  oil_change_cost: number | null;
  oil_change_interval_km: number | null;
  tires_cost: number | null;
  tires_interval_km: number | null;
  ipva_yearly: number | null;
  insurance_monthly: number | null;
  other_monthly_costs: number | null;
}

export const EMPTY_VEHICLE_COSTS: VehicleCosts = {
  ownership_status: null,
  financing_monthly: null,
  rental_weekly: null,
  oil_change_cost: null,
  oil_change_interval_km: null,
  tires_cost: null,
  tires_interval_km: null,
  ipva_yearly: null,
  insurance_monthly: null,
  other_monthly_costs: null,
};

interface Props {
  value: VehicleCosts;
  onChange: (next: VehicleCosts) => void;
}

export function VehicleCostsSection({ value, onChange }: Props) {
  const set = <K extends keyof VehicleCosts>(key: K, v: VehicleCosts[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Custos do veículo</h3>
        <p className="text-xs text-muted-foreground">
          Preencha apenas o que quiser considerar nos cálculos futuros do Volant.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Situação do veículo</Label>
        <Segmented
          value={(value.ownership_status ?? "") as "" | "quitado" | "financiado" | "alugado"}
          onChange={(v) => set("ownership_status", (v || null) as OwnershipStatus)}
          options={[
            { key: "quitado", label: "Quitado" },
            { key: "financiado", label: "Financiado" },
            { key: "alugado", label: "Alugado" },
          ]}
        />
      </div>

      {value.ownership_status === "financiado" && (
        <div className="space-y-2">
          <Label>Parcela mensal do financiamento</Label>
          <NumberField currency value={value.financing_monthly}
            onChange={(v) => set("financing_monthly", v)} />
        </div>
      )}

      {value.ownership_status === "alugado" && (
        <div className="space-y-2">
          <Label>Aluguel semanal</Label>
          <NumberField currency value={value.rental_weekly}
            onChange={(v) => set("rental_weekly", v)} />
        </div>
      )}

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Óleo</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Valor da troca</Label>
            <NumberField currency value={value.oil_change_cost}
              onChange={(v) => set("oil_change_cost", v)} />
          </div>
          <div className="space-y-2">
            <Label>Intervalo (km)</Label>
            <NumberField value={value.oil_change_interval_km}
              onChange={(v) => set("oil_change_interval_km", v)} placeholder="Ex: 10000" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pneus</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Valor médio da troca</Label>
            <NumberField currency value={value.tires_cost}
              onChange={(v) => set("tires_cost", v)} />
          </div>
          <div className="space-y-2">
            <Label>Intervalo (km)</Label>
            <NumberField value={value.tires_interval_km}
              onChange={(v) => set("tires_interval_km", v)} placeholder="Ex: 40000" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Impostos e custos fixos</div>
        <div className="space-y-2">
          <Label>IPVA anual</Label>
          <NumberField currency value={value.ipva_yearly}
            onChange={(v) => set("ipva_yearly", v)} />
        </div>
        <div className="space-y-2">
          <Label>Seguro mensal</Label>
          <NumberField currency value={value.insurance_monthly}
            onChange={(v) => set("insurance_monthly", v)} />
        </div>
        <div className="space-y-2">
          <Label>Outros custos mensais</Label>
          <NumberField currency value={value.other_monthly_costs}
            onChange={(v) => set("other_monthly_costs", v)} />
        </div>
      </div>
    </div>
  );
}
