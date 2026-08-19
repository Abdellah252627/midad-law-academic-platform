import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProductPricing, getPublishedLandingContent, createPurchaseRequest, createAnalyticsEvent, storagePut, storageGetSignedUrl } = vi.hoisted(() => ({
  getProductPricing: vi.fn(),
  getPublishedLandingContent: vi.fn(),
  createPurchaseRequest: vi.fn(),
  createAnalyticsEvent: vi.fn(),
  storagePut: vi.fn(),
  storageGetSignedUrl: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getProductPricing, getPublishedLandingContent, createPurchaseRequest, createAnalyticsEvent };
});

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

describe("tiered product pricing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createPurchaseRequest.mockResolvedValue({ id: 41, orderNumber: "MIDAD-20260819-TEST" });
    createAnalyticsEvent.mockResolvedValue(undefined);
    storageGetSignedUrl.mockResolvedValue("https://signed.example/cover.png");
  });

  it("returns Early Bird price and remaining seats while approved buyers are below ten", async () => {
    getProductPricing.mockResolvedValueOnce({
      priceMad: 19,
      manualPriceMad: 19,
      approvedBuyers: 7,
      earlyBirdLimit: 10,
      earlyBirdPriceMad: 19,
      earlyBirdActive: true,
      earlyBirdSeatsRemaining: 3,
    });

    getPublishedLandingContent.mockResolvedValueOnce({ product: { productCode: "MIDAD-001", priceMad: 19, isPublished: 1 }, chapters: [], faqs: [], pricing: { priceMad: 19, approvedBuyers: 7, earlyBirdLimit: 10, earlyBirdActive: true, earlyBirdSeatsRemaining: 3 } });
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.landing.published({ productCode: "MIDAD-001" });
    expect(result.pricing).toMatchObject({ priceMad: 19, approvedBuyers: 7, earlyBirdActive: true, earlyBirdSeatsRemaining: 3 });
  });

  it("snapshots the active tier price into pricePaid when a transfer request is created", async () => {
    getProductPricing.mockResolvedValueOnce({
      priceMad: 49,
      manualPriceMad: 49,
      approvedBuyers: 10,
      earlyBirdLimit: 10,
      earlyBirdPriceMad: 19,
      earlyBirdActive: false,
      earlyBirdSeatsRemaining: 0,
    });

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.purchase.createTransferRequest({
      productCode: "MIDAD-001",
      customerName: "محمد أمين",
      customerEmail: "example@test.com",
      customerPhone: "0664173090",
      transactionReference: "TRX-1234",
    });

    expect(result).toEqual({ success: true, requestId: 41, orderNumber: "MIDAD-20260819-TEST" });
    expect(createPurchaseRequest).toHaveBeenCalledWith(expect.objectContaining({
      productCode: "MIDAD-001",
      pricePaid: 49,
      status: "pending",
    }));
  });
});
