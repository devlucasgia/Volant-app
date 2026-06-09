import { useEffect, useRef } from "react";

type StorageKind = "session" | "local";

const getStorage = (kind: StorageKind): Storage | null => {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

/**
 * Persiste um valor (rascunho de formulário) em sessionStorage/localStorage
 * com debounce. Útil para evitar perda de dados em mini-reloads (troca de aba,
 * volta de outro app, etc.).
 *
 * Uso:
 *   const draft = useDraftPersistence(KEY, formState, { enabled: open });
 *   draft.load();   // retorna o rascunho salvo (ou null) — chame na hidratação
 *   draft.clear();  // limpa após submit/cancel
 */
export function useDraftPersistence<T>(
  key: string,
  value: T,
  options: { enabled?: boolean; storage?: StorageKind; debounceMs?: number } = {},
) {
  const { enabled = true, storage = "session", debounceMs = 300 } = options;
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const s = getStorage(storage);
    if (!s) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        s.setItem(key, JSON.stringify(value));
      } catch {
        /* quota/serialize errors — ignorar */
      }
    }, debounceMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [key, value, enabled, storage, debounceMs]);

  const load = (): T | null => {
    const s = getStorage(storage);
    if (!s) return null;
    try {
      const raw = s.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  const clear = () => {
    const s = getStorage(storage);
    if (!s) return;
    try {
      s.removeItem(key);
    } catch {
      /* noop */
    }
  };

  return { load, clear };
}
