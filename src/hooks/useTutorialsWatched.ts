import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Lê/grava a coluna `profiles.tutorials_watched` (jsonb array de ids).
 * Atualização otimista, idempotente, resiliente a null/legado.
 */
export function useTutorialsWatched() {
  const { user } = useAuth();
  const [watched, setWatched] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setWatched([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await (supabase.from("profiles") as any)
        .select("tutorials_watched")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setWatched([]);
      } else {
        const raw = (data?.tutorials_watched ?? []) as unknown;
        setWatched(Array.isArray(raw) ? (raw as string[]) : []);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isWatched = useCallback(
    (id: string) => watched.includes(id),
    [watched],
  );

  const markWatched = useCallback(
    async (id: string) => {
      if (!user) return;
      if (watched.includes(id)) return;
      const next = [...watched, id];
      setWatched(next); // otimista
      const { error } = await (supabase.from("profiles") as any)
        .update({ tutorials_watched: next })
        .eq("id", user.id);
      if (error) {
        // reverte em caso de erro real
        setWatched((prev) => prev.filter((x) => x !== id));
      }
    },
    [user, watched],
  );

  return { watched, isWatched, markWatched, loading };
}
