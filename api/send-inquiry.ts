type InquiryPayload = {
  lang?: 'de' | 'en';
  form?: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    message?: string;
  };
  summary?: string;
  attachment?: {
    filename?: string;
    contentType?: string;
    contentBase64?: string;
  };
};

declare const process: {
  env: Record<string, string | undefined>;
};

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

function asNonEmptyString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_NAME_LEN = 120;
const MAX_COMPANY_LEN = 160;
const MAX_EMAIL_LEN = 254;
const MAX_PHONE_LEN = 60;
const MAX_MESSAGE_LEN = 4000;
const MAX_SUMMARY_LEN = 25000;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const rateLimitStore = new Map<string, number[]>();

function getClientIp(request: ApiRequest): string {
  const forwarded = request.headers?.['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(',')[0]?.trim() || 'unknown';
}

function isRateLimited(clientKey: string, now: number): boolean {
  const previous = rateLimitStore.get(clientKey) ?? [];
  const recent = previous.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(clientKey, recent);
    return true;
  }

  recent.push(now);
  rateLimitStore.set(clientKey, recent);
  return false;
}

function exceedsLength(value: string, max: number): boolean {
  return value.length > max;
}

function buildOfficeText(params: {
  lang: 'de' | 'en';
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  summary: string;
}): string {
  const title = params.lang === 'de' ? 'Neue Anfrage aus dem Gurtförderer-Konfigurator' : 'New inquiry from belt conveyor configurator';
  return [
    title,
    '',
    `Name: ${params.name}`,
    `Firma: ${params.company || '-'}`,
    `E-Mail: ${params.email}`,
    `Telefon: ${params.phone || '-'}`,
    '',
    'Nachricht:',
    params.message || '-',
    '',
    'Konfigurationsdaten:',
    params.summary || '-',
  ].join('\n');
}

function buildCustomerText(params: {
  lang: 'de' | 'en';
  name: string;
  officeEmail: string;
}): string {
  if (params.lang === 'de') {
    return [
      `Hallo ${params.name},`,
      '',
      'vielen Dank für Ihre Anfrage. Wir haben Ihre Daten erhalten und melden uns zeitnah bei Ihnen.',
      '',
      `Rückfragen: ${params.officeEmail}`,
      '',
      'Viele Grüße',
      'NOVAMOTIS',
    ].join('\n');
  }

  return [
    `Hello ${params.name},`,
    '',
    'thank you for your inquiry. We have received your details and will get back to you shortly.',
    '',
    `For questions: ${params.officeEmail}`,
    '',
    'Best regards',
    'NOVAMOTIS',
  ].join('\n');
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = (request.body ?? {}) as InquiryPayload;
  const lang = body.lang === 'en' ? 'en' : 'de';
  const name = asNonEmptyString(body.form?.name);
  const company = asNonEmptyString(body.form?.company);
  const email = asNonEmptyString(body.form?.email);
  const phone = asNonEmptyString(body.form?.phone);
  const message = asNonEmptyString(body.form?.message);
  const summary = asNonEmptyString(body.summary);
  const attachmentFilename = asNonEmptyString(body.attachment?.filename);
  const attachmentContentType = asNonEmptyString(body.attachment?.contentType);
  const attachmentContentBase64 = asNonEmptyString(body.attachment?.contentBase64);

  const now = Date.now();
  const clientKey = `${getClientIp(request)}:${email || 'no-email'}`;
  if (isRateLimited(clientKey, now)) {
    response.status(429).json({ error: 'Too many requests' });
    return;
  }

  if (!name || !email || !looksLikeEmail(email)) {
    response.status(400).json({ error: 'Invalid payload' });
    return;
  }

  if (
    exceedsLength(name, MAX_NAME_LEN)
    || exceedsLength(company, MAX_COMPANY_LEN)
    || exceedsLength(email, MAX_EMAIL_LEN)
    || exceedsLength(phone, MAX_PHONE_LEN)
    || exceedsLength(message, MAX_MESSAGE_LEN)
    || exceedsLength(summary, MAX_SUMMARY_LEN)
  ) {
    response.status(400).json({ error: 'Input too long' });
    return;
  }

  if (attachmentContentBase64) {
    if (attachmentContentType && attachmentContentType !== 'application/pdf') {
      response.status(400).json({ error: 'Unsupported attachment type' });
      return;
    }

    const estimatedBytes = Math.floor((attachmentContentBase64.length * 3) / 4);
    if (estimatedBytes > MAX_ATTACHMENT_BYTES) {
      response.status(400).json({ error: 'Attachment too large' });
      return;
    }
  }

  const tenantId = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;
  const officeEmail = process.env.INQUIRY_TO_EMAIL ?? 'office@novamotis.com';
  const fromEmail = process.env.INQUIRY_FROM_EMAIL ?? officeEmail;

  if (!tenantId || !clientId || !clientSecret) {
    response.status(500).json({ error: 'Mail service is not configured' });
    return;
  }

  // Fetch OAuth2 access token via client credentials
  let accessToken: string;
  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
        }),
      }
    );
    const tokenData = await tokenRes.json() as { access_token?: string; error_description?: string };
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description ?? 'Token request failed');
    }
    accessToken = tokenData.access_token;
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('Graph token error:', errMessage);
    response.status(502).json({ error: 'Mail delivery failed', detail: errMessage });
    return;
  }

  const officeSubject = lang === 'de'
    ? `Neue Anfrage Konfigurator - ${name}`
    : `New configurator inquiry - ${name}`;
  const customerSubject = lang === 'de'
    ? 'Ihre Anfrage bei NOVAMOTIS'
    : 'Your inquiry at NOVAMOTIS';

  async function sendMail(to: string, subject: string, body: string, replyTo: string): Promise<void> {
    const attachments = attachmentContentBase64
      ? [{
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: attachmentFilename || 'configuration.pdf',
          contentType: attachmentContentType || 'application/pdf',
          contentBytes: attachmentContentBase64,
        }]
      : undefined;

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${fromEmail}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject,
            body: { contentType: 'Text', content: body },
            toRecipients: [{ emailAddress: { address: to } }],
            replyTo: [{ emailAddress: { address: replyTo } }],
            attachments,
          },
        }),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Graph sendMail ${res.status}: ${detail}`);
    }
  }

  try {
    await sendMail(
      officeEmail,
      officeSubject,
      buildOfficeText({ lang, name, company, email, phone, message, summary }),
      email,
    );
    await sendMail(
      email,
      customerSubject,
      buildCustomerText({ lang, name, officeEmail }),
      officeEmail,
    );
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error('Graph mail error:', errMessage);
    response.status(502).json({ error: 'Mail delivery failed', detail: errMessage });
    return;
  }

  response.status(200).json({ ok: true });
}
