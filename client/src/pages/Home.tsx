import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  FileText,
  LockKeyhole,
  Menu,
  MoveLeft,
  Scale,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

const bookCover = "/manus-storage/midad-book-cover_a427e97b.png";
const heroTexture = "/manus-storage/midad-hero-texture_780e9e01.png";
const brandMark = "/manus-storage/midad-mark_68d51083.png";

const chapters = [
  ["01", "مفهوم القانون ووظائفه", "المفاهيم التي تمنحك نقطة البداية."],
  ["02", "القاعدة القانونية وخصائصها", "الإلزام والعموم والتجريد والجزاء."],
  ["03", "تصنيفات القواعد القانونية", "خريطة مختصرة للأنواع والتقسيمات."],
  ["04", "مصادر القانون", "التشريع والعرف والقضاء والفقه."],
  ["05", "فروع القانون", "العام والخاص والفروع الرئيسية."],
  ["06", "أشخاص القانون", "الشخص الطبيعي والاعتباري والأهلية."],
  ["07", "الحق", "المفهوم والعناصر والأنواع."],
  ["08", "الالتزام", "المفهوم والمصادر والآثار."],
];

const faqs = [
  ["هل هذا ملخص رسمي صادر عن جامعة ابن زهر؟", "لا. هذا منتج تعليمي رقمي أصلي مستقل، موجّه إلى الطلبة للمراجعة الذاتية. لا يمثل مقرراً رسمياً أو وثيقة صادرة عن الجامعة، ولا يعني أن الجامعة راجعت المنتج أو اعتمدته."],
  ["هل يضمن الملخص النجاح في الامتحان؟", "لا يمكن لأي ملخص أن يضمن نتيجة امتحان. صُمّم المنتج للمساعدة في الفهم والتنظيم والمراجعة، ويُفضّل استخدامه إلى جانب المحاضرات والمراجع التي يحددها الأستاذ."],
  ["هل يمكنني قراءة الملف على الهاتف؟", "نعم. الملف بصيغة PDF ومهيأ للقراءة الرقمية بالعربية، مع تنسيق مناسب للهاتف والحاسوب والطباعة الشخصية."],
  ["هل يشمل المنتج استشارة قانونية؟", "لا. المحتوى تعليمي عام للمراجعة، ولا يشكل استشارة قانونية أو رأياً مهنياً في واقعة محددة."],
  ["كيف أحصل على الملف بعد الدفع؟", "بعد تأكيد الدفع، تحصل على رابط تنزيل خاص أو صلاحية تنزيل مرتبطة بحسابك، بحسب آلية التسليم المعتمدة في المنصة."],
];

