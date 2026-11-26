import type { Request } from "express";
import { describe, expect, it } from "vitest";
import {
  createLocalAdminSessionToken,
  isLocalAdminEnabled,
  isLocalAdminRequest,
  LOCAL_ADMIN_SESSION_TTL_MS,
  verifyLocalAdminSessionToken,
} from "./localAdmin";

function fakeRequest(hostname: string, remoteAddress: string): Pick<Request, "hostname" | "socket"> {
  return { hostname, socket: { remoteAddress } } as unknown as Pick<Request, "hostname" | "socket">;
}

describe("local administrator authentication", () => {
  it("is enabled only in development when both credentials are configured", () => {
    expect(isLocalAdminEnabled({ NODE_ENV: "development", LOCAL_ADMIN_USERNAME: "admin", LOCAL_ADMIN_PASSWORD: "unit-test-password" })).toBe(true);
    expect(isLocalAdminEnabled({ NODE_ENV: "production", LOCAL_ADMIN_USERNAME: "admin", LOCAL_ADMIN_PASSWORD: "unit-test-password" })).toBe(false);
    expect(isLocalAdminEnabled({ NODE_ENV: "development", LOCAL_ADMIN_USERNAME: "admin" })).toBe(false);
  });

  it("accepts loopback requests and rejects LAN hosts or remote clients", () => {
    expect(isLocalAdminRequest(fakeRequest("localhost", "::1"))).toBe(true);
    expect(isLocalAdminRequest(fakeRequest("127.0.0.1", "::ffff:127.0.0.1"))).toBe(true);
    expect(isLocalAdminRequest(fakeRequest("192.168.1.25", "192.168.1.20"))).toBe(false);
    expect(isLocalAdminRequest(fakeRequest("localhost", "192.168.1.20"))).toBe(false);
  });

  it("accepts a valid unexpired signed session and rejects tampering or expiration", () => {
    const secret = Buffer.alloc(32, 7);
    const now = 1_000;
    const token = createLocalAdminSessionToken(now, secret);
    const [payload, signature] = token.split(".");
    const tampered = `${payload}.${signature?.replace(/^./, character => character === "A" ? "B" : "A")}`;

    expect(verifyLocalAdminSessionToken(token, now + 1, secret)).toBe(true);
    expect(verifyLocalAdminSessionToken(token, now + LOCAL_ADMIN_SESSION_TTL_MS, secret)).toBe(false);
    expect(verifyLocalAdminSessionToken(tampered, now + 1, secret)).toBe(false);
  });
});
