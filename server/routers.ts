import { randomUUID } from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { approvePurchaseRequest, createPurchaseRequest, getPurchaseRequestById } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

const PRODUCT_PDF_KEYS = { "MIDAD-001": "midad-001-law-summary_4382aff1.pdf" } as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  purchase: router({
    createTransferRequest: publicProcedure
      .input(z.object({
        productCode: z.literal("MIDAD-001"),
        customerName: z.string().trim().min(2).max(160),
        customerEmail: z.string().trim().email().max(320),
        customerPhone: z.string().trim().max(32).optional(),
        transactionReference: z.string().trim().min(4).max(120),
        proof: z.object({
          fileName: z.string().trim().min(1).max(160),
          contentType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
          base64: z.string().min(100).max(7_000_000),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        let proofKey: string | null = null;
        if (input.proof) {
          const safeName = input.proof.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
          const uploaded = await storagePut(
            `purchase-proofs/${Date.now()}-${randomUUID()}-${safeName}`,
            Buffer.from(input.proof.base64, "base64"),
            input.proof.contentType,
          );
          proofKey = uploaded.key;
        }
        const result = await createPurchaseRequest({
          productCode: input.productCode,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone || null,
          transactionReference: input.transactionReference,
          proofKey,
          status: "pending",
        });
        return { success: true as const, requestId: result.id };
      }),
    getDownloadLink: publicProcedure
      .input(z.object({ requestId: z.number().int().positive(), customerEmail: z.string().trim().email().max(320) }))
      .query(async ({ input }) => {
        const request = await getPurchaseRequestById(input.requestId);
        if (!request || request.customerEmail.toLowerCase() !== input.customerEmail.toLowerCase()) {
          throw new Error("طلب التنزيل غير موجود");
        }
        if (request.status !== "approved") {
          throw new Error("لم تتم الموافقة على الطلب بعد");
        }
        const key = PRODUCT_PDF_KEYS[request.productCode as keyof typeof PRODUCT_PDF_KEYS];
        if (!key) throw new Error("ملف المنتج غير مهيأ للتسليم");
        return { url: await storageGetSignedUrl(key), expiresInMinutes: 15 };
      }),
    approveTransferRequest: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const request = await approvePurchaseRequest(input.requestId);
        if (!request) throw new Error("طلب الشراء غير موجود");
        const key = PRODUCT_PDF_KEYS[request.productCode as keyof typeof PRODUCT_PDF_KEYS];
        if (!key) throw new Error("ملف المنتج غير مهيأ للتسليم");
        return { success: true as const, requestId: request.id, downloadUrl: await storageGetSignedUrl(key) };
      }),
  }),
});

export type AppRouter = typeof appRouter;
