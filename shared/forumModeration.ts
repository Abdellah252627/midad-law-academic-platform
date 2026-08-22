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
