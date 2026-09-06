CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- pricing_components
DROP POLICY IF EXISTS "Admins can read components" ON public.pricing_components;
DROP POLICY IF EXISTS "Admins can insert components" ON public.pricing_components;
DROP POLICY IF EXISTS "Admins can update components" ON public.pricing_components;
DROP POLICY IF EXISTS "Admins can delete components" ON public.pricing_components;
CREATE POLICY "Admins can read components" ON public.pricing_components FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert components" ON public.pricing_components FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update components" ON public.pricing_components FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete components" ON public.pricing_components FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- pricing_rules
DROP POLICY IF EXISTS "Admins can read rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Admins can insert rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Admins can update rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Admins can delete rules" ON public.pricing_rules;
CREATE POLICY "Admins can read rules" ON public.pricing_rules FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert rules" ON public.pricing_rules FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update rules" ON public.pricing_rules FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete rules" ON public.pricing_rules FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- hole_types admin write via private helper
DROP POLICY IF EXISTS hole_types_admin_write ON public.hole_types;
CREATE POLICY hole_types_admin_write ON public.hole_types FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- No longer callable through the API
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;