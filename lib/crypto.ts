import "server-only";
import crypto from "node:crypto";
import { promisify } from "node:util";

function scryptAsync(
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

/**
 * Generates a cryptographically secure random activation token (256 bits).
 */
export function generateActivationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes the SHA-256 cryptographic hash of a token.
 * Only this hash is stored in the database.
 */
export function hashActivationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Constant-time comparison between two secret strings to prevent timing attacks.
 */
export function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Perform dummy comparison to keep constant timing
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Hashes a password according to Better Auth's scrypt specification:
 * N = 16384, r = 16, p = 1, dkLen = 64.
 * Output format: "salt:hash" in lowercase hex.
 */
export async function hashPasswordForBetterAuth(password: string): Promise<string> {
  const normalized = password.normalize("NFKC");
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(normalized, salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  })) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a password against a Better Auth scrypt hash.
 */
export async function verifyPasswordForBetterAuth(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, expectedKeyHex] = storedHash.split(":");
    if (!salt || !expectedKeyHex) return false;

    const normalized = password.normalize("NFKC");
    const derivedKey = (await scryptAsync(normalized, salt, 64, {
      N: 16384,
      r: 16,
      p: 1,
      maxmem: 128 * 16384 * 16 * 2,
    })) as Buffer;

    return secureCompare(derivedKey.toString("hex"), expectedKeyHex);
  } catch {
    return false;
  }
}

/**
 * Validates password strength according to the platform rules:
 * - Minimum 12 characters
 * - Maximum 128 characters
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (typeof password !== "string") {
    return { valid: false, message: "Password is required." };
  }
  if (password.length < 12) {
    return { valid: false, message: "Password must be at least 12 characters long." };
  }
  if (password.length > 128) {
    return { valid: false, message: "Password cannot exceed 128 characters." };
  }
  return { valid: true };
}
