import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, Request } from "express";
import { parse as parseCookieHeader } from "cookie";
import type { User } from "../../drizzle/schema";

export const LOCAL_ADMIN_COOKIE = "qp_local_admin";
export const LOCAL_ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const localSessionSecret = randomBytes(32);

export function isLocalAdminEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "development"
    && Boolean(env.LOCAL_ADMIN_USERNAME)
    && Boolean(env.LOCAL_ADMIN_PASSWORD);
}

export function isLocalAdminRequest(req: Pick<Request, "hostname" | "socket">): boolean {
  const hostname = req.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const remoteAddress = req.socket.remoteAddress?.toLowerCase().replace(/^::ffff:/, "");
  const localHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const localAddress = remoteAddress === "127.0.0.1" || remoteAddress === "::1";
  return localHost && localAddress;
}

function safeStringEqual(value: unknown, expected: string | undefined): boolean {
  if (typeof value !== "string" || typeof expected !== "string") return false;
  const valueBytes = Buffer.from(value, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return valueBytes.length === expectedBytes.length && timingSafeEqual(valueBytes, expectedBytes);
}

export function createLocalAdminSessionToken(
  now = Date.now(),
  secret: Uint8Array = localSessionSecret,
): string {
  const payload = Buffer.from(JSON.stringify({ sub: "local-admin", exp: now + LOCAL_ADMIN_SESSION_TTL_MS }))
    .toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyLocalAdminSessionToken(
  token: string,
  now = Date.now(),
  secret: Uint8Array = localSessionSecret,
): boolean {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  const expectedSignature = createHmac("sha256", secret).update(payload).digest();
  const actualSignature = Buffer.from(signature, "base64url");
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown; exp?: unknown };
    return data.sub === "local-admin" && typeof data.exp === "number" && Number.isSafeInteger(data.exp) && data.exp > now;
  } catch {
    return false;
  }
}

function hasSameOriginIfProvided(req: Request): boolean {
  const origin = req.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() === req.get("host")?.toLowerCase();
  } catch {
    return false;
  }
}

export function getLocalAdminUser(req: Request): User | null {
  if (!isLocalAdminEnabled() || !isLocalAdminRequest(req)) return null;

  try {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const token = cookies[LOCAL_ADMIN_COOKIE];
    if (!token || !verifyLocalAdminSessionToken(token)) return null;
  } catch {
    return null;
  }

  const now = new Date();
  return {
    id: 0,
    openId: "local-admin-test",
    name: process.env.LOCAL_ADMIN_USERNAME ?? "admin",
    email: null,
    loginMethod: "local-development",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export function registerLocalAdminRoutes(app: Express): void {
  app.post("/api/local-admin/login", (req, res) => {
    if (!isLocalAdminEnabled() || !isLocalAdminRequest(req) || !hasSameOriginIfProvided(req)) {
      return res.status(404).json({ message: "Login local indisponível." });
    }

    const body = req.body as { username?: unknown; password?: unknown } | undefined;
    const validUsername = safeStringEqual(body?.username, process.env.LOCAL_ADMIN_USERNAME);
    const validPassword = safeStringEqual(body?.password, process.env.LOCAL_ADMIN_PASSWORD);
    if (!validUsername || !validPassword) {
      return res.status(401).json({ message: "Usuário ou senha inválidos." });
    }

    const token = createLocalAdminSessionToken();
    res.cookie(LOCAL_ADMIN_COOKIE, token, {
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      secure: false,
      maxAge: LOCAL_ADMIN_SESSION_TTL_MS,
    });
    return res.json({ success: true });
  });

  app.post("/api/local-admin/logout", (req, res) => {
    if (!isLocalAdminRequest(req) || !hasSameOriginIfProvided(req)) {
      return res.status(404).json({ message: "Login local indisponível." });
    }
    res.clearCookie(LOCAL_ADMIN_COOKIE, { httpOnly: true, path: "/", sameSite: "strict", secure: false });
    return res.json({ success: true });
  });
}
