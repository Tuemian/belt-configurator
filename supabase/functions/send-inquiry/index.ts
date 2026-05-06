// Send inquiry edge function — handles both belt and profile configurator inquiries.
// Sends email via Resend (over the Lovable connector gateway) and persists to Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

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
  reference?: string;
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
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("cf-connecting-ip") ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const arr = (rateLimitStore.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
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

function splitRecipients(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type ResendAttachment = {
  filename: string;
  content: string; // base64
  content_type?: string;
};

type SendEmailParams = {
  from: string;
  to: string[];
  reply_to?: string;
  subject: string;
  text: string;
  html: string;
  attachments?: ResendAttachment[];
};

async function sendResendEmail(apiKey: string, lovableApiKey: string, params: SendEmailParams): Promise<void> {
  const payload: Record<string, unknown> = {
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  };
  if (params.reply_to) payload.reply_to = params.reply_to;
  if (params.attachments?.length) payload.attachments = params.attachments;

  const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": apiKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Resend API failed [${res.status}]: ${body}`);
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
    return new Response(JSON.stringify({ error: "Validation failed", fields: errors }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read secrets
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  // Optional: override From-Adresse via Secret (z.B. "NOVAMOTIS <noreply@novamotis.com>")
  // Fallback: Resend Test-Adresse, funktioniert ohne verifizierte Domain.
  const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "NOVAMOTIS Konfigurator <onboarding@resend.dev>";
  const INQUIRY_TO = Deno.env.get("INQUIRY_TO");

  if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
    console.error("Resend secrets missing");
    return new Response(JSON.stringify({ error: "Email service not configured (Resend)" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!INQUIRY_TO) {
    console.error("INQUIRY_TO secret missing");
    return new Response(JSON.stringify({ error: "Inquiry recipient not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Persist to DB
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
    .select("id, reference")
    .single();

  if (insertErr) {
    console.error("DB insert error:", insertErr);
    return new Response(JSON.stringify({ error: "Could not save inquiry" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const inquiryId = insertData?.id ?? "n/a";
  const inquiryRef = (insertData as { reference?: string } | null)?.reference ?? inquiryId;

  // Build emails
  const productLabel = body.type === "belt" ? "Gurtförderer-Konfigurator" : "Profil-Konfigurator";

  const adminSubject = `Neue Anfrage ${inquiryRef} (${productLabel}) – ${name}${company ? " / " + company : ""}`;

  const adminText = [
    `Neue Anfrage aus dem ${productLabel}`,
    `Anfrage-Nr.: ${inquiryRef}`,
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
      <p><strong>Anfrage-Nr.:</strong> ${escapeHtml(inquiryRef)}</p>
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
    lang === "en" ? "Thank you for your inquiry – NOVAMOTIS" : "Vielen Dank für Ihre Anfrage – NOVAMOTIS";

  const customerText =
    lang === "en"
      ? `Hello ${name},\n\nthank you for your inquiry via the ${productLabel}. We have received your request (Reference no.: ${inquiryRef}) and one of our specialists will get back to you personally within a maximum of two business days.\n\nBest regards,\nNOVAMOTIS Team`
      : `Hallo ${name},\n\nvielen Dank für Ihre Anfrage über den ${productLabel}. Wir haben Ihre Anfrage erhalten (Anfrage-Nr.: ${inquiryRef}) und einer unserer Mitarbeiter meldet sich innerhalb von maximal zwei Arbeitstagen persönlich bei Ihnen.\n\nMit freundlichen Grüßen\nIhr NOVAMOTIS Team`;

  const customerHtml = `
    <div style="font-family: Arial, sans-serif; color: #111; max-width: 560px;">
      <h2 style="color: #003366;">${lang === "en" ? "Thank you for your inquiry" : "Vielen Dank für Ihre Anfrage"}</h2>
      <p>${lang === "en" ? `Hello ${escapeHtml(name)},` : `Hallo ${escapeHtml(name)},`}</p>
      <p>${
        lang === "en"
          ? `we have received your inquiry via the <strong>${escapeHtml(productLabel)}</strong>. One of our specialists will get back to you personally <strong>within a maximum of two business days</strong>.`
          : `wir haben Ihre Anfrage über den <strong>${escapeHtml(productLabel)}</strong> erhalten. Einer unserer Spezialisten meldet sich <strong>innerhalb von maximal zwei Arbeitstagen</strong> persönlich bei Ihnen.`
      }</p>
      <p style="color: #666; font-size: 12px;">${lang === "en" ? "Reference no." : "Anfrage-Nr."}: <strong>${escapeHtml(inquiryRef)}</strong></p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
      <p style="color: #555; font-size: 13px;">NOVAMOTIS<br/>www.novamotis.com<br/>office@novamotis.com</p>
    </div>
  `;

  const attachments: ResendAttachment[] | undefined = body.attachment?.contentBase64
    ? [
        {
          filename: body.attachment.filename || "configuration.pdf",
          content: cleanBase64(body.attachment.contentBase64),
          content_type: body.attachment.contentType || "application/pdf",
        },
      ]
    : undefined;

  console.log(`Queueing inquiry ${inquiryRef} for background send via Resend`);

  // Mail-Versand im Hintergrund — Antwort an Browser sofort zurückgeben
  const sendTask = (async () => {
    try {
      const [adminResult, customerResult] = await Promise.allSettled([
        sendResendEmail(RESEND_API_KEY, LOVABLE_API_KEY, {
          from: RESEND_FROM,
          to: splitRecipients(INQUIRY_TO),
          reply_to: email,
          subject: adminSubject,
          text: adminText,
          html: adminHtml,
          attachments,
        }),
        sendResendEmail(RESEND_API_KEY, LOVABLE_API_KEY, {
          from: RESEND_FROM,
          to: [email],
          subject: customerSubject,
          text: customerText,
          html: customerHtml,
          attachments,
        }),
      ]);

      if (adminResult.status === "rejected") {
        console.error(`[${inquiryRef}] Admin notification failed:`, adminResult.reason);
      } else {
        console.log(`[${inquiryRef}] Admin notification sent`);
      }
      if (customerResult.status === "rejected") {
        console.error(`[${inquiryRef}] Customer confirmation failed:`, customerResult.reason);
      } else {
        console.log(`[${inquiryRef}] Customer confirmation sent`);
      }
    } catch (err) {
      console.error(`[${inquiryRef}] Background send error:`, err);
    }
  })();

  // @ts-ignore — Deno Edge Runtime API
  if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
    // @ts-ignore
    EdgeRuntime.waitUntil(sendTask);
  }

  return new Response(JSON.stringify({ ok: true, id: inquiryId, reference: inquiryRef }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
