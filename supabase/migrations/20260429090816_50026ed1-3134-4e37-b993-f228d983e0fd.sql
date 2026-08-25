-- 1. Neue Spalte reference auf beiden Tabellen
ALTER TABLE public.belt_inquiries ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.profile_inquiries ADD COLUMN IF NOT EXISTS reference text;

-- 2. Test-Daten entfernen (vor Unique-Constraint, damit keine NULLs übrig sind)
TRUNCATE TABLE public.belt_inquiries, public.profile_inquiries RESTART IDENTITY;

-- 3. Unique-Constraint
ALTER TABLE public.belt_inquiries ADD CONSTRAINT belt_inquiries_reference_unique UNIQUE (reference);
ALTER TABLE public.profile_inquiries ADD CONSTRAINT profile_inquiries_reference_unique UNIQUE (reference);

-- 4. Generator-Funktion
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
  SELECT COALESCE(MAX(
    CAST(substring(reference FROM length(prefix) + 1) AS int)
  ), 0) + 1
  INTO next_idx
  FROM (
    SELECT reference FROM public.belt_inquiries WHERE reference LIKE prefix || '%'
    UNION ALL
    SELECT reference FROM public.profile_inquiries WHERE reference LIKE prefix || '%'
  ) AS combined;

  RETURN prefix || lpad(next_idx::text, 3, '0');
END;
$$;

-- 5. Trigger-Funktion
CREATE OR REPLACE FUNCTION public.set_inquiry_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := public.generate_inquiry_reference();
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Trigger anhängen
DROP TRIGGER IF EXISTS trg_set_belt_inquiry_reference ON public.belt_inquiries;
CREATE TRIGGER trg_set_belt_inquiry_reference
BEFORE INSERT ON public.belt_inquiries
FOR EACH ROW EXECUTE FUNCTION public.set_inquiry_reference();

DROP TRIGGER IF EXISTS trg_set_profile_inquiry_reference ON public.profile_inquiries;
CREATE TRIGGER trg_set_profile_inquiry_reference
BEFORE INSERT ON public.profile_inquiries
FOR EACH ROW EXECUTE FUNCTION public.set_inquiry_reference();