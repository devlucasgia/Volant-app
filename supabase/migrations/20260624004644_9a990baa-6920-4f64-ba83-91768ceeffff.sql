ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS next_plan_goal         numeric     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_goal_type    text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_avg_km       numeric     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_dates        jsonb       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_created_at   timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_activated_at timestamptz DEFAULT NULL;