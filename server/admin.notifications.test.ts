import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { buildPurchaseRequestNotification, buildSupportFollowUpNotification } from "@shared/adminNotifications";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getAdminNotifications: vi.fn(),
    getAdminNotificationUnreadCount: vi.fn(),
    markAdminNotificationRead: vi.fn(),
    markAdminNotificationsRead: vi.fn(),
  };
});

const adminContext = {
  user: { id: 1, openId: "admin-1", role: "admin", name: "مدير", email: "admin@example.com" },
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

const userContext = {
  user: { id: 7, openId: "student-7", role: "user", name: "طالب", email: "student@example.com" },
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

const anonymousContext = {
  user: undefined,
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

describe("admin notification procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAdminNotifications).mockResolvedValue({
      notifications: [{ id: 12, type: "support_follow_up", title: "طلب تواصل جديد", message: "يوجد طلب جديد يحتاج إلى مراجعة", priority: "high", entityType: "support_follow_up", entityId: "55", targetPath: "/admin/follow-ups", isRead: false, readAt: null, createdAt: new Date() }],
      total: 1,
      page: 1,
      pageSize: 25,
    } as never);
    vi.mocked(db.getAdminNotificationUnreadCount).mockResolvedValue(1);
    vi.mocked(db.markAdminNotificationRead).mockResolvedValue({ success: true });
    vi.mocked(db.markAdminNotificationsRead).mockResolvedValue({ updated: 2 });
  });

  it("allows an admin to list notifications and read the unread count", async () => {
    const caller = appRouter.createCaller(adminContext);
    const result = await caller.admin.notifications({ type: "support_follow_up", read: "unread", page: 1, pageSize: 25 });
    const unreadCount = await caller.admin.notificationUnreadCount();
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]).toMatchObject({ type: "support_follow_up", isRead: false });
    expect(unreadCount).toBe(1);
    expect(db.getAdminNotifications).toHaveBeenCalledWith({ type: "support_follow_up", read: "unread", page: 1, pageSize: 25 });
  });

  it("marks one notification or a deduplicated group as read", async () => {
    const caller = appRouter.createCaller(adminContext);
    await caller.admin.markNotificationRead({ id: 12 });
    await caller.admin.markNotificationsRead({ ids: [12, 12, 13] });
    expect(db.markAdminNotificationRead).toHaveBeenCalledWith(12);
    expect(db.markAdminNotificationsRead).toHaveBeenCalledWith([12, 13]);
  });

  it("rejects anonymous and non-admin notification access", async () => {
    await expect(appRouter.createCaller(anonymousContext).admin.notificationUnreadCount()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(userContext).admin.notifications({ page: 1, pageSize: 25 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unsupported notification filters", async () => {
    const caller = appRouter.createCaller(adminContext);
    await expect(caller.admin.notifications({ type: "unknown" as never, page: 1, pageSize: 25 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.getAdminNotifications).not.toHaveBeenCalled();
  });

  it("builds safe purchase and support follow-up event notifications", () => {
    expect(buildPurchaseRequestNotification("MIDAD-00000042", 42)).toMatchObject({
      type: "purchase_request",
      title: "طلب شراء جديد",
      priority: "high",
      entityType: "purchase_request",
      entityId: "42",
      targetPath: "/admin/purchases",
    });
    expect(buildSupportFollowUpNotification("MIDAD-FU-000042", 42)).toMatchObject({
      type: "support_follow_up",
      title: "طلب تواصل جديد",
      priority: "high",
      entityType: "support_follow_up",
      entityId: "42",
      targetPath: "/admin/follow-ups",
    });
  });
});
