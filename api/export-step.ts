import { buildStepFilename, generateStepWireframe, type ConveyorConfig } from './_lib/step-wireframe';
import { requestSolidStepFromService } from './_lib/step-solid-service';

type ExportMode = 'wireframe' | 'solid';

type ExportStepRequestBody = {
  config?: ConveyorConfig;
  mode?: ExportMode;
  allowFallback?: boolean;
};

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  send: (body: string) => void;
  setHeader: (name: string, value: string) => void;
};

function isValidConfig(value: unknown): value is ConveyorConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const cfg = value as Record<string, unknown>;

  const isNumber = (k: string) => typeof cfg[k] === 'number' && Number.isFinite(cfg[k]);
  const isBoolean = (k: string) => typeof cfg[k] === 'boolean';
  const oneOf = (k: string, options: string[]) => typeof cfg[k] === 'string' && options.includes(cfg[k] as string);

  return (
    isNumber('frameWidth') &&
    isNumber('beltLength') &&
    isNumber('sideGuideHeight') &&
    isNumber('inclineAngle') &&
    isNumber('speed') &&
    isNumber('loadCapacity') &&
    isNumber('standHeight') &&
    oneOf('beltType', ['standard', 'grip', 'heavy-grip', 'food-safe']) &&
    oneOf('driveType', ['direct', 'indirect', 'center']) &&
    oneOf('motorPosition', ['left', 'right']) &&
    [0, 90, 180, 270].includes(cfg.motorAngle as number) &&
    isBoolean('withStand') &&
    oneOf('floorElement', ['feet', 'castors']) &&
    isBoolean('heightAdjust') &&
    isBoolean('floorBolts')
  );
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = (request.body ?? {}) as ExportStepRequestBody;
  const requestedMode: ExportMode = body.mode === 'wireframe' ? 'wireframe' : 'solid';
  const allowFallback = body.allowFallback !== false;

  if (!isValidConfig(body.config)) {
    response.status(400).json({ error: 'Invalid or missing config payload' });
    return;
  }

  const config = body.config;

  if (requestedMode === 'solid') {
    const solidResult = await requestSolidStepFromService(config);

    if (solidResult) {
      response.setHeader('Content-Type', 'application/step');
      response.setHeader('Content-Disposition', `attachment; filename="${solidResult.filename}"`);
      response.setHeader('X-Step-Mode', 'solid');
      response.status(200).send(solidResult.content);
      return;
    }

    if (!allowFallback) {
      response.status(503).json({ error: 'Solid STEP generation unavailable' });
      return;
    }
  }

  const stepContent = generateStepWireframe(config);
  const filename = buildStepFilename(config);

  response.setHeader('Content-Type', 'application/step');
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.setHeader('X-Step-Mode', 'wireframe');
  response.status(200).send(stepContent);
}
