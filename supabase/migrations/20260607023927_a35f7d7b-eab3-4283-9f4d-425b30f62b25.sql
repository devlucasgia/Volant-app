
-- 1. Replace overly-strict profiles UPDATE policy.
-- The profiles_block_privilege_escalation_trg BEFORE UPDATE trigger already
-- rejects any change to beta_grandfathered / trial_* from non service_role.
-- The previous WITH CHECK hardcoded beta_grandfathered = false, which would
-- block legitimate grandfathered users from updating any profile field.
DROP POLICY IF EXISTS "Profiles: owner can update" ON public.profiles;
CREATE POLICY "Profiles: owner can update"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Allow users to manage screenshots inside their own folder.
CREATE POLICY "Feedback screenshots: users update own folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'feedback-screenshots'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'feedback-screenshots'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Feedback screenshots: users delete own folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'feedback-screenshots'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
