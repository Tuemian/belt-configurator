import nodemailer from 'nodemailer';

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
};

type ApiRequest = {
  method?: string;
  body?: unknown;
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

function buildOfficeText(params: {
  lang: 'de' | 'en';
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  summary: string;
}): string {
  const title = params.lang === 'de' ? 'Neue Anfrage aus dem Gurtfoerderer-Konfigurator' : 'New inquiry from belt conveyor configurator';
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
      'vielen Dank fuer Ihre Anfrage. Wir haben Ihre Daten erhalten und melden uns zeitnah bei Ihnen.',
      '',
      `Rueckfragen: ${params.officeEmail}`,
      '',
      'Viele Gruesse',
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

  if (!name || !email || !looksLikeEmail(email)) {
    response.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    response.status(500).json({ error: 'SMTP is not configured' });
    return;
  }

  const officeEmail = process.env.INQUIRY_TO_EMAIL ?? 'office@novamotis.com';
  const fromEmail = process.env.INQUIRY_FROM_EMAIL ?? smtpUser;
  const secure = (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || smtpPort === 465;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const officeSubject = lang === 'de'
    ? `Neue Anfrage Konfigurator - ${name}`
    : `New configurator inquiry - ${name}`;
  const customerSubject = lang === 'de'
    ? 'Ihre Anfrage bei NOVAMOTIS'
    : 'Your inquiry at NOVAMOTIS';

  await transporter.sendMail({
    from: fromEmail,
    to: officeEmail,
    replyTo: email,
    subject: officeSubject,
    text: buildOfficeText({ lang, name, company, email, phone, message, summary }),
  });

  await transporter.sendMail({
    from: fromEmail,
    to: email,
    replyTo: officeEmail,
    subject: customerSubject,
    text: buildCustomerText({ lang, name, officeEmail }),
  });

  response.status(200).json({ ok: true });
}
