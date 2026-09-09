import type { Request } from "express";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { ENV } from "./env";

export type SessionPayload = { openId: string; name: string };

function getSecret() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is not configured.");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(openId: string, name: string, expiresInMs = ONE_YEAR_MS) {
  return new SignJWT({ openId, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1000))
    .sign(getSecret());
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.openId !== "string" || typeof payload.name !== "string") return null;
    return { openId: payload.openId, name: payload.name };
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const token = cookies[COOKIE_NAME] ?? (typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined);
  const session = await verifySession(token);
  if (!session) throw ForbiddenError("Invalid session cookie");

  const user = await db.getUserByOpenId(session.openId);
  if (!user) throw ForbiddenError("User not found");
  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  return user;
}
