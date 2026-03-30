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

function visibleErrorAnswer(lang: Lang, message: string) {
  if (lang === 'de') {
    return { answer: `Gemini ist aktuell nicht verfuegbar: ${message}` };
  }
  return { answer: `Gemini is currently unavailable: ${message}` };
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(res, 200, {
      answer: lang === 'de'
        ? 'Der KI-Service ist noch nicht verbunden (GEMINI_API_KEY fehlt). Ich kann lokal trotzdem einfache Vorschlaege geben.'
        : 'AI service is not connected yet (GEMINI_API_KEY missing). I can still provide basic local suggestions.',
    });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const completion = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(lang) }] },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: JSON.stringify({ message, currentConfig: config }),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!completion.ok) {
      const txt = await completion.text();
      const details = txt.slice(0, 200).replace(/\s+/g, ' ').trim();
      return json(res, 200, visibleErrorAnswer(lang, `HTTP ${completion.status}${details ? ` - ${details}` : ''}`));
    }

    const raw = await completion.json();
    const parts = raw?.candidates?.[0]?.content?.parts;
    const content = Array.isArray(parts)
      ? parts
          .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
          .join('\n')
          .trim()
      : '';

    if (!content || typeof content !== 'string') {
      const finishReason = raw?.candidates?.[0]?.finishReason;
      const blockReason = raw?.promptFeedback?.blockReason;
      const reason = blockReason || finishReason || 'empty_response';
      return json(res, 200, visibleErrorAnswer(lang, `Keine verwertbare Antwort (${reason})`));
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
