import { describe, expect, it } from "vitest";
import { getSupportStatusLabel, isSupportAvailable } from "@shared/supportAvailability";

describe("support availability", () => {
  it("is available at the opening boundary in Morocco time", () => {
    expect(isSupportAvailable(new Date("2026-01-15T08:00:00.000Z"))).toBe(true);
    expect(getSupportStatusLabel(new Date("2026-01-15T08:00:00.000Z"))).toBe("متاح الآن");
  });

  it("is unavailable at and after the closing boundary", () => {
    expect(isSupportAvailable(new Date("2026-01-15T19:00:00.000Z"))).toBe(false);
    expect(getSupportStatusLabel(new Date("2026-01-15T19:00:00.000Z"))).toBe("خارج أوقات العمل");
  });

  it("is unavailable before opening", () => {
    expect(isSupportAvailable(new Date("2026-01-15T07:59:00.000Z"))).toBe(false);
  });
});
