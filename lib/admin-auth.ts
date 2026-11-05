import "server-only";
import { NextRequest } from "next/server";
import { secureCompare } from "@/lib/crypto";

export interface AdminAuthResult {
  authorized: boolean;
  adminIdentifier?: string;
  error?: string;
  status?: number;
}

export function verifyAdminAuth(request: NextRequest): AdminAuthResult {
  const configuredSecret = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET;

  if (!configuredSecret || configuredSecret.length < 24) {
    console.error("ADMIN_API_KEY missing or too short");
    return {
      authorized: false,
      error: "Administrator service unavailable: configuration error.",
      status: 503,
    };
  }

  // Extract auth token from Authorization header or X-Admin-Key
  const authHeader = request.headers.get("authorization");
  let bearerToken = "";
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    bearerToken = authHeader.slice(7).trim();
  }

  const customHeader = request.headers.get("x-admin-key")?.trim() || "";
  const candidate = bearerToken || customHeader;

  if (!candidate) {
    return {
      authorized: false,
      error: "Administrator authorization required.",
      status: 401,
    };
  }

  const isValid = secureCompare(candidate, configuredSecret);
  if (!isValid) {
    return {
      authorized: false,
      error: "Invalid administrator credentials.",
      status: 403,
    };
  }

  const adminIdentifier = request.headers.get("x-admin-user")?.trim() || "admin@nasj.tn";

  return {
    authorized: true,
    adminIdentifier,
  };
}
