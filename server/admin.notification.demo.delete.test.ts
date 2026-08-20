import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const settingsSource = readFileSync(new URL("../client/src/pages/AdminSettings.tsx", import.meta.url), "utf8");

describe("demo notification cleanup", () => {
  it("restricts deletion to the explicit demo entity", () => {
    expect(dbSource).toContain("deleteDemoAdminNotification");
    expect(dbSource).toContain('eq(adminNotifications.type, "system")');
    expect(dbSource).toContain('eq(adminNotifications.entityType, "demo")');
    expect(dbSource).toContain('eq(adminNotifications.entityId, "demo-notification")');
  });

  it("keeps the cleanup procedure behind adminProcedure and records an audit event", () => {
    expect(routerSource).toContain("deleteDemoNotifications: adminProcedure.mutation");
    expect(routerSource).toContain('notification.demo.delete');
  });

  it("exposes confirmation UI and refreshes notification data after cleanup", () => {
    expect(settingsSource).toContain("deleteDemoNotifications");
    expect(settingsSource).toContain("setDeleteDemoOpen(true)");
    expect(settingsSource).toContain("تأكيد تنظيف التنبيه التجريبي");
    expect(settingsSource).toContain("utils.admin.notifications.invalidate()");
    expect(settingsSource).toContain("utils.admin.notificationUnreadCount.invalidate()");
  });
});
