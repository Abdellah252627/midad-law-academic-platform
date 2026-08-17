import { describe, expect, it, vi } from "vitest";

const { getPurchaseRequests, getPurchaseRequestById, approvePurchaseRequest, rejectPurchaseRequest, createAuditLog, getActiveProductFile, storageGetSignedUrl, createDownloadToken, buildDownloadUrl } = vi.hoisted(() => ({
  getPurchaseRequests: vi.fn(),
  getPurchaseRequestById: vi.fn(),
  approvePurchaseRequest: vi.fn(),
  rejectPurchaseRequest: vi.fn(),
  getActiveProductFile: vi.fn().mockResolvedValue({ fileKey: "product-files/MIDAD-001/pdf/active.pdf", fileType: "pdf" }),
  createAuditLog: vi.fn(),
  storageGetSignedUrl: vi.fn().mockResolvedValue("https://signed.example/proof.pdf"),
  createDownloadToken: vi.fn().mockResolvedValue("download-token"),
  buildDownloadUrl: vi.fn((requestId: number, token: string) => `/api/download/${requestId}?token=${token}`),
}));

vi.mock("./db", () => ({ getPurchaseRequests, getPurchaseRequestById, approvePurchaseRequest, rejectPurchaseRequest, createAuditLog, getActiveProductFile }));
vi.mock("./storage", () => ({ storageGetSignedUrl }));
vi.mock("./downloadTokens", () => ({ DOWNLOAD_LINK_TTL_MINUTES: 15, createDownloadToken, buildDownloadUrl }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: { id: 7, openId: "admin-open-id", name: "Admin", email: "admin@example.com", loginMethod: "oauth", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin purchase management", () => {
  it("lists purchase requests for admins", async () => {
    getPurchaseRequests.mockResolvedValueOnce([{ id: 1, productCode: "MIDAD-001", status: "pending" }]);
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseRequests()).resolves.toEqual({ requests: [{ id: 1, productCode: "MIDAD-001", status: "pending" }], total: 1 });
  });

  it("returns a temporary proof URL without exposing storage keys", async () => {
    getPurchaseRequestById.mockResolvedValueOnce({ id: 2, proofKey: "private/proof-key", proofContentType: "image/png" });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseProofUrl({ requestId: 2 })).resolves.toEqual({ url: "https://signed.example/proof.pdf", contentType: "image/png" });
    expect(storageGetSignedUrl).toHaveBeenCalledWith("private/proof-key");
  });

  it("records the admin identity when approving or rejecting", async () => {
    createDownloadToken.mockClear();
    buildDownloadUrl.mockClear();
    approvePurchaseRequest.mockResolvedValueOnce({ id: 3, productCode: "MIDAD-001" });
    rejectPurchaseRequest.mockResolvedValueOnce({ id: 4 });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.approvePurchase({ requestId: 3 })).resolves.toEqual({ success: true, requestId: 3, downloadUrl: "/api/download/3?token=download-token", expiresInMinutes: 15 });
    await expect(caller.admin.rejectPurchase({ requestId: 4, reason: "الإثبات غير واضح" })).resolves.toEqual({ success: true, requestId: 4 });
    expect(approvePurchaseRequest).toHaveBeenCalledWith(3, 7);
    expect(rejectPurchaseRequest).toHaveBeenCalledWith(4, "الإثبات غير واضح", 7);
  });

  it("reissues a temporary download link only for approved requests", async () => {
    createDownloadToken.mockClear();
    buildDownloadUrl.mockClear();
    createAuditLog.mockClear();
    getPurchaseRequestById.mockResolvedValueOnce({ id: 5, productCode: "MIDAD-001", status: "approved" });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.reissuePurchaseDownload({ requestId: 5 })).resolves.toEqual({ success: true, requestId: 5, downloadUrl: "/api/download/5?token=download-token", expiresInMinutes: 15 });
    expect(createDownloadToken).toHaveBeenCalledWith({ requestId: 5, fileKey: "product-files/MIDAD-001/pdf/active.pdf" });
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 7, action: "purchase.download_link.reissue", entityId: "5" }));

    getPurchaseRequestById.mockResolvedValueOnce({ id: 6, productCode: "MIDAD-001", status: "pending" });
    await expect(caller.admin.reissuePurchaseDownload({ requestId: 6 })).rejects.toThrow("لا يمكن إصدار رابط تنزيل إلا لطلب مقبول");
  });
});
