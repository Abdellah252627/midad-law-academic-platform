import type { Express, Request, Response } from "express";
import { getPurchaseRequestById } from "./db";
import { storageGetSignedUrl } from "./storage";
import { verifyDownloadToken } from "./downloadTokens";

export function registerDownloadRoutes(app: Express) {
  app.get("/api/download/:requestId", async (req: Request, res: Response) => {
    const requestId = Number(req.params.requestId);
    const token = typeof req.query.token === "string" ? req.query.token : "";

    if (!Number.isInteger(requestId) || requestId <= 0 || !token) {
      res.status(400).json({ error: "رابط التنزيل غير صالح" });
      return;
    }

    try {
      const tokenPayload = await verifyDownloadToken(token);
      if (tokenPayload.requestId !== requestId) {
        res.status(403).json({ error: "رابط التنزيل غير صالح" });
        return;
      }

      const request = await getPurchaseRequestById(requestId);
      if (!request || request.status !== "approved") {
        res.status(403).json({ error: "لم تتم الموافقة على طلب التنزيل" });
        return;
      }

      const signedUrl = await storageGetSignedUrl(tokenPayload.fileKey);
      res.redirect(307, signedUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("expired")) {
        res.status(410).json({ error: "انتهت صلاحية رابط التنزيل" });
        return;
      }
      res.status(403).json({ error: "رابط التنزيل غير صالح أو منتهي" });
    }
  });
}
