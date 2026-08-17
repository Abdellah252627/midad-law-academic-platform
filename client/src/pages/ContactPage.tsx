import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const whatsappNumber = "212664173090";
const whatsappMessage = encodeURIComponent(
  "السلام عليكم، أريد التواصل مع منصة مِداد بخصوص استفسار أو شكوى."
);
const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

const topics = [
  "مشكلة في فتح أو تنزيل ملف PDF",
  "لم يظهر الطلب بعد إرسال التحويل",
  "إرسال ملف غير صحيح أو وجود عيب تقني",
  "استفسار عن منتج أو طريقة التحويل البنكي",
];

const faqs = [
  {
    question: "أرسلت التحويل البنكي، متى تتم مراجعة طلبي؟",
    answer:
      "تتم مراجعة التحويل يدوياً بعد التحقق من وصول المبلغ في الحساب البنكي. أرسل رقم الطلب والبريد الإلكتروني المستخدم في الطلب عبر واتساب لتسهيل المتابعة.",
  },
  {
    question: "أرسلت الطلب ولم يظهر رابط تنزيل الملف، ماذا أفعل؟",
    answer:
      "لا يظهر رابط التنزيل قبل اعتماد الطلب من الإدارة. بعد الموافقة، افتح رسالة نجاح الطلب واضغط على زر التحقق من حالة التسليم أو استخدم رابط التقييم والتسليم المرسل لك.",
  },
  {
    question: "ظهر رابط التنزيل لكن الملف لم يفتح، ما الحل؟",
    answer:
      "جرّب تنزيل الملف من متصفح حديث، ثم افتحه باستخدام تطبيق قراءة PDF موثوق. إذا استمرت المشكلة، أرسل رقم الطلب ولقطة شاشة للخطأ عبر واتساب دون مشاركة أي كلمة مرور أو بيانات بنكية سرية.",
  },
  {
    question: "انتهت صلاحية رابط التنزيل، هل أستطيع الحصول على رابط جديد؟",
    answer:
      "نعم، روابط التنزيل مؤقتة لأسباب أمنية. تواصل عبر واتساب مع رقم الطلب والبريد الإلكتروني، وستتم مساعدتك في إصدار رابط جديد للطلب المقبول.",
  },
  {
    question: "كتبت بريداً إلكترونياً أو رقم واتساب بشكل خاطئ بعد إرسال الطلب، ماذا أفعل؟",
    answer:
      "افتح حالة طلبك وأرسل طلب تصحيح البيانات، ثم أدخل البريد أو رقم الواتساب الصحيح. ستراجع الإدارة الطلب قبل تطبيق التعديل. إذا تعذر عليك استخدام النموذج، تواصل عبر واتساب مع ذكر رقم الطلب إلزامياً.",
  },
  {
    question: "ماذا أفعل إذا أرسلت ملفاً أو بيانات تحويل غير صحيحة؟",
    answer:
      "تواصل معنا فوراً عبر واتساب، واذكر رقم الطلب بوضوح. لا ترسل بيانات بنكية سرية أو كلمات مرور، ويمكنك إرسال صورة إثبات التحويل فقط عند الحاجة إلى التحقق.",
  },
  {
    question: "هل يمكنني طلب استرداد المبلغ بعد تنزيل الملف؟",
    answer:
      "المنتج رقمي، لذلك لا يُقبل الاسترداد بعد تسليم الملف أو إتاحته للتنزيل، باستثناء إرسال ملف غير صحيح أو وجود عيب تقني يمنع فتح الملف وعدم القدرة على معالجته.",
  },
];

const categoryLabels = {
  payment: "مشكلة في الدفع أو التحويل",
  proof: "مشكلة في إثبات التحويل",
  review: "تأخر مراجعة الطلب",
  download: "مشكلة في التنزيل أو فتح PDF",
  data: "تصحيح بيانات الطلب",
  other: "مشكلة أو استفسار آخر",
} as const;

const statusLabels: Record<string, string> = {
  new: "جديدة",
  reviewing: "قيد المراجعة",
  needs_information: "تحتاج معلومات إضافية",
  replied: "تم الرد",
  closed: "مغلقة",
};

