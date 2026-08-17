import { Router } from "express";
import { z } from "zod";
import { createReview, getRatingContext, getVisibleProductReviews } from "./db";

const router = Router();
const orderIdSchema = z.coerce.number().int().positive();
const productIdSchema = z.string().trim().regex(/^[A-Z0-9-]{3,32}$/);
const reviewBodySchema = z.object({
  order_id: orderIdSchema,
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(5000).optional().default(""),
}).strict();

const emptyContext = () => ({ valid: false, alreadyRated: false, fullName: "", productTitle: "" });
const PRODUCT_TITLE_FALLBACKS: Record<string, string> = {
  "MIDAD-001": "مدخل إلى القانون والعلوم القانونية",
};

function resolveProductTitle(productId: string, productTitle?: string | null) {
  return productTitle || PRODUCT_TITLE_FALLBACKS[productId] || "";
}

router.get("/orders/:orderId/rating-context", async (req, res) => {
  const parsed = orderIdSchema.safeParse(req.params.orderId);
  if (!parsed.success) return res.status(400).json(emptyContext());

  try {
    const order = await getRatingContext(parsed.data);
    if (!order) return res.status(200).json(emptyContext());
    const productTitle = resolveProductTitle(order.productId, order.productTitle);
    const valid = order.status === "approved" && Boolean(productTitle);
    return res.status(200).json({
      valid,
      alreadyRated: Boolean(order.reviewId),
      fullName: valid ? order.fullName : "",
      productTitle: valid ? productTitle : "",
    });
  } catch (error) {
    console.error("[rating-context] failed", error);
    return res.status(500).json({ message: "rating context unavailable" });
  }
});

router.post("/reviews", async (req, res) => {
  const parsed = reviewBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "invalid review data" });

  try {
    const order = await getRatingContext(parsed.data.order_id);
    const productTitle = order ? resolveProductTitle(order.productId, order.productTitle) : "";
    if (!order || order.status !== "approved" || !productTitle) {
      return res.status(400).json({ message: "invalid order" });
    }
    if (order.reviewId) return res.status(409).json({ message: "already rated" });

    try {
      const review = await createReview({
        orderId: order.orderId,
        productId: order.productId,
        fullName: order.fullName,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
        isVisible: 1,
      });
      return res.status(201).json({ success: true, message: "review created", reviewId: review.id });
    } catch (error: any) {
      if (error?.code === "ER_DUP_ENTRY" || error?.errno === 1062) {
        return res.status(409).json({ message: "already rated" });
      }
      throw error;
    }
  } catch (error) {
    console.error("[reviews] create failed", error);
    return res.status(500).json({ message: "review unavailable" });
  }
});

router.get("/products/:productId/reviews", async (req, res) => {
  const parsed = productIdSchema.safeParse(req.params.productId);
  if (!parsed.success) return res.status(400).json({ message: "invalid product" });
  try {
    const reviews = await getVisibleProductReviews(parsed.data);
    return res.status(200).json(reviews.map(review => ({
      full_name: review.fullName,
      rating: review.rating,
      comment: review.comment ?? "",
      created_at: review.createdAt,
    })));
  } catch (error) {
    console.error("[product-reviews] failed", error);
    return res.status(500).json({ message: "reviews unavailable" });
  }
});

export { router as ratingRouter };
