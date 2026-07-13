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
}

interface TourContextValue {
  activeTour: TourId | null;
  currentStepIndex: number;
  steps: TourStep[];
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
  const seenCacheRef = useRef<Record<string, boolean>>({});
  const actionAdvanceLockRef = useRef<string | null>(null);

  useEffect(() => {
    actionAdvanceLockRef.current = null;
  }, [activeTour, currentStepIndex]);

  // Cache tour_*_seen flags for the current user (avoid re-fetching per start).
  useEffect(() => {
    if (!user) {
      seenCacheRef.current = {};
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from("profiles") as any)
        .select(
          "tour_entries_seen, tour_earnings_seen, tour_expenses_seen, tour_history_seen, tour_planning_seen, tour_personalize_seen, tour_export_seen",
        )
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      seenCacheRef.current = {
        tour_entries_seen: Boolean(data.tour_entries_seen),
        tour_earnings_seen: Boolean(data.tour_earnings_seen),
        tour_expenses_seen: Boolean(data.tour_expenses_seen),
        tour_history_seen: Boolean(data.tour_history_seen),
        tour_planning_seen: Boolean(data.tour_planning_seen),
        tour_personalize_seen: Boolean(data.tour_personalize_seen),
        tour_export_seen: Boolean(data.tour_export_seen),
      };
    })();
    return () => { cancelled = true; };
  }, [user]);

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
    setActiveTour(null);
    setSteps([]);
    setCurrentStepIndex(0);
    void markSeen(id);
  }, [activeTour, markSeen]);

  const next = useCallback(() => {
    if (!activeTour) return;
    setCurrentStepIndex((i) => {
      if (i + 1 >= steps.length) {
        // último passo → finaliza (usa timeout pra evitar setState em cascata).
        setTimeout(() => finish(), 0);
        return i;
      }
      return i + 1;
    });
  }, [activeTour, steps.length, finish]);

  const prev = useCallback(() => {
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  }, []);

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
      // Avança com folga pra dar respiro visual e tempo do DOM da próxima etapa aparecer.
      setTimeout(() => next(), 350);
    },
    [activeTour, steps, currentStepIndex, next],
  );

  const value = useMemo<TourContextValue>(
    () => ({ activeTour, currentStepIndex, steps, startTour, next, prev, skip, finish, notifyAction }),
    [activeTour, currentStepIndex, steps, startTour, next, prev, skip, finish, notifyAction],
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
