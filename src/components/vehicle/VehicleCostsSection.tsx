import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/NumberField";
import { Segmented } from "@/components/Segmented";
import { Wallet, Droplet, CircleDot, Receipt, Fuel, UtensilsCrossed } from "lucide-react";


export type OwnershipStatus = "quitado" | "financiado" | "alugado" | null;

export type FuelType = "gasolina" | "etanol" | "diesel" | "gnv" | "flex" | "eletrico";

export interface VehicleCosts {
  ownership_status: OwnershipStatus;
  financing_monthly: number | null;
  rental_weekly: number | null;
  rental_monthly: number | null;
  oil_change_cost: number | null;
  oil_change_interval_km: number | null;
  tires_cost: number | null;
  tires_interval_km: number | null;
  ipva_yearly: number | null;
  insurance_monthly: number | null;
  other_monthly_costs: number | null;
  fuel_consumption_kml: number | null;
  fuel_type: FuelType | null;
  fuel_price: number | null;
  food_avg_per_day: number | null;
}

export const EMPTY_VEHICLE_COSTS: VehicleCosts = {
  ownership_status: null,
  financing_monthly: null,
  rental_weekly: null,
  rental_monthly: null,
  oil_change_cost: null,
  oil_change_interval_km: null,
  tires_cost: null,
  tires_interval_km: null,
  ipva_yearly: null,
  insurance_monthly: null,
  other_monthly_costs: null,
  fuel_consumption_kml: null,
  fuel_type: null,
  fuel_price: null,
  food_avg_per_day: null,
};

interface Props {
  value: VehicleCosts;
  onChange: (next: VehicleCosts) => void;
  tab: "fixos" | "variaveis";
}

