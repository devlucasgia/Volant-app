ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tour_entries_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_planning_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_personalize_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_export_seen boolean NOT NULL DEFAULT false;