import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin layout stacking", () => {
  it("keeps sidebar and header in explicit isolated layers", () => {
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    const sidebar = readFileSync(resolve(process.cwd(), "client/src/components/ui/sidebar.tsx"), "utf8");

    expect(layout).toContain('className="relative isolate"');
    expect(layout).toContain('className="border-r-0 z-30"');
    expect(layout).toContain('className="relative z-0 min-w-0 w-full overflow-x-hidden"');
    expect(layout).toContain('className="relative z-40 flex h-14');
    expect(sidebar).toContain('bg-[#f7f3eb] text-[#173247] z-50');
    expect(sidebar).toContain('bg-[#f7f3eb] text-[#173247] relative z-0');
    expect(sidebar).toContain("overflow-hidden");
    expect(layout).toContain("إذا تعذر التحقق الخارجي أو ظهرت رسالة CAPTCHA");
  });
});


describe("quiz passing percentage control", () => {
  it("exposes an admin control for editing and saving the quiz threshold", () => {
    const dashboard = readFileSync(resolve(process.cwd(), "client/src/pages/AdminDashboard.tsx"), "utf8");
    expect(dashboard).toContain("نسبة النجاح في هذا الاختبار");
    expect(dashboard).toContain('settingKey: "quizPassingPercentage"');
    expect(dashboard).toContain("أدخل نسبة صحيحة بين 0 و100");
    expect(dashboard).toContain("تُستخدم هذه النسبة في شاشة النتيجة للطلاب وفي المعاينة");
  });
});
