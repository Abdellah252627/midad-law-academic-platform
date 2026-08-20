import DashboardLayout from "@/components/DashboardLayout";
import { FORUM_LEVELS, getForumLevelLabel, type ForumLevel } from "@shared/forum";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, EyeOff, FileSearch, Filter, Loader2, MessageSquare, Search, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

const statusLabels = {
  pending: "قيد المراجعة",
  published: "منشور",
  hidden: "مخفي",
  closed: "مغلق",
} as const;

const statusClasses = {
  pending: "bg-amber-50 text-amber-800",
  published: "bg-emerald-50 text-emerald-800",
  hidden: "bg-slate-100 text-slate-700",
  closed: "bg-blue-50 text-blue-800",
} as const;

function AdminForumContent() {
  const [status, setStatus] = useState<"all" | keyof typeof statusLabels>("pending");
  const [itemType, setItemType] = useState<"all" | "topic" | "reply">("all");
  const [search, setSearch] = useState("");
  const [levels, setLevels] = useState<ForumLevel[]>([]);
  const queueInput = useMemo(() => ({
    status: status === "all" ? undefined : status,
    itemType: itemType === "all" ? undefined : itemType,
    search: search.trim() || undefined,
    level: levels.length ? levels : undefined,
  }), [status, itemType, search, levels]);
  const toggleLevel = (level: ForumLevel) => {
    setLevels(current => current.includes(level) ? current.filter(item => item !== level) : [...current, level]);
  };
  const queue = trpc.admin.forumQueue.useQuery(queueInput, { refetchOnWindowFocus: true });
  const reports = trpc.admin.forumReports.useQuery(undefined, { refetchOnWindowFocus: true });
  const utils = trpc.useUtils();
  const refresh = () => { void utils.admin.forumQueue.invalidate(); void utils.admin.forumReports.invalidate(); };
  const moderateTopic = trpc.admin.moderateTopic.useMutation({ onSuccess: () => { toast.success("تم تحديث حالة الموضوع وتسجيل الإجراء"); refresh(); }, onError: error => toast.error(error.message) });
  const moderateReply = trpc.admin.moderateReply.useMutation({ onSuccess: () => { toast.success("تم تحديث حالة الرد وتسجيل الإجراء"); refresh(); }, onError: error => toast.error(error.message) });
  const reviewReport = trpc.admin.reviewForumReport.useMutation({ onSuccess: () => { toast.success("تم تحديث البلاغ"); void utils.admin.forumReports.invalidate(); }, onError: error => toast.error(error.message) });
  const isMutating = moderateTopic.isPending || moderateReply.isPending;
  const items = queue.data ?? [];

  const moderate = (item: (typeof items)[number], nextStatus: "pending" | "published" | "hidden" | "closed") => {
    const reason = window.prompt("سبب الإجراء الإداري (اختياري):", "");
    if (reason === null) return;
    if (item.itemType === "topic") moderateTopic.mutate({ id: Number(item.id), status: nextStatus, reason: reason.trim() || undefined });
    else moderateReply.mutate({ id: Number(item.id), status: nextStatus === "closed" ? "hidden" : nextStatus, reason: reason.trim() || undefined });
  };

  return <div dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div><p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD LAW / BACK OFFICE</p><h1 className="mt-2 font-display text-3xl font-bold">إدارة المنتدى</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-white/75">مركز موحد لمراجعة الموضوعات والردود، تطبيق قواعد النشر، ومتابعة البلاغات دون عرض المحتوى غير المنشور للعامة.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/admin/forum/blocked-words" className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/20">الكلمات المسيئة والحظر</Link><Link href="/admin/forum" className="rounded-full bg-[#d5a15f] px-4 py-2 text-sm font-bold text-[#173247]">طابور المراجعة</Link></div>
      </div>
    </header>

    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">عناصر الطابور الحالية</p><p className="mt-2 text-3xl font-bold text-[#173247]">{queue.isLoading ? "—" : items.length}</p></div>
      <div className="rounded-2xl border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">بلاغات مفتوحة</p><p className="mt-2 text-3xl font-bold text-amber-700">{reports.isLoading ? "—" : (reports.data ?? []).length}</p></div>
      <div className="rounded-2xl border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">قاعدة العرض العامة</p><p className="mt-2 text-sm font-bold text-emerald-700">المنشور فقط</p></div>
    </section>

    <section className="rounded-[26px] border border-[#e3d9ca] bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><h2 className="flex items-center gap-2 text-xl font-bold text-[#173247]"><FileSearch className="h-5 w-5 text-[#b9854a]" />طابور مراجعة المحتوى</h2><p className="mt-1 text-sm text-slate-500">راجع المحتوى قبل نشره، وسجّل سبب الإجراء عند الحاجة.</p></div><span className="rounded-full bg-[#f7f1e8] px-3 py-1 text-xs font-bold text-[#8a5d32]">{items.length} عنصر</span></div>
      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <label className="relative block"><Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث في العنوان أو المحتوى" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none transition focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" /></label>
        <label className="relative"><Filter className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" /><select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-[#b9854a]"><option value="pending">قيد المراجعة</option><option value="all">كل الحالات</option><option value="published">منشور</option><option value="hidden">مخفي</option><option value="closed">مغلق</option></select></label>
        <select value={itemType} onChange={event => setItemType(event.target.value as typeof itemType)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#b9854a]"><option value="all">الموضوعات والردود</option><option value="topic">الموضوعات فقط</option><option value="reply">الردود فقط</option></select>
      </div>
      <fieldset className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <legend className="px-2 text-sm font-bold text-[#173247]">المستويات الدراسية</legend>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setLevels([])} className={`rounded-full px-3 py-2 text-xs font-bold transition ${levels.length === 0 ? "bg-[#173247] text-white" : "bg-white text-slate-600 hover:bg-[#f7f1e8]"}`}>كل المستويات</button>
          {FORUM_LEVELS.map(level => <label key={level} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition ${levels.includes(level) ? "border-[#b9854a] bg-[#f7f1e8] text-[#173247]" : "border-slate-200 bg-white text-slate-600 hover:border-[#d5a15f]"}`}>
            <input type="checkbox" checked={levels.includes(level)} onChange={() => toggleLevel(level)} className="h-4 w-4 accent-[#b9854a]" />
            <span>{level}</span>
          </label>)}
          <span className="text-xs text-slate-500">{levels.length ? `تم اختيار ${levels.length} مستويات` : "يمكن اختيار أكثر من مستوى"}</span>
        </div>
      </fieldset>
      {queue.isLoading ? <div className="flex items-center gap-2 py-14 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />جاري تحميل طابور المراجعة...</div> : items.length === 0 ? <div className="rounded-2xl bg-emerald-50 p-8 text-center text-sm font-bold text-emerald-800">لا توجد عناصر مطابقة لهذه الفلاتر.</div> : <div className="space-y-4">{items.map(item => <article key={`${item.itemType}-${item.id}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-[#d5a15f] sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-[#f7f1e8] px-2.5 py-1 text-xs font-bold text-[#8a5d32]">{item.itemType === "topic" ? <FileSearch className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}{item.itemType === "topic" ? "موضوع" : "رد"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[item.status as keyof typeof statusClasses]}`}>{statusLabels[item.status as keyof typeof statusLabels] ?? String(item.status)}</span>{item.itemType === "topic" && item.subject ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">{String(item.subject)}</span> : null}{item.itemType === "topic" && item.level ? <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-800">{getForumLevelLabel(String(item.level))}</span> : null}</div><h3 className="mt-3 text-lg font-bold text-[#173247]">{item.itemType === "topic" ? String(item.title ?? "موضوع بلا عنوان") : `رد على الموضوع رقم ${String(item.topicId ?? "—")}`}</h3><p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-600">{String(item.body ?? "") }</p><p className="mt-3 text-xs text-slate-400">الكاتب: {String(item.authorName ?? "غير معروف")} · {String(item.authorEmail ?? "—")} · {new Date(String(item.createdAt)).toLocaleString("ar-MA")}</p></div><div className="flex flex-wrap gap-2 xl:max-w-[270px] xl:justify-end"><button disabled={isMutating} onClick={() => moderate(item, "published")} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />نشر</button><button disabled={isMutating} onClick={() => moderate(item, "hidden")} className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-300 disabled:opacity-50"><EyeOff className="h-4 w-4" />إخفاء</button>{item.status !== "closed" && <button disabled={isMutating} onClick={() => moderate(item, "closed")} className="inline-flex items-center gap-1 rounded-full bg-[#173247] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#244a63] disabled:opacity-50"><XCircle className="h-4 w-4" />إغلاق الموضوع</button>}</div></div></article>)}</div>}
    </section>

    <section className="rounded-[26px] border border-[#e3d9ca] bg-white p-5 shadow-sm sm:p-7"><div className="mb-4 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-xl font-bold text-[#173247]"><ShieldAlert className="h-5 w-5 text-[#b9854a]" />البلاغات المفتوحة</h2><p className="mt-1 text-sm text-slate-500">تُسجل قرارات مراجعة البلاغات في سجل التدقيق.</p></div></div>{reports.isLoading ? <div className="py-8 text-sm text-slate-500">جاري التحميل...</div> : (reports.data ?? []).length === 0 ? <div className="rounded-2xl bg-emerald-50 p-5 text-center text-sm font-bold text-emerald-800">لا توجد بلاغات مفتوحة حالياً.</div> : <div className="space-y-3">{(reports.data ?? []).map(report => <div key={report.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold text-[#b9854a]">بلاغ #{report.id}</p><p className="mt-1 text-sm font-bold text-[#173247]">{report.reason}</p><p className="mt-1 text-xs text-slate-500">{report.topicId ? `موضوع #${report.topicId}` : `رد #${report.replyId}`}</p></div><div className="flex gap-2"><button onClick={() => { const reason = window.prompt("سبب مراجعة البلاغ (اختياري):", ""); if (reason !== null) reviewReport.mutate({ id: report.id, status: "reviewed" }); }} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white">مراجَع</button><button onClick={() => reviewReport.mutate({ id: report.id, status: "dismissed" })} className="rounded-full bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700">رفض البلاغ</button></div></div>)}</div>}</section>
  </div>;
}

export default function AdminForum() {
  return <DashboardLayout><AdminForumContent /></DashboardLayout>;
}
