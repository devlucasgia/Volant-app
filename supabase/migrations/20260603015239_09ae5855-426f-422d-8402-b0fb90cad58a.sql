ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS planning_avg_km_per_day numeric NULL;