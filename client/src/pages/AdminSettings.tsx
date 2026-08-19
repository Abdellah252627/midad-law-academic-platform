import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { DEFAULT_PRODUCT_CODE } from "@shared/const";
import { Loader2, Save, Settings2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const fields = [
  { key: "whatsappNumber", label: "رقم واتساب", placeholder: "0664173090", description: "يُستخدم للتواصل من زر واتساب في الصفحة العامة." },
  { key: "bankBeneficiary", label: "اسم المستفيد البنكي", placeholder: "الاسم الكامل للمستفيد", description: "يظهر للطالب ضمن تعليمات التحويل البنكي." },
  { key: "bankRib", label: "RIB", placeholder: "24 رقماً", description: "بيانات التحويل التي يراجعها الطالب قبل إرسال إثبات الدفع." },
  { key: "bankTransferReviewDuration", label: "مدة مراجعة التحويل البنكي بالساعات", placeholder: "24", description: "المدة المتوقعة التي تظهر للطالب في سؤال الدفع داخل الأسئلة الشائعة، من 1 إلى 168 ساعة." },
  { key: "defaultPriceMad", label: "السعر الافتراضي بالدرهم", placeholder: "19", description: "قيمة احتياطية عند عدم وجود سعر منشور للمنتج." },
  { key: "quizPassingPercentage", label: "نسبة النجاح في اختبار «اختبر فهمك»", placeholder: "60", description: "نسبة مئوية من 0 إلى 100. القيمة الافتراضية 60%." },
] as const;

type SettingKey = (typeof fields)[number]["key"];

const numericSettingKeys = new Set<SettingKey>(["defaultPriceMad", "bankTransferReviewDuration", "quizPassingPercentage"]);

function AdminSettingsContent() {
  const query = trpc.admin.settings.useQuery({ productCode: DEFAULT_PRODUCT_CODE });
  const utils = trpc.useUtils();
  const save = trpc.admin.saveSetting.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      void utils.admin.settings.invalidate({ productCode: DEFAULT_PRODUCT_CODE });
      void utils.landing.published.invalidate({ productCode: DEFAULT_PRODUCT_CODE });
    },
    onError: error => toast.error(error.message || "تعذر حفظ الإعداد"),
  });
  const [values, setValues] = useState<Record<SettingKey, string>>({ whatsappNumber: "", bankBeneficiary: "", bankRib: "", bankTransferReviewDuration: "24", defaultPriceMad: "19", quizPassingPercentage: "60" });

  useEffect(() => {
    if (!query.data) return;
    const next = { ...values };
    for (const row of query.data) {
      if (row.settingKey in next) next[row.settingKey as SettingKey] = row.settingValue;
    }
    setValues(next);
  }, [query.data]);

  const changed = useMemo(() => fields.some(field => values[field.key].trim().length > 0), [values]);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    for (const field of fields) {
      const value = values[field.key].trim();
      if (!value) {
        toast.error(`أدخل قيمة: ${field.label}`);
        return;
      }
      if (numericSettingKeys.has(field.key)) {
        const number = Number(value);
        const isReviewDuration = field.key === "bankTransferReviewDuration";
        const max = isReviewDuration ? 168 : 100;
        const min = isReviewDuration ? 1 : 0;
        if (!Number.isInteger(number) || number < min || number > max || (field.key === "defaultPriceMad" && number === 0)) {
          toast.error(field.key === "quizPassingPercentage" ? "أدخل نسبة صحيحة بين 0 و100" : isReviewDuration ? "أدخل مدة صحيحة بين ساعة واحدة و168 ساعة" : "أدخل سعراً صحيحاً");
          return;
        }
      }
      save.mutate({ productCode: DEFAULT_PRODUCT_CODE, settingKey: field.key, settingValue: value, description: field.description });
    }
  };

  return <div dir="rtl" className="mx-auto max-w-4xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / SETTINGS</p>
      <h1 className="mt-2 font-display text-3xl font-bold">الإعدادات العامة</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">غيّر بيانات التواصل والتحويل والسعر من قاعدة البيانات بدلاً من تعديل الكود. لا تُعرض هذه القيم إلا ضمن السياقات العامة المقصودة.</p>
    </header>
    {query.isLoading ? <div className="rounded-2xl bg-white p-10 text-center text-[#68747a]"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : <form onSubmit={handleSubmit} className="space-y-5 rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3 border-b border-[#eee7dc] pb-5"><Settings2 className="h-5 w-5 text-[#b9854a]" /><div><h2 className="font-display text-xl font-bold text-[#173247]">قيم التشغيل</h2><p className="mt-1 text-xs text-[#68747a]">كل تغيير يُسجّل في سجل التدقيق.</p></div></div>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(field => <label key={field.key} className="space-y-2 text-sm font-bold text-[#173247]">{field.label}<input required value={values[field.key]} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} inputMode={numericSettingKeys.has(field.key) ? "numeric" : undefined} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#b9854a]" /><span className="block text-xs font-normal leading-6 text-[#68747a]">{field.description}</span></label>)}
      </div>
      <button type="submit" disabled={save.isPending || !changed} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#173247] px-5 py-3 font-bold text-white transition hover:bg-[#24485f] disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{save.isPending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}</button>
    </form>}
  </div>;
}

export default function AdminSettings() { return <DashboardLayout><AdminSettingsContent /></DashboardLayout>; }