function scrollToPurchase() {
  document.getElementById("purchase")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCheckout = () => {
    toast("الدفع الإلكتروني سيُفعّل في خطوة الربط التالية", {
      description: "هذه نسخة العرض التجريبي لصفحة الهبوط.",
    });
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f7f3eb] text-[#172b3a] selection:bg-[#b9854a]/30">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#e3ddd1]/70 bg-[#f7f3eb]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <a href="#top" className="group flex items-center gap-3" aria-label="العودة إلى بداية الصفحة">
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[13px] bg-[#172b3a] shadow-[0_8px_20px_rgba(23,43,58,0.18)]">
              <img src={brandMark} alt="" className="h-8 w-8 object-contain" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-[20px] font-extrabold tracking-[-0.04em] text-[#172b3a]">مِداد</span>
              <span className="mt-1 block text-[10px] font-semibold tracking-[0.18em] text-[#967143]">للمراجعة الذكية</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-[13px] font-bold text-[#53616a] lg:flex">
            <a href="#inside" className="transition-colors hover:text-[#b9854a]">داخل الملخص</a>
            <a href="#why" className="transition-colors hover:text-[#b9854a]">لماذا مِداد؟</a>
            <a href="#faq" className="transition-colors hover:text-[#b9854a]">الأسئلة الشائعة</a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={scrollToPurchase} className="hidden rounded-full bg-[#b9854a] px-5 py-3 text-[12px] font-extrabold text-white shadow-[0_10px_25px_rgba(185,133,74,0.22)] transition hover:-translate-y-0.5 hover:bg-[#a8733d] active:scale-[0.97] sm:inline-flex">
              احصل على النسخة
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dcd4c7] text-[#172b3a] lg:hidden" aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-[#e3ddd1] bg-[#f7f3eb] px-5 py-5 lg:hidden">
            <div className="flex flex-col gap-4 text-sm font-bold text-[#53616a]">
              <a href="#inside" onClick={() => setMenuOpen(false)}>داخل الملخص</a>
              <a href="#why" onClick={() => setMenuOpen(false)}>لماذا مِداد؟</a>
              <a href="#faq" onClick={() => setMenuOpen(false)}>الأسئلة الشائعة</a>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative isolate min-h-[720px] overflow-hidden border-b border-[#e5ded2] pt-[74px]">
          <div className="absolute inset-0 -z-20 bg-[#f7f3eb]" />
          <img src={heroTexture} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70 mix-blend-multiply" />
          <div className="absolute -right-32 top-40 -z-10 h-[420px] w-[420px] rounded-full bg-[#e8d9c5]/60 blur-3xl" />
          <div className="absolute -left-24 bottom-0 -z-10 h-[350px] w-[350px] rounded-full bg-[#eadcc9]/70 blur-3xl" />

          <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8 lg:py-28">
            <div className="order-2 max-w-[650px] lg:order-1">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c8b99f] bg-[#f7f3eb]/75 px-4 py-2 text-[11px] font-extrabold tracking-[0.04em] text-[#89663b] backdrop-blur-sm">
                <Sparkles size={14} className="text-[#b9854a]" />
                النسخة الأولى · لطلبة القانون والشريعة
              </div>
              <h1 className="max-w-[700px] font-display text-[clamp(38px,5.8vw,76px)] font-black leading-[1.08] tracking-[-0.06em] text-[#172b3a]">
                ابدأ من الأساس الذي
                <span className="relative mx-2 inline-block whitespace-nowrap text-[#b9854a]">
                  يربط لك المادة كلها.
                  <svg className="absolute -bottom-3 right-0 h-3 w-full text-[#b9854a]" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8C82 2 188 10 298 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                </span>
              </h1>
              <p className="mt-8 max-w-[570px] font-body text-[18px] leading-[2] text-[#53616a]">
                ملخص عربي منظم يختصر لك مدخل القانون والعلوم القانونية في وثيقة واحدة، من المفاهيم الأولى إلى المراجعة التطبيقية.
              </p>
              <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <button onClick={scrollToPurchase} className="group inline-flex items-center gap-3 rounded-full bg-[#172b3a] px-7 py-4 text-sm font-extrabold text-white shadow-[0_18px_35px_rgba(23,43,58,0.22)] transition hover:-translate-y-1 hover:bg-[#b9854a] active:scale-[0.97]">
                  احصل على الملخص الآن
                  <ArrowLeft size={17} className="transition-transform group-hover:-translate-x-1" />
                </button>
                <a href="#inside" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#b9854a] transition hover:text-[#b9854a]">
                  اكتشف المحتوى
                  <ArrowUpLeft size={16} />
                </a>
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#d9d0c2] pt-6 text-[12px] font-bold text-[#68747a]">
                <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#b9854a]" /> PDF مهيأ للهاتف</span>
                <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#b9854a]" /> مراجعة تطبيقية</span>
                <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#b9854a]" /> 19 درهماً</span>
              </div>
            </div>

            <div className="relative order-1 flex min-h-[380px] items-center justify-center lg:order-2 lg:min-h-[520px]">
              <div className="absolute right-[13%] top-[7%] h-20 w-20 rounded-full border border-[#b9854a]/40" />
              <div className="absolute bottom-[8%] left-[3%] h-28 w-28 rounded-full border border-dashed border-[#b9854a]/30" />
              <div className="absolute right-[8%] top-[15%] font-display text-[10px] font-bold tracking-[0.28em] text-[#b9854a] [writing-mode:vertical-rl]">MIDAD / 001</div>
              <div className="relative w-[min(72vw,310px)] rotate-[4deg] transition duration-500 hover:rotate-0 hover:scale-[1.025] sm:w-[330px]">
                <div className="absolute -inset-4 rounded-[24px] bg-[#b9854a]/10 blur-xl" />
                <div className="relative overflow-hidden rounded-[6px] border-[7px] border-[#eadfce] bg-[#172b3a] shadow-[28px_30px_0_rgba(185,133,74,0.15),0_30px_55px_rgba(23,43,58,0.28)]">
                  <img src={bookCover} alt="غلاف ملخص مدخل إلى القانون والعلوم القانونية" className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
              <div className="absolute bottom-[10%] right-[2%] hidden max-w-[190px] rounded-[15px] border border-[#ded4c5] bg-[#fbf8f2]/90 p-4 shadow-[0_18px_35px_rgba(23,43,58,0.1)] backdrop-blur-md sm:block">
                <div className="mb-3 flex items-center justify-between"><span className="font-display text-xs font-black text-[#172b3a]">فهرس واضح</span><BookOpen size={15} className="text-[#b9854a]" /></div>
                <div className="space-y-2 text-[10px] font-bold text-[#718087]"><div className="h-1.5 w-full rounded-full bg-[#d7e3df]" /><div className="h-1.5 w-[75%] rounded-full bg-[#d7e3df]" /><div className="h-1.5 w-[86%] rounded-full bg-[#d7e3df]" /></div>
              </div>
            </div>
          </div>
        </section>

        <section id="why" className="border-b border-[#e5ded2] bg-[#172b3a] text-[#f7f3eb]">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-12 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-8">
            <p className="font-display text-xl font-bold leading-[1.7] lg:text-2xl">ليس المطلوب أن تحفظ أكثر.<br /><span className="text-[#cfa56f]">بل أن ترى الصورة أوضح.</span></p>
            <div className="hidden h-16 w-px bg-[#cfa56f]/40 lg:block" />
            <p className="max-w-[470px] font-body text-sm leading-[2] text-[#c3ced0]">حين تكون المفاهيم موزعة بين المحاضرات والملاحظات، تصبح المراجعة نفسها عبئاً. مِداد يرتب لك الطريق في وثيقة واحدة قابلة للعودة السريعة.</p>
          </div>
        </section>

        <section id="inside" className="bg-[#f7f3eb] py-24 lg:py-32">
          <div className="mx-auto max-w-[1240px] px-5 lg:px-8">
            <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div><div className="section-kicker">01 / داخل الملخص</div><h2 className="mt-4 max-w-[580px] font-display text-4xl font-black leading-[1.25] tracking-[-0.045em] text-[#172b3a] md:text-5xl">ثمانية محاور تبني<br /><span className="text-[#b9854a]">فهمك خطوة خطوة.</span></h2></div>
              <p className="max-w-[330px] font-body text-[15px] leading-[1.9] text-[#68747a]">من التعريف إلى التطبيق، بترتيب يساعدك على القراءة والاسترجاع دون تشتت.</p>
            </div>
            <div className="grid border-t border-[#d9d0c2] md:grid-cols-2 lg:grid-cols-4">
              {chapters.map(([number, title, description]) => (
                <div key={number} className="group border-b border-[#d9d0c2] py-7 transition-colors hover:bg-[#efe8dc] md:border-l md:px-6 lg:min-h-[190px] lg:first:border-r-0">
                  <span className="font-display text-[12px] font-black tracking-[0.16em] text-[#b9854a]">{number}</span>
                  <h3 className="mt-8 font-display text-[17px] font-extrabold text-[#172b3a] transition-colors group-hover:text-[#b9854a]">{title}</h3>
                  <p className="mt-3 font-body text-[13px] leading-[1.8] text-[#768087]">{description}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-col justify-between gap-5 rounded-[20px] border border-[#d9d0c2] bg-[#fbf8f2] p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8d9c5] text-[#b9854a]"><FileText size={19} /></div><div><h3 className="font-display text-base font-extrabold text-[#172b3a]">ويكتمل المسار بقاموس ومراجعة تطبيقية</h3><p className="mt-1 font-body text-sm text-[#768087]">تعريفات مركزة وأسئلة تساعدك على تثبيت الفهم.</p></div></div>
              <a href="#purchase" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#b9854a]">انتقل إلى العرض <MoveLeft size={16} /></a>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#e8eee9] py-24 lg:py-28">
          <div className="absolute -left-10 top-10 font-display text-[180px] font-black leading-none text-[#d7e3dc]">“</div>
          <div className="relative mx-auto max-w-[1000px] px-5 text-center lg:px-8"><div className="section-kicker justify-center">02 / طريقة المراجعة</div><blockquote className="mx-auto mt-8 max-w-[820px] font-display text-3xl font-black leading-[1.55] tracking-[-0.04em] text-[#172b3a] md:text-5xl">«ملخص واحد، وفهرس واضح، ومراجعة أقرب إلى الفهم.»</blockquote><p className="mx-auto mt-7 max-w-[560px] font-body text-[15px] leading-[2] text-[#617069]">صُمّم ليكون رفيقاً قبل المحاضرة، وبين جلسات الدراسة، وقبل الاختبار. لا يرفع الضجيج؛ يوضح الطريق.</p></div>
        </section>

        <section className="bg-[#f7f3eb] py-24 lg:py-32">
          <div className="mx-auto grid max-w-[1240px] gap-14 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
            <div><div className="section-kicker">03 / ما تحصل عليه</div><h2 className="mt-4 font-display text-4xl font-black leading-[1.25] tracking-[-0.05em] text-[#172b3a] md:text-5xl">كل ما تحتاجه<br /><span className="text-[#b9854a]">في ملف واحد.</span></h2><p className="mt-7 max-w-[440px] font-body text-[15px] leading-[2] text-[#68747a]">نسخة عربية منظمة، جاهزة للقراءة على الهاتف والحاسوب والطباعة الشخصية.</p><button onClick={scrollToPurchase} className="mt-9 inline-flex items-center gap-3 rounded-full border border-[#b9854a] px-6 py-3.5 text-sm font-extrabold text-[#89663b] transition hover:bg-[#b9854a] hover:text-white active:scale-[0.97]">احجز نسختك <ArrowLeft size={16} /></button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[{ icon: BookOpen, title: "قراءة مريحة", text: "اتجاه RTL وتنسيق واضح للقراءة الرقمية." }, { icon: Download, title: "PDF جاهز", text: "ملف واحد سهل الحفظ والعودة إليه." }, { icon: Scale, title: "محتوى أصلي", text: "مادة تعليمية مستقلة للمراجعة الذاتية." }, { icon: LockKeyhole, title: "تسليم خاص", text: "رابط تنزيل خاص بعد تأكيد الدفع." }].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-[18px] border border-[#ded6c9] bg-[#fbf8f2] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#b9854a]/50 hover:shadow-[0_16px_35px_rgba(23,43,58,0.07)]"><Icon size={22} className="text-[#b9854a]" /><h3 className="mt-8 font-display text-lg font-extrabold text-[#172b3a]">{title}</h3><p className="mt-2 font-body text-sm leading-[1.8] text-[#768087]">{text}</p></div>)}
            </div>
          </div>
        </section>

        <section id="purchase" className="relative overflow-hidden bg-[#172b3a] py-24 text-[#f7f3eb] lg:py-32">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_20%_60%,rgba(185,133,74,0.18),transparent_50%)]" />
          <div className="relative mx-auto grid max-w-[1100px] gap-12 px-5 lg:grid-cols-[1fr_380px] lg:items-center lg:px-8">
            <div><div className="section-kicker text-[#cfa56f]">04 / العرض الأولي</div><h2 className="mt-5 max-w-[600px] font-display text-4xl font-black leading-[1.2] tracking-[-0.05em] md:text-6xl">مراجعتك القادمة<br /><span className="text-[#cfa56f]">تبدأ من هنا.</span></h2><p className="mt-7 max-w-[530px] font-body text-[15px] leading-[2] text-[#c3ced0]">احصل على النسخة الأولى من MIDAD-001 بصيغة PDF، وابدأ بناء صورة أوضح عن مدخل القانون والعلوم القانونية.</p><div className="mt-9 flex flex-wrap gap-5 text-xs font-bold text-[#d5dfdf]"><span className="inline-flex items-center gap-2"><Check size={15} className="text-[#cfa56f]" /> نسخة رقمية عربية</span><span className="inline-flex items-center gap-2"><Check size={15} className="text-[#cfa56f]" /> مراجعة تطبيقية</span></div></div>
            <div className="relative rounded-[24px] border border-white/15 bg-[#f7f3eb] p-7 text-[#172b3a] shadow-[0_25px_70px_rgba(0,0,0,0.22)] sm:p-9"><div className="flex items-start justify-between"><div><span className="font-display text-[11px] font-black tracking-[0.15em] text-[#b9854a]">MIDAD-001</span><h3 className="mt-3 font-display text-xl font-black leading-[1.4]">مدخل إلى القانون<br />والعلوم القانونية</h3></div><div className="rounded-full bg-[#e8eee9] p-3 text-[#b9854a]"><BookOpen size={19} /></div></div><div className="my-7 border-t border-[#ded6c9]" /><div className="flex items-end justify-between"><div><span className="font-body text-xs text-[#768087]">السعر الأولي</span><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-5xl font-black text-[#172b3a]">19</span><span className="font-display text-sm font-black text-[#b9854a]">درهماً</span></div></div><span className="rounded-full bg-[#b9854a]/10 px-3 py-2 text-[10px] font-extrabold text-[#89663b]">نسخة المراجعة الأولى</span></div><button onClick={handleCheckout} className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#b9854a] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#a8733d] hover:shadow-[0_12px_25px_rgba(185,133,74,0.3)] active:scale-[0.98]">احصل على الملخص الآن <ArrowLeft size={17} /></button><p className="mt-4 text-center font-body text-[11px] leading-[1.8] text-[#8b9290]">الدفع والتسليم الإلكتروني قيد الربط في الإصدار التالي.</p></div>
          </div>
        </section>

        <section id="faq" className="bg-[#f7f3eb] py-24 lg:py-32">
          <div className="mx-auto max-w-[900px] px-5 lg:px-8"><div className="text-center"><div className="section-kicker justify-center">05 / الأسئلة الشائعة</div><h2 className="mt-4 font-display text-4xl font-black tracking-[-0.05em] text-[#172b3a] md:text-5xl">قبل أن تبدأ</h2></div><div className="mt-12 divide-y divide-[#d9d0c2] border-y border-[#d9d0c2]">{faqs.map(([question, answer], index) => <div key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-5 py-6 text-right font-display text-[15px] font-extrabold text-[#172b3a] transition hover:text-[#b9854a]" aria-expanded={openFaq === index}><span>{question}</span><ChevronDown size={18} className={`shrink-0 text-[#b9854a] transition-transform duration-200 ${openFaq === index ? "rotate-180" : ""}`} /></button><div className={`grid transition-[grid-template-rows,opacity] duration-200 ${openFaq === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="overflow-hidden"><p className="max-w-[760px] pb-6 font-body text-[14px] leading-[2] text-[#68747a]">{answer}</p></div></div></div>)}</div></div>
        </section>

        <section className="border-t border-[#ded6c9] bg-[#efe8dc] py-16"><div className="mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-8 px-5 sm:flex-row sm:items-center lg:px-8"><div><div className="flex items-center gap-3"><img src={brandMark} alt="" className="h-9 w-9 rounded-[10px] bg-[#172b3a] p-1" /><span className="font-display text-xl font-black text-[#172b3a]">مِداد</span></div><p className="mt-4 max-w-[420px] font-body text-sm leading-[1.9] text-[#68747a]">ملخصات دراسية رقمية منظمة لطلبة القانون والشريعة.</p></div><button onClick={scrollToPurchase} className="group inline-flex items-center gap-3 rounded-full bg-[#172b3a] px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#b9854a] active:scale-[0.97]">ابدأ المراجعة <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /></button></div></section>
      </main>

      <footer className="bg-[#172b3a] px-5 py-7 text-center font-body text-[11px] leading-[1.9] text-[#aab8b9]"><p>مِداد © 2026 · منتج تعليمي رقمي مستقل للمراجعة الذاتية</p><p className="mt-1 text-[#768b8b]">لا يمثل هذا المنتج وثيقة رسمية أو مادة معتمدة من جامعة ابن زهر.</p></footer>
    </div>
  );
}
