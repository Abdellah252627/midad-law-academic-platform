import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getForumViolationMonitoring: vi.fn(),
    getForumWeeklyViolationReport: vi.fn(),
    clearForumModerationBlock: vi.fn(),
    resetForumViolationCounter: vi.fn(),
    createAuditLog: vi.fn(),
  };
});

const adminContext = { user: { id: 1, openId: "admin-1", role: "admin", name: "مدير", email: "admin@example.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const userContext = { user: { id: 7, openId: "student-7", role: "user", name: "طالب", email: "student@example.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const anonymousContext = { user: undefined, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;

const sampleResult = {
  offenders: [{
    user: { id: 7, name: "طالب", email: "student@example.com" },
    moderation: { id: 3, userId: 7, violationCount: 2, blockLevel: 0, blockedUntil: null, lastViolationAt: new Date(), windowStartedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    events: [{ id: 1, userId: 7, sourceType: "topic", sourceId: 9, category: "blocked_word", redactedExcerpt: "نص [محتوى محجوب]", createdAt: new Date() }],
  }],
  total: 1,
  activeBans: 0,
  totalEvents: 1,
};

describe("admin forum violation monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getForumViolationMonitoring).mockResolvedValue(sampleResult as never);
    vi.mocked(db.getForumWeeklyViolationReport).mockResolvedValue({ current: { violations: 5, repeatAccounts: 2, accounts: 3 }, previous: { violations: 3, repeatAccounts: 1, accounts: 2 }, change: { violations: 2, repeatAccounts: 1 }, period: { currentStart: new Date(), currentEnd: new Date(), previousStart: new Date(), previousEnd: new Date() } });
    vi.mocked(db.clearForumModerationBlock).mockResolvedValue(true);
    vi.mocked(db.resetForumViolationCounter).mockResolvedValue(true);
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined as never);
  });

  it("returns privacy-conscious offender rows to admins", async () => {
    const result = await appRouter.createCaller(adminContext).admin.forumViolationMonitoring({ search: "طالب", includeResolved: false });
    expect(result.total).toBe(1);
    expect(result.offenders[0]?.events[0]?.redactedExcerpt).toContain("محتوى محجوب");
    expect(db.getForumViolationMonitoring).toHaveBeenCalledWith({ search: "طالب", includeResolved: false });
  });

  it("returns weekly violation totals and repeat-account comparison to admins", async () => {
    const result = await appRouter.createCaller(adminContext).admin.forumWeeklyViolationReport();
    expect(result.current.violations).toBe(5);
    expect(result.current.repeatAccounts).toBe(2);
    expect(result.change.violations).toBe(2);
    expect(db.getForumWeeklyViolationReport).toHaveBeenCalledTimes(1);
  });

  it("rejects weekly reports for non-admin users", async () => {
    await expect(appRouter.createCaller(userContext).admin.forumWeeklyViolationReport()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("resets counters and lifts bans with an audit trail", async () => {
    const caller = appRouter.createCaller(adminContext);
    await caller.admin.resetForumViolationCounter({ userId: 7 });
    await caller.admin.clearForumModerationBlock({ userId: 7 });
    expect(db.resetForumViolationCounter).toHaveBeenCalledWith(7);
    expect(db.clearForumModerationBlock).toHaveBeenCalledWith(7);
    expect(db.createAuditLog).toHaveBeenCalledTimes(2);
  });

  it("rejects non-admin and anonymous access", async () => {
    await expect(appRouter.createCaller(userContext).admin.forumViolationMonitoring({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(anonymousContext).admin.resetForumViolationCounter({ userId: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid user identifiers before touching the database", async () => {
    await expect(appRouter.createCaller(adminContext).admin.resetForumViolationCounter({ userId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.resetForumViolationCounter).not.toHaveBeenCalled();
  });
});
