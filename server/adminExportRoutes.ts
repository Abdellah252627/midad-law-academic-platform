import type { Express, Request, Response } from "express";
import { z } from "zod";
import { getPurchaseRequestsForExport } from "./db";
import { buildPurchaseRequestsXlsxBuffer } from "./xlsxExport";
import { sdk } from "./_core/sdk";

const exportQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  searchScope: z.enum(["all", "orderNumber", "customer"]).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

function dateFileName() {
  return `midad-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

export function registerAdminExportRoutes(app: Express) {
  app.get("/api/admin/purchase-requests.xlsx", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user || user.role !== "admin") {
        res.status(403).json({ error: "لا تملك صلاحية تصدير الطلبات" });
        return;
      }

      const parsed = exportQuerySchema.safeParse({
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        searchScope: typeof req.query.searchScope === "string" ? req.query.searchScope : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
      });
      if (!parsed.success) {
        res.status(400).json({ error: "فلاتر التصدير غير صالحة" });
        return;
      }

      const requests = await getPurchaseRequestsForExport(parsed.data);
      const workbookBuffer = await buildPurchaseRequestsXlsxBuffer(requests);
      const filename = dateFileName();

      res.status(200);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="midad-orders.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader("Content-Length", String(workbookBuffer.length));
      res.setHeader("Cache-Control", "no-store, private");
      res.send(workbookBuffer);
    } catch (error) {
      console.error("[admin export] failed", error);
      if (!res.headersSent) res.status(500).json({ error: "تعذر إنشاء ملف Excel" });
    }
  });
}
