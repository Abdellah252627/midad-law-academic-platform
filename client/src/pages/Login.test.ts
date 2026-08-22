import { describe, expect, it } from "vitest";
import { destinationFor, roleLabel } from "./Login";

describe("Login routing contract", () => {
  it("routes administrative accounts to the Back Office", () => {
    expect(destinationFor("admin")).toBe("/admin");
    expect(roleLabel("admin")).toBe("حساب إداري");
  });

  it("routes regular accounts to the forum", () => {
    expect(destinationFor("user")).toBe("/forum");
    expect(roleLabel("user")).toBe("مستخدم مسجل");
    expect(destinationFor(undefined)).toBe("/forum");
  });
});
