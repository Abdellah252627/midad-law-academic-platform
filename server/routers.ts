import { randomUUID } from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { approvePurchaseRequest, createPurchaseRequest, createSampleDownloadLead, deleteLandingChapter, deleteLandingFaq, getLandingAdminContent, getPublishedLandingContent, getPurchaseRequestById, getSampleDownloadLeads, saveLandingChapter, saveLandingFaq, saveLandingProduct } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

const PRODUCT_PDF_KEYS = { "MIDAD-001": "midad-001-law-summary_4382aff1.pdf" } as const;
const SAMPLE_PDF_KEYS = { "MIDAD-001": "MIDAD-001-sample-noted_fd59ed4b.pdf" } as const;
const SAMPLE_CONSENT_VERSION = "2026-08-16";

function csvCell(value: string | number | Date | null) {
  const raw = value instanceof Date ? value.toISOString() : String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildSampleLeadsCsv(leads: Array<{ id: number; productCode: string; fullName: string; email: string; whatsapp: string; consentVersion: string; createdAt: Date }>) {
  const header = ["المعرف", "المنتج", "الاسم الكامل", "البريد الإلكتروني", "واتساب", "نسخة الموافقة", "تاريخ التسجيل"];
  const rows = leads.map(lead => [lead.id, lead.productCode, lead.fullName, lead.email, lead.whatsapp, lead.consentVersion, lead.createdAt]);
  const csv = [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  return `\uFEFF${csv}`;
}

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
  landing: router({
    published: publicProcedure.input(z.object({ productCode: z.literal("MIDAD-001") })).query(({ input }) => getPublishedLandingContent(input.productCode)),
  }),
  sample: router({
    submitLead: publicProcedure
      .input(z.object({
        productCode: z.literal("MIDAD-001"),
        fullName: z.string().trim().min(2).max(160).transform(value => value.replace(/\s+/g, " ")).refine(value => value.split(" ").filter(Boolean).length >= 2 && /^[A-Za-z\u0600-\u06FF ]+$/.test(value), "الاسم الكامل غير صالح"),
        email: z.string().trim().email().max(320),
        whatsapp: z.string().trim().transform(value => value.replace(/[\s()-]/g, "")).refine(value => /^(?:0[5-7]\d{8}|(?:\+?212)[5-7]\d{8})$/.test(value), "رقم واتساب غير صالح"),
        consent: z.boolean().refine(value => value, "الموافقة مطلوبة"),
      }))
      .mutation(async ({ input }) => {
        const key = SAMPLE_PDF_KEYS[input.productCode];
        if (!key) throw new Error("ملف العينة غير مهيأ");
        await createSampleDownloadLead({
          productCode: input.productCode,
          fullName: input.fullName,
          email: input.email.toLowerCase(),
          whatsapp: input.whatsapp,
          consentVersion: SAMPLE_CONSENT_VERSION,
        });
        return { success: true as const, url: await storageGetSignedUrl(key), expiresInMinutes: 15 };
      }),
  }),
  admin: router({
    landingContent: adminProcedure.input(z.object({ productCode: z.literal("MIDAD-001") })).query(({ input }) => getLandingAdminContent(input.productCode)),
    saveProduct: adminProcedure.input(z.object({ productCode: z.literal("MIDAD-001"), title: z.string().trim().min(3).max(220), category: z.string().trim().min(2).max(120), university: z.string().trim().min(2).max(180), track: z.string().trim().max(180).optional(), description: z.string().trim().min(10).max(5000), priceMad: z.number().int().min(0).max(100000), isPublished: z.union([z.literal(0), z.literal(1)]) })).mutation(({ input }) => saveLandingProduct(input)),
    saveChapter: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), productCode: z.literal("MIDAD-001"), chapterNumber: z.string().trim().min(1).max(8), title: z.string().trim().min(2).max(220), excerpt: z.string().trim().min(10).max(3000), questionsJson: z.string().trim().min(2).max(5000), sortOrder: z.number().int().min(0).max(999), isPublished: z.union([z.literal(0), z.literal(1)]) })).mutation(({ input }) => saveLandingChapter(input)),
    deleteChapter: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteLandingChapter(input.id)),
    saveFaq: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), productCode: z.literal("MIDAD-001"), question: z.string().trim().min(3).max(300), answer: z.string().trim().min(5).max(5000), sortOrder: z.number().int().min(0).max(999), isPublished: z.union([z.literal(0), z.literal(1)]) })).mutation(({ input }) => saveLandingFaq(input)),
    deleteFaq: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteLandingFaq(input.id)),
    sampleLeads: adminProcedure.query(async () => {
      const leads = await getSampleDownloadLeads();
      return { leads, total: leads.length };
    }),
    sampleLeadsCsv: adminProcedure.query(async () => {
      const leads = await getSampleDownloadLeads();
      return { filename: `midad-sample-leads-${new Date().toISOString().slice(0, 10)}.csv`, csv: buildSampleLeadsCsv(leads) };
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
