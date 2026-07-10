import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { computeFirstSteps, firstStepsProgress, type FirstStepTask } from "@/lib/firstSteps";

interface FsProfile {
  fs_personalized: boolean;
  fs_exported: boolean;
  fs_all_done_at: string | null;
}

export interface UseFirstStepsResult {
  tasks: FirstStepTask[];
  done: number;
  total: number;
  allDone: boolean;
  loading: boolean;
  markPersonalized: () => Promise<void>;
  markExported: () => Promise<void>;
}

/**
 * Central hook for the "Primeiros Passos" strip and sheet.
 * Reads flags directly from `profiles` (no global profile store), combines
 * them with `settings.planningStatus` and `entries`, and exposes idempotent
 * markers that update the DB only when the flag is still false.
 */
export function useFirstSteps(): UseFirstStepsResult {
  const { user } = useAuth();
  const { entries, settings } = useData();
  const [profile, setProfile] = useState<FsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const allDoneWrittenRef = useRef(false);

  // Fetch flags (reusable).
  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await (supabase.from("profiles") as any)
      .select("fs_personalized, fs_exported, fs_all_done_at")
      .eq("id", user.id)
      .maybeSingle();
    setProfile({
      fs_personalized: Boolean((data as any)?.fs_personalized),
      fs_exported: Boolean((data as any)?.fs_exported),
      fs_all_done_at: ((data as any)?.fs_all_done_at ?? null) as string | null,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);

  // Sync across hook instances (Dashboard, Reports, OrganizacaoCards, Settings).
  useEffect(() => {
    const handler = () => { refetch(); };
    window.addEventListener("volant:first-steps-changed", handler);
    return () => window.removeEventListener("volant:first-steps-changed", handler);
  }, [refetch]);

  const tasks = computeFirstSteps({
    planningStatus: settings.planningStatus,
    entries,
    fsPersonalized: profile?.fs_personalized ?? false,
    fsExported: profile?.fs_exported ?? false,
  });
  const { done, total, allDone } = firstStepsProgress(tasks);

  // Persist the "all done" timestamp once.
  useEffect(() => {
    if (!user || !profile) return;
    if (!allDone) return;
    if (profile.fs_all_done_at) return;
    if (allDoneWrittenRef.current) return;
    allDoneWrittenRef.current = true;
    (async () => {
      const nowIso = new Date().toISOString();
      const { error } = await (supabase.from("profiles") as any)
        .update({ fs_all_done_at: nowIso })
        .eq("id", user.id);
      if (!error) {
        setProfile((p) => (p ? { ...p, fs_all_done_at: nowIso } : p));
      }
    })();
  }, [allDone, profile, user]);

  const markPersonalized = useCallback(async () => {
    if (!user || !profile) return;
    if (profile.fs_personalized) return;
    const { error } = await (supabase.from("profiles") as any)
      .update({ fs_personalized: true })
      .eq("id", user.id);
    if (!error) {
      setProfile((p) => (p ? { ...p, fs_personalized: true } : p));
    }
  }, [user, profile]);

  const markExported = useCallback(async () => {
    if (!user || !profile) return;
    if (profile.fs_exported) return;
    const { error } = await (supabase.from("profiles") as any)
      .update({ fs_exported: true })
      .eq("id", user.id);
    if (!error) {
      setProfile((p) => (p ? { ...p, fs_exported: true } : p));
    }
  }, [user, profile]);

  return { tasks, done, total, allDone, loading, markPersonalized, markExported };
}
