import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { hashActivationToken, hashPasswordForBetterAuth, validatePasswordStrength } from "@/lib/crypto";
import { activatePlatformUser } from "@/lib/platform-db";
import { parseJson } from "@/lib/submission";

export const runtime = "nodejs";

/**
 * GET: Validates the activation token WITHOUT consuming it.
 * Used by the activation page to check token status on load.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "missing_token", message: "Activation token is required." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const tokenHash = hashActivationToken(token);
    const sql = getDatabase();

    const rows = await sql`
      SELECT id, email, status, expires_at, consumed_at, revoked_at
      FROM account_invitations
      WHERE token_hash = ${tokenHash}
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "invalid", message: "This activation link is invalid or not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const inv = rows[0];

    if (inv.status === "consumed" || inv.consumed_at) {
      return NextResponse.json(
        { ok: false, error: "already_used", message: "This invitation has already been used. Please sign in." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (inv.status === "revoked" || inv.revoked_at) {
      return NextResponse.json(
        { ok: false, error: "revoked", message: "This invitation has been revoked by an administrator." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const expiresAt = new Date(inv.expires_at as string);
    if (expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: "expired", message: "This activation link has expired. Please contact support or request a new invitation." },
        { status: 410, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Token is valid and ready for password setup. DO NOT CONSUME ON GET.
    return NextResponse.json(
      {
        ok: true,
        email: inv.email,
        status: "valid",
        expiresAt: inv.expires_at,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("activation check error", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Unable to verify activation link." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

/**
 * POST: Atomically consumes the single-use activation token and provisions
 * the user's password credential into the canonical NASJ platform backend.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await parseJson(request)) as {
      token?: string;
      password?: string;
    };

    const token = body.token?.trim();
    const password = body.password;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "missing_token", message: "Activation token is required." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const pwValidation = validatePasswordStrength(password || "");
    if (!pwValidation.valid) {
      return NextResponse.json(
        { ok: false, error: "weak_password", message: pwValidation.message },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const tokenHash = hashActivationToken(token);
    const sql = getDatabase();

    // Atomic update: only succeeds if status = 'pending' AND not expired
    const updateResult = await sql`
      UPDATE account_invitations
      SET
        status = 'consumed',
        consumed_at = now(),
        updated_at = now()
      WHERE token_hash = ${tokenHash}
        AND status = 'pending'
        AND expires_at > now()
      RETURNING id, application_id, email, platform_user_id
    `;

    // If update did not affect any rows, check reason for clear error response
    if (!updateResult || updateResult.length === 0) {
      const check = await sql`
        SELECT status, expires_at, consumed_at, revoked_at
        FROM account_invitations
        WHERE token_hash = ${tokenHash}
      `;

      if (!check || check.length === 0) {
        return NextResponse.json(
          { ok: false, error: "invalid", message: "Invalid activation link." },
          { status: 404, headers: { "Cache-Control": "no-store" } }
        );
      }

      const inv = check[0];
      if (inv.status === "consumed" || inv.consumed_at) {
        return NextResponse.json(
          { ok: false, error: "already_used", message: "This activation token has already been consumed. Please sign in." },
          { status: 409, headers: { "Cache-Control": "no-store" } }
        );
      }

      if (inv.status === "revoked" || inv.revoked_at) {
        return NextResponse.json(
          { ok: false, error: "revoked", message: "This invitation was revoked." },
          { status: 403, headers: { "Cache-Control": "no-store" } }
        );
      }

      if (new Date(inv.expires_at as string).getTime() <= Date.now()) {
        return NextResponse.json(
          { ok: false, error: "expired", message: "This activation link has expired." },
          { status: 410, headers: { "Cache-Control": "no-store" } }
        );
      }

      // Race condition / concurrent request caught here
      return NextResponse.json(
        { ok: false, error: "conflict", message: "Activation request conflict; token may have already been consumed." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const invitation = updateResult[0];

    // Hash password with Better Auth compatible scrypt format
    const passwordHash = await hashPasswordForBetterAuth(password!);

    // Provision credential in canonical NASJ platform
    await activatePlatformUser({
      userId: invitation.platform_user_id as string,
      email: invitation.email as string,
      passwordHash,
      applicantId: invitation.application_id as string,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Your NASJ account has been activated successfully. You can now sign in.",
        email: invitation.email,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("activation execution error", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Could not complete account activation." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
