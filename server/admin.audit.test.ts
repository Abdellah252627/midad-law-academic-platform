import { describe, expect, it, vi } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getAuditLogs: vi.fn() };
});

const anonymousContext = { user: undefined, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const userContext = { user: { id: 7, openId: "student-7", role: "user", name: "طالب", email: "student@example.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const adminContext = { user: { id: 1, openId: "admin-1", role: "admin", name: "مدير", email: "admin@example.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;

const logs = [{ id: 1, actorUserId: 1, action: "file.upload", entityType: "product_file", entityId: "22", productCode: "MIDAD-001", metadataJson: JSON.stringify({ version: 2 }), createdAt: new Date("2026-08-16T10:00:00.000Z") }];

describe("admin audit logs", () => {
  it("returns audit rows for an admin", async () => {
    vi.mocked(db.getAuditLogs).mockResolvedValue(logs);
    const result = await appRouter.createCaller(adminContext).admin.auditLogs();
    expect(result).toEqual(logs);
  });

  it("rejects anonymous and non-admin access", async () => {
    await expect(appRouter.createCaller(anonymousContext).admin.auditLogs()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(appRouter.createCaller(userContext).admin.auditLogs()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
