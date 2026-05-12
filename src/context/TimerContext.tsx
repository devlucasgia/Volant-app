import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

type State = "idle" | "running" | "resting" | "ended";

interface Persisted {
  state: State;
  // accumulated milliseconds in each bucket up to last transition
  workMs: number;
  restMs: number;
  // timestamp of the current segment start (ms epoch)
  segmentStart: number | null;
}

const KEY = "volant_timer_v1";
const DEFAULT: Persisted = { state: "idle", workMs: 0, restMs: 0, segmentStart: null };

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { return DEFAULT; }
}

interface TimerCtx {
  state: State;
  workMs: number;
  restMs: number;
  start: () => void;
  pauseRest: () => void;
  resumeWork: () => void;
  endJourney: () => { workMs: number; restMs: number };
  reset: () => void;
}

const Ctx = createContext<TimerCtx | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Persisted>(() => load());
  const [, force] = useState(0);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(data)); }, [data]);

  // tick to refresh derived values only while actively counting
  useEffect(() => {
    if (data.state !== "running" && data.state !== "resting") return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [data.state]);

  const now = Date.now();
  const workMs = data.workMs + (data.state === "running" && data.segmentStart ? now - data.segmentStart : 0);
  const restMs = data.restMs + (data.state === "resting" && data.segmentStart ? now - data.segmentStart : 0);

  const start = useCallback(() => {
    setData((d) => {
      // From "ended" we don't resume — caller should reset() first.
      if (d.state === "running" || d.state === "ended") return d;
      const addRest = d.state === "resting" && d.segmentStart ? Date.now() - d.segmentStart : 0;
      return { ...d, state: "running", restMs: d.restMs + addRest, segmentStart: Date.now() };
    });
  }, []);

  const pauseRest = useCallback(() => {
    setData((d) => {
      if (d.state !== "running") return d;
      const addWork = d.segmentStart ? Date.now() - d.segmentStart : 0;
      return { ...d, state: "resting", workMs: d.workMs + addWork, segmentStart: Date.now() };
    });
  }, []);

  const resumeWork = useCallback(() => {
    setData((d) => {
      if (d.state !== "resting") return d;
      const addRest = d.segmentStart ? Date.now() - d.segmentStart : 0;
      return { ...d, state: "running", restMs: d.restMs + addRest, segmentStart: Date.now() };
    });
  }, []);

  const endJourney = useCallback(() => {
    let finalWork = 0;
    let finalRest = 0;
    setData((d) => {
      if (d.state === "idle" || d.state === "ended") {
        finalWork = d.workMs; finalRest = d.restMs;
        return d;
      }
      const elapsed = d.segmentStart ? Date.now() - d.segmentStart : 0;
      const addWork = d.state === "running" ? elapsed : 0;
      const addRest = d.state === "resting" ? elapsed : 0;
      finalWork = d.workMs + addWork;
      finalRest = d.restMs + addRest;
      return { state: "ended", workMs: finalWork, restMs: finalRest, segmentStart: null };
    });
    return { workMs: finalWork, restMs: finalRest };
  }, []);

  const reset = useCallback(() => setData(DEFAULT), []);

  const value = useMemo<TimerCtx>(() => ({
    state: data.state, workMs, restMs, start, pauseRest, resumeWork, endJourney, reset,
  }), [data.state, workMs, restMs, start, pauseRest, resumeWork, endJourney, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTimer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTimer must be inside TimerProvider");
  return c;
}

export function formatHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
