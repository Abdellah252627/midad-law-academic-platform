import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin purchase details UI", () => {
  it("exposes the supported page sizes and resets pagination when changed", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/AdminPurchases.tsx"), "utf8");

    expect(source).toContain('aria-label="اختيار حجم صفحة الطلبات"');
    expect(source).toContain('<option value={10}>10</option>');
    expect(source).toContain('<option value={50}>50</option>');
    expect(source).toContain('<option value={100}>100</option>');
    expect(source).toContain('<option value={200}>200</option>');
    expect(source).toContain("setPageSize(Number(event.target.value) as typeof pageSize); setPage(1);");
    expect(source).toContain("[search, status, page, pageSize]");
  });

  it("labels the admin search for order number and customer data", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/AdminPurchases.tsx"), "utf8");

    expect(source).toContain('placeholder="ابحث برقم الطلب أو اسم العميل أو بريده الإلكتروني"');
    expect(source).toContain('aria-label="البحث برقم الطلب أو اسم العميل أو بريده الإلكتروني"');
    expect(source).toContain("نتائج البحث عن رقم الطلب أو بيانات العميل");
    expect(source).toContain("setSearch(searchDraft.trim().slice(0, 160));");
    expect(source).toContain("setPage(1);");
  });

  it("shows internal notes controls and an admin-only change history", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/AdminPurchases.tsx"), "utf8");

    expect(source).toContain("الملاحظات");
    expect(source).toContain("هذه الملاحظات خاصة بفريق الإدارة ولا تظهر للعميل.");
    expect(source).toContain("السجل الزمني للتعديلات");
    expect(source).toContain("trpc.admin.purchaseRequestNotes");
    expect(source).toContain("trpc.admin.createPurchaseRequestNote");
    expect(source).toContain("trpc.admin.updatePurchaseRequestNote");
    expect(source).toContain("trpc.admin.deletePurchaseRequestNote");
  });

  it("shows the visible order number in customer confirmation and admin views", () => {
    const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const adminSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminPurchases.tsx"), "utf8");

    expect(homeSource).toContain("transferOrderNumber");
    expect(homeSource).toContain("رقم طلبك هو ${orderNumber}");
    expect(homeSource).toContain("transferOrderNumber ?? `MIDAD-");
    expect(adminSource).toContain("{request.orderNumber}");
    expect(adminSource).toContain("{item.orderNumber}");
  });

  it("shows the customer identity fields and proof preview in the purchases table", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/AdminPurchases.tsx"), "utf8");

    expect(source).toContain("بيانات العميل");
    expect(source).toContain("request.customerName");
    expect(source).toContain("request.customerEmail");
    expect(source).toContain("request.customerPhone");
    expect(source).toContain("إثبات التحويل");
    expect(source).toContain("setSelectedProofId(request.id)");
    expect(source).toContain("trpc.admin.purchaseProofUrl");
  });
});
