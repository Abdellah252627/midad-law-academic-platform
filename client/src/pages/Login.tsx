import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

export function roleLabel(role?: string) {
  return role === "admin" ? "حساب إداري" : "مستخدم مسجل";
}

export function destinationFor(role?: string) {
  return role === "admin" ? "/admin" : "/forum";
}

export default function Login() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#111315] text-white"><Loader2 className="h-8 w-8 animate-spin text-[#d6a15b]" aria-label="جارٍ التحقق من الجلسة" /></main>;
  }

  if (user) {
    const destination = destinationFor(user.role);
    return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#111315] px-4 py-10 text-white"><section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#202223] p-8 text-center shadow-2xl"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" /><p className="mt-5 text-sm text-white/60">تم تسجيل الدخول باسم</p><h1 className="mt-2 text-2xl font-black">{user.name || user.email || "حسابك"}</h1><p className="mt-3 text-sm text-white/70">نوع الحساب: {roleLabel(user.role)}</p><Button className="mt-7 w-full bg-[#d6a15b] text-[#172b3a] hover:bg-[#e3b875]" onClick={() => setLocation(destination)}>متابعة إلى {user.role === "admin" ? "لوحة الإدارة" : "المنتدى"}<ArrowLeft className="mr-2 h-4 w-4" /></Button></section></main>;
  }

  return <main dir="rtl" className="min-h-screen bg-[#111315] px-4 py-10 text-white"><div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center"><section className="grid w-full overflow-hidden rounded-[30px] border border-white/10 bg-[#202223] shadow-2xl md:grid-cols-[1fr_0.9fr]"><div className="order-2 p-8 md:order-1 md:p-12"><div className="mb-10 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d6a15b] text-[#172b3a]"><ShieldCheck className="h-6 w-6" /></div><div><p className="text-xs font-bold tracking-[0.2em] text-[#d6a15b]">MIDAD-001</p><p className="text-sm text-white/60">منصة المراجعة القانونية</p></div></div><h1 className="text-3xl font-black leading-tight md:text-4xl">تسجيل دخول آمن إلى منصة مِداد</h1><p className="mt-5 max-w-xl text-sm leading-8 text-white/65">استخدم بوابة Manus الرسمية لتسجيل الدخول عبر Google أو Facebook أو Microsoft أو Apple أو البريد الإلكتروني أو مفتاح المرور، حسب الخيارات المتاحة لحسابك.</p><Button className="mt-8 w-full bg-[#d6a15b] py-6 text-base font-black text-[#172b3a] hover:bg-[#e3b875]" onClick={() => startLogin()}>المتابعة إلى تسجيل الدخول<ArrowLeft className="mr-2 h-5 w-5" /></Button><p className="mt-4 text-center text-xs leading-6 text-white/45">سيتم فتح بوابة المصادقة الآمنة، ثم إعادتك تلقائياً إلى MIDAD بعد نجاح الدخول.</p><Link href="/" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#d6a15b] hover:text-white">العودة إلى الصفحة الرئيسية<ArrowLeft className="h-4 w-4" /></Link></div><div className="order-1 flex flex-col justify-end bg-gradient-to-br from-[#173247] via-[#142735] to-[#0f171d] p-8 md:order-2 md:p-12"><p className="text-sm font-bold text-[#d6a15b]">صلاحيات واضحة</p><h2 className="mt-3 text-2xl font-black leading-9">كل حساب يرى ما يحتاجه فقط</h2><div className="mt-8 space-y-4 text-sm leading-7 text-white/70"><p><strong className="text-white">المالك والمدير:</strong> أدوات الإدارة المعتمدة.</p><p><strong className="text-white">مشرف المنتدى:</strong> الإشراف ومراقبة المخالفات فقط.</p><p><strong className="text-white">الطالب:</strong> المنتدى والمحتوى المتاح بعد تسجيل الدخول.</p></div></div></section></div></main>;
}
