import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getLandingAdminContent: vi.fn(),
    getPublishedLandingContent: vi.fn(),
    saveLandingProduct: vi.fn(),
    saveLandingChapter: vi.fn(),
    saveLandingFaq: vi.fn(),
    createAuditLog: vi.fn(),
    deleteLandingChapter: vi.fn(),
    restoreLandingChapter: vi.fn(),
    deleteLandingFaq: vi.fn(),
    restoreLandingFaq: vi.fn(),
  };
});

const adminContext = {
  user: { id: 1, openId: "admin-1", role: "admin", name: "مدير", email: "admin@example.com" },
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

const userContext = {
  user: { id: 7, openId: "student-7", role: "user", name: "طالب", email: "student@example.com" },
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

const anonymousContext = {
  user: undefined,
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

const adminContent = {
  product: {
    id: 1,
    productCode: "MIDAD-001",
    title: "مدخل إلى القانون والعلوم القانونية",
    category: "قانون",
    university: "جامعة ابن زهر",
    track: "الفصل الأول",
    description: "وصف تجريبي صالح للمنتج الدراسي.",
    priceMad: 19,
    isPublished: 1,
  },
  chapters: [],
  faqs: [
    {
      id: 1,
      productCode: "MIDAD-001",
      question: "أرسلت التحويل البنكي، متى تتم مراجعة طلبي؟",
      answer: "تتم مراجعة التحويل يدوياً بعد التحقق من وصول المبلغ.",
      sortOrder: 1,
      isPublished: 1,
      deletedAt: null,
    },
  ],
};

describe("admin landing content procedures", () => {
  beforeEach(() => {
    vi.mocked(db.getLandingAdminContent).mockResolvedValue(adminContent as never);
    vi.mocked(db.getPublishedLandingContent).mockResolvedValue({ product: adminContent.product, chapters: [], faqs: adminContent.faqs } as never);
    vi.mocked(db.saveLandingProduct).mockResolvedValue(undefined);
    vi.mocked(db.saveLandingChapter).mockResolvedValue(12);
    vi.mocked(db.saveLandingFaq).mockResolvedValue(9);
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined);
    vi.mocked(db.deleteLandingChapter).mockResolvedValue(undefined);
    vi.mocked(db.restoreLandingChapter).mockResolvedValue(undefined);
    vi.mocked(db.deleteLandingFaq).mockResolvedValue(undefined);
    vi.mocked(db.restoreLandingFaq).mockResolvedValue(undefined);
  });

  it("allows an admin to read and save published product content", async () => {
    const caller = appRouter.createCaller(adminContext);
    const content = await caller.admin.landingContent({ productCode: "MIDAD-001" });
    expect(content.product?.title).toContain("مدخل");

    await caller.admin.saveProduct({
      productCode: "MIDAD-001",
      title: "مدخل إلى القانون والعلوم القانونية",
      category: "قانون",
      university: "جامعة ابن زهر",
      track: "الفصل الأول",
      description: "وصف تجريبي صالح للمنتج الدراسي.",
      priceMad: 19,
      isPublished: 1,
    });
    expect(db.saveLandingProduct).toHaveBeenCalledWith(expect.objectContaining({ productCode: "MIDAD-001", isPublished: 1 }));
    expect(db.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "content.save", entityType: "landing_product", entityId: "MIDAD-001" }));
  });

  it("returns available FAQs to the admin content view", async () => {
    const caller = appRouter.createCaller(adminContext);
    const content = await caller.admin.landingContent({ productCode: "MIDAD-001" });
    expect(content.faqs).toHaveLength(1);
    expect(content.faqs[0]).toMatchObject({
      question: "أرسلت التحويل البنكي، متى تتم مراجعة طلبي؟",
      isPublished: 1,
    });
  });

  it("allows an admin to save a chapter and FAQ with publication state", async () => {
    const caller = appRouter.createCaller(adminContext);
    const chapterId = await caller.admin.saveChapter({
      productCode: "MIDAD-001",
      chapterNumber: "01",
      title: "مفهوم القانون",
      excerpt: "شرح مختصر صالح للمعاينة التعليمية.",
      questionsJson: "[\"ما هو القانون؟\"]",
      sortOrder: 1,
      isPublished: 1,
    });
    const faqId = await caller.admin.saveFaq({
      productCode: "MIDAD-001",
      question: "هل الملف بصيغة PDF؟",
      answer: "نعم، يتم تسليم الملف بصيغة PDF بعد تأكيد الدفع.",
      sortOrder: 1,
      isPublished: 1,
    });
    expect(chapterId).toBe(12);
    expect(faqId).toBe(9);
    expect(db.saveLandingChapter).toHaveBeenCalledWith(expect.objectContaining({ isPublished: 1 }));
    expect(db.saveLandingFaq).toHaveBeenCalledWith(expect.objectContaining({ isPublished: 1 }));
    expect(db.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "content.save", entityType: "landing_chapter", entityId: "12" }));
    expect(db.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "content.save", entityType: "landing_faq", entityId: "9" }));
  });

  it("records delete and restore actions for chapters and FAQs", async () => {
    const caller = appRouter.createCaller(adminContext);
    await caller.admin.deleteChapter({ id: 12 });
    await caller.admin.restoreChapter({ id: 12 });
    await caller.admin.deleteFaq({ id: 9 });
    await caller.admin.restoreFaq({ id: 9 });
    expect(db.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "content.delete", entityType: "landing_chapter", entityId: "12" }));
    expect(db.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "content.restore", entityType: "landing_faq", entityId: "9" }));
  });

  it("returns a safe empty preview when the draft product is missing", async () => {
    vi.mocked(db.getLandingAdminContent).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(adminContext);
    const preview = await caller.admin.previewContent({ productCode: "MIDAD-001" });
    expect(preview.product).toBeUndefined();
    expect(preview.chapters).toEqual([]);
    expect(preview.faqs).toEqual([]);
  });

  it("keeps public content limited to the published result", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    const content = await caller.landing.published({ productCode: "MIDAD-001" });
    expect(content.product?.isPublished).toBe(1);
    expect(db.getPublishedLandingContent).toHaveBeenCalledWith("MIDAD-001");
  });

  it("rejects anonymous and non-admin content management", async () => {
    const anonymousCaller = appRouter.createCaller(anonymousContext);
    const userCaller = appRouter.createCaller(userContext);
    await expect(anonymousCaller.admin.landingContent({ productCode: "MIDAD-001" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller.admin.landingContent({ productCode: "MIDAD-001" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller.admin.saveProduct({
      productCode: "MIDAD-001",
      title: "عنوان صالح",
      category: "قانون",
      university: "جامعة ابن زهر",
      description: "وصف تجريبي صالح للمنتج الدراسي.",
      priceMad: 19,
      isPublished: 1,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
