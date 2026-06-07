
CREATE OR REPLACE FUNCTION public.grant_trial_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trial_access_granted = false AND NEW.beta_grandfathered = false THEN
    NEW.trial_started_at := now();
    NEW.trial_ends_at := now() + interval '7 days';
    NEW.trial_access_granted := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_grant_trial_on_insert ON public.profiles;
CREATE TRIGGER profiles_grant_trial_on_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.grant_trial_on_profile_insert();

-- Backfill via função SECURITY DEFINER que bypassa o trigger de bloqueio
-- (o trigger só libera service_role; migrations rodam como postgres).
DO $$
BEGIN
  ALTER TABLE public.profiles DISABLE TRIGGER USER;
  UPDATE public.profiles
  SET trial_started_at = now(),
      trial_ends_at = now() + interval '7 days',
      trial_access_granted = true
  WHERE trial_access_granted = false
    AND beta_grandfathered = false
    AND trial_started_at IS NULL;
  ALTER TABLE public.profiles ENABLE TRIGGER USER;
END $$;
