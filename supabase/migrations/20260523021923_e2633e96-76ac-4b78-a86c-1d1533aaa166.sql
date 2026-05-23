ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS ownership_status text,
  ADD COLUMN IF NOT EXISTS financing_monthly numeric,
  ADD COLUMN IF NOT EXISTS rental_weekly numeric,
  ADD COLUMN IF NOT EXISTS oil_change_cost numeric,
  ADD COLUMN IF NOT EXISTS oil_change_interval_km numeric,
  ADD COLUMN IF NOT EXISTS tires_cost numeric,
  ADD COLUMN IF NOT EXISTS tires_interval_km numeric,
  ADD COLUMN IF NOT EXISTS ipva_yearly numeric,
  ADD COLUMN IF NOT EXISTS insurance_monthly numeric,
  ADD COLUMN IF NOT EXISTS other_monthly_costs numeric;

ALTER TABLE public.cars
  DROP CONSTRAINT IF EXISTS cars_ownership_status_check;

ALTER TABLE public.cars
  ADD CONSTRAINT cars_ownership_status_check
  CHECK (ownership_status IS NULL OR ownership_status IN ('quitado','financiado','alugado'));