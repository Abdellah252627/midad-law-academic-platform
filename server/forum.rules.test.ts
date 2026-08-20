import { describe, expect, it } from "vitest";
import { getForumCountdown } from "@shared/forumModerationPolicy";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isForumOpenAt } from "../shared/forumModerationPolicy";

const root = resolve(import.meta.dirname, "..");
const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const db = readFileSync(resolve(root, "server/db.ts"), "utf8");
const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const page = readFileSync(resolve(root, "client/src/pages/Forum.tsx"), "utf8");

describe("Midad Law forum participation hours", () => {
  it("calculates the next opening and closing countdown in Morocco time", () => {
    const beforeOpening = getForumCountdown(new Date("2026-08-21T06:30:00.000Z"));
    expect(beforeOpening.isOpen).toBe(false);
    expect(beforeOpening.remainingMs).toBe(30 * 60 * 1000);

    const duringParticipation = getForumCountdown(new Date("2026-08-21T10:15:00.000Z"));
    expect(duringParticipation.isOpen).toBe(true);
    expect(duringParticipation.remainingMs).toBe(8 * 60 * 60 * 1000 + 45 * 60 * 1000);
  });

  it("opens at 08:00 and closes at 20:00 in Morocco time", () => {
    expect(isForumOpenAt(new Date("2026-08-21T07:00:00.000Z"))).toBe(true);
    expect(isForumOpenAt(new Date("2026-08-21T19:00:00.000Z"))).toBe(false);
  });

  it("keeps the server and interface aligned with the hours policy", () => {
    expect(router).toContain("isForumOpenAt()");
    expect(router).toContain("FORUM_CLOSED_MESSAGE");
    expect(page).toContain("المشاركة متاحة الآن من 08:00 إلى 20:00 بتوقيت المغرب");
    expect(page).toContain("FORUM_CLOSED_MESSAGE");
    expect(page).toContain("statusTransition");
    expect(page).toContain('role="alert"');
    expect(page).toContain("forum-status-transition");
  });
});

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
