import { describe, expect, it } from "vitest";
import { formatSupportCountdown, getSupportCountdownSeconds, getSupportStatusLabel, isSupportAvailable } from "@shared/supportAvailability";

describe("support availability", () => {
  it("is available at the opening boundary in Morocco time", () => {
    expect(isSupportAvailable(new Date("2026-01-15T08:00:00.000Z"))).toBe(true);
    expect(getSupportStatusLabel(new Date("2026-01-15T08:00:00.000Z"))).toBe("متاح الآن");
  });

  it("is unavailable at and after the closing boundary", () => {
    expect(isSupportAvailable(new Date("2026-01-15T19:00:00.000Z"))).toBe(false);
    expect(getSupportStatusLabel(new Date("2026-01-15T19:00:00.000Z"))).toBe("خارج أوقات العمل");
  });

  it("is unavailable before opening and counts down to 09:00", () => {
    const beforeOpening = new Date("2026-01-15T07:59:00.000Z");
    expect(isSupportAvailable(beforeOpening)).toBe(false);
    expect(getSupportCountdownSeconds(beforeOpening)).toBe(60);
    expect(formatSupportCountdown(beforeOpening)).toBe("يفتح الدعم بعد 0س 1د 0ث");
  });

  it("counts down to the next day after closing", () => {
    const afterClosing = new Date("2026-01-15T19:00:00.000Z");
    expect(getSupportCountdownSeconds(afterClosing)).toBe(13 * 3600);
  });

  it("returns no countdown while support is available", () => {
    expect(getSupportCountdownSeconds(new Date("2026-01-15T12:00:00.000Z"))).toBe(0);
    expect(formatSupportCountdown(new Date("2026-01-15T12:00:00.000Z"))).toBe("متاح الآن");
  });
});
