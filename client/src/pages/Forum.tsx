import { useState } from "react";
import { Link } from "wouter";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Forum() {
  const { user } = useAuth();
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const categories = trpc.forum.categories.useQuery();
  const topics = trpc.forum.topics.useQuery(categoryId ? { categoryId } : undefined);
  const createTopic = trpc.forum.createTopic.useMutation({ onSuccess: () => { setTitle(""); setBody(""); } });

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f1e5] px-4 py-12 text-[#173247]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-[2rem] bg-[#173247] p-8 text-white shadow-xl">
          <p className="mb-2 text-sm text-[#d6a15b]">MIDAD LAW / COMMUNITY</p>
          <h1 className="text-4xl font-bold">منتدى مداد القانون</h1>
          <p className="mt-3 max-w-2xl text-white/80">مساحة تعليمية للنقاش الهادئ حول القانون والشريعة. لا تمثل المنشورات استشارة قانونية، وكل موضوع أو رد يمر بالمراجعة قبل ظهوره.</p>
        </header>
        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="border-[#e1d4bf] bg-white/80"><CardHeader><CardTitle>الفئات</CardTitle></CardHeader><CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => setCategoryId(undefined)}>كل النقاشات</Button>
            {(categories.data ?? []).map(category => <Button key={category.id} variant="outline" className="w-full justify-start" onClick={() => setCategoryId(category.id)}>{category.name}</Button>)}
            <div className="mt-6 rounded-xl bg-[#f7f1e5] p-4 text-sm text-[#59636a]"><ShieldCheck className="mb-2 h-5 w-5 text-[#b9823b]" />يحظر المنتدى الإساءة والتشهير والبيانات الشخصية والمحتوى الذي يقدم استشارة فردية على أنها حكم نهائي.</div>
          </CardContent></Card>
          <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">الموضوعات المنشورة</h2><span className="text-sm text-[#59636a]">{topics.data?.length ?? 0} موضوع</span></div>
            {(topics.data ?? []).map(topic => <Card key={topic.id} className="border-[#e1d4bf] bg-white/80"><CardContent className="flex items-start gap-4 p-5"><MessageCircle className="mt-1 h-5 w-5 text-[#b9823b]" /><div><h3 className="font-bold">{topic.title}</h3><p className="mt-1 line-clamp-2 text-sm text-[#59636a]">{topic.body}</p></div></CardContent></Card>)}
            {!topics.isLoading && !topics.data?.length && <Card><CardContent className="p-8 text-center text-[#59636a]">لا توجد موضوعات منشورة بعد. كن أول من يفتح نقاشاً تعليمياً.</CardContent></Card>}
          </div>
        </section>
        <Card className="border-[#e1d4bf] bg-white/90"><CardHeader><CardTitle>فتح موضوع جديد</CardTitle></CardHeader><CardContent className="space-y-4">
          {!user ? <Button onClick={() => startLogin()}>سجّل الدخول للمشاركة</Button> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!categoryId) return; createTopic.mutate({ categoryId, title, body }); }}><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="عنوان النقاش" maxLength={220} /><Textarea value={body} onChange={event => setBody(event.target.value)} placeholder="اكتب طرحاً تعليمياً محترماً..." maxLength={10000} /><Button disabled={!categoryId || createTopic.isPending}>{createTopic.isPending ? "جارٍ الإرسال للمراجعة..." : "إرسال للمراجعة"}</Button></form>}
        </CardContent></Card>
        <Link href="/" className="inline-block text-sm text-[#9a6c32]">العودة إلى الصفحة الرئيسية</Link>
      </div>
    </main>
  );
}
