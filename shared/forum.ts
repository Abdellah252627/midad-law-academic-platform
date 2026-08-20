export const FORUM_SUBJECTS = [
  "القانون الدستوري",
  "قانون الالتزامات والعقود",
  "القانون الإداري",
  "القانون الجنائي",
  "القانون المدني",
  "القانون التجاري",
  "قانون الشغل",
  "العلوم السياسية",
  "العلوم الاقتصادية",
] as const;

export const FORUM_LEVELS = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;

export type ForumSubject = (typeof FORUM_SUBJECTS)[number];
export type ForumLevel = (typeof FORUM_LEVELS)[number];

export const FORUM_SUBJECT_LABELS: Record<ForumSubject, string> = Object.fromEntries(
  FORUM_SUBJECTS.map(subject => [subject, subject]),
) as Record<ForumSubject, string>;

export const FORUM_LEVEL_LABELS: Record<ForumLevel, string> = Object.fromEntries(
  FORUM_LEVELS.map(level => [level, level]),
) as Record<ForumLevel, string>;

/** قيم المستوى القديمة تبقى مفهومة عند قراءة الموضوعات المنشورة سابقاً. */
export const LEGACY_FORUM_LEVEL_ALIASES: Record<ForumLevel, string> = {
  S1: "السداسي الأول",
  S2: "السداسي الثاني",
  S3: "السداسي الثالث",
  S4: "السداسي الرابع",
  S5: "السداسي الخامس",
  S6: "السداسي السادس",
};

const FORUM_LEVEL_BY_LEGACY_VALUE = Object.fromEntries(
  Object.entries(LEGACY_FORUM_LEVEL_ALIASES).map(([level, legacy]) => [legacy, level]),
) as Record<string, ForumLevel>;

export function getForumLevelLabel(level: string | null | undefined) {
  if (!level) return "غير محدد";
  return FORUM_LEVELS.includes(level as ForumLevel) ? level : FORUM_LEVEL_BY_LEGACY_VALUE[level] ?? level;
}

export function getForumLevelFilter(level: ForumLevel) {
  return [level, LEGACY_FORUM_LEVEL_ALIASES[level]];
}
