
REVOKE EXECUTE ON FUNCTION public.purge_old_email_send_log() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_email_send_log() TO service_role;
