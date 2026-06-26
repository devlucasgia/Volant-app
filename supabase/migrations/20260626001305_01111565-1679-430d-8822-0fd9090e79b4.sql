ALTER TABLE public.user_settings ALTER COLUMN week_starts_on SET DEFAULT 1;
UPDATE public.user_settings SET week_starts_on = 1 WHERE week_starts_on = 0;