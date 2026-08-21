import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DEFAULT_PRODUCT_CODE } from "@shared/const";
import { Bell, Loader2, Save, Settings2, TestTube2, Trash2, Palette } from "lucide-react";
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

const forumAlertDefaults = {
  forumOpenAlertMessage: "فُتحت المشاركة الآن. يمكنك إنشاء موضوع أو إرسال رد.",
  forumClosedAlertMessage: "أُغلقت المشاركة الآن. يمكنك متابعة القراءة، وتعود المشاركة عند الساعة 08:00.",
  forumOpenAlertColor: "#047857",
  forumClosedAlertColor: "#b45309",
  forumOpenAlertIcon: "check",
  forumClosedAlertIcon: "lock",
  forumOpenAlertDurationSeconds: "8",
  forumClosedAlertDurationSeconds: "8",
} as const;

const notificationFields = [
  { key: "notificationPurchaseRequestEnabled", label: "طلبات الشراء", description: "تنبيه عند وصول طلب شراء جديد يحتاج إلى مراجعة." },
  { key: "notificationSupportFollowUpEnabled", label: "طلبات التواصل", description: "تنبيه عند إرسال زائر رسالة أو رقم هاتف للمتابعة." },
  { key: "notificationComplaintEnabled", label: "الشكاوى", description: "تنبيه عند تسجيل شكوى جديدة من طالب." },
  { key: "notificationSystemEnabled", label: "إشعارات النظام", description: "إشعارات داخلية مستقبلية خاصة بالنظام." },
  { key: "notificationAuthLoginAttemptEnabled", label: "محاولات تسجيل الدخول", description: "تنبيه عند نجاح تسجيل الدخول عبر OAuth، مع اسم المستخدم والبريد ووقت المحاولة دون تخزين رموز الجلسة." },
] as const;

type SettingKey = (typeof fields)[number]["key"];
type NotificationSettingKey = (typeof notificationFields)[number]["key"];
type ForumAlertSettingKey = keyof typeof forumAlertDefaults;

const numericSettingKeys = new Set<SettingKey>(["defaultPriceMad", "bankTransferReviewDuration", "quizPassingPercentage"]);

