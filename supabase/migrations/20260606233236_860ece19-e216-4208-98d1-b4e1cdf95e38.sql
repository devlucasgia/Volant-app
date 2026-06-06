
-- 1. Roles & admin whitelist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_self_select" ON public.user_roles;
CREATE POLICY "user_roles_self_select" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2. Maintenance alerts dedup
CREATE TABLE IF NOT EXISTS public.maintenance_alerts_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  milestone_km numeric NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, car_id, alert_type, milestone_km)
);

GRANT ALL ON public.maintenance_alerts_sent TO service_role;
ALTER TABLE public.maintenance_alerts_sent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maint_alerts_owner_select" ON public.maintenance_alerts_sent;
CREATE POLICY "maint_alerts_owner_select" ON public.maintenance_alerts_sent
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. Schedule weekly summary and daily maintenance checks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove jobs antigos com mesmos nomes (idempotente)
DO $$ BEGIN
  PERFORM cron.unschedule('volant-weekly-summary');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('volant-daily-maintenance-check');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'volant-weekly-summary',
  '0 11 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://nlyodajhhmpupzuhinhs.supabase.co/functions/v1/send-weekly-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_new_user_service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);

SELECT cron.schedule(
  'volant-daily-maintenance-check',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nlyodajhhmpupzuhinhs.supabase.co/functions/v1/check-maintenance-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_new_user_service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);
