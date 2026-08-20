import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const pageSource = readFileSync(resolve(projectRoot, "client/src/pages/ContactPage.tsx"), "utf8");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const routerSource = readFileSync(resolve(projectRoot, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(projectRoot, "server/db.ts"), "utf8");

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

  it("includes payment and download troubleshooting FAQs", () => {
    expect(pageSource).toContain("الأسئلة الشائعة حول الدفع والتنزيل");
    expect(pageSource).toContain("متى تتم مراجعة طلبي؟");
    expect(pageSource).toContain("انتهت صلاحية رابط التنزيل");
    expect(pageSource).toContain("هل يمكنني طلب استرداد المبلغ بعد تنزيل الملف؟");
  });

  it("includes the redesigned support paths and accessible success state", () => {
    expect(pageSource).toContain("مركز الدعم والشكاوى");
    expect(pageSource).toContain('href="#complaint-form"');
    expect(pageSource).toContain('href="#whatsapp-section"');
    expect(pageSource).toContain('id="complaint-form"');
    expect(pageSource).toContain('id="whatsapp-section"');
    expect(pageSource).toContain('role="status"');
    expect(pageSource).toContain("تواصل معنا بثقة، وسنساعدك بخطوات واضحة");
  });

  it("includes the structured complaint form and ticket tracking", () => {
    expect(pageSource).toContain("إرسال شكوى");
    expect(pageSource).toContain("رقم التذكرة");
    expect(pageSource).toContain("تتبع الشكوى");
    expect(pageSource).toContain("trpc.complaints.submit.useMutation");
    expect(pageSource).toContain("trpc.complaints.track.useQuery");
    expect(pageSource).toContain("MIDAD-S-");
    expect(pageSource).toContain("لا ترسل كلمات المرور أو رموز التحقق");
  });

  it("keeps complaint fields bounded and avoids collecting sensitive payment data", () => {
    expect(pageSource).toContain('maxLength={5000}');
    expect(pageSource).toContain('type="email"');
    expect(pageSource).not.toContain('name="cardNumber"');
    expect(pageSource).not.toContain('name="verificationCode"');
    expect(pageSource).toContain("لا ترسل كلمات المرور أو رموز التحقق");
  });

  it("exposes validated public complaint procedures and ticket helpers", () => {
    expect(routerSource).toContain("complaints:");
    expect(routerSource).toContain("submit:");
    expect(routerSource).toContain("track:");
    expect(routerSource).toContain("z.enum([\"payment\", \"proof\", \"review\", \"download\", \"data\", \"other\"])");
    expect(dbSource).toContain("createComplaint");
    expect(dbSource).toContain("getComplaintByTicket");
    expect(dbSource).toContain("ticketNumber");
  });
});
