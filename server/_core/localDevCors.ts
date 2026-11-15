import type { Express } from "express";

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = parts;
  return first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

export function isAllowedLocalExpoWebOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" || url.port !== "8081" || url.origin !== origin) return false;
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "::1"
      || isPrivateIpv4(hostname);
  } catch {
    return false;
  }
}

export function registerLocalExpoWebCors(app: Express): void {
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (process.env.NODE_ENV !== "development" || !origin) return next();

    if (!isAllowedLocalExpoWebOrigin(origin)) {
      if (req.method === "OPTIONS") return res.sendStatus(403);
      return next();
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "600");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  });
}
