import { Star } from "lucide-react";
import { useEffect, useState } from "react";

type PublicReview = { full_name: string; rating: number; comment: string | null; created_at: string | number };

export default function PublicReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/products/${encodeURIComponent(productId)}/reviews`, { signal: controller.signal })
      .then(response => response.ok ? response.json() as Promise<PublicReview[]> : [])
      .then(setReviews)
      .catch(error => { if (!(error instanceof DOMException && error.name === "AbortError")) setReviews([]); });
    return () => controller.abort();
  }, [productId]);

  if (!reviews.length) return null;
  return (
    <section aria-labelledby="reviews-title" dir="rtl" className="bg-[#efe8dc] py-20 lg:py-24">
      <div className="mx-auto max-w-[1120px] px-5 lg:px-8">
        <div className="section-kicker">06 / آراء القراء</div>
        <h2 id="reviews-title" className="mt-4 font-display text-4xl font-black tracking-[-0.05em] text-[#172b3a] md:text-5xl">تجارب من قرأوا الملخص</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {reviews.map((review, index) => <article key={`${review.created_at}-${index}`} className="rounded-[20px] border border-[#d9d0c2] bg-[#fbf8f2] p-6"><div className="flex items-center gap-1 text-[#b9854a]" aria-label={`التقييم ${review.rating} من 5`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} size={16} className={value <= review.rating ? "fill-current" : "text-[#d9d0c2]"} />)}</div><p className="mt-4 min-h-12 font-body text-sm leading-7 text-[#68747a]">{review.comment || "تقييم بدون تعليق."}</p><p className="mt-5 text-sm font-extrabold text-[#173247]">{review.full_name}</p></article>)}
        </div>
      </div>
    </section>
  );
}
