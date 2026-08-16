import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import * as storage from "./storage";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getProductFiles: vi.fn(),
    createProductFile: vi.fn(),
    createAuditLog: vi.fn(),
  };
});

vi.mock("./storage", async () => {
  const actual = await vi.importActual<typeof import("./storage")>("./storage");
  return {
    ...actual,
    storagePut: vi.fn(),
    storageGetSignedUrl: vi.fn(),
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

const pdf = "data:application/pdf;base64," + "A".repeat(180);

describe("admin file versioning", () => {
  beforeEach(() => {
    vi.mocked(db.getProductFiles).mockResolvedValue([
      { id: 5, productCode: "MIDAD-001", fileType: "pdf", fileKey: "old.pdf", fileName: "old.pdf", contentType: "application/pdf", version: 1, isActive: 1, uploadedByUserId: 1, createdAt: new Date() },
      { id: 4, productCode: "MIDAD-001", fileType: "cover", fileKey: "cover.png", fileName: "cover.png", contentType: "image/png", version: 1, isActive: 1, uploadedByUserId: 1, createdAt: new Date() },
    ] as never);
    vi.mocked(storage.storagePut).mockResolvedValue({ key: "product-files/MIDAD-001/pdf/new.pdf", url: "https://storage.test/new.pdf" });
    vi.mocked(db.createProductFile).mockResolvedValue(6);
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined);
  });

  it.each([
    ["pdf", "new.pdf", "application/pdf"],
    ["cover", "new-cover.png", "image/png"],
    ["sample", "new-sample.pdf", "application/pdf"],
  ] as const)("creates a new %s version and marks it active", async (fileType, fileName, contentType) => {
    vi.mocked(db.getProductFiles).mockResolvedValue([
      { id: 5, productCode: "MIDAD-001", fileType, fileKey: `old-${fileType}`, fileName: `old-${fileType}`, contentType, version: 1, isActive: 1, uploadedByUserId: 1, createdAt: new Date() },
    ] as never);
    vi.mocked(db.createProductFile).mockResolvedValue(6);

    const result = await appRouter.createCaller(adminContext).admin.uploadFile({
      productCode: "MIDAD-001",
      fileType,
      fileName,
      contentType,
      base64: pdf,
    });

    expect(result).toEqual({ success: true, fileId: 6, version: 2 });
    expect(storage.storagePut).toHaveBeenCalledWith(expect.stringContaining(`product-files/MIDAD-001/${fileType}/`), expect.any(Buffer), contentType);
    expect(db.createProductFile).toHaveBeenCalledWith(expect.objectContaining({ fileType, version: 2, isActive: 1 }));
    expect(db.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "file.upload", entityType: "product_file" }));
  });

  it("rejects a PDF uploaded as a cover and protects the route from non-admin users", async () => {
    await expect(appRouter.createCaller(adminContext).admin.uploadFile({
      productCode: "MIDAD-001", fileType: "cover", fileName: "wrong.pdf", contentType: "application/pdf", base64: pdf,
    })).rejects.toThrow("صورة الغلاف");
    await expect(appRouter.createCaller(userContext).admin.uploadFile({
      productCode: "MIDAD-001", fileType: "pdf", fileName: "new.pdf", contentType: "application/pdf", base64: pdf,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

