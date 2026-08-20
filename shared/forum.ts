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

export const FORUM_LEVELS = [
  "السداسي الأول",
  "السداسي الثاني",
  "السداسي الثالث",
  "السداسي الرابع",
  "السداسي الخامس",
  "السداسي السادس",
  "دراسات عليا",
] as const;

export type ForumSubject = (typeof FORUM_SUBJECTS)[number];
export type ForumLevel = (typeof FORUM_LEVELS)[number];

export const FORUM_SUBJECT_LABELS: Record<ForumSubject, string> = Object.fromEntries(
  FORUM_SUBJECTS.map(subject => [subject, subject]),
) as Record<ForumSubject, string>;

export const FORUM_LEVEL_LABELS: Record<ForumLevel, string> = Object.fromEntries(
  FORUM_LEVELS.map(level => [level, level]),
) as Record<ForumLevel, string>;
