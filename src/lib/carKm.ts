import type { Car, Entry, EarningEntry } from "@/types";

/**
 * KM "real" do carro = KM inicial cadastrado + soma dos KM de todos os
 * ganhos (earnings) + ajuste manual de odômetro do carro.
 *
 * O `km_adjustment` é usado quando o motorista anda fora do app e precisa
 * corrigir o acompanhamento sem mexer no histórico de lançamentos.
 */
export function realCurrentKm(car: Car | null | undefined, entries: Entry[]): number {
  if (!car) return 0;
  const initial = Number(car.initial_km || 0);
  const adjustment = Number(car.km_adjustment || 0);
  const driven = entries.reduce((sum, e) => {
    if (e.type !== "earning") return sum;
    return sum + (Number((e as EarningEntry).km) || 0);
  }, 0);
  return initial + driven + adjustment;
}

export interface MaintenanceStatus {
  type: "oleo" | "pneus";
  intervalKm: number;
  lastKm: number;        // KM em que foi feita a última manutenção (ou initial_km se nunca registrada)
  hasLastRegistered: boolean;
  nextKm: number;        // KM em que a próxima manutenção deve ocorrer
  currentKm: number;     // KM real atual do carro
  kmSinceLast: number;
  kmRemaining: number;   // negativo se atrasado
  overdue: boolean;
  /** janela default: 500 km antes do alvo */
  inWarnWindow: boolean;
  /** progresso 0..1+ (ultrapassa 1 quando atrasado) */
  progress: number;
}

const WARN_THRESHOLD_KM = 500;

/**
 * Calcula o status de uma manutenção (óleo OU pneus) a partir do carro
 * ativo, dos lançamentos e do tipo. `lastEntries` é opcional: quando
 * passado, evita refiltrar `entries` várias vezes.
 */
export function computeMaintenanceStatus(
  car: Car | null | undefined,
  entries: Entry[],
  type: "oleo" | "pneus",
): MaintenanceStatus | null {
  if (!car) return null;
  const intervalKm = Number(
    type === "oleo" ? car.oil_change_interval_km : car.tires_interval_km,
  ) || 0;
  if (intervalKm <= 0) return null;

  const currentKm = realCurrentKm(car, entries);

  // Última manutenção registrada para este tipo (entry mais recente)
  const maintEntries = entries
    .filter(
      (e) =>
        e.type === "expense" &&
        e.expense.category === "manutencao" &&
        e.expense.maintenanceType === type,
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  // O KM da última manutenção é o KM do carro NA DATA daquela manutenção.
  // Como não armazenamos o KM por evento, usamos a heurística:
  // KM da última = currentKm - soma dos KMs (earnings) com data > data da última manutenção.
  let lastKm: number;
  let hasLastRegistered = false;
  if (maintEntries.length > 0) {
    hasLastRegistered = true;
    const lastDate = +new Date(maintEntries[0].date);
    const kmAfter = entries.reduce((sum, e) => {
      if (e.type !== "earning") return sum;
      if (+new Date(e.date) <= lastDate) return sum;
      return sum + (Number((e as EarningEntry).km) || 0);
    }, 0);
    lastKm = currentKm - kmAfter;
  } else {
    lastKm = Number(car.initial_km || 0);
  }

  const nextKm = lastKm + intervalKm;
  const kmSinceLast = Math.max(0, currentKm - lastKm);
  const kmRemaining = nextKm - currentKm;
  const overdue = kmRemaining < 0;
  const inWarnWindow = kmRemaining <= WARN_THRESHOLD_KM;
  const progress = intervalKm > 0 ? kmSinceLast / intervalKm : 0;

  return {
    type,
    intervalKm,
    lastKm,
    hasLastRegistered,
    nextKm,
    currentKm,
    kmSinceLast,
    kmRemaining,
    overdue,
    inWarnWindow,
    progress,
  };
}
