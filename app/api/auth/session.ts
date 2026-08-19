import * as cookie from "cookie";
import * as jose from "jose";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { findUserByUnionId } from "../queries/users";

export type SessionPayload = { unionId: string; clientId: string };
const JWT_ALG = "HS256";

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("1 year")
    .sign(secret);
}

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = new TextEncoder().encode(env.appSecret);
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: [JWT_ALG] });
    if (!payload.unionId || !payload.clientId) return null;
    return { unionId: String(payload.unionId), clientId: String(payload.clientId) };
  } catch {
    return null;
  }
}

export async function authenticateRequest(headers: Headers) {
  const token = cookie.parse(headers.get("cookie") || "")[Session.cookieName];
  const claim = token ? await verifySessionToken(token) : null;
  if (!claim) throw Errors.forbidden("Invalid authentication token.");
  const user = await findUserByUnionId(claim.unionId);
  if (!user) throw Errors.forbidden("User not found. Please log in again.");
  return user;
}

export function serializeSessionCookie(headers: Headers, token: string) {
  const opts = getSessionCookieOptions(headers);
  return cookie.serialize(Session.cookieName, token, {
    httpOnly: opts.httpOnly,
    path: opts.path,
    secure: opts.secure,
    sameSite: opts.sameSite?.toLowerCase() as "lax" | "none" | "strict",
    maxAge: Session.maxAgeMs / 1000,
  });
}
