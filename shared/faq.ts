export const FAQ_CATEGORIES = ["purchase", "payment", "content", "support"] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  purchase: "الشراء",
  payment: "الدفع",
  content: "المحتوى",
  support: "الدعم",
};

export const FAQ_CATEGORY_DESCRIPTIONS: Record<FaqCategory, string> = {
  purchase: "الطلب والسعر والمزايا",
  payment: "التحويل البنكي ومراجعة الأداء",
  content: "طبيعة الملخص والتحديثات التعليمية",
  support: "المساعدة والشكاوى والتواصل",
};
