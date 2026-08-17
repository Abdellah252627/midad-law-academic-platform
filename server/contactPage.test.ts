import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const pageSource = readFileSync(resolve(projectRoot, "client/src/pages/ContactPage.tsx"), "utf8");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");

describe("contact and complaints page", () => {
  it("registers a public contact route", () => {
    expect(appSource).toContain('path="/contact" component={ContactPage}');
  });

  it("uses the approved WhatsApp number and safe external-link attributes", () => {
    expect(pageSource).toContain("212664173090");
    expect(pageSource).toContain('target="_blank"');
    expect(pageSource).toContain('rel="noreferrer"');
    expect(pageSource).toContain("فتح محادثة واتساب");
  });

  it("exposes contact access from the landing-page footer", () => {
    expect(homeSource).toContain('href="/contact"');
    expect(homeSource).toContain("تواصل معنا والشكاوى");
  });
});
