import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import PublicReviews from "@/components/PublicReviews";
import { DEFAULT_PRODUCT_CODE } from "@shared/const";
import { formatSupportCountdown, getSupportStatusLabel } from "@shared/supportAvailability";
import { calculateQuizScore, getIncorrectReviewConcepts, getQuizChapterAnchor, getQuizQuestionState, getQuizResultStatus, QUIZ_PASSING_PERCENTAGE, shuffleQuizQuestions, type QuizQuestion } from "@shared/quiz";
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  FileText,
  LockKeyhole,
  Menu,
  MessageCircle,
  MoveLeft,
  Scale,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

const bookCover = "/manus-storage/midad-book-cover_a427e97b.png";
const heroTexture = "/manus-storage/midad-hero-texture_780e9e01.png";
const brandMark = "/manus-storage/midad-mark_68d51083.png";
const landingInput = { productCode: DEFAULT_PRODUCT_CODE };

type ActiveQuiz = { chapterNumber: string; questionIndex: number; score: number; selectedIndex: number | null; submitted: boolean; completed: boolean; answers: Array<number | null>; evaluated: boolean[]; questions: QuizQuestion[] };

function parseQuestions(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function parseQuizQuestions(value: string): QuizQuestion[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is QuizQuestion => Boolean(item && typeof item.question === "string" && Array.isArray(item.options) && item.options.length >= 2 && item.options.every((option: unknown) => typeof option === "string") && Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex < item.options.length));
  } catch {
    return [];
  }
}

const parseObjectives = parseQuestions;

const fallbackChapters = [
  ["01", "مفهوم القانون ووظائفه", "المفاهيم التي تمنحك نقطة البداية."],
  ["02", "القاعدة القانونية وخصائصها", "الإلزام والعموم والتجريد والجزاء."],
  ["03", "تصنيفات القواعد القانونية", "خريطة مختصرة للأنواع والتقسيمات."],
  ["04", "مصادر القانون", "التشريع والعرف والقضاء والفقه."],
  ["05", "فروع القانون", "العام والخاص والفروع الرئيسية."],
  ["06", "أشخاص القانون", "الشخص الطبيعي والاعتباري والأهلية."],
  ["07", "الحق", "المفهوم والعناصر والأنواع."],
  ["08", "الالتزام", "المفهوم والمصادر والآثار."],
];

const fallbackUpcomingChapters = [
  "قانون الالتزامات والعقود",
  "القانون الدستوري",
  "التنظيم الإداري",
  "القانون الجنائي العام",
  "المدخل إلى العلوم السياسية",
  "المدخل إلى علم الاقتصاد",
  "القانون المدني",
  "القانون التجاري",
  "قانون الشغل",
];

const fallbackQuizzes: Record<string, QuizQuestion[]> = {
  "01": [{ question: "أي خاصية تعني أن القاعدة القانونية تخاطب الأشخاص بصفاتهم لا بذواتهم؟", options: ["العمومية والتجريد", "الطابع الفردي", "الرأي الشخصي", "العادة الخاصة"], correctIndex: 0, explanation: "العمومية والتجريد يجعلان القاعدة منطبقة على كل من تتوافر فيه الصفة المحددة." }, { question: "ما الوظيفة الأساسية للقانون داخل المجتمع؟", options: ["تنظيم سلوك الأفراد وتحقيق الاستقرار", "إلغاء كل الحريات", "تسجيل الآراء الشخصية", "تحديد العادات الأسرية فقط"], correctIndex: 0, explanation: "ينظم القانون العلاقات ويحقق الاستقرار والأمن داخل المجتمع." }, { question: "بماذا تتميز القاعدة القانونية عن النصيحة؟", options: ["اقترانها بجزاء تفرضه السلطة المختصة", "كونها اختيارية دائماً", "عدم قابليتها للتطبيق", "ارتباطها بشخص واحد فقط"], correctIndex: 0, explanation: "الإلزام والجزاء من أبرز ما يميز القاعدة القانونية." }],
  "02": [{ question: "ما المقصود بالجزاء القانوني؟", options: ["جزاء توقعه الجهة المختصة عند مخالفة القاعدة", "نصيحة أخلاقية فقط", "عادة اجتماعية غير ملزمة", "رأي فقهي غير مؤثر"], correctIndex: 0, explanation: "الجزاء القانوني توقعه سلطة أو جهة مختصة وفقاً للقانون." }, { question: "ماذا يعني وصف القاعدة القانونية بأنها ملزمة؟", options: ["يجب احترامها ويمكن فرضها عند المخالفة", "يجوز تجاهلها دائماً", "تخص القاضي وحده", "تطبق على واقعة واحدة فقط"], correctIndex: 0, explanation: "الإلزام يعني وجوب احترام القاعدة مع إمكان ترتيب الجزاء عند مخالفتها." }, { question: "لماذا تكون القاعدة القانونية مجردة؟", options: ["لأنها تضع نموذجاً عاماً للحالات المتشابهة", "لأنها لا تطبق أبداً", "لأنها تعبر عن رأي فردي", "لأنها لا تتضمن حكماً"], correctIndex: 0, explanation: "التجريد يجعل الحكم قابلاً للتطبيق على كل حالة تتوافر فيها شروطه." }],
  "03": [{ question: "ما القاعدة التي لا يجوز الاتفاق على مخالفتها؟", options: ["القاعدة الآمرة", "القاعدة المكملة", "القاعدة التفسيرية فقط", "القاعدة الاختيارية دائماً"], correctIndex: 0, explanation: "القاعدة الآمرة ترتبط بمصلحة أساسية ولا يجوز الاتفاق على مخالفتها." }, { question: "متى تعمل القاعدة المكملة؟", options: ["عند غياب اتفاق مخالف بين الأطراف", "عند منع كل اتفاق", "فقط في المسائل الجنائية", "عندما تلغى القاعدة الآمرة"], correctIndex: 0, explanation: "تطبق القاعدة المكملة عند عدم اتفاق الأطراف على تنظيم مختلف." }, { question: "ما فائدة تصنيف القواعد القانونية؟", options: ["معرفة نطاق التطبيق وإمكان الاتفاق على مخالفتها", "زيادة عدد النصوص فقط", "إلغاء الجزاء", "استبدال القانون بالعادات"], correctIndex: 0, explanation: "يساعد التصنيف على فهم طبيعة القاعدة وأثرها العملي." }],
  "04": [{ question: "أي مما يلي يعد مصدراً رسمياً للقانون؟", options: ["التشريع", "التوقع الشخصي", "المذكرة الخاصة", "الرأي غير المنشور"], correctIndex: 0, explanation: "التشريع مصدر رسمي ينشئ قواعد قانونية وفق الإجراءات المعتمدة." }, { question: "ما المقصود بالعرف؟", options: ["اعتياد الناس على سلوك مع الاعتقاد بإلزامه", "رأي فردي عابر", "نص تشريعي مكتوب دائماً", "حكم قضائي في كل الحالات"], correctIndex: 0, explanation: "العرف يقوم على عنصر مادي هو الاعتياد وعنصر معنوي هو الشعور بالإلزام." }, { question: "ما دور القضاء بالنسبة للقواعد القانونية؟", options: ["تفسير النصوص وتطبيقها على المنازعات", "سن كل القوانين بدلاً من المشرع", "إلغاء العرف دائماً", "تحديد الأسعار التجارية"], correctIndex: 0, explanation: "يساهم القضاء في تفسير النصوص وتطبيقها على الوقائع المعروضة." }],
  "05": [{ question: "ما أساس التمييز بين القانون العام والقانون الخاص؟", options: ["طبيعة المصالح والعلاقات المنظمة", "عدد صفحات القانون", "لغة النص فقط", "مكان دراسة المادة"], correctIndex: 0, explanation: "يقوم التقسيم على طبيعة المصالح والعلاقات التي ينظمها كل فرع." }, { question: "بماذا يهتم القانون العام أساساً؟", options: ["بتنظيم الدولة وعلاقاتها بوصفها صاحبة سيادة", "بالعلاقات الأسرية فقط", "بالعقود الخاصة وحدها", "بالأعراف المهنية فقط"], correctIndex: 0, explanation: "ينظم القانون العام الدولة والسلطات العامة وعلاقاتها ذات الطابع السيادي." }, { question: "ما المجال النموذجي للقانون الخاص؟", options: ["تنظيم العلاقات بين الأشخاص على قدم المساواة", "تنظيم أجهزة الدولة فقط", "تحديد العقوبات الجنائية فقط", "تنظيم الانتخابات وحدها"], correctIndex: 0, explanation: "يركز القانون الخاص على العلاقات بين الأفراد والكيانات الخاصة." }],
  "06": [{ question: "من تثبت له الشخصية القانونية؟", options: ["الشخص الطبيعي أو الشخص الاعتباري", "الأشياء المادية فقط", "الوقائع دون أصحابها", "النصوص غير المنشورة"], correctIndex: 0, explanation: "تثبت الشخصية القانونية للشخص الطبيعي وللكيان الاعتباري المعترف به قانوناً." }, { question: "ما المقصود بالشخص الاعتباري؟", options: ["كيان يعترف له القانون بشخصية مستقلة", "شيء مادي بلا ذمة", "واقعة قانونية فقط", "عقد غير مكتوب دائماً"], correctIndex: 0, explanation: "الشخص الاعتباري كيان منظم له حقوق والتزامات مستقلة وفق القانون." }, { question: "ماذا تعني الأهلية؟", options: ["صلاحية الشخص لاكتساب الحقوق ومباشرتها", "اسم الشخص فقط", "مكان الإقامة وحده", "نوع الجزاء القانوني"], correctIndex: 0, explanation: "ترتبط الأهلية بقدرة الشخص على اكتساب الحقوق وممارسة التصرفات القانونية." }],
  "07": [{ question: "ما المقصود بصاحب الحق؟", options: ["الشخص الذي تثبت له المصلحة أو السلطة المحمية", "الجزاء وحده", "النص دون مستفيد", "المكان الذي وقع فيه التصرف"], correctIndex: 0, explanation: "صاحب الحق هو الشخص الذي تثبت له المصلحة أو السلطة التي يحميها القانون." }, { question: "ما العنصر الذي يحدد محل الحق؟", options: ["المصلحة أو الشيء الذي ينصب عليه الحق", "اسم القاضي فقط", "رقم القانون دائماً", "مكان نشر الجريدة"], correctIndex: 0, explanation: "محل الحق هو الشيء أو الأداء أو المصلحة التي يرد عليها الحق." }, { question: "ما الفرق بين الحق الشخصي والحق العيني؟", options: ["الحق الشخصي رابطة بين دائن ومدين، والعيني سلطة مباشرة على شيء", "لا فرق بينهما", "العيني لا يحميه القانون", "الشخصي يتعلق بالأشياء فقط"], correctIndex: 0, explanation: "يقوم الحق الشخصي على مطالبة المدين، بينما يرد الحق العيني مباشرة على شيء." }],
  "08": [{ question: "ما أطراف الالتزام في صورته الأساسية؟", options: ["الدائن والمدين", "القاضي والشاهد دائماً", "المشرع والناخب", "المحامي والخبير فقط"], correctIndex: 0, explanation: "الالتزام رابطة قانونية بين دائن له حق المطالبة ومدين يقع عليه الأداء." }, { question: "ما محل الالتزام؟", options: ["أداء قد يكون إعطاء شيء أو القيام بعمل أو الامتناع عنه", "اسم الدائن فقط", "الجزاء دون الأداء", "مكان إبرام العقد دائماً"], correctIndex: 0, explanation: "ينصب الالتزام على أداء محدد يمكن أن يكون إعطاء أو عملاً أو امتناعاً." }, { question: "ما أحد مصادر الالتزام؟", options: ["العقد", "اللون المفضل", "المكان الدراسي", "الرأي الشخصي"], correctIndex: 0, explanation: "العقد من المصادر الإرادية المعروفة للالتزام إلى جانب مصادر أخرى يحددها القانون." }],
};

