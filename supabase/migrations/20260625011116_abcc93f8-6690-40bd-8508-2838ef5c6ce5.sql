ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS week_starts_on smallint NOT NULL DEFAULT 0
  CHECK (week_starts_on IN (0, 1));