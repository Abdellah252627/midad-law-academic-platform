import { describe, expect, it, vi } from "vitest";

const { getPurchaseRequests, getPurchaseRequestById, approvePurchaseRequest, rejectPurchaseRequest, createAuditLog, getActiveProductFile, getPurchaseRequestNotes, createPurchaseRequestNote, updatePurchaseRequestNote, deletePurchaseRequestNote, storageGetSignedUrl, createDownloadToken, buildDownloadUrl } = vi.hoisted(() => ({
  getPurchaseRequests: vi.fn(),
  getPurchaseRequestById: vi.fn(),
  approvePurchaseRequest: vi.fn(),
  rejectPurchaseRequest: vi.fn(),
  getPurchaseRequestNotes: vi.fn(),
  createPurchaseRequestNote: vi.fn(),
  updatePurchaseRequestNote: vi.fn(),
  deletePurchaseRequestNote: vi.fn(),
  getActiveProductFile: vi.fn().mockResolvedValue({ fileKey: "product-files/MIDAD-001/pdf/active.pdf", fileType: "pdf" }),
  createAuditLog: vi.fn(),
  storageGetSignedUrl: vi.fn().mockResolvedValue("https://signed.example/proof.pdf"),
  createDownloadToken: vi.fn().mockResolvedValue("download-token"),
  buildDownloadUrl: vi.fn((requestId: number, token: string) => `/api/download/${requestId}?token=${token}`),
}));

