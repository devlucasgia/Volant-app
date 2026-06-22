ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS group_id uuid;
CREATE INDEX IF NOT EXISTS entries_group_id_idx ON public.entries (group_id);