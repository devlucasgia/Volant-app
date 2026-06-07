
DROP POLICY IF EXISTS "Profiles: owner can update" ON public.profiles;

CREATE POLICY "Profiles: owner can update"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND beta_grandfathered = false
  AND trial_access_granted = (SELECT p.trial_access_granted FROM public.profiles p WHERE p.id = auth.uid())
  AND trial_started_at IS NOT DISTINCT FROM (SELECT p.trial_started_at FROM public.profiles p WHERE p.id = auth.uid())
  AND trial_ends_at IS NOT DISTINCT FROM (SELECT p.trial_ends_at FROM public.profiles p WHERE p.id = auth.uid())
);
