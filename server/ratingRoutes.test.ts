import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRatingContext: vi.fn(),
  createReview: vi.fn(),
  getVisibleProductReviews: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { ratingRouter } from "./ratingRoutes";

let server: ReturnType<express.Application["listen"]>;
let baseUrl = "";

beforeEach(async () => {
  mocks.getRatingContext.mockReset();
  mocks.createReview.mockReset();
  mocks.getVisibleProductReviews.mockReset();
  const app = express();
  app.use(express.json());
  app.use("/api", ratingRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => {
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe("rating REST endpoints", () => {
  it("returns safe context for an approved order without customer phone", async () => {
    mocks.getRatingContext.mockResolvedValue({
      orderId: 42,
      status: "approved",
      fullName: "ABDEL LAH",
      productId: "MIDAD-001",
      productTitle: "مدخل إلى القانون والعلوم القانونية",
      reviewId: null,
      customerPhone: "0664173090",
    });
    const response = await fetch(`${baseUrl}/api/orders/42/rating-context`);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      valid: true,
      alreadyRated: false,
      fullName: "ABDEL LAH",
      productTitle: "مدخل إلى القانون والعلوم القانونية",
    });
    expect(body).not.toHaveProperty("customerPhone");
  });

  it("rejects invalid order and invalid rating server-side", async () => {
    mocks.getRatingContext.mockResolvedValue(undefined);
    const context = await fetch(`${baseUrl}/api/orders/not-an-id/rating-context`);
    expect(context.status).toBe(400);
    expect(await context.json()).toEqual({ valid: false, alreadyRated: false, fullName: "", productTitle: "" });

    const review = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_id: 42, rating: 6, comment: "bad" }),
    });
    expect(review.status).toBe(400);
    expect(mocks.getRatingContext).not.toHaveBeenCalled();
  });

  it("copies full name and product from the order and prevents duplicate reviews", async () => {
    mocks.getRatingContext.mockResolvedValue({
      orderId: 42,
      status: "approved",
      fullName: "ABDEL LAH",
      productId: "MIDAD-001",
      productTitle: "مدخل إلى القانون والعلوم القانونية",
      reviewId: null,
    });
    mocks.createReview.mockResolvedValue({ id: 9 });
    const response = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_id: 42, rating: 5, comment: "مفيد" }),
    });
    expect(response.status).toBe(201);
    expect(mocks.createReview).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 42,
      productId: "MIDAD-001",
      fullName: "ABDEL LAH",
      rating: 5,
      comment: "مفيد",
      isVisible: 1,
    }));

    mocks.getRatingContext.mockResolvedValue({
      orderId: 42,
      status: "approved",
      fullName: "ABDEL LAH",
      productId: "MIDAD-001",
      productTitle: "مدخل إلى القانون والعلوم القانونية",
      reviewId: 9,
    });
    const duplicate = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order_id: 42, rating: 4 }),
    });
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual({ message: "already rated" });
  });

  it("returns only public fields for visible product reviews", async () => {
    mocks.getVisibleProductReviews.mockResolvedValue([{
      fullName: "ABDEL LAH",
      rating: 5,
      comment: "مفيد",
      createdAt: new Date("2026-08-17T10:00:00.000Z"),
      orderId: 42,
      productId: "MIDAD-001",
    }]);
    const response = await fetch(`${baseUrl}/api/products/MIDAD-001/reviews`);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body[0]).toEqual({
      full_name: "ABDEL LAH",
      rating: 5,
      comment: "مفيد",
      created_at: "2026-08-17T10:00:00.000Z",
    });
    expect(body[0]).not.toHaveProperty("orderId");
    expect(body[0]).not.toHaveProperty("productId");
  });
});
