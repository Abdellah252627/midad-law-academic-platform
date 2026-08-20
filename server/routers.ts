import { randomUUID } from "node:crypto";
import { z } from "zod";
import { FAQ_CATEGORIES } from "@shared/faq";
import { buildPurchaseRequestNotification, buildSupportFollowUpNotification } from "@shared/adminNotifications";
import { formatSupportFollowUpReference, supportFollowUpFieldsSchema } from "../shared/supportFollowUp";
import { COOKIE_NAME, DEFAULT_PRODUCT_CODE } from "@shared/const";
import { approvePurchaseRequest, createAuditLog, createProductFile, createPurchaseRequest, createPurchaseRequestCorrection, createSampleDownloadLead, deleteLandingChapter, deleteLandingFaq, createAnalyticsEvent, getActiveProductFile, getAnalyticsSummary, getAuditLogs, getLandingAdminContent, getProductFiles, getProductFileById, getProductPricing, getPublishedLandingContent, getLatestPurchaseRequestCorrection, getPendingPurchaseRequestCorrection, getPurchaseRequestById, getPurchaseRequestCorrections, getPurchaseRequestNotes, createPurchaseRequestNote, updatePurchaseRequestNote, deletePurchaseRequestNote, getPurchaseRequests, getPurchaseRequestsForExport, createComplaint, getComplaintById, getComplaintAuditEvents, getComplaintByTicketAndEmail, findPurchaseRequestByOrderNumber, getSampleDownloadLeadCount, getSampleDownloadLeads, getSampleDownloadLeadsByIds, createSupportFollowUp, getSupportFollowUps, getNewSupportFollowUpCount, createAdminNotification, getAdminNotifications, getAdminNotificationUnreadCount, markAdminNotificationRead, markAdminNotificationsRead, markSupportFollowUpRead, markSupportFollowUpsRead, getSupportFollowUpById, updateSupportFollowUp, getAppSettings, getAppSettingsMap, getAdminComplaints, updateComplaintAdmin, rejectPurchaseRequest, restoreLandingChapter, reviewPurchaseRequestCorrection, restoreLandingFaq, saveLandingChapter, saveLandingFaq, saveLandingProduct, upsertAppSetting } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";
import { buildDownloadUrl, createDownloadToken, DOWNLOAD_LINK_TTL_MINUTES } from "./downloadTokens";
import { getSessionCookieOptions } from "./_core/cookies";
import { buildPurchaseRequestsXlsx, type PurchaseExportRow } from "./xlsxExport";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, isAuthorizedAdmin, publicProcedure, router } from "./_core/trpc";

const PRODUCT_PDF_KEYS = { "MIDAD-001": "midad-001-law-summary_4382aff1.pdf" } as const;
const SAMPLE_PDF_KEYS: Record<string, string> = { "MIDAD-001": "MIDAD-001-sample-noted_fd59ed4b.pdf" };
const PRODUCT_CODE_SCHEMA = z.string().trim().regex(/^[A-Z0-9-]{3,32}$/, "رمز المنتج غير صالح");
const SAMPLE_CONSENT_VERSION = "2026-08-16";

const quizQuestionsSchema = z.string().trim().min(2).max(5000).superRefine((value, ctx) => {
  try {
    const questions = JSON.parse(value);
    if (!Array.isArray(questions)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "أسئلة الاختبار يجب أن تكون قائمة JSON" });
      return;
    }
    questions.forEach((question, index) => {
      if (typeof question === "string") return;
      if (!question || typeof question !== "object" || typeof question.question !== "string" || !question.question.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: "نص السؤال غير صالح" });
        return;
      }
      if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6 || question.options.some((option: unknown) => typeof option !== "string" || !option.trim())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: "يجب أن يحتوي السؤال على خيارين إلى ستة خيارات نصية" });
      }
      if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= (question.options?.length ?? 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: "رقم الإجابة الصحيحة غير صالح" });
      }
      if (question.explanation !== undefined && typeof question.explanation !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: "شرح الإجابة يجب أن يكون نصاً" });
      }
      if (question.reviewConcept !== undefined && (typeof question.reviewConcept !== "string" || !question.reviewConcept.trim())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: "مفهوم المراجعة يجب أن يكون نصاً غير فارغ" });
      }
    });
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "صيغة أسئلة الاختبار يجب أن تكون JSON صحيحة" });
  }
});

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

