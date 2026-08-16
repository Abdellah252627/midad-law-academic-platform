import { describe, expect, it, beforeEach, vi } from "vitest";
import * as db from "./db";
import { appRouter, buildSampleLeadsCsv } from "./routers";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getSampleDownloadLeads: vi.fn() };
});
import type { TrpcContext } from "./_core/context";

const anonymousContext = {
  user: undefined,
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

const userContext = {
  user: { id: 7, openId: "student-7", role: "user", name: "طالب", email: "student@example.com" },
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

const adminContext = {
  user: { id: 1, openId: "admin-1", role: "admin", name: "مدير", email: "admin@example.com" },
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

const sampleRows = [{
  id: 1,
  productCode: "MIDAD-001",
  fullName: "طالب قانون",
  email: "student@example.com",
  whatsapp: "0664173090",
  consentVersion: "2026-08-16",
  createdAt: new Date("2026-08-16T10:00:00.000Z"),
}];

describe("admin leads protection and CSV", () => {
  beforeEach(() => {
    vi.mocked(db.getSampleDownloadLeads).mockResolvedValue(sampleRows);
  });

  it("returns leads and total for an admin", async () => {
    const caller = appRouter.createCaller(adminContext);
    const result = await caller.admin.sampleLeads();
    expect(result).toEqual({ leads: sampleRows, total: 1 });
  });

  it("returns a dated UTF-8 CSV file for an admin", async () => {
    const caller = appRouter.createCaller(adminContext);
    const result = await caller.admin.sampleLeadsCsv();
    expect(result.filename).toMatch(/^midad-sample-leads-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.csv).toContain("طالب قانون");
    expect(result.csv.startsWith("\uFEFF")).toBe(true);
  });

  it("rejects anonymous access to leads and CSV procedures", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.admin.sampleLeads()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.sampleLeadsCsv()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects authenticated non-admin access", async () => {
    const caller = appRouter.createCaller(userContext);
    await expect(caller.admin.sampleLeads()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.sampleLeadsCsv()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("adds UTF-8 BOM, escapes CSV values, and neutralizes spreadsheet formulas", () => {
    const csv = buildSampleLeadsCsv([{
      id: 1,
      productCode: "MIDAD-001",
      fullName: "=اسم تجريبي",
      email: "student@example.com",
      whatsapp: "0664173090",
      consentVersion: "2026-08-16",
      createdAt: new Date("2026-08-16T10:00:00.000Z"),
    }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=اسم تجريبي");
    expect(csv).toContain("student@example.com");
  });
});
