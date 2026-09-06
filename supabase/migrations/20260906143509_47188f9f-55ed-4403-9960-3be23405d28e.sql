CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow signed-in callers to check their own roles. Internal callers
  -- (RLS policies, service_role, postgres) always pass auth.uid() or run
  -- without a JWT, so this does not change existing behaviour.
  IF current_user IN ('anon', 'authenticated')
     AND (auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid()) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reserve_configurator_reference(text, jsonb, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_configurator_reference(text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_inquiry_reference() FROM anon, authenticated;