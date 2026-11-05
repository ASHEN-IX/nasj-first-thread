import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function successResponse() {
  // Same response for first-time and duplicate emails, to avoid user enumeration.
  return NextResponse.json({ ok: true, message: "Your information was received. We'll reach out if there's a next step." }, { headers: { "Cache-Control": "no-store" } });
}

function resolveIpHashSecret(): string | null {
  const dedicatedSecret = process.env.IP_HASH_SECRET;
  if (dedicatedSecret && dedicatedSecret.length >= 24) return dedicatedSecret;

  // Reuse existing server configuration through a domain-separated derived key.
  // Never use public values or a per-instance random key: fingerprints must remain
  // private and stable across serverless instances for the DB limit to work.
  const credential = [process.env.MAILJET_SECRET_KEY, process.env.RESEND_API_KEY]
    .find((value) => value && value.length >= 24);
  if (!credential) return null;
  return createHmac("sha256", credential)
    .update("nasj.registration.ip-hash.v1")
    .digest("hex");
}

export async function preflight(request: NextRequest, routeKey: "early_access" | "craft_community") {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return errorResponse("Please submit a valid form.", 415);
  }
  // Only accept same-origin posts; deployments behind nonstandard proxies should configure forwarding correctly.
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const expectedHost = forwardedHost || request.headers.get("host");
  if (origin && expectedHost) {
    try {
      if (new URL(origin).host !== expectedHost) return errorResponse("Invalid origin.", 403);
    } catch {
      return errorResponse("Invalid origin.", 403);
    }
  }

  const secret = resolveIpHashSecret();
  if (!secret) {
    console.error("Registration requires IP_HASH_SECRET or a configured server-side email credential");
    return errorResponse("Registration is temporarily unavailable.", 503);
  }
  const address = (request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
  const hashedAddress = createHmac("sha256", secret).update(address).digest("hex");
  // 10 minute fixed window, maximum 5 submissions per form and IP. Atomic UPSERT avoids race conditions.
  const sql = getDatabase();
  const limit = await sql`
    INSERT INTO submission_rate_limits (request_fingerprint, route_key, window_start, request_count)
    VALUES (${hashedAddress}, ${routeKey}, to_timestamp(floor(extract(epoch from now()) / 600) * 600), 1)
    ON CONFLICT (request_fingerprint, route_key, window_start)
    DO UPDATE SET request_count = submission_rate_limits.request_count + 1
    WHERE submission_rate_limits.request_count < 5
    RETURNING request_count
  `;
  if (!limit.length) return errorResponse("Too many submissions. Please try again later.", 429);
  return null;
}

export async function parseJson(request: NextRequest): Promise<unknown> {
  const body = await request.text();
  if (body.length > 12000) throw new Error("body_too_large");
  return JSON.parse(body);
}
