import { describe, expect, it } from "vitest";
import { FORUM_BLOCKED_WORD_WARNING, findBlockedForumTerm, normalizeForumText } from "../shared/forumModeration";

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
});
