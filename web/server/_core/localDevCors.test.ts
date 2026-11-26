import { describe, expect, it } from "vitest";
import { isAllowedLocalExpoWebOrigin } from "./localDevCors";

describe("local Expo Web CORS origins", () => {
  it("allows the local Expo Web origin and private-LAN Expo hosts on port 8081", () => {
    expect(isAllowedLocalExpoWebOrigin("http://localhost:8081")).toBe(true);
    expect(isAllowedLocalExpoWebOrigin("http://127.0.0.1:8081")).toBe(true);
    expect(isAllowedLocalExpoWebOrigin("http://[::1]:8081")).toBe(true);
    expect(isAllowedLocalExpoWebOrigin("http://192.168.0.10:8081")).toBe(true);
    expect(isAllowedLocalExpoWebOrigin("http://10.0.0.8:8081")).toBe(true);
    expect(isAllowedLocalExpoWebOrigin("http://172.31.4.2:8081")).toBe(true);
  });

  it("rejects public hosts, non-HTTP origins, other ports and malformed values", () => {
    expect(isAllowedLocalExpoWebOrigin("http://quadrapass.example:8081")).toBe(false);
    expect(isAllowedLocalExpoWebOrigin("https://localhost:8081")).toBe(false);
    expect(isAllowedLocalExpoWebOrigin("http://localhost:3000")).toBe(false);
    expect(isAllowedLocalExpoWebOrigin("not-an-origin")).toBe(false);
  });
});
