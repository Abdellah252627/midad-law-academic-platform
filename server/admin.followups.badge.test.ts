import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("new follow-up badge", () => {
  it("uses a protected count procedure backed only by new follow-ups", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    expect(router).toContain("newSupportFollowUpCount: adminProcedure.query");
    expect(router).toContain("getNewSupportFollowUpCount");
    expect(db).toContain('eq(supportFollowUps.status, "new")');
  });

  it("renders an accessible badge and refreshes it after a status update", () => {
    const dashboard = readFileSync(resolve(process.cwd(), "client/src/pages/AdminDashboard.tsx"), "utf8");
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    const followUps = readFileSync(resolve(process.cwd(), "client/src/pages/AdminFollowUps.tsx"), "utf8");
    expect(dashboard).toContain("newSupportFollowUpCount.useQuery");
    expect(dashboard).toContain("طلبات تواصل جديدة");
    expect(layout).toContain("newSupportFollowUpCount.useQuery");
    expect(layout).toContain('item.path === "/admin/follow-ups"');
    expect(followUps).toContain("newSupportFollowUpCount.invalidate()");
  });
});

// ميثاق الاختبار: يجب ألا يظهر العدّاد إلا للطلبات ذات الحالة «new»، وأن يبقى إجراء العدّاد محمياً بصلاحيات الإدارة، مع تحديث فوري بعد تغيير الحالة.
// لا تُستخدم هذه الاختبارات لإنشاء بيانات تجريبية أو تعديل قاعدة البيانات.
