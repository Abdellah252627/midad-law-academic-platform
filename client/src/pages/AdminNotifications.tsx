import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Bell, Check, ChevronLeft, Filter, Loader2, Search, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type NotificationType = "purchase_request" | "support_follow_up" | "complaint";
type ReadFilter = "all" | "read" | "unread";
type Priority = "all" | "high" | "critical";

const typeMeta: Record<NotificationType, { label: string; className: string }> = {
  purchase_request: { label: "طلب شراء", className: "bg-blue-50 text-blue-700" },
  support_follow_up: { label: "طلب تواصل", className: "bg-emerald-50 text-emerald-700" },
  complaint: { label: "شكوى", className: "bg-red-50 text-red-700" },
};

const priorityMeta: Record<Exclude<Priority, "all">, { label: string; className: string }> = {
  high: { label: "عالية", className: "bg-amber-50 text-amber-700" },
  critical: { label: "حرجة", className: "bg-red-50 text-red-700" },
};

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("ar-MA", { dateStyle: "medium", timeStyle: "short" });
}

function AdminNotificationsContent() {
  const { data: isAuthorizedAdmin, isLoading: authLoading } = trpc.auth.isAdmin.useQuery();
  const isAdmin = isAuthorizedAdmin === true;
  const [, navigate] = useLocation();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<NotificationType | "all">("all");
  const [read, setRead] = useState<ReadFilter>("all");
  const [priority, setPriority] = useState<Priority>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [confirmAllReadOpen, setConfirmAllReadOpen] = useState(false);
  const queryInput = useMemo(() => ({
    type: type === "all" ? undefined : type,
    read: read === "all" ? undefined : read,
    priority: priority === "all" ? undefined : priority,
    search: search || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize: 25,
  }), [from, page, priority, read, search, to, type]);
  const query = trpc.admin.notifications.useQuery(queryInput, { enabled: isAdmin });
  const unreadQuery = trpc.admin.notificationUnreadCount.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const markRead = trpc.admin.markNotificationRead.useMutation({
    onSuccess: async () => {
      toast.success("تم تحديد التنبيه كمقروء.");
      await Promise.all([utils.admin.notifications.invalidate(), utils.admin.notificationUnreadCount.invalidate()]);
    },
    onError: error => toast.error(error.message || "تعذر تحديث التنبيه."),
  });
  const markAllRead = trpc.admin.markAllNotificationsRead.useMutation({
    onSuccess: async result => {
      setConfirmAllReadOpen(false);
      toast.success(result.updated ? `تم تحديد ${result.updated} تنبيهات كمقروءة.` : "لا توجد تنبيهات غير مقروءة.");
      await Promise.all([utils.admin.notifications.invalidate(), utils.admin.notificationUnreadCount.invalidate()]);
    },
    onError: error => toast.error(error.message || "تعذر تحديث التنبيهات."),
  });

  if (authLoading) return null;
  if (!isAdmin) return <section dir="rtl" className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 text-center"><div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm"><ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-700" aria-hidden="true" /><h1 className="font-display text-2xl font-bold text-[#173247]">الوصول غير مسموح</h1><p className="mt-3 text-sm leading-7 text-[#68747a]">هذه الصفحة مخصصة لحسابات الإدارة المعتمدة فقط.</p></div></section>;

  const rows = query.data?.notifications ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));
  const clearFilters = () => { setSearchDraft(""); setSearch(""); setType("all"); setRead("all"); setPriority("all"); setFrom(""); setTo(""); setPage(1); };
  const hasFilters = Boolean(search || searchDraft || from || to || type !== "all" || read !== "all" || priority !== "all");
  const openNotification = (row: (typeof rows)[number]) => {
    if (!row.isRead) markRead.mutate({ id: row.id });
    if (row.targetPath) navigate(row.targetPath);
  };

  return <section dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / NOTIFICATIONS</p><h1 className="mt-2 font-display text-3xl font-bold">كل التنبيهات</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">مركز موحد لمتابعة طلبات الشراء والتواصل والشكاوى الواردة إلى Back Office، مع إبقاء حالة كل تنبيه مستقلة عن حالة الطلب الأصلي.</p></div><Bell className="hidden h-10 w-10 text-[#d5a15f] sm:block" aria-hidden="true" /></div>
    </header>

    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">إجمالي النتائج</p><p className="mt-2 text-3xl font-bold text-[#173247]">{query.isLoading ? "…" : total}</p></div><div className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">غير مقروءة حالياً</p><p className="mt-2 text-3xl font-bold text-[#b9854a]">{unreadQuery.isLoading ? "…" : unreadQuery.data ?? 0}</p></div><div className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">المعروض في الصفحة</p><p className="mt-2 text-3xl font-bold text-[#173247]">{rows.length}</p></div></div>

    <form onSubmit={event => { event.preventDefault(); setSearch(searchDraft.trim().slice(0, 160)); setPage(1); }} className="space-y-4 rounded-[22px] border border-[#e3d9ca] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8f80]" aria-hidden="true" /><input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="ابحث في عنوان التنبيه أو رسالته أو رقم الكيان" aria-label="البحث في التنبيهات" maxLength={160} className="w-full rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] py-3 pr-10 pl-4 text-sm text-[#173247] outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" /></div><button type="submit" className="rounded-xl bg-[#173247] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#24465e] active:scale-[0.98]">بحث</button>{hasFilters && <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#e3d9ca] px-4 py-3 text-sm font-bold text-[#68747a] hover:bg-[#f8f3eb]"><X className="h-4 w-4" aria-hidden="true" />مسح</button>}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label className="text-sm font-bold text-[#173247]">النوع<select value={type} onChange={event => { setType(event.target.value as NotificationType | "all"); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 font-normal outline-none focus:border-[#b9854a]"><option value="all">كل الأنواع</option><option value="purchase_request">طلبات الشراء</option><option value="support_follow_up">طلبات التواصل</option><option value="complaint">الشكاوى</option></select></label><label className="text-sm font-bold text-[#173247]">القراءة<select value={read} onChange={event => { setRead(event.target.value as ReadFilter); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 font-normal outline-none focus:border-[#b9854a]"><option value="all">الكل</option><option value="unread">غير مقروءة</option><option value="read">مقروءة</option></select></label><label className="text-sm font-bold text-[#173247]">الأولوية<select value={priority} onChange={event => { setPriority(event.target.value as Priority); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 font-normal outline-none focus:border-[#b9854a]"><option value="all">كل الأولويات</option><option value="critical">حرجة</option><option value="high">عالية</option></select></label><label className="text-sm font-bold text-[#173247]">من تاريخ<input type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 font-normal outline-none focus:border-[#b9854a]" /></label><label className="text-sm font-bold text-[#173247]">إلى تاريخ<input type="date" value={to} onChange={event => { setTo(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 outline-none focus:border-[#b9854a]" /></label></div>
    </form>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e3d9ca] bg-white px-4 py-3 shadow-sm"><p className="inline-flex items-center gap-2 text-sm text-[#68747a]"><Filter className="h-4 w-4 text-[#b9854a]" aria-hidden="true" /> يطبّق هذا الإجراء على جميع التنبيهات غير المقروءة، وليس على النتائج الظاهرة فقط.</p><button type="button" disabled={markAllRead.isPending || (unreadQuery.data ?? 0) === 0} onClick={() => setConfirmAllReadOpen(true)} className="rounded-xl bg-[#173247] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#24465e] disabled:cursor-not-allowed disabled:opacity-50">{markAllRead.isPending ? "جارٍ التحديث…" : "تحديد الكل كمقروء"}</button></div>

    <AlertDialog open={confirmAllReadOpen} onOpenChange={setConfirmAllReadOpen}><AlertDialogContent dir="rtl" className="border-[#e3d9ca] bg-[#fffdf9] text-right"><AlertDialogHeader><AlertDialogTitle className="font-display text-xl text-[#173247]">تأكيد تحديد الكل كمقروء</AlertDialogTitle><AlertDialogDescription className="leading-7 text-[#68747a]">سيتم تعليم <strong className="text-[#173247]">{unreadQuery.data ?? 0}</strong> تنبيهاً غير مقروء كمقروء. هذا الإجراء لا يغيّر حالة طلبات الشراء أو طلبات التواصل أو الشكاوى الأصلية، ولا يمكن التراجع عنه من هذه الصفحة.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={markAllRead.isPending} className="border-[#e3d9ca]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={markAllRead.isPending} onClick={event => { event.preventDefault(); markAllRead.mutate(); }} className="bg-[#173247] hover:bg-[#24465e]">{markAllRead.isPending ? "جارٍ التنفيذ…" : "نعم، تحديد الكل كمقروء"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

    {query.isError && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">تعذر تحميل التنبيهات حالياً.</p>}
    <div className="overflow-hidden rounded-[24px] border border-[#e3d9ca] bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-right text-sm"><thead className="bg-[#f8f3eb] text-[#173247]"><tr><th className="px-4 py-4 font-bold">التنبيه</th><th className="px-4 py-4 font-bold">النوع والأولوية</th><th className="px-4 py-4 font-bold">التاريخ</th><th className="px-4 py-4 font-bold">الحالة</th><th className="px-4 py-4 font-bold">الإجراء</th></tr></thead><tbody>{rows.map(row => { const kind = typeMeta[row.type as NotificationType] ?? { label: row.type, className: "bg-slate-100 text-slate-700" }; const level = priorityMeta[row.priority as Exclude<Priority, "all">] ?? priorityMeta.high; return <tr key={row.id} className={`border-t border-[#eee7dc] align-top transition-colors ${row.isRead ? "bg-white" : "bg-[#fffaf1]"}`}><td className="max-w-[450px] px-4 py-4"><p className={`font-bold ${row.isRead ? "text-[#173247]" : "text-[#8b5f2b]"}`}>{row.title}</p><p className="mt-1 whitespace-pre-wrap leading-6 text-[#68747a]">{row.message}</p>{row.entityId && <p className="mt-2 text-xs font-mono text-[#9b8f80]">#{row.entityId}</p>}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${kind.className}`}>{kind.label}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${level.className}`}>{level.label}</span></div></td><td className="whitespace-nowrap px-4 py-4 text-xs text-[#68747a]">{formatDate(row.createdAt)}</td><td className="px-4 py-4">{row.isRead ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">مقروء</span> : <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">غير مقروء</span>}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openNotification(row)} className="inline-flex items-center gap-1 rounded-xl bg-[#173247] px-3 py-2 text-xs font-bold text-white hover:bg-[#24465e]">فتح <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /></button>{!row.isRead && <button type="button" disabled={markRead.isPending} onClick={() => markRead.mutate({ id: row.id })} className="inline-flex items-center gap-1 rounded-xl border border-[#173247] px-3 py-2 text-xs font-bold text-[#173247] disabled:opacity-50"><Check className="h-3.5 w-3.5" aria-hidden="true" />مقروء</button>}</div></td></tr>; })}</tbody></table>{query.isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#b9854a]" /></div>}{!query.isLoading && !rows.length && <div className="px-4 py-14 text-center"><Bell className="mx-auto h-10 w-10 text-[#d5a15f]" aria-hidden="true" /><p className="mt-3 text-sm font-bold text-[#173247]">لا توجد تنبيهات مطابقة</p><p className="mt-1 text-sm text-[#68747a]">جرّب تغيير معايير البحث أو التصفية.</p></div>}</div></div>
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e3d9ca] bg-white px-4 py-3 text-sm"><span className="text-[#68747a]">صفحة {page} من {totalPages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || query.isFetching} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded-xl border border-[#e3d9ca] px-3 py-2 font-bold disabled:opacity-40">السابق</button><button type="button" disabled={page >= totalPages || query.isFetching} onClick={() => setPage(value => value + 1)} className="rounded-xl border border-[#e3d9ca] px-3 py-2 font-bold disabled:opacity-40">التالي</button></div></div>
  </section>;
}

export default function AdminNotifications() {
  return <DashboardLayout><AdminNotificationsContent /></DashboardLayout>;
}
