import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, History, Loader2, MessageSquareText, Search, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const statuses = [
  { value: "new", label: "جديدة", className: "bg-sky-50 text-sky-700" },
  { value: "in_review", label: "قيد المراجعة", className: "bg-amber-50 text-amber-700" },
  { value: "needs_info", label: "تحتاج معلومات", className: "bg-violet-50 text-violet-700" },
  { value: "responded", label: "تم الرد", className: "bg-emerald-50 text-emerald-700" },
  { value: "closed", label: "مغلقة", className: "bg-slate-100 text-slate-700" },
] as const;

const categories: Record<string, string> = {
  payment: "الدفع والتحويل",
  proof: "إثبات التحويل",
  review: "التقييم",
  download: "التنزيل",
  data: "تصحيح البيانات",
  other: "أخرى",
};

type StatusValue = (typeof statuses)[number]["value"];

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("ar-MA", { dateStyle: "medium", timeStyle: "short" });
}

function statusMeta(value: string) {
  return statuses.find(status => status.value === value) ?? statuses[0];
}

function timelineEventLabel(action: string, metadataJson: string | null) {
  if (action === "complaint.created") return "تم إنشاء الشكوى";
  if (action !== "complaint.update") return "تم تسجيل إجراء إداري";
  try {
    const metadata = metadataJson ? JSON.parse(metadataJson) as { previousStatus?: string; status?: string; responseChanged?: boolean } : {};
    if (metadata.previousStatus && metadata.status && metadata.previousStatus !== metadata.status) {
      return `تم تغيير الحالة من «${statusMeta(metadata.previousStatus).label}» إلى «${statusMeta(metadata.status).label}»`;
    }
    if (metadata.responseChanged) return "تم تحديث الرد الإداري";
  } catch {
    return "تم تحديث الشكوى";
  }
  return "تم تحديث بيانات الشكوى";
}

type TimelineEvent = { id: string; action: string; actorUserId: number | null; metadataJson: string | null; createdAt: Date | string };

type StatusDuration = { status: StatusValue; durationMs: number };

function getStatusTransition(metadataJson: string | null) {
  if (!metadataJson) return null;
  try {
    const metadata = JSON.parse(metadataJson) as { previousStatus?: string; status?: string };
    if (statuses.some(item => item.value === metadata.previousStatus) && statuses.some(item => item.value === metadata.status) && metadata.previousStatus !== metadata.status) {
      return { from: metadata.previousStatus as StatusValue, to: metadata.status as StatusValue };
    }
  } catch {
    return null;
  }
  return null;
}

