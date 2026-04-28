// Send inquiry edge function — handles both belt and profile configurator inquiries.
// Uses classic SMTP, persists to Supabase, sends email + customer confirmation.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InquiryType = "belt" | "profile";

interface InquiryBody {
  type: InquiryType;
  lang?: string;
  form: {
    name: string;
    company?: string;
    email: string;
    phone?: string;
    message?: string;
  };
  configuration: unknown;
  summary?: string;
  attachment?: {
    filename: string;
    contentType: string;
    contentBase64: string;
  };
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map<string, number[]>();

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const arr = (rateLimitStore.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (arr.length >= RATE_LIMIT_MAX) return false;
  arr.push(now);
  rateLimitStore.set(ip, arr);
  return true;
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanBase64(b64: string): string {
  return b64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
}

function base64FromUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  }
  return btoa(binary);
}

function wrapBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function encodeHeader(value: string): string {
  const safe = value.replace(/[\r\n]/g, " ");
  return /^[\x00-\x7F]*$/.test(safe) ? safe : `=?UTF-8?B?${base64FromUtf8(safe)}?=`;
}

function extractEmail(address: string): string {
  return address.match(/<([^>]+)>/)?.[1]?.trim() ?? address.trim();
}

function splitRecipients(value: string): string[] {
  return value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
}

function dotStuff(message: string): string {
  return message.replace(/\r?\n/g, "\r\n").split("\r\n").map((line) =>
    line.startsWith(".") ? `.${line}` : line
  ).join("\r\n");
}

type SmtpAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

type SendMailOptions = {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  attachments?: SmtpAttachment[];
};

