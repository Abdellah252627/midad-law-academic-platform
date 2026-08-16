import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Download, Loader2, ShieldAlert, Users } from "lucide-react";
import { useState } from "react";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("ar-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AdminLeadsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [exportError, setExportError] = useState("");
  const leadsQuery = trpc.admin.sampleLeads.useQuery(undefined, { enabled: isAdmin });
  const csvQuery = trpc.admin.sampleLeadsCsv.useQuery(undefined, { enabled: false });

  if (!isAdmin) {
    return (
      <section dir="rtl" className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 text-center">
        <div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-[0_20px_60px_rgba(28,50,64,0.08)]">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-700" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-[#173247]">الوصول غير مسموح</h1>
          <p className="mt-3 text-sm leading-7 text-[#68747a]">هذه الصفحة مخصصة لحسابات الإدارة المعتمدة فقط. لا يتم عرض بيانات المهتمين لهذا الحساب.</p>
        </div>
      </section>
    );
  }

  const handleExport = async () => {
    setExportError("");
    const result = await csvQuery.refetch();
    if (!result.data) {
      setExportError("تعذر تجهيز ملف CSV. حاول مرة أخرى.");
      return;
    }
    const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.data.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section dir="rtl" className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / ADMIN</p>
          <h1 className="mt-2 font-display text-3xl font-bold">بيانات المهتمين بالعينة</h1>
          <p className="mt-2 text-sm leading-7 text-white/70">عرض داخلي محدود لبيانات التسجيل المصرح بها، مرتبة من الأحدث إلى الأقدم.</p>
        </div>
        <button onClick={handleExport} disabled={csvQuery.isFetching} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#c28b4d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#d39e5d] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
          {csvQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          {csvQuery.isFetching ? "جارٍ تجهيز الملف…" : "تصدير CSV"}
        </button>
      </header>

      {exportError && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{exportError}</p>}
      {leadsQuery.error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">تعذر تحميل بيانات المهتمين. تحقق من صلاحيات الحساب ثم حاول مرة أخرى.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-[#68747a]"><Users className="h-5 w-5 text-[#b9854a]" aria-hidden="true" /><span className="text-sm font-bold">إجمالي التسجيلات</span></div>
          <p className="mt-3 text-3xl font-bold text-[#173247]">{leadsQuery.isLoading ? "…" : leadsQuery.data?.total ?? 0}</p>
        </div>
        <div className="rounded-[22px] border border-[#e3d9ca] bg-[#f8f3eb] p-5 text-sm leading-7 text-[#68747a]">تُستخدم البيانات لأغراض المتابعة المتعلقة بالعينة والمنتج. حافظ على سرية الملف المصدّر ولا تشاركه خارج فريق الإدارة.</div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[#e3d9ca] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-right text-sm">
            <thead className="bg-[#f8f3eb] text-[#173247]"><tr><th className="px-4 py-4 font-bold">الاسم</th><th className="px-4 py-4 font-bold">البريد</th><th className="px-4 py-4 font-bold">واتساب</th><th className="px-4 py-4 font-bold">المنتج</th><th className="px-4 py-4 font-bold">تاريخ التسجيل</th></tr></thead>
            <tbody className="divide-y divide-[#eee7dc]">
              {leadsQuery.isLoading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-[#68747a]">جارٍ تحميل البيانات…</td></tr> : leadsQuery.data?.leads.length ? leadsQuery.data.leads.map(lead => <tr key={lead.id} className="transition hover:bg-[#fcfaf6]"><td className="px-4 py-4 font-bold text-[#173247]">{lead.fullName}</td><td className="px-4 py-4 text-[#68747a]">{lead.email}</td><td className="px-4 py-4 text-[#68747a]" dir="ltr">{lead.whatsapp}</td><td className="px-4 py-4 text-[#68747a]">{lead.productCode}</td><td className="px-4 py-4 text-[#68747a]">{formatDate(lead.createdAt)}</td></tr>) : <tr><td colSpan={5} className="px-4 py-10 text-center text-[#68747a]">لا توجد تسجيلات حتى الآن.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function AdminLeads() {
  return <DashboardLayout><AdminLeadsContent /></DashboardLayout>;
}