function formatDuration(durationMs: number) {
  const totalMinutes = Math.max(0, Math.floor(durationMs / 60_000));
  if (totalMinutes < 1) return "أقل من دقيقة";
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} ${days === 1 ? "يوم" : "أيام"}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? "ساعة" : "ساعات"}`);
  if (minutes && parts.length < 2) parts.push(`${minutes} ${minutes === 1 ? "دقيقة" : "دقائق"}`);
  return parts.join(" و ") || "أقل من دقيقة";
}

function calculateStatusDurations(timeline: TimelineEvent[], now: number): StatusDuration[] {
  const durations = new Map<StatusValue, number>(statuses.map(item => [item.value, 0]));
  const events = [...timeline].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (!events.length) return [];
  let currentStatus: StatusValue = "new";
  let statusStartedAt = new Date(events[0].createdAt).getTime();
  for (const event of events.slice(1)) {
    const transition = event.action === "complaint.update" ? getStatusTransition(event.metadataJson) : null;
    if (!transition) continue;
    const eventAt = new Date(event.createdAt).getTime();
    durations.set(currentStatus, (durations.get(currentStatus) ?? 0) + Math.max(0, eventAt - statusStartedAt));
    currentStatus = transition.to;
    statusStartedAt = eventAt;
  }
  durations.set(currentStatus, (durations.get(currentStatus) ?? 0) + Math.max(0, now - statusStartedAt));
  return statuses.map(item => ({ status: item.value, durationMs: durations.get(item.value) ?? 0 })).filter(item => item.durationMs > 0);
}

function AdminComplaintsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusValue | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50 | 100 | 200>(25);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [responseDraft, setResponseDraft] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusValue>("new");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const pendingTransitionRef = useRef<{ from: StatusValue; to: StatusValue } | null>(null);
  const queryInput = useMemo(() => ({ search: search || undefined, status: status === "all" ? undefined : status, page, pageSize }), [search, status, page, pageSize]);
  const complaintsQuery = trpc.admin.complaints.useQuery(queryInput, { enabled: isAdmin });
  const detailQuery = trpc.admin.complaint.useQuery({ id: selectedId ?? 0 }, { enabled: isAdmin && selectedId !== null });
  const queryUtils = trpc.useUtils();
  const updateMutation = trpc.admin.updateComplaint.useMutation({
    onSuccess: async () => {
      const transition = pendingTransitionRef.current;
      if (transition && transition.from !== transition.to) {
        toast.success(`تم نقل الشكوى من «${statusMeta(transition.from).label}» إلى «${statusMeta(transition.to).label}».`);
      } else {
        toast.success("تم حفظ تحديث الشكوى وتسجيل العملية في سجل التدقيق.");
      }
      pendingTransitionRef.current = null;
      // إبطال جميع نسخ قائمة الشكاوى يحدّث العدادات فوراً حتى مع وجود بحث أو فلتر مختلف.
      await queryUtils.admin.complaints.invalidate();
      if (selectedId !== null) await detailQuery.refetch();
    },
    onError: error => toast.error(error.message || "تعذر تحديث الشكوى."),
  });

  useEffect(() => {
    if (selectedId === null) return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [selectedId]);

  useEffect(() => {
    setResponseDraft(detailQuery.data?.adminResponse ?? "");
    if (detailQuery.data?.status) setSelectedStatus(detailQuery.data.status as StatusValue);
  }, [detailQuery.data?.adminResponse, detailQuery.data?.status, selectedId]);

  if (!isAdmin) {
    return <section dir="rtl" className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 text-center"><div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm"><ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-700" aria-hidden="true" /><h1 className="font-display text-2xl font-bold text-[#173247]">الوصول غير مسموح</h1><p className="mt-3 text-sm leading-7 text-[#68747a]">هذه الصفحة مخصصة لحسابات الإدارة المعتمدة فقط.</p></div></section>;
  }

  const complaints = complaintsQuery.data?.complaints ?? [];
  const totalPages = complaintsQuery.data?.totalPages ?? 1;
  const statusCounts = complaintsQuery.data?.statusCounts ?? {};
  const selected = detailQuery.data;
  const statusDurations = useMemo(() => calculateStatusDurations((selected?.timeline ?? []) as TimelineEvent[], clockNow), [selected?.timeline, clockNow]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchDraft.trim().slice(0, 160));
    setPage(1);
  };

  const clearFilters = () => {
    setSearchDraft("");
    setSearch("");
    setStatus("all");
    setPage(1);
  };

  const saveComplaint = () => {
    if (!selected) return;
    pendingTransitionRef.current = { from: statusMeta(selected.status).value, to: selectedStatus };
    updateMutation.mutate({ id: selected.id, status: selectedStatus, adminResponse: responseDraft.trim() || null });
  };

  return <section dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / SUPPORT</p>
          <h1 className="mt-2 font-display text-3xl font-bold">إدارة الشكاوى</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">تابع تذاكر الطلاب، راجع تفاصيل البلاغ، حدّث الحالة، وأرسل رداً إدارياً موثقاً دون كشف بيانات الدعم خارج حسابات الإدارة.</p>
        </div>

      </div>
    </header>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">إجمالي النتائج</p><p className="mt-2 text-3xl font-bold text-[#173247]">{complaintsQuery.isLoading ? "…" : complaintsQuery.data?.total ?? 0}</p></div>
      <div className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">المعروض في الصفحة</p><p className="mt-2 text-3xl font-bold text-[#173247]">{complaints.length}</p></div>
      <div className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">رقم الصفحة</p><p className="mt-2 text-3xl font-bold text-[#173247]">{page} <span className="text-base text-[#68747a]">من {totalPages}</span></p></div>
    </div>

    <section aria-label="تصفية سريعة حسب حالة الشكوى" className="rounded-[22px] border border-[#e3d9ca] bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#173247]">تصفية سريعة</h2>
        <p className="text-xs text-[#68747a]">اختر حالة للوصول المباشر إلى تذاكرها</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <button type="button" onClick={() => { setStatus("all"); setPage(1); }} aria-pressed={status === "all"} className={`rounded-2xl border px-3 py-3 text-right transition active:scale-[0.98] ${status === "all" ? "border-[#173247] bg-[#173247] text-white shadow-sm" : "border-[#e3d9ca] bg-[#fcfaf6] text-[#173247] hover:border-[#b9854a]"}`}>
          <span className="block text-xs font-bold opacity-75">كل الشكاوى</span>
          <span className="mt-1 block text-xl font-bold">{complaintsQuery.isLoading ? "…" : complaintsQuery.data?.statusCounts ? Object.values(statusCounts).reduce((sum, value) => sum + value, 0) : 0}</span>
        </button>
        {statuses.map(item => {
          const countForStatus = statusCounts[item.value] ?? 0;
          return <button key={item.value} type="button" onClick={() => { setStatus(item.value); setPage(1); }} aria-pressed={status === item.value} className={`rounded-2xl border px-3 py-3 text-right transition active:scale-[0.98] ${status === item.value ? "border-[#173247] bg-[#173247] text-white shadow-sm" : "border-[#e3d9ca] bg-[#fcfaf6] text-[#173247] hover:border-[#b9854a]"}`}><span className="block text-xs font-bold opacity-75">{item.label}</span><span className="mt-1 block text-xl font-bold">{complaintsQuery.isLoading ? "…" : countForStatus}</span></button>;
        })}
      </div>
    </section>

    <form onSubmit={handleSearch} className="flex flex-col gap-3 rounded-[22px] border border-[#e3d9ca] bg-white p-4 shadow-sm lg:flex-row lg:items-center">
      <div className="relative flex-1"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8f80]" aria-hidden="true" /><input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="ابحث برقم التذكرة أو اسم الطالب أو البريد الإلكتروني" aria-label="البحث في الشكاوى" maxLength={160} className="w-full rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] py-3 pr-10 pl-4 text-sm text-[#173247] outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" /></div>
      <label className="flex items-center gap-2 text-sm font-bold text-[#173247]"><span>الحالة</span><select value={status} onChange={event => { setStatus(event.target.value as StatusValue | "all"); setPage(1); }} aria-label="تصفية الشكاوى حسب الحالة" className="rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 text-sm font-bold outline-none focus:border-[#b9854a]"><option value="all">كل الحالات</option>{statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm font-bold text-[#173247]"><span>حجم الصفحة</span><select value={pageSize} onChange={event => { setPageSize(Number(event.target.value) as typeof pageSize); setPage(1); }} aria-label="اختيار حجم صفحة الشكاوى" className="rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 text-sm font-bold outline-none focus:border-[#b9854a]"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={200}>200</option></select></label>
      <div className="flex gap-2"><button type="submit" className="rounded-xl bg-[#173247] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#24465e] active:scale-[0.98]">بحث</button>{(search || searchDraft || status !== "all") && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-xl border border-[#e3d9ca] px-4 py-3 text-sm font-bold text-[#68747a] hover:bg-[#f8f3eb]"><X className="h-4 w-4" aria-hidden="true" />مسح</button>}</div>
    </form>

    {complaintsQuery.error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">تعذر تحميل الشكاوى. تحقق من الصلاحيات واتصال قاعدة البيانات.</p>}
    <div className="overflow-hidden rounded-[24px] border border-[#e3d9ca] bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-right text-sm"><thead className="bg-[#f8f3eb] text-[#173247]"><tr><th className="px-4 py-4 font-bold">رقم التذكرة</th><th className="px-4 py-4 font-bold">الطالب</th><th className="px-4 py-4 font-bold">التصنيف</th><th className="px-4 py-4 font-bold">الحالة</th><th className="px-4 py-4 font-bold">تاريخ الإرسال</th><th className="px-4 py-4 font-bold">التفاصيل</th></tr></thead><tbody className="divide-y divide-[#eee7dc]">{complaintsQuery.isLoading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[#68747a]">جارٍ تحميل الشكاوى…</td></tr> : complaints.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[#68747a]">لا توجد شكاوى مطابقة للفلاتر الحالية.</td></tr> : complaints.map(item => { const meta = statusMeta(item.status); return <tr key={item.id} className="hover:bg-[#fcfaf6]"><td className="px-4 py-4 font-mono text-xs font-bold text-[#173247]" dir="ltr">{item.ticketNumber}</td><td className="px-4 py-4"><p className="font-bold text-[#173247]">{item.fullName}</p><p className="mt-1 text-xs text-[#68747a]" dir="ltr">{item.email}</p></td><td className="px-4 py-4 text-[#68747a]">{categories[item.category] ?? item.category}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span></td><td className="px-4 py-4 text-xs text-[#68747a]">{formatDate(item.createdAt)}</td><td className="px-4 py-4"><button type="button" onClick={() => setSelectedId(item.id)} className="inline-flex items-center gap-2 rounded-xl border border-[#d5c5b1] px-3 py-2 text-xs font-bold text-[#173247] hover:bg-[#f8f3eb]"><MessageSquareText className="h-4 w-4" aria-hidden="true" />فتح</button></td></tr>; })}</tbody></table></div></div>

    <div className="flex flex-col gap-3 rounded-[22px] border border-[#e3d9ca] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#68747a]">عرض الصفحة {page} من {totalPages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || complaintsQuery.isFetching} onClick={() => setPage(current => current - 1)} className="inline-flex items-center gap-1 rounded-xl border border-[#e3d9ca] px-4 py-2 text-sm font-bold text-[#173247] disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" aria-hidden="true" />السابق</button><button type="button" disabled={page >= totalPages || complaintsQuery.isFetching} onClick={() => setPage(current => current + 1)} className="inline-flex items-center gap-1 rounded-xl border border-[#e3d9ca] px-4 py-2 text-sm font-bold text-[#173247] disabled:cursor-not-allowed disabled:opacity-40">التالي<ChevronLeft className="h-4 w-4" aria-hidden="true" /></button></div></div>

    {selectedId !== null && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#173247]/45 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="تفاصيل الشكوى"><div className="my-4 w-full max-w-3xl rounded-[28px] bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4 border-b border-[#eee7dc] pb-5"><div><p className="text-xs font-bold tracking-[0.14em] text-[#b9854a]">COMPLAINT DETAILS</p><h2 className="mt-2 font-display text-2xl font-bold text-[#173247]">تفاصيل الشكوى</h2></div><button type="button" onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-[#68747a] hover:bg-[#f8f3eb]" aria-label="إغلاق التفاصيل"><X className="h-5 w-5" /></button></div>{detailQuery.isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#b9854a]" /></div> : selected ? <div className="space-y-5 pt-5"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-bold text-[#68747a]">رقم التذكرة</p><p className="mt-1 font-mono font-bold text-[#173247]" dir="ltr">{selected.ticketNumber}</p></div><div><p className="text-xs font-bold text-[#68747a]">تاريخ الإرسال</p><p className="mt-1 text-sm text-[#173247]">{formatDate(selected.createdAt)}</p></div><div><p className="text-xs font-bold text-[#68747a]">بيانات التواصل</p><p className="mt-1 text-sm text-[#173247]">{selected.fullName}<br /><span dir="ltr">{selected.email}</span>{selected.whatsapp ? <><br /><span dir="ltr">واتساب: {selected.whatsapp}</span></> : null}</p></div><div><p className="text-xs font-bold text-[#68747a]">التصنيف</p><p className="mt-1 text-sm text-[#173247]">{categories[selected.category] ?? selected.category}</p></div></div><div className="rounded-2xl bg-[#fcfaf6] p-4"><p className="text-xs font-bold text-[#68747a]">نص الشكوى</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#173247]">{selected.description}</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-[#173247]">الحالة<select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value as StatusValue)} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-white px-3 py-3 font-normal outline-none focus:border-[#b9854a]"><option value="new">جديدة</option><option value="in_review">قيد المراجعة</option><option value="needs_info">تحتاج معلومات</option><option value="responded">تم الرد</option><option value="closed">مغلقة</option></select></label><div className="rounded-2xl border border-[#e3d9ca] p-4 text-sm text-[#68747a]"><p className="font-bold text-[#173247]">ملاحظة أمنية</p><p className="mt-1 leading-6">لا تشارك بيانات الطالب خارج قنوات الدعم المعتمدة، وكل تغيير يُسجّل في سجل التدقيق.</p></div></div><label className="block text-sm font-bold text-[#173247]">الرد الإداري<textarea value={responseDraft} onChange={event => setResponseDraft(event.target.value)} maxLength={5000} rows={5} placeholder="اكتب الرد أو التعليمات التي ستظهر في سجل المعالجة…" className="mt-2 w-full resize-y rounded-xl border border-[#e3d9ca] bg-white px-3 py-3 font-normal leading-7 outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" /></label><section aria-label="السجل الزمني للشكوى" className="rounded-2xl border border-[#e3d9ca] bg-[#fcfaf6] p-4"><div className="flex items-center gap-2"><History className="h-4 w-4 text-[#b9854a]" aria-hidden="true" /><h3 className="text-sm font-bold text-[#173247]">السجل الزمني للشكوى</h3></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{statusDurations.map(item => { const meta = statusMeta(item.status); return <div key={item.status} className="rounded-xl border border-[#eee7dc] bg-white px-3 py-2"><div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${meta.className}`}>{meta.label}</span><span className="text-xs font-bold text-[#173247]">{formatDuration(item.durationMs)}</span></div><p className="mt-1 text-[11px] text-[#68747a]">المدة حتى الآن</p></div>; })}</div><div className="mt-4 space-y-3">{selected.timeline?.map(event => <div key={event.id} className="relative flex gap-3 border-r-2 border-[#d5c5b1] pr-4 last:border-r-0"><span className="absolute -right-[5px] top-1 h-2 w-2 rounded-full bg-[#b9854a]" aria-hidden="true" /><div className="min-w-0 flex-1 rounded-xl border border-[#eee7dc] bg-white p-3"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-bold text-[#173247]">{timelineEventLabel(event.action, event.metadataJson)}</p><time className="text-xs text-[#68747a]">{formatDate(event.createdAt)}</time></div><p className="mt-1 text-xs text-[#68747a]">{event.actorUserId ? `مدير #${event.actorUserId}` : "الطالب"}</p></div></div>)}</div></section><div className="flex flex-col-reverse gap-3 border-t border-[#eee7dc] pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelectedId(null)} className="rounded-xl border border-[#e3d9ca] px-5 py-3 text-sm font-bold text-[#68747a] hover:bg-[#f8f3eb]">إلغاء</button><button type="button" disabled={updateMutation.isPending} onClick={saveComplaint} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173247] px-5 py-3 text-sm font-bold text-white hover:bg-[#24465e] disabled:opacity-50">{updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}حفظ التحديث</button></div></div> : <p className="py-10 text-center text-sm text-[#68747a]">تعذر العثور على الشكوى.</p>}</div></div>}
  </section>;
}

export default function AdminComplaints() {
  return <DashboardLayout><AdminComplaintsContent /></DashboardLayout>;
}
