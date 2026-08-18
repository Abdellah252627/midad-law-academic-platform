import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "wouter";

function AdminAccountContent() {
  const { user } = useAuth();
  const { data: isAuthorizedAdmin } = trpc.auth.isAdmin.useQuery();

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-[28px] bg-[#173247] p-6 text-white shadow-[0_20px_60px_rgba(23,50,71,0.16)] sm:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-[#d5a15f]">MIDAD / ACCOUNT</p>
        <h1 className="mt-2 font-display text-3xl font-bold">حسابي الإداري</h1>
        <p className="mt-2 text-sm leading-7 text-white/70">بيانات الحساب المستخدم للوصول إلى لوحة إدارة منصة مِداد.</p>
      </header>

      <section className="rounded-[26px] border border-[#e3d9ca] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="account-details-title">
        <h2 id="account-details-title" className="font-display text-2xl font-bold text-[#173247]">بيانات الحساب</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#f8f3eb] p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#68747a]"><UserRound className="h-4 w-4" /> الاسم</div>
            <p className="mt-2 font-bold text-[#173247]">{user?.name || "غير مسجل"}</p>
          </div>
          <div className="rounded-2xl bg-[#f8f3eb] p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#68747a]"><Mail className="h-4 w-4" /> البريد الإلكتروني</div>
            <p className="mt-2 break-all font-bold text-[#173247]">{user?.email || "غير مسجل"}</p>
          </div>
          <div className="rounded-2xl bg-[#f8f3eb] p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#68747a]"><ShieldCheck className="h-4 w-4" /> مستوى الوصول</div>
            <p className="mt-2 font-bold text-[#173247]">{isAuthorizedAdmin ? "مدير النظام" : "مستخدم"}</p>
          </div>
        </div>
        <Link href="/admin" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#173247] px-5 py-3 font-bold text-white transition hover:bg-[#24485f]">
          <ArrowRight className="h-4 w-4" /> العودة إلى لوحة التحكم
        </Link>
      </section>
    </div>
  );
}

export default function AdminAccount() {
  return <DashboardLayout><AdminAccountContent /></DashboardLayout>;
}
