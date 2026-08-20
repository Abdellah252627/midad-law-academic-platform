import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("Midad Law forum categorization", () => {
  it("adds backward-compatible subject and level columns to forum topics", () => {
    const schema = readFileSync(join(root, "drizzle/schema.ts"), "utf8");
    expect(schema).toContain('subject: varchar("subject", { length: 120 })');
    expect(schema).toContain('level: varchar("level", { length: 32 })');
    expect(schema).toContain("Nullable for backward compatibility");
  });

  it("keeps the accepted subjects and academic levels centralized", () => {
    const forumConstants = readFileSync(join(root, "shared/forum.ts"), "utf8");
    expect(forumConstants).toContain("القانون الدستوري");
    expect(forumConstants).toContain("قانون الالتزامات والعقود");
    expect(forumConstants).toContain('FORUM_LEVELS = ["S1", "S2", "S3", "S4", "S5", "S6"]');
    expect(forumConstants).toContain('S1: "السداسي الأول"');
    expect(forumConstants).toContain('S6: "السداسي السادس"');
  });

  it("passes subject and level filters through the public procedure", () => {
    const router = readFileSync(join(root, "server/routers.ts"), "utf8");
    const db = readFileSync(join(root, "server/db.ts"), "utf8");
    expect(router).toContain("subject: FORUM_SUBJECT_SCHEMA.optional()");
    expect(router).toContain("level: FORUM_LEVEL_SCHEMA.optional()");
    expect(db).toContain("eq(forumTopics.subject, filters.subject)");
    expect(db).toContain("getForumLevelFilter(filters.level as ForumLevel)");
    expect(db).toContain("eq(forumTopics.level, value)");
  });

  it("requires both categories when a user creates a new topic", () => {
    const router = readFileSync(join(root, "server/routers.ts"), "utf8");
    expect(router).toContain("subject: FORUM_SUBJECT_SCHEMA, level: FORUM_LEVEL_SCHEMA");
    expect(router).toContain("createForumTopic({ ...input, authorUserId: ctx.user.id })");
  });

  it("retains the published-only boundary for categorized public topics", () => {
    const db = readFileSync(join(root, "server/db.ts"), "utf8");
    expect(db).toContain('const conditions = [eq(forumTopics.status, "published")]');
    expect(db).toContain("where(and(...conditions))");
  });
});
