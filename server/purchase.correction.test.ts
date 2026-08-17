import { describe, expect, it, vi, beforeEach } from "vitest";

const { getPurchaseRequestById, getLatestPurchaseRequestCorrection, getPendingPurchaseRequestCorrection, createPurchaseRequestCorrection, getPurchaseRequestCorrections, reviewPurchaseRequestCorrection, createAuditLog } = vi.hoisted(() => ({
  getPurchaseRequestById: vi.fn(),
  getLatestPurchaseRequestCorrection: vi.fn(),
  getPendingPurchaseRequestCorrection: vi.fn(),
  createPurchaseRequestCorrection: vi.fn().mockResolvedValue({ id: 88 }),
  getPurchaseRequestCorrections: vi.fn(),
  reviewPurchaseRequestCorrection: vi.fn(),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db", () => ({
  getPurchaseRequestById,
  getLatestPurchaseRequestCorrection,
  getPendingPurchaseRequestCorrection,
  createPurchaseRequestCorrection,
  getPurchaseRequestCorrections,
  reviewPurchaseRequestCorrection,
  createAuditLog,
}));
vi.mock("./storage", () => ({ storagePut: vi.fn(), storageGetSignedUrl: vi.fn() }));
vi.mock("./downloadTokens", () => ({ DOWNLOAD_LINK_TTL_MINUTES: 15, createDownloadToken: vi.fn(), buildDownloadUrl: vi.fn() }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function publicContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function adminContext(): TrpcContext {
  return { user: { id: 7, openId: "admin", name: "Admin", email: "admin@example.com", loginMethod: "oauth", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("purchase.requestDataCorrection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a correction when the current email does not match", async () => {
    getPurchaseRequestById.mockResolvedValueOnce({ id: 12, customerEmail: "right@example.com", status: "pending" });
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.purchase.requestDataCorrection({ requestId: 12, currentEmail: "wrong@example.com", requestedEmail: "new@example.com" })).rejects.toThrow("تعذر التحقق");
    expect(createPurchaseRequestCorrection).not.toHaveBeenCalled();
  });

  it("creates a pending correction with normalized values", async () => {
    getPurchaseRequestById.mockResolvedValueOnce({ id: 12, customerEmail: "old@example.com", customerPhone: "0660000000", status: "pending" });
    getPendingPurchaseRequestCorrection.mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.purchase.requestDataCorrection({ requestId: 12, currentEmail: "OLD@example.com", requestedEmail: " New@example.com ", requestedPhone: "06 6111 2222", reason: "خطأ إدخال" })).resolves.toEqual({ success: true, correctionId: 88 });
    expect(createPurchaseRequestCorrection).toHaveBeenCalledWith(expect.objectContaining({ requestId: 12, oldEmail: "old@example.com", requestedEmail: "new@example.com", requestedPhone: "0661112222", status: "pending" }));
  });

  it("blocks a second pending correction", async () => {
    getPurchaseRequestById.mockResolvedValueOnce({ id: 12, customerEmail: "old@example.com", status: "pending" });
    getPendingPurchaseRequestCorrection.mockResolvedValueOnce({ id: 87, status: "pending" });
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.purchase.requestDataCorrection({ requestId: 12, currentEmail: "old@example.com", requestedPhone: "0661112222" })).rejects.toThrow("قيد المراجعة");
  });
});

describe("purchase.correctionStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only the latest correction status after email verification", async () => {
    getPurchaseRequestById.mockResolvedValueOnce({ id: 12, customerEmail: "student@example.com" });
    getLatestPurchaseRequestCorrection.mockResolvedValueOnce({ status: "approved", createdAt: new Date(), reviewedAt: new Date(), decisionNote: "تم التحقق" });
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.purchase.correctionStatus({ requestId: 12, customerEmail: "STUDENT@example.com" })).resolves.toMatchObject({ status: "approved" });
  });

  it("does not reveal correction status for an unverified email", async () => {
    getPurchaseRequestById.mockResolvedValueOnce({ id: 12, customerEmail: "student@example.com" });
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.purchase.correctionStatus({ requestId: 12, customerEmail: "other@example.com" })).rejects.toThrow("طلب التصحيح غير موجود");
    expect(getLatestPurchaseRequestCorrection).not.toHaveBeenCalled();
  });
});

describe("admin correction review", () => {
  it("lists corrections and records the reviewing admin on approval", async () => {
    getPurchaseRequestCorrections.mockResolvedValueOnce([{ id: 88, requestId: 12, status: "pending" }]);
    reviewPurchaseRequestCorrection.mockResolvedValueOnce({ id: 88, requestId: 12, requestedEmail: "new@example.com", requestedPhone: null });
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.admin.purchaseRequestCorrections()).resolves.toEqual([{ id: 88, requestId: 12, status: "pending" }]);
    await expect(caller.admin.reviewPurchaseRequestCorrection({ correctionId: 88, decision: "approved", decisionNote: "تم التحقق" })).resolves.toEqual({ success: true, correctionId: 88 });
    expect(reviewPurchaseRequestCorrection).toHaveBeenCalledWith({ id: 88, status: "approved", reviewedByUserId: 7, decisionNote: "تم التحقق" });
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 7, action: "purchase.correction.approved", entityId: "88" }));
  });

  it("does not allow a normal user to review corrections", async () => {
    const caller = appRouter.createCaller({ ...adminContext(), user: { ...adminContext().user!, role: "user" } });
    await expect(caller.admin.reviewPurchaseRequestCorrection({ correctionId: 88, decision: "rejected" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
