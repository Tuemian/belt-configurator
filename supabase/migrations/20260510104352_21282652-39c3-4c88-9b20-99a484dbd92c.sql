
CREATE POLICY "No public insert on belt_inquiries" ON public.belt_inquiries FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No public update on belt_inquiries" ON public.belt_inquiries FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "No public delete on belt_inquiries" ON public.belt_inquiries FOR DELETE TO anon, authenticated USING (false);

CREATE POLICY "No public insert on profile_inquiries" ON public.profile_inquiries FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No public update on profile_inquiries" ON public.profile_inquiries FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "No public delete on profile_inquiries" ON public.profile_inquiries FOR DELETE TO anon, authenticated USING (false);

CREATE POLICY "No public insert on configurator_references" ON public.configurator_references FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No public update on configurator_references" ON public.configurator_references FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY "No public delete on configurator_references" ON public.configurator_references FOR DELETE TO anon, authenticated USING (false);
