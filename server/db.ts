import { asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertLandingChapter, InsertLandingFaq, InsertLandingProduct, InsertPurchaseRequest, InsertSampleDownloadLead, InsertUser, landingChapters, landingFaqs, landingProducts, purchaseRequests, sampleDownloadLeads, users } from "../drizzle/schema";
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

export async function createPurchaseRequest(input: InsertPurchaseRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(purchaseRequests).values(input);
  return { id: Number(result[0].insertId) };
}

export async function createSampleDownloadLead(input: InsertSampleDownloadLead) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(sampleDownloadLeads).values(input);
  return { id: Number(result[0].insertId) };
}

export async function getSampleDownloadLeads() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(sampleDownloadLeads).orderBy(desc(sampleDownloadLeads.createdAt));
}

export async function getPurchaseRequestById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).limit(1);
  return rows[0];
}

export async function getPurchaseRequests() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(purchaseRequests).orderBy(desc(purchaseRequests.createdAt));
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
    db.select().from(landingProducts).where(eq(landingProducts.productCode, productCode)).limit(1),
    db.select().from(landingChapters).where(eq(landingChapters.productCode, productCode)).orderBy(asc(landingChapters.sortOrder)),
    db.select().from(landingFaqs).where(eq(landingFaqs.productCode, productCode)).orderBy(asc(landingFaqs.sortOrder)),
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
  await db.delete(landingChapters).where(eq(landingChapters.id, id));
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
  await db.delete(landingFaqs).where(eq(landingFaqs.id, id));
}

