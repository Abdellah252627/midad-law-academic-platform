import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, FileImage, FileText, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DEFAULT_PRODUCT_CODE } from "@shared/const";

const PRODUCT_CODE = DEFAULT_PRODUCT_CODE;

type FileType = "pdf" | "cover" | "sample";

export default function AdminFiles() {
  const [fileType, setFileType] = useState<FileType>("pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filesQuery = trpc.admin.files.useQuery({ productCode: PRODUCT_CODE });
  const upload = trpc.admin.uploadFile.useMutation({
    onSuccess: (data) => {
      toast.success(`تم رفع الملف وإنشاء الإصدار ${data.version}`);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      filesQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "تعذر رفع الملف"),
  });
  const [previewFileId, setPreviewFileId] = useState<number | null>(null);
  const fileUrl = trpc.admin.fileUrl.useQuery({ fileId: previewFileId ?? 0 }, { enabled: previewFileId !== null });
  useEffect(() => {
    if (!fileUrl.data?.url || previewFileId === null) return;
    window.open(fileUrl.data.url, "_blank", "noopener,noreferrer");
    toast.success(`تم فتح معاينة ${fileUrl.data.fileName}`);
    setPreviewFileId(null);
  }, [fileUrl.data, previewFileId]);

  useEffect(() => {
    if (fileUrl.isError) toast.error(fileUrl.error.message || "تعذر إنشاء رابط المعاينة");
  }, [fileUrl.isError, fileUrl.error]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("الحد الأقصى لحجم الملف هو 10 ميغابايت");
      return;
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
      reader.readAsDataURL(selectedFile);
    });
    upload.mutate({ productCode: PRODUCT_CODE, fileType, fileName: selectedFile.name, contentType: selectedFile.type as "application/pdf" | "image/jpeg" | "image/png", base64 });
  };

  const activeFiles = filesQuery.data?.filter(file => file.isActive === 1) ?? [];
  const historyFiles = filesQuery.data?.filter(file => file.isActive !== 1) ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <p className="text-sm text-muted-foreground">{PRODUCT_CODE}</p>
        <h1 className="text-2xl font-bold tracking-tight">إدارة الملفات والإصدارات</h1>
        <p className="mt-2 text-sm text-muted-foreground">ارفع نسخة جديدة بدون لمس الكود. النسخة السابقة تبقى محفوظة كسجل تاريخي ولا تُستخدم للتسليم.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>رفع ملف جديد</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
          <div className="space-y-2"><Label>نوع الملف</Label><Select value={fileType} onValueChange={(value) => setFileType(value as FileType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pdf">النسخة الكاملة PDF</SelectItem><SelectItem value="sample">عينة PDF</SelectItem><SelectItem value="cover">صورة الغلاف</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="admin-file">الملف (حد أقصى 10MB)</Label><Input ref={inputRef} id="admin-file" type="file" accept={fileType === "cover" ? "image/jpeg,image/png" : "application/pdf"} onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} /></div>
          <Button onClick={handleUpload} disabled={!selectedFile || upload.isPending}><Upload className="ml-2 h-4 w-4" />{upload.isPending ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جارٍ الرفع</> : "رفع وإصدار نسخة"}</Button>
        </CardContent>
      </Card>

      {filesQuery.isError && <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircle className="h-4 w-4" />تعذر تحميل سجل الملفات. حاول تحديث الصفحة.</div>}

      <Card><CardHeader><CardTitle>النسخ النشطة</CardTitle></CardHeader><CardContent>{filesQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : activeFiles.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد ملفات مرفوعة بعد.</p> : <div className="space-y-3">{activeFiles.map(file => <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="flex items-center gap-3">{file.fileType === "cover" ? <FileImage className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}<div><p className="font-medium">{file.fileName}</p><p className="text-xs text-muted-foreground">{file.fileType} · الإصدار {file.version}</p></div><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><Button variant="outline" size="sm" onClick={() => setPreviewFileId(file.id)} disabled={fileUrl.isFetching}>معاينة موقّتة</Button></div>)}</div>}</CardContent></Card>

      <Card><CardHeader><CardTitle>سجل الإصدارات السابقة</CardTitle></CardHeader><CardContent>{historyFiles.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد نسخ سابقة.</p> : <div className="space-y-2">{historyFiles.map(file => <div key={file.id} className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm"><span>{file.fileName} · {file.fileType} · الإصدار {file.version}</span><span className="text-muted-foreground">غير نشط</span></div>)}</div>}</CardContent></Card>
    </div>
  );
}
