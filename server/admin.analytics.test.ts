import { describe, expect, it, vi } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getAnalyticsSummary: vi.fn(), getStudentAnalytics: vi.fn() };
});

const anonymousContext = { user: undefined, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const userContext = { user: { id: 7, openId: "student-7", role: "user", name: "طالب", email: "student@example.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const adminContext = { user: { id: 1, openId: "admin-1", role: "admin", name: "مدير", email: "admin@example.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;

const summary = { totalRevenueMad: 114, todayVisitors: 12, todaySampleDownloads: 8, todayPurchaseRequests: 2, todayConversionRate: 25, weekVisitors: 64, weekSampleDownloads: 31, weekPurchaseRequests: 7, weekConversionRate: 22.6 };
const studentAnalytics = { rangeDays: 30 as const, rangeStart: "2026-07-21T00:00:00.000Z", totalStudents: 3, approvedOrders: 3, weeks: [], months: [], definition: "طلبة فريدون", generatedAt: "2026-08-20T00:00:00.000Z" };

describe("admin analytics summary", () => {
  it("returns the persisted summary for an admin", async () => {
    vi.mocked(db.getAnalyticsSummary).mockResolvedValue(summary);
    const result = await appRouter.createCaller(adminContext).admin.analyticsSummary();
    expect(result).toEqual(summary);
    expect(result.totalRevenueMad).toBe(114);
    expect(result.todayVisitors).toBe(12);
    expect(result.todaySampleDownloads).toBe(8);
    expect(result.todayPurchaseRequests).toBe(2);
    expect(result.todayConversionRate).toBe(25);
    expect(result.weekSampleDownloads).toBe(31);
    expect(result.weekPurchaseRequests).toBe(7);
    expect(result.weekConversionRate).toBe(22.6);
  });

  it("passes the selected 30-day range to the data layer", async () => {
    vi.mocked(db.getStudentAnalytics).mockResolvedValue(studentAnalytics);
    const result = await appRouter.createCaller(adminContext).admin.studentAnalytics({ days: 30 });
    expect(result.rangeDays).toBe(30);
    expect(db.getStudentAnalytics).toHaveBeenCalledWith({ days: 30 });
  });

  it("passes the selected 90-day range and rejects unsupported ranges", async () => {
    vi.mocked(db.getStudentAnalytics).mockResolvedValue({ ...studentAnalytics, rangeDays: 90, rangeStart: "2026-05-22T00:00:00.000Z" });
    const result = await appRouter.createCaller(adminContext).admin.studentAnalytics({ days: 90 });
    expect(result.rangeDays).toBe(90);
    expect(db.getStudentAnalytics).toHaveBeenCalledWith({ days: 90 });
    await expect(appRouter.createCaller(adminContext).admin.studentAnalytics({ days: 60 as 30 | 90 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("passes a custom date range and rejects invalid date ranges", async () => {
    vi.mocked(db.getStudentAnalytics).mockResolvedValue({ ...studentAnalytics, rangeDays: 8, rangeStart: "2026-08-01T00:00:00.000Z", rangeEnd: "2026-08-09T00:00:00.000Z" });
    const result = await appRouter.createCaller(adminContext).admin.studentAnalytics({ startDate: "2026-08-01", endDate: "2026-08-08" });
    expect(result.rangeDays).toBe(8);
    expect(db.getStudentAnalytics).toHaveBeenCalledWith({ startDate: "2026-08-01", endDate: "2026-08-08" });
    await expect(appRouter.createCaller(adminContext).admin.studentAnalytics({ startDate: "2026-08-08" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(appRouter.createCaller(adminContext).admin.studentAnalytics({ startDate: "2026-08-08", endDate: "2026-08-01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(appRouter.createCaller(adminContext).admin.studentAnalytics({ days: 30, startDate: "2026-08-01", endDate: "2026-08-08" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects anonymous and non-admin access", async () => {
    await expect(appRouter.createCaller(anonymousContext).admin.analyticsSummary()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(appRouter.createCaller(userContext).admin.analyticsSummary()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
