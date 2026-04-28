
-- Belt conveyor inquiries
CREATE TABLE public.belt_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lang TEXT NOT NULL DEFAULT 'de',
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_text TEXT,
  pdf_filename TEXT
);

ALTER TABLE public.belt_inquiries ENABLE ROW LEVEL SECURITY;

-- Only service role can read; no public access
CREATE POLICY "No public read on belt_inquiries"
  ON public.belt_inquiries FOR SELECT
  USING (false);

-- Profile configurator inquiries
CREATE TABLE public.profile_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lang TEXT NOT NULL DEFAULT 'de',
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_text TEXT,
  pdf_filename TEXT
);

ALTER TABLE public.profile_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public read on profile_inquiries"
  ON public.profile_inquiries FOR SELECT
  USING (false);

CREATE INDEX idx_belt_inquiries_created_at ON public.belt_inquiries(created_at DESC);
CREATE INDEX idx_profile_inquiries_created_at ON public.profile_inquiries(created_at DESC);
