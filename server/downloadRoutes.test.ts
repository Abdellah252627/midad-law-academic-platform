import { describe, expect, it, vi } from "vitest";

const { getPurchaseRequestById, storageGetSignedUrl, verifyDownloadToken } = vi.hoisted(() => ({
  getPurchaseRequestById: vi.fn(),
  storageGetSignedUrl: vi.fn(),
  verifyDownloadToken: vi.fn(),
}));

vi.mock("./db", () => ({ getPurchaseRequestById }));
vi.mock("./storage", () => ({ storageGetSignedUrl }));
vi.mock("./downloadTokens", () => ({ verifyDownloadToken }));

import { registerDownloadRoutes } from "./downloadRoutes";

type Handler = (req: unknown, res: { status: (code: number) => { json: (body: unknown) => void }; redirect: (code: number, url: string) => void }) => Promise<void>;

function createRouteHarness() {
  let handler: Handler | undefined;
  const app = { get: vi.fn((_path: string, callback: Handler) => { handler = callback; }) };
  return { app, getHandler: () => handler };
}

function createResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const redirect = vi.fn();
  return { status, json, redirect };
}

describe("download HTTP route", () => {
  it("returns 410 after the JWT download link expires and does not read storage", async () => {
    verifyDownloadToken.mockRejectedValueOnce(new Error("JWT expired"));
    const harness = createRouteHarness();
    registerDownloadRoutes(harness.app as never);
    const handler = harness.getHandler();
    const response = createResponse();

    await handler?.({ params: { requestId: "5" }, query: { token: "expired-token" } }, response);

    expect(response.status).toHaveBeenCalledWith(410);
    expect(response.json).toHaveBeenCalledWith({ error: "انتهت صلاحية رابط التنزيل" });
    expect(getPurchaseRequestById).not.toHaveBeenCalled();
    expect(storageGetSignedUrl).not.toHaveBeenCalled();
  });
});
