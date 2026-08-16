import { randomUUID } from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { approvePurchaseRequest, createAuditLog, createProductFile, createPurchaseRequest, createSampleDownloadLead, deleteLandingChapter, deleteLandingFaq, getActiveProductFile, getAuditLogs, getLandingAdminContent, getProductFiles, getPublishedLandingContent, getPurchaseRequestById, getPurchaseRequests, getSampleDownloadLeads, rejectPurchaseRequest, restoreLandingChapter, restoreLandingFaq, saveLandingChapter, saveLandingFaq, saveLandingProduct } from "./db";
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
    published: publicProcedure.input(z.object({ productCode: z.literal("MIDAD-001") })).query(async ({ input }) => {
      const content = await getPublishedLandingContent(input.productCode);
      const activeCover = await getActiveProductFile(input.productCode, "cover");
      return {
        ...content,
        coverUrl: activeCover ? await storageGetSignedUrl(activeCover.fileKey) : null,
      };
    }),
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
        const activeSample = await getActiveProductFile(input.productCode, "sample");
        const key = activeSample?.fileKey ?? SAMPLE_PDF_KEYS[input.productCode];
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
    saveProduct: adminProcedure.input(z.object({ productCode: z.literal("MIDAD-001"), title: z.string().trim().min(3).max(220), category: z.string().trim().min(2).max(120), university: z.string().trim().min(2).max(180), track: z.string().trim().max(180).optional(), description: z.string().trim().min(10).max(5000), priceMad: z.number().int().min(0).max(100000), isPublished: z.union([z.literal(0), z.literal(1)]) })).mutation(async ({ input, ctx }) => { await saveLandingProduct(input); await createAuditLog({ actorUserId: ctx.user.id, action: "content.save", entityType: "landing_product", entityId: input.productCode, productCode: input.productCode, metadataJson: JSON.stringify({ priceMad: input.priceMad, isPublished: input.isPublished }) }); return { success: true as const }; }),
    saveChapter: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), productCode: z.literal("MIDAD-001"), chapterNumber: z.string().trim().min(1).max(8), title: z.string().trim().min(2).max(220), excerpt: z.string().trim().min(10).max(3000), questionsJson: z.string().trim().min(2).max(5000), sortOrder: z.number().int().min(0).max(999), isPublished: z.union([z.literal(0), z.literal(1)]) })).mutation(async ({ input, ctx }) => { const id = await saveLandingChapter(input); await createAuditLog({ actorUserId: ctx.user.id, action: "content.save", entityType: "landing_chapter", entityId: String(id), productCode: input.productCode, metadataJson: JSON.stringify({ chapterNumber: input.chapterNumber, isPublished: input.isPublished }) }); return id; }),
    deleteChapter: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => { await deleteLandingChapter(input.id); await createAuditLog({ actorUserId: ctx.user.id, action: "content.delete", entityType: "landing_chapter", entityId: String(input.id), productCode: "MIDAD-001", metadataJson: null }); return { success: true as const }; }),
    restoreChapter: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => { await restoreLandingChapter(input.id); await createAuditLog({ actorUserId: ctx.user.id, action: "content.restore", entityType: "landing_chapter", entityId: String(input.id), productCode: "MIDAD-001", metadataJson: null }); return { success: true as const }; }),
    saveFaq: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), productCode: z.literal("MIDAD-001"), question: z.string().trim().min(3).max(300), answer: z.string().trim().min(5).max(5000), sortOrder: z.number().int().min(0).max(999), isPublished: z.union([z.literal(0), z.literal(1)]) })).mutation(async ({ input, ctx }) => { const id = await saveLandingFaq(input); await createAuditLog({ actorUserId: ctx.user.id, action: "content.save", entityType: "landing_faq", entityId: String(id), productCode: input.productCode, metadataJson: JSON.stringify({ isPublished: input.isPublished }) }); return id; }),
    deleteFaq: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => { await deleteLandingFaq(input.id); await createAuditLog({ actorUserId: ctx.user.id, action: "content.delete", entityType: "landing_faq", entityId: String(input.id), productCode: "MIDAD-001", metadataJson: null }); return { success: true as const }; }),
    restoreFaq: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => { await restoreLandingFaq(input.id); await createAuditLog({ actorUserId: ctx.user.id, action: "content.restore", entityType: "landing_faq", entityId: String(input.id), productCode: "MIDAD-001", metadataJson: null }); return { success: true as const }; }),
    sampleLeads: adminProcedure.query(async () => {
      const leads = await getSampleDownloadLeads();
      return { leads, total: leads.length };
    }),
    sampleLeadsCsv: adminProcedure.query(async () => {
      const leads = await getSampleDownloadLeads();
      return { filename: `midad-sample-leads-${new Date().toISOString().slice(0, 10)}.csv`, csv: buildSampleLeadsCsv(leads) };
    }),
    purchaseRequests: adminProcedure.query(async () => {
      const requests = await getPurchaseRequests();
      return { requests, total: requests.length };
    }),
    purchaseProofUrl: adminProcedure.input(z.object({ requestId: z.number().int().positive() })).query(async ({ input }) => {
      const request = await getPurchaseRequestById(input.requestId);
      if (!request?.proofKey) return { url: null };
      return { url: await storageGetSignedUrl(request.proofKey), contentType: request.proofContentType };
    }),
    approvePurchase: adminProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const request = await approvePurchaseRequest(input.requestId, ctx.user.id);
      if (!request) throw new Error("طلب الشراء غير موجود");
      await createAuditLog({ actorUserId: ctx.user.id, action: "purchase.approve", entityType: "purchase_request", entityId: String(request.id), productCode: request.productCode, metadataJson: null });
      const key = PRODUCT_PDF_KEYS[request.productCode as keyof typeof PRODUCT_PDF_KEYS];
      if (!key) throw new Error("ملف المنتج غير مهيأ للتسليم");
      return { success: true as const, requestId: request.id, downloadUrl: await storageGetSignedUrl(key), expiresInMinutes: 15 };
    }),
    rejectPurchase: adminProcedure.input(z.object({ requestId: z.number().int().positive(), reason: z.string().trim().min(3).max(500) })).mutation(async ({ input, ctx }) => {
      const request = await rejectPurchaseRequest(input.requestId, input.reason, ctx.user.id);
      if (!request) throw new Error("طلب الشراء غير موجود");
      await createAuditLog({ actorUserId: ctx.user.id, action: "purchase.reject", entityType: "purchase_request", entityId: String(request.id), productCode: request.productCode, metadataJson: JSON.stringify({ reason: input.reason }) });
      return { success: true as const, requestId: request.id };
    }),
    files: adminProcedure.input(z.object({ productCode: z.literal("MIDAD-001") })).query(({ input }) => getProductFiles(input.productCode)),
    fileUrl: adminProcedure.input(z.object({ fileId: z.number().int().positive() })).query(async ({ input }) => {
      const files = await getProductFiles("MIDAD-001");
      const file = files.find(item => item.id === input.fileId);
      if (!file) throw new Error("الملف غير موجود");
      return { url: await storageGetSignedUrl(file.fileKey), fileName: file.fileName, contentType: file.contentType };
    }),
    uploadFile: adminProcedure.input(z.object({ productCode: z.literal("MIDAD-001"), fileType: z.enum(["pdf", "cover", "sample"]), fileName: z.string().trim().min(1).max(220), contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]), base64: z.string().min(100).max(14_000_000) })).mutation(async ({ input, ctx }) => {
      const expectedType = input.fileType === "pdf" || input.fileType === "sample" ? "application/pdf" : input.contentType;
      if (input.fileType === "cover" && input.contentType === "application/pdf") throw new Error("صورة الغلاف يجب أن تكون JPG أو PNG");
      if (input.fileType !== "cover" && input.contentType !== "application/pdf") throw new Error("ملف المنتج يجب أن يكون PDF");
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const uploaded = await storagePut(`product-files/${input.productCode}/${input.fileType}/${Date.now()}-${randomUUID()}-${safeName}`, Buffer.from(input.base64, "base64"), expectedType);
      const existing = await getProductFiles(input.productCode);
      const version = (existing.filter(item => item.fileType === input.fileType).reduce((max, item) => Math.max(max, item.version), 0) || 0) + 1;
      const fileId = await createProductFile({ productCode: input.productCode, fileType: input.fileType, fileKey: uploaded.key, fileName: input.fileName, contentType: expectedType, version, isActive: 1, uploadedByUserId: ctx.user.id });
      await createAuditLog({ actorUserId: ctx.user.id, action: "file.upload", entityType: "product_file", entityId: String(fileId), productCode: input.productCode, metadataJson: JSON.stringify({ fileType: input.fileType, version, fileName: input.fileName }) });
      return { success: true as const, fileId, version };
    }),
    auditLogs: adminProcedure.query(() => getAuditLogs()),
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
          proofContentType: input.proof?.contentType ?? null,
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
        const activePdf = await getActiveProductFile(request.productCode, "pdf");
        const key = activePdf?.fileKey ?? PRODUCT_PDF_KEYS[request.productCode as keyof typeof PRODUCT_PDF_KEYS];
        if (!key) throw new Error("ملف المنتج غير مهيأ للتسليم");
        return { url: await storageGetSignedUrl(key), expiresInMinutes: 15 };
      }),
    approveTransferRequest: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const request = await approvePurchaseRequest(input.requestId);
        if (!request) throw new Error("طلب الشراء غير موجود");
        const activePdf = await getActiveProductFile(request.productCode, "pdf");
        const key = activePdf?.fileKey ?? PRODUCT_PDF_KEYS[request.productCode as keyof typeof PRODUCT_PDF_KEYS];
        if (!key) throw new Error("ملف المنتج غير مهيأ للتسليم");
        return { success: true as const, requestId: request.id, downloadUrl: await storageGetSignedUrl(key), expiresInMinutes: 15 };
      }),
  }),
});

export type AppRouter = typeof appRouter;
