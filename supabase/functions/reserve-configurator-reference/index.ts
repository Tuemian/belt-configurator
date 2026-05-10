// Reserves and tracks configurator reference IDs (FT-YYYYMMDD-NNN).
// Used by both Belt- and Profile-Konfigurator at the moment of PDF download / inquiry send.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReserveBody = {
  action: "reserve";
  tool: "belt" | "profile";
  config?: unknown;
  lang?: string;
};

type MarkBody = {
  action: "mark";
  reference: string;
  mark: "pdf" | "inquiry";
};

type Body = ReserveBody | MarkBody;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Best-effort in-memory IP rate limiter. Resets on cold start, but
// blunts trivial flooding from a single source. For stronger guarantees,
// move to a persistent backend (Redis/Upstash).
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitStore = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (rateLimitStore.get(key) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(key, recent);
    return true;
  }
  recent.push(now);
  rateLimitStore.set(key, recent);
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (isRateLimited(getClientIp(req))) {
    return jsonResponse(429, { error: "Too many requests" });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (body.action === "reserve") {
    if (body.tool !== "belt" && body.tool !== "profile") {
      return jsonResponse(400, { error: "invalid tool" });
    }
    const lang = typeof body.lang === "string" ? body.lang.slice(0, 5) : "de";
    const { data, error } = await supabase.rpc("reserve_configurator_reference", {
      _tool: body.tool,
      _config: (body.config ?? {}) as Record<string, unknown>,
      _lang: lang,
    });
    if (error) {
      console.error("reserve error:", error);
      return jsonResponse(500, { error: "reserve failed" });
    }
    return jsonResponse(200, { reference: data });
  }

  if (body.action === "mark") {
    if (typeof body.reference !== "string" || !body.reference.trim()) {
      return jsonResponse(400, { error: "missing reference" });
    }
    if (body.mark !== "pdf" && body.mark !== "inquiry") {
      return jsonResponse(400, { error: "invalid mark" });
    }
    const { error } = await supabase.rpc("mark_configurator_reference", {
      _reference: body.reference,
      _action: body.mark,
    });
    if (error) {
      console.error("mark error:", error);
      return jsonResponse(500, { error: "mark failed" });
    }
    return jsonResponse(200, { ok: true });
  }

  return jsonResponse(400, { error: "invalid action" });
});
