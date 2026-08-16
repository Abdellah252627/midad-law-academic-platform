import { describe, expect, it, beforeEach } from "vitest";
import { adminRateLimit, adminRateLimitConfig, resetAdminRateLimitForTests } from "./_core/adminRateLimit";

function makeResponse() {
  const headers = new Map<string, string>();
  return {
    headers,
    setHeader(name: string, value: string) { headers.set(name, value); },
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

describe("adminRateLimit", () => {
  beforeEach(() => resetAdminRateLimitForTests());

  it("allows non-admin tRPC procedures without consuming the admin bucket", () => {
    const response = makeResponse();
    let nextCalled = false;
    adminRateLimit({ path: "/landing/published", ip: "127.0.0.1", headers: {}, socket: {} } as never, response as never, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(response.statusCode).toBe(200);
  });

  it("blocks the request after the configured admin limit", () => {
    for (let index = 0; index < adminRateLimitConfig.maxRequests; index += 1) {
      const response = makeResponse();
      adminRateLimit({ path: "/admin/settings", ip: "10.0.0.8", headers: {}, socket: {} } as never, response as never, () => undefined);
      expect(response.statusCode).toBe(200);
    }
    const blocked = makeResponse();
    let nextCalled = false;
    adminRateLimit({ path: "/admin/settings", ip: "10.0.0.8", headers: {}, socket: {} } as never, blocked as never, () => { nextCalled = true; });
    expect(blocked.statusCode).toBe(429);
    expect(nextCalled).toBe(false);
    expect(blocked.body).toEqual(expect.objectContaining({ error: expect.stringContaining("تجاوز") }));
  });
});
