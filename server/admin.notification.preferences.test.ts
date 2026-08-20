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
  });

  it("protects notification settings with the admin procedure and boolean validation", () => {
    const router = read("server/routers.ts");
    expect(router).toContain("saveSetting: adminProcedure");
    expect(router).toContain("notificationPurchaseRequestEnabled");
    expect(router).toContain('input.settingValue !== "true" && input.settingValue !== "false"');
    expect(router).toContain('isAdminNotificationEnabled("notificationComplaintEnabled")');
  });

  it("exposes RTL controls for all four notification categories", () => {
    const settings = read("client/src/pages/AdminSettings.tsx");
    expect(settings).toContain("تفضيلات التنبيهات الإدارية");
    expect(settings).toContain('type="checkbox"');
    expect(settings).toContain("notificationPurchaseRequestEnabled");
    expect(settings).toContain("notificationSupportFollowUpEnabled");
    expect(settings).toContain("notificationComplaintEnabled");
    expect(settings).toContain("notificationSystemEnabled");
  });
});