export function buildPurchaseRequestsCsv(requests: PurchaseExportRow[]) {
  const header = ["الاسم الكامل", "البريد الإلكتروني", "رقم واتساب", "المنتج (الرقم)", "السعر المدفوع (د.م)", "إثبات التحويل", "رقم الطلب", "حالة الطلب", "تاريخ الإنشاء", "تاريخ آخر تحديث", "ملاحظات إدارية"];
  const rows = requests.map(request => [request.customerName, request.customerEmail, request.customerPhone, request.productCode, request.pricePaid, request.proofKey ? "مرفق" : "غير مرفق", request.orderNumber, request.status === "approved" ? "مقبول" : request.status === "rejected" ? "مرفوض" : "قيد المراجعة", request.createdAt, request.updatedAt, request.adminNotes]);
  return `\uFEFF${[header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    isAdmin: publicProcedure.query(opts => isAuthorizedAdmin(opts.ctx.user)),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  analytics: router({
    track: publicProcedure.input(z.object({ eventType: z.enum(["page_view", "sample_download"]), productCode: PRODUCT_CODE_SCHEMA, visitorKey: z.string().trim().min(16).max(120) })).mutation(async ({ input }) => {
      await createAnalyticsEvent(input);
      return { success: true as const };
    }),
  }),
  landing: router({
    published: publicProcedure.input(z.object({ productCode: PRODUCT_CODE_SCHEMA })).query(async ({ input }) => {
      const content = await getPublishedLandingContent(input.productCode);
      const activeCover = await getActiveProductFile(input.productCode, "cover");
      return {
        ...content,
        settings: await getAppSettingsMap(),
        coverUrl: activeCover ? await storageGetSignedUrl(activeCover.fileKey) : null,
      };
    }),
  }),
  support: router({
    submitFollowUp: publicProcedure.input(z.object({ productCode: PRODUCT_CODE_SCHEMA.default(DEFAULT_PRODUCT_CODE) }).merge(supportFollowUpFieldsSchema)).mutation(async ({ input }) => {
      const result = await createSupportFollowUp({ productCode: input.productCode, phone: input.phone || null, email: input.email || null, message: input.message || null });
      try {
        await createAdminNotification(buildSupportFollowUpNotification(formatSupportFollowUpReference(result.id), result.id));
      } catch (error) {
        console.error("[Notifications] Failed to create support follow-up notification:", error);
      }
      return { success: true as const, id: result.id, reference: formatSupportFollowUpReference(result.id) };
    }),
  }),
  sample: router({
    submitLead: publicProcedure
      .input(z.object({
        productCode: PRODUCT_CODE_SCHEMA,
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
        await createAnalyticsEvent({ eventType: "sample_download", productCode: input.productCode, visitorKey: null });
        return { success: true as const, url: await storageGetSignedUrl(key), expiresInMinutes: 15 };
      }),
  }),
  complaints: router({
    submit: publicProcedure
      .input(z.object({
        requestId: z.number().int().positive().optional(),
        fullName: z.string().trim().min(2).max(160).transform(value => value.replace(/\s+/g, " ")).refine(value => value.split(" ").filter(Boolean).length >= 2 && /^[A-Za-z\u0600-\u06FF ]+$/.test(value), "الاسم الكامل غير صالح"),
        email: z.string().trim().email().max(320),
        whatsapp: z.string().trim().transform(value => value.replace(/[\s()-]/g, "")).refine(value => /^(?:0[5-7]\d{8}|(?:\+?212)[5-7]\d{8})$/.test(value), "رقم واتساب غير صالح").optional(),
        category: z.enum(["payment", "proof", "review", "download", "data", "other"]),
        description: z.string().trim().min(10).max(5000),
      }))
      .mutation(async ({ input }) => {
        const request = input.requestId ? await getPurchaseRequestById(input.requestId) : undefined;
        if (input.requestId && !request) throw new Error("رقم الطلب غير صالح");
        const ticketNumber = `MIDAD-S-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
        const complaint = await createComplaint({ ...input, email: input.email.toLowerCase(), ticketNumber });
        return { success: true as const, ticketNumber: complaint?.ticketNumber ?? ticketNumber, status: complaint?.status ?? "new" };
      }),
    track: publicProcedure
      .input(z.object({ ticketNumber: z.string().trim().regex(/^MIDAD-S-[A-Z0-9]{12}$/, "رقم التذكرة غير صالح"), email: z.string().trim().email().max(320) }))
      .query(async ({ input }) => {
        const complaint = await getComplaintByTicketAndEmail(input.ticketNumber, input.email);
        if (!complaint) throw new Error("لم يتم العثور على التذكرة");
        return complaint;
      }),
  }),
  admin: router({
    landingContent: adminProcedure.input(z.object({ productCode: PRODUCT_CODE_SCHEMA })).query(({ input }) => getLandingAdminContent(input.productCode)),
    previewContent: adminProcedure.input(z.object({ productCode: PRODUCT_CODE_SCHEMA })).query(async ({ input }) => { const content = await getLandingAdminContent(input.productCode); return { product: content?.product, chapters: (content?.chapters ?? []).filter(item => !item.deletedAt), faqs: (content?.faqs ?? []).filter(item => !item.deletedAt) }; }),
    saveProduct: adminProcedure.input(z.object({ productCode: PRODUCT_CODE_SCHEMA, title: z.string().trim().min(3).max(220), category: z.string().trim().min(2).max(120), university: z.string().trim().min(2).max(180), track: z.string().trim().max(180).optional(), description: z.string().trim().min(10).max(5000), priceMad: z.number().int().min(0).max(100000), isPublished: z.union([z.literal(0), z.literal(1)]) })).mutation(async ({ input, ctx }) => { await saveLandingProduct(input); await createAuditLog({ actorUserId: ctx.user.id, action: "content.save", entityType: "landing_product", entityId: input.productCode, productCode: input.productCode, metadataJson: JSON.stringify({ priceMad: input.priceMad, isPublished: input.isPublished }) }); return { success: true as const }; }),
    saveChapter: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), productCode: PRODUCT_CODE_SCHEMA, chapterNumber: z.string().trim().min(1).max(8), title: z.string().trim().min(2).max(220), excerpt: z.string().trim().min(10).max(3000), learningObjectives: z.string().trim().min(2).max(5000).optional().default("[]"), questionsJson: quizQuestionsSchema, sortOrder: z.number().int().min(0).max(999), isPublished: z.union([z.literal(0), z.literal(1)]) })).mutation(async ({ input, ctx }) => { const id = await saveLandingChapter(input); await createAuditLog({ actorUserId: ctx.user.id, action: "content.save", entityType: "landing_chapter", entityId: String(id), productCode: input.productCode, metadataJson: JSON.stringify({ chapterNumber: input.chapterNumber, isPublished: input.isPublished }) }); return id; }),
    deleteChapter: adminProcedure.input(z.object({ id: z.number().int().positive(), productCode: PRODUCT_CODE_SCHEMA.default(DEFAULT_PRODUCT_CODE) })).mutation(async ({ input, ctx }) => { await deleteLandingChapter(input.id); await createAuditLog({ actorUserId: ctx.user.id, action: "content.delete", entityType: "landing_chapter", entityId: String(input.id), productCode: input.productCode, metadataJson: null }); return { success: true as const }; }),
    restoreChapter: adminProcedure.input(z.object({ id: z.number().int().positive(), productCode: PRODUCT_CODE_SCHEMA.default(DEFAULT_PRODUCT_CODE) })).mutation(async ({ input, ctx }) => { await restoreLandingChapter(input.id); await createAuditLog({ actorUserId: ctx.user.id, action: "content.restore", entityType: "landing_chapter", entityId: String(input.id), productCode: input.productCode, metadataJson: null }); return { success: true as const }; }),
    saveFaq: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), productCode: PRODUCT_CODE_SCHEMA, question: z.string().trim().min(3).max(300), answer: z.string().trim().min(5).max(5000), category: z.enum(FAQ_CATEGORIES).default("support"), sortOrder: z.number().int().min(0).max(999), isPublished: z.union([z.literal(0), z.literal(1)]) })).mutation(async ({ input, ctx }) => { const id = await saveLandingFaq(input); await createAuditLog({ actorUserId: ctx.user.id, action: "content.save", entityType: "landing_faq", entityId: String(id), productCode: input.productCode, metadataJson: JSON.stringify({ category: input.category, isPublished: input.isPublished }) }); return id; }),
    deleteFaq: adminProcedure.input(z.object({ id: z.number().int().positive(), productCode: PRODUCT_CODE_SCHEMA.default(DEFAULT_PRODUCT_CODE) })).mutation(async ({ input, ctx }) => { await deleteLandingFaq(input.id); await createAuditLog({ actorUserId: ctx.user.id, action: "content.delete", entityType: "landing_faq", entityId: String(input.id), productCode: input.productCode, metadataJson: null }); return { success: true as const }; }),
    restoreFaq: adminProcedure.input(z.object({ id: z.number().int().positive(), productCode: PRODUCT_CODE_SCHEMA.default(DEFAULT_PRODUCT_CODE) })).mutation(async ({ input, ctx }) => { await restoreLandingFaq(input.id); await createAuditLog({ actorUserId: ctx.user.id, action: "content.restore", entityType: "landing_faq", entityId: String(input.id), productCode: input.productCode, metadataJson: null }); return { success: true as const }; }),
    sampleLeads: adminProcedure.input(z.object({ search: z.string().trim().max(160).optional(), productCode: PRODUCT_CODE_SCHEMA.optional(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(25) }).optional()).query(async ({ input }) => {
      const options = input ?? { page: 1, pageSize: 25 };
      const [leads, total] = await Promise.all([getSampleDownloadLeads(options), getSampleDownloadLeadCount(options)]);
      return { leads, total, page: options.page, pageSize: options.pageSize, totalPages: Math.max(1, Math.ceil(total / options.pageSize)) };
    }),
    sampleLeadsCsv: adminProcedure.query(async () => {
      const leads = await getSampleDownloadLeads();
      return { filename: `midad-sample-leads-${new Date().toISOString().slice(0, 10)}.csv`, csv: buildSampleLeadsCsv(leads) };
    }),
    sampleLeadsSelectedCsv: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) })).mutation(async ({ input }) => {
      const uniqueIds = Array.from(new Set(input.ids));
      const leads = await getSampleDownloadLeadsByIds(uniqueIds);
      if (leads.length !== uniqueIds.length) throw new Error("بعض التسجيلات المحددة غير موجودة أو محذوفة");
      return { filename: `midad-selected-leads-${new Date().toISOString().slice(0, 10)}.csv`, csv: buildSampleLeadsCsv(leads) };
    }),
    purchaseRequestsExport: adminProcedure.input(z.object({ search: z.string().trim().max(160).optional(), searchScope: z.enum(["all", "orderNumber", "customer"]).default("all"), status: z.enum(["pending", "approved", "rejected"]).optional() }).optional()).query(async ({ input }) => {
      const requests = await getPurchaseRequestsForExport(input ?? undefined);
      const rows = requests as PurchaseExportRow[];
      return {
        filename: `midad-orders-${new Date().toISOString().slice(0, 10)}.xlsx`,
        xlsxBase64: await buildPurchaseRequestsXlsx(rows),
        csvFilename: `midad-orders-${new Date().toISOString().slice(0, 10)}.csv`,
        csv: buildPurchaseRequestsCsv(rows),
      };
    }),
    purchaseRequests: adminProcedure.input(z.object({ search: z.string().trim().max(160).optional(), searchScope: z.enum(["all", "orderNumber", "customer"]).default("all"), status: z.enum(["pending", "approved", "rejected"]).optional(), includeTestOrders: z.boolean().default(true), page: z.number().int().min(1).max(100000).default(1), pageSize: z.number().int().refine(value => [10, 25, 50, 100, 200].includes(value), "حجم الصفحة غير مدعوم").default(25) }).optional()).query(async ({ input }) => {
      const options = input ?? { page: 1, pageSize: 25, searchScope: "all" as const, includeTestOrders: true };
      const result = await getPurchaseRequests(options);
      return { ...result, totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)), search: options.search?.trim() ?? "", searchScope: options.searchScope ?? "all", status: options.status ?? "all", includeTestOrders: options.includeTestOrders ?? true };
    }),
    purchaseRequestNotes: adminProcedure.input(z.object({ requestId: z.number().int().positive() })).query(async ({ input }) => {
      const request = await getPurchaseRequestById(input.requestId);
      if (!request) throw new Error("طلب الشراء غير موجود");
      return getPurchaseRequestNotes(input.requestId);
    }),
    createPurchaseRequestNote: adminProcedure.input(z.object({ requestId: z.number().int().positive(), content: z.string().trim().min(1, "الملاحظة لا يمكن أن تكون فارغة").max(5000) })).mutation(async ({ input, ctx }) => {
      const request = await getPurchaseRequestById(input.requestId);
      if (!request) throw new Error("طلب الشراء غير موجود");
      const result = await createPurchaseRequestNote({ requestId: input.requestId, content: input.content, userId: ctx.user.id });
      await createAuditLog({ actorUserId: ctx.user.id, action: "purchase.note.create", entityType: "purchase_request_note", entityId: String(result.id), productCode: request.productCode, metadataJson: JSON.stringify({ requestId: input.requestId }) });
      return { success: true as const, noteId: result.id };
    }),
    updatePurchaseRequestNote: adminProcedure.input(z.object({ noteId: z.number().int().positive(), content: z.string().trim().min(1, "الملاحظة لا يمكن أن تكون فارغة").max(5000) })).mutation(async ({ input, ctx }) => {
      const result = await updatePurchaseRequestNote({ noteId: input.noteId, content: input.content, userId: ctx.user.id });
      if (!result) throw new Error("الملاحظة غير موجودة");
      const request = await getPurchaseRequestById(result.requestId);
      await createAuditLog({ actorUserId: ctx.user.id, action: "purchase.note.update", entityType: "purchase_request_note", entityId: String(input.noteId), productCode: request?.productCode, metadataJson: JSON.stringify({ requestId: result.requestId }) });
      return { success: true as const, noteId: input.noteId };
    }),
    deletePurchaseRequestNote: adminProcedure.input(z.object({ noteId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const result = await deletePurchaseRequestNote({ noteId: input.noteId, userId: ctx.user.id });
      if (!result) throw new Error("الملاحظة غير موجودة");
      const request = await getPurchaseRequestById(result.requestId);
      await createAuditLog({ actorUserId: ctx.user.id, action: "purchase.note.delete", entityType: "purchase_request_note", entityId: String(input.noteId), productCode: request?.productCode, metadataJson: JSON.stringify({ requestId: result.requestId }) });
      return { success: true as const, noteId: input.noteId };
    }),
    purchaseRequestCorrections: adminProcedure.query(async () => getPurchaseRequestCorrections()),
    reviewPurchaseRequestCorrection: adminProcedure.input(z.object({ correctionId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), decisionNote: z.string().trim().max(500).optional() })).mutation(async ({ input, ctx }) => {
      const result = await reviewPurchaseRequestCorrection({ id: input.correctionId, status: input.decision, reviewedByUserId: ctx.user.id, decisionNote: input.decisionNote || null });
      if (!result) throw new Error("طلب التصحيح غير موجود");
      await createAuditLog({ actorUserId: ctx.user.id, action: `purchase.correction.${input.decision}`, entityType: "purchase_request_correction", entityId: String(result.id), metadataJson: JSON.stringify({ requestId: result.requestId, requestedEmail: result.requestedEmail, requestedPhone: result.requestedPhone }) });
      return { success: true as const, correctionId: result.id };
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
      const activePdf = await getActiveProductFile(request.productCode, "pdf");
      const key = activePdf?.fileKey ?? PRODUCT_PDF_KEYS[request.productCode as keyof typeof PRODUCT_PDF_KEYS];
      if (!key) throw new Error("ملف المنتج غير مهيأ للتسليم");
      const token = await createDownloadToken({ requestId: request.id, fileKey: key });
      return { success: true as const, requestId: request.id, downloadUrl: buildDownloadUrl(request.id, token), expiresInMinutes: DOWNLOAD_LINK_TTL_MINUTES };
    }),
    reissuePurchaseDownload: adminProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const request = await getPurchaseRequestById(input.requestId);
      if (!request) throw new Error("طلب الشراء غير موجود");
      if (request.status !== "approved") throw new Error("لا يمكن إصدار رابط تنزيل إلا لطلب مقبول");
      const activePdf = await getActiveProductFile(request.productCode, "pdf");
      const key = activePdf?.fileKey ?? PRODUCT_PDF_KEYS[request.productCode as keyof typeof PRODUCT_PDF_KEYS];
      if (!key) throw new Error("ملف المنتج غير مهيأ للتسليم");
      const token = await createDownloadToken({ requestId: request.id, fileKey: key });
      await createAuditLog({ actorUserId: ctx.user.id, action: "purchase.download_link.reissue", entityType: "purchase_request", entityId: String(request.id), productCode: request.productCode, metadataJson: JSON.stringify({ expiresInMinutes: DOWNLOAD_LINK_TTL_MINUTES }) });
      return { success: true as const, requestId: request.id, downloadUrl: buildDownloadUrl(request.id, token), expiresInMinutes: DOWNLOAD_LINK_TTL_MINUTES };
    }),
    rejectPurchase: adminProcedure.input(z.object({ requestId: z.number().int().positive(), reason: z.string().trim().min(3).max(500) })).mutation(async ({ input, ctx }) => {
      const request = await rejectPurchaseRequest(input.requestId, input.reason, ctx.user.id);
      if (!request) throw new Error("طلب الشراء غير موجود");
      await createAuditLog({ actorUserId: ctx.user.id, action: "purchase.reject", entityType: "purchase_request", entityId: String(request.id), productCode: request.productCode, metadataJson: JSON.stringify({ reason: input.reason }) });
      return { success: true as const, requestId: request.id };
    }),
    complaints: adminProcedure.input(z.object({ search: z.string().trim().max(160).optional(), status: z.enum(["new", "in_review", "needs_info", "responded", "closed"]).optional(), page: z.number().int().min(1).max(100000).default(1), pageSize: z.number().int().refine(value => [10, 25, 50, 100, 200].includes(value), "حجم الصفحة غير مدعوم").default(25) }).optional()).query(async ({ input }) => {
      const result = await getAdminComplaints(input ?? { page: 1, pageSize: 25 });
      return { ...result, totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)), search: input?.search?.trim() ?? "", status: input?.status ?? "all" };
    }),
    complaint: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const complaint = await getComplaintById(input.id);
      if (!complaint) throw new Error("الشكوى غير موجودة");
      const auditEvents = await getComplaintAuditEvents(input.id);
      const timeline = [
        { id: `created-${complaint.id}`, action: "complaint.created", actorUserId: null, metadataJson: null, createdAt: complaint.createdAt },
        ...auditEvents.map(event => ({ id: `audit-${event.id}`, action: event.action, actorUserId: event.actorUserId, metadataJson: event.metadataJson, createdAt: event.createdAt })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return { ...complaint, timeline };
    }),
    updateComplaint: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "in_review", "needs_info", "responded", "closed"]), adminResponse: z.string().trim().max(5000).nullable().optional() })).mutation(async ({ input, ctx }) => {
      const previous = await getComplaintById(input.id);
      if (!previous) throw new Error("الشكوى غير موجودة");
      const responseValue = input.adminResponse === undefined ? undefined : (input.adminResponse || null);
      const updated = await updateComplaintAdmin({ id: input.id, status: input.status, adminResponse: responseValue, responseUpdatedByUserId: ctx.user.id });
      if (!updated) throw new Error("الشكوى غير موجودة");
      await createAuditLog({ actorUserId: ctx.user.id, action: "complaint.update", entityType: "complaint", entityId: String(updated.id), metadataJson: JSON.stringify({ ticketNumber: updated.ticketNumber, previousStatus: previous.status, status: updated.status, responseChanged: responseValue !== undefined && responseValue !== previous.adminResponse }) });
      return { success: true as const, complaint: updated };
    }),
    newSupportFollowUpCount: adminProcedure.query(async () => getNewSupportFollowUpCount()),
    notifications: adminProcedure.input(z.object({ type: z.enum(["purchase_request", "support_follow_up", "complaint"]).optional(), read: z.enum(["read", "unread"]).optional(), page: z.number().int().min(1).default(1), pageSize: z.number().int().refine(value => [10, 25, 50, 100].includes(value), "حجم الصفحة غير مدعوم").default(25) }).optional()).query(async ({ input }) => getAdminNotifications(input ?? undefined)),
    notificationUnreadCount: adminProcedure.query(async () => getAdminNotificationUnreadCount()),
    markNotificationRead: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => markAdminNotificationRead(input.id)),
    markNotificationsRead: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })).mutation(async ({ input }) => markAdminNotificationsRead(Array.from(new Set(input.ids)))),
    supportFollowUps: adminProcedure.input(z.object({ search: z.string().trim().max(160).optional(), status: z.enum(["new", "contacted", "closed"]).optional(), read: z.enum(["read", "unread"]).optional(), page: z.number().int().min(1).default(1), pageSize: z.number().int().refine(value => [10, 25, 50, 100].includes(value), "حجم الصفحة غير مدعوم").default(25) }).optional()).query(async ({ input }) => {
      const result = await getSupportFollowUps(input ?? { page: 1, pageSize: 25 });
      return { ...result, totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)), search: input?.search?.trim() ?? "", status: input?.status ?? "all", read: input?.read ?? "all" };
    }),
    supportFollowUp: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const followUp = await getSupportFollowUpById(input.id);
      if (!followUp) throw new Error("طلب المتابعة غير موجود");
      return followUp;
    }),
    markSupportFollowUpsRead: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })).mutation(async ({ input, ctx }) => {
      const affected = await markSupportFollowUpsRead(input.ids);
      await createAuditLog({ actorUserId: ctx.user.id, action: "support_follow_up.read_bulk", entityType: "support_follow_up", entityId: "bulk", metadataJson: JSON.stringify({ requestedIds: input.ids, affected }) });
      return { success: true as const, affected };
    }),
    markSupportFollowUpRead: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const previous = await getSupportFollowUpById(input.id);
      if (!previous) throw new Error("طلب المتابعة غير موجود");
      const updated = await markSupportFollowUpRead(input.id);
      if (!updated) throw new Error("طلب المتابعة غير موجود");
      await createAuditLog({ actorUserId: ctx.user.id, action: "support_follow_up.read", entityType: "support_follow_up", entityId: String(updated.id), productCode: updated.productCode, metadataJson: JSON.stringify({ status: updated.status, wasRead: previous.isRead, isRead: updated.isRead }) });
      return { success: true as const, followUp: updated };
    }),
    updateSupportFollowUp: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "contacted", "closed"]), adminNote: z.string().trim().max(500).nullable().optional() })).mutation(async ({ input, ctx }) => {
      const previous = await getSupportFollowUpById(input.id);
      if (!previous) throw new Error("طلب المتابعة غير موجود");
      const updated = await updateSupportFollowUp({ id: input.id, status: input.status, adminNote: input.adminNote === undefined ? previous.adminNote : (input.adminNote || null) });
      if (!updated) throw new Error("طلب المتابعة غير موجود");
      await createAuditLog({ actorUserId: ctx.user.id, action: "support_follow_up.update", entityType: "support_follow_up", entityId: String(updated.id), productCode: updated.productCode, metadataJson: JSON.stringify({ previousStatus: previous.status, status: updated.status }) });
      return { success: true as const, followUp: updated };
    }),
    files: adminProcedure.input(z.object({ productCode: PRODUCT_CODE_SCHEMA })).query(({ input }) => getProductFiles(input.productCode)),
    fileUrl: adminProcedure.input(z.object({ fileId: z.number().int().positive() })).query(async ({ input }) => {
      const file = await getProductFileById(input.fileId);
      if (!file) throw new Error("الملف غير موجود");
      return { url: await storageGetSignedUrl(file.fileKey), fileName: file.fileName, contentType: file.contentType };
    }),
    uploadFile: adminProcedure.input(z.object({ productCode: PRODUCT_CODE_SCHEMA, fileType: z.enum(["pdf", "cover", "sample"]), fileName: z.string().trim().min(1).max(220), contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]), base64: z.string().min(100).max(70_000_000) })).mutation(async ({ input, ctx }) => {
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
    settings: adminProcedure.input(z.object({ productCode: PRODUCT_CODE_SCHEMA }).default({ productCode: DEFAULT_PRODUCT_CODE })).query(({ input }) => getAppSettings(input.productCode)),
    saveSetting: adminProcedure.input(z.object({ productCode: PRODUCT_CODE_SCHEMA.default(DEFAULT_PRODUCT_CODE), settingKey: z.enum(["whatsappNumber", "bankBeneficiary", "bankRib", "bankTransferReviewDuration", "defaultPriceMad", "quizPassingPercentage", "quizSuccessMessage", "quizFailureMessage", "upcomingChapters"]), settingValue: z.string().trim().min(1).max(5000), description: z.string().trim().max(300).optional() })).mutation(async ({ input, ctx }) => {
      if (input.settingKey === "quizSuccessMessage" || input.settingKey === "quizFailureMessage") {
        if (input.settingValue.length < 10) throw new Error("رسالة النتيجة يجب أن تحتوي على 10 أحرف على الأقل");
      }
      if (input.settingKey === "quizPassingPercentage") {
        const percentage = Number(input.settingValue);
        if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) throw new Error("نسبة النجاح يجب أن تكون رقماً صحيحاً بين 0 و100");
      }
      if (input.settingKey === "bankTransferReviewDuration") {
        const duration = Number(input.settingValue);
        if (!Number.isInteger(duration) || duration < 1 || duration > 168) throw new Error("مدة المراجعة يجب أن تكون بين ساعة واحدة و168 ساعة");
      }
      await upsertAppSetting({ ...input, updatedByUserId: ctx.user.id });
      await createAuditLog({ actorUserId: ctx.user.id, action: "settings.save", entityType: "app_setting", entityId: input.settingKey, productCode: input.productCode, metadataJson: null });
      return { success: true as const };
    }),
    analyticsSummary: adminProcedure.query(() => getAnalyticsSummary()),
    auditLogs: adminProcedure.query(() => getAuditLogs()),
  }),
  purchase: router({
    createTransferRequest: publicProcedure
      .input(z.object({
        productCode: PRODUCT_CODE_SCHEMA,
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
        const pricing = await getProductPricing(input.productCode);
        const pricePaid = pricing.priceMad;
        if (!Number.isInteger(pricePaid) || pricePaid < 0) {
          throw new Error("سعر المنتج غير متاح حالياً");
        }
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
          pricePaid,
          status: "pending",
        });
        await createAnalyticsEvent({ eventType: "purchase_request", productCode: input.productCode, visitorKey: null });
        try {
          await createAdminNotification(buildPurchaseRequestNotification(result.orderNumber, result.id));
        } catch (error) {
          console.error("[Notifications] Failed to create purchase request notification:", error);
        }
        return { success: true as const, requestId: result.id, orderNumber: result.orderNumber };
      }),
    requestDataCorrection: publicProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        currentEmail: z.string().trim().email().max(320),
        requestedEmail: z.string().trim().email().max(320).optional(),
        requestedPhone: z.string().trim().transform(value => value.replace(/[\s()-]/g, "")).refine(value => /^(?:0[5-7]\d{8}|(?:\+?212)[5-7]\d{8})$/.test(value), "رقم واتساب غير صالح").optional(),
        reason: z.string().trim().max(500).optional(),
      }).superRefine((input, ctx) => {
        if (!input.requestedEmail && !input.requestedPhone) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "أدخل البريد أو رقم الواتساب الجديد" });
      }))
      .mutation(async ({ input }) => {
        const request = await getPurchaseRequestById(input.requestId);
        if (!request || request.customerEmail.toLowerCase() !== input.currentEmail.toLowerCase()) throw new Error("تعذر التحقق من الطلب");
        if (request.status === "rejected") throw new Error("لا يمكن تصحيح طلب مرفوض");
        const pending = await getPendingPurchaseRequestCorrection(request.id);
        if (pending) throw new Error("يوجد طلب تصحيح قيد المراجعة");
        if (input.requestedEmail?.toLowerCase() === request.customerEmail.toLowerCase() && input.requestedPhone === (request.customerPhone ?? undefined)) throw new Error("لم يتم إدخال تغيير");
        const correction = await createPurchaseRequestCorrection({ requestId: request.id, oldEmail: request.customerEmail, oldPhone: request.customerPhone, requestedEmail: input.requestedEmail?.toLowerCase() ?? null, requestedPhone: input.requestedPhone ?? null, reason: input.reason || null, status: "pending" });
        return { success: true as const, correctionId: correction.id };
      }),
    correctionStatus: publicProcedure
      .input(z.object({ requestId: z.number().int().positive(), customerEmail: z.string().trim().email().max(320) }))
      .query(async ({ input }) => {
        const request = await getPurchaseRequestById(input.requestId);
        if (!request || request.customerEmail.toLowerCase() !== input.customerEmail.toLowerCase()) {
          throw new Error("طلب التصحيح غير موجود");
        }
        const correction = await getLatestPurchaseRequestCorrection(input.requestId);
        return correction ? { status: correction.status, createdAt: correction.createdAt, reviewedAt: correction.reviewedAt, decisionNote: correction.decisionNote } : { status: null, createdAt: null, reviewedAt: null, decisionNote: null };
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
        const token = await createDownloadToken({ requestId: request.id, fileKey: key });
        return { url: buildDownloadUrl(request.id, token), expiresInMinutes: DOWNLOAD_LINK_TTL_MINUTES };
      }),
    approveTransferRequest: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const request = await approvePurchaseRequest(input.requestId);
        if (!request) throw new Error("طلب الشراء غير موجود");
        const activePdf = await getActiveProductFile(request.productCode, "pdf");
        const key = activePdf?.fileKey ?? PRODUCT_PDF_KEYS[request.productCode as keyof typeof PRODUCT_PDF_KEYS];
        if (!key) throw new Error("ملف المنتج غير مهيأ للتسليم");
        const token = await createDownloadToken({ requestId: request.id, fileKey: key });
        return { success: true as const, requestId: request.id, downloadUrl: buildDownloadUrl(request.id, token), expiresInMinutes: DOWNLOAD_LINK_TTL_MINUTES };
      }),
  }),
});

export type AppRouter = typeof appRouter;
