ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fs_history_visited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_earnings_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_expenses_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_history_seen boolean NOT NULL DEFAULT false;