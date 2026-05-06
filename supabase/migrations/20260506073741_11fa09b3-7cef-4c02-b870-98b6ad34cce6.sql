
REVOKE ALL ON FUNCTION public.reserve_configurator_reference(text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_configurator_reference(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_inquiry_reference() FROM PUBLIC, anon, authenticated;