function AdminSettingsContent() {
  const query = trpc.admin.settings.useQuery({ productCode: DEFAULT_PRODUCT_CODE });
  const utils = trpc.useUtils();
  const testNotification = trpc.admin.testNotification.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      void utils.admin.notifications.invalidate();
      void utils.admin.notificationUnreadCount.invalidate();
    },
    onError: error => toast.error(error.message || "تعذر إنشاء التنبيه التجريبي"),
  });
  const deleteDemoNotifications = trpc.admin.deleteDemoNotifications.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setDeleteDemoOpen(false);
      void utils.admin.notifications.invalidate();
      void utils.admin.notificationUnreadCount.invalidate();
    },
    onError: error => toast.error(error.message || "تعذر حذف التنبيه التجريبي"),
  });
  const [deleteDemoOpen, setDeleteDemoOpen] = useState(false);
  const save = trpc.admin.saveSetting.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      void utils.admin.settings.invalidate({ productCode: DEFAULT_PRODUCT_CODE });
      void utils.landing.published.invalidate({ productCode: DEFAULT_PRODUCT_CODE });
    },
    onError: error => toast.error(error.message || "تعذر حفظ الإعداد"),
  });
  const [values, setValues] = useState<Record<SettingKey, string>>({ whatsappNumber: "", bankBeneficiary: "", bankRib: "", bankTransferReviewDuration: "24", defaultPriceMad: "19", quizPassingPercentage: "60" });
  const [notificationValues, setNotificationValues] = useState<Record<NotificationSettingKey, boolean>>({ notificationPurchaseRequestEnabled: true, notificationSupportFollowUpEnabled: true, notificationComplaintEnabled: true, notificationSystemEnabled: true, notificationAuthLoginAttemptEnabled: true });
  const [forumAlertValues, setForumAlertValues] = useState<Record<ForumAlertSettingKey, string>>(forumAlertDefaults);
  const [livePreview, setLivePreview] = useState<"open" | "closed" | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (!query.data) return;
    const next = { ...values };
    for (const row of query.data) {
      if (row.settingKey in next) next[row.settingKey as SettingKey] = row.settingValue;
      if (row.settingKey in notificationValues) setNotificationValues(current => ({ ...current, [row.settingKey as NotificationSettingKey]: row.settingValue !== "false" }));
      if (row.settingKey in forumAlertDefaults) setForumAlertValues(current => ({ ...current, [row.settingKey as ForumAlertSettingKey]: row.settingValue }));
    }
    setValues(next);
  }, [query.data]);

  useEffect(() => {
    if (!livePreview) return;
    const durationKey = livePreview === "open" ? "forumOpenAlertDurationSeconds" : "forumClosedAlertDurationSeconds";
    const duration = Number(forumAlertValues[durationKey]);
    const timer = window.setTimeout(() => setLivePreview(null), Math.max(1000, (Number.isFinite(duration) ? duration : 8) * 1000));
    return () => window.clearTimeout(timer);
  }, [livePreview, previewKey, forumAlertValues]);

  const triggerLivePreview = (type: "open" | "closed") => {
    setLivePreview(type);
    setPreviewKey(current => current + 1);
  };

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
    for (const field of notificationFields) {
      save.mutate({ productCode: DEFAULT_PRODUCT_CODE, settingKey: field.key, settingValue: notificationValues[field.key] ? "true" : "false", description: field.description });
    }
    for (const [key, value] of Object.entries(forumAlertValues) as [ForumAlertSettingKey, string][]) {
      const trimmed = value.trim();
      if (key.endsWith("Message") && (trimmed.length < 10 || trimmed.length > 240)) {
        toast.error("يجب أن يتراوح نص تنبيه المنتدى بين 10 و240 حرفاً");
        return;
      }
      if (key.endsWith("Color") && !/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
        toast.error("أدخل لوناً بصيغة HEX مثل #173247");
        return;
      }
      if (key.endsWith("Icon") && !["check", "lock", "info", "clock", "megaphone"].includes(trimmed)) {
        toast.error("اختر أيقونة مدعومة للتنبيه");
        return;
      }
      if (key.endsWith("DurationSeconds")) {
        const duration = Number(trimmed);
        if (!Number.isInteger(duration) || duration < 1 || duration > 60) {
          toast.error("يجب أن تكون مدة التنبيه بين ثانية واحدة و60 ثانية");
          return;
        }
      }
      save.mutate({ productCode: DEFAULT_PRODUCT_CODE, settingKey: key, settingValue: trimmed, description: key.includes("Open") ? "تخصيص تنبيه فتح المشاركة في المنتدى" : "تخصيص تنبيه إغلاق المشاركة في المنتدى" });
    }
  };

  return <div dir="rtl" className="mx-auto max-w-4xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / SETTINGS</p>
      <h1 className="mt-2 font-display text-3xl font-bold">الإعدادات العامة</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">غيّر بيانات التواصل والتحويل والسعر من قاعدة البيانات بدلاً من تعديل الكود. لا تُعرض هذه القيم إلا ضمن السياقات العامة المقصودة.</p>
    </header>
    <section className="rounded-[26px] border border-[#e3d9ca] bg-[#fffaf1] p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><TestTube2 className="mt-1 h-5 w-5 text-[#b9854a]" /><div><h2 className="font-display text-xl font-bold text-[#173247]">اختبار تجريبي للإشعارات</h2><p className="mt-1 max-w-2xl text-xs leading-6 text-[#68747a]">ينشئ تنبيهاً نظامياً تجريبياً واحداً للتأكد من عمل الجرس والقائمة. لا ينشئ طلباً أو شكوى ولا يدخل في عدادات التسعير أو المبيعات.</p></div></div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => testNotification.mutate()} disabled={testNotification.isPending || deleteDemoNotifications.isPending} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#b9854a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#9d6d3c] disabled:cursor-not-allowed disabled:opacity-60"><TestTube2 className="h-4 w-4" />{testNotification.isPending ? "جارٍ الاختبار…" : "إنشاء تنبيه تجريبي"}</button>
          <button type="button" onClick={() => setDeleteDemoOpen(true)} disabled={testNotification.isPending || deleteDemoNotifications.isPending} className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"><Trash2 className="h-4 w-4" />تنظيف الاختبار</button>
        </div>
      </div>
    </section>
    <AlertDialog open={deleteDemoOpen} onOpenChange={setDeleteDemoOpen}><AlertDialogContent dir="rtl" className="border-[#e3d9ca] bg-[#fffdf9] text-right"><AlertDialogHeader><AlertDialogTitle className="font-display text-xl text-[#173247]">تأكيد تنظيف التنبيه التجريبي</AlertDialogTitle><AlertDialogDescription className="leading-7 text-[#68747a]">سيتم حذف التنبيه الموسوم كاختبار تجريبي فقط. لن تتأثر أي تنبيهات حقيقية أو طلبات شراء أو طلبات تواصل أو شكاوى.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleteDemoNotifications.isPending} className="border-[#e3d9ca]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={deleteDemoNotifications.isPending} onClick={event => { event.preventDefault(); deleteDemoNotifications.mutate(); }} className="bg-red-700 hover:bg-red-800">{deleteDemoNotifications.isPending ? "جارٍ التنظيف…" : "نعم، حذف الاختبار"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {query.isLoading ? <div className="rounded-2xl bg-white p-10 text-center text-[#68747a]"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : <form onSubmit={handleSubmit} className="space-y-5 rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3 border-b border-[#eee7dc] pb-5"><Settings2 className="h-5 w-5 text-[#b9854a]" /><div><h2 className="font-display text-xl font-bold text-[#173247]">قيم التشغيل</h2><p className="mt-1 text-xs text-[#68747a]">كل تغيير يُسجّل في سجل التدقيق.</p></div></div>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(field => <label key={field.key} className="space-y-2 text-sm font-bold text-[#173247]">{field.label}<input required value={values[field.key]} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} inputMode={numericSettingKeys.has(field.key) ? "numeric" : undefined} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#b9854a]" /><span className="block text-xs font-normal leading-6 text-[#68747a]">{field.description}</span></label>)}
      </div>
      <section className="space-y-4 rounded-2xl border border-[#eee7dc] bg-[#fffdf9] p-5">
        <div className="flex items-start gap-3"><Palette className="mt-1 h-5 w-5 text-[#b9854a]" /><div><h2 className="font-display text-xl font-bold text-[#173247]">تنبيهات حالة المنتدى</h2><p className="mt-1 text-xs leading-6 text-[#68747a]">خصّص النص واللون اللذين يظهران للطلاب عند فتح أو إغلاق المشاركة. لا تؤثر هذه الإعدادات في سياسة الساعات نفسها.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-bold text-[#173247]">نص تنبيه فتح المشاركة<textarea value={forumAlertValues.forumOpenAlertMessage} onChange={event => setForumAlertValues(current => ({ ...current, forumOpenAlertMessage: event.target.value }))} maxLength={240} className="mt-2 min-h-24 w-full rounded-xl border border-[#e3d9ca] bg-white px-4 py-3 font-normal outline-none focus:border-[#b9854a]" /><span className="block text-xs font-normal text-[#68747a]">يظهر عند انتقال المنتدى إلى الحالة المفتوحة.</span></label>
          <label className="space-y-2 text-sm font-bold text-[#173247]">لون تنبيه فتح المشاركة<div className="mt-2 flex gap-2"><input type="color" value={forumAlertValues.forumOpenAlertColor} onChange={event => setForumAlertValues(current => ({ ...current, forumOpenAlertColor: event.target.value }))} className="h-12 w-16 cursor-pointer rounded-lg border border-[#e3d9ca] bg-white p-1" /><input value={forumAlertValues.forumOpenAlertColor} onChange={event => setForumAlertValues(current => ({ ...current, forumOpenAlertColor: event.target.value }))} maxLength={7} className="w-full rounded-xl border border-[#e3d9ca] bg-white px-4 py-3 font-mono font-normal uppercase outline-none focus:border-[#b9854a]" /></div><span className="block text-xs font-normal text-[#68747a]">استخدم قيمة HEX من ست خانات.</span></label>
          <label className="space-y-2 text-sm font-bold text-[#173247]">نص تنبيه إغلاق المشاركة<textarea value={forumAlertValues.forumClosedAlertMessage} onChange={event => setForumAlertValues(current => ({ ...current, forumClosedAlertMessage: event.target.value }))} maxLength={240} className="mt-2 min-h-24 w-full rounded-xl border border-[#e3d9ca] bg-white px-4 py-3 font-normal outline-none focus:border-[#b9854a]" /><span className="block text-xs font-normal text-[#68747a]">يظهر عند انتقال المنتدى إلى الحالة المغلقة.</span></label>
          <label className="space-y-2 text-sm font-bold text-[#173247]">لون تنبيه إغلاق المشاركة<div className="mt-2 flex gap-2"><input type="color" value={forumAlertValues.forumClosedAlertColor} onChange={event => setForumAlertValues(current => ({ ...current, forumClosedAlertColor: event.target.value }))} className="h-12 w-16 cursor-pointer rounded-lg border border-[#e3d9ca] bg-white p-1" /><input value={forumAlertValues.forumClosedAlertColor} onChange={event => setForumAlertValues(current => ({ ...current, forumClosedAlertColor: event.target.value }))} maxLength={7} className="w-full rounded-xl border border-[#e3d9ca] bg-white px-4 py-3 font-mono font-normal uppercase outline-none focus:border-[#b9854a]" /></div><span className="block text-xs font-normal text-[#68747a]">استخدم قيمة HEX من ست خانات.</span></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-3"><label className="block text-sm font-bold text-[#173247]">أيقونة تنبيه الفتح<select value={forumAlertValues.forumOpenAlertIcon} onChange={event => setForumAlertValues(current => ({ ...current, forumOpenAlertIcon: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-[#e3d9ca] bg-white px-3 font-normal"><option value="check">علامة تحقق</option><option value="megaphone">مكبر صوت</option><option value="info">معلومات</option><option value="clock">ساعة</option><option value="lock">قفل</option></select></label><label className="block text-sm font-bold text-[#173247]">مدة ظهور تنبيه الفتح (ثانية)<input type="number" min="1" max="60" value={forumAlertValues.forumOpenAlertDurationSeconds} onChange={event => setForumAlertValues(current => ({ ...current, forumOpenAlertDurationSeconds: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-white px-4 py-3 font-normal" /></label></div><div className="space-y-3"><label className="block text-sm font-bold text-[#173247]">أيقونة تنبيه الإغلاق<select value={forumAlertValues.forumClosedAlertIcon} onChange={event => setForumAlertValues(current => ({ ...current, forumClosedAlertIcon: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-[#e3d9ca] bg-white px-3 font-normal"><option value="lock">قفل</option><option value="megaphone">مكبر صوت</option><option value="info">معلومات</option><option value="clock">ساعة</option><option value="check">علامة تحقق</option></select></label><label className="block text-sm font-bold text-[#173247]">مدة ظهور تنبيه الإغلاق (ثانية)<input type="number" min="1" max="60" value={forumAlertValues.forumClosedAlertDurationSeconds} onChange={event => setForumAlertValues(current => ({ ...current, forumClosedAlertDurationSeconds: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-white px-4 py-3 font-normal" /></label></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-4 text-sm font-bold" style={{ borderColor: forumAlertValues.forumOpenAlertColor, color: forumAlertValues.forumOpenAlertColor, backgroundColor: `${forumAlertValues.forumOpenAlertColor}14` }}>معاينة الفتح: {forumAlertValues.forumOpenAlertIcon === "check" ? "✓" : forumAlertValues.forumOpenAlertIcon === "lock" ? "🔒" : forumAlertValues.forumOpenAlertIcon === "clock" ? "◷" : forumAlertValues.forumOpenAlertIcon === "megaphone" ? "📣" : "ⓘ"} {forumAlertValues.forumOpenAlertMessage}<span className="block mt-1 text-xs font-normal">يظهر {forumAlertValues.forumOpenAlertDurationSeconds} ثوانٍ</span></div><div className="rounded-xl border p-4 text-sm font-bold" style={{ borderColor: forumAlertValues.forumClosedAlertColor, color: forumAlertValues.forumClosedAlertColor, backgroundColor: `${forumAlertValues.forumClosedAlertColor}14` }}>معاينة الإغلاق: {forumAlertValues.forumClosedAlertIcon === "check" ? "✓" : forumAlertValues.forumClosedAlertIcon === "lock" ? "🔒" : forumAlertValues.forumClosedAlertIcon === "clock" ? "◷" : forumAlertValues.forumClosedAlertIcon === "megaphone" ? "📣" : "ⓘ"} {forumAlertValues.forumClosedAlertMessage}<span className="block mt-1 text-xs font-normal">يظهر {forumAlertValues.forumClosedAlertDurationSeconds} ثوانٍ</span></div></div>
        <div className="rounded-xl border border-[#d9c7ae] bg-[#fffaf1] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-sm font-bold text-[#173247]">معاينة حية للحركة</h3><p className="mt-1 text-xs leading-6 text-[#68747a]">شغّل التنبيه بالحركة الفعلية قبل الحفظ للتأكد من شكله النهائي. المعاينة لا تغيّر الإعدادات المحفوظة.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => triggerLivePreview("open")} className="rounded-full border border-[#b9854a] px-4 py-2 text-xs font-bold text-[#8b6137] transition hover:bg-[#f3e6d3]">معاينة حركة الفتح</button>
              <button type="button" onClick={() => triggerLivePreview("closed")} className="rounded-full border border-[#173247] px-4 py-2 text-xs font-bold text-[#173247] transition hover:bg-[#eaf0f3]">معاينة حركة الإغلاق</button>
            </div>
          </div>
          {livePreview && <div key={previewKey} role="alert" aria-live="polite" className="forum-status-transition mt-4 rounded-xl border p-4 text-sm font-bold" style={{ borderColor: livePreview === "open" ? forumAlertValues.forumOpenAlertColor : forumAlertValues.forumClosedAlertColor, color: livePreview === "open" ? forumAlertValues.forumOpenAlertColor : forumAlertValues.forumClosedAlertColor, backgroundColor: `${livePreview === "open" ? forumAlertValues.forumOpenAlertColor : forumAlertValues.forumClosedAlertColor}14` }}>
            {livePreview === "open" ? (forumAlertValues.forumOpenAlertIcon === "check" ? "✓" : forumAlertValues.forumOpenAlertIcon === "lock" ? "🔒" : forumAlertValues.forumOpenAlertIcon === "clock" ? "◷" : forumAlertValues.forumOpenAlertIcon === "megaphone" ? "📣" : "ⓘ") : (forumAlertValues.forumClosedAlertIcon === "check" ? "✓" : forumAlertValues.forumClosedAlertIcon === "lock" ? "🔒" : forumAlertValues.forumClosedAlertIcon === "clock" ? "◷" : forumAlertValues.forumClosedAlertIcon === "megaphone" ? "📣" : "ⓘ")} {livePreview === "open" ? forumAlertValues.forumOpenAlertMessage : forumAlertValues.forumClosedAlertMessage}
            <span className="mt-1 block text-xs font-normal">معاينة فقط · يختفي بعد {livePreview === "open" ? forumAlertValues.forumOpenAlertDurationSeconds : forumAlertValues.forumClosedAlertDurationSeconds} ثوانٍ</span>
          </div>}
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border border-[#eee7dc] bg-[#fffdf9] p-5">
        <div className="flex items-start gap-3"><Bell className="mt-1 h-5 w-5 text-[#b9854a]" /><div><h2 className="font-display text-xl font-bold text-[#173247]">تفضيلات التنبيهات الإدارية</h2><p className="mt-1 text-xs leading-6 text-[#68747a]">عطّل نوعاً محدداً من التنبيهات دون التأثير في الطلبات أو الشكاوى نفسها. التفضيلات إدارية ولا يمكن تعديلها من الواجهة العامة.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2">{notificationFields.map(field => <label key={field.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e3d9ca] bg-white p-4"><input type="checkbox" checked={notificationValues[field.key]} onChange={event => setNotificationValues(current => ({ ...current, [field.key]: event.target.checked }))} className="mt-1 h-4 w-4 accent-[#173247]" /><span><span className="block text-sm font-bold text-[#173247]">{field.label}</span><span className="mt-1 block text-xs leading-6 text-[#68747a]">{field.description}</span></span></label>)}</div>
      </section>
      <button type="submit" disabled={save.isPending || !changed} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#173247] px-5 py-3 font-bold text-white transition hover:bg-[#24485f] disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{save.isPending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}</button>
    </form>}
  </div>;
}

export default function AdminSettings() { return <DashboardLayout><AdminSettingsContent /></DashboardLayout>; }
