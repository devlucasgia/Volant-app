
DO $$
DECLARE
  target_ids uuid[] := ARRAY[
    '115178fe-fd49-40ba-a381-7ed3faf94500','ae3a9cf2-7413-4e99-ae96-3ec2b390ccaf',
    '61b44229-9921-466c-b083-f5a923af75c0','dd9cdac8-00ed-43e8-930b-e7ad8e0904fc',
    'f4f46077-cb14-4f6f-b965-b912b64ac49f','2aeabb55-40fc-4938-8e51-3c060b869dc3',
    '55ea0234-6448-4a9e-860f-647b4ddac3ea','97ff459b-bc49-438d-9eee-c682dc8a6626',
    'c2fa7a96-1a30-4531-865d-a706816e9b53','3b9ff63e-8f4b-48a1-a278-43aee7290bbe',
    '604b4212-d99b-40e2-a256-35ad06bbbd80','d61d5f40-67c9-45a9-87c7-f1a7263e1e6c',
    '54590a3d-09f6-40e2-ab77-26f551052f54','29c7729f-e2c6-4962-b6ba-cba8bec7e8dc',
    '39121a40-042c-4ea0-911c-48d8bcb387f1'
  ]::uuid[];
  target_emails text[];
BEGIN
  SELECT array_agg(email) INTO target_emails FROM auth.users WHERE id = ANY(target_ids);

  DELETE FROM public.feedback_reports         WHERE user_id = ANY(target_ids);
  DELETE FROM public.maintenance_alerts_sent  WHERE user_id = ANY(target_ids);
  DELETE FROM public.trial_email_log          WHERE user_id = ANY(target_ids);
  DELETE FROM public.signup_notifications     WHERE user_id = ANY(target_ids);
  DELETE FROM public.entries                  WHERE user_id = ANY(target_ids);
  DELETE FROM public.categories               WHERE user_id = ANY(target_ids);
  DELETE FROM public.cars                     WHERE user_id = ANY(target_ids);
  DELETE FROM public.user_settings            WHERE user_id = ANY(target_ids);
  DELETE FROM public.user_roles               WHERE user_id = ANY(target_ids);
  DELETE FROM public.subscriptions            WHERE user_id = ANY(target_ids);

  IF target_emails IS NOT NULL THEN
    DELETE FROM public.email_send_log           WHERE recipient_email = ANY(target_emails);
    DELETE FROM public.email_unsubscribe_tokens WHERE email = ANY(target_emails);
    DELETE FROM public.suppressed_emails        WHERE email = ANY(target_emails);
  END IF;

  DELETE FROM public.profiles                 WHERE id = ANY(target_ids);
  DELETE FROM auth.users                      WHERE id = ANY(target_ids);
END $$;
