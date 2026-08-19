import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("upcoming chapters landing section", () => {
  it("lists the nine upcoming chapters as non-interactive coming-soon cards", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const titles = [
      "قانون الالتزامات والعقود",
      "القانون الدستوري",
      "التنظيم الإداري",
      "القانون الجنائي العام",
      "المدخل إلى العلوم السياسية",
      "المدخل إلى علم الاقتصاد",
      "القانون المدني",
      "القانون التجاري",
      "قانون الشغل",
    ];

    expect(home).toContain('id="upcoming-chapters"');
    expect(home).toContain("يحصل المشتركون الحاليون على هذه الفصول تلقائياً عند إصدارها، دون أي تكلفة إضافية");
    expect(home).toContain('aria-disabled="true"');
    expect(home).toContain("قريباً");
    expect(home).toContain("upcomingChapters.map");
    for (const title of titles) expect(home).toContain(title);
  });

  it("provides an admin editor backed by the upcomingChapters setting", () => {
    const admin = readFileSync(resolve(process.cwd(), "client/src/pages/AdminDashboard.tsx"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(admin).toContain('"upcoming", FileText, "الفصول القادمة"');
    expect(admin).toContain('settingKey: "upcomingChapters"');
    expect(admin).toContain("كل سطر يمثل فصلاً واحداً");
    expect(router).toContain('"upcomingChapters"');
  });
});
