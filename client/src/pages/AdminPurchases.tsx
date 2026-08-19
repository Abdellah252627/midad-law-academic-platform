import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Download, ExternalLink, Eye, FileImage, FileText, History, Loader2, Pencil, Plus, Search, ShieldAlert, Trash2, X, XCircle } from "lucide-react";
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
  const { data: isAuthorizedAdmin } = trpc.auth.isAdmin.useQuery();
  const isAdmin = isAuthorizedAdmin === true;
  const [selectedProofId, setSelectedProofId] = useState<number | null>(null);
  const [selectedNoteRequestId, setSelectedNoteRequestId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [approvedDownload, setApprovedDownload] = useState<{ url: string; expiresInMinutes: number } | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "orderNumber" | "customer">("all");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [includeTestOrders, setIncludeTestOrders] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 50 | 100 | 200>(50);
  const purchaseQueryInput = useMemo(() => ({ search: search || undefined, searchScope, status: status === "all" ? undefined : status, includeTestOrders, page, pageSize }), [search, searchScope, status, includeTestOrders, page, pageSize]);
  const requestsQuery = trpc.admin.purchaseRequests.useQuery(purchaseQueryInput, { enabled: isAdmin });
  const correctionsQuery = trpc.admin.purchaseRequestCorrections.useQuery(undefined, { enabled: isAdmin });
  const notesQuery = trpc.admin.purchaseRequestNotes.useQuery(
    { requestId: selectedNoteRequestId ?? 0 },
    { enabled: isAdmin && selectedNoteRequestId !== null },
  );
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
  const createNoteMutation = trpc.admin.createPurchaseRequestNote.useMutation({
    onSuccess: () => { toast.success("تمت إضافة الملاحظة وتسجيل العملية."); setNoteDraft(""); void notesQuery.refetch(); },
    onError: error => toast.error(error.message || "تعذرت إضافة الملاحظة."),
  });
  const updateNoteMutation = trpc.admin.updatePurchaseRequestNote.useMutation({
    onSuccess: () => { toast.success("تم تحديث الملاحظة وتسجيل التعديل."); setNoteDraft(""); setEditingNoteId(null); void notesQuery.refetch(); },
    onError: error => toast.error(error.message || "تعذر تحديث الملاحظة."),
  });
  const deleteNoteMutation = trpc.admin.deletePurchaseRequestNote.useMutation({
    onSuccess: () => { toast.success("تم حذف الملاحظة وإضافته إلى السجل."); void notesQuery.refetch(); },
    onError: error => toast.error(error.message || "تعذر حذف الملاحظة."),
  });
  const reviewCorrectionMutation = trpc.admin.reviewPurchaseRequestCorrection.useMutation({
    onSuccess: () => { toast.success("تم تحديث طلب التصحيح وتسجيل القرار."); void correctionsQuery.refetch(); void requestsQuery.refetch(); },
    onError: error => toast.error(error.message || "تعذر مراجعة طلب التصحيح."),
  });

  if (!isAdmin) {
    return <section dir="rtl" className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 text-center"><div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm"><ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-700" aria-hidden="true" /><h1 className="font-display text-2xl font-bold text-[#173247]">الوصول غير مسموح</h1><p className="mt-3 text-sm leading-7 text-[#68747a]">هذه الصفحة مخصصة لحسابات الإدارة المعتمدة فقط.</p></div></section>;
  }

  const requests = requestsQuery.data?.requests ?? [];
  const confirmExperimentalStatusChange = (request: { isTestOrder: boolean; orderNumber: string }, nextStatus: "approved" | "rejected") => {
    if (!request.isTestOrder) return true;
    const nextStatusLabel = nextStatus === "approved" ? "مقبول" : "مرفوض";
    return window.confirm(`تنبيه إداري: الطلب ${request.orderNumber} موسوم «طلب تجريبي مستثنى» ولن يدخل في عداد Early Bird. هل تريد فعلاً تغيير حالته إلى «${nextStatusLabel}»؟`);
  };
  const approve = (request: { id: number; isTestOrder: boolean; orderNumber: string }) => {
    if (!confirmExperimentalStatusChange(request, "approved")) return;
    approveMutation.mutate({ requestId: request.id });
  };
  const reject = (request: { id: number; isTestOrder: boolean; orderNumber: string }) => {
    if (!confirmExperimentalStatusChange(request, "rejected")) return;
    const reason = window.prompt("اكتب سبب رفض التحويل:");
    if (reason?.trim()) rejectMutation.mutate({ requestId: request.id, reason: reason.trim() });
  };
  const reissueDownload = (requestId: number) => reissueDownloadMutation.mutate({ requestId });
  const reviewCorrection = (correctionId: number, decision: "approved" | "rejected") => {
    const decisionNote = window.prompt(decision === "approved" ? "ملاحظة الموافقة (اختياري):" : "سبب رفض التصحيح (اختياري):") || undefined;
    reviewCorrectionMutation.mutate({ correctionId, decision, decisionNote });
  };
  const openNotes = (requestId: number) => { setSelectedNoteRequestId(requestId); setEditingNoteId(null); setNoteDraft(""); };
  const saveNote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedNoteRequestId === null || !noteDraft.trim()) return;
    if (editingNoteId !== null) updateNoteMutation.mutate({ noteId: editingNoteId, content: noteDraft.trim() });
    else createNoteMutation.mutate({ requestId: selectedNoteRequestId, content: noteDraft.trim() });
  };
  const editNote = (noteId: number, content: string) => { setEditingNoteId(noteId); setNoteDraft(content); };
  const removeNote = (noteId: number) => { if (window.confirm("هل تريد حذف هذه الملاحظة؟ سيبقى التعديل محفوظاً في السجل الزمني.")) deleteNoteMutation.mutate({ noteId }); };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchDraft.trim().slice(0, 160));
    setPage(1);
  };
  const clearSearch = () => {
    setSearchDraft("");
    setSearch("");
    setSearchScope("all");
    setStatus("all");
    setPage(1);
  };
  const openMidadSheet = () => {
    const sheetWindow = window.open("https://docs.google.com/spreadsheets/d/1O6JEqrlxfaVui-BQ8VOr6nv9JxLd2Qz3013xfjFuirw/edit", "_blank", "noopener,noreferrer");
    if (!sheetWindow) {
      toast.error("تعذر فتح Google Sheets. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");
      return;
    }
    toast.success("تم فتح سجل طلبات MIDAD في Google Sheets.");
  };

  return <section dir="rtl" className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / PAYMENTS</p>
          <h1 className="mt-2 font-display text-3xl font-bold">طلبات الشراء والدفع</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">راجع التحويلات البنكية، عاين إثبات الدفع داخل اللوحة، ثم وافق أو ارفض الطلب مع تسجيل القرار.</p>
        </div>
        <button type="button" onClick={openMidadSheet} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d5a15f] px-4 py-3 text-sm font-bold text-[#173247] transition hover:bg-[#e2b878] active:scale-[0.98]">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          فتح سجل Google Sheets
        </button>
      </div>
    </header>

    {approvedDownload && <div role="status" className="flex flex-col gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">تم إصدار رابط التنزيل</p><p className="mt-1 text-sm">الرابط صالح لمدة {approvedDownload.expiresInMinutes} دقيقة فقط. شاركه عبر قناة التسليم المعتمدة.</p></div><a href={approvedDownload.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">فتح ملف PDF</a></div>}
    {requestsQuery.error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">تعذر تحميل طلبات الشراء. تحقق من اتصال قاعدة البيانات وصلاحيات الحساب ثم أعد المحاولة.</p>}
    <form onSubmit={handleSearch} className="flex flex-col gap-3 rounded-[22px] border border-[#e3d9ca] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8f80]" aria-hidden="true" />
        <input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder={searchScope === "orderNumber" ? "ابحث برقم الطلب فقط" : searchScope === "customer" ? "ابحث باسم العميل أو بريده أو واتسابه" : "ابحث برقم الطلب أو بيانات العميل"} aria-label="البحث في طلبات الشراء" maxLength={160} className="w-full rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] py-3 pr-10 pl-4 text-sm text-[#173247] outline-none transition focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20" />
      </div>
      <label className="flex items-center gap-2 text-sm font-bold text-[#173247]">
        <span>نطاق البحث</span>
        <select value={searchScope} onChange={event => { setSearchScope(event.target.value as typeof searchScope); setPage(1); }} aria-label="تحديد نطاق البحث" className="rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 text-sm font-bold text-[#173247] outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20">
          <option value="all">رقم الطلب وبيانات العميل</option>
          <option value="orderNumber">رقم الطلب فقط</option>
          <option value="customer">بيانات العميل فقط</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-bold text-[#173247]">
        <span>حجم الصفحة</span>
        <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value) as typeof pageSize); setPage(1); }} aria-label="اختيار حجم صفحة الطلبات" className="rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 text-sm font-bold text-[#173247] outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20">
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-bold text-[#173247]">
        <span className="sr-only">تصفية حسب حالة الطلب</span>
        <select value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1); }} aria-label="تصفية حسب حالة الطلب" className="rounded-xl border border-[#e3d9ca] bg-[#fcfaf6] px-3 py-3 text-sm font-bold text-[#173247] outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20">
          <option value="all">كل الحالات</option>
          <option value="pending">قيد المراجعة</option>
          <option value="approved">مقبول</option>
          <option value="rejected">مرفوض</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="rounded-xl bg-[#173247] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#24465e] active:scale-[0.98]">بحث</button>
        {(search || searchDraft || searchScope !== "all" || status !== "all") && <button type="button" onClick={clearSearch} className="inline-flex items-center gap-1 rounded-xl border border-[#e3d9ca] px-4 py-3 text-sm font-bold text-[#68747a] transition hover:bg-[#f8f3eb]"><X className="h-4 w-4" aria-hidden="true" />مسح</button>}
        <button type="button" onClick={() => { setIncludeTestOrders(current => !current); setPage(1); }} aria-pressed={!includeTestOrders} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${includeTestOrders ? "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100" : "border-[#173247] bg-[#173247] text-white hover:bg-[#24465e]"}`} title={includeTestOrders ? "إخفاء الطلبات التجريبية المستثناة" : "إظهار الطلبات التجريبية المستثناة"}><ShieldAlert className="h-4 w-4" aria-hidden="true" />{includeTestOrders ? "إخفاء الطلبات التجريبية" : "إظهار الطلبات التجريبية"}</button>
      </div>
    </form>
    <div className="grid gap-4 sm:grid-cols-3">
      {[["الإجمالي", requests.length], ["قيد المراجعة", requests.filter(item => item.status === "pending").length], ["المقبولة", requests.filter(item => item.status === "approved").length]].map(([label, value]) => <div key={label as string} className="rounded-[22px] border border-[#e3d9ca] bg-white p-5 shadow-sm"><p className="text-sm font-bold text-[#68747a]">{label as string}</p><p className="mt-2 text-3xl font-bold text-[#173247]">{requestsQuery.isLoading ? "…" : value as number}</p></div>)}
    </div>

    <div className="overflow-hidden rounded-[24px] border border-[#e3d9ca] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[#eee7dc] bg-[#f8f3eb] px-5 py-4"><div><h2 className="font-display text-lg font-bold text-[#173247]">طلبات تصحيح بيانات التواصل</h2><p className="mt-1 text-xs text-[#68747a]">تُطبّق الموافقة البريد أو رقم الواتساب على طلب الشراء، وتُسجّل العملية في سجل التدقيق.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{correctionsQuery.data?.filter(item => item.status === "pending").length ?? 0} معلّق</span></div>
      <div className="overflow-x-auto"><table className="min-w-[950px] w-full text-right text-sm"><thead className="bg-white text-[#173247]"><tr><th className="px-4 py-4 font-bold">رقم الطلب</th><th className="px-4 py-4 font-bold">القيم السابقة</th><th className="px-4 py-4 font-bold">القيم المطلوبة</th><th className="px-4 py-4 font-bold">السبب</th><th className="px-4 py-4 font-bold">الحالة</th><th className="px-4 py-4 font-bold">الإجراء</th></tr></thead><tbody className="divide-y divide-[#eee7dc]">{correctionsQuery.isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#68747a]">جارٍ تحميل طلبات التصحيح…</td></tr> : (correctionsQuery.data ?? []).length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#68747a]">لا توجد طلبات تصحيح.</td></tr> : (correctionsQuery.data ?? []).map(item => <tr key={item.id} className="hover:bg-[#fcfaf6]"><td className="px-4 py-4 font-mono text-xs text-[#173247]" dir="ltr">{item.orderNumber}</td><td className="px-4 py-4 text-xs leading-6 text-[#68747a]">{item.oldEmail}<br />{item.oldPhone || "—"}</td><td className="px-4 py-4 text-xs leading-6 text-[#173247]">{item.requestedEmail || "—"}<br />{item.requestedPhone || "—"}</td><td className="max-w-[220px] px-4 py-4 text-xs leading-6 text-[#68747a]">{item.reason || "—"}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td><td className="px-4 py-4">{item.status === "pending" ? <div className="flex gap-2"><button type="button" onClick={() => reviewCorrection(item.id, "approved")} disabled={reviewCorrectionMutation.isPending} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">موافقة</button><button type="button" onClick={() => reviewCorrection(item.id, "rejected")} disabled={reviewCorrectionMutation.isPending} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">رفض</button></div> : <span className="text-xs text-[#68747a]">تمت المراجعة</span>}</td></tr>)}</tbody></table></div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#68747a]"><span>{search ? `نتائج البحث عن رقم الطلب أو بيانات العميل «${search}»` : "جميع طلبات الشراء"}{status !== "all" ? ` — الحالة: ${statusLabel(status)}` : ""}{!includeTestOrders ? " — بدون الطلبات التجريبية المستثناة" : ""} — {requestsQuery.isFetching ? "جارٍ التحديث…" : `${requestsQuery.data?.total ?? requests.length} طلب`}</span><span>الصفحة {requestsQuery.data?.page ?? page} من {requestsQuery.data?.totalPages ?? 1}</span></div>
    <div className="overflow-hidden rounded-[24px] border border-[#e3d9ca] bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-right text-sm">
        <thead className="bg-[#f8f3eb] text-[#173247]"><tr><th className="px-4 py-4 font-bold">بيانات العميل</th><th className="px-4 py-4 font-bold">المنتج والسعر المدفوع</th><th className="px-4 py-4 font-bold">مرجع التحويل</th><th className="px-4 py-4 font-bold">إثبات التحويل</th><th className="px-4 py-4 font-bold">الحالة</th><th className="px-4 py-4 font-bold">التاريخ</th><th className="px-4 py-4 font-bold">الإجراء</th></tr></thead>
        <tbody className="divide-y divide-[#eee7dc]">
          {requestsQuery.isLoading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-[#68747a]">جارٍ تحميل الطلبات…</td></tr> : requests.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-[#68747a]">{search ? `لا توجد طلبات مطابقة لـ «${search}»${status !== "all" ? ` ضمن حالة «${statusLabel(status)}»` : ""}.` : status !== "all" ? `لا توجد طلبات ضمن حالة «${statusLabel(status)}».` : "لا توجد طلبات شراء حتى الآن."}</td></tr> : requests.map(request => <tr key={request.id} className="transition hover:bg-[#fcfaf6]">
            <td className="min-w-[240px] px-4 py-4"><div className="rounded-2xl bg-[#fcfaf6] p-3"><div className="mb-2 flex flex-wrap items-center gap-2"><p className="font-mono text-xs font-bold text-[#89663b]" dir="ltr">{request.orderNumber}</p>{request.isTestOrder && <span title="لا يدخل هذا الطلب في عداد Early Bird" className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-800"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />طلب تجريبي مستثنى</span>}</div><p className="font-bold text-[#173247]">{request.customerName}</p><p className="mt-1 break-all text-xs text-[#68747a]" dir="ltr">{request.customerEmail}</p><p className="mt-1 text-xs text-[#68747a]" dir="ltr">واتساب: {request.customerPhone || "غير مُدخل"}</p></div></td>
            <td className="px-4 py-4 text-[#68747a]"><span>{request.productCode}</span><span className="mt-1 block font-bold text-[#173247]">السعر المدفوع: {request.pricePaid} د.م</span></td>
            <td className="px-4 py-4 font-mono text-xs text-[#68747a]" dir="ltr">{request.transactionReference}</td>
            <td className="px-4 py-4">{request.proofKey ? <div className="flex flex-col items-start gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700"><FileImage className="h-3.5 w-3.5" />مرفق</span><button type="button" onClick={() => setSelectedProofId(request.id)} className="inline-flex items-center gap-2 rounded-full bg-[#f8f3eb] px-3 py-2 text-xs font-bold text-[#173247] hover:bg-[#efe5d6]"><Eye className="h-4 w-4" />معاينة الإثبات</button></div> : <span className="text-xs text-[#68747a]">غير مرفق</span>}</td>
            <td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(request.status)}`}>{statusLabel(request.status)}</span>{request.rejectionReason && <p className="mt-2 max-w-[180px] text-xs leading-5 text-red-700">{request.rejectionReason}</p>}</td>
            <td className="px-4 py-4 text-xs text-[#68747a]">{formatDate(request.createdAt)}</td>
            <td className="px-4 py-4"><div className="flex flex-wrap gap-2">{request.status === "pending" ? <><button type="button" onClick={() => approve(request)} disabled={approveMutation.isPending || rejectMutation.isPending || reissueDownloadMutation.isPending} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />قبول</button><button type="button" onClick={() => reject(request)} disabled={approveMutation.isPending || rejectMutation.isPending || reissueDownloadMutation.isPending} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" />رفض</button></> : request.status === "approved" ? <button type="button" onClick={() => reissueDownload(request.id)} disabled={reissueDownloadMutation.isPending} className="inline-flex items-center gap-1 rounded-lg bg-[#173247] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#214963] disabled:opacity-50" title="إصدار رابط تنزيل صالح لمدة 15 دقيقة"><Download className="h-4 w-4" />إصدار رابط PDF</button> : <span className="text-xs text-[#68747a]">تمت المراجعة</span>}<button type="button" onClick={() => openNotes(request.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#d9c9b4] bg-[#fffaf2] px-3 py-2 text-xs font-bold text-[#173247] transition hover:bg-[#f8f3eb]"><History className="h-4 w-4" />الملاحظات</button></div></td>
          </tr>)}
        </tbody>
      </table></div>
    </div>
    <nav aria-label="ترقيم صفحات طلبات الشراء" className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#e3d9ca] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-[#68747a]">يعرض {pageSize} طلباً في الصفحة</p>
      <p className="text-sm font-bold text-[#173247]">الصفحة {requestsQuery.data?.page ?? page} من {requestsQuery.data?.totalPages ?? 1}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page <= 1 || requestsQuery.isFetching} className="rounded-xl border border-[#e3d9ca] px-4 py-2 text-sm font-bold text-[#173247] transition hover:bg-[#f8f3eb] disabled:cursor-not-allowed disabled:opacity-40">السابق</button>
        <button type="button" onClick={() => setPage(current => Math.min(requestsQuery.data?.totalPages ?? 1, current + 1))} disabled={page >= (requestsQuery.data?.totalPages ?? 1) || requestsQuery.isFetching} className="rounded-xl border border-[#e3d9ca] px-4 py-2 text-sm font-bold text-[#173247] transition hover:bg-[#f8f3eb] disabled:cursor-not-allowed disabled:opacity-40">التالي</button>
      </div>
    </nav>

    {selectedNoteRequestId !== null && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-[#173247]/70 p-4" onClick={() => setSelectedNoteRequestId(null)}><div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[26px] bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-xl font-bold text-[#173247]">ملاحظات داخلية للطلب #{selectedNoteRequestId}</h2><p className="mt-1 text-xs text-[#68747a]">هذه الملاحظات خاصة بفريق الإدارة ولا تظهر للعميل.</p></div><button type="button" onClick={() => setSelectedNoteRequestId(null)} className="rounded-lg p-2 text-[#68747a] hover:bg-[#f8f3eb]" aria-label="إغلاق">×</button></div><form onSubmit={saveNote} className="rounded-2xl border border-[#e3d9ca] bg-[#fcfaf6] p-4"><label htmlFor="purchase-note" className="text-sm font-bold text-[#173247]">{editingNoteId !== null ? "تعديل الملاحظة" : "إضافة ملاحظة جديدة"}</label><textarea id="purchase-note" value={noteDraft} onChange={event => setNoteDraft(event.target.value)} maxLength={5000} rows={4} placeholder="اكتب ملاحظة داخلية عن الدفع أو التواصل أو المتابعة…" className="mt-2 w-full resize-y rounded-xl border border-[#e3d9ca] bg-white p-3 text-sm leading-7 text-[#173247] outline-none focus:border-[#b9854a] focus:ring-2 focus:ring-[#b9854a]/20"/><div className="mt-3 flex flex-wrap gap-2"><button type="submit" disabled={!noteDraft.trim() || createNoteMutation.isPending || updateNoteMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#173247] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{editingNoteId !== null ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingNoteId !== null ? "حفظ التعديل" : "إضافة الملاحظة"}</button>{editingNoteId !== null && <button type="button" onClick={() => { setEditingNoteId(null); setNoteDraft(""); }} className="rounded-xl border border-[#e3d9ca] px-4 py-2.5 text-sm font-bold text-[#68747a]">إلغاء التعديل</button>}</div></form><div className="mt-5 space-y-3"><h3 className="flex items-center gap-2 font-bold text-[#173247]"><FileText className="h-4 w-4 text-[#b9854a]" />الملاحظات الحالية</h3>{notesQuery.isLoading ? <p className="rounded-xl bg-[#fcfaf6] p-4 text-sm text-[#68747a]">جارٍ تحميل الملاحظات…</p> : notesQuery.data?.notes.length ? notesQuery.data.notes.map(note => <article key={note.id} className="rounded-2xl border border-[#eee7dc] bg-white p-4"><p className="whitespace-pre-wrap text-sm leading-7 text-[#173247]">{note.content}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#68747a]"><span>آخر تحديث: {formatDate(note.updatedAt)}</span><span className="flex gap-2"><button type="button" onClick={() => editNote(note.id, note.content)} className="inline-flex items-center gap-1 rounded-lg border border-[#e3d9ca] px-2.5 py-1.5 font-bold hover:bg-[#f8f3eb]"><Pencil className="h-3.5 w-3.5" />تعديل</button><button type="button" onClick={() => removeNote(note.id)} disabled={deleteNoteMutation.isPending} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />حذف</button></span></div></article>) : <p className="rounded-xl bg-[#fcfaf6] p-4 text-sm text-[#68747a]">لا توجد ملاحظات لهذا الطلب حتى الآن.</p>}</div><div className="mt-6 border-t border-[#eee7dc] pt-5"><h3 className="flex items-center gap-2 font-bold text-[#173247]"><History className="h-4 w-4 text-[#b9854a]" />السجل الزمني للتعديلات</h3><div className="mt-3 space-y-2">{notesQuery.data?.events.length ? notesQuery.data.events.map(event => <div key={event.id} className="rounded-xl bg-[#fcfaf6] px-3 py-2 text-xs leading-6 text-[#68747a]"><span className="font-bold text-[#173247]">{event.action === "created" ? "إضافة" : event.action === "updated" ? "تعديل" : "حذف"}</span> — المدير #{event.actorUserId} — {formatDate(event.createdAt)}</div>) : <p className="rounded-xl bg-[#fcfaf6] p-4 text-sm text-[#68747a]">لا توجد تعديلات مسجلة حتى الآن.</p>}</div></div></div></div>}
    {selectedProofId !== null && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-[#173247]/70 p-4" onClick={() => setSelectedProofId(null)}><div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[26px] bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-[#173247]">معاينة إثبات الدفع</h2><button type="button" onClick={() => setSelectedProofId(null)} className="rounded-lg p-2 text-[#68747a] hover:bg-[#f8f3eb]" aria-label="إغلاق">×</button></div>{proofQuery.isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#b9854a]" /></div> : proofQuery.error ? <p role="alert" className="rounded-xl bg-red-50 p-6 text-center text-sm font-bold text-red-700">تعذرت معاينة إثبات الدفع. قد يكون الرابط المؤقت انتهت صلاحيته؛ أغلق النافذة ثم أعد فتح المعاينة.</p> : proofQuery.data?.url ? proofQuery.data.contentType?.startsWith("image/") ? <img src={proofQuery.data.url} alt="إثبات الدفع" className="mx-auto max-h-[70vh] rounded-xl object-contain" /> : <iframe src={proofQuery.data.url} title="إثبات الدفع PDF" className="h-[70vh] w-full rounded-xl border" /> : <div className="py-16 text-center text-[#68747a]"><FileImage className="mx-auto mb-3 h-10 w-10" />لا يوجد إثبات متاح لهذا الطلب.</div>}<p className="mt-4 flex items-center gap-2 text-xs text-[#68747a]"><FileText className="h-4 w-4" />الرابط مؤقت ومخصص للمراجعة الإدارية فقط.</p></div></div>}
  </section>;
}

export default function AdminPurchases() {
  return <DashboardLayout><AdminPurchasesContent /></DashboardLayout>;
}
