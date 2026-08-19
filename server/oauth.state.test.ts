import { describe, expect, it } from "vitest";
import { decodeOAuthState, encodeOAuthState } from "../shared/const";

describe("OAuth state protection", () => {
  it("round-trips redirect URI and nonce without losing the CSRF binding", () => {
    const state = encodeOAuthState({
      redirectUri: "https://midadpage-bagpq5fy.manus.space/api/oauth/callback",
      nonce: "nonce-123",
    });

    expect(decodeOAuthState(state)).toEqual({
      redirectUri: "https://midadpage-bagpq5fy.manus.space/api/oauth/callback",
      nonce: "nonce-123",
    });
  });

  it("does not accept a legacy state as a nonce-bearing state", () => {
    const legacyState = btoa("https://midadpage-bagpq5fy.manus.space/api/oauth/callback");
    expect(decodeOAuthState(legacyState)).toEqual({
      redirectUri: "https://midadpage-bagpq5fy.manus.space/api/oauth/callback",
    });
  });
});
