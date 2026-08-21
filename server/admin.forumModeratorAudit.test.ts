import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getForumModeratorAuditLogs: vi.fn() };
});

const ownerContext = { user: { id: 1, openId: "admin-1", role: "admin", name: "المالك", email: "abdellahmr538@gmail.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const adminContext = { user: { id: 2, openId: "admin-2", role: "admin", name: "مدير", email: "admin@example.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const userContext = { user: { id: 7, openId: "student-7", role: "user", name: "طالب", email: "student@example.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const anonymousContext = { user: undefined, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;

const result = { rows: [{ id: 4, actorUserId: 1, actorName: "المالك", actorEmail: "abdellahmr538@gmail.com", action: "forum.moderator.grant", entityType: "forum_moderator", entityId: "8", metadataJson: null, createdAt: new Date() }], total: 1, page: 1, pageSize: 25, pageCount: 1 };

describe("forum moderator audit trail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getForumModeratorAuditLogs).mockResolvedValue(result as never);
  });

  it("allows only the platform owner and forwards advanced filters", async () => {
    const output = await appRouter.createCaller(ownerContext).admin.forumModeratorAuditLogs({ action: "grant", search: "abdellah", from: "2026-08-01", to: "2026-08-21", page: 2, pageSize: 50 });
    expect(output.total).toBe(1);
    expect(db.getForumModeratorAuditLogs).toHaveBeenCalledWith({ action: "forum.moderator.grant", search: "abdellah", from: "2026-08-01", to: "2026-08-21", page: 2, pageSize: 50 });
  });

  it("blocks administrators who are not the owner", async () => {
    await expect(appRouter.createCaller(adminContext).admin.forumModeratorAuditLogs({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getForumModeratorAuditLogs).not.toHaveBeenCalled();
  });

  it("blocks delegated users and anonymous callers", async () => {
    await expect(appRouter.createCaller(userContext).admin.forumModeratorAuditLogs({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(anonymousContext).admin.forumModeratorAuditLogs({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects reversed dates before querying", async () => {
    await expect(appRouter.createCaller(ownerContext).admin.forumModeratorAuditLogs({ from: "2026-08-22", to: "2026-08-21" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.getForumModeratorAuditLogs).not.toHaveBeenCalled();
  });
});
