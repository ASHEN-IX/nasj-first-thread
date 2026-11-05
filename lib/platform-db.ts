import "server-only";
import pg from "pg";
import crypto from "node:crypto";
import { verifyPasswordForBetterAuth } from "@/lib/crypto";

let pool: pg.Pool | null = null;

export function getPlatformPool(): pg.Pool {
  if (!pool) {
    const connectionString =
      process.env.PLATFORM_DATABASE_URL ||
      "postgresql://nasj:415beb53e3a2720f89a227d838b9d6b3858348743e1ffa4b@127.0.0.1:5442/nasj";
    pool = new pg.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  status: string;
  role: string;
}

/**
 * Coordinates user account provisioning in the real NASJ authentication backend.
 * Checks if the user already exists; if not, creates a User row with status ACTIVE and emailVerified = false.
 */
export async function provisionPlatformUser(data: {
  name: string;
  email: string;
}): Promise<PlatformUser> {
  const p = getPlatformPool();
  const normalizedEmail = data.email.trim().toLowerCase();

  // Check if user already exists
  const existing = await p.query<PlatformUser>(
    'SELECT id, name, email, "emailVerified", status, role FROM "User" WHERE email = $1',
    [normalizedEmail]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Provision new user record in canonical NASJ platform
  const id = crypto.randomUUID();
  const now = new Date();
  const result = await p.query<PlatformUser>(
    `INSERT INTO "User"
      (id, name, email, "emailVerified", role, status, "preferredLanguage", "createdAt", "updatedAt")
     VALUES
      ($1, $2, $3, false, 'USER', 'ACTIVE', 'en', $4, $4)
     RETURNING id, name, email, "emailVerified", status, role`,
    [id, data.name.trim(), normalizedEmail, now]
  );

  return result.rows[0];
}

/**
 * Activates an account in the canonical NASJ authentication backend.
 * Sets emailVerified = true, provisions/updates credential Account with the scrypt password hash,
 * revokes any existing sessions, and writes an AuditEvent.
 */
export async function activatePlatformUser(data: {
  userId: string;
  email: string;
  passwordHash: string;
  applicantId?: string;
}): Promise<{ success: boolean; userId: string }> {
  const p = getPlatformPool();
  const client = await p.connect();

  try {
    await client.query("BEGIN");

    const now = new Date();

    // 1. Mark User email as verified and status ACTIVE
    await client.query(
      `UPDATE "User"
       SET "emailVerified" = true, status = 'ACTIVE', "updatedAt" = $1
       WHERE id = $2`,
      [now, data.userId]
    );

    // 2. Upsert credential Account record
    const accountCheck = await client.query(
      'SELECT id FROM "Account" WHERE "userId" = $1 AND "providerId" = $2',
      [data.userId, "credential"]
    );

    if (accountCheck.rows.length > 0) {
      await client.query(
        `UPDATE "Account"
         SET password = $1, "updatedAt" = $2
         WHERE id = $3`,
        [data.passwordHash, now, accountCheck.rows[0].id]
      );
    } else {
      const accountId = crypto.randomUUID();
      await client.query(
        `INSERT INTO "Account"
          (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES
          ($1, $2, 'credential', $2, $3, $4, $4)`,
        [accountId, data.userId, data.passwordHash, now]
      );
    }

    // 3. Invalidate any existing sessions
    await client.query('DELETE FROM "Session" WHERE "userId" = $1', [data.userId]);

    // 4. Record audit event in canonical platform
    const auditId = crypto.randomUUID();
    const correlationId = crypto.randomUUID();
    await client.query(
      `INSERT INTO "AuditEvent"
        (id, "actorId", action, "targetType", "targetId", "correlationId", timestamp, after)
       VALUES
        ($1, $2, 'ACCOUNT_ACTIVATED', 'User', $2, $3, $4, $5)`,
      [
        auditId,
        data.userId,
        correlationId,
        now,
        JSON.stringify({
          email: data.email,
          onboardingSource: "the_first_thread_alpha",
          applicantId: data.applicantId ?? null,
        }),
      ]
    );

    await client.query("COMMIT");
    return { success: true, userId: data.userId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Validates credentials against the canonical NASJ platform (for testing login verification).
 */
export async function verifyPlatformLogin(data: {
  email: string;
  password: string;
}): Promise<{ ok: boolean; user?: PlatformUser; error?: string }> {
  const p = getPlatformPool();
  const normalizedEmail = data.email.trim().toLowerCase();

  const userRes = await p.query<PlatformUser>(
    'SELECT id, name, email, "emailVerified", status, role FROM "User" WHERE email = $1',
    [normalizedEmail]
  );

  if (userRes.rows.length === 0) {
    return { ok: false, error: "User not found" };
  }

  const user = userRes.rows[0];
  if (user.status !== "ACTIVE") {
    return { ok: false, error: "Account suspended or disabled" };
  }
  if (!user.emailVerified) {
    return { ok: false, error: "Email not verified" };
  }

  const accountRes = await p.query<{ password: string }>(
    'SELECT password FROM "Account" WHERE "userId" = $1 AND "providerId" = $2',
    [user.id, "credential"]
  );

  if (accountRes.rows.length === 0 || !accountRes.rows[0].password) {
    return { ok: false, error: "No password credential configured" };
  }

  const isValid = await verifyPasswordForBetterAuth(data.password, accountRes.rows[0].password);
  if (!isValid) {
    return { ok: false, error: "Invalid password" };
  }

  return { ok: true, user };
}
