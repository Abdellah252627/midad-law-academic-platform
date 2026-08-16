import { describe, expect, it, vi } from "vitest";

const { createPurchaseRequest, storagePut } = vi.hoisted(() => ({
  createPurchaseRequest: vi.fn().mockResolvedValue({ id: 42 }),
  storagePut: vi.fn().mockResolvedValue({ key: "purchase-proofs/test-proof.pdf", url: "/private" }),
}));

vi.mock("./db", () => ({ createPurchaseRequest }));
vi.mock("./storage", () => ({ storagePut }));

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
