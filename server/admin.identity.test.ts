import { describe, expect, it } from "vitest";
import { AUTHORIZED_ADMIN_OPEN_ID, isAuthorizedAdmin } from "./_core/trpc";

describe("single-account admin access", () => {
  it("allows only the configured owner identity with admin role", () => {
    expect(AUTHORIZED_ADMIN_OPEN_ID).toBeTruthy();
    expect(
      isAuthorizedAdmin({
        id: 1,
        openId: AUTHORIZED_ADMIN_OPEN_ID,
        name: "Owner",
        email: "owner@example.test",
        loginMethod: "manus",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }),
    ).toBe(true);
  });

  it("rejects a different authenticated admin identity", () => {
    expect(
      isAuthorizedAdmin({
        id: 2,
        openId: "different-admin-account",
        name: "Other admin",
        email: "other@example.test",
        loginMethod: "manus",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }),
    ).toBe(false);
  });

  it("rejects the configured identity if its role is not admin", () => {
    expect(
      isAuthorizedAdmin({
        id: 3,
        openId: AUTHORIZED_ADMIN_OPEN_ID,
        name: "Owner",
        email: "owner@example.test",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }),
    ).toBe(false);
  });
});
