
-- 1) Protect privileged columns on profiles via a trigger.
-- Only service_role (used by trusted edge functions) can modify
-- beta_grandfathered / trial_access_granted / trial_started_at / trial_ends_at.
CREATE OR REPLACE FUNCTION public.profiles_block_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.beta_grandfathered IS DISTINCT FROM OLD.beta_grandfathered
     OR NEW.trial_access_granted IS DISTINCT FROM OLD.trial_access_granted
     OR NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'not authorized to modify entitlement columns'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER profiles_block_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_block_privilege_escalation();

-- 2) Add explicit service_role policy to signup_notifications
--    (RLS is enabled but had no policies; only triggers/service role write).
CREATE POLICY "signup_notifications: service role full access"
ON public.signup_notifications
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
