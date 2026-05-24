ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS goal_type text NOT NULL DEFAULT 'bruto' CHECK (goal_type IN ('liquido','bruto')),
  ADD COLUMN IF NOT EXISTS working_days_per_month integer CHECK (working_days_per_month IS NULL OR (working_days_per_month >= 1 AND working_days_per_month <= 31));