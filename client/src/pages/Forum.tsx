import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Clock3, Flag, MessageCircle, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { FORUM_LEVELS, FORUM_SUBJECTS, getForumLevelLabel, type ForumLevel, type ForumSubject } from "@shared/forum";
import { FORUM_CLOSED_MESSAGE, getForumCountdown } from "@shared/forumModerationPolicy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Forum() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const forumCountdown = getForumCountdown(currentTime);
  const forumOpen = forumCountdown.isOpen;
  const countdownMinutes = Math.floor(forumCountdown.remainingMs / 60_000);
  const countdownHours = Math.floor(countdownMinutes / 60);
  const countdownRemainingMinutes = countdownMinutes % 60;
  const countdownLabel = countdownHours > 0 ? `${countdownHours} س و${countdownRemainingMinutes} د` : `${countdownRemainingMinutes} د`;
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [subject, setSubject] = useState<ForumSubject | undefined>();
  const [level, setLevel] = useState<ForumLevel | undefined>();
  const [selectedTopicId, setSelectedTopicId] = useState<number | undefined>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [moderationWarning, setModerationWarning] = useState("");
  const categories = trpc.forum.categories.useQuery();
  const topicFilters = useMemo(() => {
    const filters = { categoryId, subject, level };
    return categoryId || subject || level ? filters : undefined;
  }, [categoryId, subject, level]);
  const topics = trpc.forum.topics.useQuery(topicFilters);
  const rules = trpc.forum.rules.useQuery();
  const acceptance = trpc.forum.acceptance.useQuery(undefined, { enabled: Boolean(user) });
  const topicInput = useMemo(() => ({ topicId: selectedTopicId ?? 0 }), [selectedTopicId]);
  const topicDetail = trpc.forum.topic.useQuery(topicInput, { enabled: Boolean(selectedTopicId) });
  const utils = trpc.useUtils();
  const acceptRules = trpc.forum.acceptRules.useMutation({
    onSuccess: () => utils.forum.acceptance.invalidate(),
  });
  const moderationInput = useMemo(() => ({ text: `${title}\n${body}` }), [title, body]);
  const moderationStatus = trpc.forum.moderationStatus.useQuery(undefined, { enabled: Boolean(user) });
  const checkModeration = trpc.forum.moderationCheck.useQuery(moderationInput, { enabled: false });
  const createTopic = trpc.forum.createTopic.useMutation({
    onSuccess: () => {
      setTitle("");
      setBody("");
      void topics.refetch();
    },
  });
  const createReply = trpc.forum.createReply.useMutation({
    onSuccess: () => {
      setReplyBody("");
      void topicDetail.refetch();
    },
  });
  const report = trpc.forum.report.useMutation({
    onSuccess: () => setReportReason(""),
  });
  const hasAcceptedRules = Boolean(acceptance.data);
  const clearTopicFilters = () => {
    setCategoryId(undefined);
    setSubject(undefined);
    setLevel(undefined);
    setSelectedTopicId(undefined);
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f1e5] px-4 py-12 text-[#173247]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-[2rem] bg-[#173247] p-8 text-white shadow-xl">
          <p className="mb-2 text-sm text-[#d6a15b]">MIDAD LAW / COMMUNITY</p>
          <h1 className="text-4xl font-bold">منتدى مداد القانون</h1>
          <p className="mt-3 max-w-2xl text-white/80">مساحة تعليمية للنقاش الهادئ حول القانون والشريعة. لا تمثل المنشورات استشارة قانونية، وكل موضوع أو رد يمر بالمراجعة قبل ظهوره.</p>
        </header>

        <Card className="border-[#d6a15b]/40 bg-white/90 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#b9823b]" />قواعد المشاركة والخصوصية</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-[#59636a]">هذا المنتدى مخصص للتعلم وتبادل الفهم القانوني باحترام. لا تُعد المنشورات استشارة قانونية شخصية، وتخضع المشاركات للمراجعة قبل نشرها.</p>
            <div role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-bold leading-6 ${forumOpen ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}><Clock3 className="mt-1 h-4 w-4 shrink-0" /><span>{forumOpen ? `المشاركة متاحة الآن من 08:00 إلى 20:00 بتوقيت المغرب. يتبقى ${countdownLabel} على الإغلاق.` : `${FORUM_CLOSED_MESSAGE} يتبقى ${countdownLabel} على فتح المشاركة.`}</span></div>
            <ul className="grid gap-2 text-sm leading-6 text-[#173247] md:grid-cols-2">
              {(rules.data?.items ?? []).map((rule, index) => <li key={index} className="rounded-lg bg-[#f7f1e5] px-3 py-2">{rule}</li>)}
            </ul>
            {!user ? <div className="flex flex-wrap items-center gap-3"><Button onClick={() => startLogin()}>سجّل الدخول للمشاركة</Button><span className="text-xs text-[#59636a]">يمكنك تصفح الموضوعات دون تسجيل دخول.</span></div> : hasAcceptedRules ? <p className="text-sm font-medium text-emerald-700">تم تسجيل موافقتك على قواعد المنتدى. يمكنك الآن إرسال موضوع أو رد للمراجعة.</p> : <div className="flex flex-wrap items-center gap-3"><Button onClick={() => acceptRules.mutate()} disabled={acceptRules.isPending || acceptance.isLoading}>{acceptRules.isPending ? "جارٍ حفظ الموافقة..." : "أوافق على القواعد وأريد المشاركة"}</Button><span className="text-xs text-[#59636a]">نسخة القواعد: {rules.data?.version ?? "—"}</span></div>}
          </CardContent>
        </Card>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="border-[#e1d4bf] bg-white/80"><CardHeader><CardTitle>الفئات</CardTitle></CardHeader><CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={clearTopicFilters}>كل النقاشات</Button>
            {(categories.data ?? []).map(category => <Button key={category.id} variant="outline" className={`w-full justify-start ${categoryId === category.id ? "border-[#b9823b] bg-[#fffaf2]" : ""}`} onClick={() => { setCategoryId(category.id); setSelectedTopicId(undefined); }}>{category.name}</Button>)}
            <div className="mt-5 space-y-3 rounded-2xl border border-[#e1d4bf] bg-[#fffaf2] p-4">
              <p className="text-sm font-bold text-[#173247]">تصفية حسب المادة والمستوى</p>
              <select aria-label="تصفية حسب المادة" value={subject ?? "all"} onChange={event => { setSubject(event.target.value === "all" ? undefined : event.target.value as ForumSubject); setSelectedTopicId(undefined); }} className="h-10 w-full rounded-lg border border-[#d8cbb8] bg-white px-3 text-sm text-[#173247] outline-none focus:ring-2 focus:ring-[#d6a15b]">
                <option value="all">كل المواد</option>
                {FORUM_SUBJECTS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
              <select aria-label="تصفية حسب المستوى الدراسي" value={level ?? "all"} onChange={event => { setLevel(event.target.value === "all" ? undefined : event.target.value as ForumLevel); setSelectedTopicId(undefined); }} className="h-10 w-full rounded-lg border border-[#d8cbb8] bg-white px-3 text-sm text-[#173247] outline-none focus:ring-2 focus:ring-[#d6a15b]">
                <option value="all">كل المستويات</option>
                {FORUM_LEVELS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
              {(subject || level) && <Button type="button" variant="ghost" className="h-8 px-0 text-[#9a6c32]" onClick={() => { setSubject(undefined); setLevel(undefined); setSelectedTopicId(undefined); }}>مسح تصفية المادة والمستوى</Button>}
            </div>
            <div className="mt-6 rounded-xl bg-[#f7f1e5] p-4 text-sm text-[#59636a]"><ShieldCheck className="mb-2 h-5 w-5 text-[#b9823b]" />يحظر المنتدى الإساءة والتشهير والبيانات الشخصية والمحتوى الذي يقدم استشارة فردية على أنها حكم نهائي.</div>
          </CardContent></Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">الموضوعات المنشورة</h2><span className="text-sm text-[#59636a]">{topics.data?.length ?? 0} موضوع</span></div>
            {(topics.data ?? []).map(topic => <Card key={topic.id} className={`border-[#e1d4bf] bg-white/80 transition-shadow hover:shadow-md ${selectedTopicId === topic.id ? "ring-2 ring-[#d6a15b]" : ""}`}><CardContent className="flex items-start gap-4 p-5"><MessageCircle className="mt-1 h-5 w-5 shrink-0 text-[#b9823b]" /><div className="min-w-0 flex-1"><h3 className="font-bold">{topic.title}</h3><div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full bg-[#f7f1e5] px-2 py-1 text-[#9a6c32]">{topic.subject ?? "مادة غير مصنفة"}</span><span className="rounded-full bg-[#eef3f5] px-2 py-1 text-[#173247]">{getForumLevelLabel(topic.level)}</span></div><p className="mt-2 line-clamp-2 text-sm text-[#59636a]">{topic.body}</p><Button variant="link" className="mt-2 h-auto p-0 text-[#9a6c32]" onClick={() => setSelectedTopicId(topic.id)}>فتح الموضوع <ArrowRight className="mr-1 h-4 w-4" /></Button></div></CardContent></Card>)}
            {!topics.isLoading && !topics.data?.length && <Card><CardContent className="p-8 text-center text-[#59636a]">لا توجد موضوعات منشورة بعد. كن أول من يفتح نقاشاً تعليمياً.</CardContent></Card>}
          </div>
        </section>

        {selectedTopicId && <Card className="border-[#d6a15b]/50 bg-white/95 shadow-md"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>{topicDetail.data?.topic.title ?? "تفاصيل الموضوع"}</CardTitle><Button variant="ghost" onClick={() => setSelectedTopicId(undefined)}>إغلاق</Button></div></CardHeader><CardContent className="space-y-6">
          {topicDetail.isLoading ? <p className="text-sm text-[#59636a]">جارٍ تحميل الموضوع...</p> : topicDetail.data ? <>
            <div className="rounded-xl bg-[#f7f1e5] p-4 leading-8 text-[#173247]">{topicDetail.data.topic.body}</div>
            <div className="space-y-3"><h3 className="font-bold">الردود المنشورة ({topicDetail.data.replies.length})</h3>{topicDetail.data.replies.length ? topicDetail.data.replies.map(reply => <div key={reply.id} className="rounded-xl border border-[#e1d4bf] p-4"><p className="leading-7">{reply.body}</p><Button variant="ghost" size="sm" className="mt-2 text-[#9a6c32]" onClick={() => setReportReason(`reply:${reply.id}`)}><Flag className="ml-1 h-4 w-4" />الإبلاغ عن الرد</Button></div>) : <p className="text-sm text-[#59636a]">لا توجد ردود منشورة بعد.</p>}</div>
            {user && hasAcceptedRules && <form className="space-y-3 border-t border-[#e1d4bf] pt-5" onSubmit={event => { event.preventDefault(); if (!forumOpen) return; createReply.mutate({ topicId: selectedTopicId, body: replyBody }); }}><h3 className="font-bold">أضف رداً تعليمياً</h3>{!forumOpen && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-800"><Clock3 className="ml-1 inline h-4 w-4" />{FORUM_CLOSED_MESSAGE}</p>}{moderationStatus.data?.showWarning && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900"><ShieldCheck className="ml-1 inline h-4 w-4" />{moderationStatus.data.message}</p>}<Textarea value={replyBody} onChange={event => setReplyBody(event.target.value)} placeholder="اكتب رداً محترماً ومفيداً..." maxLength={5000} disabled={!forumOpen} /><Button disabled={!forumOpen || createReply.isPending || moderationStatus.data?.isBlocked || replyBody.trim().length < 5}>{moderationStatus.data?.isBlocked ? `المشاركة متوقفة مؤقتاً (${moderationStatus.data.remainingMinutes} د)` : createReply.isPending ? "جارٍ الإرسال للمراجعة..." : "إرسال الرد للمراجعة"}</Button></form>}
            {!user && <Button onClick={() => startLogin()}>سجّل الدخول لإضافة رد</Button>}
            <form className="space-y-3 border-t border-[#e1d4bf] pt-5" onSubmit={event => { event.preventDefault(); const replyId = reportReason.startsWith("reply:") ? Number(reportReason.split(":")[1]) : undefined; report.mutate({ topicId: replyId ? undefined : selectedTopicId, replyId, reason: reportReason.startsWith("reply:") ? "محتوى يحتاج مراجعة" : reportReason }); }}><h3 className="flex items-center gap-2 font-bold"><Flag className="h-4 w-4 text-[#b9823b]" />الإبلاغ عن مشكلة</h3><Textarea value={reportReason.startsWith("reply:") ? "" : reportReason} onChange={event => setReportReason(event.target.value)} placeholder="اذكر سبب الإبلاغ باختصار..." maxLength={500} /><Button variant="outline" disabled={!user || report.isPending || (!reportReason.trim() && !reportReason.startsWith("reply:"))}>{report.isPending ? "جارٍ إرسال البلاغ..." : "إرسال البلاغ"}</Button>{!user && <p className="text-xs text-[#59636a]">سجّل الدخول لإرسال بلاغ يحفظ معرّفك لحماية المنتدى من البلاغات العشوائية.</p>}</form>
          </> : <p className="text-sm text-[#59636a]">الموضوع غير متاح أو تمت إزالته من العرض العام.</p>}
        </CardContent></Card>}

        <Card className="border-[#e1d4bf] bg-white/90"><CardHeader><CardTitle>فتح موضوع جديد</CardTitle></CardHeader><CardContent className="space-y-4">
          {!user ? <Button onClick={() => startLogin()}>سجّل الدخول للمشاركة</Button> : !hasAcceptedRules ? <p className="rounded-lg bg-[#f7f1e5] p-4 text-sm text-[#59636a]">وافق على قواعد المشاركة أعلاه قبل إرسال موضوع جديد.</p> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!forumOpen) { setModerationWarning(FORUM_CLOSED_MESSAGE); return; } if (!categoryId || !subject || !level) return; setModerationWarning(""); void checkModeration.refetch().then(({ data }) => { if (!data) return; if (!data.allowed) { setModerationWarning(data.warning); return; } if (categoryId && subject && level) createTopic.mutate({ categoryId, subject, level, title, body }); }).catch(error => setModerationWarning(error instanceof Error ? error.message : "تعذر فحص المحتوى")); }}><div className="grid gap-3 sm:grid-cols-2"><select aria-label="مادة الموضوع" value={subject ?? ""} onChange={event => setSubject((event.target.value || undefined) as ForumSubject | undefined)} required disabled={!forumOpen} className="h-10 w-full rounded-lg border border-[#d8cbb8] bg-white px-3 text-sm text-[#173247] outline-none focus:ring-2 focus:ring-[#d6a15b]"><option value="" disabled>اختر المادة</option>{FORUM_SUBJECTS.map(item => <option key={item} value={item}>{item}</option>)}</select><select aria-label="مستوى الموضوع" value={level ?? ""} onChange={event => setLevel((event.target.value || undefined) as ForumLevel | undefined)} required disabled={!forumOpen} className="h-10 w-full rounded-lg border border-[#d8cbb8] bg-white px-3 text-sm text-[#173247] outline-none focus:ring-2 focus:ring-[#d6a15b]"><option value="" disabled>اختر المستوى الدراسي</option>{FORUM_LEVELS.map(item => <option key={item} value={item}>{item}</option>)}</select></div><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="عنوان النقاش" maxLength={220} disabled={!forumOpen} /><Textarea value={body} onChange={event => setBody(event.target.value)} placeholder="اكتب طرحاً تعليمياً محترماً..." maxLength={10000} disabled={!forumOpen} />{moderationStatus.data?.showWarning && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900"><ShieldCheck className="ml-1 inline h-4 w-4" />{moderationStatus.data.message}</p>}{moderationWarning && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800"><ShieldCheck className="ml-1 inline h-4 w-4" />{moderationWarning}</p>}<Button disabled={!forumOpen || !categoryId || !subject || !level || createTopic.isPending || checkModeration.isFetching || moderationStatus.data?.isBlocked}>{checkModeration.isFetching ? "جارٍ فحص المحتوى..." : createTopic.isPending ? "جارٍ الإرسال للمراجعة..." : "إرسال للمراجعة"}</Button></form>}
        </CardContent></Card>
        <Link href="/" className="inline-block text-sm text-[#9a6c32]">العودة إلى الصفحة الرئيسية</Link>
      </div>
    </main>
  );
}
