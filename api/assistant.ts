type Lang = 'de' | 'en';

type ChatPayload = {
  message: string;
  lang: Lang;
  config: Record<string, unknown>;
};

function buildSystemPrompt(lang: Lang): string {
  const base = [
    'You are an assistant for a belt conveyor configurator.',
    'You must answer concise and practical.',
    'You must only suggest values that fit these limits:',
    '- frameWidth allowed: 40, 80, 120, then 130..1000 in steps of 10',
    '- beltLength: 500..12000 and at least ceil(frameWidth * 1.5), step 5',
    '- sideGuideHeight: 10..50, step 5',
    '- inclineAngle: -10..10',
    '- speed: 3..65',
    '- loadCapacity: 1..500',
    '- driveType: direct|indirect|center',
    '- motorPosition: left|right',
    '- motorAngle: 0|90|180|270',
    '- withStand: true|false',
    '- standHeight: 400..2000, step 10',
    '- floorElement: feet|castors',
    '- heightAdjust: true|false',
    '- floorBolts: true|false',
    'Always respond as JSON with keys: answer (string), suggestions (object, optional).',
    'Do not include markdown fences.',
  ];

  if (lang === 'de') {
    base.push('Answer in German.');
  } else {
    base.push('Answer in English.');
  }

  return base.join('\n');
}

function json(res: any, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as ChatPayload;
  const message = typeof body.message === 'string' ? body.message : '';
  const lang: Lang = body.lang === 'en' ? 'en' : 'de';
  const config = body.config && typeof body.config === 'object' ? body.config : {};

  if (!message.trim()) {
    return json(res, 400, { error: 'Missing message' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(res, 200, {
      answer: lang === 'de'
        ? 'Der KI-Service ist noch nicht verbunden (OPENAI_API_KEY fehlt). Ich kann lokal trotzdem einfache Vorschlaege geben.'
        : 'AI service is not connected yet (OPENAI_API_KEY missing). I can still provide basic local suggestions.',
    });
  }

  try {
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          { role: 'system', content: buildSystemPrompt(lang) },
          {
            role: 'user',
            content: JSON.stringify({
              message,
              currentConfig: config,
            }),
          },
        ],
      }),
    });

    if (!completion.ok) {
      const txt = await completion.text();
      return json(res, 502, { error: 'Upstream error', details: txt.slice(0, 500) });
    }

    const raw = await completion.json();
    const content = raw?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return json(res, 502, { error: 'Invalid upstream response' });
    }

    try {
      const parsed = JSON.parse(content);
      return json(res, 200, parsed);
    } catch {
      return json(res, 200, { answer: content });
    }
  } catch (error) {
    return json(res, 500, {
      error: 'Assistant request failed',
      details: error instanceof Error ? error.message : 'unknown_error',
    });
  }
}
