ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS fuel_consumption_kml numeric,
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS fuel_price numeric,
  ADD COLUMN IF NOT EXISTS food_avg_per_day numeric;

ALTER TABLE public.cars
  ADD CONSTRAINT cars_fuel_type_chk
  CHECK (fuel_type IS NULL OR fuel_type IN ('gasolina','etanol','diesel','gnv','flex'));