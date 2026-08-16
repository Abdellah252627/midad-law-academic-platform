import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = (name: string) => readFileSync(new URL(`../client/src/pages/${name}`, import.meta.url), "utf8");

describe("admin toast coverage", () => {
  it("uses Sonner toast in every interactive admin page", () => {
    for (const name of ["AdminDashboard.tsx", "AdminFiles.tsx", "AdminPurchases.tsx", "AdminSettings.tsx", "AdminLeads.tsx"]) {
      const source = page(name);
      expect(source).toContain('from "sonner"');
      expect(source).toMatch(/toast\.(success|error|info)/);
    }
  });

  it("keeps leads export success and failure feedback in Toast", () => {
    const source = page("AdminLeads.tsx");
    expect(source).toContain("toast.success(\"تم تصدير التسجيلات المحددة\")");
    expect(source).toContain("toast.error(\"تعذر تصدير التسجيلات المحددة. حدّث الصفحة وحاول مرة أخرى.\")");
    expect(source).toContain("toast.success(\"تم تصدير جميع التسجيلات\")");
  });
});
