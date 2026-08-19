import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const contactSource = readFileSync(resolve(projectRoot, "client/src/pages/ContactPage.tsx"), "utf8");
const adminSource = readFileSync(resolve(projectRoot, "client/src/pages/AdminDashboard.tsx"), "utf8");

describe("FAQ content coverage", () => {
  it("keeps fallback FAQs focused on the product, delivery, and educational scope", () => {
    expect(homeSource).toContain("هل هذا ملخص رسمي صادر عن جامعة ابن زهر؟");
    expect(homeSource).toContain("هل يضمن الملخص النجاح في الامتحان؟");
    expect(homeSource).toContain("هل يمكنني قراءة الملف على الهاتف؟");
    expect(homeSource).toContain("كيف يتم تأكيد الطلب وتسليم الملف؟");
    expect(homeSource).toContain("ما طرق الدفع المتاحة وكم تستغرق مراجعة التحويل؟");
    expect(homeSource).toContain("التجاري وفا بنك");
    expect(homeSource).toContain("فريق مركز الاتصال عبر WhatsApp");
    expect(homeSource).toContain("هل يشمل المنتج استشارة قانونية؟");
    expect(homeSource).toContain("ماذا يشمل الشراء؟");
    expect(homeSource).toContain("ماذا تعني المراجعة التطبيقية؟");
    expect(homeSource).toContain("ماذا تعني التحديثات المجانية مدى الحياة؟");
    expect(homeSource).toContain("إجابات واضحة قبل الطلب");
    expect(homeSource).toContain("bankTransferReviewDuration");
    expect(homeSource).toContain("answer.replace(/خلال\\s+\\d+\\s+ساعة/g");
  });

  it("keeps the admin setting contract for bank transfer review duration", () => {
    const routerSource = readFileSync(resolve(projectRoot, "server/routers.ts"), "utf8");
    const settingsSource = readFileSync(resolve(projectRoot, "client/src/pages/AdminSettings.tsx"), "utf8");
    expect(routerSource).toContain("bankTransferReviewDuration");
    expect(routerSource).toContain("duration < 1 || duration > 168");
    expect(settingsSource).toContain("مدة مراجعة التحويل البنكي بالساعات");
    expect(settingsSource).toContain("من 1 إلى 168 ساعة");
  });

  it("keeps FAQ editing guidance and visitor publishing controls in Back Office", () => {
    expect(adminSource).toContain("تحرير الأسئلة الظاهرة في صفحة الهبوط");
    expect(adminSource).toContain("ظاهر للزوار");
    expect(adminSource).toContain("دون وعود غير قابلة للضمان");
  });

  it("keeps contact FAQs covering payment, download expiry, and refunds", () => {
    expect(contactSource).toContain("متى تتم مراجعة طلبي؟");
    expect(contactSource).toContain("انتهت صلاحية رابط التنزيل");
    expect(contactSource).toContain("كتبت بريداً إلكترونياً أو رقم واتساب بشكل خاطئ");
    expect(contactSource).toContain("هل يمكنني طلب استرداد المبلغ بعد تنزيل الملف؟");
    expect(contactSource).toContain("رقم الطلب");
  });
});
