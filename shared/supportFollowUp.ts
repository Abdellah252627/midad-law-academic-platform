import { z } from "zod";

export const supportFollowUpFieldsSchema = z.object({
  phone: z.string().trim().transform(value => value.replace(/[\s()-]/g, "")).refine(value => /^(?:0[5-7]\d{8}|(?:\+?212)[5-7]\d{8})$/.test(value), "رقم الهاتف مطلوب ويجب أن يكون صالحاً"),
  email: z.string().trim().toLowerCase().refine(value => value === "" || z.string().email().safeParse(value).success, "البريد الإلكتروني غير صالح").optional().default(""),
  message: z.string().trim().max(1000, "الرسالة طويلة جداً").optional().default(""),
}).superRefine((value, ctx) => {
  if (value.message && value.message.length < 5) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["message"], message: "الرسالة قصيرة جداً" });
});

export type SupportFollowUpFields = z.infer<typeof supportFollowUpFieldsSchema>;

export function formatSupportFollowUpReference(id: number) {
  return `MIDAD-FU-${String(id).padStart(6, "0")}`;
}
