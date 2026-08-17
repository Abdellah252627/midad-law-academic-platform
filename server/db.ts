import { and, asc, count, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { AnalyticsEvent, AppSetting, AuditLog, InsertAuditLog, InsertAnalyticsEvent, InsertLandingChapter, InsertLandingFaq, InsertLandingProduct, InsertProductFile, InsertPurchaseRequest, InsertPurchaseRequestCorrection, InsertReview, InsertSampleDownloadLead, InsertUser, InsertPurchaseRequestNote, InsertPurchaseRequestNoteEvent, analyticsEvents, appSettings, auditLogs, landingChapters, landingFaqs, landingProducts, productFiles, purchaseRequestCorrections, purchaseRequestNoteEvents, purchaseRequestNotes, purchaseRequests, reviews, complaints, sampleDownloadLeads, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

function generateOrderNumber() {
  return `MIDAD-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export async function createPurchaseRequest(input: Omit<InsertPurchaseRequest, "orderNumber"> & { orderNumber?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const orderNumber = input.orderNumber ?? generateOrderNumber();
  const result = await db.insert(purchaseRequests).values({ ...input, orderNumber });
  return { id: Number(result[0].insertId), orderNumber };
}

export async function createSampleDownloadLead(input: InsertSampleDownloadLead) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(sampleDownloadLeads).values(input);
  return { id: Number(result[0].insertId) };
}

export async function getSampleDownloadLeads(options?: { search?: string; productCode?: string; page?: number; pageSize?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conditions = [isNull(sampleDownloadLeads.deletedAt)];
  const search = options?.search?.trim();
  if (search) {
    conditions.push(like(sampleDownloadLeads.fullName, `%${search}%`));
  }
  if (options?.productCode) {
    conditions.push(eq(sampleDownloadLeads.productCode, options.productCode));
  }
  const requestedPageSize = options?.pageSize ?? 25;
  const pageSize = [10, 25, 50, 100, 200].includes(requestedPageSize) ? requestedPageSize : 25;
  const page = Math.max(options?.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  return db.select().from(sampleDownloadLeads).where(and(...conditions)).orderBy(desc(sampleDownloadLeads.createdAt)).limit(pageSize).offset(offset);
}

export async function getSampleDownloadLeadsByIds(ids: number[]) {
  if (!ids.length) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sampleDownloadLeads)
    .where(and(inArray(sampleDownloadLeads.id, ids), isNull(sampleDownloadLeads.deletedAt)))
    .orderBy(desc(sampleDownloadLeads.createdAt));
}

export async function getSampleDownloadLeadCount(options?: { search?: string; productCode?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conditions = [isNull(sampleDownloadLeads.deletedAt)];
  const search = options?.search?.trim();
  if (search) conditions.push(like(sampleDownloadLeads.fullName, `%${search}%`));
  if (options?.productCode) conditions.push(eq(sampleDownloadLeads.productCode, options.productCode));
  const rows = await db.select({ total: count() }).from(sampleDownloadLeads).where(and(...conditions));
  return Number(rows[0]?.total ?? 0);
}

export async function getProductFiles(productCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(productFiles).where(eq(productFiles.productCode, productCode)).orderBy(desc(productFiles.createdAt));
}

export async function getProductFileById(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(productFiles).where(eq(productFiles.id, fileId)).limit(1);
  return rows[0];
}

export async function getActiveProductFile(productCode: string, fileType: "pdf" | "cover" | "sample") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(productFiles).where(eq(productFiles.productCode, productCode));
  return rows.find(file => file.fileType === fileType && file.isActive === 1);
}

export async function createProductFile(input: InsertProductFile) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(productFiles).set({ isActive: 0 }).where(and(eq(productFiles.productCode, input.productCode), eq(productFiles.fileType, input.fileType)));
  const result = await db.insert(productFiles).values(input);
  return Number(result[0].insertId);
}

export async function createAnalyticsEvent(input: InsertAnalyticsEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(analyticsEvents).values(input);
}

export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(analyticsEvents).orderBy(desc(analyticsEvents.createdAt));
  const now = Date.now();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const today = rows.filter((row: AnalyticsEvent) => row.createdAt >= todayStart);
  const week = rows.filter((row: AnalyticsEvent) => row.createdAt >= weekStart);
  const uniqueTodayVisitors = new Set(today.filter(row => row.eventType === "page_view").map(row => row.visitorKey).filter(Boolean)).size;
  const sampleDownloadsToday = today.filter(row => row.eventType === "sample_download").length;
  const purchaseRequestsToday = today.filter(row => row.eventType === "purchase_request").length;
  const weekVisitors = new Set(week.filter(row => row.eventType === "page_view").map(row => row.visitorKey).filter(Boolean)).size;
  const weekSamples = week.filter(row => row.eventType === "sample_download").length;
  const weekPurchases = week.filter(row => row.eventType === "purchase_request").length;
  return { todayVisitors: uniqueTodayVisitors, todaySampleDownloads: sampleDownloadsToday, todayPurchaseRequests: purchaseRequestsToday, todayConversionRate: sampleDownloadsToday ? Number(((purchaseRequestsToday / sampleDownloadsToday) * 100).toFixed(1)) : 0, weekVisitors, weekSampleDownloads: weekSamples, weekPurchaseRequests: weekPurchases, weekConversionRate: weekSamples ? Number(((weekPurchases / weekSamples) * 100).toFixed(1)) : 0 };
}

const DEFAULT_PRODUCT_CODE = "MIDAD-001";
const PRODUCT_TITLE_FALLBACKS: Record<string, string> = {
  "MIDAD-001": "مدخل إلى القانون والعلوم القانونية",
};

function settingsStorageKey(productCode: string, settingKey: string) {
  return productCode === DEFAULT_PRODUCT_CODE ? settingKey : `${productCode}:${settingKey}`;
}

export async function getAppSettings(productCode = DEFAULT_PRODUCT_CODE) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(appSettings).where(eq(appSettings.productCode, productCode)).orderBy(appSettings.settingKey);
}

export async function getAppSettingsMap(productCode = DEFAULT_PRODUCT_CODE) {
  const rows = await getAppSettings(productCode);
  return Object.fromEntries(rows.map((row: AppSetting) => {
    const key = row.settingKey.includes(":") ? row.settingKey.split(":").slice(1).join(":") : row.settingKey;
    return [key, row.settingValue];
  }));
}

export async function upsertAppSetting(input: { productCode?: string; settingKey: string; settingValue: string; description?: string | null; updatedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const productCode = input.productCode ?? DEFAULT_PRODUCT_CODE;
  const storageKey = settingsStorageKey(productCode, input.settingKey);
  await db.insert(appSettings).values({ ...input, settingKey: storageKey, productCode }).onDuplicateKeyUpdate({
    set: { settingValue: input.settingValue, description: input.description ?? null, updatedByUserId: input.updatedByUserId, productCode },
  });
}

export async function createAuditLog(input: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(auditLogs).values(input);
}

export async function getAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function getPurchaseRequestById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).limit(1);
  return rows[0];
}

export async function getRatingContext(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({
    orderId: purchaseRequests.id,
    status: purchaseRequests.status,
    fullName: purchaseRequests.customerName,
    productId: purchaseRequests.productCode,
    productTitle: landingProducts.title,
    reviewId: reviews.id,
  }).from(purchaseRequests)
    .leftJoin(landingProducts, eq(landingProducts.productCode, purchaseRequests.productCode))
    .leftJoin(reviews, eq(reviews.orderId, purchaseRequests.id))
    .where(eq(purchaseRequests.id, orderId)).limit(1);
  const row = rows[0];
  if (!row) return undefined;
  return row.productTitle ? row : { ...row, productTitle: PRODUCT_TITLE_FALLBACKS[row.productId] ?? row.productId };
}

export async function createReview(input: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(reviews).values(input);
  return { id: Number(result[0].insertId) };
}

export async function getVisibleProductReviews(productId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select({
    fullName: reviews.fullName,
    rating: reviews.rating,
    comment: reviews.comment,
    createdAt: reviews.createdAt,
  }).from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isVisible, 1)))
    .orderBy(desc(reviews.createdAt));
}

export async function createPurchaseRequestCorrection(input: InsertPurchaseRequestCorrection) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(purchaseRequestCorrections).values(input);
  return { id: Number(result[0].insertId) };
}

export async function getPendingPurchaseRequestCorrection(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(purchaseRequestCorrections).where(and(eq(purchaseRequestCorrections.requestId, requestId), eq(purchaseRequestCorrections.status, "pending"))).orderBy(desc(purchaseRequestCorrections.createdAt)).limit(1);
  return rows[0];
}

export async function getLatestPurchaseRequestCorrection(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({
    id: purchaseRequestCorrections.id,
    status: purchaseRequestCorrections.status,
    createdAt: purchaseRequestCorrections.createdAt,
    reviewedAt: purchaseRequestCorrections.reviewedAt,
    decisionNote: purchaseRequestCorrections.decisionNote,
  }).from(purchaseRequestCorrections)
    .where(eq(purchaseRequestCorrections.requestId, requestId))
    .orderBy(desc(purchaseRequestCorrections.createdAt))
    .limit(1);
  return rows[0];
}

export async function getPurchaseRequestCorrections() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({ correction: purchaseRequestCorrections, request: purchaseRequests }).from(purchaseRequestCorrections).innerJoin(purchaseRequests, eq(purchaseRequests.id, purchaseRequestCorrections.requestId)).orderBy(desc(purchaseRequestCorrections.createdAt));
  return rows.map(({ correction, request }) => ({ ...correction, orderNumber: request.orderNumber, customerName: request.customerName, currentEmail: request.customerEmail, currentPhone: request.customerPhone }));
}

export async function reviewPurchaseRequestCorrection(input: { id: number; status: "approved" | "rejected"; reviewedByUserId: number; decisionNote?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const rows = await tx.select().from(purchaseRequestCorrections).where(eq(purchaseRequestCorrections.id, input.id)).limit(1);
    const correction = rows[0];
    if (!correction) return undefined;
    if (correction.status !== "pending") throw new Error("طلب التصحيح تمت مراجعته مسبقاً");
    if (input.status === "approved") {
      await tx.update(purchaseRequests).set({ customerEmail: correction.requestedEmail ?? correction.oldEmail, customerPhone: correction.requestedPhone ?? correction.oldPhone }).where(eq(purchaseRequests.id, correction.requestId));
    }
    await tx.update(purchaseRequestCorrections).set({ status: input.status, reviewedByUserId: input.reviewedByUserId, reviewedAt: new Date(), decisionNote: input.decisionNote ?? null }).where(and(eq(purchaseRequestCorrections.id, input.id), eq(purchaseRequestCorrections.status, "pending")));
    return correction;
  });
}

export async function getPurchaseRequestNotes(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [notes, events] = await Promise.all([
    db.select().from(purchaseRequestNotes).where(and(eq(purchaseRequestNotes.requestId, requestId), isNull(purchaseRequestNotes.deletedAt))).orderBy(desc(purchaseRequestNotes.updatedAt)),
    db.select().from(purchaseRequestNoteEvents).where(eq(purchaseRequestNoteEvents.requestId, requestId)).orderBy(desc(purchaseRequestNoteEvents.createdAt)),
  ]);
  return { notes, events };
}

export async function createPurchaseRequestNote(input: { requestId: number; content: string; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const result = await tx.insert(purchaseRequestNotes).values({ requestId: input.requestId, content: input.content, createdByUserId: input.userId, updatedByUserId: input.userId });
    const noteId = Number(result[0].insertId);
    await tx.insert(purchaseRequestNoteEvents).values({ noteId, requestId: input.requestId, actorUserId: input.userId, action: "created", previousContent: null, newContent: input.content });
    return { id: noteId };
  });
}

export async function updatePurchaseRequestNote(input: { noteId: number; content: string; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const rows = await tx.select().from(purchaseRequestNotes).where(and(eq(purchaseRequestNotes.id, input.noteId), isNull(purchaseRequestNotes.deletedAt))).limit(1);
    const note = rows[0];
    if (!note) return undefined;
    await tx.update(purchaseRequestNotes).set({ content: input.content, updatedByUserId: input.userId, updatedAt: new Date() }).where(and(eq(purchaseRequestNotes.id, input.noteId), isNull(purchaseRequestNotes.deletedAt)));
    await tx.insert(purchaseRequestNoteEvents).values({ noteId: note.id, requestId: note.requestId, actorUserId: input.userId, action: "updated", previousContent: note.content, newContent: input.content });
    return { ...note, content: input.content, updatedByUserId: input.userId };
  });
}

export async function deletePurchaseRequestNote(input: { noteId: number; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const rows = await tx.select().from(purchaseRequestNotes).where(and(eq(purchaseRequestNotes.id, input.noteId), isNull(purchaseRequestNotes.deletedAt))).limit(1);
    const note = rows[0];
    if (!note) return undefined;
    await tx.update(purchaseRequestNotes).set({ deletedAt: new Date(), updatedByUserId: input.userId }).where(and(eq(purchaseRequestNotes.id, input.noteId), isNull(purchaseRequestNotes.deletedAt)));
    await tx.insert(purchaseRequestNoteEvents).values({ noteId: note.id, requestId: note.requestId, actorUserId: input.userId, action: "deleted", previousContent: note.content, newContent: null });
    return note;
  });
}

export async function getPurchaseRequests(options?: { search?: string; searchScope?: "all" | "orderNumber" | "customer"; status?: "pending" | "approved" | "rejected"; page?: number; pageSize?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const search = options?.search?.trim().slice(0, 160);
  const conditions = [];
  if (options?.status) conditions.push(eq(purchaseRequests.status, options.status));
  if (search) {
    const escaped = search.replace(/[\\%_]/g, match => `\\${match}`);
    const pattern = `%${escaped}%`;
    const searchScope = options?.searchScope ?? "all";
    if (searchScope === "orderNumber") {
      conditions.push(like(purchaseRequests.orderNumber, pattern));
    } else if (searchScope === "customer") {
      conditions.push(or(like(purchaseRequests.customerName, pattern), like(purchaseRequests.customerEmail, pattern), like(purchaseRequests.customerPhone, pattern))!);
    } else {
      conditions.push(or(like(purchaseRequests.orderNumber, pattern), like(purchaseRequests.customerName, pattern), like(purchaseRequests.customerEmail, pattern), like(purchaseRequests.customerPhone, pattern))!);
    }
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;
  const requestedPageSize = options?.pageSize ?? 25;
  const pageSize = [10, 25, 50, 100, 200].includes(requestedPageSize) ? requestedPageSize : 25;
  const page = Math.max(options?.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const [requests, countRows] = await Promise.all([
    db.select().from(purchaseRequests).where(whereClause).orderBy(desc(purchaseRequests.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: count() }).from(purchaseRequests).where(whereClause),
  ]);
  return { requests, total: Number(countRows[0]?.count ?? 0), page, pageSize };
}

export async function approvePurchaseRequest(id: number, reviewedByUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(purchaseRequests).set({ status: "approved", rejectionReason: null, reviewedByUserId: reviewedByUserId ?? null, reviewedAt: new Date() }).where(eq(purchaseRequests.id, id));
  return getPurchaseRequestById(id);
}

export async function rejectPurchaseRequest(id: number, rejectionReason: string, reviewedByUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(purchaseRequests).set({ status: "rejected", rejectionReason, reviewedByUserId: reviewedByUserId ?? null, reviewedAt: new Date() }).where(eq(purchaseRequests.id, id));
  return getPurchaseRequestById(id);
}

export async function getPublishedLandingContent(productCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [productRows, chapters, faqs] = await Promise.all([
    db.select().from(landingProducts).where(and(eq(landingProducts.productCode, productCode), isNull(landingProducts.deletedAt))).limit(1),
    db.select().from(landingChapters).where(and(eq(landingChapters.productCode, productCode), isNull(landingChapters.deletedAt))).orderBy(asc(landingChapters.sortOrder)),
    db.select().from(landingFaqs).where(and(eq(landingFaqs.productCode, productCode), isNull(landingFaqs.deletedAt))).orderBy(asc(landingFaqs.sortOrder)),
  ]);
  return {
    product: productRows.find(row => row.isPublished === 1),
    chapters: chapters.filter(row => row.isPublished === 1),
    faqs: faqs.filter(row => row.isPublished === 1),
  };
}

export async function getLandingAdminContent(productCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [products, chapters, faqs] = await Promise.all([
    db.select().from(landingProducts).where(eq(landingProducts.productCode, productCode)).limit(1),
    db.select().from(landingChapters).where(eq(landingChapters.productCode, productCode)).orderBy(asc(landingChapters.sortOrder)),
    db.select().from(landingFaqs).where(eq(landingFaqs.productCode, productCode)).orderBy(asc(landingFaqs.sortOrder)),
  ]);
  return { product: products[0], chapters, faqs };
}

export async function saveLandingProduct(input: InsertLandingProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(landingProducts).values(input).onDuplicateKeyUpdate({
    set: { title: input.title, category: input.category, university: input.university, track: input.track ?? null, description: input.description, priceMad: input.priceMad, isPublished: input.isPublished ?? 1 },
  });
}

export async function saveLandingChapter(input: InsertLandingChapter) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (input.id) {
    await db.update(landingChapters).set({ productCode: input.productCode, chapterNumber: input.chapterNumber, title: input.title, excerpt: input.excerpt, questionsJson: input.questionsJson, sortOrder: input.sortOrder, isPublished: input.isPublished ?? 1 }).where(eq(landingChapters.id, input.id));
    return input.id;
  }
  const result = await db.insert(landingChapters).values(input);
  return Number(result[0].insertId);
}

export async function deleteLandingChapter(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(landingChapters).set({ deletedAt: new Date(), isPublished: 0 }).where(eq(landingChapters.id, id));
}

export async function restoreLandingChapter(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(landingChapters).set({ deletedAt: null, isPublished: 1 }).where(eq(landingChapters.id, id));
}

export async function saveLandingFaq(input: InsertLandingFaq) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (input.id) {
    await db.update(landingFaqs).set({ productCode: input.productCode, question: input.question, answer: input.answer, sortOrder: input.sortOrder, isPublished: input.isPublished ?? 1 }).where(eq(landingFaqs.id, input.id));
    return input.id;
  }
  const result = await db.insert(landingFaqs).values(input);
  return Number(result[0].insertId);
}

export async function deleteLandingFaq(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(landingFaqs).set({ deletedAt: new Date(), isPublished: 0 }).where(eq(landingFaqs.id, id));
}

export async function restoreLandingFaq(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(landingFaqs).set({ deletedAt: null, isPublished: 1 }).where(eq(landingFaqs.id, id));
}



export type CreateComplaintInput = {
  ticketNumber: string;
  requestId?: number | null;
  fullName: string;
  email: string;
  whatsapp?: string | null;
  category: "payment" | "proof" | "review" | "download" | "data" | "other";
  description: string;
};

export async function createComplaint(input: CreateComplaintInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(complaints).values({
    ticketNumber: input.ticketNumber,
    requestId: input.requestId ?? null,
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    whatsapp: input.whatsapp ?? null,
    category: input.category,
    description: input.description,
    status: "new",
  });
  const insertedId = Number(result[0].insertId);
  return getComplaintById(insertedId);
}

export async function getComplaintById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
  return rows[0];
}

export async function getComplaintByTicketAndEmail(ticketNumber: string, email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({
    ticketNumber: complaints.ticketNumber,
    category: complaints.category,
    status: complaints.status,
    createdAt: complaints.createdAt,
    updatedAt: complaints.updatedAt,
    description: complaints.description,
  }).from(complaints).where(and(eq(complaints.ticketNumber, ticketNumber), eq(complaints.email, email.toLowerCase()))).limit(1);
  return rows[0];
}

export async function findPurchaseRequestByOrderNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({ id: purchaseRequests.id }).from(purchaseRequests).where(eq(purchaseRequests.orderNumber, orderNumber)).limit(1);
  return rows[0];
}

export type ComplaintAdminListOptions = {
  search?: string;
  status?: "new" | "in_review" | "needs_info" | "responded" | "closed";
  page?: number;
  pageSize?: number;
};

export async function getAdminComplaints(options: ComplaintAdminListOptions = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conditions: any[] = [];
  const search = options.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(
      like(complaints.ticketNumber, pattern),
      like(complaints.fullName, pattern),
      like(complaints.email, pattern),
    ));
  }
  if (options.status) conditions.push(eq(complaints.status, options.status));
  const pageSize = [10, 25, 50, 100, 200].includes(options.pageSize ?? 25) ? (options.pageSize ?? 25) : 25;
  const page = Math.max(options.page ?? 1, 1);
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totals, groupedTotals] = await Promise.all([
    db.select().from(complaints).where(where).orderBy(desc(complaints.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count() }).from(complaints).where(where),
    db.select({ status: complaints.status, total: count() }).from(complaints).groupBy(complaints.status),
  ]);
  const statusCounts = groupedTotals.reduce<Record<string, number>>((result, item) => {
    result[item.status] = Number(item.total);
    return result;
  }, {});
  return { complaints: rows, total: Number(totals[0]?.total ?? 0), page, pageSize, statusCounts };
}

export async function updateComplaintAdmin(input: {
  id: number;
  status: "new" | "in_review" | "needs_info" | "responded" | "closed";
  adminResponse?: string | null;
  responseUpdatedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const current = await getComplaintById(input.id);
  if (!current) return undefined;
  const responseChanged = input.adminResponse !== undefined && input.adminResponse !== current.adminResponse;
  await db.update(complaints).set({
    status: input.status,
    adminResponse: input.adminResponse === undefined ? current.adminResponse : input.adminResponse,
    responseUpdatedByUserId: responseChanged ? input.responseUpdatedByUserId : current.responseUpdatedByUserId,
    responseUpdatedAt: responseChanged ? new Date() : current.responseUpdatedAt,
  }).where(eq(complaints.id, input.id));
  return getComplaintById(input.id);
}
