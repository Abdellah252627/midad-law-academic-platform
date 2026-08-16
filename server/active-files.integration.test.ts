import { describe, expect, it, vi } from "vitest";
import * as db from "./db";
import * as storage from "./storage";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getPublishedLandingContent: vi.fn(),
    getActiveProductFile: vi.fn(),
    createSampleDownloadLead: vi.fn(),
  };
});

vi.mock("./storage", async () => {
  const actual = await vi.importActual<typeof import("./storage")>("./storage");
  return { ...actual, storageGetSignedUrl: vi.fn() };
});

const publicContext = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

describe("active product files in public flows", () => {
  it("uses the active cover URL in published landing content", async () => {
    vi.mocked(db.getPublishedLandingContent).mockResolvedValue({ title: "MIDAD", chapters: [], faqs: [] } as never);
    vi.mocked(db.getActiveProductFile).mockResolvedValue({ fileKey: "covers/active.png", fileType: "cover" } as never);
    vi.mocked(storage.storageGetSignedUrl).mockResolvedValue("https://signed.test/active-cover.png");

    const result = await appRouter.createCaller(publicContext).landing.published({ productCode: "MIDAD-001" });

    expect(result.coverUrl).toBe("https://signed.test/active-cover.png");
    expect(db.getActiveProductFile).toHaveBeenCalledWith("MIDAD-001", "cover");
    expect(storage.storageGetSignedUrl).toHaveBeenCalledWith("covers/active.png");
  });

  it("uses the active sample URL for a lead and falls back when no active sample exists", async () => {
    vi.mocked(db.getActiveProductFile).mockResolvedValueOnce({ fileKey: "samples/active.pdf", fileType: "sample" } as never);
    vi.mocked(storage.storageGetSignedUrl).mockResolvedValueOnce("https://signed.test/active-sample.pdf");
    vi.mocked(db.createSampleDownloadLead).mockResolvedValue({ id: 10 });

    const active = await appRouter.createCaller(publicContext).sample.submitLead({
      productCode: "MIDAD-001", fullName: "Abdel Lah", email: "student@example.com", whatsapp: "0664173090", consent: true,
    });
    expect(active.url).toBe("https://signed.test/active-sample.pdf");
    expect(storage.storageGetSignedUrl).toHaveBeenCalledWith("samples/active.pdf");

    vi.mocked(db.getActiveProductFile).mockResolvedValueOnce(undefined);
    vi.mocked(storage.storageGetSignedUrl).mockResolvedValueOnce("https://signed.test/fallback-sample.pdf");
    const fallback = await appRouter.createCaller(publicContext).sample.submitLead({
      productCode: "MIDAD-001", fullName: "Fatima Zahra", email: "fatima@example.com", whatsapp: "0664173090", consent: true,
    });
    expect(fallback.url).toBe("https://signed.test/fallback-sample.pdf");
    expect(storage.storageGetSignedUrl).toHaveBeenCalledWith(expect.stringContaining("sample"));
  });
});
