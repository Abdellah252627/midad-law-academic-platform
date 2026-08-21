import { describe, expect, it } from "vitest";
import { FORUM_BLOCKED_WORD_WARNING, FORUM_SENSITIVE_DATA_WARNING, findBlockedForumTerm, findSensitiveForumData, normalizeForumText, redactSensitiveForumData } from "../shared/forumModeration";

describe("forum moderation word list", () => {
  it("normalizes Arabic variants and diacritics consistently", () => {
    expect(normalizeForumText("إِحْمَق")).toBe("احمق");
    expect(normalizeForumText("  يا   حيوان ")).toBe("يا حيوان");
  });

  it("detects an active term as a whole word or phrase", () => {
    expect(findBlockedForumTerm("هذا شخص احمق في النقاش", ["احمق"])).toBe("احمق");
    expect(findBlockedForumTerm("هذا تصرف يا حيوان", ["يا حيوان"])).toBe("يا حيوان");
  });

  it("does not flag a longer word that only contains a short term", () => {
    expect(findBlockedForumTerm("المحكمة تدرس الغباء العلمي", ["غبي"])).toBeUndefined();
  });

  it("returns the neutral warning used by the UI and server", () => {
    expect(FORUM_BLOCKED_WORD_WARNING).toContain("قواعد المنتدى");
    expect(FORUM_BLOCKED_WORD_WARNING).not.toContain("احمق");
  });
  it("detects email, Moroccan phone, and social links without exposing their values", () => {
    expect(findSensitiveForumData("تواصلوا عبر student@example.com")?.category).toBe("email");
    expect(findSensitiveForumData("الرقم 06 12 34 56 78")?.category).toBe("phone");
    expect(findSensitiveForumData("الرابط https://instagram.com/student_1")?.category).toBe("social_media");
    const redacted = redactSensitiveForumData("راسلني على student@example.com أو 06 12 34 56 78");
    expect(redacted).not.toContain("@example.com");
    expect(redacted).not.toContain("06 12 34 56 78");
  });

  it("does not flag ordinary academic numbers or neutral social words", () => {
    expect(findSensitiveForumData("الفصل 12 يتناول المادة 34")).toBeNull();
    expect(findSensitiveForumData("ناقشنا دور التواصل الاجتماعي في القانون")).toBeNull();
  });

  it("uses a privacy-safe neutral warning", () => {
    expect(FORUM_SENSITIVE_DATA_WARNING).toContain("خصوصيتك");
    expect(FORUM_SENSITIVE_DATA_WARNING).not.toContain("@example.com");
  });
});

import { calculateForumViolation, FORUM_MODERATION_BASE_BLOCK_MS, FORUM_MODERATION_THRESHOLD, FORUM_MODERATION_WINDOW_MS, getForumModerationWarning } from "../shared/forumModerationPolicy";

describe("temporary forum moderation policy", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");

  it("does not block before the third violation", () => {
    const result = calculateForumViolation({ violationCount: 1, windowStartedAt: now, blockLevel: 0 }, new Date(now.getTime() + 1_000));
    expect(result.violationCount).toBe(2);
    expect(result.isBlocked).toBe(false);
    expect(FORUM_MODERATION_THRESHOLD).toBe(3);
  });

  it("starts a temporary block at the threshold", () => {
    const result = calculateForumViolation({ violationCount: 2, windowStartedAt: now, blockLevel: 0 }, new Date(now.getTime() + 1_000));
    expect(result.violationCount).toBe(3);
    expect(result.isBlocked).toBe(true);
    expect(result.remainingMs).toBe(FORUM_MODERATION_BASE_BLOCK_MS);
    expect(result.blockedUntil?.getTime()).toBe(new Date(now.getTime() + 1_000 + FORUM_MODERATION_BASE_BLOCK_MS).getTime());
  });

  it("resets the counter after the 24-hour window", () => {
    const result = calculateForumViolation({ violationCount: 2, windowStartedAt: now, blockLevel: 0 }, new Date(now.getTime() + FORUM_MODERATION_WINDOW_MS + 1));
    expect(result.violationCount).toBe(1);
    expect(result.isBlocked).toBe(false);
    expect(result.windowStartedAt?.getTime()).toBe(now.getTime() + FORUM_MODERATION_WINDOW_MS + 1);
  });

  it("escalates duration for repeated blocks without exceeding the maximum", () => {
    const result = calculateForumViolation({ violationCount: 2, windowStartedAt: now, blockLevel: 1 }, new Date(now.getTime() + 2_000));
    expect(result.blockLevel).toBe(2);
    expect(result.remainingMs).toBe(FORUM_MODERATION_BASE_BLOCK_MS * 2);
  });

  it("shows a visible warning with one remaining attempt near the threshold", () => {
    const result = getForumModerationWarning(FORUM_MODERATION_THRESHOLD - 1);
    expect(result.showWarning).toBe(true);
    expect(result.remainingAttempts).toBe(1);
    expect(result.message).toContain("محاولة واحدة");
    expect(result.message).not.toContain("احمق");
  });

  it("does not show the pre-block warning before the user is near the threshold or while blocked", () => {
    expect(getForumModerationWarning(0).showWarning).toBe(false);
    expect(getForumModerationWarning(FORUM_MODERATION_THRESHOLD, true).showWarning).toBe(false);
    expect(getForumModerationWarning(FORUM_MODERATION_THRESHOLD, true).remainingAttempts).toBe(0);
  });
});
