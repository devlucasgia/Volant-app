ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fs_personalized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fs_exported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fs_all_done_at timestamptz;