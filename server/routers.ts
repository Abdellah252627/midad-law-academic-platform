import { randomUUID } from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { createPurchaseRequest } from "./db";
import { storagePut } from "./storage";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

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
  }),
});

export type AppRouter = typeof appRouter;
