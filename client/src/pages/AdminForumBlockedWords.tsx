import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

function BlockedWordsContent() {
  const [term, setTerm] = useState("");
  const words = trpc.admin.blockedWords.useQuery();
  const utils = trpc.useUtils();
  const add = trpc.admin.addBlockedWord.useMutation({ onSuccess: () => { setTerm(""); toast.success("أضيفت الكلمة إلى قائمة المراقبة"); void utils.admin.blockedWords.invalidate(); }, onError: error => toast.error(error.message) });
  const toggle = trpc.admin.setBlockedWordActive.useMutation({ onSuccess: () => { toast.success("تم تحديث حالة الكلمة"); void utils.admin.blockedWords.invalidate(); }, onError: error => toast.error(error.message) });
  const remove = trpc.admin.deleteBlockedWord.useMutation({ onSuccess: () => { toast.success("تم حذف الكلمة"); void utils.admin.blockedWords.invalidate(); }, onError: error => toast.error(error.message) });
  const items = words.data ?? [];

  return <div dir="rtl" className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-sm sm:p-8"><p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD LAW / CONTENT SAFETY</p><h1 className="mt-2 font-display text-3xl font-bold">قائمة الكلمات المسيئة</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-white/75">تُفحص عناوين ومحتويات الموضوعات والردود قبل إرسالها إلى المراجعة. لا تُنشر أي مشاركة تلقائياً، وتظل صلاحيات الإشراف وحالة النشر مستقلة عن هذه القائمة.</p></header>
    <section className="rounded-[26px] border border-[#e3d9ca] bg-white p-5 shadow-sm sm:p-7">
      <form onSubmit={event => { event.preventDefault(); if (term.trim()) add.mutate({ term }); }} className="flex flex-col gap-3 sm:flex-row"><input value={term} onChange={event => setTerm(event.target.value)} placeholder="أدخل كلمة أو عبارة للمراقبة" aria-label="كلمة مسيئة" className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" /><button type="submit" disabled={add.isPending || term.trim().length < 2} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#b9854a] px-5 text-sm font-bold text-white transition hover:bg-[#9f6e3c] disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />إضافة إلى القائمة</button></form>
      <div className="mt-6 flex items-center gap-2 text-sm font-bold text-[#173247]"><ShieldCheck className="h-5 w-5 text-emerald-600" />{items.length} كلمة أو عبارة مُدارة</div>
      {words.isLoading ? <div className="flex items-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />جاري تحميل القائمة...</div> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{items.map(item => <article key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#fffdf9] p-4"><div><p className="font-bold text-[#173247]">{item.term}</p><p className="mt-1 text-xs text-slate-500">{item.isActive ? "نشطة وتمنع الإرسال" : "معطلة مؤقتاً"}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => toggle.mutate({ id: item.id, isActive: !item.isActive })} className={`rounded-full px-3 py-2 text-xs font-bold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.isActive ? "تعطيل" : "تفعيل"}</button><button type="button" aria-label={`حذف ${item.term}`} onClick={() => { if (window.confirm("هل تريد حذف هذه الكلمة من القائمة؟")) remove.mutate({ id: item.id }); }} className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}
    </section>
  </div>;
}

export default function AdminForumBlockedWords() { return <DashboardLayout><BlockedWordsContent /></DashboardLayout>; }
