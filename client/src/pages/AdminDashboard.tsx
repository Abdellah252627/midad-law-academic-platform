import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { DEFAULT_PRODUCT_CODE } from "@shared/const";
import { buildPreviewAnswers, getIncorrectReviewConcepts, getQuizResultStatus, isQuizPreviewReady } from "@shared/quiz";
import { Link } from "wouter";
import { Check, Eye, FileText, HelpCircle, ListChecks, Loader2, Plus, RotateCcw, Save, Settings2, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Tab = "product" | "chapters" | "quiz" | "faqs";
type QuizEditorQuestion = { question: string; options: string[]; correctIndex: number; explanation: string; reviewConcept: string };
const productCode = DEFAULT_PRODUCT_CODE;
const contentInput = { productCode };
const emptyChapter = { chapterNumber: "01", title: "", excerpt: "", learningObjectives: "[]", questionsJson: "[]", sortOrder: 0, isPublished: 1 as 0 | 1 };
const emptyFaq = { question: "", answer: "", sortOrder: 0, isPublished: 1 as 0 | 1 };
const blankQuestion = (): QuizEditorQuestion => ({ question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "", reviewConcept: "" });

function parseQuestions(raw: string): QuizEditorQuestion[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => ({ question: String(item?.question ?? ""), options: Array.isArray(item?.options) ? item.options.map(String).slice(0, 4).concat(["", "", "", ""]).slice(0, 4) : ["", "", "", ""], correctIndex: Number.isInteger(item?.correctIndex) ? item.correctIndex : 0, explanation: String(item?.explanation ?? ""), reviewConcept: String(item?.reviewConcept ?? "") }));
  } catch { return []; }
}

