ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS planning_original_goal       numeric     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planning_original_goal_type  text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planning_original_avg_km     numeric     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planning_original_dates      jsonb       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planning_original_created_at timestamptz DEFAULT NULL;