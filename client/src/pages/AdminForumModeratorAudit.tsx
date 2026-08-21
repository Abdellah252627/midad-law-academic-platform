import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, History, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const initialFilters = { action: "all" as const, search: "", from: "", to: "", page: 1, pageSize: 25 };

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString("ar-MA", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminForumModeratorAudit() {
  const [filters, setFilters] = useState(initialFilters);
  const [draftSearch, setDraftSearch] = useState("");
  const query = trpc.admin.forumModeratorAuditLogs.useQuery(filters, { refetchOnWindowFocus: false });

  useEffect(() => {
    if (query.error) toast.error(query.error.message);
  }, [query.error]);

  const updateFilter = <K extends keyof typeof initialFilters>(key: K, value: (typeof initialFilters)[K]) => {
    setFilters(current => ({ ...current, [key]: value, page: key === "page" ? Number(value) : 1 }));
  };

  const reset = () => {
    setFilters(initialFilters);
    setDraftSearch("");
  };

  const page = query.data?.page ?? filters.page;
  const pageCount = query.data?.pageCount ?? 1;
  const rows = query.data?.rows ?? [];

  return (
    <DashboardLayout>
      <main dir="rtl" className="min-h-full bg-[#f7f3eb] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 rounded-[26px] bg-[#173247] p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-[#e1ad72]">MODERATOR AUDIT TRAIL</p>
              <h1 className="mt-2 text-2xl font-black">سجل تغييرات مشرفي المنتدى</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/75">سجل قابل للبحث يوضح عمليات منح وإلغاء صلاحيات الإشراف، مع إظهار الحد الأدنى من بيانات منفذ العملية.</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm"><ShieldCheck className="h-5 w-5 text-[#e1ad72]" /> متاح لمالك المنصة فقط</div>
          </header>

          <section className="rounded-[26px] border border-[#e3d9ca] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="audit-filters">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 id="audit-filters" className="text-lg font-black text-[#173247]">بحث وتصفية</h2><p className="text-sm text-slate-500">استخدم أكثر من معيار لتضييق النتائج.</p></div><Button variant="outline" onClick={reset} className="gap-2"><RotateCcw className="h-4 w-4" />إعادة ضبط</Button></div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div className="relative lg:col-span-2"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={draftSearch} onChange={event => setDraftSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") updateFilter("search", draftSearch); }} placeholder="اسم أو بريد المنفذ أو معرّف المستخدم" className="pr-9" aria-label="البحث في سجل المشرفين" /></div>
              <Select value={filters.action} onValueChange={value => updateFilter("action", value as typeof filters.action)}><SelectTrigger aria-label="تصفية نوع العملية"><SelectValue placeholder="نوع العملية" /></SelectTrigger><SelectContent><SelectItem value="all">كل العمليات</SelectItem><SelectItem value="grant">منح صلاحية</SelectItem><SelectItem value="revoke">إلغاء صلاحية</SelectItem></SelectContent></Select>
              <Input type="date" value={filters.from} onChange={event => updateFilter("from", event.target.value)} aria-label="من تاريخ" />
              <Input type="date" value={filters.to} onChange={event => updateFilter("to", event.target.value)} aria-label="إلى تاريخ" />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>اضغط Enter لتطبيق البحث النصي.</span><span>{query.data?.total ?? 0} نتيجة مطابقة</span></div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-[#e3d9ca] bg-white shadow-sm" aria-labelledby="audit-results">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="audit-results" className="flex items-center gap-2 text-lg font-black text-[#173247]"><History className="h-5 w-5 text-[#b9854a]" />العمليات المسجلة</h2><span className="text-sm text-slate-500">صفحة {page} من {pageCount}</span></div>
            {query.isLoading ? <div className="p-8 text-center text-sm text-slate-500">جارٍ تحميل السجل…</div> : rows.length === 0 ? <div className="p-10 text-center"><History className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-[#173247]">لا توجد نتائج مطابقة</p><p className="mt-1 text-sm text-slate-500">جرّب تغيير معايير البحث أو الفترة الزمنية.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right text-sm"><thead className="bg-[#faf7f1] text-xs text-slate-500"><tr><th className="px-5 py-3 font-semibold">التاريخ</th><th className="px-5 py-3 font-semibold">العملية</th><th className="px-5 py-3 font-semibold">المشرف المستهدف</th><th className="px-5 py-3 font-semibold">نفذها</th><th className="px-5 py-3 font-semibold">التفاصيل</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => { const granted = row.action === "forum.moderator.grant"; return <tr key={row.id} className="hover:bg-[#fcfaf6]"><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(row.createdAt)}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${granted ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{granted ? "منح صلاحية" : "إلغاء صلاحية"}</span></td><td className="px-5 py-4 font-semibold text-[#173247]">معرّف المستخدم #{row.entityId ?? "—"}</td><td className="px-5 py-4"><div className="font-semibold text-[#173247]">{row.actorName || "حساب إداري"}</div><div className="text-xs text-slate-500">{row.actorEmail || `حساب #${row.actorUserId}`}</div></td><td className="max-w-xs px-5 py-4 text-xs leading-6 text-slate-500">{row.metadataJson ? "تتضمن العملية بيانات تدقيق إضافية" : "عملية موثقة من النظام"}</td></tr>; })}</tbody></table></div>}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><Button variant="outline" size="sm" disabled={page <= 1 || query.isFetching} onClick={() => updateFilter("page", page - 1)} className="gap-2"><ArrowRight className="h-4 w-4" />السابق</Button><span className="text-xs text-slate-500">{query.isFetching ? "تحديث…" : `${query.data?.total ?? 0} سجل`}</span><Button variant="outline" size="sm" disabled={page >= pageCount || query.isFetching} onClick={() => updateFilter("page", page + 1)} className="gap-2">التالي<ArrowLeft className="h-4 w-4" /></Button></div>
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
