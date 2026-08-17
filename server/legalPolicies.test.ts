import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("legal policies and purchase consent", () => {
  const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
  const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
  const legal = readFileSync(resolve(process.cwd(), "client/src/pages/LegalPage.tsx"), "utf8");

  it("registers the three public legal routes", () => {
    expect(app).toContain('path="/privacy"');
    expect(app).toContain('path="/terms"');
    expect(app).toContain('path="/digital-files"');
  });

  it("requires explicit policy consent before submitting a transfer request", () => {
    expect(home).toContain("transferConsent");
    expect(home).toContain("!transferConsent");
    expect(home).toContain('href="/privacy"');
    expect(home).toContain('href="/terms"');
    expect(home).toContain('href="/digital-files"');
    expect(home).toContain("createTransferRequest.isPending || !transferConsent");
  });

  it("contains operational privacy, terms, and digital-file policy content", () => {
    expect(legal).toContain("المعلومات التي نجمعها");
    expect(legal).toContain("الملكية الفكرية");
    expect(legal).toContain("عدم الاسترداد بعد التسليم");
    expect(legal).toContain("إرسال ملف غير صحيح");
  });
});
