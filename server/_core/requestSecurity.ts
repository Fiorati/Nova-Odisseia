import type { NextFunction, Request, Response } from "express";

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Mutações do navegador devem partir do mesmo host do aplicativo. Contextos de
 * teste e chamadas internas não possuem host e ficam fora desta verificação.
 */
export function hasTrustedMutationOrigin(req: Pick<Request, "headers">) {
  const headers = req.headers ?? {};
  const host = headerValue(headers["x-forwarded-host"] as string | string[] | undefined) ?? headerValue(headers.host);
  if (!host) return true;
  const origin = headerValue(headers.origin);
  if (!origin) return false;
  try {
    return new URL(origin).host === host.split(",")[0]?.trim();
  } catch {
    return false;
  }
}

/** Bloqueia cedo tentativas cross-site antes da leitura do corpo das mutações tRPC. */
export function rejectUntrustedTrpcMutationOrigin(req: Request, res: Response, next: NextFunction) {
  if (req.method === "POST" && req.path.startsWith("/api/trpc") && !hasTrustedMutationOrigin(req)) {
    res.status(403).json({ error: "Origem da requisição não autorizada." });
    return;
  }
  next();
}

type Attempt = { count: number; startedAt: number };
const authAttempts = new Map<string, Attempt>();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS_PER_WINDOW = 20;

function requestIp(req: Request) {
  return headerValue(req.headers["x-forwarded-for"] as string | string[] | undefined)?.split(",")[0]?.trim() || req.ip || "unknown";
}

/** Limita tentativas de login, cadastro e recuperação por origem, sem expor se há conta para um e-mail. */
export function limitSensitiveAuthMutations(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "POST" || !/^\/api\/trpc\/auth\.(login|register|requestRegistrationCode|completeRegistration|requestPasswordReset|verifyPasswordReset|resetPassword)$/.test(req.path)) {
    next();
    return;
  }
  const key = `${requestIp(req)}:${req.path}`;
  const now = Date.now();
  const attempt = authAttempts.get(key);
  const current = !attempt || now - attempt.startedAt > AUTH_WINDOW_MS ? { count: 0, startedAt: now } : attempt;
  current.count += 1;
  authAttempts.set(key, current);
  if (current.count > MAX_AUTH_ATTEMPTS_PER_WINDOW) {
    res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." });
    return;
  }
  next();
}

function analyticsOrigin() {
  try {
    return process.env.VITE_ANALYTICS_ENDPOINT ? new URL(process.env.VITE_ANALYTICS_ENDPOINT).origin : "";
  } catch {
    return "";
  }
}

export function applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
  const analytics = analyticsOrigin();
  const analyticsSource = analytics ? ` ${analytics}` : "";
  res.setHeader("Content-Security-Policy", process.env.NODE_ENV === "production"
    ? `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'${analyticsSource}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'${analyticsSource} https://api.brasilapi.com.br; frame-src 'none'`
    : "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}
