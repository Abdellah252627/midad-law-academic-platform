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
    expect(source).toContain("[search, searchScope, status, page, pageSize]");
  });

  it("labels the admin search for order number and customer data", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/AdminPurchases.tsx"), "utf8");

    expect(source).toContain('placeholder={searchScope === "orderNumber" ? "ابحث برقم الطلب فقط" : searchScope === "customer" ? "ابحث باسم العميل أو بريده أو واتسابه" : "ابحث برقم الطلب أو بيانات العميل"}');
    expect(source).toContain('aria-label="البحث في طلبات الشراء"');
    expect(source).toContain('aria-label="تحديد نطاق البحث"');
    expect(source).toContain('<option value="orderNumber">رقم الطلب فقط</option>');
    expect(source).toContain('<option value="customer">بيانات العميل فقط</option>');
    expect(source).toContain('setSearchScope(event.target.value as typeof searchScope); setPage(1);');
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

  it("opens the populated MIDAD Google Sheet instead of the broken Excel download", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/AdminPurchases.tsx"), "utf8");

    expect(source).toContain("فتح سجل Google Sheets");
    expect(source).toContain("https://docs.google.com/spreadsheets/d/1O6JEqrlxfaVui-BQ8VOr6nv9JxLd2Qz3013xfjFuirw/edit");
    expect(source).toContain("window.open");
    expect(source).not.toContain("/api/admin/purchase-requests.xlsx?");
  });

  it("marks excluded experimental orders with a clear admin-only label", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/AdminPurchases.tsx"), "utf8");

    expect(source).toContain("request.isTestOrder");
    expect(source).toContain("طلب تجريبي مستثنى");
    expect(source).toContain("لا يدخل هذا الطلب في عداد Early Bird");
    expect(source).toContain("{request.isTestOrder &&");
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
