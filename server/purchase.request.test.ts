import { describe, expect, it, vi } from "vitest";

const { createPurchaseRequest, getPurchaseRequestById, approvePurchaseRequest, storagePut, storageGetSignedUrl } = vi.hoisted(() => ({
  createPurchaseRequest: vi.fn().mockResolvedValue({ id: 42 }),
  getPurchaseRequestById: vi.fn(),
  approvePurchaseRequest: vi.fn(),
  storagePut: vi.fn().mockResolvedValue({ key: "purchase-proofs/test-proof.pdf", url: "/private" }),
  storageGetSignedUrl: vi.fn().mockResolvedValue("https://signed.example/midad.pdf"),
}));

vi.mock("./db", () => ({ createPurchaseRequest, getPurchaseRequestById, approvePurchaseRequest }));
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

  it("rejects a different product code", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.purchase.createTransferRequest({
      // @ts-expect-error intentional invalid literal for runtime validation
      productCode: "OTHER-001",
      customerName: "طالب قانون",
      customerEmail: "student@example.com",
      transactionReference: "TX-1234",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
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
