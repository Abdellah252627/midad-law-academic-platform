import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildPurchaseRequestsXlsx } from "./xlsxExport";

describe("MIDAD formatted purchase workbook", () => {
  it("builds a right-to-left workbook with stable manual-entry formatting", async () => {
    const base64 = await buildPurchaseRequestsXlsx([{
      customerName: "محمد أمين (مثال)",
      customerEmail: "example@test.com",
      customerPhone: "+212600000000",
      productCode: "MIDAD-001",
      pricePaid: 19,
      proofKey: "proof_001.jpg",
      orderNumber: "ORD-0001",
      status: "approved",
      createdAt: new Date("2026-08-01T00:00:00Z"),
      updatedAt: new Date("2026-08-02T00:00:00Z"),
      adminNotes: "لا يوجد",
    }]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(base64, "base64"));
    const sheet = workbook.getWorksheet("سجل الطلبة");
    expect(sheet).toBeDefined();
    expect(sheet?.views[0]).toMatchObject({ rightToLeft: true, state: "frozen", ySplit: 1 });
    expect(sheet?.getRow(1).values).toContain("الاسم الكامل");
    expect(sheet?.getCell("A1").font?.bold).toBe(true);
    expect(sheet?.getCell("A1").fill).toMatchObject({ fgColor: { argb: "FF16283F" } });
    expect(sheet?.getCell("E2").value).toBe(19);
    expect(sheet?.getCell("E2").numFmt).toBe('0.00" درهم"');
    expect(sheet?.getCell("I2").numFmt).toBe("dd/mm/yyyy");
    expect(sheet?.getCell("J2").numFmt).toBe("dd/mm/yyyy");
    expect(sheet?.conditionalFormattings.length).toBeGreaterThan(0);
    expect((sheet as any).dataValidations).toBeDefined();
  });
});
