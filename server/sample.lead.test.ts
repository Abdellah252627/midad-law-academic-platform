import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx = {
  user: undefined,
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

describe("sample.submitLead", () => {
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
