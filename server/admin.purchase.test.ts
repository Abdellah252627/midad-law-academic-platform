import { describe, expect, it, vi } from "vitest";

const { getPurchaseRequests, getPurchaseRequestById, approvePurchaseRequest, rejectPurchaseRequest, createAuditLog, storageGetSignedUrl } = vi.hoisted(() => ({
  getPurchaseRequests: vi.fn(),
  getPurchaseRequestById: vi.fn(),
  approvePurchaseRequest: vi.fn(),
  rejectPurchaseRequest: vi.fn(),
  createAuditLog: vi.fn(),
  storageGetSignedUrl: vi.fn().mockResolvedValue("https://signed.example/proof.pdf"),
}));

vi.mock("./db", () => ({ getPurchaseRequests, getPurchaseRequestById, approvePurchaseRequest, rejectPurchaseRequest, createAuditLog }));
vi.mock("./storage", () => ({ storageGetSignedUrl }));

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
    approvePurchaseRequest.mockResolvedValueOnce({ id: 3, productCode: "MIDAD-001" });
    rejectPurchaseRequest.mockResolvedValueOnce({ id: 4 });
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.approvePurchase({ requestId: 3 })).resolves.toEqual({ success: true, requestId: 3, downloadUrl: "https://signed.example/proof.pdf", expiresInMinutes: 15 });
    await expect(caller.admin.rejectPurchase({ requestId: 4, reason: "الإثبات غير واضح" })).resolves.toEqual({ success: true, requestId: 4 });
    expect(approvePurchaseRequest).toHaveBeenCalledWith(3, 7);
    expect(rejectPurchaseRequest).toHaveBeenCalledWith(4, "الإثبات غير واضح", 7);
  });
});
