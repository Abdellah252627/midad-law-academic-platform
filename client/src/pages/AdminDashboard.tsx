import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Check, FileText, HelpCircle, Loader2, Save, Settings2, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Tab = "product" | "chapters" | "faqs";
const productCode = "MIDAD-001" as const;
const contentInput = { productCode };

const emptyChapter = { chapterNumber: "01", title: "", excerpt: "", questionsJson: "[]", sortOrder: 0, isPublished: 1 as 0 | 1 };
const emptyFaq = { question: "", answer: "", sortOrder: 0, isPublished: 1 as 0 | 1 };

function AdminDashboardContent() {
  const [tab, setTab] = useState<Tab>("product");
  const [product, setProduct] = useState({ title: "", category: "", university: "", track: "", description: "", priceMad: 19, isPublished: 1 as 0 | 1 });
  const [chapter, setChapter] = useState(emptyChapter);
  const [chapterId, setChapterId] = useState<number | undefined>();
  const [faq, setFaq] = useState(emptyFaq);
  const [faqId, setFaqId] = useState<number | undefined>();
  const contentQuery = trpc.admin.landingContent.useQuery(contentInput);
  const utils = trpc.useUtils();
  const saveProduct = trpc.admin.saveProduct.useMutation({ onSuccess: () => { toast.success("تم حفظ بيانات المنتج"); utils.admin.landingContent.invalidate(contentInput); }, onError: error => toast.error(error.message) });
  const saveChapter = trpc.admin.saveChapter.useMutation({ onSuccess: () => { toast.success("تم حفظ المعاينة"); setChapter(emptyChapter); setChapterId(undefined); utils.admin.landingContent.invalidate(contentInput); }, onError: error => toast.error(error.message) });
  const deleteChapter = trpc.admin.deleteChapter.useMutation({ onSuccess: () => { toast.success("تم حذف المعاينة"); utils.admin.landingContent.invalidate(contentInput); } });
  const saveFaq = trpc.admin.saveFaq.useMutation({ onSuccess: () => { toast.success("تم حفظ السؤال"); setFaq(emptyFaq); setFaqId(undefined); utils.admin.landingContent.invalidate(contentInput); }, onError: error => toast.error(error.message) });
  const deleteFaq = trpc.admin.deleteFaq.useMutation({ onSuccess: () => { toast.success("تم حذف السؤال"); utils.admin.landingContent.invalidate(contentInput); } });

  useEffect(() => {
    const saved = contentQuery.data?.product;
    if (saved) setProduct({ title: saved.title, category: saved.category, university: saved.university, track: saved.track ?? "", description: saved.description, priceMad: saved.priceMad, isPublished: saved.isPublished === 1 ? 1 : 0 });
  }, [contentQuery.data?.product]);

  const handleProduct = (event: FormEvent) => { event.preventDefault(); saveProduct.mutate({ productCode, ...product }); };
  const handleChapter = (event: FormEvent) => { event.preventDefault(); saveChapter.mutate({ ...chapter, id: chapterId, productCode }); };
  const handleFaq = (event: FormEvent) => { event.preventDefault(); saveFaq.mutate({ ...faq, id: faqId, productCode }); };
  const chapters = contentQuery.data?.chapters ?? [];
  const faqs = contentQuery.data?.faqs ?? [];

  return <div dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / CONTROL CENTER</p>
      <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="font-display text-3xl font-bold">إدارة صفحة الهبوط</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">عدّل المحتوى من هنا ثم انشره للزوار دون تعديل الكود. لا تظهر هذه الواجهة إلا لحسابات الإدارة.</p></div><span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold">{productCode}</span></div>
    </header>
    <nav className="grid gap-3 sm:grid-cols-3" aria-label="أقسام إدارة المحتوى">
      {[ ["product", Settings2, "بيانات المنتج"], ["chapters", FileText, "المعاينات"], ["faqs", HelpCircle, "الأسئلة الشائعة"] ].map(([key, Icon, label]) => <button key={key as string} onClick={() => setTab(key as Tab)} className={`flex items-center gap-3 rounded-2xl border p-4 text-right transition ${tab === key ? "border-[#b9854a] bg-[#fffaf2] text-[#173247] shadow-sm" : "border-[#e3d9ca] bg-white text-[#68747a] hover:border-[#b9854a]/60"}`}><Icon className="h-5 w-5" /><span className="font-bold">{label as string}</span></button>)}
    </nav>
    {contentQuery.isLoading ? <div className="rounded-2xl bg-white p-10 text-center text-[#68747a]"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : <>
      {tab === "product" && <form onSubmit={handleProduct} className="grid gap-5 rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm sm:grid-cols-2">
        <Field label="عنوان المنتج" value={product.title} onChange={value => setProduct({ ...product, title: value })} required />
        <Field label="التصنيف" value={product.category} onChange={value => setProduct({ ...product, category: value })} required />
        <Field label="الجامعة" value={product.university} onChange={value => setProduct({ ...product, university: value })} required />
        <Field label="المسلك أو الفصل" value={product.track} onChange={value => setProduct({ ...product, track: value })} />
        <label className="space-y-2 text-sm font-bold text-[#173247]">السعر بالدرهم<input type="number" min="0" value={product.priceMad} onChange={event => setProduct({ ...product, priceMad: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#b9854a]" /></label>
        <label className="flex items-center gap-3 self-end rounded-xl bg-[#f8f3eb] px-4 py-3 text-sm font-bold text-[#173247]"><input type="checkbox" checked={product.isPublished === 1} onChange={event => setProduct({ ...product, isPublished: event.target.checked ? 1 : 0 })} /> نشر المنتج للزوار</label>
        <label className="space-y-2 text-sm font-bold text-[#173247] sm:col-span-2">الوصف<textarea required minLength={10} value={product.description} onChange={event => setProduct({ ...product, description: event.target.value })} className="mt-2 min-h-32 w-full rounded-xl border border-[#e3d9ca] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#b9854a]" /></label>
        <button disabled={saveProduct.isPending} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#173247] px-5 py-3 font-bold text-white transition hover:bg-[#24485f] disabled:opacity-60 sm:col-span-2"><Save className="h-4 w-4" />{saveProduct.isPending ? "جارٍ الحفظ…" : "حفظ ونشر التغييرات"}</button>
      </form>}
      {tab === "chapters" && <ContentManager title="المعاينات التعليمية" emptyLabel="لا توجد معاينات محفوظة بعد." items={chapters} onEdit={item => { setChapterId(item.id); setChapter({ chapterNumber: item.chapterNumber, title: item.title, excerpt: item.excerpt, questionsJson: item.questionsJson, sortOrder: item.sortOrder, isPublished: item.isPublished === 1 ? 1 : 0 }); }} onDelete={id => deleteChapter.mutate({ id })} renderItem={item => `${item.chapterNumber} — ${item.title}`}><form onSubmit={handleChapter} className="grid gap-3 sm:grid-cols-2"><Field label="رقم المحور" value={chapter.chapterNumber} onChange={value => setChapter({ ...chapter, chapterNumber: value })} required /><Field label="العنوان" value={chapter.title} onChange={value => setChapter({ ...chapter, title: value })} required /><Field label="الترتيب" type="number" value={String(chapter.sortOrder)} onChange={value => setChapter({ ...chapter, sortOrder: Number(value) })} required /><label className="flex items-center gap-3 rounded-xl bg-[#f8f3eb] px-4 py-3 text-sm font-bold"><input type="checkbox" checked={chapter.isPublished === 1} onChange={event => setChapter({ ...chapter, isPublished: event.target.checked ? 1 : 0 })} /> ظاهر للزوار</label><Field label="المقتطف" value={chapter.excerpt} onChange={value => setChapter({ ...chapter, excerpt: value })} required /><Field label={'أسئلة JSON، مثال: ["سؤال؟"]'} value={chapter.questionsJson} onChange={value => setChapter({ ...chapter, questionsJson: value })} required /><button className="rounded-full bg-[#173247] px-5 py-3 font-bold text-white sm:col-span-2">{chapterId ? "تحديث المعاينة" : "إضافة المعاينة"}</button></form></ContentManager>}
      {tab === "faqs" && <ContentManager title="الأسئلة الشائعة" emptyLabel="لا توجد أسئلة محفوظة بعد." items={faqs} onEdit={item => { setFaqId(item.id); setFaq({ question: item.question, answer: item.answer, sortOrder: item.sortOrder, isPublished: item.isPublished === 1 ? 1 : 0 }); }} onDelete={id => deleteFaq.mutate({ id })} renderItem={item => item.question}><form onSubmit={handleFaq} className="grid gap-3 sm:grid-cols-2"><Field label="السؤال" value={faq.question} onChange={value => setFaq({ ...faq, question: value })} required /><Field label="الترتيب" type="number" value={String(faq.sortOrder)} onChange={value => setFaq({ ...faq, sortOrder: Number(value) })} required /><label className="space-y-2 text-sm font-bold sm:col-span-2">الإجابة<textarea required value={faq.answer} onChange={event => setFaq({ ...faq, answer: event.target.value })} className="mt-2 min-h-32 w-full rounded-xl border border-[#e3d9ca] bg-[#fffdf9] px-4 py-3" /></label><label className="flex items-center gap-3 rounded-xl bg-[#f8f3eb] px-4 py-3 text-sm font-bold"><input type="checkbox" checked={faq.isPublished === 1} onChange={event => setFaq({ ...faq, isPublished: event.target.checked ? 1 : 0 })} /> ظاهر للزوار</label><button className="rounded-full bg-[#173247] px-5 py-3 font-bold text-white">{faqId ? "تحديث السؤال" : "إضافة السؤال"}</button></form></ContentManager>}
    </>}
  </div>;
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) { return <label className="space-y-2 text-sm font-bold text-[#173247]">{label}<input type={type} required={required} value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#b9854a]" /></label>; }

function ContentManager({ title, emptyLabel, items, onEdit, onDelete, renderItem, children }: { title: string; emptyLabel: string; items: Array<{ id: number }>; onEdit: (item: any) => void; onDelete: (id: number) => void; renderItem: (item: any) => string; children: React.ReactNode }) { return <div className="space-y-5"><div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><div className="space-y-3 rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm"><h2 className="font-display text-2xl font-bold text-[#173247]">{title}</h2>{items.length ? items.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#eee7dc] p-3"><span className="text-sm font-bold text-[#173247]">{renderItem(item)}</span><span className="flex gap-2"><button type="button" onClick={() => onEdit(item)} className="rounded-lg bg-[#f8f3eb] px-3 py-2 text-xs font-bold">تعديل</button><button type="button" onClick={() => onDelete(item.id)} className="rounded-lg bg-red-50 p-2 text-red-700" aria-label="حذف"><Trash2 className="h-4 w-4" /></button></span></div>) : <p className="rounded-xl bg-[#f8f3eb] p-4 text-sm text-[#68747a]">{emptyLabel}</p>}</div><div className="rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm">{children}</div></div></div>; }

export default function AdminDashboard() { return <DashboardLayout><AdminDashboardContent /></DashboardLayout>; }
