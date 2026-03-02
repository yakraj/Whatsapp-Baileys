/**
 * Admin session helpers.
 *
 * • hashPassword / verifyPassword   — scrypt-based password hashing
 * • signSession / verifySession     — JWT for the httpOnly cookie
 * • SESSION_COOKIE                  — cookie name constant
 */

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// ─── constants ────────────────────────────────────────────────────────────────

export { SESSION_COOKIE };
const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ─── password helpers ─────────────────────────────────────────────────────────

/**
 * Hash a plaintext password with scrypt + a random salt.
 * Returns a "salt:hash" string safe to store in the database.
 */
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Compare a plaintext password against a stored "salt:hash" string.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) return false;
  try {
    const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(expectedHash, "hex"),
    );
  } catch {
    return false;
  }
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  username: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

// ─── server-side cookie helpers ───────────────────────────────────────────────

/** Read & verify the session cookie. Returns null if missing / invalid. */
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Build the Set-Cookie header value for the session cookie. */
export function buildSetCookieHeader(token: string): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "SameSite=Lax",
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

/** Build the Set-Cookie header that clears the session cookie. */
export function buildClearCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
