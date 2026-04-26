type ConveyorConfig = {
  beltLength?: number;
  frameWidth?: number;
  standHeight?: number;
  driveType?: string;
  beltType?: string;
};

type ApiRequest = {
  method?: string;
  body?: {
    config?: ConveyorConfig;
  };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

type SupabaseRow = {
  id?: number | string;
  config_hash?: string;
};

declare const process: {
  env: Record<string, string | undefined>;
};

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toDriveTypeLabel(value: unknown): string {
  const source = typeof value === 'string' ? value : 'direct';

  if (source === 'drum') {
    return 'Trommelmotor';
  }

  if (source === 'center') {
    return 'Mittenantrieb';
  }

  if (source === 'indirect') {
    return 'Indirektantrieb';
  }

  return 'Direktantrieb';
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    response.status(500).json({ error: 'Supabase is not configured' });
    return;
  }

  const config = request.body?.config ?? {};

  const row = {
    length_mm: toFiniteNumber(config.beltLength, 2000),
    width_mm: toFiniteNumber(config.frameWidth, 500),
    height_ok_mm: toFiniteNumber(config.standHeight, 850),
    drive_type: toDriveTypeLabel(config.driveType),
    material_oily: config.beltType === 'food-safe',
  };

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/configurations?select=id,config_hash`;

  try {
    const insertResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([row]),
    });

    if (!insertResponse.ok) {
      const details = await insertResponse.text();
      response.status(502).json({ error: 'Supabase insert failed', details });
      return;
    }

    const data = await insertResponse.json() as SupabaseRow[];
    const created = data?.[0] ?? {};
    const configId = typeof created.config_hash === 'string' && created.config_hash.trim().length > 0
      ? created.config_hash
      : (typeof created.id === 'string' || typeof created.id === 'number' ? String(created.id) : '');

    if (!configId) {
      response.status(502).json({ error: 'Supabase did not return config id' });
      return;
    }

    response.status(200).json({
      configId,
      configHash: created.config_hash ?? null,
      databaseId: created.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    response.status(500).json({ error: 'Unexpected server error', details: message });
  }
}
