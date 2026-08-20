export const FORUM_MODERATION_WINDOW_MS = 24 * 60 * 60 * 1000;
export const FORUM_MODERATION_THRESHOLD = 3;
export const FORUM_MODERATION_BASE_BLOCK_MS = 30 * 60 * 1000;
export const FORUM_MODERATION_MAX_BLOCK_MS = 24 * 60 * 60 * 1000;
export const FORUM_TIME_ZONE = "Africa/Casablanca";
export const FORUM_OPEN_HOUR = 8;
export const FORUM_CLOSE_HOUR = 20;

export function getMoroccoHour(date: Date) {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: FORUM_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).find(part => part.type === "hour")?.value;
  return hour ? Number(hour) : NaN;
}

export function isForumOpenAt(date = new Date()) {
  const hour = getMoroccoHour(date);
  return Number.isFinite(hour) && hour >= FORUM_OPEN_HOUR && hour < FORUM_CLOSE_HOUR;
}

export const FORUM_CLOSED_MESSAGE = "المشاركة في المنتدى متاحة يومياً من الساعة 08:00 صباحاً إلى 20:00 مساءً بتوقيت المغرب. يمكنك تصفح النقاشات حالياً، وسنستقبل موضوعك أو ردك خلال ساعات المشاركة.";

function getMoroccoDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FORUM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

export function getForumCountdown(date = new Date()) {
  const parts = getMoroccoDateParts(date);
  const isOpen = parts.hour >= FORUM_OPEN_HOUR && parts.hour < FORUM_CLOSE_HOUR;
  const localNowAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMs = date.getTime() - localNowAsUtc;
  const targetHour = isOpen ? FORUM_CLOSE_HOUR : FORUM_OPEN_HOUR;
  const daysToAdd = !isOpen && parts.hour >= FORUM_CLOSE_HOUR ? 1 : 0;
  const nextTransitionAt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysToAdd, targetHour) + offsetMs);
  return { isOpen, nextTransitionAt, remainingMs: Math.max(0, nextTransitionAt.getTime() - date.getTime()) };
}

export type ExistingForumModeration = {
  violationCount: number;
  windowStartedAt: Date | null;
  blockLevel: number;
};

export function getForumModerationWarning(violationCount: number, isBlocked = false) {
  const remainingAttempts = Math.max(0, FORUM_MODERATION_THRESHOLD - violationCount);
  const showWarning = !isBlocked && violationCount >= FORUM_MODERATION_THRESHOLD - 1;
  return {
    remainingAttempts,
    showWarning,
    message: showWarning ? `تنبيه: تبقت لك ${remainingAttempts === 1 ? "محاولة واحدة" : `${remainingAttempts} محاولات`} فقط قبل التقييد المؤقت. احرص على احترام قواعد المنتدى.` : null,
  };
}

export function calculateForumViolation(existing: ExistingForumModeration | undefined, now: Date) {
  const withinWindow = Boolean(existing?.windowStartedAt && now.getTime() - existing.windowStartedAt.getTime() <= FORUM_MODERATION_WINDOW_MS);
  const violationCount = withinWindow ? (existing?.violationCount ?? 0) + 1 : 1;
  const reachedThreshold = violationCount >= FORUM_MODERATION_THRESHOLD;
  const blockLevel = reachedThreshold ? Math.max(1, (existing?.blockLevel ?? 0) + 1) : (existing?.blockLevel ?? 0);
  const blockDurationMs = reachedThreshold ? Math.min(FORUM_MODERATION_BASE_BLOCK_MS * 2 ** (blockLevel - 1), FORUM_MODERATION_MAX_BLOCK_MS) : 0;
  return {
    violationCount,
    windowStartedAt: withinWindow ? existing?.windowStartedAt ?? now : now,
    lastViolationAt: now,
    blockedUntil: reachedThreshold ? new Date(now.getTime() + blockDurationMs) : null,
    blockLevel,
    isBlocked: reachedThreshold,
    remainingMs: blockDurationMs,
  };
}
