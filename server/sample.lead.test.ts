import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import * as storage from "./storage";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, createSampleDownloadLead: vi.fn() };
});

vi.mock("./storage", async () => {
  const actual = await vi.importActual<typeof import("./storage")>("./storage");
  return { ...actual, storageGetSignedUrl: vi.fn() };
});

const ctx = {
  user: undefined,
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

describe("sample.submitLead", () => {
  beforeEach(() => {
    vi.mocked(db.createSampleDownloadLead).mockResolvedValue(undefined);
    vi.mocked(storage.storageGetSignedUrl).mockResolvedValue("https://example.com/sample.pdf");
  });

  it("rejects malformed contact data before persistence", async () => {
    const caller = appRouter.createCaller(ctx);

    await expect(caller.sample.submitLead({
      productCode: "MIDAD-001",
      fullName: "أ",
      email: "not-an-email",
      whatsapp: "123",
      consent: true,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts an Arabic two-word name", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sample.submitLead({
      productCode: "MIDAD-001",
      fullName: "طالب  قانون",
      email: "student@example.com",
      whatsapp: "0664173090",
      consent: true,
    });

    expect(result.success).toBe(true);
    expect(db.createSampleDownloadLead).toHaveBeenCalledWith(expect.objectContaining({ fullName: "طالب قانون" }));
  });

  it("accepts a Latin two-word name such as ABDEL LAH", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sample.submitLead({
      productCode: "MIDAD-001",
      fullName: "ABDEL LAH",
      email: "student@example.com",
      whatsapp: "0664173090",
      consent: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a name made only of symbols or digits", async () => {
    const caller = appRouter.createCaller(ctx);

    await expect(caller.sample.submitLead({
      productCode: "MIDAD-001",
      fullName: "1234 !!!",
      email: "student@example.com",
      whatsapp: "0664173090",
      consent: true,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a lead without explicit consent", async () => {
    const caller = appRouter.createCaller(ctx);

    await expect(caller.sample.submitLead({
      productCode: "MIDAD-001",
      fullName: "طالب قانون",
      email: "student@example.com",
      whatsapp: "0664173090",
      consent: false,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

