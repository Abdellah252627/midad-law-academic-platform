import { describe, expect, it, vi } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getAnalyticsSummary: vi.fn() };
});

const anonymousContext = { user: undefined, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const userContext = { user: { id: 7, openId: "student-7", role: "user", name: "طالب", email: "student@example.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const adminContext = { user: { id: 1, openId: "admin-1", role: "admin", name: "مدير", email: "admin@example.com" }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;

const summary = { totalRevenueMad: 114, todayVisitors: 12, todaySampleDownloads: 8, todayPurchaseRequests: 2, todayConversionRate: 25, weekVisitors: 64, weekSampleDownloads: 31, weekPurchaseRequests: 7, weekConversionRate: 22.6 };

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

  it("rejects anonymous and non-admin access", async () => {
    await expect(appRouter.createCaller(anonymousContext).admin.analyticsSummary()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(userContext).admin.analyticsSummary()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
