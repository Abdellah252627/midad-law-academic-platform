import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Check, Loader2, Search, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const statuses = [
  { value: "new", label: "جديدة", className: "bg-sky-50 text-sky-700" },
  { value: "contacted", label: "تم التواصل", className: "bg-emerald-50 text-emerald-700" },
  { value: "closed", label: "مغلقة", className: "bg-slate-100 text-slate-700" },
] as const;
type StatusValue = (typeof statuses)[number]["value"];

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("ar-MA", { dateStyle: "medium", timeStyle: "short" });
}

function statusMeta(value: string) {
  return statuses.find(item => item.value === value) ?? statuses[0];
}

function AdminFollowUpsContent() {
  const { data: isAuthorizedAdmin } = trpc.auth.isAdmin.useQuery();
  const isAdmin = isAuthorizedAdmin === true;
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusValue | "all">("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusValue>("new");
  const [adminNote, setAdminNote] = useState("");
  const queryInput = useMemo(() => ({ search: search || undefined, status: status === "all" ? undefined : status, page, pageSize: 25 }), [search, status, page]);
  const listQuery = trpc.admin.supportFollowUps.useQuery(queryInput, { enabled: isAdmin });
  const detailQuery = trpc.admin.supportFollowUp.useQuery({ id: selectedId ?? 0 }, { enabled: isAdmin && selectedId !== null });
  const queryUtils = trpc.useUtils();
  const markReadMutation = trpc.admin.markSupportFollowUpRead.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديد طلب التواصل كمقروء دون تغيير حالته.");
      await Promise.all([
        queryUtils.admin.supportFollowUps.invalidate(),
        queryUtils.admin.newSupportFollowUpCount.invalidate(),
      ]);
      if (selectedId !== null) await detailQuery.refetch();
    },
    onError: error => toast.error(error.message || "تعذر تحديد الطلب كمقروء."),
  });
  const updateMutation = trpc.admin.updateSupportFollowUp.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديث طلب المتابعة وتسجيل العملية.");
      await Promise.all([
        queryUtils.admin.supportFollowUps.invalidate(),
        queryUtils.admin.newSupportFollowUpCount.invalidate(),
      ]);
      if (selectedId !== null) await detailQuery.refetch();
    },
    onError: error => toast.error(error.message || "تعذر تحديث طلب المتابعة."),
  });

  if (!isAdmin) {
    return <section dir="rtl" className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 text-center"><div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm"><ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-700" aria-hidden="true" /><h1 className="font-display text-2xl font-bold text-[#173247]">الوصول غير مسموح</h1><p className="mt-3 text-sm leading-7 text-[#68747a]">هذه الصفحة مخصصة لحسابات الإدارة المعتمدة فقط.</p></div></section>;
  }

  const rows = listQuery.data?.followUps ?? [];
  const selected = detailQuery.data;
  const totalPages = listQuery.data?.totalPages ?? 1;

  const openDetail = (id: number) => {
    setSelectedId(id);
    const row = rows.find(item => item.id === id);
    setSelectedStatus((row?.status ?? "new") as StatusValue);
    setAdminNote(row?.adminNote ?? "");
  };
  const save = () => {
    if (selectedId === null) return;
    updateMutation.mutate({ id: selectedId, status: selectedStatus, adminNote: adminNote.trim() || null });
  };
  const markAsRead = (id: number) => markReadMutation.mutate({ id });
  const clearFilters = () => { setSearchDraft(""); setSearch(""); setStatus("all"); setPage(1); };

  return <section dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / FOLLOW-UP</p>
      <h1 className="mt-2 font-display text-3xl font-bold">طلبات التواصل اللاحق</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">راجع الرسائل وبيانات التواصل التي تركها الزوار خارج أوقات العمل، ثم حدّث الحالة بعد التواصل معهم. تُعرض هذه البيانات داخل Back Office فقط.</p>
    </header>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">إجمالي الطلبات</p><p className="mt-2 text-3xl font-bold text-[#173247]">{listQuery.isLoading ? "…" : listQuery.data?.total ?? 0}</p></div>
      <div className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">جديدة</p><p className="mt-2 text-3xl font-bold text-[#173247]">{listQuery.data?.statusCounts?.new ?? 0}</p></div>
      <div className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">تم التواصل</p><p className="mt-2 text-3xl font-bold text-[#173247]">{listQuery.data?.statusCounts?.contacted ?? 0}</p></div>
    </div>

    <form onSubmit={event => { event.preventDefault(); setSearch(searchDraft.trim().slice(0, 160)); setPage(1); }} className="grid gap-3 rounded-[22px] border border-[#e3d9ca] bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
      <div className="relative flex-1"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8f80]" aria-hidden="true" /><input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="ابحث برقم الهاتف أو البريد الإلكتروني أو الرسالة" aria-label="البحث في طلبات التواصل" maxLength={160} className="w-full rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] py-3 pr-10 pl-4 text-sm text-[#173247] outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" /></div>
      <label className="flex items-center gap-2 text-sm font-bold text-[#173247]"><span>الحالة</span><select value={status} onChange={event => { setStatus(event.target.value as StatusValue | "all"); setPage(1); }} aria-label="تصفية طلبات التواصل حسب الحالة" className="rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 text-sm font-bold outline-none focus:border-[#b9854a]"><option value="all">كل الحالات</option>{statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <div className="flex gap-2"><button type="submit" className="rounded-xl bg-[#173247] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#24465e] active:scale-[0.98]">بحث</button>{(search || searchDraft || status !== "all") && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-xl border border-[#e3d9ca] px-4 py-3 text-sm font-bold text-[#68747a] hover:bg-[#f8f3eb]"><X className="h-4 w-4" aria-hidden="true" />مسح</button>}</div>
    </form>

    {listQuery.error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">تعذر تحميل طلبات التواصل.</p>}
    <div className="overflow-hidden rounded-[24px] border border-[#e3d9ca] bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-right text-sm"><thead className="bg-[#f8f3eb] text-[#173247]"><tr><th className="px-4 py-4 font-bold">التاريخ</th><th className="px-4 py-4 font-bold">بيانات التواصل</th><th className="px-4 py-4 font-bold">الرسالة</th><th className="px-4 py-4 font-bold">الحالة</th><th className="px-4 py-4 font-bold">الإجراء</th></tr></thead><tbody>{rows.map(row => { const meta = statusMeta(row.status); return <tr key={row.id} className="border-t border-[#eee7dc] align-top"><td className="px-4 py-4 text-xs text-[#68747a]">{formatDate(row.createdAt)}</td><td className="px-4 py-4 text-xs text-[#173247]"><div className="space-y-1" dir="ltr">{row.phone && <p className="font-mono">{row.phone}</p>}{row.email && <p className="break-all text-[#68747a]">{row.email}</p>}{!row.phone && !row.email && <p>—</p>}</div></td><td className="max-w-[360px] whitespace-pre-wrap px-4 py-4 leading-6 text-[#173247]">{row.message || "—"}</td><td className="px-4 py-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>{row.isRead ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">مقروء</span> : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">غير مقروء</span>}</div></td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openDetail(row.id)} className="rounded-xl border border-[#b9854a] px-3 py-2 text-xs font-bold text-[#89663b] hover:bg-[#fffaf1]">مراجعة</button>{!row.isRead && <button type="button" disabled={markReadMutation.isPending} onClick={() => markAsRead(row.id)} className="inline-flex items-center gap-1 rounded-xl border border-[#173247] px-3 py-2 text-xs font-bold text-[#173247] hover:bg-[#eef5f7] disabled:opacity-50"><Check className="h-3.5 w-3.5" aria-hidden="true" />تحديد كمقروء</button>}</div></td></tr>; })}</tbody></table>{!listQuery.isLoading && !rows.length && <p className="px-4 py-12 text-center text-sm text-[#68747a]">لا توجد طلبات متابعة مطابقة.</p>}</div></div>
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e3d9ca] bg-white px-4 py-3 text-sm"><span className="text-[#68747a]">صفحة {page} من {totalPages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded-xl border border-[#e3d9ca] px-3 py-2 font-bold disabled:opacity-40">السابق</button><button type="button" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)} className="rounded-xl border border-[#e3d9ca] px-3 py-2 font-bold disabled:opacity-40">التالي</button></div></div>

    {selectedId !== null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173247]/45 p-4" role="dialog" aria-modal="true" aria-label="تفاصيل طلب المتابعة"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.15em] text-[#b9854a]">FOLLOW-UP #{selectedId}</p><h2 className="mt-2 font-display text-2xl font-bold text-[#173247]">مراجعة طلب التواصل</h2></div><button type="button" onClick={() => setSelectedId(null)} aria-label="إغلاق التفاصيل" className="rounded-full p-2 text-[#68747a] hover:bg-[#f8f3eb]"><X className="h-5 w-5" /></button></div>{detailQuery.isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#b9854a]" /></div> : selected ? <div className="mt-6 space-y-5"><div className="grid gap-3 rounded-2xl bg-[#fcfaf6] p-4 sm:grid-cols-2"><div><p className="text-xs font-bold text-[#68747a]">حالة القراءة</p><p className="mt-1 text-sm font-bold text-[#173247]">{selected.isRead ? "مقروء" : "غير مقروء"}</p></div><div><p className="text-xs font-bold text-[#68747a]">تاريخ الإرسال</p><p className="mt-1 text-sm text-[#173247]">{formatDate(selected.createdAt)}</p></div><div><p className="text-xs font-bold text-[#68747a]">رقم الهاتف</p><p className="mt-1 font-mono text-sm text-[#173247]" dir="ltr">{selected.phone || "لم يُترك رقم"}</p></div><div><p className="text-xs font-bold text-[#68747a]">البريد الإلكتروني</p><p className="mt-1 break-all text-sm text-[#173247]" dir="ltr">{selected.email || "لم يُترك بريد"}</p></div></div><div className="rounded-2xl border border-[#e3d9ca] p-4"><p className="text-xs font-bold text-[#68747a]">الرسالة</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#173247]">{selected.message || "لم تُكتب رسالة"}</p></div><label className="block text-sm font-bold text-[#173247]">الحالة<select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value as StatusValue)} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-white px-3 py-3 font-normal outline-none focus:border-[#b9854a]"><option value="new">جديدة</option><option value="contacted">تم التواصل</option><option value="closed">مغلقة</option></select></label><label className="block text-sm font-bold text-[#173247]">ملاحظة داخلية<textarea value={adminNote} onChange={event => setAdminNote(event.target.value)} maxLength={500} rows={4} placeholder="مثلاً: تمت محاولة التواصل عبر WhatsApp…" className="mt-2 w-full resize-y rounded-xl border border-[#e3d9ca] bg-white px-3 py-3 font-normal leading-7 outline-none focus:border-[#b9854a]" /></label><div className="flex flex-col-reverse gap-3 border-t border-[#eee7dc] pt-5 sm:flex-row sm:justify-end">{selected && !selected.isRead && <button type="button" disabled={markReadMutation.isPending} onClick={() => markAsRead(selected.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#173247] px-5 py-3 text-sm font-bold text-[#173247] disabled:opacity-50"><Check className="h-4 w-4" aria-hidden="true" />تحديد كمقروء</button>}<button type="button" onClick={() => setSelectedId(null)} className="rounded-xl border border-[#e3d9ca] px-5 py-3 text-sm font-bold text-[#68747a]">إلغاء</button><button type="button" disabled={updateMutation.isPending} onClick={save} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173247] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}حفظ التحديث</button></div></div> : <p className="py-12 text-center text-sm text-[#68747a]">تعذر العثور على الطلب.</p>}</div></div>}
  </section>;
}

export default function AdminFollowUps() {
  return <DashboardLayout><AdminFollowUpsContent /></DashboardLayout>;
}
