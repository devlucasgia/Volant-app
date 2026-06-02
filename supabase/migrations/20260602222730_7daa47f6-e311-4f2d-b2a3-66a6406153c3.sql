ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS planning_status text NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS planning_selected_dates jsonb,
  ADD COLUMN IF NOT EXISTS rpk_base numeric;