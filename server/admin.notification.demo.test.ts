import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("demo notification test mode", () => {
  const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
  const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
  const settings = readFileSync(resolve(process.cwd(), "client/src/pages/AdminSettings.tsx"), "utf8");

  it("creates one isolated system notification without business entities", () => {
    expect(db).toContain("createDemoAdminNotification");
    expect(db).toContain('entityType: "demo"');
    expect(db).toContain('entityId = "demo-notification"');
    expect(db).toContain('type: "system"');
    expect(db).toContain("if (existing[0]) return { id: existing[0].id, created: false as const };");
    expect(db).not.toContain("createPurchaseRequest({");
  });

  it("exposes the demo action only through adminProcedure and records an audit event", () => {
    expect(router).toContain("testNotification: adminProcedure.mutation");
    expect(router).toContain('action: "notification.demo.create"');
  });

  it("provides an explicit admin control and explains the safe scope", () => {
    expect(settings).toContain("اختبار تجريبي للإشعارات");
    expect(settings).toContain("لا ينشئ طلباً أو شكوى");
    expect(settings).toContain("testNotification.mutate()");
  });
});

