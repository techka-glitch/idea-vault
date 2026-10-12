import crypto from "crypto";

// Single shared password, not a real multi-user auth system. A signed
// cookie (HMAC over an expiry timestamp) proves the visitor entered the
// correct password without needing a session store.
const COOKIE_NAME = "ideas_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable.");
  }
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSessionCookieValue(): string {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${expires}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function isValidSessionCookieValue(value: string | undefined): boolean {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  if (sign(payload) !== signature) return false;

  const expires = parseInt(payload, 10);
  if (Number.isNaN(expires) || expires < Date.now()) return false;

  return true;
}

export function checkPassword(candidate: string): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    throw new Error("Missing APP_PASSWORD environment variable.");
  }
  // Constant-time-ish comparison to avoid trivial timing leaks.
  const a = Buffer.from(candidate);
  const b = Buffer.from(appPassword);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
