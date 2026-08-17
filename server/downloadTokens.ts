import { jwtVerify, SignJWT } from "jose";
import { ENV } from "./_core/env";

export const DOWNLOAD_LINK_TTL_MINUTES = 15;

export type DownloadTokenPayload = {
  requestId: number;
  fileKey: string;
};

function getSecretKey() {
  if (!ENV.cookieSecret) {
    throw new Error("Download token secret is not configured");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createDownloadToken(payload: DownloadTokenPayload): Promise<string> {
  return new SignJWT({ requestId: payload.requestId, fileKey: payload.fileKey })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${DOWNLOAD_LINK_TTL_MINUTES}m`)
    .sign(getSecretKey());
}

export async function verifyDownloadToken(token: string): Promise<DownloadTokenPayload> {
  const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
  if (
    typeof payload.requestId !== "number" ||
    !Number.isInteger(payload.requestId) ||
    payload.requestId <= 0 ||
    typeof payload.fileKey !== "string" ||
    payload.fileKey.length < 1 ||
    payload.fileKey.length > 500
  ) {
    throw new Error("Invalid download token payload");
  }
  return { requestId: payload.requestId, fileKey: payload.fileKey };
}

export function buildDownloadUrl(requestId: number, token: string): string {
  return `/api/download/${requestId}?token=${encodeURIComponent(token)}`;
}
