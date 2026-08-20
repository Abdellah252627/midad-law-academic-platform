export const FORUM_MODERATION_WINDOW_MS = 24 * 60 * 60 * 1000;
export const FORUM_MODERATION_THRESHOLD = 3;
export const FORUM_MODERATION_BASE_BLOCK_MS = 30 * 60 * 1000;
export const FORUM_MODERATION_MAX_BLOCK_MS = 24 * 60 * 60 * 1000;

export type ExistingForumModeration = {
  violationCount: number;
  windowStartedAt: Date | null;
  blockLevel: number;
};

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
