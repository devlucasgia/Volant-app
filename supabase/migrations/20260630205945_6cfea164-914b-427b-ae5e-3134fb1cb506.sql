ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS planning_original_fixed_applied numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planning_original_fixed_items   jsonb   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_fixed_applied         numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_fixed_items           jsonb   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_plan_cost_fields           jsonb   DEFAULT NULL;