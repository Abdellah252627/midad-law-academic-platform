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


describe("quiz result message controls", () => {
  it("exposes editable success and failure messages and previews them", () => {
    const dashboard = readFileSync(resolve(process.cwd(), "client/src/pages/AdminDashboard.tsx"), "utf8");
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    expect(dashboard).toContain("رسالة النجاح");
    expect(dashboard).toContain("رسالة الرسوب أو المواساة");
    expect(dashboard).toContain('saveQuizMessage("quizSuccessMessage", successMessage)');
    expect(dashboard).toContain('saveQuizMessage("quizFailureMessage", failureMessage)');
    expect(dashboard).toContain("{previewResultData.passed ? successMessage : failureMessage}");
    expect(home).toContain("quizSuccessMessage");
    expect(home).toContain("quizFailureMessage");
    expect(router).toContain('"quizSuccessMessage", "quizFailureMessage"');
  });
});


describe("interactive admin notification dropdown", () => {
  it("shows latest notifications with readable state, priority, and bulk read action", () => {
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(layout).toContain("أحدث التنبيهات");
    expect(layout).toContain("notificationData?.notifications.some(item => !item.isRead)");
    expect(layout).toContain("تحديد غير المقروء كمقروء");
    expect(layout).toContain("أولوية حرجة");
    expect(layout).toContain('dateStyle: "short", timeStyle: "short"');
    expect(layout).toContain('onClick={() => openNotification(notification)}');
  });
});


describe("all notifications page", () => {
  it("registers a protected admin page with search, filters, pagination, and bulk read", () => {
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/AdminNotifications.tsx"), "utf8");
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    expect(app).toContain('path="/admin/notifications" component={AdminNotifications}');
    expect(layout).toContain('path: "/admin/notifications"');
    expect(layout).toContain('setLocation("/admin/notifications")');
    expect(page).toContain("كل التنبيهات");
    expect(page).toContain("التصفية");
    expect(page).toContain("تحديد الكل كمقروء");
    expect(page).toContain('value="system">إشعارات النظام');
    expect(page).toContain("تأكيد تحديد الكل كمقروء");
    expect(page).toContain("trpc.admin.notifications.useQuery");
    expect(page).toContain("trpc.admin.markAllNotificationsRead.useMutation");
    expect(router).toContain("markAllNotificationsRead");
    expect(router).toContain('type: z.enum(["purchase_request", "support_follow_up", "complaint", "system", "auth_login_attempt"]).optional()');
    expect(router).toContain('priority: z.enum(["high", "critical"]).optional()');
    expect(router).toContain("from: z.string().date().optional()");
  });
});


describe("sensitive admin page privacy guards", () => {
  it("wraps file management and audit logs with the shared admin guard", () => {
    const files = readFileSync(resolve(process.cwd(), "client/src/pages/AdminFiles.tsx"), "utf8");
    const auditLogs = readFileSync(resolve(process.cwd(), "client/src/pages/AdminAuditLogs.tsx"), "utf8");

    expect(files).toContain('import DashboardLayout from "@/components/DashboardLayout";');
    expect(files).toContain("return <DashboardLayout><AdminFilesContent /></DashboardLayout>");
    expect(auditLogs).toContain('import DashboardLayout from "@/components/DashboardLayout";');
    expect(auditLogs).toContain("return <DashboardLayout><AdminAuditLogsContent /></DashboardLayout>");
  });
});