const fallbackChapterPreviews = [
  { number: "01", title: "مفهوم القانون ووظائفه", excerpt: "القانون مجموعة قواعد عامة ومجردة تهدف إلى تنظيم سلوك الأفراد داخل المجتمع، وتستمد أهميتها من اقترانها بجزاء يضمن احترامها.", objectives: ["تعريف القانون وبيان وظائفه داخل المجتمع.", "تمييز القاعدة القانونية عن القواعد الاجتماعية الأخرى."], questions: ["ما الفرق بين القاعدة القانونية والقاعدة الأخلاقية؟", "ما الوظيفة التي يحققها القانون داخل المجتمع؟"] },
  { number: "02", title: "القاعدة القانونية وخصائصها", excerpt: "تتميز القاعدة القانونية بالعموم والتجريد والإلزام، ولا تخاطب شخصاً بعينه أو واقعة منفردة، بل تضع نموذجاً ينطبق على الحالات المتشابهة.", objectives: ["فهم خصائص القاعدة القانونية.", "شرح معنى الإلزام والجزاء القانوني."], questions: ["ماذا نعني بكون القاعدة القانونية عامة ومجردة؟", "ما المقصود بالجزاء القانوني؟"] },
  { number: "03", title: "تصنيفات القواعد القانونية", excerpt: "يساعد تصنيف القواعد إلى آمرة ومكملة، وإلى موضوعية وشكلية، على فهم نطاق تطبيقها ومعرفة ما إذا كان يجوز للأفراد الاتفاق على مخالفتها.", objectives: ["التمييز بين القواعد الآمرة والقواعد المكملة.", "فهم أهمية تصنيف القواعد القانونية."], questions: ["كيف تميز القاعدة الآمرة عن القاعدة المكملة؟", "لماذا يفيد تقسيم القانون إلى قواعد موضوعية وشكلية؟"] },
  { number: "04", title: "مصادر القانون", excerpt: "يأتي التشريع في مقدمة المصادر الرسمية للقانون، إلى جانب العرف ومبادئ الشريعة والقضاء والفقه بحسب ترتيبها وقيمتها داخل النظام القانوني.", objectives: ["التعرف إلى المصادر الرسمية والتفسيرية للقانون.", "ترتيب قيمة التشريع والعرف والقضاء والفقه في بناء القاعدة القانونية."], questions: ["ما الفرق بين المصدر الرسمي والمصدر التفسيري؟", "متى يمكن أن يكتسب العرف قيمة قانونية؟"] },
  { number: "05", title: "فروع القانون", excerpt: "يقوم التمييز بين القانون العام والقانون الخاص على طبيعة المصالح والعلاقات التي ينظمها كل فرع، مع وجود فروع تتداخل فيها الاعتبارات العامة والخاصة.", objectives: ["التمييز بين القانون العام والقانون الخاص.", "التعرف إلى أهم فروع القانون ومجالاتها."], questions: ["ما أساس التمييز بين القانون العام والقانون الخاص؟", "أين يندرج القانون الإداري ضمن هذا التقسيم؟"] },
  { number: "06", title: "أشخاص القانون", excerpt: "الشخص القانوني هو من تثبت له أهلية اكتساب الحقوق وتحمل الالتزامات؛ وقد يكون شخصاً طبيعياً أو كياناً اعتبارياً يعترف له القانون بالشخصية.", objectives: ["تعريف الشخصية القانونية وأطرافها.", "التمييز بين الشخص الطبيعي والشخص الاعتباري والأهلية."], questions: ["ما المقصود بالشخصية القانونية؟", "ما الفرق بين أهلية الوجوب وأهلية الأداء؟"] },
  { number: "07", title: "الحق", excerpt: "الحق مصلحة أو سلطة يحميها القانون، ويقوم عادة على صاحب حق ومحل ووسيلة حماية. وتختلف الحقوق باختلاف موضوعها وأصحابها وآثارها.", objectives: ["تحديد مفهوم الحق وعناصره الأساسية.", "التمييز بين أنواع الحقوق ووسائل حمايتها."], questions: ["ما العناصر الأساسية التي يقوم عليها الحق؟", "كيف تميز بين الحق الشخصي والحق العيني؟"] },
  { number: "08", title: "الالتزام", excerpt: "الالتزام رابطة قانونية بين دائن ومدين، يلتزم بموجبها المدين بأداء عمل أو الامتناع عنه أو نقل حق، ويقابلها حق للدائن في المطالبة بالتنفيذ.", objectives: ["تعريف الالتزام وتحديد أطرافه ومحله.", "فهم مصادر الالتزام وآثاره الأساسية."], questions: ["ما أطراف الالتزام وما محله؟", "ما الفرق بين الالتزام المدني والالتزام الطبيعي؟"] },
];

const fallbackFaqs = [
  ["ما طبيعة منتج MIDAD؟", "MIDAD ملخص رقمي منظم يساعد طالب القانون على بناء أساس واضح للمراجعة وفهم المفاهيم الأساسية، مع أسئلة قصيرة لاختبار الفهم. وهو مادة مساعدة، وليس بديلاً عن المحاضرات أو المراجع التي يحددها الأستاذ."],
  ["هل هذا ملخص رسمي صادر عن جامعة ابن زهر؟", "لا. هذا منتج تعليمي رقمي مستقل موجّه إلى الطلبة للمراجعة الذاتية. لا يمثل مقرراً رسمياً أو وثيقة صادرة عن الجامعة، ولا يعني أن الجامعة راجعت المنتج أو اعتمدته."],
  ["هل يضمن الملخص النجاح في الامتحان؟", "لا يمكن لأي ملخص أن يضمن نتيجة امتحان. صُمّم المنتج للمساعدة في الفهم والتنظيم والمراجعة، وتبقى النتيجة مرتبطة بانتظام الطالب وقراءته للمحاضرات والمراجع والتزامه بتوجيهات الأستاذ."],
  ["ماذا تعني المراجعة التطبيقية؟", "تعني أن المحتوى لا يكتفي بعرض المفاهيم، بل يساعدك على ترتيبها وفهم صلتها ببعضها واسترجاعها من خلال أمثلة وأسئلة قصيرة واختبارات فهم عند توفرها. وهي أداة للمراجعة الذاتية، وليست تصحيحاً رسمياً لأجوبة الامتحان أو بديلاً عن المحاضرات والمراجع."],
  ["ماذا تعني التحديثات المجانية مدى الحياة؟", "يعني ذلك أن من يشتري المنتج يحصل على التحديثات والفصول القادمة المرتبطة به دون دفع رسوم إضافية بسبب إصدارها لاحقاً، بغض النظر عن السعر الذي دفعه وقت الشراء. ولا يشمل ذلك منتجات مستقلة جديدة أو خدمات استشارية أو دروساً فردية غير معلنة ضمن المنتج."],
  ["ماذا يشمل الشراء؟", "يشمل الوصول إلى الملف الرقمي الخاص بالمنتج، والاستفادة من التحديثات والفصول القادمة المرتبطة به مجاناً مدى الحياة، بغض النظر عن السعر الذي تم دفعه وقت الشراء."],
  ["كيف يتم تأكيد الطلب وتسليم الملف؟", "ترسل بيانات الطلب وإثبات التحويل البنكي، ثم تراجع الإدارة العملية يدوياً. بعد اعتماد الطلب، يُتاح لك رابط تنزيل خاص وفق آلية التسليم المعتمدة في المنصة."],
  ["كم تستغرق مراجعة الطلب؟", "تتم مراجعة التحويل البنكي يدوياً عادةً خلال 24 ساعة من وصول بيانات العملية وإثبات الدفع، وقد تمتد المدة قليلاً في العطل أو عند الحاجة إلى تحقق إضافي. إذا تأخرت الحالة، أرسل رقم الطلب والبريد أو رقم واتساب المستخدم عبر صفحة الدعم أو واتساب لتسهيل المتابعة."],
  ["ما طرق الدفع المتاحة وكم تستغرق مراجعة التحويل؟", "الدفع المتاح حالياً هو التحويل البنكي إلى الحساب المخصص لدى التجاري وفا بنك، ثم إرسال مرجع العملية وإثبات التحويل عبر نموذج الطلب. لا يتم تسليم الملف قبل التأكد اليدوي من العملية، وتستغرق المراجعة عادةً خلال 24 ساعة. عند وجود مشكلة في التحويل أو عدم وصول رد، يمكنك التواصل مع فريق مركز الاتصال عبر WhatsApp مع ذكر رقم الطلب واسم صاحب التحويل لتسريع المتابعة."],
  ["هل يمكنني قراءة الملف على الهاتف؟", "نعم. الملف بصيغة PDF ومهيأ للقراءة الرقمية بالعربية، مع تنسيق مناسب للهاتف والحاسوب والطباعة الشخصية."],
  ["هل يشمل المنتج استشارة قانونية؟", "لا. المحتوى تعليمي عام للمراجعة، ولا يشكل استشارة قانونية أو رأياً مهنياً في واقعة محددة."],
  ["ماذا أفعل إذا أخطأت في البريد أو رقم واتساب؟", "استخدم طلب تصحيح البيانات المرتبط برقم الطلب، أو تواصل عبر واتساب مع ذكر رقم الطلب بوضوح. تراجع الإدارة التصحيح قبل تطبيقه حفاظاً على سلامة التسليم."],
];

