import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseJson } from "@/lib/submission";
import { provisionPlatformUser } from "@/lib/platform-db";
import { generateActivationToken, hashActivationToken } from "@/lib/crypto";
import { enqueueOutboxItem, dispatchOutboxItem } from "@/lib/outbox";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, message: auth.error }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 100);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const sql = getDatabase();
    let rows;
    if (status) {
      rows = await sql`
        SELECT
          a.id, a.full_name, a.email, a.participant_role, a.organization, a.location,
          a.testing_interest, a.status, a.platform_user_id, a.approved_at, a.declined_at, a.created_at,
          i.id AS invitation_id, i.status AS invitation_status, i.expires_at AS invitation_expires_at
        FROM early_access_applications a
        LEFT JOIN account_invitations i ON i.application_id = a.id
        WHERE a.status = ${status}
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      rows = await sql`
        SELECT
          a.id, a.full_name, a.email, a.participant_role, a.organization, a.location,
          a.testing_interest, a.status, a.platform_user_id, a.approved_at, a.declined_at, a.created_at,
          i.id AS invitation_id, i.status AS invitation_status, i.expires_at AS invitation_expires_at
        FROM early_access_applications a
        LEFT JOIN account_invitations i ON i.application_id = a.id
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return NextResponse.json({
      ok: true,
      items: rows,
      count: rows.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("admin get applicants failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false, message: "Database error retrieving applicants." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, message: auth.error }, { status: auth.status || 401 });
  }

  try {
    const body = (await parseJson(request)) as {
      id?: string;
      action?: "approve" | "decline";
      reason?: string;
    };

    if (!body.id || !body.action || !["approve", "decline"].includes(body.action)) {
      return NextResponse.json(
        { ok: false, message: "Valid applicant id and action ('approve' | 'decline') required." },
        { status: 400 }
      );
    }

    const sql = getDatabase();
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

    // 1. Verify eligibility
    const appRows = await sql`
      SELECT id, full_name, email, participant_role, status, platform_user_id
      FROM early_access_applications
      WHERE id = ${body.id}
    `;

    if (!appRows || appRows.length === 0) {
      return NextResponse.json({ ok: false, message: "Applicant not found." }, { status: 404 });
    }

    const applicant = appRows[0];

    if (body.action === "decline") {
      await sql`
        UPDATE early_access_applications
        SET status = 'declined', declined_at = now(), declined_by = ${auth.adminIdentifier!}
        WHERE id = ${applicant.id}
      `;

      await sql`
        INSERT INTO applicant_approvals (application_id, action, admin_identifier, reason, ip_address)
        VALUES (${applicant.id}, 'declined', ${auth.adminIdentifier!}, ${body.reason || null}, ${clientIp})
      `;

      return NextResponse.json({
        ok: true,
        applicantId: applicant.id,
        action: "declined",
        status: "declined",
      });
    }

    // Action: APPROVE
    if (applicant.status !== "pending" && applicant.status !== "reviewing") {
      return NextResponse.json(
        {
          ok: false,
          message: `Applicant is in status '${applicant.status}' and cannot be approved.`,
        },
        { status: 400 }
      );
    }

    // 2. Coordinate account provisioning with real NASJ authentication backend
    let platformUser;
    try {
      platformUser = await provisionPlatformUser({
        name: applicant.full_name as string,
        email: applicant.email as string,
      });
    } catch (platformErr) {
      console.error("Platform provisioning error:", platformErr instanceof Error ? platformErr.message : "unknown");
      return NextResponse.json(
        { ok: false, message: "Could not coordinate user provisioning with NASJ platform backend." },
        { status: 502 }
      );
    }

    // 3. Create secure single-use activation token & cryptographic hash
    const rawToken = generateActivationToken();
    const tokenHash = hashActivationToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    // 4. Store invitation in Neon
    const invRows = await sql`
      INSERT INTO account_invitations
        (application_id, email, token_hash, status, expires_at, platform_user_id)
      VALUES
        (${applicant.id}, ${applicant.email}, ${tokenHash}, 'pending', ${expiresAt.toISOString()}, ${platformUser.id})
      RETURNING id, status, expires_at
    `;
    const invitation = invRows[0];

    // 5. Update application status and linkage
    await sql`
      UPDATE early_access_applications
      SET
        status = 'invited',
        platform_user_id = ${platformUser.id},
        approved_at = now(),
        approved_by = ${auth.adminIdentifier!}
      WHERE id = ${applicant.id}
    `;

    // 6. Record administrator audit log
    await sql`
      INSERT INTO applicant_approvals
        (application_id, action, admin_identifier, reason, ip_address)
      VALUES
        (${applicant.id}, 'approved', ${auth.adminIdentifier!}, ${body.reason || null}, ${clientIp})
    `;

    // 7. Enqueue invitation email via Resend
    const platformUrl = process.env.NEXT_PUBLIC_NASJ_PLATFORM_URL || "https://nasj-platform.ddns.net";
    const activationUrl = `${platformUrl}/auth/activate?token=${rawToken}`;
    const idempotencyKey = `alpha_inv_${invitation.id}`;

    const outbox = await enqueueOutboxItem({
      recipientEmail: applicant.email as string,
      templateType: "welcome_email",
      payload: {
        fullName: applicant.full_name as string,
        email: applicant.email as string,
        role: applicant.participant_role as string,
      },
      idempotencyKey,
    });

    // Trigger dispatch asynchronously
    dispatchOutboxItem(outbox.id).catch((err) => {
      console.error("Invitation outbox dispatch error:", err instanceof Error ? err.name : "unknown");
    });

    return NextResponse.json({
      ok: true,
      applicantId: applicant.id,
      platformUserId: platformUser.id,
      invitationId: invitation.id,
      action: "approved",
      status: "invited",
    });
  } catch (error) {
    console.error("admin review error", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false, message: "Failed to process applicant review." }, { status: 500 });
  }
}
