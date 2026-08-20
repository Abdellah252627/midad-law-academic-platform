import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  productCode: varchar("productCode", { length: 32 }).notNull(),
  // Snapshot of the product price at order creation; never read from the current product price.
  pricePaid: int("price_paid").notNull(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }),
  transactionReference: varchar("transactionReference", { length: 120 }).notNull(),
  proofKey: varchar("proofKey", { length: 512 }),
  proofContentType: varchar("proofContentType", { length: 80 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  rejectionReason: varchar("rejectionReason", { length: 500 }),
  reviewedByUserId: int("reviewedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export const purchaseRequestCorrections = mysqlTable("purchase_request_corrections", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => purchaseRequests.id),
  oldEmail: varchar("oldEmail", { length: 320 }).notNull(),
  oldPhone: varchar("oldPhone", { length: 32 }),
  requestedEmail: varchar("requestedEmail", { length: 320 }),
  requestedPhone: varchar("requestedPhone", { length: 32 }),
  reason: varchar("reason", { length: 500 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  decisionNote: varchar("decisionNote", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sampleDownloadLeads = mysqlTable("sample_download_leads", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 32 }).notNull(),
  consentVersion: varchar("consentVersion", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
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
  deletedAt: timestamp("deletedAt"),
});

export const landingChapters = mysqlTable("landing_chapters", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull(),
  chapterNumber: varchar("chapterNumber", { length: 8 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  excerpt: text("excerpt").notNull(),
  learningObjectives: text("learningObjectives"),
  questionsJson: text("questionsJson").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isPublished: int("isPublished").default(1).notNull(),
  deletedAt: timestamp("deletedAt"),
});

export const landingFaqs = mysqlTable("landing_faqs", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull(),
  question: varchar("question", { length: 300 }).notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 32 }).default("support").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isPublished: int("isPublished").default(1).notNull(),
  deletedAt: timestamp("deletedAt"),
});

export const productFiles = mysqlTable("product_files", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull(),
  fileType: mysqlEnum("fileType", ["pdf", "cover", "sample"]).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 220 }).notNull(),
  contentType: varchar("contentType", { length: 100 }).notNull(),
  version: int("version").default(1).notNull(),
  isActive: int("isActive").default(1).notNull(),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: mysqlEnum("eventType", ["page_view", "sample_download", "purchase_request"]).notNull(),
  productCode: varchar("productCode", { length: 32 }).notNull(),
  visitorKey: varchar("visitorKey", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const appSettings = mysqlTable("app_settings", {
  settingKey: varchar("settingKey", { length: 120 }).primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull().default("MIDAD-001"),
  settingValue: text("settingValue").notNull(),
  description: varchar("description", { length: 300 }),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull().unique().references(() => purchaseRequests.id),
  productId: varchar("product_id", { length: 32 }).notNull().references(() => landingProducts.productCode),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isVisible: int("is_visible").default(1).notNull(),
});

export const purchaseRequestNotes = mysqlTable("purchase_request_notes", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull().references(() => purchaseRequests.id),
  content: text("content").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  updatedByUserId: int("updatedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export const purchaseRequestNoteEvents = mysqlTable("purchase_request_note_events", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("noteId").notNull().references(() => purchaseRequestNotes.id),
  requestId: int("requestId").notNull().references(() => purchaseRequests.id),
  actorUserId: int("actorUserId").notNull(),
  action: mysqlEnum("action", ["created", "updated", "deleted", "restored"]).notNull(),
  previousContent: text("previousContent"),
  newContent: text("newContent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  ticketNumber: varchar("ticketNumber", { length: 32 }).notNull().unique(),
  requestId: int("requestId").references(() => purchaseRequests.id),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 32 }),
  category: mysqlEnum("category", ["payment", "proof", "review", "download", "data", "other"]).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["new", "in_review", "needs_info", "responded", "closed"]).default("new").notNull(),
  adminResponse: text("adminResponse"),
  responseUpdatedByUserId: int("responseUpdatedByUserId"),
  responseUpdatedAt: timestamp("responseUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const supportFollowUps = mysqlTable("support_follow_ups", {
  id: int("id").autoincrement().primaryKey(),
  productCode: varchar("productCode", { length: 32 }).notNull().default("MIDAD-001"),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 254 }),
  message: varchar("message", { length: 1000 }),
  status: mysqlEnum("status", ["new", "contacted", "closed"]).default("new").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  adminNote: varchar("adminNote", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  contactedAt: timestamp("contactedAt"),
});

export const adminNotifications = mysqlTable("admin_notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  priority: mysqlEnum("priority", ["high", "critical"]).default("high").notNull(),
  entityType: varchar("entityType", { length: 80 }),
  entityId: varchar("entityId", { length: 80 }),
  targetPath: varchar("targetPath", { length: 255 }).notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  productCode: varchar("productCode", { length: 32 }),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type InsertPurchaseRequest = typeof purchaseRequests.$inferInsert;
export type PurchaseRequestCorrection = typeof purchaseRequestCorrections.$inferSelect;
export type InsertPurchaseRequestCorrection = typeof purchaseRequestCorrections.$inferInsert;
export type SampleDownloadLead = typeof sampleDownloadLeads.$inferSelect;
export type InsertSampleDownloadLead = typeof sampleDownloadLeads.$inferInsert;
export type LandingProduct = typeof landingProducts.$inferSelect;
export type InsertLandingProduct = typeof landingProducts.$inferInsert;
export type LandingChapter = typeof landingChapters.$inferSelect;
export type InsertLandingChapter = typeof landingChapters.$inferInsert;
export type LandingFaq = typeof landingFaqs.$inferSelect;
export type InsertLandingFaq = typeof landingFaqs.$inferInsert;
export type ProductFile = typeof productFiles.$inferSelect;
export type InsertProductFile = typeof productFiles.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
export type AdminNotification = typeof adminNotifications.$inferSelect;
export type InsertAdminNotification = typeof adminNotifications.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type SupportFollowUp = typeof supportFollowUps.$inferSelect;
export type InsertSupportFollowUp = typeof supportFollowUps.$inferInsert;
export type PurchaseRequestNote = typeof purchaseRequestNotes.$inferSelect;
export type InsertPurchaseRequestNote = typeof purchaseRequestNotes.$inferInsert;
export type PurchaseRequestNoteEvent = typeof purchaseRequestNoteEvents.$inferSelect;
export type InsertPurchaseRequestNoteEvent = typeof purchaseRequestNoteEvents.$inferInsert;