function buildMimeMessage(options: SendMailOptions): string {
  const mixedBoundary = `mixed_${crypto.randomUUID()}`;
  const altBoundary = `alt_${crypto.randomUUID()}`;
  const lines = [
    `From: ${options.from.replace(/[\r\n]/g, " ")}`,
    `To: ${options.to.join(", ")}`,
    options.replyTo ? `Reply-To: ${options.replyTo.replace(/[\r\n]/g, " ")}` : null,
    `Subject: ${encodeHeader(options.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    `--${altBoundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(base64FromUtf8(options.text)),
    `--${altBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(base64FromUtf8(options.html)),
    `--${altBoundary}--`,
  ].filter((line): line is string => line !== null);

  for (const attachment of options.attachments ?? []) {
    const filename = encodeHeader(attachment.filename || "configuration.pdf");
    lines.push(
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.contentType || "application/octet-stream"}; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(cleanBase64(attachment.contentBase64)),
    );
  }

  lines.push(`--${mixedBoundary}--`, "");
  return lines.join("\r\n");
}

async function sendSmtpMail(options: SendMailOptions): Promise<void> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let conn: Deno.Conn = options.port === 465
    ? await Deno.connectTls({ hostname: options.host, port: options.port })
    : await Deno.connect({ hostname: options.host, port: options.port });
  let buffer = "";

  const readLine = async (): Promise<string> => {
    while (!buffer.includes("\n")) {
      const chunk = new Uint8Array(4096);
      const bytesRead = await conn.read(chunk);
      if (bytesRead === null) throw new Error("SMTP connection closed");
      buffer += decoder.decode(chunk.subarray(0, bytesRead));
    }
    const newlineIndex = buffer.indexOf("\n");
    const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
    buffer = buffer.slice(newlineIndex + 1);
    return line;
  };

  const readResponse = async () => {
    const lines: string[] = [];
    let code = 0;
    while (true) {
      const line = await readLine();
      lines.push(line);
      const match = line.match(/^(\d{3})([ -])/);
      if (match) {
        code = Number(match[1]);
        if (match[2] === " ") break;
      }
    }
    return { code, lines };
  };

  const writeLine = async (line: string) => {
    await conn.write(encoder.encode(`${line}\r\n`));
  };

  const expect = async (allowed: number[], command?: string) => {
    if (command) await writeLine(command);
    const response = await readResponse();
    if (!allowed.includes(response.code)) {
      throw new Error(`SMTP ${command ?? "response"} failed: ${response.lines.join(" | ")}`);
    }
    return response;
  };

  try {
    await expect([220]);
    let ehlo = await expect([250], `EHLO ${options.host}`);

    if (options.port !== 465) {
      const supportsStartTls = ehlo.lines.some((line) => /STARTTLS/i.test(line));
      if (!supportsStartTls) throw new Error("SMTP server does not offer STARTTLS");
      await expect([220], "STARTTLS");
      conn = await Deno.startTls(conn, { hostname: options.host });
      buffer = "";
      ehlo = await expect([250], `EHLO ${options.host}`);
    }

    await expect([334], "AUTH LOGIN");
    await expect([334], base64FromUtf8(options.username));
    await expect([235], base64FromUtf8(options.password));

    await expect([250], `MAIL FROM:<${extractEmail(options.from)}>`);
    for (const recipient of options.to) {
      await expect([250, 251], `RCPT TO:<${extractEmail(recipient)}>`);
    }
    await expect([354], "DATA");
    await conn.write(encoder.encode(`${dotStuff(buildMimeMessage(options))}\r\n.\r\n`));
    await expect([250]);
    await writeLine("QUIT");
  } finally {
    try {
      conn.close();
    } catch {
      /* ignore */
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: InquiryBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate
  const errors: string[] = [];
  if (body.type !== "belt" && body.type !== "profile") errors.push("type");
  const name = (body.form?.name ?? "").toString().trim().slice(0, 120);
  const company = (body.form?.company ?? "").toString().trim().slice(0, 160);
  const email = (body.form?.email ?? "").toString().trim().slice(0, 254);
  const phone = (body.form?.phone ?? "").toString().trim().slice(0, 60);
  const message = (body.form?.message ?? "").toString().trim().slice(0, 4000);
  const summary = (body.summary ?? "").toString().slice(0, 25000);
  const lang = (body.lang ?? "de").toString().slice(0, 5);

  if (!name) errors.push("name");
  if (!email || !isEmail(email)) errors.push("email");
  if (!body.configuration) errors.push("configuration");

  if (errors.length) {
    return new Response(
      JSON.stringify({ error: "Validation failed", fields: errors }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Read SMTP secrets
  const SMTP_HOST = Deno.env.get("SMTP_HOST");
  const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "587");
  const SMTP_USER = Deno.env.get("SMTP_USER");
  const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");
  const SMTP_FROM = Deno.env.get("SMTP_FROM") ?? SMTP_USER;
  const INQUIRY_TO = Deno.env.get("INQUIRY_TO") ?? SMTP_FROM;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM || !INQUIRY_TO) {
    console.error("SMTP secrets missing");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Persist to DB
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const table = body.type === "belt" ? "belt_inquiries" : "profile_inquiries";
  const { data: insertData, error: insertErr } = await supabase
    .from(table)
    .insert({
      lang,
      name,
      company: company || null,
      email,
      phone: phone || null,
      message: message || null,
      configuration: body.configuration,
      summary_text: summary || null,
      pdf_filename: body.attachment?.filename ?? null,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("DB insert error:", insertErr);
  }
  const inquiryId = insertData?.id ?? "n/a";

  // Build emails
  const productLabel =
    body.type === "belt"
      ? "Gurtförderer-Konfigurator"
      : "Profil-Konfigurator";

  const adminSubject = `Neue Anfrage (${productLabel}) – ${name}${company ? " / " + company : ""}`;

  const adminText = [
    `Neue Anfrage aus dem ${productLabel}`,
    `Anfrage-ID: ${inquiryId}`,
    ``,
    `Name:    ${name}`,
    `Firma:   ${company || "-"}`,
    `E-Mail:  ${email}`,
    `Telefon: ${phone || "-"}`,
    `Sprache: ${lang}`,
    ``,
    `Nachricht:`,
    message || "-",
    ``,
    `--- Konfiguration ---`,
    summary || JSON.stringify(body.configuration, null, 2),
  ].join("\n");

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="color: #003366;">Neue Anfrage – ${escapeHtml(productLabel)}</h2>
      <p><strong>Anfrage-ID:</strong> ${escapeHtml(inquiryId)}</p>
      <table style="border-collapse: collapse; margin: 12px 0;">
        <tr><td style="padding:4px 12px 4px 0;"><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;"><strong>Firma</strong></td><td>${escapeHtml(company || "-")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;"><strong>E-Mail</strong></td><td>${escapeHtml(email)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;"><strong>Telefon</strong></td><td>${escapeHtml(phone || "-")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;"><strong>Sprache</strong></td><td>${escapeHtml(lang)}</td></tr>
      </table>
      ${message ? `<p><strong>Nachricht:</strong></p><p style="white-space: pre-wrap;">${escapeHtml(message)}</p>` : ""}
      <hr/>
      <p><strong>Konfiguration:</strong></p>
      <pre style="white-space: pre-wrap; background:#f6f8fa; padding:12px; border-radius:6px; font-size:12px;">${escapeHtml(summary || JSON.stringify(body.configuration, null, 2))}</pre>
    </div>
  `;

  const customerSubject =
    lang === "en"
      ? "Thank you for your inquiry – NOVAMOTIS"
      : "Vielen Dank für Ihre Anfrage – NOVAMOTIS";

  const customerText =
    lang === "en"
      ? `Hello ${name},\n\nthank you for your inquiry via the ${productLabel}. We have received your request (ID: ${inquiryId}) and will get back to you shortly.\n\nBest regards,\nNOVAMOTIS Team`
      : `Hallo ${name},\n\nvielen Dank für Ihre Anfrage über den ${productLabel}. Wir haben Ihre Anfrage erhalten (ID: ${inquiryId}) und melden uns in Kürze bei Ihnen.\n\nMit freundlichen Grüßen\nIhr NOVAMOTIS Team`;

  const customerHtml = `
    <div style="font-family: Arial, sans-serif; color: #111; max-width: 560px;">
      <h2 style="color: #003366;">${lang === "en" ? "Thank you for your inquiry" : "Vielen Dank für Ihre Anfrage"}</h2>
      <p>${lang === "en" ? `Hello ${escapeHtml(name)},` : `Hallo ${escapeHtml(name)},`}</p>
      <p>${
        lang === "en"
          ? `we have received your inquiry via the <strong>${escapeHtml(productLabel)}</strong> and will get back to you shortly.`
          : `wir haben Ihre Anfrage über den <strong>${escapeHtml(productLabel)}</strong> erhalten und melden uns in Kürze bei Ihnen.`
      }</p>
      <p style="color: #666; font-size: 12px;">${lang === "en" ? "Inquiry reference" : "Anfrage-Referenz"}: ${escapeHtml(inquiryId)}</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
      <p style="color: #555; font-size: 13px;">NOVAMOTIS<br/>www.novamotis.com<br/>office@novamotis.com</p>
    </div>
  `;

  const attachments: SmtpAttachment[] | undefined = body.attachment?.contentBase64
    ? [{
        filename: body.attachment.filename || "configuration.pdf",
        contentType: body.attachment.contentType || "application/pdf",
        contentBase64: body.attachment.contentBase64,
      }]
    : undefined;

  // Send via SMTP — Office 365 on port 587 requires STARTTLS after EHLO.
  console.log(
    `SMTP connecting to ${SMTP_HOST}:${SMTP_PORT} (${SMTP_PORT === 465 ? "implicit TLS" : "STARTTLS"})`,
  );

  try {
    // Mail to NOVAMOTIS
    await sendSmtpMail({
      host: SMTP_HOST,
      port: SMTP_PORT,
      username: SMTP_USER,
      password: SMTP_PASSWORD,
      from: SMTP_FROM,
      to: splitRecipients(INQUIRY_TO),
      replyTo: email,
      subject: adminSubject,
      text: adminText,
      html: adminHtml,
      attachments,
    });

    // Confirmation to customer
    try {
      await sendSmtpMail({
        host: SMTP_HOST,
        port: SMTP_PORT,
        username: SMTP_USER,
        password: SMTP_PASSWORD,
        from: SMTP_FROM,
        to: [email],
        subject: customerSubject,
        text: customerText,
        html: customerHtml,
      });
    } catch (confirmErr) {
      console.error("Customer confirmation failed:", confirmErr);
      // do not fail the whole request
    }

    return new Response(
      JSON.stringify({ ok: true, id: inquiryId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("SMTP send error:", err);
    return new Response(
      JSON.stringify({
        error: "Email send failed",
        detail: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
