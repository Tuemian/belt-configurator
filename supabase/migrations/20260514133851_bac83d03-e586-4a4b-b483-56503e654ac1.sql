
-- Enum für Rollen
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Rollen-Tabelle
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role Security Definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies user_roles: nur Admins sehen/ändern, eigene Rollen darf jeder lesen
CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated-at Trigger Funktion
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Bauteil-Tabelle
CREATE TABLE public.pricing_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool TEXT NOT NULL,
  key TEXT NOT NULL,
  label_de TEXT NOT NULL,
  label_en TEXT NOT NULL,
  label_it TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'per_unit',
  price_eur NUMERIC(12,4),
  active BOOLEAN NOT NULL DEFAULT true,
  article_number TEXT,
  price_source TEXT NOT NULL DEFAULT 'manual',
  erp_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tool, key)
);

CREATE INDEX idx_pricing_components_tool ON public.pricing_components(tool);
CREATE INDEX idx_pricing_components_article ON public.pricing_components(article_number) WHERE article_number IS NOT NULL;

ALTER TABLE public.pricing_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read components" ON public.pricing_components
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anon can read components" ON public.pricing_components
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Admins can insert components" ON public.pricing_components
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update components" ON public.pricing_components
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete components" ON public.pricing_components
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_pricing_components_updated
  BEFORE UPDATE ON public.pricing_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Regeln-Tabelle
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES public.pricing_components(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantity_formula TEXT NOT NULL DEFAULT '1',
  priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_rules_tool ON public.pricing_rules(tool);
CREATE INDEX idx_pricing_rules_component ON public.pricing_rules(component_id);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read rules" ON public.pricing_rules
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anon can read rules" ON public.pricing_rules
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Admins can insert rules" ON public.pricing_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rules" ON public.pricing_rules
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete rules" ON public.pricing_rules
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_pricing_rules_updated
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
