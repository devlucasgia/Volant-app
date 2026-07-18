import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type TourId =
  | "earnings"
  | "expenses"
  | "history"
  | "planning"
  | "personalize"
  | "export"
  | "entries"; // legado — não use em código novo

export interface TourStep {
  /** CSS selector for the element to highlight (typically `[data-tour="..."]`). */
  target: string;
  title: string;
  body: string;
  /** "next" shows a Next/Concluir button; "action" waits for notifyAction(actionId). */
  advance: "next" | "action";
  /** Only used when advance === "action". */
  actionId?: string;
  /** Optional preferred placement (auto if omitted). */
  placement?: "top" | "bottom" | "left" | "right";
  /** Ícone emoji temático no cabeçalho do balão. */
  icon?: string;
  /** Micro-instrução exibida como pílula no balão (passos de ação). */
  hint?: string;
  /** Default true. Quando false, o balão aparece centralizado sem glow/spotlight. */
  spotlight?: boolean;
}


interface TourContextValue {
  activeTour: TourId | null;
  currentStepIndex: number;
  steps: TourStep[];
  validating: boolean;
  startTour: (id: TourId, steps: TourStep[]) => Promise<void>;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
  notifyAction: (actionId: string) => void;
}

const Ctx = createContext<TourContextValue | null>(null);

const flagColumnFor = (id: TourId): string => `tour_${id}_seen`;

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeTour, setActiveTour] = useState<TourId | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [validating, setValidating] = useState(false);
  const seenCacheRef = useRef<Record<string, boolean>>({});
  const actionAdvanceLockRef = useRef<string | null>(null);
  const validateTimerRef = useRef<number | null>(null);
  // Espelha activeTour em ref pra evitar stale closure no startTour (encadeamento
  // ganho→gasto: quando o listener chama startTour("expenses") ~500ms após o
  // finish, o valor do state atual precisa ser lido, não o congelado no fecho).
  const activeTourRef = useRef<TourId | null>(null);
  useEffect(() => { activeTourRef.current = activeTour; }, [activeTour]);


  const clearValidating = useCallback(() => {
    if (validateTimerRef.current) {
      window.clearTimeout(validateTimerRef.current);
      validateTimerRef.current = null;
    }
    setValidating(false);
  }, []);

  useEffect(() => {
    actionAdvanceLockRef.current = null;
  }, [activeTour, currentStepIndex]);

  // Cache tour_*_seen flags for the current user (avoid re-fetching per start).
  const refetchSeenFlags = useCallback(async () => {
    if (!user) {
      seenCacheRef.current = {};
      return;
    }
    const { data } = await (supabase.from("profiles") as any)
      .select(
        "tour_entries_seen, tour_earnings_seen, tour_expenses_seen, tour_history_seen, tour_planning_seen, tour_personalize_seen, tour_export_seen",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (!data) return;
    seenCacheRef.current = {
      tour_entries_seen: Boolean(data.tour_entries_seen),
      tour_earnings_seen: Boolean(data.tour_earnings_seen),
      tour_expenses_seen: Boolean(data.tour_expenses_seen),
      tour_history_seen: Boolean(data.tour_history_seen),
      tour_planning_seen: Boolean(data.tour_planning_seen),
      tour_personalize_seen: Boolean(data.tour_personalize_seen),
      tour_export_seen: Boolean(data.tour_export_seen),
    };
  }, [user]);

  useEffect(() => { void refetchSeenFlags(); }, [refetchSeenFlags]);

  // Reset "Usuário novo" (ou qualquer mudança em Primeiros Passos) dispara
  // este evento — recarrega o cache pra o encadeamento funcionar sem reload.
  useEffect(() => {
    const handler = () => { void refetchSeenFlags(); };
    window.addEventListener("volant:first-steps-changed", handler);
    return () => window.removeEventListener("volant:first-steps-changed", handler);
  }, [refetchSeenFlags]);


  const markSeen = useCallback(
    async (id: TourId) => {
      if (!user) return;
      const col = flagColumnFor(id);
      if (seenCacheRef.current[col]) return;
      seenCacheRef.current[col] = true;
      try {
        await (supabase.from("profiles") as any)
          .update({ [col]: true })
          .eq("id", user.id);
        window.dispatchEvent(new CustomEvent("volant:first-steps-changed"));
      } catch {
        // silent — não trava a UI se o backend recusar.
      }
    },
    [user],
  );

  const startTour = useCallback<TourContextValue["startTour"]>(
    async (id, tourSteps) => {
      if (!user) return;
      if (activeTour) return;
      const col = flagColumnFor(id);
      // Fallback: caso o cache ainda não tenha carregado, consulta uma vez.
      if (seenCacheRef.current[col] === undefined) {
        try {
          const { data } = await (supabase.from("profiles") as any)
            .select(col)
            .eq("id", user.id)
            .maybeSingle();
          seenCacheRef.current[col] = Boolean((data as any)?.[col]);
        } catch {
          seenCacheRef.current[col] = false;
        }
      }
      if (seenCacheRef.current[col]) return;
      if (!tourSteps.length) return;
      setSteps(tourSteps);
      setCurrentStepIndex(0);
      setActiveTour(id);
    },
    [user, activeTour],
  );

  const finish = useCallback(() => {
    if (!activeTour) return;
    const id = activeTour;
    clearValidating();
    setActiveTour(null);
    setSteps([]);
    setCurrentStepIndex(0);
    void markSeen(id);
    // Emite evento pra que a Home encadeie ganho→gasto sem esperar navegação.
    try {
      window.dispatchEvent(new CustomEvent("volant:tour-finished", { detail: { id } }));
    } catch { /* noop */ }
  }, [activeTour, markSeen, clearValidating]);


  const next = useCallback(() => {
    if (!activeTour) return;
    clearValidating();
    setCurrentStepIndex((i) => {
      if (i + 1 >= steps.length) {
        // último passo → finaliza (usa timeout pra evitar setState em cascata).
        setTimeout(() => finish(), 0);
        return i;
      }
      return i + 1;
    });
  }, [activeTour, steps.length, finish, clearValidating]);

  const prev = useCallback(() => {
    clearValidating();
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  }, [clearValidating]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const notifyAction = useCallback(
    (actionId: string) => {
      if (!activeTour) return;
      const step = steps[currentStepIndex];
      if (!step || step.advance !== "action") return;
      if (step.actionId !== actionId) return;
      const lockKey = `${activeTour}:${currentStepIndex}:${actionId}`;
      if (actionAdvanceLockRef.current === lockKey) return;
      actionAdvanceLockRef.current = lockKey;
      // Mostra micro-feedback de validação no balão antes de avançar.
      setValidating(true);
      if (validateTimerRef.current) window.clearTimeout(validateTimerRef.current);
      validateTimerRef.current = window.setTimeout(() => {
        validateTimerRef.current = null;
        setValidating(false);
        next();
      }, 1300);
    },
    [activeTour, steps, currentStepIndex, next],
  );

  const value = useMemo<TourContextValue>(
    () => ({ activeTour, currentStepIndex, steps, validating, startTour, next, prev, skip, finish, notifyAction }),
    [activeTour, currentStepIndex, steps, validating, startTour, next, prev, skip, finish, notifyAction],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTour() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

/** Safe hook — retorna null se não houver provider. Útil pra callers opcionais. */
export function useTourOptional() {
  return useContext(Ctx);
}
