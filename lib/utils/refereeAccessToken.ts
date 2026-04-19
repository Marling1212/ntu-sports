import { createHmac, timingSafeEqual } from "crypto";

type RefereeTokenPayload = {
  eventId: string;
  userId: string;
  exp: number;
};

/** Default when event setting is missing or invalid */
export const DEFAULT_REFEREE_LINK_TTL_DAYS = 14;
export const MAX_REFEREE_LINK_TTL_DAYS = 365;

export function clampRefereeLinkTtlDays(days: unknown): number {
  const n = Math.round(Number(days));
  if (!Number.isFinite(n)) return DEFAULT_REFEREE_LINK_TTL_DAYS;
  return Math.min(MAX_REFEREE_LINK_TTL_DAYS, Math.max(1, n));
}

function ttlSecondsFromDays(days: number) {
  return clampRefereeLinkTtlDays(days) * 60 * 60 * 24;
}

function base64urlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64urlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSecret() {
  return process.env.REFEREE_PORTAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function signPayload(payloadB64: string, secret: string) {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function createRefereeAccessToken(
  eventId: string,
  userId: string,
  ttlDays: number = DEFAULT_REFEREE_LINK_TTL_DAYS
) {
  const secret = getSecret();
  if (!secret) {
    throw new Error("Missing REFEREE_PORTAL_SECRET (or SUPABASE_SERVICE_ROLE_KEY fallback)");
  }

  const payload: RefereeTokenPayload = {
    eventId,
    userId,
    exp: Math.floor(Date.now() / 1000) + ttlSecondsFromDays(ttlDays),
  };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const sig = signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export function verifyRefereeAccessToken(token: string): RefereeTokenPayload | null {
  const secret = getSecret();
  if (!secret) return null;

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = signPayload(payloadB64, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(base64urlDecode(payloadB64)) as RefereeTokenPayload;
    if (!payload?.eventId || !payload?.userId || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