vi.mock("./db", () => ({ getPurchaseRequests, getPurchaseRequestById, approvePurchaseRequest, rejectPurchaseRequest, createAuditLog, getActiveProductFile, getPurchaseRequestNotes, createPurchaseRequestNote, updatePurchaseRequestNote, deletePurchaseRequestNote }));
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
    getPurchaseRequests.mockResolvedValueOnce({ requests: [{ id: 1, productCode: "MIDAD-001", status: "pending" }], total: 1, page: 1, pageSize: 25 });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseRequests()).resolves.toEqual({ requests: [{ id: 1, productCode: "MIDAD-001", status: "pending" }], total: 1, page: 1, pageSize: 25, totalPages: 1, search: "", searchScope: "all", status: "all" });
  });

  it("passes a trimmed customer search to the database and returns the applied term", async () => {
    getPurchaseRequests.mockResolvedValueOnce({ requests: [{ id: 8, customerName: "سارة", customerEmail: "sara@example.com" }], total: 1, page: 1, pageSize: 25 });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseRequests({ search: "  sara@example.com  " })).resolves.toEqual({ requests: [{ id: 8, customerName: "سارة", customerEmail: "sara@example.com" }], total: 1, page: 1, pageSize: 25, totalPages: 1, search: "sara@example.com", searchScope: "all", status: "all" });
    expect(getPurchaseRequests).toHaveBeenCalledWith({ search: "sara@example.com", searchScope: "all", status: undefined, page: 1, pageSize: 25 });
  });

  it("passes an order number search alongside the status filter", async () => {
    getPurchaseRequests.mockResolvedValueOnce({ requests: [{ id: 12, orderNumber: "MIDAD-20260817-AB12" }], total: 1, page: 1, pageSize: 25 });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseRequests({ search: "  MIDAD-20260817-AB12  ", searchScope: "orderNumber", status: "approved" })).resolves.toEqual({ requests: [{ id: 12, orderNumber: "MIDAD-20260817-AB12" }], total: 1, page: 1, pageSize: 25, totalPages: 1, search: "MIDAD-20260817-AB12", searchScope: "orderNumber", status: "approved" });
    expect(getPurchaseRequests).toHaveBeenCalledWith({ search: "MIDAD-20260817-AB12", searchScope: "orderNumber", status: "approved", page: 1, pageSize: 25 });
  });

  it("passes a validated status filter alongside customer search", async () => {
    getPurchaseRequests.mockResolvedValueOnce({ requests: [{ id: 9, status: "approved" }], total: 1, page: 1, pageSize: 25 });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseRequests({ search: "  sara@example.com  ", status: "approved" })).resolves.toEqual({ requests: [{ id: 9, status: "approved" }], total: 1, page: 1, pageSize: 25, totalPages: 1, search: "sara@example.com", searchScope: "all", status: "approved" });
    expect(getPurchaseRequests).toHaveBeenCalledWith({ search: "sara@example.com", searchScope: "all", status: "approved", page: 1, pageSize: 25 });
  });

  it("returns pagination metadata and forwards page controls with filters", async () => {
    getPurchaseRequests.mockResolvedValueOnce({ requests: [{ id: 26, status: "approved" }], total: 51, page: 2, pageSize: 25 });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseRequests({ search: "sara", status: "approved", page: 2, pageSize: 25 })).resolves.toEqual({ requests: [{ id: 26, status: "approved" }], total: 51, page: 2, pageSize: 25, totalPages: 3, search: "sara", searchScope: "all", status: "approved" });
    expect(getPurchaseRequests).toHaveBeenCalledWith({ search: "sara", searchScope: "all", status: "approved", page: 2, pageSize: 25 });
  });

  it("accepts the maximum supported page size of 200 and forwards it", async () => {
    getPurchaseRequests.mockResolvedValueOnce({ requests: [], total: 401, page: 1, pageSize: 200 });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseRequests({ page: 1, pageSize: 200 })).resolves.toMatchObject({ page: 1, pageSize: 200, totalPages: 3 });
    expect(getPurchaseRequests).toHaveBeenCalledWith({ page: 1, pageSize: 200, searchScope: "all" });
  });

  it("rejects unsupported page sizes before querying", async () => {
    getPurchaseRequests.mockClear();
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseRequests({ pageSize: 75 })).rejects.toThrow();
    expect(getPurchaseRequests).not.toHaveBeenCalled();
  });

  it("rejects an oversized search term before querying", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseRequests({ search: "x".repeat(161) })).rejects.toThrow();
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

  it("lists notes and history only through the admin procedure", async () => {
    getPurchaseRequestById.mockResolvedValueOnce({ id: 12, productCode: "MIDAD-001" });
    getPurchaseRequestNotes.mockResolvedValueOnce({ notes: [{ id: 4, requestId: 12, content: "متابعة الإثبات" }], events: [{ id: 5, action: "created", actorUserId: 7 }] });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.purchaseRequestNotes({ requestId: 12 })).resolves.toEqual({ notes: [{ id: 4, requestId: 12, content: "متابعة الإثبات" }], events: [{ id: 5, action: "created", actorUserId: 7 }] });
  });

  it("creates, updates, and deletes notes with the authenticated admin id", async () => {
    getPurchaseRequestById.mockResolvedValue({ id: 12, productCode: "MIDAD-001" });
    createPurchaseRequestNote.mockResolvedValueOnce({ id: 21 });
    updatePurchaseRequestNote.mockResolvedValueOnce({ id: 21, requestId: 12, content: "محدث" });
    deletePurchaseRequestNote.mockResolvedValueOnce({ id: 21, requestId: 12 });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.createPurchaseRequestNote({ requestId: 12, content: "ملاحظة" })).resolves.toEqual({ success: true, noteId: 21 });
    await expect(caller.admin.updatePurchaseRequestNote({ noteId: 21, content: "محدث" })).resolves.toEqual({ success: true, noteId: 21 });
    await expect(caller.admin.deletePurchaseRequestNote({ noteId: 21 })).resolves.toEqual({ success: true, noteId: 21 });
    expect(createPurchaseRequestNote).toHaveBeenCalledWith({ requestId: 12, content: "ملاحظة", userId: 7 });
    expect(updatePurchaseRequestNote).toHaveBeenCalledWith({ noteId: 21, content: "محدث", userId: 7 });
    expect(deletePurchaseRequestNote).toHaveBeenCalledWith({ noteId: 21, userId: 7 });
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 7, action: "purchase.note.create" }));
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 7, action: "purchase.note.update" }));
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 7, action: "purchase.note.delete" }));
  });

  it("rejects empty notes before calling the database", async () => {
    createPurchaseRequestNote.mockClear();
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.createPurchaseRequestNote({ requestId: 12, content: "   " })).rejects.toThrow();
    expect(createPurchaseRequestNote).not.toHaveBeenCalled();
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
