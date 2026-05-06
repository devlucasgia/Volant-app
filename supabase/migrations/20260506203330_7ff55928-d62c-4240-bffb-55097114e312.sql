ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS car_brand text,
  ADD COLUMN IF NOT EXISTS car_model text,
  ADD COLUMN IF NOT EXISTS car_plate text,
  ADD COLUMN IF NOT EXISTS car_initial_km numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS car_onboarded boolean NOT NULL DEFAULT false;