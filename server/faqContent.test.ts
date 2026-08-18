import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const contactSource = readFileSync(resolve(projectRoot, "client/src/pages/ContactPage.tsx"), "utf8");

describe("FAQ content coverage", () => {
  it("keeps fallback FAQs focused on the product, delivery, and educational scope", () => {
    expect(homeSource).toContain("هل هذا ملخص رسمي صادر عن جامعة ابن زهر؟");
    expect(homeSource).toContain("هل يضمن الملخص النجاح في الامتحان؟");
    expect(homeSource).toContain("هل يمكنني قراءة الملف على الهاتف؟");
    expect(homeSource).toContain("كيف أحصل على الملف بعد الدفع؟");
    expect(homeSource).toContain("هل يشمل المنتج استشارة قانونية؟");
  });

  it("keeps contact FAQs covering payment, download expiry, and refunds", () => {
    expect(contactSource).toContain("متى تتم مراجعة طلبي؟");
    expect(contactSource).toContain("انتهت صلاحية رابط التنزيل");
    expect(contactSource).toContain("كتبت بريداً إلكترونياً أو رقم واتساب بشكل خاطئ");
    expect(contactSource).toContain("هل يمكنني طلب استرداد المبلغ بعد تنزيل الملف؟");
    expect(contactSource).toContain("رقم الطلب");
  });
});
