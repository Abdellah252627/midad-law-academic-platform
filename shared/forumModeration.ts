export const INITIAL_FORUM_BLOCKED_WORDS = [
  "أحمق",
  "احمق",
  "غبي",
  "تافه",
  "حقير",
  "سافل",
  "قذر",
  "كلب",
  "حمار",
  "يا حيوان",
  "تباً لك",
  "اللعنة عليك",
] as const;

export const normalizeForumText = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("ar-MA")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

export const findBlockedForumTerm = (text: string, terms: readonly string[]) => {
  const normalizedText = normalizeForumText(text);
  return terms.find(term => {
    const normalizedTerm = normalizeForumText(term);
    if (!normalizedTerm) return false;
    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu").test(normalizedText);
  });
};

export const FORUM_BLOCKED_WORD_WARNING =
  "تم رصد لفظ قد يخالف قواعد المنتدى. يرجى تعديل النص، وسيخضع كل محتوى للمراجعة قبل نشره.";

export type SensitiveForumDataCategory = "phone" | "email" | "social_media";

export type SensitiveForumDataMatch = {
  category: SensitiveForumDataCategory;
  label: string;
};

const CONTACT_DATA_PATTERNS: Array<{ category: SensitiveForumDataCategory; label: string; pattern: RegExp }> = [
  { category: "email", label: "بريد إلكتروني", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { category: "phone", label: "رقم هاتف", pattern: /(^|\D)(?:\+?212|0)[\s().-]*(?:[5-7])(?:[\s().-]*\d){8}(?!\d)/ },
  { category: "phone", label: "رقم هاتف", pattern: /(^|\D)\+?[1-9](?:[\s().-]*\d){8,14}(?!\d)/ },
  { category: "social_media", label: "حساب أو رابط تواصل اجتماعي", pattern: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.me|instagram\.com|t\.me|telegram\.me|twitter\.com|x\.com|snapchat\.com|linkedin\.com|wa\.me|youtube\.com)\/[A-Z0-9._%+\-/]+/i },
  { category: "social_media", label: "معرّف تواصل اجتماعي", pattern: /(?:واتساب|whatsapp|انستغرام|instagram|فيسبوك|facebook|تلغرام|telegram|تيليغرام|tiktok|تيك\s*توك|snapchat|سناب)\s*(?:[:：@]|حساب|معرف|id)?\s*[A-Z0-9._-]{3,}/i },
];

export function findSensitiveForumData(text: string): SensitiveForumDataMatch | null {
  for (const detector of CONTACT_DATA_PATTERNS) {
    if (detector.pattern.test(text)) return { category: detector.category, label: detector.label };
    detector.pattern.lastIndex = 0;
  }
  return null;
}

export function redactSensitiveForumData(text: string) {
  let redacted = text;
  for (const detector of CONTACT_DATA_PATTERNS) {
    redacted = redacted.replace(detector.pattern, `[${detector.label} محجوب]`);
    detector.pattern.lastIndex = 0;
  }
  return redacted.slice(0, 220);
}

export const FORUM_SENSITIVE_DATA_WARNING =
  "حرصاً على خصوصيتك وخصوصية الطلبة، يمنع نشر أرقام الهاتف أو البريد الإلكتروني أو حسابات التواصل الاجتماعي داخل المنتدى. عدّل النص قبل الإرسال.";
