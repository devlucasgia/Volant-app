ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS km_planned_month numeric NULL;