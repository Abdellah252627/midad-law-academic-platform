import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("purchase rating reminder", () => {
  it("shows a clear reminder and keeps the rating link tied to the submitted order", () => {
    expect(homeSource).toContain("تذكير بالتقييم");
    expect(homeSource).toContain("بعد تأكيد الدفع وظهور الملف");
    expect(homeSource).toContain("href={`/rate/${transferSent}`}");
  });

  it("renders the reminder only in the submitted-order state", () => {
    const submittedStateStart = homeSource.indexOf("{transferSent ? (");
    const pendingStateStart = homeSource.indexOf(") : !showBankDetails ? (");
    const reminderPosition = homeSource.indexOf("تذكير بالتقييم");

    expect(submittedStateStart).toBeGreaterThanOrEqual(0);
    expect(pendingStateStart).toBeGreaterThan(submittedStateStart);
    expect(reminderPosition).toBeGreaterThan(submittedStateStart);
    expect(reminderPosition).toBeLessThan(pendingStateStart);
  });
});

