import { describe, expect, it, vi } from "vitest";

const { createPurchaseRequest, createAnalyticsEvent, getPurchaseRequestById, approvePurchaseRequest, getActiveProductFile, storagePut, storageGetSignedUrl } = vi.hoisted(() => ({
  createPurchaseRequest: vi.fn().mockResolvedValue({ id: 42 }),
  createAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
  getPurchaseRequestById: vi.fn(),
  approvePurchaseRequest: vi.fn(),
  getActiveProductFile: vi.fn().mockResolvedValue({ fileKey: "product-files/MIDAD-001/pdf/active.pdf", fileType: "pdf" }),
  storagePut: vi.fn().mockResolvedValue({ key: "purchase-proofs/test-proof.pdf", url: "/private" }),
  storageGetSignedUrl: vi.fn().mockResolvedValue("https://signed.example/midad.pdf"),
}));

vi.mock("./db", () => ({ createPurchaseRequest, createAnalyticsEvent, getPurchaseRequestById, approvePurchaseRequest, getActiveProductFile }));
vi.mock("./storage", () => ({ storagePut, storageGetSignedUrl }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("purchase.createTransferRequest", () => {
  it("rejects invalid customer email before persistence", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.purchase.createTransferRequest({
      productCode: "MIDAD-001",
      customerName: "طالب قانون",
      customerEmail: "invalid-email",
      transactionReference: "TX-1234",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts a valid product code without forcing MIDAD-001", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.purchase.createTransferRequest({
      productCode: "OTHER-001",
      customerName: "طالب قانون",
      customerEmail: "student@example.com",
      transactionReference: "TX-1234",
    })).resolves.toEqual({ success: true, requestId: 42 });
  });

  it("blocks download until the request is approved", async () => {
    getPurchaseRequestById.mockResolvedValueOnce({ id: 11, productCode: "MIDAD-001", customerEmail: "student@example.com", status: "pending" });
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.purchase.getDownloadLink({ requestId: 11, customerEmail: "student@example.com" })).rejects.toThrow("لم تتم الموافقة");
  });

  it("returns a signed URL only for an approved matching request", async () => {
    getPurchaseRequestById.mockResolvedValueOnce({ id: 12, productCode: "MIDAD-001", customerEmail: "student@example.com", status: "approved" });
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.purchase.getDownloadLink({ requestId: 12, customerEmail: "student@example.com" })).resolves.toEqual({ url: "https://signed.example/midad.pdf", expiresInMinutes: 15 });
    expect(getActiveProductFile).toHaveBeenCalledWith("MIDAD-001", "pdf");
  });

  it("falls back to the configured PDF key when no active PDF version exists", async () => {
    getActiveProductFile.mockResolvedValueOnce(undefined);
    storageGetSignedUrl.mockResolvedValueOnce("https://signed.example/fallback-midad.pdf");
    getPurchaseRequestById.mockResolvedValueOnce({ id: 13, productCode: "MIDAD-001", customerEmail: "student@example.com", status: "approved" });
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.purchase.getDownloadLink({ requestId: 13, customerEmail: "student@example.com" })).resolves.toEqual({
      url: "https://signed.example/fallback-midad.pdf",
      expiresInMinutes: 15,
    });
    expect(storageGetSignedUrl).toHaveBeenCalledWith(expect.stringContaining("MIDAD-001"));
  });

  it("stores a pending request and a private proof key", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.purchase.createTransferRequest({
      productCode: "MIDAD-001",
      customerName: "طالب قانون",
      customerEmail: "student@example.com",
      transactionReference: "TX-5678",
      proof: { fileName: "proof.pdf", contentType: "application/pdf", base64: "a".repeat(120) },
    });

    expect(result).toEqual({ success: true, requestId: 42 });
    expect(storagePut).toHaveBeenCalledOnce();
    expect(createPurchaseRequest).toHaveBeenCalledWith(expect.objectContaining({
      productCode: "MIDAD-001",
      status: "pending",
      proofKey: "purchase-proofs/test-proof.pdf",
    }));
  });
});
