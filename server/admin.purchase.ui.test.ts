import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin purchase details UI", () => {
  it("shows the customer identity fields and proof preview in the purchases table", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/AdminPurchases.tsx"), "utf8");

    expect(source).toContain("بيانات العميل");
    expect(source).toContain("request.customerName");
    expect(source).toContain("request.customerEmail");
    expect(source).toContain("request.customerPhone");
    expect(source).toContain("إثبات التحويل");
    expect(source).toContain("setSelectedProofId(request.id)");
    expect(source).toContain("trpc.admin.purchaseProofUrl");
  });
});
