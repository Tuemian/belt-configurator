import type { ConveyorConfig } from './step-wireframe';

type SolidServiceResponse = {
  filename?: string;
  content?: string;
};

type SolidStepResult = {
  filename: string;
  content: string;
};

export async function requestSolidStepFromService(config: ConveyorConfig): Promise<SolidStepResult | null> {
  const serviceUrl = process.env.STEP_SOLID_SERVICE_URL;
  if (!serviceUrl) {
    return null;
  }

  const timeoutMs = Number(process.env.STEP_SOLID_TIMEOUT_MS ?? 90000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as SolidServiceResponse;
    if (!json.content || typeof json.content !== 'string') {
      return null;
    }

    const filename = typeof json.filename === 'string' && json.filename.length > 0
      ? json.filename
      : 'novamotis-conveyor-solid.step';

    return {
      filename,
      content: json.content,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}