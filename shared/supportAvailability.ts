export const SUPPORT_TIME_ZONE = "Africa/Casablanca";
export const SUPPORT_OPEN_MINUTES = 9 * 60;
export const SUPPORT_CLOSE_MINUTES = 20 * 60;

export function isSupportAvailable(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SUPPORT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find(part => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find(part => part.type === "minute")?.value ?? 0);
  const currentMinutes = hour * 60 + minute;
  return currentMinutes >= SUPPORT_OPEN_MINUTES && currentMinutes < SUPPORT_CLOSE_MINUTES;
}

export function getSupportStatusLabel(now: Date = new Date()): "متاح الآن" | "خارج أوقات العمل" {
  return isSupportAvailable(now) ? "متاح الآن" : "خارج أوقات العمل";
}
