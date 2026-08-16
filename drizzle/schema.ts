import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const purchaseRequests = mysqlTable("purchase_requests", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }),
  transactionReference: varchar("transactionReference", { length: 120 }).notNull(),
  proofKey: varchar("proofKey", { length: 512 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export const sampleDownloadLeads = mysqlTable("sample_download_leads", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 32 }).notNull(),
  consentVersion: varchar("consentVersion", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const landingProducts = mysqlTable("landing_products", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull().unique(),
  title: varchar("title", { length: 220 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  university: varchar("university", { length: 180 }).notNull(),
  track: varchar("track", { length: 180 }),
  description: text("description").notNull(),
  priceMad: int("priceMad").notNull(),
  isPublished: int("isPublished").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const landingChapters = mysqlTable("landing_chapters", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull(),
  chapterNumber: varchar("chapterNumber", { length: 8 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  excerpt: text("excerpt").notNull(),
  questionsJson: text("questionsJson").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isPublished: int("isPublished").default(1).notNull(),
});

export const landingFaqs = mysqlTable("landing_faqs", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull(),
  question: varchar("question", { length: 300 }).notNull(),
  answer: text("answer").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isPublished: int("isPublished").default(1).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type InsertPurchaseRequest = typeof purchaseRequests.$inferInsert;
export type SampleDownloadLead = typeof sampleDownloadLeads.$inferSelect;
export type InsertSampleDownloadLead = typeof sampleDownloadLeads.$inferInsert;
export type LandingProduct = typeof landingProducts.$inferSelect;
export type InsertLandingProduct = typeof landingProducts.$inferInsert;
export type LandingChapter = typeof landingChapters.$inferSelect;
export type InsertLandingChapter = typeof landingChapters.$inferInsert;
export type LandingFaq = typeof landingFaqs.$inferSelect;
export type InsertLandingFaq = typeof landingFaqs.$inferInsert;
