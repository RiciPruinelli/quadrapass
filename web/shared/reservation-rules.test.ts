import { describe, expect, it } from "vitest";
import {
  hasTimeOverlap,
  isValidCalendarDate,
  isValidCalendarMonth,
} from "./reservation-rules";

describe("reservation date rules", () => {
  it("accepts a real calendar date", () => {
    expect(isValidCalendarDate("2026-11-25")).toBe(true);
  });

  it("accepts leap day only in a leap year", () => {
    expect(isValidCalendarDate("2024-02-29")).toBe(true);
    expect(isValidCalendarDate("2026-02-29")).toBe(false);
  });

  it("rejects impossible dates and malformed formats", () => {
    expect(isValidCalendarDate("2026-04-31")).toBe(false);
    expect(isValidCalendarDate("25/11/2026")).toBe(false);
  });

  it("accepts months from 01 through 12 only", () => {
    expect(isValidCalendarMonth("2026-01")).toBe(true);
    expect(isValidCalendarMonth("2026-12")).toBe(true);
    expect(isValidCalendarMonth("2026-00")).toBe(false);
    expect(isValidCalendarMonth("2026-13")).toBe(false);
  });
});

describe("reservation interval conflicts", () => {
  const existing = [{ startTime: "07:30", endTime: "08:30" }];

  it("detects partial and containing overlaps", () => {
    expect(hasTimeOverlap(existing, "08:00", "09:00")).toBe(true);
    expect(hasTimeOverlap(existing, "07:00", "09:00")).toBe(true);
    expect(hasTimeOverlap(existing, "07:45", "08:00")).toBe(true);
  });

  it("allows adjacent intervals without an overlap", () => {
    expect(hasTimeOverlap(existing, "06:30", "07:30")).toBe(false);
    expect(hasTimeOverlap(existing, "08:30", "09:00")).toBe(false);
  });

  it("allows any interval when the date has no active reservations", () => {
    expect(hasTimeOverlap([], "07:00", "08:00")).toBe(false);
  });
});
