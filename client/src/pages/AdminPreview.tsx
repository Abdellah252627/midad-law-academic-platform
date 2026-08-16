import { Link } from "wouter";
import { ArrowRight, Eye, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";

const productCode = "MIDAD-001" as const;

export default function AdminPreview() {
  const query = trpc.admin.previewContent.useQuery({ productCode });
  const content = query.data;
  return (
    <DashboardLayout>
      <main dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">DRAFT PREVIEW / {productCode}</p>
            <h1 className="mt-2 font-display text-3xl font-bold">معاينة قبل النشر</h1>
            <p className="mt-2 text-sm leading-7 text-white/70">هذه المعاينة محمية للمدير وتعرض المسودة الحالية، ولا تغيّر المحتوى المنشور للزوار.</p>
          </div>
          <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm font-bold transition hover:bg-white/20"><ArrowRight className="h-4 w-4" />عودة للتحرير</Link>
        </div>
        {query.isLoading ? <div className="rounded-2xl bg-white p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : query.isError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">تعذر تحميل مسودة المعاينة. أعد المحاولة من لوحة الإدارة.</div> : content?.product ? <>
          <section className="rounded-[26px] bg-[#fffaf2] p-6 shadow-sm sm:p-8">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#b06f2f]"><Eye className="h-4 w-4" />مسودة غير منشورة</div>
            <p className="text-sm font-bold text-[#68747a]">{content.product.category} · {content.product.university}</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-[#173247]">{content.product.title}</h2>
            <p className="mt-4 max-w-3xl leading-8 text-[#4b5d64]">{content.product.description}</p>
            <div className="mt-6 flex flex-wrap gap-3"><span className="rounded-full bg-[#173247] px-4 py-2 text-sm font-bold text-white">{content.product.priceMad} درهماً</span><span className="rounded-full border border-[#d9c6ad] px-4 py-2 text-sm font-bold text-[#173247]">{content.product.isPublished ? "المنتج مفعّل للنشر" : "المنتج غير منشور"}</span></div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            {(content.chapters ?? []).map(chapter => <article key={chapter.id} className="rounded-2xl border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-xs font-bold text-[#b06f2f]">المحور {chapter.chapterNumber}</p><h3 className="mt-2 text-xl font-bold text-[#173247]">{chapter.title}</h3><p className="mt-2 text-sm leading-7 text-[#68747a]">{chapter.excerpt}</p><span className="mt-4 inline-block text-xs font-bold text-[#173247]">{chapter.isPublished ? "ظاهر في النشر" : "مسودة غير ظاهرة"}</span></article>)}
          </section>
          <section className="rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm"><h2 className="font-display text-2xl font-bold text-[#173247]">الأسئلة الشائعة</h2><div className="mt-4 space-y-3">{(content.faqs ?? []).map(faq => <details key={faq.id} className="rounded-xl bg-[#fffaf2] p-4"><summary className="cursor-pointer font-bold text-[#173247]">{faq.question}</summary><p className="mt-3 text-sm leading-7 text-[#68747a]">{faq.answer}</p></details>)}</div></section>
        </> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">لا توجد مسودة منتج مكتملة للمعاينة حالياً. ارجع إلى إدارة المحتوى وأكمل بيانات المنتج ثم احفظها قبل فتح المعاينة.</div>}
      </main>
    </DashboardLayout>
  );
}
