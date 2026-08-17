import { Star, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRoute } from "wouter";
import { toast } from "sonner";

type RatingContext = { valid: boolean; alreadyRated: boolean; fullName: string; productTitle: string };

type ReviewResponse = { message?: string };

export default function RatingPage() {
  const [, params] = useRoute<{ orderId: string }>("/rate/:orderId");
  const orderId = params?.orderId ?? "";
  const [context, setContext] = useState<RatingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setContext({ valid: false, alreadyRated: false, fullName: "", productTitle: "" });
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/orders/${encodeURIComponent(orderId)}/rating-context`, { signal: controller.signal })
      .then(async response => {
        const body = (await response.json()) as RatingContext;
        if (!response.ok) throw new Error("تعذر التحقق من الطلب.");
        return body;
      })
      .then(setContext)
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(error instanceof Error ? error.message : "تعذر تحميل سياق التقييم.");
        setContext({ valid: false, alreadyRated: false, fullName: "", productTitle: "" });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [orderId]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderId || rating < 1 || rating > 5 || submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, rating, comment: comment.trim() || undefined }),
      });
      const body = (await response.json()) as ReviewResponse;
      if (!response.ok) throw new Error(body.message || "تعذر إرسال التقييم.");
      setSubmitted(true);
      toast.success("شكراً لك، تم نشر تقييمك بنجاح.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال التقييم.");
    } finally {
      setSubmitting(false);
    }
  }

  const unavailable = !loading && (!context?.valid || context.alreadyRated);
  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f3eb] px-5 py-12 text-[#173247] sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3 text-sm font-bold text-[#b9854a]"><ShieldCheck className="h-5 w-5" />تقييم آمن ومجهول المصدر العام</div>
        <section className="rounded-[28px] border border-[#e3d9ca] bg-white p-6 shadow-[0_20px_60px_rgba(23,50,71,0.08)] sm:p-10">
          {loading ? <p className="py-12 text-center text-[#68747a]">جارٍ التحقق من الطلب…</p> : submitted ? <div className="py-12 text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Star className="h-8 w-8 fill-current" /></div><h1 className="font-display text-3xl font-black">تم استلام تقييمك</h1><p className="mt-3 leading-7 text-[#68747a]">شكراً لمساعدتك في تحسين تجربة MIDAD.</p></div> : unavailable ? <div className="py-12 text-center"><h1 className="font-display text-2xl font-black">لا يمكن فتح صفحة التقييم</h1><p className="mt-3 leading-7 text-[#68747a]">قد يكون الطلب غير مكتمل، أو تم إرسال تقييم سابقاً، أو أن رابط التقييم غير صالح. استخدم الرابط المرسل مع رقم الطلب المكتمل.</p></div> : <><p className="text-xs font-bold tracking-[0.16em] text-[#b9854a]">MIDAD / FEEDBACK</p><h1 className="mt-3 font-display text-3xl font-black sm:text-4xl">كيف كانت تجربتك؟</h1><p className="mt-4 leading-8 text-[#68747a]">مرحباً {context?.fullName}، شاركنا رأيك حول <strong className="text-[#173247]">{context?.productTitle}</strong>.</p><form onSubmit={submitReview} className="mt-8 space-y-6"><fieldset><legend className="mb-3 text-sm font-bold">التقييم من 5</legend><div className="flex gap-2" dir="ltr">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} من 5`} aria-pressed={rating === value} onClick={() => setRating(value)} className="rounded-xl p-2 text-[#d9d0c2] transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#b9854a]" ><Star className={`h-8 w-8 ${rating >= value ? "fill-[#d5a15f] text-[#b9854a]" : ""}`} /></button>)}</div></fieldset><label className="block text-sm font-bold">تعليق اختياري<textarea value={comment} onChange={event => setComment(event.target.value)} maxLength={1000} rows={5} placeholder="اكتب ملاحظتك باختصار…" className="mt-2 w-full rounded-2xl border border-[#d9d0c2] bg-[#fcfaf6] p-4 outline-none focus:border-[#b9854a]" /></label><button type="submit" disabled={rating === 0 || submitting} className="w-full rounded-full bg-[#173247] px-6 py-4 font-bold text-white transition hover:bg-[#244b63] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "جارٍ الإرسال…" : "إرسال التقييم"}</button></form></>}
        </section>
      </div>
    </main>
  );
}
