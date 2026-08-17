import ExcelJS from "exceljs";

export type PurchaseExportRow = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  productCode: string;
  pricePaid: number;
  proofKey: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  adminNotes: string;
};

const HEADERS = [
  "الاسم الكامل",
  "البريد الإلكتروني",
  "رقم واتساب",
  "المنتج (رقم المنتج)",
  "السعر المدفوع (بالدرهم)",
  "إثبات التحويل",
  "رقم الطلب",
  "حالة الطلب",
  "تاريخ الإنشاء",
  "تاريخ آخر تحديث",
  "ملاحظات إدارية",
];

const NAVY = "FF16283F";
const WHITE = "FFFFFFFF";
const THIN_BORDER = { style: "thin" as const, color: { argb: "FFD9E0E8" } };
const CELL_BORDER = { left: THIN_BORDER, right: THIN_BORDER, top: THIN_BORDER, bottom: THIN_BORDER };

function statusLabel(status: string) {
  return status === "approved" ? "مقبول" : status === "rejected" ? "مرفوض" : "قيد المراجعة";
}

function rowValues(request: PurchaseExportRow) {
  return [
    request.customerName,
    request.customerEmail,
    request.customerPhone ?? "",
    request.productCode,
    request.pricePaid,
    request.proofKey ?? "غير مرفق",
    request.orderNumber,
    statusLabel(request.status),
    request.createdAt,
    request.updatedAt,
    request.adminNotes ?? "",
  ];
}

export async function buildPurchaseRequestsXlsx(requests: PurchaseExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MIDAD";
  workbook.lastModifiedBy = "MIDAD Admin";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("سجل الطلبة", {
    properties: { defaultRowHeight: 22 },
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1, showGridLines: false }],
  });
  worksheet.pageSetup.orientation = "landscape";
  worksheet.pageSetup.fitToPage = true;
  worksheet.pageSetup.fitToWidth = 1;
  worksheet.pageSetup.fitToHeight = 0;
  (worksheet as any).printTitlesRow = "1:1";

  worksheet.addRow(HEADERS);
  for (const request of requests) worksheet.addRow(rowValues(request));
  if (requests.length === 0) worksheet.addRow(Array(HEADERS.length).fill(""));

  const headerRow = worksheet.getRow(1);
  headerRow.height = 34;
  headerRow.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: WHITE } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = CELL_BORDER;
  });

  for (let rowNumber = 2; rowNumber <= Math.max(1000, worksheet.rowCount); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (rowNumber <= worksheet.rowCount) row.height = 28;
    for (let columnNumber = 1; columnNumber <= HEADERS.length; columnNumber += 1) {
      const cell = row.getCell(columnNumber);
      cell.font = { name: "Arial", size: 10, color: { argb: "FF1F2937" } };
      cell.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
      cell.border = CELL_BORDER;
    }
    row.getCell(5).numFmt = '0.00" درهم"';
    row.getCell(9).numFmt = "dd/mm/yyyy";
    row.getCell(10).numFmt = "dd/mm/yyyy";
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
  }

  const widths = [24, 30, 19, 22, 22, 28, 22, 18, 16, 18, 32];
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  worksheet.addTable({
    name: "MidadOrdersTable",
    ref: `A1:K${Math.max(2, requests.length + 1)}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true, showColumnStripes: false },
    columns: HEADERS.map(name => ({ name })),
    rows: requests.length ? requests.map(rowValues) : [Array(HEADERS.length).fill("")],
  });

  (worksheet as any).dataValidations.add("H2:H1000", {
    type: "list",
    allowBlank: true,
    formulae: ['"قيد المراجعة,مقبول,مرفوض"'],
    showErrorMessage: true,
    errorTitle: "حالة غير صالحة",
    error: "اختر حالة من القائمة: قيد المراجعة، مقبول، أو مرفوض.",
  });

  worksheet.addConditionalFormatting({
    ref: "H2:H1000",
    rules: [
      { type: "expression", priority: 1, formulae: ['$H2="قيد المراجعة"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFFF2CC" }, fgColor: { argb: "FFFFF2CC" } }, font: { color: { argb: "FF7F6000" }, bold: true } } },
      { type: "expression", priority: 2, formulae: ['$H2="مقبول"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFE2F0D9" }, fgColor: { argb: "FFE2F0D9" } }, font: { color: { argb: "FF375623" }, bold: true } } },
      { type: "expression", priority: 3, formulae: ['$H2="مرفوض"'], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFCE4D6" }, fgColor: { argb: "FFFCE4D6" } }, font: { color: { argb: "FF9C0006" }, bold: true } } },
    ],
  });

  worksheet.getCell("F1").note = "يُكتب اسم الملف أو رابط مرجعي فقط، ولا تُدرج صورة إثبات التحويل داخل ملف Excel.";
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}
