ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS costs_onboarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS planning_onboarded boolean NOT NULL DEFAULT false;