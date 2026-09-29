-- belt_inquiries, profile_inquiries und configurator_references hatten bisher nur
-- "No public read ... USING (false)" — das blockiert per RLS ausnahmslos jeden Read,
-- auch den der list_inquiries/list_configurator_references MCP-Agent-Tools (die über
-- supabaseForUser() mit dem publishable Key + Nutzer-Token laufen, nicht dem Service
-- Role Key). Deshalb lieferten diese Tools immer eine leere Liste. Fix: zusätzliche
-- SELECT-Policy nur für Admins (has_role), bestehende Sperre für alle anderen bleibt.

CREATE POLICY "Admins can read belt_inquiries"
  ON public.belt_inquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read profile_inquiries"
  ON public.profile_inquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read configurator_references"
  ON public.configurator_references FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
