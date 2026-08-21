import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("Midad Law forum safeguards", () => {
  it("defines moderated forum entities and report statuses", () => {
    const schema = readFileSync(join(root, "drizzle/schema.ts"), "utf8");
    expect(schema).toContain("forumCategories");
    expect(schema).toContain("forumTopics");
    expect(schema).toContain("forumReplies");
    expect(schema).toContain("forumReports");
    expect(schema).toContain("published");
    expect(schema).toContain("dismissed");
  });

  it("requires authentication for publishing attempts and exposes only published reads", () => {
    const router = readFileSync(join(root, "server/routers.ts"), "utf8");
    expect(router).toContain("createTopic: protectedProcedure");
    expect(router).toContain("createReply: protectedProcedure");
    expect(router).toContain("getPublishedForumTopics");
    expect(router).toContain("getPublishedForumReplies");
    expect(router).toContain("moderateTopic: forumModeratorProcedure");
    expect(router).toContain("reviewForumReport: forumModeratorProcedure");
  });

  it("documents privacy and moderation boundaries", () => {
    const policy = readFileSync(join(root, "docs/forum-midad-law-policy.md"), "utf8");
    expect(policy).toContain("moderated-first");
    expect(policy).toContain("لا تمثل المنشورات رأي منصة MIDAD");
    expect(policy).toContain("البيانات الشخصية");
  });
});
