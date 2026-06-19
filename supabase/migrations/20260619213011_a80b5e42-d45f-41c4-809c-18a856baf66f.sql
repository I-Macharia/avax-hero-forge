
-- Make leaderboard run with caller's permissions, not creator's
ALTER VIEW public.leaderboard_view SET (security_invoker = true);

-- handle_new_user is only used by the trigger; revoke direct execute
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies (which run as definer of the policy);
-- revoke direct execution by anon to limit surface area
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