function AdminDashboardContent() {
  const [tab, setTab] = useState<Tab>("product");
  const [product, setProduct] = useState({ title: "", category: "", university: "", track: "", description: "", priceMad: 19, isPublished: 1 as 0 | 1 });
  const [chapter, setChapter] = useState(emptyChapter);
  const [chapterId, setChapterId] = useState<number | undefined>();
  const [faq, setFaq] = useState(emptyFaq);
  const [faqId, setFaqId] = useState<number | undefined>();
  const [quizChapterId, setQuizChapterId] = useState<number | undefined>();
  const [quizQuestions, setQuizQuestions] = useState<QuizEditorQuestion[]>([]);
  const contentQuery = trpc.admin.landingContent.useQuery(contentInput);
  const utils = trpc.useUtils();
  const saveProduct = trpc.admin.saveProduct.useMutation({ onSuccess: () => { toast.success("تم حفظ بيانات المنتج"); void utils.admin.landingContent.invalidate(contentInput); }, onError: error => toast.error(error.message) });
  const saveChapter = trpc.admin.saveChapter.useMutation({ onSuccess: () => { toast.success("تم حفظ المحور"); setChapter(emptyChapter); setChapterId(undefined); void utils.admin.landingContent.invalidate(contentInput); }, onError: error => toast.error(error.message) });
  const deleteChapter = trpc.admin.deleteChapter.useMutation({ onSuccess: () => { toast.success("تم حذف المحور"); void utils.admin.landingContent.invalidate(contentInput); }, onError: error => toast.error(error.message) });
  const restoreChapter = trpc.admin.restoreChapter.useMutation({ onSuccess: () => { toast.success("تم استرجاع المحور"); void utils.admin.landingContent.invalidate(contentInput); }, onError: error => toast.error(error.message) });
  const saveFaq = trpc.admin.saveFaq.useMutation({ onSuccess: () => { toast.success("تم حفظ السؤال"); setFaq(emptyFaq); setFaqId(undefined); void utils.admin.landingContent.invalidate(contentInput); }, onError: error => toast.error(error.message) });
  const deleteFaq = trpc.admin.deleteFaq.useMutation({ onSuccess: () => { toast.success("تم حذف السؤال"); void utils.admin.landingContent.invalidate(contentInput); }, onError: error => toast.error(error.message) });
  const restoreFaq = trpc.admin.restoreFaq.useMutation({ onSuccess: () => { toast.success("تم استرجاع السؤال"); void utils.admin.landingContent.invalidate(contentInput); }, onError: error => toast.error(error.message) });

  useEffect(() => { const saved = contentQuery.data?.product; if (saved) setProduct({ title: saved.title, category: saved.category, university: saved.university, track: saved.track ?? "", description: saved.description, priceMad: saved.priceMad, isPublished: saved.isPublished === 1 ? 1 : 0 }); }, [contentQuery.data?.product]);
  const chapters = contentQuery.data?.chapters ?? [];
  const faqs = contentQuery.data?.faqs ?? [];
  const selectedQuizChapter = chapters.find(item => item.id === quizChapterId);
  const quizIsValid = isQuizPreviewReady(quizQuestions);
  const handleProduct = (event: FormEvent) => { event.preventDefault(); saveProduct.mutate({ productCode, ...product }); };
  const handleChapter = (event: FormEvent) => { event.preventDefault(); saveChapter.mutate({ ...chapter, id: chapterId, productCode }); };
  const handleFaq = (event: FormEvent) => { event.preventDefault(); saveFaq.mutate({ ...faq, id: faqId, productCode }); };
  const openQuiz = (item: (typeof chapters)[number]) => { setQuizChapterId(item.id); setQuizQuestions(parseQuestions(item.questionsJson)); };
  const updateQuestion = (index: number, patch: Partial<QuizEditorQuestion>) => setQuizQuestions(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const saveQuiz = () => { if (!selectedQuizChapter || !quizIsValid) { toast.error("أكمل نص السؤال والخيارات الأربعة والإجابة الصحيحة"); return; } saveChapter.mutate({ id: selectedQuizChapter.id, productCode, chapterNumber: selectedQuizChapter.chapterNumber, title: selectedQuizChapter.title, excerpt: selectedQuizChapter.excerpt, learningObjectives: selectedQuizChapter.learningObjectives ?? "[]", questionsJson: JSON.stringify(quizQuestions), sortOrder: selectedQuizChapter.sortOrder, isPublished: selectedQuizChapter.isPublished === 1 ? 1 : 0 }); };

  return <div dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8"><p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / CONTROL CENTER</p><div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="font-display text-3xl font-bold">إدارة صفحة الهبوط</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">عدّل المحتوى والاختبارات من هنا ثم انشره للزوار. لا تظهر هذه الواجهة إلا لحسابات الإدارة.</p></div><div className="flex flex-wrap items-center gap-2"><Link href="/admin/preview" className="inline-flex items-center gap-2 rounded-full bg-[#d5a15f] px-4 py-2 text-xs font-bold text-[#173247] transition hover:bg-[#e2b875]">معاينة قبل النشر</Link><span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold">{productCode}</span></div></div></header>
    <nav className="grid gap-3 sm:grid-cols-4" aria-label="أقسام إدارة المحتوى">{[["product", Settings2, "بيانات المنتج"], ["chapters", FileText, "المحاور"], ["quiz", ListChecks, "اختبر فهمك"], ["faqs", HelpCircle, "الأسئلة الشائعة"]].map(([key, Icon, label]) => <button key={key as string} onClick={() => setTab(key as Tab)} className={`flex items-center gap-3 rounded-2xl border p-4 text-right transition ${tab === key ? "border-[#b9854a] bg-[#fffaf2] text-[#173247] shadow-sm" : "border-[#e3d9ca] bg-white text-[#68747a] hover:border-[#b9854a]/60"}`}><Icon className="h-5 w-5" /><span className="font-bold">{label as string}</span></button>)}</nav>
    {contentQuery.isLoading ? <div className="rounded-2xl bg-white p-10 text-center text-[#68747a]"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : contentQuery.isError ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm leading-7 text-red-800"><p className="font-bold">تعذر تحميل محتوى لوحة الإدارة.</p><p className="mt-1">أعد تحميل الصفحة أو تحقق من اتصال الخادم. لم يتم حذف أي محتوى.</p><button type="button" onClick={() => void contentQuery.refetch()} className="mt-4 rounded-full bg-[#173247] px-5 py-2 text-xs font-bold text-white">إعادة المحاولة</button></div> : <>
      {tab === "product" && <form onSubmit={handleProduct} className="grid gap-5 rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm sm:grid-cols-2"><Field label="عنوان المنتج" value={product.title} onChange={value => setProduct({ ...product, title: value })} required /><Field label="التصنيف" value={product.category} onChange={value => setProduct({ ...product, category: value })} required /><Field label="الجامعة" value={product.university} onChange={value => setProduct({ ...product, university: value })} required /><Field label="المسلك أو الفصل" value={product.track} onChange={value => setProduct({ ...product, track: value })} /><label className="space-y-2 text-sm font-bold text-[#173247]">السعر بالدرهم<input type="number" min="0" value={product.priceMad} onChange={event => setProduct({ ...product, priceMad: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#b9854a]" /></label><label className="flex items-center gap-3 self-end rounded-xl bg-[#f8f3eb] px-4 py-3 text-sm font-bold text-[#173247]"><input type="checkbox" checked={product.isPublished === 1} onChange={event => setProduct({ ...product, isPublished: event.target.checked ? 1 : 0 })} /> نشر المنتج للزوار</label><label className="space-y-2 text-sm font-bold text-[#173247] sm:col-span-2">الوصف<textarea required minLength={10} value={product.description} onChange={event => setProduct({ ...product, description: event.target.value })} className="mt-2 min-h-32 w-full rounded-xl border border-[#e3d9ca] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#b9854a]" /></label><button disabled={saveProduct.isPending} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#173247] px-5 py-3 font-bold text-white transition hover:bg-[#24485f] disabled:opacity-60 sm:col-span-2"><Save className="h-4 w-4" />{saveProduct.isPending ? "جارٍ الحفظ…" : "حفظ ونشر التغييرات"}</button></form>}
      {tab === "chapters" && <ContentManager title="المحاور التعليمية" emptyLabel="لا توجد محاور محفوظة بعد." items={chapters} onEdit={item => { setChapterId(item.id); setChapter({ chapterNumber: item.chapterNumber, title: item.title, excerpt: item.excerpt, learningObjectives: item.learningObjectives ?? "[]", questionsJson: item.questionsJson, sortOrder: item.sortOrder, isPublished: item.isPublished === 1 ? 1 : 0 }); }} onDelete={id => deleteChapter.mutate({ id })} onRestore={id => restoreChapter.mutate({ id })} renderItem={item => `${item.chapterNumber} — ${item.title}`}><form onSubmit={handleChapter} className="grid gap-3 sm:grid-cols-2"><Field label="رقم المحور" value={chapter.chapterNumber} onChange={value => setChapter({ ...chapter, chapterNumber: value })} required /><Field label="العنوان" value={chapter.title} onChange={value => setChapter({ ...chapter, title: value })} required /><Field label="الترتيب" type="number" value={String(chapter.sortOrder)} onChange={value => setChapter({ ...chapter, sortOrder: Number(value) })} required /><label className="flex items-center gap-3 rounded-xl bg-[#f8f3eb] px-4 py-3 text-sm font-bold"><input type="checkbox" checked={chapter.isPublished === 1} onChange={event => setChapter({ ...chapter, isPublished: event.target.checked ? 1 : 0 })} /> ظاهر للزوار</label><Field label="المقتطف" value={chapter.excerpt} onChange={value => setChapter({ ...chapter, excerpt: value })} required /><Field label={'الأهداف التعليمية JSON، مثال: ["يفهم الطالب المفهوم الأساسي"]'} value={chapter.learningObjectives} onChange={value => setChapter({ ...chapter, learningObjectives: value })} required /><Field label={'أسئلة الاختبار JSON (يمكن إدارتها من تبويب «اختبر فهمك»)'} value={chapter.questionsJson} onChange={value => setChapter({ ...chapter, questionsJson: value })} required /><button className="rounded-full bg-[#173247] px-5 py-3 font-bold text-white sm:col-span-2">{chapterId ? "تحديث المحور" : "إضافة المحور"}</button></form></ContentManager>}
      {tab === "quiz" && <QuizManager chapters={chapters} selectedId={quizChapterId} questions={quizQuestions} onSelect={openQuiz} onChange={updateQuestion} onAdd={() => setQuizQuestions(current => [...current, blankQuestion()])} onRemove={index => setQuizQuestions(current => current.filter((_, itemIndex) => itemIndex !== index))} onSave={saveQuiz} saving={saveChapter.isPending} valid={quizIsValid} />}
      {tab === "faqs" && <ContentManager title="الأسئلة الشائعة" emptyLabel="لا توجد أسئلة محفوظة بعد." items={faqs} onEdit={item => { setFaqId(item.id); setFaq({ question: item.question, answer: item.answer, sortOrder: item.sortOrder, isPublished: item.isPublished === 1 ? 1 : 0 }); }} onDelete={id => deleteFaq.mutate({ id })} onRestore={id => restoreFaq.mutate({ id })} renderItem={item => item.question}><form onSubmit={handleFaq} className="grid gap-3 sm:grid-cols-2"><Field label="السؤال" value={faq.question} onChange={value => setFaq({ ...faq, question: value })} required /><Field label="الترتيب" type="number" value={String(faq.sortOrder)} onChange={value => setFaq({ ...faq, sortOrder: Number(value) })} required /><label className="space-y-2 text-sm font-bold sm:col-span-2">الإجابة<textarea required value={faq.answer} onChange={event => setFaq({ ...faq, answer: event.target.value })} className="mt-2 min-h-32 w-full rounded-xl border border-[#e3d9ca] bg-[#fffdf9] px-4 py-3" /></label><label className="flex items-center gap-3 rounded-xl bg-[#f8f3eb] px-4 py-3 text-sm font-bold"><input type="checkbox" checked={faq.isPublished === 1} onChange={event => setFaq({ ...faq, isPublished: event.target.checked ? 1 : 0 })} /> ظاهر للزوار</label><button className="rounded-full bg-[#173247] px-5 py-3 font-bold text-white">{faqId ? "تحديث السؤال" : "إضافة السؤال"}</button></form></ContentManager>}
    </>}
  </div>;
}

function QuizManager({ chapters, selectedId, questions, onSelect, onChange, onAdd, onRemove, onSave, saving, valid }: { chapters: Array<any>; selectedId?: number; questions: QuizEditorQuestion[]; onSelect: (item: any) => void; onChange: (index: number, patch: Partial<QuizEditorQuestion>) => void; onAdd: () => void; onRemove: (index: number) => void; onSave: () => void; saving: boolean; valid: boolean }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewAnswer, setPreviewAnswer] = useState<number | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Array<number | null>>([]);
  const [previewResult, setPreviewResult] = useState(false);
  const previewQuestion = questions[previewIndex];
  const previewScore = previewAnswers.reduce((score: number, answer, index) => score + (answer !== null && answer === questions[index]?.correctIndex ? 1 : 0), 0);
  const previewResultData = getQuizResultStatus(previewScore, questions.length);
  const previewReviewConcepts = getIncorrectReviewConcepts(questions, previewAnswers);
  const openPreview = () => {
    if (!valid) {
      toast.error("أكمل الأسئلة والخيارات الأربعة قبل المعاينة");
      return;
    }
    setPreviewIndex(0);
    setPreviewAnswer(null);
    setPreviewAnswers(Array.from({ length: questions.length }, () => null));
    setPreviewResult(false);
    setPreviewOpen(true);
  };
  const movePreview = (direction: number) => {
    setPreviewIndex(index => Math.min(Math.max(index + direction, 0), questions.length - 1));
    setPreviewAnswer(previewAnswers[previewIndex + direction] ?? null);
  };

  const choosePreviewAnswer = (optionIndex: number) => {
    setPreviewAnswer(optionIndex);
    setPreviewAnswers(current => current.map((answer, index) => index === previewIndex ? optionIndex : answer));
  };
  const finishPreview = () => {
    if (previewAnswers.some(answer => answer === null)) {
      toast.error("أجب عن جميع الأسئلة قبل عرض النتيجة النهائية");
      return;
    }
    setPreviewResult(true);
  };
  const showSampleResult = (passed: boolean) => {
    setPreviewAnswers(buildPreviewAnswers(questions, passed));
    setPreviewResult(true);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] bg-[#173247] p-6 text-white shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[#d5a15f]">MIDAD / QUIZ EDITOR</p>
            <h2 className="mt-2 font-display text-2xl font-bold">إدارة «اختبر فهمك»</h2>
            <p className="mt-2 text-sm leading-7 text-white/70">اختر محوراً، أضف أسئلته، وحدد الإجابة الصحيحة ومفهوم المراجعة المرتبط بها.</p>
          </div>
          <ListChecks className="h-8 w-8 text-[#d5a15f]" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-3 rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm">
          <h3 className="font-display text-xl font-bold text-[#173247]">اختر المحور</h3>
          {chapters.length ? chapters.map(item => (
            <button type="button" key={item.id} onClick={() => onSelect(item)} className={`w-full rounded-xl border p-4 text-right transition ${selectedId === item.id ? "border-[#b9854a] bg-[#fffaf2]" : "border-[#eee7dc] hover:border-[#b9854a]/60"}`}>
              <span className="block text-sm font-bold text-[#173247]">{item.chapterNumber} — {item.title}</span>
              <span className="mt-1 block text-xs text-[#68747a]">{parseQuestions(item.questionsJson).length} أسئلة محفوظة</span>
            </button>
          )) : <p className="rounded-xl bg-[#f8f3eb] p-4 text-sm text-[#68747a]">لا توجد محاور بعد.</p>}
        </div>
        <div className="space-y-5 rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm">
          {selectedId ? <>
            <div className="flex flex-col justify-between gap-3 border-b border-[#eee7dc] pb-4 sm:flex-row sm:items-center">
              <div><h3 className="font-display text-xl font-bold text-[#173247]">أسئلة المحور المحدد</h3><p className="mt-1 text-xs text-[#68747a]">الإجابة الصحيحة تحفظ داخلياً وتُخلط للطالب عند بدء المحاولة.</p></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onAdd} className="inline-flex items-center gap-2 rounded-full bg-[#f8f3eb] px-4 py-2 text-xs font-bold text-[#173247]"><Plus className="h-4 w-4" />إضافة سؤال</button>
                <button type="button" onClick={openPreview} disabled={!valid} className="inline-flex items-center gap-2 rounded-full bg-[#fff4df] px-4 py-2 text-xs font-bold text-[#8a5a24] disabled:cursor-not-allowed disabled:opacity-50"><Eye className="h-4 w-4" />معاينة الاختبار</button>
                <button type="button" onClick={onSave} disabled={!valid || saving} className="inline-flex items-center gap-2 rounded-full bg-[#173247] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "جارٍ الحفظ…" : "حفظ أسئلة المحور"}</button>
              </div>
            </div>
            {questions.length ? questions.map((item, index) => (
              <div key={index} className="space-y-3 rounded-2xl border border-[#eee7dc] bg-[#fffdf9] p-4">
                <div className="flex items-center justify-between"><span className="rounded-full bg-[#173247] px-3 py-1 text-xs font-bold text-white">السؤال {index + 1}</span><button type="button" onClick={() => onRemove(index)} className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label={`حذف السؤال ${index + 1}`}><X className="h-4 w-4" /></button></div>
                <label className="block text-sm font-bold text-[#173247]">نص السؤال<textarea value={item.question} onChange={event => onChange(index, { question: event.target.value })} className="mt-2 min-h-20 w-full rounded-xl border border-[#e3d9ca] bg-white px-3 py-2 outline-none focus:border-[#b9854a]" /></label>
                <div className="grid gap-3 sm:grid-cols-2">{item.options.map((option, optionIndex) => <label key={optionIndex} className="text-sm font-bold text-[#173247]">الخيار {optionIndex + 1}<div className="mt-2 flex gap-2"><input value={option} onChange={event => onChange(index, { options: item.options.map((current, currentIndex) => currentIndex === optionIndex ? event.target.value : current) })} className="min-w-0 flex-1 rounded-xl border border-[#e3d9ca] bg-white px-3 py-2 outline-none focus:border-[#b9854a]" /><span className="flex items-center gap-1 rounded-xl bg-[#f8f3eb] px-2 text-[11px] font-bold"><input type="radio" name={`correct-${index}`} checked={item.correctIndex === optionIndex} onChange={() => onChange(index, { correctIndex: optionIndex })} />صحيحة</span></div></label>)}</div>
                <label className="block text-sm font-bold text-[#173247]">التفسير<textarea value={item.explanation} onChange={event => onChange(index, { explanation: event.target.value })} className="mt-2 min-h-16 w-full rounded-xl border border-[#e3d9ca] bg-white px-3 py-2 outline-none focus:border-[#b9854a]" /></label>
                <Field label="مفهوم المراجعة" value={item.reviewConcept} onChange={value => onChange(index, { reviewConcept: value })} />
              </div>
            )) : <div className="rounded-2xl border border-dashed border-[#d9cbb7] p-8 text-center text-sm text-[#68747a]"><p>لا توجد أسئلة لهذا المحور.</p><button type="button" onClick={onAdd} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#173247] px-4 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />إضافة أول سؤال</button></div>}
          </> : <div className="flex min-h-80 items-center justify-center rounded-2xl bg-[#fffaf2] p-8 text-center text-sm leading-7 text-[#68747a]">اختر محوراً من القائمة لبدء إدارة أسئلة «اختبر فهمك».</div>}
        </div>
      </div>
      {previewOpen && previewQuestion ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173247]/60 p-4" role="dialog" aria-modal="true" aria-labelledby="quiz-preview-title">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-[#fffdf9] p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-[#eee7dc] pb-4"><div><p className="text-xs font-bold tracking-[0.16em] text-[#b9854a]">PREVIEW / LOCAL DRAFT</p><h3 id="quiz-preview-title" className="mt-2 font-display text-2xl font-bold text-[#173247]">معاينة الاختبار</h3><p className="mt-1 text-xs text-[#68747a]">هذه معاينة للتعديلات الحالية فقط، ولم يتم حفظها أو نشرها بعد.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => showSampleResult(true)} className="rounded-full bg-emerald-100 px-3 py-2 text-[11px] font-bold text-emerald-900">تجربة نتيجة ناجحة</button><button type="button" onClick={() => showSampleResult(false)} className="rounded-full bg-amber-100 px-3 py-2 text-[11px] font-bold text-amber-900">تجربة نتيجة راسبة</button></div></div><button type="button" onClick={() => setPreviewOpen(false)} className="rounded-full p-2 text-[#68747a] hover:bg-[#f8f3eb]" aria-label="إغلاق المعاينة"><X className="h-5 w-5" /></button></div>
          {previewResult ? <div className="mt-5 space-y-5"><div className={`rounded-2xl p-6 text-center ${previewResultData.passed ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}><p className="text-sm font-bold">النتيجة النهائية للمعاينة</p><p className="mt-3 text-5xl font-bold">{previewResultData.percentage}%</p><p className="mt-2 text-sm">{previewResultData.passed ? "ناجح" : "يحتاج إلى مراجعة"}</p><p className="mt-1 text-xs">الدرجة: {previewScore} من {questions.length} — حد النجاح: {previewResultData.passingPercentage}%</p></div><div className="rounded-2xl border border-[#e3d9ca] bg-white p-5 text-sm leading-8 text-[#173247]"><p className="font-bold">هذه المعاينة تقيس تجربة العرض فقط، ولا تغني عن قراءة المحور وتحليله ومراجعته.</p>{previewReviewConcepts.length ? <><p className="mt-4 font-bold text-[#8a5a24]">مفاهيم يُستحسن مراجعتها</p><ul className="mt-2 list-disc space-y-1 pr-5">{previewReviewConcepts.map(concept => <li key={concept}>{concept}</li>)}</ul></> : <p className="mt-3 text-emerald-800">لا توجد مفاهيم مرتبطة بإجابات خاطئة في هذه المعاينة.</p>}</div><button type="button" onClick={() => { setPreviewResult(false); setPreviewIndex(0); setPreviewAnswer(previewAnswers[0] ?? null); }} className="rounded-full bg-[#f8f3eb] px-5 py-2 text-xs font-bold text-[#173247]">إعادة المعاينة</button></div> : <><div className="mt-5"><div className="mb-4 flex items-center justify-between text-xs font-bold text-[#68747a]"><span>السؤال {previewIndex + 1} من {questions.length}</span><span>{Math.round(((previewIndex + 1) / questions.length) * 100)}%</span></div><div className="rounded-2xl border border-[#e3d9ca] bg-white p-5"><h4 className="text-lg font-bold leading-8 text-[#173247]">{previewQuestion.question}</h4><div className="mt-5 space-y-3">{previewQuestion.options.map((option, optionIndex) => <button type="button" key={optionIndex} onClick={() => choosePreviewAnswer(optionIndex)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-right text-sm font-bold transition ${previewAnswer === optionIndex ? optionIndex === previewQuestion.correctIndex ? "border-emerald-400 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900" : "border-[#eee7dc] bg-[#fffdf9] text-[#173247] hover:border-[#b9854a]"}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f8f3eb] text-xs">{optionIndex + 1}</span><span>{option}</span>{previewAnswer === optionIndex ? optionIndex === previewQuestion.correctIndex ? <Check className="mr-auto h-4 w-4" /> : <X className="mr-auto h-4 w-4" /> : null}</button>)}</div>{previewAnswer !== null ? <div className={`mt-5 rounded-xl p-4 text-sm leading-7 ${previewAnswer === previewQuestion.correctIndex ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}><p className="font-bold">{previewAnswer === previewQuestion.correctIndex ? "إجابة صحيحة" : `الإجابة الصحيحة: الخيار ${previewQuestion.correctIndex + 1}`}</p>{previewQuestion.explanation ? <p className="mt-1">{previewQuestion.explanation}</p> : null}</div> : <p className="mt-5 text-xs text-[#68747a]">اختر إجابة لمراجعة التصحيح والتفسير.</p>}</div></div><div className="mt-5 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => movePreview(-1)} disabled={previewIndex === 0} className="rounded-full bg-[#f8f3eb] px-5 py-2 text-xs font-bold text-[#173247] disabled:opacity-40">السؤال السابق</button>{previewIndex < questions.length - 1 ? <button type="button" onClick={() => movePreview(1)} className="rounded-full bg-[#173247] px-5 py-2 text-xs font-bold text-white">السؤال التالي</button> : <button type="button" onClick={finishPreview} className="rounded-full bg-[#173247] px-5 py-2 text-xs font-bold text-white">عرض النتيجة النهائية</button>}</div></>}
        </div>
      </div> : null}
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) { return <label className="space-y-2 text-sm font-bold text-[#173247]">{label}<input type={type} required={required} value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#b9854a]" /></label>; }
function ContentManager({ title, emptyLabel, items, onEdit, onDelete, onRestore, renderItem, children }: { title: string; emptyLabel: string; items: Array<{ id: number; deletedAt?: Date | null }>; onEdit: (item: any) => void; onDelete: (id: number) => void; onRestore: (id: number) => void; renderItem: (item: any) => string; children: React.ReactNode }) { return <div className="space-y-5"><div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><div className="space-y-3 rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm"><h2 className="font-display text-2xl font-bold text-[#173247]">{title}</h2>{items.length ? items.map(item => <div key={item.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${item.deletedAt ? "border-red-200 bg-red-50/50" : "border-[#eee7dc]"}`}><span className="text-sm font-bold text-[#173247]">{renderItem(item)}{item.deletedAt ? <small className="mr-2 rounded-full bg-red-100 px-2 py-1 text-[10px] text-red-700">محذوف منطقياً</small> : null}</span><span className="flex gap-2">{item.deletedAt ? <button type="button" onClick={() => onRestore(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><RotateCcw className="h-3 w-3" />استرجاع</button> : <><button type="button" onClick={() => onEdit(item)} className="rounded-lg bg-[#f8f3eb] px-3 py-2 text-xs font-bold">تعديل</button><button type="button" onClick={() => onDelete(item.id)} className="rounded-lg bg-red-50 p-2 text-red-700" aria-label="حذف"><Trash2 className="h-4 w-4" /></button></>}</span></div>) : <p className="rounded-xl bg-[#f8f3eb] p-4 text-sm text-[#68747a]">{emptyLabel}</p>}</div><div className="rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm">{children}</div></div></div>; }
export default function AdminDashboard() { return <DashboardLayout><AdminDashboardContent /></DashboardLayout>; }