function scrollToPurchase() {
  document.getElementById("purchase")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

type SampleFieldErrors = { fullName?: string; email?: string; whatsapp?: string; consent?: string };

function validateSampleForm(form: { fullName: string; email: string; whatsapp: string; consent: boolean }): SampleFieldErrors {
  const errors: SampleFieldErrors = {};
  if (!/^(?=.*[A-Za-z\u0600-\u06FF])(?=.*\s+.*[A-Za-z\u0600-\u06FF]).{2,160}$/.test(form.fullName.trim())) errors.fullName = "أدخل اسماً كاملاً مكوناً من كلمتين على الأقل.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "أدخل بريداً إلكترونياً صالحاً.";
  const normalizedWhatsapp = form.whatsapp.replace(/[\s()-]/g, "");
  if (!/^(?:0[5-7]\d{8}|(?:\+?212)[5-7]\d{8})$/.test(normalizedWhatsapp)) errors.whatsapp = "أدخل رقم واتساب مغربياً بصيغة 06XXXXXXXX أو +2126XXXXXXXX.";
  if (!form.consent) errors.consent = "الموافقة مطلوبة لفتح العينة.";
  return errors;
}

function extractSampleFieldErrors(error: unknown): SampleFieldErrors {
  const candidate = error as { message?: string; data?: { zodError?: { fieldErrors?: Record<string, string[]> } } };
  const fieldErrors = candidate.data?.zodError?.fieldErrors;
  if (fieldErrors) return Object.fromEntries(Object.entries(fieldErrors).map(([key, messages]) => [key, messages[0]])) as SampleFieldErrors;
  const message = candidate.message ?? "تعذر تجهيز العينة.";
  if (message.includes("واتساب")) return { whatsapp: message };
  if (message.includes("الاسم")) return { fullName: message };
  if (message.includes("البريد")) return { email: message };
  if (message.includes("الموافقة")) return { consent: message };
  return {};
}

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  let { user, loading, error, isAuthenticated, logout } = useAuth();
  const landingQuery = trpc.landing.published.useQuery(landingInput, { retry: false });
  const trackAnalytics = trpc.analytics.track.useMutation();
  useEffect(() => {
    const storageKey = "midad-anonymous-visitor";
    const visitorKey = localStorage.getItem(storageKey) ?? crypto.randomUUID();
    localStorage.setItem(storageKey, visitorKey);
    trackAnalytics.mutate({ eventType: "page_view", productCode: DEFAULT_PRODUCT_CODE, visitorKey });
  }, []);
  const publishedProduct = landingQuery.data?.product;
  const activeCoverUrl = landingQuery.data?.coverUrl ?? bookCover;
  const appSettings = landingQuery.data?.settings ?? {};
  const pricing = landingQuery.data?.pricing;
  const productPriceMad = pricing?.priceMad ?? publishedProduct?.priceMad ?? Number(appSettings.defaultPriceMad ?? 19);
  const earlyBirdActive = pricing?.earlyBirdActive ?? productPriceMad === 19;
  const earlyBirdSeatsRemaining = pricing?.earlyBirdSeatsRemaining ?? 10;
  const earlyBirdApprovedBuyers = pricing?.approvedBuyers ?? Math.max(10 - earlyBirdSeatsRemaining, 0);
  const earlyBirdProgress = Math.min(Math.max((earlyBirdApprovedBuyers / 10) * 100, 0), 100);
  const whatsappNumber = appSettings.whatsappNumber ?? "0664173090";
  const bankTransferReviewDuration = Math.min(Math.max(Number(appSettings.bankTransferReviewDuration ?? 24) || 24, 1), 168);
  const bankTransferReviewDurationLabel = `${bankTransferReviewDuration} ساعة`;
  const quizSuccessMessage = appSettings.quizSuccessMessage ?? "أحسنت، لقد بلغت حد النجاح. واصل القراءة والتحليل والمراجعة.";
  const quizFailureMessage = appSettings.quizFailureMessage ?? "تحتاج إلى مراجعة إضافية. أعد قراءة المحور وحلل المفاهيم ثم أعد المحاولة.";
  const upcomingChapters = (() => { try { const parsed = JSON.parse(appSettings.upcomingChapters ?? ""); return Array.isArray(parsed) && parsed.length ? parsed.map(String).filter(Boolean) : fallbackUpcomingChapters; } catch { return fallbackUpcomingChapters; } })();
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, "").replace(/^0/, "212")}?text=${encodeURIComponent("السلام عليكم، أرغب في الاستفسار عن ${DEFAULT_PRODUCT_CODE}")}`;
  const [supportNow, setSupportNow] = useState(() => new Date());
  const supportAvailable = getSupportStatusLabel(supportNow) === "متاح الآن";
  const supportCountdown = formatSupportCountdown(supportNow);
  useEffect(() => {
    const timer = window.setInterval(() => setSupportNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const bankBeneficiary = appSettings.bankBeneficiary ?? "M MOUHAMITI ABDELLAH";
  const bankRib = appSettings.bankRib ?? "007430000270870030001970";
  const chapters = landingQuery.data?.chapters?.length
    ? landingQuery.data.chapters.map(chapter => [chapter.chapterNumber, chapter.title, chapter.excerpt] as [string, string, string])
    : fallbackChapters;
  const chapterPreviews = landingQuery.data?.chapters?.length
    ? landingQuery.data.chapters.map(chapter => ({ number: chapter.chapterNumber, title: chapter.title, excerpt: chapter.excerpt, objectives: parseObjectives(chapter.learningObjectives ?? "[]"), questions: parseQuestions(chapter.questionsJson), quiz: parseQuizQuestions(chapter.questionsJson).map(question => ({ ...question, reviewConcept: question.reviewConcept ?? chapter.title })) }))
    : fallbackChapterPreviews.map(preview => ({ ...preview, quiz: (fallbackQuizzes[preview.number] ?? []).map(question => ({ ...question, reviewConcept: question.reviewConcept ?? preview.title })) }));
  const faqs = (landingQuery.data?.faqs?.length
    ? landingQuery.data.faqs.map(faq => [faq.question, faq.answer] as [string, string])
    : fallbackFaqs).map(([question, answer]) => {
      const isTransferFaq = question.includes("التحويل") || question.includes("الدفع") || question.includes("مراجعة الطلب");
      return [question, isTransferFaq ? answer.replace(/خلال\s+\d+\s+ساعة/g, `خلال ${bankTransferReviewDurationLabel}`) : answer] as [string, string];
    });

  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [transferSent, setTransferSent] = useState<number | null>(null);
  const [transferOrderNumber, setTransferOrderNumber] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleForm, setSampleForm] = useState({ fullName: "", email: "", whatsapp: "", consent: false });
  const [sampleError, setSampleError] = useState("");
  const [sampleFieldErrors, setSampleFieldErrors] = useState<SampleFieldErrors>({});
  const submitSampleLead = trpc.sample.submitLead.useMutation();
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", transactionReference: "" });
  const [transferConsent, setTransferConsent] = useState(false);
  const createTransferRequest = trpc.purchase.createTransferRequest.useMutation();
  const requestDataCorrection = trpc.purchase.requestDataCorrection.useMutation();
  const correctionStatusQuery = trpc.purchase.correctionStatus.useQuery(
    { requestId: transferSent ?? 0, customerEmail: form.customerEmail },
    { enabled: Boolean(transferSent && form.customerEmail), retry: false },
  );
  const [correctionForm, setCorrectionForm] = useState({ email: "", phone: "", reason: "" });
  const downloadQuery = trpc.purchase.getDownloadLink.useQuery(
    { requestId: transferSent ?? 0, customerEmail: form.customerEmail },
    { enabled: false, retry: false },
  );

  const activeQuizPreview = activeQuiz ? chapterPreviews.find(preview => preview.number === activeQuiz.chapterNumber) : null;
  const activeQuizQuestion = activeQuiz ? activeQuiz.questions[activeQuiz.questionIndex] : undefined;

  const openChapterQuiz = (chapterNumber: string) => {
    const preview = chapterPreviews.find(item => item.number === chapterNumber);
    if (!preview?.quiz.length) {
      toast.info("سيُضاف اختبار هذا المحور قريباً.");
      return;
    }
    const questions = shuffleQuizQuestions(preview.quiz);
    setActiveQuiz({ chapterNumber, questionIndex: 0, score: 0, selectedIndex: null, submitted: false, completed: false, answers: Array(questions.length).fill(null), evaluated: Array(questions.length).fill(false), questions });
  };

  const chooseQuizAnswer = (selectedIndex: number) => {
    if (!activeQuiz || activeQuiz.submitted) return;
    const answers = [...activeQuiz.answers];
    answers[activeQuiz.questionIndex] = selectedIndex;
    setActiveQuiz({ ...activeQuiz, selectedIndex, answers });
  };

  const submitQuizAnswer = () => {
    if (!activeQuiz || activeQuiz.selectedIndex === null) return;
    const evaluated = [...activeQuiz.evaluated];
    evaluated[activeQuiz.questionIndex] = true;
    const score = calculateQuizScore(activeQuiz.questions, activeQuiz.answers);
    setActiveQuiz({ ...activeQuiz, score, evaluated, submitted: true });
  };

  const nextQuizQuestion = () => {
    if (!activeQuiz || !activeQuizPreview) return;
    if (activeQuiz.questionIndex + 1 >= activeQuizPreview.quiz.length) {
      setActiveQuiz({ ...activeQuiz, score: calculateQuizScore(activeQuiz.questions, activeQuiz.answers), completed: true });
      toast.success("أحسنت، اكتمل اختبار المحور.");
      return;
    }
    const nextIndex = activeQuiz.questionIndex + 1;
    const nextState = getQuizQuestionState(activeQuiz.answers, activeQuiz.evaluated, nextIndex);
    setActiveQuiz({ ...activeQuiz, questionIndex: nextIndex, ...nextState, completed: false });
  };

  const previousQuizQuestion = () => {
    if (!activeQuiz || activeQuiz.questionIndex === 0) return;
    const previousIndex = activeQuiz.questionIndex - 1;
    const previousState = getQuizQuestionState(activeQuiz.answers, activeQuiz.evaluated, previousIndex);
    setActiveQuiz({ ...activeQuiz, questionIndex: previousIndex, ...previousState, completed: false });
  };

  const retryQuiz = () => {
    if (!activeQuiz || !activeQuizPreview) return;
    const questions = shuffleQuizQuestions(activeQuizPreview.quiz);
    setActiveQuiz({ ...activeQuiz, questionIndex: 0, score: 0, selectedIndex: null, submitted: false, completed: false, answers: Array(questions.length).fill(null), evaluated: Array(questions.length).fill(false), questions });
  };

  const reviewChapter = () => {
    if (!activeQuiz) return;
    const chapterAnchor = getQuizChapterAnchor(activeQuiz.chapterNumber);
    setActiveQuiz(null);
    window.requestAnimationFrame(() => {
      document.getElementById(chapterAnchor)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const resetTransferFlow = () => {
    setTransferOpen(false);
    setShowBankDetails(false);
    setTransferSent(null);
    setTransferOrderNumber(null);
    setProofFile(null);
    setForm({ customerName: "", customerEmail: "", customerPhone: "", transactionReference: "" });
    setTransferConsent(false);
    createTransferRequest.reset();
  };

  const handleCheckout = () => {
    resetTransferFlow();
    setTransferOpen(true);
  };

  const handleSampleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSampleError("");
    const localErrors = validateSampleForm(sampleForm);
    setSampleFieldErrors(localErrors);
    if (Object.keys(localErrors).length > 0) {
      setSampleError("يرجى تصحيح الحقول المشار إليها قبل المتابعة.");
      return;
    }
    try {
      const normalizedFullName = sampleForm.fullName.trim().replace(/\s+/g, " ");
      const result = await submitSampleLead.mutateAsync({ productCode: DEFAULT_PRODUCT_CODE, ...sampleForm, fullName: normalizedFullName, consent: sampleForm.consent });
      const link = document.createElement("a");
      link.href = result.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();
      setSampleOpen(false);
      setSampleError("");
      setSampleFieldErrors({});
      setSampleForm({ fullName: "", email: "", whatsapp: "", consent: false });
      toast.success("تم التحقق من بياناتك", { description: "ستفتح العينة المجانية في نافذة جديدة. الرابط صالح لمدة 15 دقيقة." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تجهيز العينة";
      const fieldErrors = extractSampleFieldErrors(error);
      setSampleFieldErrors(fieldErrors);
      setSampleError(message);
      toast.error("تعذر تجهيز العينة", { description: message });
    }
  };

  const handleCorrectionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!correctionForm.email.trim() && !correctionForm.phone.trim()) {
      toast.error("أدخل البريد أو رقم الواتساب الجديد");
      return;
    }
    try {
      await requestDataCorrection.mutateAsync({ requestId: transferSent ?? 0, currentEmail: form.customerEmail, requestedEmail: correctionForm.email.trim() || undefined, requestedPhone: correctionForm.phone.trim() || undefined, reason: correctionForm.reason.trim() || undefined });
      await correctionStatusQuery.refetch();
      toast.success("تم إرسال طلب تصحيح البيانات", { description: "ستراجعه الإدارة قبل تحديث الطلب." });
      setCorrectionForm({ email: "", phone: "", reason: "" });
    } catch (error) {
      toast.error("تعذر إرسال طلب التصحيح", { description: error instanceof Error ? error.message : "تحقق من البيانات وحاول مرة أخرى." });
    }
  };

  const handleTransferSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!transferConsent) {
      toast.error("يرجى الموافقة على السياسات قبل إرسال الطلب", { description: "راجع سياسة الخصوصية وشروط الاستخدام وسياسة الملفات الرقمية." });
      return;
    }
    let proof: { fileName: string; contentType: "image/jpeg" | "image/png" | "application/pdf"; base64: string } | undefined;
    if (proofFile) {
      if (!["image/jpeg", "image/png", "application/pdf"].includes(proofFile.type) || proofFile.size > 5 * 1024 * 1024) {
        toast.error("نوع أو حجم إثبات الدفع غير صالح", { description: "استخدم PDF أو JPG أو PNG بحجم لا يتجاوز 5MB." });
        return;
      }
      const bytes = new Uint8Array(await proofFile.arrayBuffer());
      let binary = "";
      for (let index = 0; index < bytes.length; index += 0x8000) {
        const chunk = bytes.subarray(index, index + 0x8000);
        for (let offset = 0; offset < chunk.length; offset += 1) binary += String.fromCharCode(chunk[offset] ?? 0);
      }
      proof = { fileName: proofFile.name, contentType: proofFile.type as "image/jpeg" | "image/png" | "application/pdf", base64: btoa(binary) };
    }
    createTransferRequest.mutate({ productCode: DEFAULT_PRODUCT_CODE, ...form, proof }, {
      onSuccess: ({ requestId, orderNumber }) => {
        setTransferSent(requestId);
        setTransferOrderNumber(orderNumber);
        toast.success("تم تسجيل طلبك للمراجعة", { description: `رقم طلبك هو ${orderNumber}. سنراجع التحويل يدوياً ثم نرسل رابط الملف إلى بريدك.` });
      },
      onError: () => toast.error("تعذر تسجيل الطلب", { description: "تحقق من البيانات وحاول مرة أخرى." }),
    });
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f7f3eb] text-[#172b3a] selection:bg-[#b9854a]/30">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#e3ddd1]/70 bg-[#f7f3eb]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <a href="#top" className="group flex items-center gap-3" aria-label="العودة إلى بداية الصفحة">
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[13px] bg-[#172b3a] shadow-[0_8px_20px_rgba(23,43,58,0.18)]">
              <img src={brandMark} alt="" className="h-8 w-8 object-contain" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-[20px] font-extrabold tracking-[-0.04em] text-[#172b3a]">مِداد</span>
              <span className="mt-1 block text-[10px] font-semibold tracking-[0.18em] text-[#967143]">للمراجعة الذكية</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-[13px] font-bold text-[#53616a] lg:flex">
            <a href="#inside" className="transition-colors hover:text-[#b9854a]">داخل الملخص</a>
            <a href="#why" className="transition-colors hover:text-[#b9854a]">لماذا مِداد؟</a>
            <a href="#faq" className="transition-colors hover:text-[#b9854a]">الأسئلة الشائعة</a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={scrollToPurchase} className="hidden rounded-full bg-[#b9854a] px-5 py-3 text-[12px] font-extrabold text-white shadow-[0_10px_25px_rgba(185,133,74,0.22)] transition hover:-translate-y-0.5 hover:bg-[#a8733d] active:scale-[0.97] sm:inline-flex">
              احصل على النسخة
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dcd4c7] text-[#172b3a] lg:hidden" aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-[#e3ddd1] bg-[#f7f3eb] px-5 py-5 lg:hidden">
            <div className="flex flex-col gap-4 text-sm font-bold text-[#53616a]">
              <a href="#inside" onClick={() => setMenuOpen(false)}>داخل الملخص</a>
              <a href="#why" onClick={() => setMenuOpen(false)}>لماذا مِداد؟</a>
              <a href="#faq" onClick={() => setMenuOpen(false)}>الأسئلة الشائعة</a>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative isolate min-h-[720px] overflow-hidden border-b border-[#e5ded2] pt-[74px]">
          <div className="absolute inset-0 -z-20 bg-[#f7f3eb]" />
          <img src={heroTexture} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70 mix-blend-multiply" />
          <div className="absolute -right-32 top-40 -z-10 h-[420px] w-[420px] rounded-full bg-[#e8d9c5]/60 blur-3xl" />
          <div className="absolute -left-24 bottom-0 -z-10 h-[350px] w-[350px] rounded-full bg-[#eadcc9]/70 blur-3xl" />

          <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8 lg:py-28">
            <div className="order-2 max-w-[650px] lg:order-1">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c8b99f] bg-[#f7f3eb]/75 px-4 py-2 text-[11px] font-extrabold tracking-[0.04em] text-[#89663b] backdrop-blur-sm">
                <Sparkles size={14} className="text-[#b9854a]" />
                النسخة الأولى · لطلبة القانون والشريعة
              </div>
              <h1 className="max-w-[700px] font-display text-[clamp(38px,5.8vw,76px)] font-black leading-[1.08] tracking-[-0.06em] text-[#172b3a]">
                ابدأ من الأساس الذي
                <span className="relative mx-2 inline-block whitespace-normal text-[#b9854a] sm:whitespace-nowrap">
                  يربط لك المادة كلها.
                  <svg className="absolute -bottom-3 right-0 h-3 w-full text-[#b9854a]" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8C82 2 188 10 298 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                </span>
              </h1>
              <p className="mt-8 max-w-[570px] font-body text-[18px] leading-[2] text-[#53616a]">
                ملخص عربي منظم يختصر لك مدخل القانون والعلوم القانونية في وثيقة واحدة، من المفاهيم الأولى إلى المراجعة التطبيقية.
              </p>
              <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <button onClick={scrollToPurchase} className="group inline-flex items-center gap-3 rounded-full bg-[#172b3a] px-7 py-4 text-sm font-extrabold text-white shadow-[0_18px_35px_rgba(23,43,58,0.22)] transition hover:-translate-y-1 hover:bg-[#b9854a] active:scale-[0.97]">
                  احصل على الملخص الآن
                  <ArrowLeft size={17} className="transition-transform group-hover:-translate-x-1" />
                </button>
                <a href="#inside" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#b9854a] transition hover:text-[#b9854a]">
                  اكتشف المحتوى
                  <ArrowUpLeft size={16} />
                </a>
              </div>
              <div className="mt-12 border-t border-[#d9d0c2] pt-6">
                <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] font-bold text-[#68747a]">
                  <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#b9854a]" /> PDF مهيأ للهاتف</span>
                  <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#b9854a]" /> مراجعة تطبيقية</span>
                  <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#b9854a]" /> تحديثات مجانية مدى الحياة</span>
                </div>
                {earlyBirdActive ? (
                  <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#b9854a]/35 bg-[#fffaf1] px-4 py-2.5 text-[12px] font-extrabold leading-[1.7] text-[#89663b]" role="status">
                    <Sparkles size={14} className="shrink-0 text-[#b9854a]" />
                    <span>19 درهماً لأول 10 طلبة مقبولين فقط — تبقّت {earlyBirdSeatsRemaining} مقاعد.</span>
                  </div>
                ) : (
                  <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#d9d0c2] bg-[#f4efe7] px-4 py-2.5 text-[12px] font-extrabold leading-[1.7] text-[#68747a]">
                    <Check size={14} className="shrink-0 text-[#b9854a]" />
                    <span>السعر الحالي {productPriceMad} درهماً — عرض Early Bird اكتمل.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="relative order-1 flex min-h-[380px] items-center justify-center lg:order-2 lg:min-h-[520px]">
              <div className="absolute right-[13%] top-[7%] h-20 w-20 rounded-full border border-[#b9854a]/40" />
              <div className="absolute bottom-[8%] left-[3%] h-28 w-28 rounded-full border border-dashed border-[#b9854a]/30" />
              <div className="absolute right-[8%] top-[15%] font-display text-[10px] font-bold tracking-[0.28em] text-[#b9854a] [writing-mode:vertical-rl]">MIDAD / 001</div>
              <div className="relative w-[min(72vw,310px)] rotate-[4deg] transition duration-500 hover:rotate-0 hover:scale-[1.025] sm:w-[330px]">
                <div className="absolute -inset-4 rounded-[24px] bg-[#b9854a]/10 blur-xl" />
                <div className="relative overflow-hidden rounded-[6px] border-[7px] border-[#eadfce] bg-[#172b3a] shadow-[28px_30px_0_rgba(185,133,74,0.15),0_30px_55px_rgba(23,43,58,0.28)]">
                  <img src={activeCoverUrl} alt="غلاف ملخص مدخل إلى القانون والعلوم القانونية" className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
              <div className="absolute bottom-[10%] right-[2%] hidden max-w-[190px] rounded-[15px] border border-[#ded4c5] bg-[#fbf8f2]/90 p-4 shadow-[0_18px_35px_rgba(23,43,58,0.1)] backdrop-blur-md sm:block">
                <div className="mb-3 flex items-center justify-between"><span className="font-display text-xs font-black text-[#172b3a]">فهرس واضح</span><BookOpen size={15} className="text-[#b9854a]" /></div>
                <div className="space-y-2 text-[10px] font-bold text-[#718087]"><div className="h-1.5 w-full rounded-full bg-[#d7e3df]" /><div className="h-1.5 w-[75%] rounded-full bg-[#d7e3df]" /><div className="h-1.5 w-[86%] rounded-full bg-[#d7e3df]" /></div>
              </div>
            </div>
          </div>
        </section>

        <section id="why" className="border-b border-[#e5ded2] bg-[#172b3a] text-[#f7f3eb]">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-12 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-8">
            <p className="font-display text-xl font-bold leading-[1.7] lg:text-2xl">ليس المطلوب أن تحفظ أكثر.<br /><span className="text-[#cfa56f]">بل أن ترى الصورة أوضح.</span></p>
            <div className="hidden h-16 w-px bg-[#cfa56f]/40 lg:block" />
            <p className="max-w-[470px] font-body text-sm leading-[2] text-[#c3ced0]">حين تكون المفاهيم موزعة بين المحاضرات والملاحظات، تصبح المراجعة نفسها عبئاً. مِداد يرتب لك الطريق في وثيقة واحدة قابلة للعودة السريعة.</p>
          </div>
        </section>

        <section id="inside" className="bg-[#f7f3eb] py-24 lg:py-32">
          <div className="mx-auto max-w-[1240px] px-5 lg:px-8">
            <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div><div className="section-kicker">01 / داخل الملخص</div><h2 className="mt-4 max-w-[580px] font-display text-4xl font-black leading-[1.25] tracking-[-0.045em] text-[#172b3a] md:text-5xl">ثمانية محاور تبني<br /><span className="text-[#b9854a]">فهمك خطوة خطوة.</span></h2></div>
              <p className="max-w-[330px] font-body text-[15px] leading-[1.9] text-[#68747a]">من التعريف إلى التطبيق، بترتيب يساعدك على القراءة والاسترجاع دون تشتت.</p>
            </div>
            <div className="grid border-t border-[#d9d0c2] md:grid-cols-2 lg:grid-cols-4">
              {chapters.map(([number, title, description]) => (
                <div key={number} className="group border-b border-[#d9d0c2] py-7 transition-colors hover:bg-[#efe8dc] md:border-l md:px-6 lg:min-h-[190px] lg:first:border-r-0">
                  <span className="font-display text-[12px] font-black tracking-[0.16em] text-[#b9854a]">{number}</span>
                  <h3 className="mt-8 font-display text-[17px] font-extrabold text-[#172b3a] transition-colors group-hover:text-[#b9854a]">{title}</h3>
                  <p className="mt-3 font-body text-[13px] leading-[1.8] text-[#768087]">{description}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-col justify-between gap-5 rounded-[20px] border border-[#d9d0c2] bg-[#fbf8f2] p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8d9c5] text-[#b9854a]"><FileText size={19} /></div><div><h3 className="font-display text-base font-extrabold text-[#172b3a]">ويكتمل المسار بقاموس ومراجعة تطبيقية</h3><p className="mt-1 font-body text-sm text-[#768087]">تعريفات مركزة وأسئلة تساعدك على تثبيت الفهم.</p></div></div>
              <a href="#purchase" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#b9854a]">انتقل إلى العرض <MoveLeft size={16} /></a>
            </div>
          </div>
        </section>

        <section id="upcoming-chapters" className="border-y border-[#e5ded2] bg-[#fbf8f2] py-20 lg:py-24" aria-labelledby="upcoming-chapters-title">
          <div className="mx-auto max-w-[1240px] px-5 lg:px-8">
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <div className="section-kicker">03 / فصول قادمة</div>
                <h2 id="upcoming-chapters-title" className="mt-4 max-w-[620px] font-display text-4xl font-black leading-[1.25] tracking-[-0.045em] text-[#172b3a] md:text-5xl">مسارات جديدة<br /><span className="text-[#b9854a]">في طريقها إليك.</span></h2>
              </div>
              <p className="max-w-[420px] font-body text-[15px] leading-[1.95] text-[#68747a]">يحصل المشتركون الحاليون على هذه الفصول تلقائياً عند إصدارها، دون أي تكلفة إضافية.</p>
            </div>
            <div className="grid border-t border-[#d9d0c2] md:grid-cols-2 lg:grid-cols-4" aria-label="الفصول القادمة">
              {upcomingChapters.map((title, index) => (
                <div key={title} aria-disabled="true" className="relative min-h-[150px] border-b border-[#d9d0c2] bg-[#f4efe7]/70 py-7 opacity-85 md:border-l md:px-6 lg:min-h-[174px]">
                  <span className="font-display text-[12px] font-black tracking-[0.16em] text-[#b9854a]">{String(index + 9).padStart(2, "0")}</span>
                  <span className="absolute left-5 top-6 rounded-full border border-[#b94b4b]/25 bg-[#f8e5e3] px-3 py-1 font-body text-[11px] font-extrabold text-[#a83d3d] md:left-auto md:right-5">قريباً</span>
                  <h3 className="mt-8 max-w-[190px] font-display text-[17px] font-extrabold leading-[1.55] text-[#172b3a]">{title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="previews" className="border-y border-[#e5ded2] bg-[#fbf8f2] py-24 lg:py-32">
          <div className="mx-auto max-w-[1240px] px-5 lg:px-8">
            <div className="mb-14 flex flex-col justify-between gap-7 md:flex-row md:items-end">
              <div><div className="section-kicker">02 / جرّب قبل أن تشتري</div><h2 className="mt-4 max-w-[650px] font-display text-4xl font-black leading-[1.25] tracking-[-0.045em] text-[#172b3a] md:text-5xl">قطعة من كل محور،<br /><span className="text-[#b9854a]">لتعرف طريقة مِداد.</span></h2></div>
              <p className="max-w-[380px] font-body text-[15px] leading-[1.95] text-[#68747a]">اقرأ الفكرة، اختبر فهمك، ثم احتفظ بالنسخة الكاملة للمراجعة المنظمة.</p>
            </div>
            <div className="mb-8 flex flex-col items-start justify-between gap-5 rounded-[18px] border border-[#d8c4a8] bg-[#f4eadb] px-6 py-5 sm:flex-row sm:items-center sm:px-8"><div><p className="font-display text-base font-extrabold text-[#172b3a]">تريد رؤية الملخص قبل الشراء؟</p><p className="mt-1 font-body text-sm leading-[1.8] text-[#68747a]">حمّل عينة مجانية قصيرة من {DEFAULT_PRODUCT_CODE} وتعرّف على أسلوب التنظيم والشرح.</p></div><button type="button" onClick={() => setSampleOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#172b3a] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#b9854a] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9854a] focus-visible:ring-offset-2"><Download size={16} /> حمّل العينة المجانية</button></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {chapterPreviews.map((preview) => (
                <article id={getQuizChapterAnchor(preview.number)} key={preview.number} className="group flex min-h-[345px] flex-col rounded-[18px] border border-[#ded6c9] bg-[#f7f3eb] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#b9854a]/60 hover:shadow-[0_18px_38px_rgba(23,43,58,0.08)]">
                  <div className="flex items-center justify-between border-b border-[#ded6c9] pb-4"><span className="font-display text-xs font-black tracking-[0.15em] text-[#b9854a]">{preview.number}</span><span className="h-px w-10 bg-[#b9854a]/60" /></div>
                  <h3 className="mt-6 font-display text-lg font-extrabold leading-[1.55] text-[#172b3a] group-hover:text-[#b9854a]">{preview.title}</h3>
                  <p className="mt-3 font-body text-[13px] leading-[1.9] text-[#68747a]">{preview.excerpt}</p>
                   <div className="mt-4 rounded-xl bg-[#efe8dc] p-3"><p className="mb-2 text-[11px] font-extrabold text-[#89663b]">الأهداف التعليمية</p><div className="space-y-1.5">{preview.objectives.map((objective) => <p key={objective} className="font-body text-[12px] leading-[1.7] text-[#53616a]">— {objective}</p>)}</div></div>
                   <div className="mt-auto border-t border-[#ded6c9] pt-4"><p className="mb-2 text-[11px] font-extrabold text-[#89663b]">أسئلة مراجعة</p><div className="space-y-2">{preview.questions.map((question) => <p key={question} className="font-body text-[12px] leading-[1.7] text-[#53616a]">— {question}</p>)}</div><div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => openChapterQuiz(preview.number)} className="inline-flex items-center gap-2 rounded-full bg-[#172b3a] px-4 py-2 text-[11px] font-extrabold text-white transition hover:bg-[#b9854a] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9854a] focus-visible:ring-offset-2">اختبر فهمك <Check size={13} /></button><button type="button" onClick={scrollToPurchase} className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#b9854a] transition hover:text-[#89663b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9854a] focus-visible:ring-offset-2">أكمل هذا المحور <ArrowLeft size={13} /></button></div></div>
                </article>
              ))}
            </div>
            <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-[18px] bg-[#172b3a] px-6 py-7 text-[#f7f3eb] sm:flex-row sm:items-center sm:px-8"><p className="max-w-[650px] font-body text-sm leading-[1.9] text-[#d5dfdf]">هذه معاينة مختصرة من المحتوى. النسخة الكاملة تضيف الشرح المنظم، القاموس القانوني، والمراجعة التطبيقية في ملف واحد.</p><button onClick={scrollToPurchase} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#b9854a] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#a8733d] active:scale-[0.97]">احصل على النسخة الكاملة <ArrowLeft size={16} /></button></div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#e8eee9] py-24 lg:py-28">
          <div className="absolute -left-10 top-10 font-display text-[180px] font-black leading-none text-[#d7e3dc]">“</div>
          <div className="relative mx-auto max-w-[1000px] px-5 text-center lg:px-8"><div className="section-kicker justify-center">02 / طريقة المراجعة</div><blockquote className="mx-auto mt-8 max-w-[820px] font-display text-3xl font-black leading-[1.55] tracking-[-0.04em] text-[#172b3a] md:text-5xl">«ملخص واحد، وفهرس واضح، ومراجعة أقرب إلى الفهم.»</blockquote><p className="mx-auto mt-7 max-w-[560px] font-body text-[15px] leading-[2] text-[#617069]">صُمّم ليكون رفيقاً قبل المحاضرة، وبين جلسات الدراسة، وقبل الاختبار. لا يرفع الضجيج؛ يوضح الطريق.</p></div>
        </section>

        <section className="bg-[#f7f3eb] py-24 lg:py-32">
          <div className="mx-auto grid max-w-[1240px] gap-14 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
            <div><div className="section-kicker">03 / ما تحصل عليه</div><h2 className="mt-4 font-display text-4xl font-black leading-[1.25] tracking-[-0.05em] text-[#172b3a] md:text-5xl">كل ما تحتاجه<br /><span className="text-[#b9854a]">في ملف واحد.</span></h2><p className="mt-7 max-w-[440px] font-body text-[15px] leading-[2] text-[#68747a]">نسخة عربية منظمة، جاهزة للقراءة على الهاتف والحاسوب والطباعة الشخصية.</p><button onClick={scrollToPurchase} className="mt-9 inline-flex items-center gap-3 rounded-full border border-[#b9854a] px-6 py-3.5 text-sm font-extrabold text-[#89663b] transition hover:bg-[#b9854a] hover:text-white active:scale-[0.97]">احجز نسختك <ArrowLeft size={16} /></button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[{ icon: BookOpen, title: "قراءة مريحة", text: "اتجاه RTL وتنسيق واضح للقراءة الرقمية." }, { icon: Download, title: "PDF جاهز", text: "ملف واحد سهل الحفظ والعودة إليه." }, { icon: Scale, title: "محتوى أصلي", text: "مادة تعليمية مستقلة للمراجعة الذاتية." }, { icon: LockKeyhole, title: "تسليم خاص", text: "رابط تنزيل خاص بعد تأكيد الدفع." }].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-[18px] border border-[#ded6c9] bg-[#fbf8f2] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#b9854a]/50 hover:shadow-[0_16px_35px_rgba(23,43,58,0.07)]"><Icon size={22} className="text-[#b9854a]" /><h3 className="mt-8 font-display text-lg font-extrabold text-[#172b3a]">{title}</h3><p className="mt-2 font-body text-sm leading-[1.8] text-[#768087]">{text}</p></div>)}
            </div>
          </div>
        </section>

        <section id="purchase" className="relative overflow-hidden bg-[#172b3a] py-24 text-[#f7f3eb] lg:py-32">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_20%_60%,rgba(185,133,74,0.18),transparent_50%)]" />
          <div className="relative mx-auto grid max-w-[1100px] gap-12 px-5 lg:grid-cols-[1fr_380px] lg:items-center lg:px-8">
            <div><div className="section-kicker text-[#cfa56f]">04 / العرض الأولي</div><h2 className="mt-5 max-w-[600px] font-display text-4xl font-black leading-[1.2] tracking-[-0.05em] md:text-6xl">مراجعتك القادمة<br /><span className="text-[#cfa56f]">تبدأ من هنا.</span></h2><p className="mt-7 max-w-[530px] font-body text-[15px] leading-[2] text-[#c3ced0]">احصل على النسخة الأولى من {DEFAULT_PRODUCT_CODE} بصيغة PDF، وابدأ بناء صورة أوضح عن مدخل القانون والعلوم القانونية.</p><div className="mt-9 flex flex-wrap gap-5 text-xs font-bold text-[#d5dfdf]"><span className="inline-flex items-center gap-2"><Check size={15} className="text-[#cfa56f]" /> نسخة رقمية عربية</span><span className="inline-flex items-center gap-2"><Check size={15} className="text-[#cfa56f]" /> مراجعة تطبيقية</span></div></div>
            <div className="relative rounded-[24px] border border-white/15 bg-[#f7f3eb] p-7 text-[#172b3a] shadow-[0_25px_70px_rgba(0,0,0,0.22)] sm:p-9"><div className="flex items-start justify-between"><div><span className="font-display text-[11px] font-black tracking-[0.15em] text-[#b9854a]">{DEFAULT_PRODUCT_CODE}</span><h3 className="mt-3 font-display text-xl font-black leading-[1.4]">مدخل إلى القانون<br />والعلوم القانونية</h3></div><div className="rounded-full bg-[#e8eee9] p-3 text-[#b9854a]"><BookOpen size={19} /></div></div><div className="my-7 border-t border-[#ded6c9]" /><div className="flex items-end justify-between gap-4"><div><span className="font-body text-xs text-[#768087]">{earlyBirdActive ? "سعر Early Bird" : "السعر الحالي"}</span><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-5xl font-black text-[#172b3a]">{productPriceMad}</span><span className="font-display text-sm font-black text-[#b9854a]">درهماً</span></div></div><span className="rounded-full bg-[#b9854a]/10 px-3 py-2 text-center text-[10px] font-extrabold leading-[1.6] text-[#89663b]">{earlyBirdActive ? `متبقّي ${earlyBirdSeatsRemaining} مقاعد` : "السعر الدائم"}</span></div>{earlyBirdActive && <div className="mt-7 rounded-[18px] border border-[#d9c4a4] bg-[#fffaf1] p-4 shadow-[0_10px_25px_rgba(185,133,74,0.08)]" role="status" aria-label={`تقدم عرض Early Bird: ${earlyBirdSeatsRemaining} مقاعد متبقية`}><div className="flex items-center justify-between gap-3 text-xs font-extrabold text-[#89663b]"><span>مقاعد السعر المخفّض</span><span>{earlyBirdApprovedBuyers} من 10</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-[#eadfce]" dir="ltr"><div className="relative h-full rounded-full bg-gradient-to-l from-[#c99554] via-[#b9854a] to-[#8f6337] transition-[width] duration-500" style={{ width: `${Math.max(earlyBirdProgress, 6)}%` }}><span className="absolute inset-y-0 right-2 w-1.5 animate-pulse rounded-full bg-white/70" /></div></div><div className="mt-2 flex items-center justify-between gap-3 text-[11px] leading-[1.7] text-[#8b7357]"><span>احجز سعرك قبل اكتمال المقاعد</span><span className="font-bold">متبقّي {earlyBirdSeatsRemaining}</span></div></div>}<button onClick={handleCheckout} className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#b9854a] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#a8733d] hover:shadow-[0_12px_25px_rgba(185,133,74,0.3)] active:scale-[0.98]">احصل على الملخص الآن <ArrowLeft size={17} /></button>{earlyBirdActive && <p className="mt-4 text-center text-xs font-bold leading-[1.8] text-[#89663b]">سعر خاص لأول 10 مشترين مقبولين — تبقّت {earlyBirdSeatsRemaining} مقاعد.</p>}<p className="mt-3 text-center font-body text-[11px] leading-[1.8] text-[#68747a]">جميع المشترين يحصلون على التحديثات والفصول القادمة مجاناً مدى الحياة، بغض النظر عن وقت الشراء أو السعر.</p><p className="mt-2 text-center font-body text-[11px] leading-[1.8] text-[#8b9290]">الدفع والتسليم الإلكتروني قيد الربط في الإصدار التالي.</p><div className="mt-5 rounded-[16px] border border-[#b9854a]/30 bg-[#fffaf1] px-4 py-3 text-center"><p className="font-display text-sm font-extrabold text-[#172b3a]">فريق مركز الخدمات متاح للرد عليك</p><span role="status" aria-live="polite" className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-extrabold ${supportAvailable ? "bg-[#e5f6eb] text-[#168447]" : "bg-[#f1eee8] text-[#68747a]"}`}><span className={`h-2 w-2 rounded-full ${supportAvailable ? "bg-[#20a85a] motion-safe:animate-pulse motion-reduce:animate-none" : "bg-[#c94747]"}`} aria-hidden="true" />{getSupportStatusLabel(supportNow)}</span><p className="mt-1 text-[11px] leading-[1.8] text-[#68747a]">عبر WhatsApp من 09:00 صباحاً إلى 20:00 مساءً.</p>{!supportAvailable && <p className="mt-1 font-mono text-[11px] font-bold tracking-wide text-[#89663b]" aria-live="polite">{supportCountdown}</p>}<a href={whatsappLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-[11px] font-extrabold text-[#168447] transition hover:text-[#0f6335]">تواصل مع الفريق عبر WhatsApp <MessageCircle size={14} /></a></div></div>
          </div>
        </section>

        <PublicReviews productId={DEFAULT_PRODUCT_CODE} />

        <section id="faq" className="bg-[#f7f3eb] py-24 lg:py-32">
          <div className="mx-auto max-w-[900px] px-5 lg:px-8"><div className="text-center"><div className="section-kicker justify-center">05 / الأسئلة الشائعة</div><h2 className="mt-4 font-display text-4xl font-black tracking-[-0.05em] text-[#172b3a] md:text-5xl">إجابات واضحة قبل الطلب</h2><p className="mx-auto mt-5 max-w-2xl text-sm leading-[2] text-[#68747a]">اقرأ التفاصيل الأساسية حول طبيعة الملخص، طريقة الطلب، التسليم، والتحديثات المجانية قبل اتخاذ قرارك.</p></div><div className="mt-12 divide-y divide-[#d9d0c2] border-y border-[#d9d0c2]">{faqs.map(([question, answer], index) => <div key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-5 py-6 text-right font-display text-[15px] font-extrabold text-[#172b3a] transition hover:text-[#b9854a]" aria-expanded={openFaq === index}><span>{question}</span><ChevronDown size={18} className={`shrink-0 text-[#b9854a] transition-transform duration-200 ${openFaq === index ? "rotate-180" : ""}`} /></button><div className={`grid transition-[grid-template-rows,opacity] duration-200 ${openFaq === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="overflow-hidden"><p className="max-w-[760px] pb-6 font-body text-[14px] leading-[2] text-[#68747a]">{answer}</p></div></div></div>)}</div></div>
        </section>

        <section className="border-t border-[#ded6c9] bg-[#efe8dc] py-16"><div className="mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-8 px-5 sm:flex-row sm:items-center lg:px-8"><div><div className="flex items-center gap-3"><img src={brandMark} alt="" className="h-9 w-9 rounded-[10px] bg-[#172b3a] p-1" /><span className="font-display text-xl font-black text-[#172b3a]">مِداد</span></div><p className="mt-4 max-w-[420px] font-body text-sm leading-[1.9] text-[#68747a]">ملخصات دراسية رقمية منظمة لطلبة القانون والشريعة.</p></div><button onClick={scrollToPurchase} className="group inline-flex items-center gap-3 rounded-full bg-[#172b3a] px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#b9854a] active:scale-[0.97]">ابدأ المراجعة <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /></button></div></section>
        {activeQuiz && activeQuizPreview && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#172b3a]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
            <div className="relative max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[24px] bg-[#f7f3eb] p-6 text-right shadow-[0_25px_80px_rgba(0,0,0,0.28)] sm:p-8">
              <button type="button" onClick={() => setActiveQuiz(null)} className="absolute left-5 top-5 rounded-full p-2 text-[#68747a] transition hover:bg-[#e8d9c5] hover:text-[#172b3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9854a]" aria-label="إغلاق الاختبار"><X size={19} /></button>
              <div className="section-kicker">اختبار المحور {activeQuizPreview.number}</div>
              <h2 id="quiz-title" className="mt-3 pr-10 font-display text-2xl font-black leading-[1.45] text-[#172b3a]">اختبر فهمك: {activeQuizPreview.title}</h2>
              {activeQuiz.completed ? (() => { const result = getQuizResultStatus(activeQuiz.score, activeQuiz.questions.length); const reviewConcepts = getIncorrectReviewConcepts(activeQuiz.questions, activeQuiz.answers); return <div className="mt-8 text-center"><div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-3xl font-black ${result.passed ? "bg-[#e2f0e3] text-[#285d35]" : "bg-[#f8e8d8] text-[#8f5a2e]"}`}>{result.percentage}%</div><p className="mt-5 font-display text-2xl font-black text-[#172b3a]">نتيجتك النهائية</p><p className={`mt-3 text-xl font-black ${result.passed ? "text-[#285d35]" : "text-[#8f5a2e]"}`}>{result.passed ? "أحسنت، لقد بلغت حد النجاح" : "لم تبلغ حد النجاح في هذه المحاولة"}</p><div className={`mt-4 inline-flex items-center rounded-full px-4 py-2 text-sm font-extrabold ${result.passed ? "bg-[#e2f0e3] text-[#285d35] ring-1 ring-inset ring-[#4b8b5a]/30" : "bg-[#fff1d9] text-[#8a5a17] ring-1 ring-inset ring-[#b9854a]/35"}`} role="status" aria-label={result.passed ? "حالة النتيجة: ناجح" : "حالة النتيجة: يحتاج إلى مراجعة"}>{result.passed ? "ناجح" : "يحتاج إلى مراجعة"}</div><p className="mt-3 text-lg font-bold text-[#53616a]">أجبت إجابة صحيحة عن {activeQuiz.score} من أصل {activeQuiz.questions.length} أسئلة.</p><p className="mt-3 rounded-[14px] bg-[#efe8dc] p-4 text-sm leading-[1.9] text-[#68747a]">{result.passed ? quizSuccessMessage : quizFailureMessage}</p>{reviewConcepts.length > 0 && <div className="mt-5 rounded-[14px] border border-[#ded6c9] bg-white/60 p-4 text-right"><p className="font-display text-sm font-extrabold text-[#172b3a]">مفاهيم يُستحسن مراجعتها</p><ul className="mt-3 space-y-2 text-sm leading-[1.8] text-[#68747a]">{reviewConcepts.map(concept => <li key={concept} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9854a]" />{concept}</li>)}</ul></div>}<div className="mt-7 flex justify-center gap-3"><button type="button" onClick={() => setActiveQuiz(null)} className="rounded-full border border-[#d1c5b5] px-5 py-3 text-sm font-extrabold text-[#68747a] transition hover:bg-[#efe8dc]">إغلاق</button>{!result.passed && <button type="button" onClick={reviewChapter} className="rounded-full border border-[#b9854a] px-5 py-3 text-sm font-extrabold text-[#89663b] transition hover:bg-[#e8d9c5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9854a]">مراجعة المحور</button>}<button type="button" onClick={retryQuiz} className="rounded-full bg-[#172b3a] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#b9854a]">إعادة الاختبار</button></div></div>; })() : activeQuizQuestion ? <><div className="mt-7 flex items-center justify-between text-xs font-bold text-[#768087]"><span>السؤال {activeQuiz.questionIndex + 1} من {activeQuizPreview.quiz.length}</span><span>النتيجة الحالية: {activeQuiz.score}</span></div><div className="mt-4 rounded-[18px] border border-[#ded6c9] bg-white/60 p-5"><p className="font-display text-lg font-extrabold leading-[1.8] text-[#172b3a]">{activeQuizQuestion.question}</p><div className="mt-5 space-y-3">{activeQuizQuestion.options.map((option, optionIndex) => { const isSelected = activeQuiz.selectedIndex === optionIndex; const isCorrect = activeQuizQuestion.correctIndex === optionIndex; const optionClass = activeQuiz.submitted ? (isCorrect ? "border-[#4b8b5a] bg-[#e2f0e3] text-[#285d35]" : isSelected ? "border-[#b85c55] bg-[#f8e1df] text-[#8f3933]" : "border-[#ded6c9] bg-[#fbf8f2] text-[#68747a]") : isSelected ? "border-[#b9854a] bg-[#f4eadb] text-[#172b3a]" : "border-[#ded6c9] bg-[#fbf8f2] text-[#53616a]"; return <button key={option} type="button" onClick={() => chooseQuizAnswer(optionIndex)} disabled={activeQuiz.submitted} className={`flex w-full items-start gap-3 rounded-[14px] border px-4 py-3 text-right text-sm font-bold leading-[1.7] transition ${optionClass} disabled:cursor-default`}><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs">{String.fromCharCode(1571 + optionIndex)}</span><span>{option}</span>{activeQuiz.submitted && isCorrect && <Check size={17} className="mr-auto mt-1 shrink-0" />}{activeQuiz.submitted && isSelected && !isCorrect && <X size={17} className="mr-auto mt-1 shrink-0" />}</button>; })}</div></div>{activeQuiz.submitted && <div className={`mt-4 rounded-[14px] p-4 text-sm leading-[1.8] ${activeQuiz.selectedIndex === activeQuizQuestion.correctIndex ? "bg-[#e2f0e3] text-[#285d35]" : "bg-[#f8e1df] text-[#8f3933]"}`}><p className="font-extrabold">{activeQuiz.selectedIndex === activeQuizQuestion.correctIndex ? "إجابة صحيحة" : "إجابة غير صحيحة"}</p><p className="mt-1">{activeQuizQuestion.explanation ?? `الإجابة الصحيحة هي: ${activeQuizQuestion.options[activeQuizQuestion.correctIndex]}`}</p></div>}<div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setActiveQuiz(null)} className="rounded-full border border-[#d1c5b5] px-5 py-3 text-sm font-extrabold text-[#68747a] transition hover:bg-[#efe8dc]">إغلاق</button>{activeQuiz.questionIndex > 0 && <button type="button" onClick={previousQuizQuestion} className="rounded-full border border-[#172b3a] px-5 py-3 text-sm font-extrabold text-[#172b3a] transition hover:bg-[#e8d9c5]">السؤال السابق</button>}{!activeQuiz.submitted ? <button type="button" onClick={submitQuizAnswer} disabled={activeQuiz.selectedIndex === null} className="rounded-full bg-[#b9854a] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#a8733d] disabled:cursor-not-allowed disabled:opacity-50">تحقق من الإجابة</button> : <button type="button" onClick={nextQuizQuestion} className="rounded-full bg-[#172b3a] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#b9854a]">{activeQuiz.questionIndex + 1 < activeQuizPreview.quiz.length ? "السؤال التالي" : "عرض النتيجة"}</button>}</div></> : null}
            </div>
          </div>
        )}
        </main>

      <footer className="bg-[#172b3a] px-5 py-7 text-center font-body text-[11px] leading-[1.9] text-[#aab8b9]"><p>مِداد © 2026 · منتج تعليمي رقمي مستقل للمراجعة الذاتية</p><p className="mt-1 text-[#768b8b]">لا يمثل هذا المنتج وثيقة رسمية أو مادة معتمدة من جامعة ابن زهر.</p><nav className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[#d5a15f]" aria-label="الروابط القانونية"><a href="/privacy" className="underline-offset-4 transition hover:underline">سياسة الخصوصية</a><a href="/terms" className="underline-offset-4 transition hover:underline">شروط الاستخدام</a><a href="/digital-files" className="underline-offset-4 transition hover:underline">سياسة الملفات الرقمية</a><a href="/contact" className="underline-offset-4 transition hover:underline">تواصل معنا والشكاوى</a></nav><a href="/admin" className="mt-4 inline-flex rounded-full border border-[#cfa56f]/45 px-4 py-2 text-[#d5a15f] transition hover:border-[#d5a15f] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5a15f]">Back Office</a></footer>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noreferrer"
        aria-label="تواصل معنا عبر واتساب"
        title="تواصل معنا عبر واتساب"
        className="fixed bottom-5 left-5 z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_rgba(37,211,102,0.32)] transition duration-200 hover:scale-105 hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/35 active:scale-95 sm:bottom-7 sm:left-7"
      >
        <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current" aria-hidden="true" focusable="false"><path d="M16 3.2A12.7 12.7 0 0 0 5 22.2L3.3 28.7l6.7-1.7A12.8 12.8 0 1 0 16 3.2Zm0 23.2c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4a10.2 10.2 0 1 1 9.2 4.9Zm5.6-7.6c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.6-.8-2.7-1.5-3.8-3.2-.3-.5.3-.5.8-1.7.1-.2.1-.4 0-.6l-.6-1.5c-.2-.4-.4-.4-.7-.4h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.2.2 2.1 3.3 5.2 4.6 1.9.8 2.6.9 3.5.8.6-.1 1.9-.8 2.1-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.2-.6-.3Z" /></svg>
      </a>

      {sampleOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#172b3a]/75 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="sample-title">
          <div className="w-full max-w-[520px] rounded-[24px] bg-[#f7f3eb] p-6 text-[#172b3a] shadow-2xl sm:p-9">
            <div className="flex items-start justify-between gap-5">
              <div><div className="section-kicker">عينة مجانية / {DEFAULT_PRODUCT_CODE}</div><h2 id="sample-title" className="mt-3 font-display text-2xl font-black">جرّب أسلوب مِداد قبل الشراء</h2></div>
              <button type="button" onClick={() => setSampleOpen(false)} className="rounded-full border border-[#d9d0c2] p-2 text-[#53616a]" aria-label="إغلاق نموذج العينة"><X size={17} /></button>
            </div>
            <p className="mt-5 rounded-[14px] bg-[#efe8dc] p-4 font-body text-[13px] leading-[1.9] text-[#68747a]">أدخل بياناتك مرة واحدة لفتح عينة PDF قصيرة. نستخدمها فقط للتواصل المتعلق بالمنتج وتحسين تجربة مِداد، ولا نبيع بياناتك أو نشاركها لأغراض تسويقية خارجية.</p>
            <form onSubmit={handleSampleSubmit} className="mt-6 space-y-4">
              {sampleError && <p role="alert" className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-[1.8] text-red-700">{sampleError}</p>}
              <label className="block text-sm font-bold">الاسم الكامل<input required minLength={2} maxLength={160} pattern="[A-Za-z\u0600-\u06FF]+( +[A-Za-z\u0600-\u06FF]+)+" title="أدخل الاسم الكامل مكوناً من كلمتين على الأقل" value={sampleForm.fullName} onChange={(e) => { setSampleForm({ ...sampleForm, fullName: e.target.value }); setSampleFieldErrors({ ...sampleFieldErrors, fullName: undefined }); }} className="mt-2 w-full rounded-[12px] border border-[#d9d0c2] bg-white px-4 py-3 outline-none focus:border-[#b9854a]" />{sampleFieldErrors.fullName && <span className="mt-1 block text-xs font-bold text-red-700">{sampleFieldErrors.fullName}</span>}</label>
              <label className="block text-sm font-bold">البريد الإلكتروني<input required type="email" maxLength={320} value={sampleForm.email} onChange={(e) => { setSampleForm({ ...sampleForm, email: e.target.value }); setSampleFieldErrors({ ...sampleFieldErrors, email: undefined }); }} className="mt-2 w-full rounded-[12px] border border-[#d9d0c2] bg-white px-4 py-3 outline-none focus:border-[#b9854a]" />{sampleFieldErrors.email && <span className="mt-1 block text-xs font-bold text-red-700">{sampleFieldErrors.email}</span>}</label>
              <label className="block text-sm font-bold">رقم واتساب<input required minLength={8} maxLength={20} pattern="(?:0[5-7][0-9]{8}|\+?212[5-7][0-9]{8})" title="أدخل رقم واتساب مغربياً بصيغة 06XXXXXXXX أو +2126XXXXXXXX" inputMode="tel" value={sampleForm.whatsapp} onChange={(e) => { setSampleForm({ ...sampleForm, whatsapp: e.target.value }); setSampleFieldErrors({ ...sampleFieldErrors, whatsapp: undefined }); }} className="mt-2 w-full rounded-[12px] border border-[#d9d0c2] bg-white px-4 py-3 outline-none focus:border-[#b9854a]" placeholder="مثال: 0664173090" />{sampleFieldErrors.whatsapp && <span className="mt-1 block text-xs font-bold text-red-700">{sampleFieldErrors.whatsapp}</span>}</label>
              <label className="flex items-start gap-3 rounded-[12px] border border-[#d9d0c2] bg-white/70 p-3 text-xs leading-[1.8] text-[#68747a]"><input required type="checkbox" checked={sampleForm.consent} onChange={(e) => { setSampleForm({ ...sampleForm, consent: e.target.checked }); setSampleFieldErrors({ ...sampleFieldErrors, consent: undefined }); }} className="mt-1 h-4 w-4 accent-[#b9854a]" /><span>أوافق على معالجة هذه البيانات لأغراض تسليم العينة والتواصل بشأن MIDAD، وفق إشعار الخصوصية الموضح أعلاه.</span></label>{sampleFieldErrors.consent && <p className="-mt-2 text-xs font-bold text-red-700">{sampleFieldErrors.consent}</p>}
              <button disabled={submitSampleLead.isPending} className="flex w-full items-center justify-center rounded-full bg-[#b9854a] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#a8733d] disabled:cursor-not-allowed disabled:opacity-60">{submitSampleLead.isPending ? "جارٍ تجهيز العينة…" : "إرسال البيانات وفتح العينة"}</button>
            </form>
          </div>
        </div>
      )}

      {transferOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#172b3a]/75 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="transfer-title">
          <div className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-[24px] bg-[#f7f3eb] p-6 text-[#172b3a] shadow-2xl sm:p-9">
            <div className="flex items-start justify-between gap-5">
              <div><div className="section-kicker">طلب شراء / تحويل بنكي</div><h2 id="transfer-title" className="mt-3 font-display text-2xl font-black">احجز نسختك بـ {productPriceMad} درهماً</h2></div>
              <button type="button" onClick={resetTransferFlow} className="rounded-full border border-[#d9d0c2] p-2 text-[#53616a]" aria-label="إغلاق نموذج الشراء"><X size={17} /></button>
            </div>
            {transferSent ? (
              <div className="mt-8 rounded-[18px] border border-[#b9854a]/30 bg-[#efe8dc] p-6"><div className="font-display text-lg font-black">تم استلام طلبك رقم {transferOrderNumber ?? `MIDAD-${String(transferSent).padStart(8, "0")}`}</div><p className="mt-3 font-body text-sm leading-[1.9] text-[#68747a]">بعد مراجعة التحويل، يمكنك استخدام زر التحقق لاسترجاع رابط PDF مؤقت. لن يظهر الرابط قبل اعتماد الطلب.</p><button type="button" disabled={downloadQuery.isFetching} onClick={async () => { const result = await downloadQuery.refetch(); if (result.data?.url) window.open(result.data.url, "_blank", "noopener,noreferrer"); else toast.info("الطلب ما زال قيد المراجعة"); }} className="mt-5 w-full rounded-full border border-[#b9854a] px-5 py-3 text-sm font-extrabold text-[#89663b] disabled:opacity-60">{downloadQuery.isFetching ? "جارٍ التحقق…" : "التحقق من حالة التسليم"}</button><div className="mt-4 rounded-[16px] border border-[#173247]/15 bg-[#f7f3eb] p-4" role="status" aria-live="polite"><div className="flex items-start gap-3"><span className="mt-0.5 text-lg" aria-hidden="true">★</span><div><p className="font-display text-sm font-black text-[#173247]">تذكير بالتقييم</p><p className="mt-1 font-body text-xs leading-[1.8] text-[#68747a]">بعد تأكيد الدفع وظهور الملف، شاركنا رأيك ليساعد طلبة آخرين على اختيار الملخص المناسب.</p></div></div><a href={`/rate/${transferSent}`} target="_blank" rel="noreferrer" className="mt-3 block w-full rounded-full border border-[#173247] px-5 py-3 text-center text-sm font-extrabold text-[#173247] transition hover:bg-[#173247] hover:text-white">فتح صفحة التقييم</a></div>{correctionStatusQuery.data?.status && <div className="mt-4 rounded-[16px] border border-[#b9854a]/30 bg-[#fffaf2] p-4" role="status" aria-live="polite"><p className="font-display text-sm font-black text-[#173247]">حالة طلب تصحيح البيانات</p><p className="mt-1 text-xs leading-6 text-[#68747a]">{correctionStatusQuery.data.status === "pending" ? "طلبك قيد المراجعة من الإدارة." : correctionStatusQuery.data.status === "approved" ? "تمت الموافقة على التصحيح وتحديث بيانات الطلب." : "تم رفض طلب التصحيح. يمكنك التواصل معنا عبر واتساب عند الحاجة."}</p></div>}<form onSubmit={handleCorrectionSubmit} className="mt-5 rounded-[16px] border border-[#d9d0c2] bg-[#f7f3eb] p-4"><p className="font-display text-sm font-black text-[#173247]">هل أدخلت البريد أو رقم الواتساب بشكل خاطئ؟</p><p className="mt-1 text-xs leading-6 text-[#68747a]">أدخل القيمة الصحيحة، وسنراجع الطلب قبل اعتماد التعديل. البريد الحالي المستخدم للتحقق: {form.customerEmail}</p><div className="mt-3 space-y-3"><label className="block text-xs font-bold">البريد الجديد <span className="font-normal text-[#768087]">(اختياري)</span><input type="email" maxLength={320} value={correctionForm.email} onChange={e => setCorrectionForm({ ...correctionForm, email: e.target.value })} className="mt-1 w-full rounded-[10px] border border-[#d9d0c2] bg-white px-3 py-2 text-sm outline-none focus:border-[#b9854a]" /></label><label className="block text-xs font-bold">رقم الواتساب الجديد <span className="font-normal text-[#768087]">(اختياري)</span><input inputMode="tel" maxLength={20} value={correctionForm.phone} onChange={e => setCorrectionForm({ ...correctionForm, phone: e.target.value })} placeholder="06XXXXXXXX" className="mt-1 w-full rounded-[10px] border border-[#d9d0c2] bg-white px-3 py-2 text-sm outline-none focus:border-[#b9854a]" /></label><label className="block text-xs font-bold">ملاحظة مختصرة <span className="font-normal text-[#768087]">(اختياري)</span><textarea maxLength={500} value={correctionForm.reason} onChange={e => setCorrectionForm({ ...correctionForm, reason: e.target.value })} className="mt-1 min-h-16 w-full rounded-[10px] border border-[#d9d0c2] bg-white px-3 py-2 text-sm outline-none focus:border-[#b9854a]" /></label><button disabled={requestDataCorrection.isPending} className="w-full rounded-full border border-[#b9854a] px-4 py-2.5 text-xs font-extrabold text-[#89663b] disabled:opacity-50">{requestDataCorrection.isPending ? "جارٍ إرسال الطلب…" : "إرسال طلب التصحيح"}</button></div></form><button type="button" onClick={resetTransferFlow} className="mt-3 w-full rounded-full bg-[#172b3a] px-5 py-3 text-sm font-extrabold text-white">إغلاق</button></div>
            ) : !showBankDetails ? (
                <div className="mt-7 space-y-5">
                  <div className="rounded-[16px] border border-[#d9d0c2] bg-[#efe8dc] p-4 font-body text-xs leading-[1.9] text-[#68747a]">الخطوة الأولى: اعرض تعليمات التحويل، أرسل {productPriceMad} درهماً، ثم ارجع لإرسال مرجع العملية وإثبات الدفع. لن يتم تسليم الملف قبل المراجعة اليدوية.</div>
                  <button type="button" onClick={() => setShowBankDetails(true)} className="flex w-full items-center justify-center rounded-full bg-[#b9854a] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#a8733d]">إظهار تعليمات التحويل</button>
                </div>
              ) : (
              <form onSubmit={handleTransferSubmit} className="mt-7 space-y-4">
                <button type="button" onClick={() => setShowBankDetails(false)} className="inline-flex items-center gap-2 text-xs font-extrabold text-[#89663b] hover:text-[#172b3a]"><ArrowUpLeft size={14} /> العودة إلى تعليمات التحويل</button>
                <div className="rounded-[16px] border border-[#b9854a]/35 bg-[#efe8dc] p-4 font-body text-xs leading-[1.9] text-[#68747a]"><strong className="text-[#172b3a]">بيانات التحويل:</strong><br />المستفيد: {bankBeneficiary}<br />RIB: {bankRib}<br /><span className="text-[#89663b]">المبلغ: {productPriceMad} درهماً · احتفظ بمرجع العملية.</span></div>
                <label className="block text-sm font-bold">الاسم الكامل<input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="mt-2 w-full rounded-[12px] border border-[#d9d0c2] bg-white px-4 py-3 outline-none focus:border-[#b9854a]" /></label>
                <label className="block text-sm font-bold">البريد الإلكتروني<input required type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className="mt-2 w-full rounded-[12px] border border-[#d9d0c2] bg-white px-4 py-3 outline-none focus:border-[#b9854a]" /></label>
                <label className="block text-sm font-bold">الهاتف <span className="font-normal text-[#768087]">(اختياري)</span><input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="mt-2 w-full rounded-[12px] border border-[#d9d0c2] bg-white px-4 py-3 outline-none focus:border-[#b9854a]" /></label>
                <label className="block text-sm font-bold">مرجع التحويل أو رقم العملية<input required value={form.transactionReference} onChange={(e) => setForm({ ...form, transactionReference: e.target.value })} className="mt-2 w-full rounded-[12px] border border-[#d9d0c2] bg-white px-4 py-3 outline-none focus:border-[#b9854a]" /></label>
                <label className="block text-sm font-bold">إثبات الدفع <span className="font-normal text-[#768087]">(PDF أو JPG أو PNG، حتى 5MB)</span><input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-[12px] border border-dashed border-[#d9d0c2] bg-white px-4 py-3 text-sm" /></label>
                <label className="flex items-start gap-3 rounded-[12px] border border-[#d9d0c2] bg-white/70 p-3 text-xs leading-[1.8] text-[#68747a]"><input required type="checkbox" checked={transferConsent} onChange={(e) => setTransferConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#b9854a]" /><span>أوافق على <a href="/privacy" target="_blank" rel="noreferrer" className="font-bold text-[#89663b] underline">سياسة الخصوصية</a> و<a href="/terms" target="_blank" rel="noreferrer" className="font-bold text-[#89663b] underline">شروط الاستخدام</a> و<a href="/digital-files" target="_blank" rel="noreferrer" className="font-bold text-[#89663b] underline">سياسة الملفات الرقمية</a>.</span></label>
                <button disabled={createTransferRequest.isPending || !transferConsent} className="flex w-full items-center justify-center rounded-full bg-[#b9854a] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#a8733d] disabled:cursor-not-allowed disabled:opacity-60">{createTransferRequest.isPending ? "جارٍ تسجيل الطلب…" : "إرسال طلب المراجعة"}</button>
                <p className="text-center font-body text-[11px] leading-[1.8] text-[#8b9290]">التسليم ليس فورياً؛ يتم إرسال الرابط بعد التحقق اليدوي من التحويل. يمكنك إغلاق النافذة وإعادة المحاولة دون فقدان بياناتك.</p>
              </form>
              )}
          </div>
        </div>
      )}
      </div>
  );
}
