// Konfigurator -> ERP price sync proxy.
// Calls a configured edge function in the ERP Lovable project that returns
// { results: [{ article_number, price_eur }] } for the given article numbers.
//
// Required secrets (set via Lovable):
//   ERP_FUNCTION_URL   - full URL of the ERP edge function (e.g. https://<erp-ref>.supabase.co/functions/v1/get-articles-by-numbers)
//   ERP_SYNC_TOKEN     - shared secret expected by the ERP function in `x-sync-token` header

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  // Auth: require a signed-in admin user.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Missing bearer token' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: 'Invalid session' });

  const { data: isAdmin } = await supabase.rpc('has_role', {
    _user_id: userData.user.id,
    _role: 'admin',
  });
  if (!isAdmin) return json(403, { error: 'Admin role required' });

  // Parse request body.
  let body: { article_numbers?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }); }
  const articleNumbers = Array.isArray(body.article_numbers)
    ? body.article_numbers.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];
  if (articleNumbers.length === 0) return json(400, { error: 'article_numbers must be a non-empty string array' });

  // ERP endpoint configuration.
  const erpUrl = Deno.env.get('ERP_FUNCTION_URL');
  const erpToken = Deno.env.get('ERP_SYNC_TOKEN');
  if (!erpUrl || !erpToken) {
    return json(500, { error: 'ERP not configured: ERP_FUNCTION_URL and ERP_SYNC_TOKEN must be set.' });
  }

  // Forward to ERP.
  let erpResp: Response;
  try {
    erpResp = await fetch(erpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-token': erpToken,
      },
      body: JSON.stringify({ article_numbers: articleNumbers }),
    });
  } catch (e) {
    return json(502, { error: `ERP unreachable: ${e instanceof Error ? e.message : String(e)}` });
  }

  if (!erpResp.ok) {
    const text = await erpResp.text().catch(() => '');
    return json(502, { error: `ERP returned ${erpResp.status}`, detail: text.slice(0, 500) });
  }

  let erpJson: { results?: Array<{ article_number: string; price_eur: number | null }> };
  try { erpJson = await erpResp.json(); } catch { return json(502, { error: 'ERP returned invalid JSON' }); }

  const results = Array.isArray(erpJson.results) ? erpJson.results : [];
  return json(200, { results });
});
