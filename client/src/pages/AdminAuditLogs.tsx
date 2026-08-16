import { AlertCircle, ClipboardList, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-MA", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminAuditLogs() {
  const logsQuery = trpc.admin.auditLogs.useQuery();
  const logs = logsQuery.data ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <p className="text-sm text-muted-foreground">الحوكمة والمراجعة</p>
        <h1 className="text-2xl font-bold tracking-tight">سجل التدقيق</h1>
        <p className="mt-2 text-sm text-muted-foreground">سجل غير قابل للتعديل للعمليات الحساسة داخل لوحة الإدارة.</p>
      </div>

      {logsQuery.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> تعذر تحميل سجل التدقيق. حاول تحديث الصفحة.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> آخر العمليات</CardTitle>
          <span className="text-sm text-muted-foreground">{logs.length} سجل</span>
        </CardHeader>
        <CardContent>
          {logsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد عمليات مسجلة بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-right text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="p-3 font-medium">التاريخ</th><th className="p-3 font-medium">الإجراء</th><th className="p-3 font-medium">الكيان</th><th className="p-3 font-medium">المعرف</th><th className="p-3 font-medium">المنتج</th><th className="p-3 font-medium">البيانات</th></tr></thead>
                <tbody>{logs.map(log => <tr key={log.id} className="border-b last:border-0"><td className="p-3 whitespace-nowrap">{formatDate(log.createdAt)}</td><td className="p-3 font-medium">{log.action}</td><td className="p-3">{log.entityType}</td><td className="p-3">{log.entityId ?? "—"}</td><td className="p-3">{log.productCode ?? "—"}</td><td className="max-w-[280px] truncate p-3 text-muted-foreground" title={log.metadataJson ?? ""}>{log.metadataJson ?? "—"}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
