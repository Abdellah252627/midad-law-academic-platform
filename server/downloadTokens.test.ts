import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({ ENV: { cookieSecret: "download-test-secret" } }));

import { buildDownloadUrl, createDownloadToken, verifyDownloadToken } from "./downloadTokens";

beforeEach(() => {
  vi.useRealTimers();
});

describe("download tokens", () => {
  it("creates a token that verifies for the matching request and file", async () => {
    const token = await createDownloadToken({ requestId: 42, fileKey: "product-files/MIDAD-001/pdf/active.pdf" });
    await expect(verifyDownloadToken(token)).resolves.toEqual({
      requestId: 42,
      fileKey: "product-files/MIDAD-001/pdf/active.pdf",
    });
    expect(buildDownloadUrl(42, token)).toBe(`/api/download/42?token=${encodeURIComponent(token)}`);
  });

  it("rejects a token after the configured lifetime", async () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const token = await createDownloadToken({ requestId: 42, fileKey: "product-files/MIDAD-001/pdf/active.pdf" });

    vi.setSystemTime(new Date(now.getTime() + 16 * 60 * 1000));
    await expect(verifyDownloadToken(token)).rejects.toThrow();
  });
});
