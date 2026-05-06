
CREATE TABLE public.configurator_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  tool text NOT NULL CHECK (tool IN ('belt','profile')),
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  lang text NOT NULL DEFAULT 'de',
  pdf_downloaded_at timestamptz,
  inquiry_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configurator_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public read on configurator_references"
ON public.configurator_references FOR SELECT
USING (false);

CREATE INDEX idx_configurator_references_reference ON public.configurator_references(reference);
CREATE INDEX idx_configurator_references_created_at ON public.configurator_references(created_at DESC);

CREATE OR REPLACE FUNCTION public.reserve_configurator_reference(
  _tool text,
  _config jsonb,
  _lang text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  day_str text := to_char(now() AT TIME ZONE 'Europe/Zurich', 'YYYYMMDD');
  prefix text := 'FT-' || day_str || '-';
  next_idx int;
  new_ref text;
BEGIN
  IF _tool NOT IN ('belt','profile') THEN
    RAISE EXCEPTION 'invalid tool: %', _tool;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('configurator_ref:' || day_str));

  SELECT COALESCE(MAX(CAST(substring(reference FROM length(prefix) + 1) AS int)), 0) + 1
  INTO next_idx
  FROM (
    SELECT reference FROM public.belt_inquiries WHERE reference LIKE prefix || '%'
    UNION ALL
    SELECT reference FROM public.profile_inquiries WHERE reference LIKE prefix || '%'
    UNION ALL
    SELECT reference FROM public.configurator_references WHERE reference LIKE prefix || '%'
  ) AS combined;

  new_ref := prefix || lpad(next_idx::text, 3, '0');

  INSERT INTO public.configurator_references (reference, tool, configuration, lang)
  VALUES (new_ref, _tool, COALESCE(_config, '{}'::jsonb), COALESCE(_lang, 'de'));

  RETURN new_ref;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_configurator_reference(
  _reference text,
  _action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _action = 'pdf' THEN
    UPDATE public.configurator_references
    SET pdf_downloaded_at = COALESCE(pdf_downloaded_at, now())
    WHERE reference = _reference;
  ELSIF _action = 'inquiry' THEN
    UPDATE public.configurator_references
    SET inquiry_sent_at = COALESCE(inquiry_sent_at, now())
    WHERE reference = _reference;
  ELSE
    RAISE EXCEPTION 'invalid action: %', _action;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_inquiry_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  day_str text := to_char(now() AT TIME ZONE 'Europe/Zurich', 'YYYYMMDD');
  prefix text := 'FT-' || day_str || '-';
  next_idx int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('configurator_ref:' || day_str));

  SELECT COALESCE(MAX(CAST(substring(reference FROM length(prefix) + 1) AS int)), 0) + 1
  INTO next_idx
  FROM (
    SELECT reference FROM public.belt_inquiries WHERE reference LIKE prefix || '%'
    UNION ALL
    SELECT reference FROM public.profile_inquiries WHERE reference LIKE prefix || '%'
    UNION ALL
    SELECT reference FROM public.configurator_references WHERE reference LIKE prefix || '%'
  ) AS combined;

  RETURN prefix || lpad(next_idx::text, 3, '0');
END;
$$;
