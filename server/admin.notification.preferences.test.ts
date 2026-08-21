import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("admin notification preferences", () => {
  it("keeps every notification type enabled when its setting is absent", () => {
    const db = read("server/db.ts");
    expect(db).toContain('return settings[settingKey] !== "false"');
    expect(db).toContain("notificationPurchaseRequestEnabled");
    expect(db).toContain("notificationSupportFollowUpEnabled");
    expect(db).toContain("notificationComplaintEnabled");
    expect(db).toContain("notificationSystemEnabled");
    expect(db).toContain("notificationForumViolationThresholdEnabled");
    expect(db).toContain('forum_violation_threshold: "notificationForumViolationThresholdEnabled"');
  });

  it("protects notification settings with the admin procedure and boolean validation", () => {
    const router = read("server/routers.ts");
    expect(router).toContain("saveSetting: adminProcedure");
    expect(router).toContain("notificationPurchaseRequestEnabled");
    expect(router).toContain('input.settingValue !== "true" && input.settingValue !== "false"');
    expect(router).toContain('isAdminNotificationEnabled("notificationComplaintEnabled")');
    expect(router).toContain("forumViolationAlertThreshold");
    expect(router).toContain("بين 1 و100");
  });

  it("protects and validates forum alert message and color settings", () => {
    const router = read("server/routers.ts");
    const settings = read("client/src/pages/AdminSettings.tsx");
    expect(router).toContain("forumOpenAlertMessage");
    expect(router).toContain("forumClosedAlertMessage");
    expect(router).toContain("forumOpenAlertColor");
    expect(router).toContain("forumClosedAlertColor");
    expect(router).toContain("forumOpenAlertIcon");
    expect(router).toContain("forumClosedAlertIcon");
    expect(router).toContain("forumOpenAlertDuration");
    expect(router).toContain("forumClosedAlertDuration");
    expect(settings).toContain("/^#[0-9a-fA-F]{6}$/");
    expect(settings).toContain("بين 10 و240 حرفاً");
    expect(settings).toContain("مدة ظهور تنبيه الفتح");
    expect(settings).toContain("أيقونة تنبيه الفتح");
  });

  it("exposes RTL controls for all four notification categories", () => {
    const settings = read("client/src/pages/AdminSettings.tsx");
    expect(settings).toContain("تفضيلات التنبيهات الإدارية");
    expect(settings).toContain('type="checkbox"');
    expect(settings).toContain("notificationPurchaseRequestEnabled");
    expect(settings).toContain("notificationSupportFollowUpEnabled");
    expect(settings).toContain("notificationComplaintEnabled");
    expect(settings).toContain("notificationSystemEnabled");
    expect(settings).toContain("notificationForumViolationThresholdEnabled");
    expect(settings).toContain("عتبة تنبيه مخالفات المنتدى");
  });

  it("exposes the forum violation alert in the notification center", () => {
    const page = read("client/src/pages/AdminNotifications.tsx");
    expect(page).toContain("forum_violation_threshold");
    expect(page).toContain("مخالفات المنتدى");
    expect(page).toContain("مخالفة منتدى");
  });

  it("provides live previews for opening and closing forum alerts", () => {
    const settings = read("client/src/pages/AdminSettings.tsx");
    const forum = read("client/src/pages/Forum.tsx");
    expect(settings).toContain("معاينة الفتح");
    expect(settings).toContain("معاينة الإغلاق");
    expect(forum).toContain("forumAlerts.forumOpenAlertMessage");
    expect(forum).toContain("forumAlerts.forumClosedAlertMessage");
    expect(forum).toContain("forumAlerts.forumOpenAlertColor");
    expect(forum).toContain("forumAlerts.forumClosedAlertColor");
    expect(forum).toContain("forumAlerts.forumOpenAlertIcon");
    expect(forum).toContain("forumAlerts.forumClosedAlertIcon");
    expect(forum).toContain("forumOpenAlertDurationSeconds");
    expect(forum).toContain("forumClosedAlertDurationSeconds");
  });
});
