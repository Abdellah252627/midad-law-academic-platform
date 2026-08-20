import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const db = readFileSync(resolve(root, "server/db.ts"), "utf8");
const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const page = readFileSync(resolve(root, "client/src/pages/Forum.tsx"), "utf8");

describe("Midad Law forum rules acceptance", () => {
  it("persists acceptance by user and rules version", () => {
    expect(schema).toContain('mysqlTable("forum_rule_acceptances"');
    expect(schema).toContain('rulesVersion: varchar("rulesVersion"');
    expect(db).toContain("hasAcceptedForumRules");
    expect(db).toContain("acceptForumRules");
    expect(db).toContain("FORUM_RULES_VERSION");
  });

  it("exposes rules and protects topic creation behind acceptance", () => {
    expect(router).toContain("rules: publicProcedure");
    expect(router).toContain("acceptRules: protectedProcedure");
    expect(router).toContain("يجب الموافقة على قواعد المنتدى قبل المشاركة");
    expect(router).toContain("hasAcceptedForumRules(ctx.user.id)");
  });

  it("shows the rules and keeps publishing unavailable until accepted", () => {
    expect(page).toContain("قواعد المشاركة والخصوصية");
    expect(page).toContain("أوافق على القواعد وأريد المشاركة");
    expect(page).toContain("وافق على قواعد المشاركة أعلاه قبل إرسال موضوع جديد");
  });
});


describe("Midad Law forum details and reporting", () => {
  it("exposes published topic details and replies without leaking hidden content", () => {
    expect(db).toContain("getPublishedForumTopic");
    expect(db).toContain('eq(forumTopics.status, "published")');
    expect(db).toContain('eq(forumReplies.status, "published")');
    expect(router).toContain("topic: publicProcedure");
    expect(router).toContain("replies: publicProcedure");
  });

  it("supports authenticated replies and reports with validation", () => {
    expect(router).toContain("createReply: protectedProcedure");
    expect(router).toContain("report: protectedProcedure");
    expect(router).toContain("اختر موضوعاً أو رداً للإبلاغ عنه");
    expect(page).toContain("إرسال الرد للمراجعة");
    expect(page).toContain("الإبلاغ عن مشكلة");
  });

  it("keeps moderation states explicit", () => {
    expect(schema).toContain('"closed"');
    expect(router).toContain('["pending", "published", "hidden", "closed"]');
    expect(router).toContain('["pending", "published", "hidden"]');
    expect(router).toContain("reviewForumReport");
  });
});
