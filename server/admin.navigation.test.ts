import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin account navigation", () => {
  it("keeps the account action inside the admin area", () => {
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

    expect(layout).toContain('setLocation("/admin/account")');
    expect(app).toContain('<Route path="/admin/account" component={AdminAccount} />');
    expect(layout).not.toContain('setLocation("/")');
  });
});
