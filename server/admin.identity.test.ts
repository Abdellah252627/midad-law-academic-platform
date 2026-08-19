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

  it("allows the configured owner identity even if its stored role is stale", () => {
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
    ).toBe(true);
  });

  it("allows the explicitly authorized owner email when OpenID rotates", () => {
    expect(
      isAuthorizedAdmin({
        id: 4,
        openId: "rotated-owner-open-id",
        name: "Abdellah",
        email: " AbdellahMR538@GMAIL.COM ",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }),
    ).toBe(true);
  });

  it("rejects a different email even when the account has an admin role", () => {
    expect(
      isAuthorizedAdmin({
        id: 5,
        openId: "different-open-id",
        name: "Other",
        email: "other@example.com",
        loginMethod: "manus",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }),
    ).toBe(false);
  });
});
