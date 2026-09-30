import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Liefert die (öffentliche) GA4-Measurement-ID an den Browser.
Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const id = Deno.env.get('GOOGLE_ANALYTICS_MEASUREMENT_ID') ?? '';
  const valid = /^G-[A-Z0-9]+$/i.test(id.trim());
  return new Response(JSON.stringify({ measurementId: valid ? id.trim() : null }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
});
