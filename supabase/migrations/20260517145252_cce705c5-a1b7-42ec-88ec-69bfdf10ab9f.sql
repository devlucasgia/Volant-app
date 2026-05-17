revoke execute on function public.has_premium_access(uuid, text) from public, anon;
grant execute on function public.has_premium_access(uuid, text) to authenticated, service_role;