/** Premium block card matching Settings > "Destaque do card principal" pattern. */
function Block({
  icon, title, description, children,
}: {
  icon: React.ReactNode; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-[0_1px_0_0_hsl(var(--border)),0_8px_24px_-20px_rgba(0,0,0,0.45)]">
      <div className="mb-3 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold leading-tight">{title}</div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function VehicleCostsSection({ value, onChange, tab }: Props) {
  const set = <K extends keyof VehicleCosts>(key: K, v: VehicleCosts[K]) =>
    onChange({ ...value, [key]: v });

  // Estado próprio da periodicidade do aluguel (não inferido do valor).
  // Re-deriva sempre que o valor carregado muda (ex.: troca de carro).
  const [rentalPeriod, setRentalPeriod] = useState<"mensal" | "semanal">(
    value.rental_weekly != null && value.rental_weekly > 0 ? "semanal" : "mensal",
  );
  useEffect(() => {
    setRentalPeriod(
      value.rental_weekly != null && value.rental_weekly > 0 ? "semanal" : "mensal",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.rental_weekly, value.rental_monthly]);

  const showFixos = tab === "fixos";
  const showVariaveis = tab === "variaveis";

  return (
    <div className="space-y-3">
      {showFixos && (
        <>
          <Block
            icon={<Wallet className="h-4 w-4" />}
            title="Situação do veículo"
            description="Informe se o carro é quitado, financiado ou alugado."
          >
            <Segmented
              value={(value.ownership_status ?? "") as "" | "quitado" | "financiado" | "alugado"}
              onChange={(v) => set("ownership_status", (v || null) as OwnershipStatus)}
              options={[
                { key: "quitado", label: "Quitado" },
                { key: "financiado", label: "Financiado" },
                { key: "alugado", label: "Alugado" },
              ]}
            />

            {value.ownership_status === "financiado" && (
              <div className="space-y-2 pt-1 animate-fade-in">
                <Label className="text-xs text-muted-foreground">Parcela mensal do financiamento</Label>
                <NumberField currency value={value.financing_monthly}
                  onChange={(v) => set("financing_monthly", v)} />
              </div>
            )}

            {value.ownership_status === "alugado" && (
              <div className="space-y-2 pt-1 animate-fade-in">
                <Label className="text-xs text-muted-foreground">Periodicidade do aluguel</Label>
                <Segmented
                  value={rentalPeriod}
                  onChange={(v) => {
                    const next = v as "mensal" | "semanal";
                    setRentalPeriod(next);
                    if (next === "mensal") onChange({ ...value, rental_weekly: null });
                    else onChange({ ...value, rental_monthly: null });
                  }}
                  options={[
                    { key: "mensal", label: "Mensal" },
                    { key: "semanal", label: "Semanal" },
                  ]}
                />
                {rentalPeriod === "mensal" ? (
                  <>
                    <Label className="text-xs text-muted-foreground">Aluguel mensal</Label>
                    <NumberField currency value={value.rental_monthly}
                      onChange={(v) => set("rental_monthly", v)} />
                  </>
                ) : (
                  <>
                    <Label className="text-xs text-muted-foreground">Aluguel semanal</Label>
                    <NumberField currency value={value.rental_weekly}
                      onChange={(v) => set("rental_weekly", v)} />
                  </>
                )}
                <p className="text-[11px] leading-snug text-muted-foreground/80">
                  Use só uma das opções. A outra é zerada automaticamente para evitar duplicidade no cálculo.
                </p>
              </div>
            )}
          </Block>

          <Block
            icon={<Droplet className="h-4 w-4" />}
            title="Óleo"
            description="Informe o valor médio da troca e a quilometragem entre trocas."
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Valor da troca</Label>
                <NumberField currency value={value.oil_change_cost}
                  onChange={(v) => set("oil_change_cost", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Intervalo (km)</Label>
                <NumberField value={value.oil_change_interval_km}
                  onChange={(v) => set("oil_change_interval_km", v)} placeholder="Ex: 10000" />
              </div>
            </div>
          </Block>

          <Block
            icon={<CircleDot className="h-4 w-4" />}
            title="Pneus"
            description="Informe o custo médio e a durabilidade estimada dos pneus."
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Valor médio da troca</Label>
                <NumberField currency value={value.tires_cost}
                  onChange={(v) => set("tires_cost", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Intervalo (km)</Label>
                <NumberField value={value.tires_interval_km}
                  onChange={(v) => set("tires_interval_km", v)} placeholder="Ex: 40000" />
              </div>
            </div>
          </Block>

          <Block
            icon={<Receipt className="h-4 w-4" />}
            title="Custos fixos"
            description="Preencha apenas os custos que quiser considerar no Volant."
          >
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">IPVA anual</Label>
              <NumberField currency value={value.ipva_yearly}
                onChange={(v) => set("ipva_yearly", v)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Seguro mensal</Label>
              <NumberField currency value={value.insurance_monthly}
                onChange={(v) => set("insurance_monthly", v)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Outros custos mensais</Label>
              <NumberField currency value={value.other_monthly_costs}
                onChange={(v) => set("other_monthly_costs", v)} />
            </div>
          </Block>
        </>
      )}

      {showVariaveis && (
        <>
          {(() => {
            const isElectric = value.fuel_type === "eletrico";
            return (
              <Block
                icon={<Fuel className="h-4 w-4" />}
                title={isElectric ? "Energia" : "Combustível"}
                description={
                  isElectric
                    ? "Consumo médio do veículo elétrico e preço médio do kWh."
                    : "Consumo médio do veículo, tipo de combustível e preço médio do litro."
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {isElectric ? "Consumo (km/kWh)" : "Consumo (km/L)"}
                    </Label>
                    <NumberField
                      value={value.fuel_consumption_kml}
                      onChange={(v) => set("fuel_consumption_kml", v)}
                      placeholder={isElectric ? "Ex: 6.5" : "Ex: 8.0"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {isElectric ? "Preço do kWh" : "Preço do litro"}
                    </Label>
                    <NumberField
                      currency
                      value={value.fuel_price}
                      onChange={(v) => set("fuel_price", v)}
                      placeholder={isElectric ? "Ex: 0,95" : "Ex: 3,89"}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tipo de energia</Label>
                  <Segmented
                    value={(value.fuel_type ?? "") as "" | FuelType}
                    onChange={(v) => set("fuel_type", (v || null) as FuelType | null)}
                    size="xs"
                    options={[
                      { key: "gasolina", label: "Gasolina" },
                      { key: "etanol", label: "Etanol" },
                      { key: "diesel", label: "Diesel" },
                      { key: "gnv", label: "GNV" },
                      { key: "flex", label: "Flex" },
                      { key: "eletrico", label: "Elétrico" },
                    ]}
                  />
                </div>
              </Block>
            );
          })()}

          <Block
            icon={<UtensilsCrossed className="h-4 w-4" />}
            title="Alimentação"
            description="Quanto você gasta em média por dia trabalhado."
          >
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Gasto médio por dia</Label>
              <NumberField currency value={value.food_avg_per_day}
                onChange={(v) => set("food_avg_per_day", v)} placeholder="Ex: 30,00" />
            </div>
          </Block>
        </>
      )}
    </div>
  );
}
