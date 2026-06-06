
-- Ensure shared secret for notify_new_user trigger exists in vault.
-- Creates a random UUID secret if not present. A SECURITY DEFINER RPC
-- exposes the value to the service-role-authenticated edge function only,
-- so the trigger and the edge function can agree on the bearer value
-- without us needing to plumb SUPABASE_SERVICE_ROLE_KEY into postgres.
DO $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'notify_new_user_service_role_key') INTO v_exists;
  IF NOT v_exists THEN
    PERFORM vault.create_secret(gen_random_uuid()::text, 'notify_new_user_service_role_key', 'Shared bearer between notify_new_user trigger and edge function');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_notify_shared_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets
   WHERE name = 'notify_new_user_service_role_key'
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_notify_shared_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_notify_shared_secret() TO service_role;
