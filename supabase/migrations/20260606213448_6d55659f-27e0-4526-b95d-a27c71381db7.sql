-- 1) Update notify_new_user_signup trigger to call notify-new-user with service-role auth from vault.
-- 2) Add WITH CHECK to profiles UPDATE policy as defense-in-depth against entitlement self-grants.
-- 3) Add service_role ALL policy on feedback_reports so admin tooling can manage statuses.

-- Ensure a vault secret holding the service role key exists. Reuse the email queue key when present.
DO $$
DECLARE
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF v_key IS NULL THEN
    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  END IF;
  IF v_key IS NOT NULL THEN
    -- mirror into a stable name used by the trigger
    IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'notify_new_user_service_role_key') THEN
      PERFORM vault.create_secret(v_key, 'notify_new_user_service_role_key');
    END IF;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.notify_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  project_url text := 'https://nlyodajhhmpupzuhinhs.supabase.co';
  v_key text;
begin
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets
    WHERE name = 'notify_new_user_service_role_key' LIMIT 1;

  if v_key is null then
    raise warning 'notify_new_user_signup: missing service role secret in vault';
    return new;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/notify-new-user',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('user_id', new.id::text)
  );
  return new;
exception when others then
  raise warning 'notify_new_user_signup failed: %', sqlerrm;
  return new;
end;
$function$;

-- Defense-in-depth: explicitly prevent entitlement self-grants via UPDATE policy WITH CHECK.
DROP POLICY IF EXISTS "Profiles: owner can update" ON public.profiles;
CREATE POLICY "Profiles: owner can update"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND beta_grandfathered = false
  AND trial_access_granted = (SELECT trial_access_granted FROM public.profiles WHERE id = auth.uid())
);

-- Allow service role to manage feedback reports (admin tooling via service-role client).
DROP POLICY IF EXISTS "Feedback: service role full access" ON public.feedback_reports;
CREATE POLICY "Feedback: service role full access"
ON public.feedback_reports
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');