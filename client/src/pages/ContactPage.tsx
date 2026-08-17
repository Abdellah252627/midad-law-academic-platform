import { ArrowRight, CheckCircle2, MessageCircle, ShieldCheck } from "lucide-react";
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

export default function ContactPage() {
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
          <h1 className="font-display text-4xl font-black leading-[1.25] tracking-[-0.045em] text-[#172b3a] md:text-5xl">
            نحن هنا لمساعدتك
          </h1>
          <p className="mt-6 text-[15px] leading-[2] text-[#68747a]">
            إذا واجهت مشكلة في التحويل أو الوصول إلى ملفك أو لديك استفسار عن أحد الملخصات، تواصل معنا مباشرة عبر واتساب وسنعمل على معالجة طلبك في أقرب وقت ممكن.
          </p>
        </div>

        <section className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[24px] border border-[#ded6c9] bg-[#fffdf9] p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#e6f7ec] p-3 text-[#128c43]"><MessageCircle size={24} aria-hidden="true" /></div>
              <div>
                <h2 className="font-display text-2xl font-black text-[#172b3a]">تواصل عبر واتساب</h2>
                <p className="mt-3 text-sm leading-[2] text-[#68747a]">اضغط الزر لفتح محادثة مباشرة مع رقم الدعم المعتمد في MIDAD.</p>
              </div>
            </div>
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] px-6 py-4 text-sm font-extrabold text-white transition hover:bg-[#1ebe5d] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/30">
              <MessageCircle size={19} aria-hidden="true" /> فتح محادثة واتساب
            </a>
            <p className="mt-4 text-center text-xs text-[#8b9290]" dir="ltr">+212 6 64 17 30 90</p>
          </div>

          <div className="rounded-[24px] border border-[#ded6c9] bg-[#172b3a] p-6 text-[#f7f3eb] shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <ShieldCheck size={23} className="mt-1 shrink-0 text-[#d5a15f]" aria-hidden="true" />
              <div>
                <h2 className="font-display text-xl font-black">لتسريع المعالجة</h2>
                <p className="mt-3 text-sm leading-[2] text-[#c7d0cd]">أرسل في رسالتك رقم الطلب والبريد الإلكتروني المستخدم في الشراء، ولا تشارك بياناتك البنكية السرية أو كلمات المرور.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#ded6c9] bg-[#fffdf9] p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-black text-[#172b3a]">يمكننا مساعدتك في</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {topics.map((topic) => (
              <div key={topic} className="flex items-start gap-3 rounded-2xl bg-[#f7f3eb] p-4 text-sm leading-[1.8] text-[#53616a]">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#b9854a]" aria-hidden="true" />
                <span>{topic}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#ded6c9] bg-[#fffdf9] p-6 shadow-sm sm:p-8">
          <div className="max-w-[700px]">
            <p className="text-xs font-black tracking-[0.08em] text-[#b9854a]">إجابات سريعة</p>
            <h2 className="mt-2 font-display text-2xl font-black text-[#172b3a]">الأسئلة الشائعة حول الدفع والتنزيل</h2>
            <p className="mt-3 text-sm leading-[2] text-[#68747a]">قد تجد الإجابة التي تحتاجها هنا قبل التواصل معنا. إذا لم تُحل المشكلة، استخدم زر واتساب وأرسل رقم الطلب.</p>
          </div>
          <Accordion type="single" collapsible className="mt-5 w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`faq-${index}`} className="border-[#e3ddd1]">
                <AccordionTrigger className="text-right text-sm font-bold text-[#172b3a] hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-[2] text-[#68747a]">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <p className="mt-8 text-center text-xs leading-[1.9] text-[#8b9290]">تُستخدم بيانات التواصل لمعالجة الاستفسار أو الشكوى فقط وفق <a href="/privacy" className="text-[#b9854a] underline-offset-4 hover:underline">سياسة الخصوصية</a>.</p>
      </div>
    </main>
  );
}
