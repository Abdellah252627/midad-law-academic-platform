import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("purchase notification deduplication", () => {
  it("uses the request entity and event type as the idempotency key", () => {
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    expect(db).toContain("export async function createAdminNotificationOnce");
    expect(db).toContain("eq(adminNotifications.type, input.type)");
    expect(db).toContain("eq(adminNotifications.entityType, input.entityType)");
    expect(db).toContain("eq(adminNotifications.entityId, input.entityId)");
    expect(router).toContain("createAdminNotificationOnce(buildPurchaseRequestNotification(result.orderNumber, result.id))");
  });

  it("cleans duplicate purchase notifications without deleting purchase requests", () => {
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    expect(db).toContain("export async function deleteDuplicatePurchaseNotifications");
    expect(db).toContain('eq(adminNotifications.type, "purchase_request")');
    expect(db).toContain('eq(adminNotifications.entityType, "purchase_request")');
    expect(db).toContain("const duplicateIds = rows.slice(1).map(row => row.id)");
    expect(db).not.toContain("delete(purchaseRequests)");
  });
});

