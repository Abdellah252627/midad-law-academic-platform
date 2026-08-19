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

type MoroccoTimeParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function getMoroccoTimeParts(date: Date): MoroccoTimeParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SUPPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function getNextOpeningTimestamp(now: Date): number {
  const current = getMoroccoTimeParts(now);
  const currentMinutes = current.hour * 60 + current.minute;
  const dayOffset = currentMinutes < SUPPORT_OPEN_MINUTES ? 0 : 1;
  const localTarget = Date.UTC(current.year, current.month - 1, current.day + dayOffset, 9, 0, 0);
  const localNow = Date.UTC(current.year, current.month - 1, current.day, current.hour, current.minute, current.second);
  let target = now.getTime() + (localTarget - localNow);
  const convertedTarget = getMoroccoTimeParts(new Date(target));
  const targetAsLocal = Date.UTC(convertedTarget.year, convertedTarget.month - 1, convertedTarget.day, convertedTarget.hour, convertedTarget.minute, convertedTarget.second);
  target += localTarget - targetAsLocal;
  return target;
}

export function getSupportCountdownSeconds(now: Date = new Date()): number {
  if (isSupportAvailable(now)) return 0;
  return Math.max(0, Math.ceil((getNextOpeningTimestamp(now) - now.getTime()) / 1000));
}

export function formatSupportCountdown(now: Date = new Date()): string {
  const totalSeconds = getSupportCountdownSeconds(now);
  if (totalSeconds === 0) return "متاح الآن";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `يفتح الدعم بعد ${hours}س ${minutes}د ${seconds}ث`;
}

export function getSupportStatusLabel(now: Date = new Date()): "متاح الآن" | "خارج أوقات العمل" {
  return isSupportAvailable(now) ? "متاح الآن" : "خارج أوقات العمل";
}
