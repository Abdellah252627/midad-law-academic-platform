import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Download, Eye, FileImage, FileText, Loader2, Search, ShieldAlert, X, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("ar-MA", { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(status: string) {
  return status === "approved" ? "مقبول" : status === "rejected" ? "مرفوض" : "قيد المراجعة";
}

function statusClass(status: string) {
  return status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
}

function AdminPurchasesContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selectedProofId, setSelectedProofId] = useState<number | null>(null);
  const [approvedDownload, setApprovedDownload] = useState<{ url: string; expiresInMinutes: number } | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const purchaseQueryInput = useMemo(() => ({ search: search || undefined }), [search]);
  const requestsQuery = trpc.admin.purchaseRequests.useQuery(purchaseQueryInput, { enabled: isAdmin });
  const correctionsQuery = trpc.admin.purchaseRequestCorrections.useQuery(undefined, { enabled: isAdmin });
  const proofQuery = trpc.admin.purchaseProofUrl.useQuery(
    { requestId: selectedProofId ?? 0 },
    { enabled: isAdmin && selectedProofId !== null },
  );
  const utils = trpc.useUtils();
  const approveMutation = trpc.admin.approvePurchase.useMutation({
    onSuccess: result => { setApprovedDownload({ url: result.downloadUrl, expiresInMinutes: result.expiresInMinutes }); toast.success("تمت الموافقة وإصدار رابط تنزيل موقّت."); void utils.admin.purchaseRequests.invalidate(); },
    onError: error => toast.error(error.message || "تعذرت الموافقة على الطلب."),
  });
  const rejectMutation = trpc.admin.rejectPurchase.useMutation({
    onSuccess: () => { toast.success("تم رفض الطلب وتسجيل السبب."); void utils.admin.purchaseRequests.invalidate(); },
    onError: error => toast.error(error.message || "تعذر رفض الطلب."),
  });
  const reissueDownloadMutation = trpc.admin.reissuePurchaseDownload.useMutation({
    onSuccess: result => { setApprovedDownload({ url: result.downloadUrl, expiresInMinutes: result.expiresInMinutes }); toast.success("تم إصدار رابط تنزيل جديد صالح لمدة 15 دقيقة."); },
    onError: error => toast.error(error.message || "تعذر إصدار رابط التنزيل."),
  });
  const reviewCorrectionMutation = trpc.admin.reviewPurchaseRequestCorrection.useMutation({
    onSuccess: () => { toast.success("تم تحديث طلب التصحيح وتسجيل القرار."); void correctionsQuery.refetch(); void requestsQuery.refetch(); },
    onError: error => toast.error(error.message || "تعذر مراجعة طلب التصحيح."),
  });

  if (!isAdmin) {
    return <section dir="rtl" className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 text-center"><div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm"><ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-700" aria-hidden="true" /><h1 className="font-display text-2xl font-bold text-[#173247]">الوصول غير مسموح</h1><p className="mt-3 text-sm leading-7 text-[#68747a]">هذه الصفحة مخصصة لحسابات الإدارة المعتمدة فقط.</p></div></section>;
  }

  const requests = requestsQuery.data?.requests ?? [];
  const approve = (requestId: number) => approveMutation.mutate({ requestId });
  const reject = (requestId: number) => {
    const reason = window.prompt("اكتب سبب رفض التحويل:");
    if (reason?.trim()) rejectMutation.mutate({ requestId, reason: reason.trim() });
  };
  const reissueDownload = (requestId: number) => reissueDownloadMutation.mutate({ requestId });
  const reviewCorrection = (correctionId: number, decision: "approved" | "rejected") => {
    const decisionNote = window.prompt(decision === "approved" ? "ملاحظة الموافقة (اختياري):" : "سبب رفض التصحيح (اختياري):") || undefined;
    reviewCorrectionMutation.mutate({ correctionId, decision, decisionNote });
  };
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchDraft.trim().slice(0, 160));
  };
  const clearSearch = () => {
    setSearchDraft("");
    setSearch("");
  };

  return <section dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / PAYMENTS</p>
      <h1 className="mt-2 font-display text-3xl font-bold">طلبات الشراء والدفع</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">راجع التحويلات البنكية، عاين إثبات الدفع داخل اللوحة، ثم وافق أو ارفض الطلب مع تسجيل القرار.</p>
    </header>

    {approvedDownload && <div role="status" className="flex flex-col gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">تم إصدار رابط التنزيل</p><p className="mt-1 text-sm">الرابط صالح لمدة {approvedDownload.expiresInMinutes} دقيقة فقط. شاركه عبر قناة التسليم المعتمدة.</p></div><a href={approvedDownload.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">فتح ملف PDF</a></div>}
    {requestsQuery.error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">تعذر تحميل طلبات الشراء. تحقق من اتصال قاعدة البيانات وصلاحيات الحساب ثم أعد المحاولة.</p>}
    <form onSubmit={handleSearch} className="flex flex-col gap-3 rounded-[22px] border border-[#e3d9ca] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8f80]" aria-hidden="true" />
        <input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="ابحث باسم العميل أو بريده الإلكتروني" aria-label="البحث في طلبات الشراء" maxLength={160} className="w-full rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] py-3 pr-10 pl-4 text-sm text-[#173247] outline-none transition focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-xl bg-[#173247] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#24465e] active:scale-[0.98]">بحث</button>
        {(search || searchDraft) && <button type="button" onClick={clearSearch} className="inline-flex items-center gap-1 rounded-xl border border-[#e3d9ca] px-4 py-3 text-sm font-bold text-[#68747a] transition hover:bg-[#f8f3eb]"><X className="h-4 w-4" aria-hidden="true" />مسح</button>}
      </div>
    </form>
    <div className="grid gap-4 sm:grid-cols-3">
      {[["الإجمالي", requests.length], ["قيد المراجعة", requests.filter(item => item.status === "pending").length], ["المقبولة", requests.filter(item => item.status === "approved").length]].map(([label, value]) => <div key={label as string} className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">{label as string}</p><p className="mt-2 text-3xl font-bold text-[#173247]">{requestsQuery.isLoading ? "…" : value as number}</p></div>)}
    </div>

    <div className="overflow-hidden rounded-[24px] border border-[#e3d9ca] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[#eee7dc] bg-[#f8f3eb] px-5 py-4"><div><h2 className="font-display text-lg font-bold text-[#173247]">طلبات تصحيح بيانات التواصل</h2><p className="mt-1 text-xs text-[#68747a]">تُطبّق الموافقة البريد أو رقم الواتساب على طلب الشراء، وتُسجّل العملية في سجل التدقيق.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{correctionsQuery.data?.filter(item => item.status === "pending").length ?? 0} معلّق</span></div>
      <div className="overflow-x-auto"><table className="min-w-[950px] w-full text-right text-sm"><thead className="bg-white text-[#173247]"><tr><th className="px-4 py-4 font-bold">رقم الطلب</th><th className="px-4 py-4 font-bold">القيم السابقة</th><th className="px-4 py-4 font-bold">القيم المطلوبة</th><th className="px-4 py-4 font-bold">السبب</th><th className="px-4 py-4 font-bold">الحالة</th><th className="px-4 py-4 font-bold">الإجراء</th></tr></thead><tbody className="divide-y divide-[#eee7dc]">{correctionsQuery.isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#68747a]">جارٍ تحميل طلبات التصحيح…</td></tr> : (correctionsQuery.data ?? []).length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#68747a]">لا توجد طلبات تصحيح.</td></tr> : (correctionsQuery.data ?? []).map(item => <tr key={item.id} className="hover:bg-[#fcfaf6]"><td className="px-4 py-4 font-mono text-xs text-[#173247]">#{item.requestId}</td><td className="px-4 py-4 text-xs leading-6 text-[#68747a]">{item.oldEmail}<br />{item.oldPhone || "—"}</td><td className="px-4 py-4 text-xs leading-6 text-[#173247]">{item.requestedEmail || "—"}<br />{item.requestedPhone || "—"}</td><td className="max-w-[220px] px-4 py-4 text-xs leading-6 text-[#68747a]">{item.reason || "—"}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td><td className="px-4 py-4">{item.status === "pending" ? <div className="flex gap-2"><button type="button" onClick={() => reviewCorrection(item.id, "approved")} disabled={reviewCorrectionMutation.isPending} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">موافقة</button><button type="button" onClick={() => reviewCorrection(item.id, "rejected")} disabled={reviewCorrectionMutation.isPending} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">رفض</button></div> : <span className="text-xs text-[#68747a]">تمت المراجعة</span>}</td></tr>)}</tbody></table></div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#68747a]"><span>{search ? `نتائج البحث عن «${search}»` : "جميع طلبات الشراء"} — {requestsQuery.isFetching ? "جارٍ التحديث…" : `${requests.length} طلب`}</span></div>
    <div className="overflow-hidden rounded-[24px] border border-[#e3d9ca] bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-right text-sm">
        <thead className="bg-[#f8f3eb] text-[#173247]"><tr><th className="px-4 py-4 font-bold">بيانات العميل</th><th className="px-4 py-4 font-bold">المنتج</th><th className="px-4 py-4 font-bold">مرجع التحويل</th><th className="px-4 py-4 font-bold">إثبات التحويل</th><th className="px-4 py-4 font-bold">الحالة</th><th className="px-4 py-4 font-bold">التاريخ</th><th className="px-4 py-4 font-bold">الإجراء</th></tr></thead>
        <tbody className="divide-y divide-[#eee7dc]">
          {requestsQuery.isLoading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-[#68747a]">جارٍ تحميل الطلبات…</td></tr> : requests.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-[#68747a]">{search ? `لا توجد طلبات مطابقة لـ «${search}».` : "لا توجد طلبات شراء حتى الآن."}</td></tr> : requests.map(request => <tr key={request.id} className="transition hover:bg-[#fcfaf6]">
            <td className="min-w-[240px] px-4 py-4"><div className="rounded-2xl bg-[#fcfaf6] p-3"><p className="font-bold text-[#173247]">{request.customerName}</p><p className="mt-1 break-all text-xs text-[#68747a]" dir="ltr">{request.customerEmail}</p><p className="mt-1 text-xs text-[#68747a]" dir="ltr">واتساب: {request.customerPhone || "غير مُدخل"}</p></div></td>
            <td className="px-4 py-4 text-[#68747a]">{request.productCode}</td>
            <td className="px-4 py-4 font-mono text-xs text-[#68747a]" dir="ltr">{request.transactionReference}</td>
            <td className="px-4 py-4">{request.proofKey ? <div className="flex flex-col items-start gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700"><FileImage className="h-3.5 w-3.5" />مرفق</span><button type="button" onClick={() => setSelectedProofId(request.id)} className="inline-flex items-center gap-2 rounded-full bg-[#f8f3eb] px-3 py-2 text-xs font-bold text-[#173247] hover:bg-[#efe5d6]"><Eye className="h-4 w-4" />معاينة الإثبات</button></div> : <span className="text-xs text-[#68747a]">غير مرفق</span>}</td>
            <td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(request.status)}`}>{statusLabel(request.status)}</span>{request.rejectionReason && <p className="mt-2 max-w-[180px] text-xs leading-5 text-red-700">{request.rejectionReason}</p>}</td>
            <td className="px-4 py-4 text-xs text-[#68747a]">{formatDate(request.createdAt)}</td>
            <td className="px-4 py-4">{request.status === "pending" ? <div className="flex gap-2"><button type="button" onClick={() => approve(request.id)} disabled={approveMutation.isPending || rejectMutation.isPending || reissueDownloadMutation.isPending} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />قبول</button><button type="button" onClick={() => reject(request.id)} disabled={approveMutation.isPending || rejectMutation.isPending || reissueDownloadMutation.isPending} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" />رفض</button></div> : request.status === "approved" ? <button type="button" onClick={() => reissueDownload(request.id)} disabled={reissueDownloadMutation.isPending} className="inline-flex items-center gap-1 rounded-lg bg-[#173247] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#214963] disabled:opacity-50" title="إصدار رابط تنزيل صالح لمدة 15 دقيقة"><Download className="h-4 w-4" />إصدار رابط PDF</button> : <span className="text-xs text-[#68747a]">تمت المراجعة</span>}</td>
          </tr>)}
        </tbody>
      </table></div>
    </div>

    {selectedProofId !== null && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-[#173247]/70 p-4" onClick={() => setSelectedProofId(null)}><div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[26px] bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-[#173247]">معاينة إثبات الدفع</h2><button type="button" onClick={() => setSelectedProofId(null)} className="rounded-lg p-2 text-[#68747a] hover:bg-[#f8f3eb]" aria-label="إغلاق">×</button></div>{proofQuery.isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#b9854a]" /></div> : proofQuery.error ? <p role="alert" className="rounded-xl bg-red-50 p-6 text-center text-sm font-bold text-red-700">تعذرت معاينة إثبات الدفع. قد يكون الرابط المؤقت انتهت صلاحيته؛ أغلق النافذة ثم أعد فتح المعاينة.</p> : proofQuery.data?.url ? proofQuery.data.contentType?.startsWith("image/") ? <img src={proofQuery.data.url} alt="إثبات الدفع" className="mx-auto max-h-[70vh] rounded-xl object-contain" /> : <iframe src={proofQuery.data.url} title="إثبات الدفع PDF" className="h-[70vh] w-full rounded-xl border" /> : <div className="py-16 text-center text-[#68747a]"><FileImage className="mx-auto mb-3 h-10 w-10" />لا يوجد إثبات متاح لهذا الطلب.</div>}<p className="mt-4 flex items-center gap-2 text-xs text-[#68747a]"><FileText className="h-4 w-4" />الرابط مؤقت ومخصص للمراجعة الإدارية فقط.</p></div></div>}
  </section>;
}

export default function AdminPurchases() {
  return <DashboardLayout><AdminPurchasesContent /></DashboardLayout>;
}