export default function ContactPage() {
  const [complaintForm, setComplaintForm] = useState({
    fullName: "",
    email: "",
    whatsapp: "",
    requestId: "",
    category: "payment" as keyof typeof categoryLabels,
    description: "",
  });
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [trackingFields, setTrackingFields] = useState({ ticketNumber: "", email: "" });
  const [trackingLookup, setTrackingLookup] = useState({ ticketNumber: "", email: "" });

  const submitComplaint = trpc.complaints.submit.useMutation({
    onSuccess: (result) => {
      setSubmittedTicket(result.ticketNumber);
      setComplaintForm((current) => ({ ...current, description: "" }));
      toast.success("تم استلام الشكوى وإنشاء رقم التذكرة");
    },
    onError: (error) => toast.error(error.message || "تعذر إرسال الشكوى"),
  });

  const trackingQuery = trpc.complaints.track.useQuery(trackingLookup, {
    enabled: Boolean(trackingLookup.ticketNumber && trackingLookup.email),
    retry: false,
  });

  const submitComplaintForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitComplaint.mutate({
      fullName: complaintForm.fullName,
      email: complaintForm.email,
      whatsapp: complaintForm.whatsapp || undefined,
      requestId: complaintForm.requestId ? Number(complaintForm.requestId) : undefined,
      category: complaintForm.category,
      description: complaintForm.description,
    });
  };

  const trackComplaint = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTrackingLookup({
      ticketNumber: trackingFields.ticketNumber.trim().toUpperCase(),
      email: trackingFields.email.trim().toLowerCase(),
    });
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f3eb] text-[#172b3a]">
      <header className="border-b border-[#e3ddd1] bg-[#172b3a] text-[#f7f3eb]">
        <div className="mx-auto flex max-w-[980px] items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#f7f3eb] transition hover:text-[#d5a15f]">
            <ArrowRight size={17} aria-hidden="true" /> العودة إلى MIDAD
          </a>
          <span className="font-display text-lg font-black">مِداد</span>
        </div>
      </header>

      <div className="mx-auto max-w-[980px] px-5 py-12 lg:px-8 lg:py-20">
        <div className="max-w-[760px]">
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#b9854a]">
            <MessageCircle size={15} aria-hidden="true" /> الدعم والشكاوى
          </div>
          <h1 className="font-display text-4xl font-black leading-[1.25] tracking-[-0.045em] text-[#172b3a] md:text-5xl">نحن هنا لمساعدتك</h1>
          <p className="mt-6 text-[15px] leading-[2] text-[#68747a]">إذا واجهت مشكلة في التحويل أو الوصول إلى ملفك أو لديك استفسار عن أحد الملخصات، أرسل شكوى منظمة أو تواصل معنا مباشرة عبر واتساب.</p>
        </div>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#ded6c9] bg-[#fffdf9] p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#f8eee1] p-3 text-[#b9854a]"><MessageCircle size={24} aria-hidden="true" /></div>
              <div>
                <h2 className="font-display text-2xl font-black text-[#172b3a]">إرسال شكوى</h2>
                <p className="mt-3 text-sm leading-[2] text-[#68747a]">املأ البيانات التالية لتحصل على رقم تذكرة يمكن استخدامه في المتابعة.</p>
              </div>
            </div>
            <form onSubmit={submitComplaintForm} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold text-[#344650]">الاسم الكامل<input required value={complaintForm.fullName} onChange={(event) => setComplaintForm({ ...complaintForm, fullName: event.target.value })} className="mt-2 w-full rounded-xl border border-[#ded6c9] bg-white px-4 py-3 font-normal outline-none transition focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" /></label>
                <label className="text-sm font-bold text-[#344650]">البريد الإلكتروني<input required type="email" value={complaintForm.email} onChange={(event) => setComplaintForm({ ...complaintForm, email: event.target.value })} className="mt-2 w-full rounded-xl border border-[#ded6c9] bg-white px-4 py-3 font-normal outline-none transition focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" dir="ltr" /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold text-[#344650]">رقم الواتساب <span className="font-normal text-[#8b9290]">(اختياري)</span><input value={complaintForm.whatsapp} onChange={(event) => setComplaintForm({ ...complaintForm, whatsapp: event.target.value })} placeholder="06xxxxxxxx" className="mt-2 w-full rounded-xl border border-[#ded6c9] bg-white px-4 py-3 font-normal outline-none transition focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" dir="ltr" /></label>
                <label className="text-sm font-bold text-[#344650]">رقم الطلب <span className="font-normal text-[#8b9290]">(اختياري)</span><input type="number" min="1" value={complaintForm.requestId} onChange={(event) => setComplaintForm({ ...complaintForm, requestId: event.target.value })} placeholder="مثال: 123" className="mt-2 w-full rounded-xl border border-[#ded6c9] bg-white px-4 py-3 font-normal outline-none transition focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" dir="ltr" /></label>
              </div>
              <label className="block text-sm font-bold text-[#344650]">نوع المشكلة<select value={complaintForm.category} onChange={(event) => setComplaintForm({ ...complaintForm, category: event.target.value as keyof typeof categoryLabels })} className="mt-2 w-full rounded-xl border border-[#ded6c9] bg-white px-4 py-3 font-normal outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="block text-sm font-bold text-[#344650]">وصف المشكلة<textarea required minLength={10} maxLength={5000} value={complaintForm.description} onChange={(event) => setComplaintForm({ ...complaintForm, description: event.target.value })} rows={4} placeholder="اكتب تفاصيل المشكلة بوضوح..." className="mt-2 w-full resize-y rounded-xl border border-[#ded6c9] bg-white px-4 py-3 font-normal leading-[1.8] outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" /></label>
              <button type="submit" disabled={submitComplaint.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#172b3a] px-6 py-3.5 text-sm font-extrabold text-[#f7f3eb] transition hover:bg-[#264354] disabled:cursor-not-allowed disabled:opacity-60">{submitComplaint.isPending && <Loader2 size={17} className="animate-spin" aria-hidden="true" />} إرسال الشكوى</button>
            </form>
            {submittedTicket && <div className="mt-5 rounded-2xl border border-[#b8ddc5] bg-[#effaf2] p-4 text-sm leading-[1.9] text-[#176b36]"><strong>تم استلام شكواك.</strong><br />رقم التذكرة: <span dir="ltr" className="font-black">{submittedTicket}</span><br />احتفظ بهذا الرقم مع بريدك الإلكتروني لمتابعة الحالة.</div>}
          </div>

          <div className="space-y-5">
            <div className="rounded-[24px] border border-[#ded6c9] bg-[#fffdf9] p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-4"><Search size={23} className="mt-1 shrink-0 text-[#b9854a]" aria-hidden="true" /><div><h2 className="font-display text-2xl font-black text-[#172b3a]">تتبع الشكوى</h2><p className="mt-3 text-sm leading-[2] text-[#68747a]">أدخل رقم التذكرة والبريد المستخدم عند الإرسال لمعرفة الحالة الحالية.</p></div></div>
              <form onSubmit={trackComplaint} className="mt-6 space-y-4">
                <label className="block text-sm font-bold text-[#344650]">رقم التذكرة<input required pattern="MIDAD-S-[A-Za-z0-9]{12}" value={trackingFields.ticketNumber} onChange={(event) => setTrackingFields({ ...trackingFields, ticketNumber: event.target.value.toUpperCase() })} placeholder="MIDAD-S-XXXXXXXXXXXX" className="mt-2 w-full rounded-xl border border-[#ded6c9] bg-white px-4 py-3 font-normal outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" dir="ltr" /></label>
                <label className="block text-sm font-bold text-[#344650]">البريد الإلكتروني<input required type="email" value={trackingFields.email} onChange={(event) => setTrackingFields({ ...trackingFields, email: event.target.value })} className="mt-2 w-full rounded-xl border border-[#ded6c9] bg-white px-4 py-3 font-normal outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" dir="ltr" /></label>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#b9854a] px-6 py-3.5 text-sm font-extrabold text-[#8d622d] transition hover:bg-[#f8eee1]">عرض حالة التذكرة</button>
              </form>
              {trackingQuery.isFetching && <p className="mt-4 text-sm text-[#68747a]">جارٍ البحث عن التذكرة...</p>}
              {trackingQuery.isError && <p className="mt-4 rounded-xl bg-[#fff1ee] p-3 text-sm leading-[1.8] text-[#a64332]">لم نعثر على تذكرة بهذه البيانات. تحقق من رقم التذكرة والبريد الإلكتروني.</p>}
              {trackingQuery.data && <div className="mt-5 rounded-2xl bg-[#f7f3eb] p-4 text-sm leading-[2] text-[#53616a]"><div className="flex items-center justify-between gap-3"><strong className="text-[#172b3a]">{trackingQuery.data.ticketNumber}</strong><span className="rounded-full bg-[#e6f7ec] px-3 py-1 text-xs font-bold text-[#176b36]">{statusLabels[trackingQuery.data.status] ?? trackingQuery.data.status}</span></div><p className="mt-2">نوع المشكلة: {categoryLabels[trackingQuery.data.category as keyof typeof categoryLabels] ?? trackingQuery.data.category}</p><p>تاريخ الإرسال: {new Date(trackingQuery.data.createdAt).toLocaleString("ar-MA")}</p></div>}
            </div>
            <div className="rounded-[24px] border border-[#ded6c9] bg-[#172b3a] p-6 text-[#f7f3eb] shadow-sm sm:p-8"><div className="flex items-start gap-4"><ShieldCheck size={23} className="mt-1 shrink-0 text-[#d5a15f]" aria-hidden="true" /><div><h2 className="font-display text-xl font-black">حماية معلوماتك</h2><p className="mt-3 text-sm leading-[2] text-[#c7d0cd]">لا ترسل كلمات المرور أو رموز التحقق أو بيانات البطاقة البنكية. نستخدم بيانات التواصل لمعالجة الشكوى فقط.</p></div></div></div>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#ded6c9] bg-[#fffdf9] p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><div className="rounded-2xl bg-[#e6f7ec] p-3 text-[#128c43]"><MessageCircle size={24} aria-hidden="true" /></div><div><h2 className="font-display text-2xl font-black text-[#172b3a]">تواصل عبر واتساب</h2><p className="mt-3 text-sm leading-[2] text-[#68747a]">إذا تعذر استخدام النموذج، افتح محادثة مباشرة وأرسل رقم الطلب أو التذكرة عند توفره.</p></div></div><a href={whatsappLink} target="_blank" rel="noreferrer" className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] px-6 py-4 text-sm font-extrabold text-white transition hover:bg-[#1ebe5d] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/30"><MessageCircle size={19} aria-hidden="true" /> فتح محادثة واتساب</a><p className="mt-4 text-center text-xs text-[#8b9290]" dir="ltr">+212 6 64 17 30 90</p></section>

        <section className="mt-5 rounded-[24px] border border-[#ded6c9] bg-[#fffdf9] p-6 shadow-sm sm:p-8"><h2 className="font-display text-xl font-black text-[#172b3a]">يمكننا مساعدتك في</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{topics.map((topic) => <div key={topic} className="flex items-start gap-3 rounded-2xl bg-[#f7f3eb] p-4 text-sm leading-[1.8] text-[#53616a]"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#b9854a]" aria-hidden="true" /><span>{topic}</span></div>)}</div></section>

        <section className="mt-5 rounded-[24px] border border-[#ded6c9] bg-[#fffdf9] p-6 shadow-sm sm:p-8"><div className="max-w-[700px]"><p className="text-xs font-black tracking-[0.08em] text-[#b9854a]">إجابات سريعة</p><h2 className="mt-2 font-display text-2xl font-black text-[#172b3a]">الأسئلة الشائعة حول الدفع والتنزيل</h2><p className="mt-3 text-sm leading-[2] text-[#68747a]">قد تجد الإجابة التي تحتاجها هنا قبل التواصل معنا. إذا لم تُحل المشكلة، استخدم نموذج الشكوى أو زر واتساب.</p></div><Accordion type="single" collapsible className="mt-5 w-full">{faqs.map((faq, index) => <AccordionItem key={faq.question} value={`faq-${index}`} className="border-[#e3ddd1]"><AccordionTrigger className="text-right text-sm font-bold text-[#172b3a] hover:no-underline">{faq.question}</AccordionTrigger><AccordionContent className="text-sm leading-[2] text-[#68747a]">{faq.answer}</AccordionContent></AccordionItem>)}</Accordion></section>

        <p className="mt-8 text-center text-xs leading-[1.9] text-[#8b9290]">تُستخدم بيانات التواصل لمعالجة الاستفسار أو الشكوى فقط وفق <a href="/privacy" className="text-[#b9854a] underline-offset-4 hover:underline">سياسة الخصوصية</a>.</p>
      </div>
    </main>
  );
}
