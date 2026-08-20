import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Loader2, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

function AdminForumContent() {
  const reports = trpc.admin.forumReports.useQuery(undefined, { refetchOnWindowFocus: true });
  const utils = trpc.useUtils();
  const review = trpc.admin.reviewForumReport.useMutation({ onSuccess: () => { toast.success("تم تحديث البلاغ"); void utils.admin.forumReports.invalidate(); }, onError: error => toast.error(error.message) });
  const items = reports.data ?? [];
  return <div dir="rtl" className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-sm sm:p-8"><p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD LAW / MODERATION</p><h1 className="mt-2 font-display text-3xl font-bold">إشراف المنتدى</h1><p className="mt-2 text-sm leading-7 text-white/75">راجع البلاغات المفتوحة واتخذ إجراءً تعليمياً متناسباً مع قواعد Midad Law.</p></header>
    <section className="rounded-[26px] border border-[#e3d9ca] bg-white p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-bold text-[#173247]"><ShieldAlert className="h-5 w-5 text-[#b9854a]" />البلاغات المفتوحة</h2><p className="mt-1 text-sm text-slate-500">لا يظهر المحتوى المخفي للزوار، وتُسجل إجراءات المراجعة في سجل التدقيق.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{items.length} بلاغ</span></div>
      {reports.isLoading ? <div className="flex items-center gap-2 py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />جاري تحميل البلاغات...</div> : items.length === 0 ? <div className="rounded-2xl bg-emerald-50 p-6 text-center text-sm font-bold text-emerald-800">لا توجد بلاغات مفتوحة حالياً.</div> : <div className="space-y-4">{items.map(report => <article key={report.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-bold text-[#b9854a]">بلاغ #{report.id}</p><h3 className="mt-1 font-bold text-[#173247]">{report.reason}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{report.topicId ? `مرتبط بالموضوع رقم ${report.topicId}` : `مرتبط بالرد رقم ${report.replyId}`}</p></div><div className="flex flex-wrap gap-2"><button disabled={review.isPending} onClick={() => review.mutate({ id: report.id, status: "reviewed" })} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" />مراجَع</button><button disabled={review.isPending} onClick={() => review.mutate({ id: report.id, status: "dismissed" })} className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300"><XCircle className="h-4 w-4" />رفض البلاغ</button></div></div></article>)}</div>}
    </section>
  </div>;
}

export default function AdminForum() { return <DashboardLayout><AdminForumContent /></DashboardLayout>; }
