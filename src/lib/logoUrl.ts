import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "category-logos";
const SIGN_TTL = 60 * 60; // 1 hour
const cache = new Map<string, { url: string; exp: number }>();

/**
 * Extracts the storage path from either a raw path (e.g. "uid/file.png")
 * or a legacy full public URL containing "/category-logos/...".
 */
export function extractLogoPath(stored?: string | null): string | null {
  if (!stored) return null;
  const marker = `/${BUCKET}/`;
  const idx = stored.indexOf(marker);
  if (idx >= 0) return stored.slice(idx + marker.length).split("?")[0];
  // Already a relative path
  if (!stored.startsWith("http")) return stored.replace(/^\/+/, "");
  return null;
}

export async function getSignedLogoUrl(stored?: string | null): Promise<string | null> {
  const path = extractLogoPath(stored);
  if (!path) return null;
  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.exp > now + 30_000) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
  if (error || !data?.signedUrl) {
    // eslint-disable-next-line no-console
    console.error("[logo sign]", error);
    return null;
  }
  cache.set(path, { url: data.signedUrl, exp: now + SIGN_TTL * 1000 });
  return data.signedUrl;
}

/** Hook: resolves a stored logo (path or legacy public URL) into a signed URL. */
export function useSignedLogoUrl(stored?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!stored) { setUrl(null); return; }
    getSignedLogoUrl(stored).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [stored]);
  return url;
}
