# مقياس — كود المشروع (الجزء 1 من 5)

هذا الملف جزء من نسخة نصية كاملة من مشروع مقياس (React + Vite + Express + Firebase). الملفات مرتبة بمسارها داخل المشروع، وكل ملف يبدأ بعنوان فيه مساره.

## ملفات هذا الجزء

- `api/index.ts`
- `firestore.rules`
- `server.ts`
- `server/security.ts`
- `.gitignore`
- `CHANGES.md`
- `README.md`
- `SECURITY.md`
- `firebase-applet-config.json`
- `index.html`
- `metadata.json`
- `package.json`
- `tsconfig.json`
- `vercel.json`
- `vite.config.ts`
- `src/App.tsx`
- `src/components/CloudLoadingState.tsx`
- `src/components/ExamModeToggle.tsx`
- `src/components/HomeView.tsx`
- `src/components/LanguageToggle.tsx`
- `src/components/Logo.tsx`


---

## `api/index.ts`

````ts
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import crypto from "crypto";
import { resolveCaller, sendIfAuthError, applyCors } from "../server/security";

// ==========================================
// In-Memory Cache & Rate Limiting for Vercel
// ==========================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const quizCache = new Map<string, CacheEntry<any>>();
const gradeCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const tracker = rateLimitMap.get(key);
  if (!tracker || now > tracker.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (tracker.count >= maxRequests) return false;
  tracker.count++;
  return true;
}

const STUDENT_DAILY_AI_LIMIT = 5;
const studentDailyQuotaMap = new Map<string, { count: number; dateKey: string }>();

function getUtcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStudentQuotaInfo(studentKey: string) {
  const dateKey = getUtcDateKey();
  const entry = studentDailyQuotaMap.get(studentKey);
  const used = entry && entry.dateKey === dateKey ? entry.count : 0;
  return {
    used,
    limit: STUDENT_DAILY_AI_LIMIT,
    remaining: Math.max(0, STUDENT_DAILY_AI_LIMIT - used),
    dateKey,
  };
}

function consumeStudentQuota(studentKey: string) {
  const dateKey = getUtcDateKey();
  const entry = studentDailyQuotaMap.get(studentKey);
  const currentUsed = entry && entry.dateKey === dateKey ? entry.count : 0;
  const nextUsed = currentUsed + 1;
  studentDailyQuotaMap.set(studentKey, { count: nextUsed, dateKey });
  return {
    used: nextUsed,
    limit: STUDENT_DAILY_AI_LIMIT,
    remaining: Math.max(0, STUDENT_DAILY_AI_LIMIT - nextUsed),
    dateKey,
  };
}

function normalizeArabicText(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\w\s\u0600-\u06FF]/gi, " ")
    .replace(/\s+/g, " ");
}

function computeSimilarityRatio(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const words1 = s1.split(" ").filter((w) => w.length > 1);
  const words2 = new Set(s2.split(" ").filter((w) => w.length > 1));
  if (words1.length === 0 || words2.size === 0) return 0;
  let matches = 0;
  for (const w of words1) {
    if (words2.has(w)) matches++;
  }
  return matches / Math.max(words1.length, words2.size);
}

function resolveLanguage(content: string, requestedLang: string): "ar" | "en" {
  if (requestedLang === "en") return "en";
  if (requestedLang === "ar") return "ar";
  // Intelligent auto-detection based on character counts
  if (!content || !content.trim()) return "ar";
  const arabicMatches = (content.match(/[\u0600-\u06FF]/g) || []).length;
  const latinMatches = (content.match(/[a-zA-Z]/g) || []).length;
  if (latinMatches > arabicMatches) {
    return "en";
  }
  return "ar";
}

function sanitizeQuestionText(text: string, isEnglish: boolean): string {
  if (!text) return "";
  let clean = text.trim();

  // Strip unwanted Arabic meta references
  const arabicBadPrefixes = [
    /^(?:وفقاً|استناداً|بناءً\s*على|طبقاً|بحسب)\s*(?:لما\s*ورد\s*في\s*)?(?:الملاحظات|المذكرة|النص|المستند|الملف|الصفحات|الشريحة|الفقرة)(?:\s*(?:الموضحة|المرفقة|المذكورة|السابقة|أعلاه|المدرجة))?[:،,\s-]*/gi,
    /^(?:في|من)\s*(?:الملاحظات|الملاحظة|المذكرة|النص|المستند|الصفحة\s*(?:الأولى|\d+)?|الصفحات\s*المدرجة|الفقرة\s*السابقة|الشريحة\s*السابقة)(?:\s*(?:الموضحة|المرفقة|المذكورة|السابقة|أعلاه|المدرجة))?[:،,\s-]*/gi,
    /^(?:كما\s*(?:هو\s*)?(?:موضح|مذكور|ورد|جاء)\s*في\s*(?:الملاحظات|النص|المذكرة|المستند|الصفحة\s*(?:الأولى|\d+)?))[:،,\s-]*/gi,
  ];

  for (const rx of arabicBadPrefixes) {
    clean = clean.replace(rx, "");
  }

  // Strip unwanted English meta references
  const englishBadPrefixes = [
    /^(?:according\s*to|based\s*on)\s*(?:the\s*)?(?:notes|text|passage|document|slides?|author|pages?|lecture)(?:\s*(?:above|mentioned|provided|attached))?[:,\s-]*/gi,
    /^(?:in|from)\s*(?:the\s*)?(?:notes|text|passage|document|page\s*\d+|pages?|slides?)(?:\s*(?:above|mentioned|provided|attached))?[:,\s-]*/gi,
    /^(?:as\s*(?:mentioned|stated|shown|described)\s*in\s*(?:the\s*)?(?:notes|text|passage|document|page\s*\d+))[:,\s-]*/gi,
  ];

  for (const rx of englishBadPrefixes) {
    clean = clean.replace(rx, "");
  }

  if (isEnglish && clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return clean.trim();
}

// Groq Fast Engine (Dynamic Active Production Models)
const GROQ_PREFERRED_MODELS = [
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
];
let cachedGroqModels: { models: string[]; fetchedAt: number } | null = null;

async function resolveGroqModels(groqKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedGroqModels && now - cachedGroqModels.fetchedAt < 60 * 60 * 1000 && cachedGroqModels.models.length > 0) {
    return cachedGroqModels.models;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${groqKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const availableIds: string[] = Array.isArray(data?.data)
        ? data.data
            .map((m: any) => String(m?.id || ""))
            .filter(
              (id: string) =>
                id &&
                !/whisper|guard|tts|playai|allam|orpheus|safeguard|embed/i.test(id)
            )
        : [];

      if (availableIds.length > 0) {
        const ordered = GROQ_PREFERRED_MODELS.filter((id) => availableIds.includes(id));
        const extras = availableIds.filter((id) => !ordered.includes(id));
        const finalModels = [...ordered, ...extras].slice(0, 3);
        cachedGroqModels = { models: finalModels, fetchedAt: now };
        return finalModels;
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  return ["openai/gpt-oss-120b", "llama-3.1-8b-instant"];
}

async function callGroqChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature = 0.2
): Promise<string | null> {
  const rawGroq = process.env.GROQ_API_KEY;
  const groqKey = rawGroq ? rawGroq.replace(/['"]+/g, "").trim() : "";
  if (!groqKey) return null;

  const models = await resolveGroqModels(groqKey);

  for (const model of models) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.warn(`[Groq Warning] Model ${model} status ${response.status}: ${errText.slice(0, 150)}`);
        if (response.status === 404 || response.status === 400) {
          cachedGroqModels = null;
          continue;
        }
        return null;
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (content) return content;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }
  return null;
}

// Multi-Model Gemini Free Cascade for public API keys
async function generateWithGeminiCascade(contents: any, config: any) {
  const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const apiKey = rawKey.replace(/['"]+/g, "").trim();

  if (!apiKey) {
    throw new Error(
      "مفتاح GEMINI_API_KEY غير موجود في متغيرات البيئة على Vercel. يرجى إضافته في إعدادات المشروع (Settings -> Environment Variables) ثم عمل Redeploy."
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const models = [
    "gemini-4-hydrogen",
    "gemini-3.1-flash-lite",
  ];
  let lastError: any = null;

  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      return { response: res, modelUsed: model };
    } catch (err: any) {
      console.warn(`[Gemini Cascade] Model ${model} error:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("تعذر استجابة نماذج Gemini للذكاء الاصطناعي حالياً.");
}

// ==========================================
// Vercel Serverless Function Handler
// ==========================================
export default async function handler(req: any, res: any) {
  // 1. CORS: قائمة مسموحة من ALLOWED_ORIGINS فقط
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 2. Parse body safely
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const url = req.url || "";
  const isGenerate =
    url.includes("generate-quiz") ||
    (req.method === "POST" && (Boolean(body.content?.trim()) || (Array.isArray(body.images) && body.images.length > 0)));
  const isGrade =
    url.includes("grade-written") ||
    (req.method === "POST" && Boolean(body.question) && Boolean(body.studentAnswer));
  const isQuotaQuery = url.includes("student-quota");
  const isHealth =
    url.includes("health") ||
    (req.method === "GET" && !url.includes("generate") && !url.includes("grade") && !isQuotaQuery);

  if (isQuotaQuery && req.method === "GET") {
    try {
      const caller = await resolveCaller(req);
      return res.status(200).json(caller.role === "teacher" ? { used: 0, limit: 0, remaining: 0, unlimited: true } : getStudentQuotaInfo(caller.quotaKey));
    } catch (err) {
      if (sendIfAuthError(res, err)) return;
      throw err;
    }
  }

  // Track A: Health Check
  if (isHealth && req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      platform: "vercel-serverless",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      hasGroqKey: Boolean(process.env.GROQ_API_KEY),
      time: new Date().toISOString(),
    });
  }

  // Track B: AI Quiz Generation
  if (isGenerate && req.method === "POST") {
    try {
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "vercel-client";
      if (!checkRateLimit(`gen_${clientIp}`, 15, 60000)) {
        return res.status(429).json({
          error: "تجاوزت الحد المسموح من طلبات التوليد السريعة. يرجى الانتظار دقيقة والمحاولة مجدداً.",
        });
      }

      const {
        content,
        images = [],
        mode = "generate",
        count = 5,
        mcqCount: reqMcqCount,
        writtenCount: reqWrittenCount,
        questionType = "mixed",
        difficulty = "medium",
        language = "auto",
        lectureTitle,
      } = body;

      // الدور يُحدد من توكن Firebase على السيرفر، لا من حقل في الطلب
      let caller;
      try {
        caller = await resolveCaller(req);
      } catch (err) {
        if (sendIfAuthError(res, err)) return;
        throw err;
      }
      const isStudentRequest = caller.role !== "teacher";
      const studentQuotaKey = caller.quotaKey;

      if (isStudentRequest) {
        const currentQuota = getStudentQuotaInfo(studentQuotaKey);
        if (currentQuota.remaining <= 0) {
          return res.status(429).json({
            error: "استنفدت حدك اليومي المجاني لإنشاء الاختبارات بالذكاء الاصطناعي (5 اختبارات يومياً).",
            details: "يتجدد رصيدك تلقائياً كل يوم، ويمكنك الاستمرار في المراجعة والتدريب على اختباراتك المحفوظة وبنك الأخطاء.",
            quota: currentQuota,
          });
        }
      }

      const quizMode: "generate" | "format_existing" = mode === "format_existing" ? "format_existing" : "generate";

      if ((!content || !content.trim()) && (!images || images.length === 0)) {
        return res.status(400).json({
          error: "Content or at least one image is required for quiz generation.",
        });
      }

      if (content && typeof content === "string" && content.length > 250000) {
        return res.status(400).json({
          error: "حجم النص المصدري كبير جداً (الحد الأقصى 250,000 حرف).",
        });
      }

      const safeImages = Array.isArray(images) ? images.slice(0, 30) : [];

      let mcqTarget: number | null = null;
      let writtenTarget: number | null = null;
      if (typeof reqMcqCount === "number" || typeof reqWrittenCount === "number") {
        mcqTarget = Math.max(0, Math.min(100, Number(reqMcqCount) || 0));
        writtenTarget = Math.max(0, Math.min(100, Number(reqWrittenCount) || 0));
        if (mcqTarget === 0 && writtenTarget === 0) mcqTarget = 5;
      }

      const questionCount =
        mcqTarget !== null && writtenTarget !== null
          ? mcqTarget + writtenTarget
          : Math.max(1, Math.min(100, Number(count) || 5));

      const hasImages = safeImages.length > 0;

      // In-memory cache check for text queries
      let cacheKey = "";
      if (!hasImages && content) {
        const hashContent = crypto
          .createHash("sha256")
          .update(
            `${quizMode}_${normalizeArabicText(content)}_${mcqTarget}_${writtenTarget}_${questionCount}_${questionType}_${difficulty}_${language}_${lectureTitle || ""}`
          )
          .digest("hex");
        cacheKey = `quiz_${hashContent}`;
        const cachedResult = quizCache.get(cacheKey);
        if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
          return res.status(200).json({
            ...cachedResult.data,
            cached: true,
            ...(isStudentRequest ? { quota: getStudentQuotaInfo(studentQuotaKey) } : {}),
          });
        }
      }

      const targetLang = resolveLanguage(content || "", language);
      const isEn = targetLang === "en";

      let systemInstruction = "";
      let questionCountDirective = "";

      if (quizMode === "format_existing") {
        const formatLangRuleEn =
          language === "auto"
            ? "LANGUAGE RULE: Keep EVERY question, option, and answer in its EXACT original language as written in the source text/images. Do NOT translate."
            : language === "en"
            ? "LANGUAGE RULE: Output titles, descriptions, questions, options, and answers in English."
            : "LANGUAGE RULE: Output titles, descriptions, questions, options, and answers in Arabic.";

        const formatLangRuleAr =
          language === "auto"
            ? "قاعدة اللغة: حافظ على لغة كل سؤال وخياراته وإجابته كما وردت في النص أو الصور تماماً دون ترجمة."
            : language === "en"
            ? "قاعدة اللغة: أخرج العناوين والأسئلة والخيارات والإجابات باللغة الإنجليزية."
            : "قاعدة اللغة: أخرج العناوين والأسئلة والخيارات والإجابات باللغة العربية.";

        systemInstruction = isEn
          ? `You are a precision academic exam digitizer and proofreader.
PRIMARY TASK: Extract and format EVERY SINGLE ready-made question found in the teacher's input text and/or uploaded images.

STRICT PRESERVATION & PROOFREADING RULES:
1. DO NOT CHANGE QUESTIONS:
   - Keep every question's exact wording, meaning, numbers, formulas, order, and answer choices intact.
   - NEVER rephrase, paraphrase, invent new questions, or skip any question present in the input.
   - ONLY fix clear spelling, punctuation, or grammatical typos, and strip leading numbering/option prefixes (like "1.", "Q1:", "A.", "B)") from question text and option strings so they display cleanly.
   - Classify each question accurately: "mcq" if multiple choices are present (preserve exact options array), or "written" if open-ended/short-answer (options: []).

2. ANSWER KEY PRIORITY & AI FALLBACK:
   - Priority 1 (Provided Answer): If the input text or image marks, highlights, circles, underlines, or states the correct answer or answer key for a question, you MUST use that exact provided answer verbatim as "correctAnswer" and set "isAiSuggestedAnswer": false.
   - Priority 2 (Missing Answer): ONLY if no answer is provided or indicated anywhere in the source for that question, determine the closest, most accurate academic answer for "correctAnswer" and you MUST set "isAiSuggestedAnswer": true so the teacher is alerted to review it.

3. DIAGRAMMATIC QUESTIONS & PERFORMANCE:
   - Set "requiresImage": true if the question references a figure, diagram, graph, or image; otherwise false.
   - Do NOT generate explanations.
   - ${formatLangRuleEn}`
          : `أنت مدقق لغوي ومُنسّق اختبارات إلكترونية عالي الدقة.
المهمة الأساسية: استخراج وتنسيق جميع الأسئلة الجاهزة الموجودة في النص المرفق و/أو الصور المرفوعة كاملةً دون نقصان.

القواعد الصارمة للحفاظ على الأسئلة كما هي:
1. ممنوع تغيير الأسئلة أو إعادة صياغتها:
   - التزم بنص كل سؤال ومعناه وأرقامه ومعادلاته وخياراته كما وردت من المعلم تماماً.
   - يُمنع منعاً باتاً اختراع أسئلة إضافية غير موجودة، أو حذف أسئلة، أو تغيير فكرة السؤال أو استبدال خياراته.
   - دورك يقتصر فقط على إعادة التنسيق وتصحيح الأخطاء الإملائية والنحوية الواضحة (وإزالة ترقيم السؤال أو حروف الخيارات مثل "1." أو "A." أو "أ-" من نص الخيار نفسه ليظهر نظيفاً).
   - صنّف كل سؤال بدقة: "mcq" إذا كان له خيارات (مع الحفاظ على الخيارات كما هي في options)، أو "written" إذا كان مقالياً (options: []).

2. أولوية الإجابة الصحيحة وتمييز إجابات الذكاء الاصطناعي:
   - الأولوية القصوى (إجابة مرفقة): إذا كانت الإجابة الصحيحة أو النموذجية مذكورة في النص أو مؤشراً عليها في الصورة (بتظليل، دائرة، خط، علامة صح، أو مفتاح إجابة)، التزم بها حرفياً في "correctAnswer" وضع حتماً "isAiSuggestedAnswer": false.
   - الحالة الثانية (سؤال بدون إجابة مرفقة): فقط إذا لم تتوفر أي إجابة لهذا السؤال في النص أو الصورة، اختر الإجابة العلمية الأقرب والأدق في "correctAnswer" وضع حتماً "isAiSuggestedAnswer": true لينتبه المعلم ويراجعها.

3. الصور والأشكال وسرعة التنفيذ:
   - ضع "requiresImage": true إذا كان السؤال يعتمد على شكل أو رسم أو صورة، وإلا false.
   - لا تولّد أي شرح أو تفسير للإجابات نهائياً.
   - ${formatLangRuleAr}`;
      } else {
        questionCountDirective = isEn
          ? (mcqTarget !== null && writtenTarget !== null
              ? `PRIMARY TASK: Generate EXACTLY ${mcqTarget} multiple-choice question(s) (type: "mcq") and ${writtenTarget} short-answer/written question(s) (type: "written"), for a total of ${questionCount} question(s).`
              : `PRIMARY TASK: Generate ${questionCount} collegiate examination questions based strictly on the provided material (${questionType === 'mcq' ? 'Multiple choice only' : questionType === 'written' ? 'Written / short answer only' : 'Balanced mix of MCQ and written questions'}).`)
          : (mcqTarget !== null && writtenTarget !== null
              ? `المهمة الأساسية: توليد بالضبط ${mcqTarget} سؤال اختيار من متعدد (type: "mcq") و ${writtenTarget} سؤال مقالي / تحريري (type: "written")، بإجمالي ${questionCount} سؤال.`
              : `المهمة: توليد ${questionCount} أسئلة اختبار جامعي استناداً بشكل حصري وحتمي إلى المحتوى المُقدَّم (${questionType === 'mcq' ? 'اختيار من متعدد فقط' : questionType === 'written' ? 'أسئلة مقالية فقط' : 'مزيج متوازن بين MCQ والأسئلة المقالية'}).`);

        systemInstruction = isEn
          ? `You are a distinguished university professor and veteran examination author with over 15 years of experience designing rigorous collegiate assessments and standardized testing.
${questionCountDirective}

EXAMINATION DESIGN STANDARDS (Bloom's Taxonomy):
1. SENIOR PROFESSOR PERSONA & INTELLECTUAL RIGOR:
   - Formulate thoughtful, authoritative questions that test conceptual understanding, critical analysis, mechanism synthesis, and application—never trivial superficial recall or verbatim phrasing.
   - For Multiple-Choice Questions (type: "mcq"): Provide 4 academically plausible, distinct options. Distractors must represent common, nuanced misconceptions of students, not obviously incorrect options.
   - For Written Questions (type: "written"): Provide a concise, gold-standard model answer (correctAnswer) establishing core grading criteria. Set options to [].
   - Always set "isAiSuggestedAnswer": false. Do NOT generate explanations.

2. 100% SELF-CONTAINED QUESTIONS (STRICT ZERO-META BAN):
   - Every question must be fully independent and self-contained, as if appearing on an official university final exam sheet.
   - STRICT PROHIBITION: NEVER use phrases referencing the presentation of the material:
     * FORBIDDEN: "According to the notes / text / document / author / passage / slides..."
     * FORBIDDEN: "As stated in the text / notes / above / below..."
     * FORBIDDEN: "In page 1 / on the first page / in the previous section..."
   - State the subject-matter question directly!
     * POOR: "According to the notes provided, what causes acute inflammation?"
     * EXCELLENT: "Which cellular mediator is primarily responsible for triggering the acute inflammatory vascular response?"

3. DIAGRAMMATIC QUESTIONS:
   - If a question requires examining an accompanying diagram, graph, or image, mark "requiresImage": true, and formulate the question with appropriate visual phrases ("In the accompanying figure, ...", "Based on the graph shown, what is the value of ...?").
   - If purely conceptual and requiring no visual aid, mark "requiresImage": false.

4. STRICT FACTUAL GROUNDING:
   - Ground all questions and correct answers solely in the provided source material. Do not extrapolate external facts.
   - Difficulty Level: ${difficulty}.
   - CRITICAL LANGUAGE RULE: ALL titles, descriptions, questions, options, and answers MUST BE GENERATED ENTIRELY IN ENGLISH.`
          : `أنت أستاذ جامعي ومحاضر أول خبير ومخضرم، تمتلك خبرة تفوق 15 عاماً في وضع وتصميم الامتحانات المعيارية والتقييمات الأكاديمية الرسمية.
${questionCountDirective}

المعايير المنهجية لصياغة الامتحانات الجامعية الرسمية (Bloom's Taxonomy):
1. جودة أكاديمية رفيعة واختبار حقيقي لقدرات الطالب:
   - تقمص شخصية أستاذ جامعي خبير؛ لا تصغ أسئلة سطحية أو مباشرة مأخوذة نسخاً ولصقاً كأن طالباً هو من صاغها، بل صغ أسئلة تقيس الاستيعاب العميق، التحليل، والربط المفاهيمي.
   - لأسئلة الاختيار من متعدد (type: "mcq"): وفر 4 خيارات علمية متوازنة ورصينة. يجب أن تمثل الخيارات غير الصحيحة (المشتتات) أخطاء شائعة دقيقة يقع فيها الطالب المتعجل، وليست خيارات بديهية أو مستبعدة بسهولة.
   - للأسئلة المقالية (type: "written"): وفر إجابة نموذجية معتمدة وموجزة ودقيقة (correctAnswer) تمثل المعيار الذهبي للتصحيح، واجعل options مصفوفة فارغة [].
   - ضع دائماً "isAiSuggestedAnswer": false. ولا تولّد أي شرح أو تفسير للإجابات نهائياً.

2. استقلالية تامة 100% لكل سؤال (قائم بذاته كلياً دون إشارة لأوراق أو مذكرات):
   - يجب أن يُصاغ كل سؤال كأنه مأخوذ من ورقة امتحان وزاري أو جامعي رسمي معتمد؛ مكتمل الأركان بذاته وواضح دون أي إشارة لوجود أوراق أو مذكرات خارجية.
   - حظر قطعي لا تنازل فيه: يُمنع منعاً باتاً ومطلقاً استخدام أي عبارات تشير إلى المستند أو الملاحظات أو موضع الفقرات، مثل:
     * (في الملاحظات الموضحة / في الملاحظات المرفقة / بحسب الملاحظات)
     * (في الصفحة الأولى / في صفحة 2 / في آخر الصفحة / في الصفحات المدرجة)
     * (وفقاً للنص المصدري / كما هو مذكور في النص / استناداً إلى ما ورد أعلاه / في المذكرة)
     * (في الفقرة السابقة / في الشريحة التالية)
   - بدلاً من ذلك، اطرح السؤال العلمي/الموضوعي مباشرة!
     مثال مرفوض: "في الملاحظات الموضحة في بداية النص، ما هي وظيفة الميتوكوندريا؟"
     مثال معتمد ومستقل: "ما هي الوظيفة الحيوية الأساسية للميتوكوندريا في الخلية الحيوانية؟"

3. صياغة الأسئلة المعتمدة على صور أو رسوم بيانية (requiresImage):
   - عند صياغة سؤال يعتمد حله على شكل توضيحي أو رسم بياني، ضع حتماً "requiresImage": true، واستخدم عبارات علمية مقترنة بالشكل مثل:
     "في الشكل المقابل، ..."، "بناءً على الرسم البياني المرفق، ..."، "يوضح المخطط المجاور ... ما قيمة ...؟".
   - إذا كان السؤال نظرياً/نصياً مستقلاً بذاته ولا يحتاج صورة، ضع "requiresImage": false.

4. قاعدة التأصيل الحصري الصارم (STRICT GROUNDING):
   - يجب أن تكون جميع الأسئلة والخيارات والإجابات مبنية كلياً على الحقائق والمعلومات الموجودة صراحة داخل المحتوى المُقدَّم.
   - مستوى الصعوبة المطلوب: ${difficulty}.
   - شرط لغوي صارم: يجب أن تكون كافة الأسئلة والخيارات والإجابات مكتوبة 100% باللغة العربية الفصحى الأكاديمية الرصينة.`;
      }

      let parsedData: any = null;

      // Track 1: Try Groq for text queries
      if (!hasImages && process.env.GROQ_API_KEY) {
        try {
          const groqPrompt = quizMode === "format_existing"
            ? (isEn
                ? `Teacher's Ready-Made Questions:\n${lectureTitle ? `Quiz Title: ${lectureTitle}\n` : ""}\n"""\n${content}\n"""\n\nTASK: Extract and proofread EVERY question above into JSON matching this exact schema (preserve exact meaning/options, set isAiSuggestedAnswer=true ONLY if answer was missing in source, NO explanation field):
{
  "quizTitle": "${lectureTitle ? lectureTitle.trim() : "Formatted Quiz"}",
  "description": "Brief quiz summary",
  "questions": [
    {
      "question": "Proofread question text preserving original phrasing",
      "type": "mcq" or "written",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"] (or [] for written),
      "correctAnswer": "Exact correct answer text",
      "requiresImage": false,
      "isAiSuggestedAnswer": false
    }
  ]
}`
                : `الأسئلة الجاهزة المقدمة من المعلم:\n${lectureTitle ? `عنوان الاختبار: ${lectureTitle}\n` : ""}\n"""\n${content}\n"""\n\nالمطلوب: استخراج وتدقيق جميع الأسئلة المرفقة في كائن JSON بالشكل التالي مع الحفاظ التام على الأسئلة وخياراتها (ضع isAiSuggestedAnswer: true فقط إذا لم تُرفق الإجابة في المصدر، وبدون حقل تفسير):
{
  "quizTitle": "${lectureTitle ? lectureTitle.trim() : "اختبار منسق"}",
  "description": "وصف موجز للاختبار",
  "questions": [
    {
      "question": "نص السؤال بعد التصحيح الإملائي واللغوي الطفيف دون تغيير معناه",
      "type": "mcq" أو "written",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswer": "نص الإجابة الصحيحة",
      "requiresImage": false,
      "isAiSuggestedAnswer": false
    }
  ]
}`)
            : (isEn
                ? `Course Material:\n${lectureTitle ? `Exam Title: ${lectureTitle}\n` : ""}\n"""\n${content}\n"""\n\nTASK: Generate a standardized JSON object matching this exact schema (NO explanation field):
{
  "quizTitle": "${lectureTitle ? lectureTitle.trim() : "Comprehensive Examination"}",
  "description": "Brief exam description",
  "questions": [
    {
      "question": "Clear, self-contained examination question testing core concepts",
      "type": "mcq" or "written",
      "options": ["Option A", "Option B", "Option C", "Option D"] (or [] for written),
      "correctAnswer": "Exact correct answer text",
      "requiresImage": false,
      "isAiSuggestedAnswer": false
    }
  ]
}`
                : `المحتوى المرجعي:\n${lectureTitle ? `عنوان الاختبار: ${lectureTitle}\n` : ""}\n"""\n${content}\n"""\n\nالمطلوب: قم بتوليد كائن JSON بالشكل التالي (بدون حقل تفسير):
{
  "quizTitle": "${lectureTitle ? lectureTitle.trim() : "عنوان الاختبار"}",
  "description": "وصف موجز للاختبار",
  "questions": [
    {
      "question": "نص السؤال الواضح القائم بذاته دون إشارة للملاحظات",
      "type": "mcq" أو "written",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswer": "الإجابة الصحيحة",
      "requiresImage": false,
      "isAiSuggestedAnswer": false
    }
  ]
}`);
          const groqResult = await callGroqChat(
            [
              { role: "system", content: systemInstruction },
              { role: "user", content: groqPrompt },
            ],
            quizMode === "format_existing" ? 0.0 : 0.2
          );
          if (groqResult) {
            let clean = groqResult.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
            parsedData = JSON.parse(clean);
            if (lectureTitle && lectureTitle.trim()) {
              parsedData.quizTitle = lectureTitle.trim();
            }
          }
        } catch (e) {
          console.warn("[Groq Warn] Fallback to Gemini:", e);
        }
      }

      // Track 2: Gemini Call Helper
      const runGeminiQuizCall = async (batchImages: any[], batchContent: string, batchDirective: string, previousQuestionsSummary = "") => {
        const parts: any[] = [];
        if (batchImages.length > 0) {
          for (const img of batchImages) {
            if (!img || !img.data) continue;
            let base64Data = img.data;
            let mimeType = img.mimeType || "image/jpeg";
            if (base64Data.startsWith("data:")) {
              const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                mimeType = match[1];
                base64Data = match[2];
              }
            }
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          }
        }

        const promptText = isEn
          ? `${quizMode === "format_existing" ? "Teacher's Ready-Made Questions Input:" : "Reference Course Material:"}\n${lectureTitle ? `Exam Title: ${lectureTitle}\n` : ""}\n${batchContent ? `Source Text:\n"""\n${batchContent}\n"""` : "(Based on attached images)"}\n${previousQuestionsSummary ? `\n${previousQuestionsSummary}\n` : ""}\n\nTask: ${batchDirective}`
          : `${quizMode === "format_existing" ? "الأسئلة الجاهزة المقدمة من المعلم:" : "المحتوى المرجعي المقدم من المعلم:"}
${lectureTitle ? `عنوان الاختبار: ${lectureTitle}\n` : ""}
${batchContent ? `النص المصدري:\n"""\n${batchContent}\n"""` : "(مستند إلى الصور المرفقة)"}
${previousQuestionsSummary ? `\n${previousQuestionsSummary}\n` : ""}

المطلوب: ${batchDirective}`;

        parts.push({ text: promptText });

        const modelConfig = {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quizTitle: { type: Type.STRING },
              description: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    type: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    requiresImage: { type: Type.BOOLEAN },
                    isAiSuggestedAnswer: { type: Type.BOOLEAN },
                  },
                  required: ["question", "type", "options", "correctAnswer", "requiresImage", "isAiSuggestedAnswer"],
                },
              },
            },
            required: ["quizTitle", "questions"],
          },
        };

        const { response: geminiResponse } = await generateWithGeminiCascade({ parts }, modelConfig);
        let text = (geminiResponse.text || "{}").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
        return JSON.parse(text);
      };

      if (!parsedData || !Array.isArray(parsedData.questions)) {
        if (hasImages && safeImages.length > 5) {
          const BATCH_SIZE = 5;
          const totalBatches = Math.ceil(safeImages.length / BATCH_SIZE);
          let remainingMcq = mcqTarget !== null ? mcqTarget : Math.round(questionCount * 0.7);
          let remainingWritten = writtenTarget !== null ? writtenTarget : questionCount - remainingMcq;
          let allAggregatedQuestions: any[] = [];
          let finalTitle = lectureTitle?.trim() || "";
          let finalDescription = "";

          for (let bIndex = 0; bIndex < totalBatches; bIndex++) {
            const batchSlice = safeImages.slice(bIndex * BATCH_SIZE, (bIndex + 1) * BATCH_SIZE);
            let prevSummary = "";
            if (bIndex > 0 && allAggregatedQuestions.length > 0) {
              prevSummary = isEn
                ? `Sequential batch context (${bIndex + 1} of ${totalBatches}):\n- Avoid repeating questions already extracted/generated:\n${allAggregatedQuestions.slice(-15).map((q, idx) => `${idx + 1}. ${q.question}`).join("\n")}`
                : `سياق الترابط التتابعي (الدفعة رقم ${bIndex + 1} من إجمالي ${totalBatches}):
- تجنب تكرار الأسئلة التالية:
${allAggregatedQuestions.slice(-15).map((q, idx) => `${idx + 1}. ${q.question}`).join("\n")}`;
            }

            let batchDirective = "";
            if (quizMode === "format_existing") {
              batchDirective = isEn
                ? `Extract and proofread ALL ready-made questions visible in this batch of ${batchSlice.length} image(s) verbatim (preserve exact questions and options; fix only spelling/grammar typos; mark isAiSuggestedAnswer=true ONLY when an answer is missing from the source).`
                : `استخرج ودقّق إملائياً ولغوياً جميع الأسئلة الجاهزة الموجودة في صور هذه الدفعة (${batchSlice.length} صور) كاملةً كما هي تماماً دون تغيير المعنى أو الخيارات، وضع isAiSuggestedAnswer=true فقط للأسئلة غير المرفق لها إجابة.`;
            } else {
              const batchesLeft = totalBatches - bIndex;
              const currentBatchMcq = Math.round(remainingMcq / batchesLeft);
              const currentBatchWritten = Math.round(remainingWritten / batchesLeft);
              remainingMcq -= currentBatchMcq;
              remainingWritten -= currentBatchWritten;
              const currentBatchTotal = currentBatchMcq + currentBatchWritten;

              batchDirective = isEn
                ? `Generate exactly ${currentBatchMcq} multiple-choice question(s) and ${currentBatchWritten} written question(s), for a total of ${currentBatchTotal} rigorous questions from this image batch.`
                : `قم بتوليد بالضبط ${currentBatchMcq} سؤال اختيار من متعدد (mcq) و ${currentBatchWritten} سؤال مقالي (written)، بإجمالي ${currentBatchTotal} سؤال بصياغة رصينة مستقلة تماماً من صور هذه الدفعة.`;
            }

            const batchResult = await runGeminiQuizCall(
              batchSlice,
              bIndex === 0 ? content || "" : "",
              batchDirective,
              prevSummary
            );

            if (batchResult) {
              if (!finalTitle && batchResult.quizTitle) finalTitle = batchResult.quizTitle;
              if (!finalDescription && batchResult.description) finalDescription = batchResult.description;
              if (Array.isArray(batchResult.questions)) {
                allAggregatedQuestions.push(...batchResult.questions);
              }
            }
          }

          parsedData = {
            quizTitle: lectureTitle?.trim() || finalTitle || (isEn ? "Comprehensive Exam" : "اختبار شامل"),
            description: finalDescription || (isEn ? "Exam from multi-page material" : "اختبار من عدة دفعات مصورة"),
            questions: allAggregatedQuestions,
          };
        } else {
          const singleDirective = quizMode === "format_existing"
            ? (isEn
                ? `Extract and proofread ALL ready-made questions present in the provided text/images verbatim. Preserve exact question meaning, numbers, and options; fix only spelling/grammar typos; prioritize provided answers (isAiSuggestedAnswer=false) and only infer closest answer if missing (isAiSuggestedAnswer=true).`
                : `استخرج ونسّق جميع الأسئلة الجاهزة الموجودة في النص/الصور كما هي تماماً دون تغيير المعنى أو الخيارات مع تصحيح الأخطاء الإملائية واللغوية فقط، والالتزام بالإجابات المرفقة إن وجدت (isAiSuggestedAnswer=false) أو اختيار الأقرب إذا لم تتوفر (isAiSuggestedAnswer=true).`)
            : (isEn
                ? `Generate ${questionCountDirective} with rigorous, self-contained questions based strictly on the provided material.`
                : `قم بتوليد ${questionCountDirective} بصياغة أكاديمية رصينة ومستقلة تماماً استناداً للمحتوى المرفق.`);
          parsedData = await runGeminiQuizCall(safeImages, content || "", singleDirective);
          if (lectureTitle && lectureTitle.trim()) {
            parsedData.quizTitle = lectureTitle.trim();
          }
        }
      }

      const visualKeywordsRegex = /(في الشكل|في الرسم|في الصورة|المخطط المقابل|الشكل المجاور|الموضح بالصورة|الدائرة المقابلة|المنحنى المقابل|من الشكل|بناء على الرسم|طبقاً للرسم|in the figure|in the diagram|shown in the image|in the graph|as shown below|in the illustration|referring to the diagram)/i;

      const formattedQuestions = (parsedData.questions || []).map((q: any, idx: number) => {
        const rawQuestionText = String(q.question || "").trim();
        const finalQuestion = quizMode === "format_existing"
          ? rawQuestionText
          : (sanitizeQuestionText(rawQuestionText, isEn) || rawQuestionText);
        const explicitFlag = Boolean(q.requiresImage);
        const matchedVisual = visualKeywordsRegex.test(finalQuestion);
        const needsImage = explicitFlag || matchedVisual;
        const options: string[] = Array.isArray(q.options) && q.options.length > 0
          ? q.options.map((o: any) => String(o || "").trim()).filter(Boolean)
          : [];
        const qType = q.type === "written" || options.length === 0 ? "written" : "mcq";

        let resolvedCorrectAnswer = String(q.correctAnswer || "").trim();
        if (qType === "mcq" && options.length > 0) {
          if (!options.includes(resolvedCorrectAnswer)) {
            const trimmedMatch = options.find(
              (opt) => opt.toLowerCase() === resolvedCorrectAnswer.toLowerCase()
            );
            if (trimmedMatch) {
              resolvedCorrectAnswer = trimmedMatch;
            } else {
              const letterMatch = resolvedCorrectAnswer.match(/^([A-Da-d])[\.\)\-:\s]*$/);
              if (letterMatch) {
                const letterIdx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
                if (letterIdx >= 0 && letterIdx < options.length) {
                  resolvedCorrectAnswer = options[letterIdx];
                }
              }
            }
          }
          if (!resolvedCorrectAnswer || !options.includes(resolvedCorrectAnswer)) {
            resolvedCorrectAnswer = options[0];
          }
        }

        return {
          id: `gen_q_${Date.now()}_${idx + 1}`,
          lecture: parsedData.quizTitle || lectureTitle || (isEn ? "Generated Exam" : "اختبار مولّد"),
          question: finalQuestion,
          type: qType,
          options: qType === "mcq" ? options : [],
          correctAnswer: resolvedCorrectAnswer,
          requiresImage: needsImage,
          isAiSuggestedAnswer: quizMode === "format_existing" ? Boolean(q.isAiSuggestedAnswer) : false,
          imageURL: null,
        };
      });

      const responsePayload = {
        success: true,
        quizTitle: parsedData.quizTitle || lectureTitle || (quizMode === "format_existing" ? "اختبار منسق" : "اختبار مولّد"),
        description: parsedData.description || "",
        questions: formattedQuestions,
      };

      if (cacheKey) {
        quizCache.set(cacheKey, { data: responsePayload, timestamp: Date.now() });
      }

      const updatedQuota = isStudentRequest && formattedQuestions.length > 0
        ? consumeStudentQuota(studentQuotaKey)
        : undefined;

      return res.status(200).json({
        ...responsePayload,
        ...(updatedQuota ? { quota: updatedQuota } : {}),
      });
    } catch (error: any) {
      console.error("Vercel AI quiz generation error:", error);
      const msg = error?.message || String(error);
      const isQuotaError = error?.status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit|429/i.test(msg);
      return res.status(isQuotaError ? 429 : 500).json({
        error: "فشل توليد الأسئلة بواسطة الذكاء الاصطناعي.",
        details: isQuotaError
          ? "تم تجاوز الحد المؤقت لطلبات واجهة Gemini المجانية. يرجى الانتظار دقيقة واحدة ثم المحاولة مجدداً (أو التحقق من حصة مفتاح API)."
          : msg,
      });
    }
  }

  // Track C: Real-time Written Answer Semantic Grading
  if (isGrade && req.method === "POST") {
    try {
      const { question, modelAnswer, studentAnswer, language = "ar" } = body;

      if (!question || !modelAnswer || !studentAnswer) {
        return res.status(400).json({
          error: "Question, modelAnswer, and studentAnswer are required.",
        });
      }

      const normStudent = normalizeArabicText(studentAnswer);
      const normModel = normalizeArabicText(modelAnswer);

      // Fast check: Blank
      if (normStudent.length < 2) {
        return res.status(200).json({
          success: true,
          score: 0,
          isCorrect: false,
          rating: "WRITTEN_WRONG",
          statusText: language === "en" ? "Incomplete Answer" : "إجابة فارغة أو غير مكتملة",
          feedback: language === "en" ? "Please provide a complete answer." : "يرجى كتابة إجابة واضحة ومتكاملة للسؤال.",
          keyPointsMatched: [],
          missingPoints: [modelAnswer],
          source: "local-fast",
        });
      }

      // Fast check: Exact match
      if (normStudent === normModel) {
        return res.status(200).json({
          success: true,
          score: 100,
          isCorrect: true,
          rating: "WRITTEN_CORRECT",
          statusText: language === "en" ? "Model Answer" : "إجابة نموذجية ومطابقة",
          feedback: language === "en" ? "Your answer perfectly matches the expected model answer." : "إجابتك نموذجية ومطابقة تماماً للإجابة المعتمدة.",
          keyPointsMatched: [modelAnswer],
          missingPoints: [],
          source: "local-exact",
        });
      }

      // Fast check: High lexical similarity
      const simRatio = computeSimilarityRatio(normStudent, normModel);
      if (simRatio >= 0.85) {
        const score = Math.min(100, Math.round(simRatio * 100));
        return res.status(200).json({
          success: true,
          score,
          isCorrect: true,
          rating: "WRITTEN_CORRECT",
          statusText: language === "en" ? "Excellent Answer" : "إجابة ممتازة ودقيقة",
          feedback: language === "en" ? "Great understanding of essential concepts." : "إجابة ممتازة تغطي معظم المفاهيم الأساسية للإجابة النموذجية.",
          keyPointsMatched: [modelAnswer],
          missingPoints: [],
          source: "local-similarity",
        });
      }

      const gradeCacheKey = crypto
        .createHash("sha256")
        .update(`${normalizeArabicText(question)}::${normModel}::${normStudent}`)
        .digest("hex");
      const cachedGrade = gradeCache.get(gradeCacheKey);
      if (cachedGrade && Date.now() - cachedGrade.timestamp < CACHE_TTL_MS) {
        return res.status(200).json({
          ...cachedGrade.data,
          cached: true,
        });
      }

      const systemInstruction = `أنت مصحح ومعلم أكاديمي متخصص في تقييم الإجابات المقالية بدقة وعدالة.
قيم إجابة الطالب من 0 إلى 100 مقارنة بالإجابة النموذجية مع مراعاة المعنى الدلالي وليس التطابق الحرفي.
تعتبر الإجابة صحيحة (isCorrect: true) إذا كانت الدرجة 50 أو أكثر.`;

      const promptText = `السؤال: ${question}\nالإجابة النموذجية: ${modelAnswer}\nإجابة الطالب: ${studentAnswer}\n\nقيم الإجابة وأعد JSON:
{
  "score": عدد صحيح من 0 لـ 100,
  "isCorrect": true أو false,
  "statusText": "وصف موجز للحالة",
  "feedback": "ملاحظات للطالب",
  "keyPointsMatched": ["نقطة صحيحة"],
  "missingPoints": ["نقطة مفقودة"]
}`;

      let result: any = null;

      if (process.env.GROQ_API_KEY) {
        try {
          const groqGrade = await callGroqChat([
            { role: "system", content: systemInstruction },
            { role: "user", content: promptText },
          ]);
          if (groqGrade) {
            let clean = groqGrade.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
            result = JSON.parse(clean);
          }
        } catch (e) {
          console.warn("[Groq Grade Warn]:", e);
        }
      }

      if (!result || typeof result.score !== "number") {
        const gradeConfig = {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              isCorrect: { type: Type.BOOLEAN },
              statusText: { type: Type.STRING },
              feedback: { type: Type.STRING },
              keyPointsMatched: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["score", "isCorrect", "statusText", "feedback"],
          },
        };

        const { response: geminiResponse } = await generateWithGeminiCascade(promptText, gradeConfig);
        let text = (geminiResponse.text || "{}").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
        result = JSON.parse(text);
      }

      const score = typeof result.score === "number" ? Math.max(0, Math.min(100, Math.round(result.score))) : 0;
      const isCorrect = typeof result.isCorrect === "boolean" ? result.isCorrect : score >= 50;

      const finalResponse = {
        success: true,
        score,
        isCorrect,
        rating: isCorrect ? "WRITTEN_CORRECT" : "WRITTEN_WRONG",
        statusText: result.statusText || (isCorrect ? "إجابة مقبولة" : "إجابة غير مكتملة"),
        feedback: result.feedback || "",
        keyPointsMatched: Array.isArray(result.keyPointsMatched) ? result.keyPointsMatched : [],
        missingPoints: Array.isArray(result.missingPoints) ? result.missingPoints : [],
      };

      gradeCache.set(gradeCacheKey, { data: finalResponse, timestamp: Date.now() });
      return res.status(200).json(finalResponse);
    } catch (error: any) {
      console.error("Vercel AI written grading error:", error);
      return res.status(500).json({
        error: "فشل تقييم الإجابة بواسطة الذكاء الاصطناعي.",
        details: error?.message || String(error),
      });
    }
  }

  return res.status(404).json({ error: "Endpoint not found", url });
}

````


---

## `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global default deny
    match /{document=**} {
      allow read, write: if false;
    }

    // Core security helpers
    function isValidId(id) {
      return id is string && id.size() > 0 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    function incoming() {
      return request.resource.data;
    }

    function existing() {
      return resource.data;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isVerifiedUser() {
      return isSignedIn() && request.auth.token.email_verified == true;
    }

    function isOwner(userId) {
      return isVerifiedUser() && request.auth.uid == userId;
    }

    // ───────── صلاحيات المعلمين ─────────
    // المعلم = حساب Google موثّق بريده له وثيقة في teachers/{email} (بحروف صغيرة).
    // المدير = معلم دوره admin. الوثائق تُنشأ من لوحة المدير، والمدير الأول من Firebase Console.
    function userEmail() {
      return request.auth.token.email.lower();
    }

    function teacherPath() {
      return /databases/$(database)/documents/teachers/$(userEmail());
    }

    function isTeacher() {
      return isVerifiedUser() && exists(teacherPath());
    }

    function isAdmin() {
      return isTeacher() && get(teacherPath()).data.role == 'admin';
    }

    // المدير يعدّل أي محتوى؛ المعلم يعدّل ما أنشأه هو فقط ولا يغيّر المالك
    function canManageContent() {
      return isAdmin()
        || (isTeacher()
            && resource.data.get('createdBy', '') == userEmail()
            && request.resource.data.get('createdBy', '') == userEmail());
    }

    function canDeleteContent() {
      return isAdmin() || (isTeacher() && resource.data.get('createdBy', '') == userEmail());
    }

    function isValidTeacherDoc(data, email) {
      return data.keys().hasAll(['email', 'displayName', 'role', 'createdAt'])
        && data.keys().hasOnly(['email', 'displayName', 'role', 'createdAt', 'createdBy'])
        && data.email == email && email == email.lower() && email.size() <= 254
        && data.displayName is string && data.displayName.size() <= 150
        && data.role in ['teacher', 'admin']
        && data.createdAt is string && data.createdAt.size() <= 100;
    }

    // Validators for private student entities
    function isValidStudentProfile(data, userId) {
      return data.keys().hasAll(['uid', 'displayName', 'email', 'updatedAt'])
        && data.keys().hasOnly(['uid', 'displayName', 'email', 'photoURL', 'updatedAt'])
        && data.uid is string && data.uid == userId && data.uid.size() <= 128
        && data.displayName is string && data.displayName.size() <= 150
        && data.email is string && data.email.size() <= 200
        && data.updatedAt is string && data.updatedAt.size() <= 100
        && (!('photoURL' in data) || (data.photoURL is string && data.photoURL.size() <= 1000));
    }

    function isValidStudentAttempt(data, userId) {
      return data.keys().hasAll(['id', 'userId', 'quizId', 'quizTitle', 'score', 'totalQuestions', 'percentage', 'timeSpentSeconds', 'completedAt', 'questions'])
        && data.keys().hasOnly([
          'id', 'userId', 'quizId', 'quizTitle', 'subjectId', 'subjectName', 'topicId',
          'isPrivateQuiz', 'score', 'totalQuestions', 'percentage', 'timeSpentSeconds',
          'completedAt', 'questions', 'userAnswers', 'writtenInputData', 'writtenGradingData'
        ])
        && data.id is string && isValidId(data.id)
        && data.userId is string && data.userId == userId
        && data.quizId is string && data.quizId.size() <= 128
        && data.quizTitle is string && data.quizTitle.size() <= 300
        && (!('subjectId' in data) || (data.subjectId is string && data.subjectId.size() <= 128))
        && (!('subjectName' in data) || (data.subjectName is string && data.subjectName.size() <= 200))
        && (!('topicId' in data) || (data.topicId is string && data.topicId.size() <= 128))
        && (!('isPrivateQuiz' in data) || data.isPrivateQuiz is bool)
        && data.score is number && data.score >= 0 && data.score <= 500
        && data.totalQuestions is number && data.totalQuestions >= 0 && data.totalQuestions <= 500
        && data.percentage is number && data.percentage >= 0 && data.percentage <= 100
        && data.timeSpentSeconds is number && data.timeSpentSeconds >= 0 && data.timeSpentSeconds <= 86400
        && data.completedAt is string && data.completedAt.size() <= 100
        && data.questions is list && data.questions.size() <= 200
        && (!('userAnswers' in data) || data.userAnswers is map)
        && (!('writtenInputData' in data) || data.writtenInputData is map)
        && (!('writtenGradingData' in data) || data.writtenGradingData is map);
    }

    function isValidStudentMistake(data, userId) {
      return data.keys().hasAll(['id', 'userId', 'quizId', 'quizTitle', 'question', 'wrongCount', 'lastMissedAt'])
        && data.keys().hasOnly([
          'id', 'userId', 'quizId', 'quizTitle', 'subjectId', 'subjectName',
          'question', 'lastWrongAnswer', 'wrongCount', 'lastMissedAt'
        ])
        && data.id is string && isValidId(data.id)
        && data.userId is string && data.userId == userId
        && data.quizId is string && data.quizId.size() <= 128
        && data.quizTitle is string && data.quizTitle.size() <= 300
        && (!('subjectId' in data) || (data.subjectId is string && data.subjectId.size() <= 128))
        && (!('subjectName' in data) || (data.subjectName is string && data.subjectName.size() <= 200))
        && data.question is map
        && (!('lastWrongAnswer' in data) || (data.lastWrongAnswer is string && data.lastWrongAnswer.size() <= 2000))
        && data.wrongCount is number && data.wrongCount >= 1 && data.wrongCount <= 10000
        && data.lastMissedAt is string && data.lastMissedAt.size() <= 100;
    }

    function isValidStudentBookmark(data, userId) {
      return data.keys().hasAll(['id', 'userId', 'quizId', 'quizTitle', 'question', 'savedAt'])
        && data.keys().hasOnly([
          'id', 'userId', 'quizId', 'quizTitle', 'subjectId', 'subjectName', 'question', 'savedAt'
        ])
        && data.id is string && isValidId(data.id)
        && data.userId is string && data.userId == userId
        && data.quizId is string && data.quizId.size() <= 128
        && data.quizTitle is string && data.quizTitle.size() <= 300
        && (!('subjectId' in data) || (data.subjectId is string && data.subjectId.size() <= 128))
        && (!('subjectName' in data) || (data.subjectName is string && data.subjectName.size() <= 200))
        && data.question is map
        && data.savedAt is string && data.savedAt.size() <= 100;
    }

    function isValidPrivateQuiz(data, userId) {
      return data.keys().hasAll(['id', 'userId', 'title', 'subjectName', 'questions', 'createdAt', 'updatedAt', 'isPrivate'])
        && data.keys().hasOnly([
          'id', 'userId', 'title', 'subjectName', 'description',
          'timeLimitMinutes', 'questions', 'createdAt', 'updatedAt', 'isPrivate'
        ])
        && data.id is string && isValidId(data.id)
        && data.userId is string && data.userId == userId
        && data.title is string && data.title.size() > 0 && data.title.size() <= 250
        && data.subjectName is string && data.subjectName.size() <= 200
        && (!('description' in data) || (data.description is string && data.description.size() <= 2000))
        && (!('timeLimitMinutes' in data) || (data.timeLimitMinutes is number && data.timeLimitMinutes >= 0 && data.timeLimitMinutes <= 600))
        && data.questions is list && data.questions.size() > 0 && data.questions.size() <= 200
        && data.createdAt is string && data.createdAt.size() <= 100
        && data.updatedAt is string && data.updatedAt.size() <= 100
        && data.isPrivate is bool && data.isPrivate == true;
    }

    function isValidQuizStat(data, quizId) {
      return data.keys().hasAll(['quizId', 'attemptsCount', 'totalPercentageSum', 'lastAttemptAt'])
        && data.keys().hasOnly(['quizId', 'attemptsCount', 'totalPercentageSum', 'lastAttemptAt'])
        && data.quizId is string && data.quizId == quizId && data.quizId.size() <= 128
        && data.attemptsCount is number && data.attemptsCount >= 0 && data.attemptsCount <= 10000000
        && data.totalPercentageSum is number && data.totalPercentageSum >= 0 && data.totalPercentageSum <= 1000000000
        && data.lastAttemptAt is string && data.lastAttemptAt.size() <= 100;
    }

    // Public academic content (Subjects, Topics, Quizzes)
    match /subjects/{subjectId} {
      allow read: if true;
      allow create: if isTeacher() && isValidId(subjectId);
      allow update: if isValidId(subjectId) && canManageContent();
      allow delete: if isValidId(subjectId) && canDeleteContent();
    }

    match /topics/{topicId} {
      allow read: if true;
      allow create: if isTeacher() && isValidId(topicId);
      allow update: if isValidId(topicId) && canManageContent();
      allow delete: if isValidId(topicId) && canDeleteContent();
    }

    match /quizzes/{quizId} {
      // الاختبار المنشور مقروء للجميع، والمسودة مقروءة للمعلمين فقط
      allow read: if resource.data.isPublished == true || isTeacher();
      allow create: if isTeacher() && isValidId(quizId);
      allow update: if isValidId(quizId) && canManageContent();
      allow delete: if isValidId(quizId) && canDeleteContent();
    }

    // حسابات المعلمين: كل معلم يقرأ وثيقته فقط، والمدير يدير الكل (ولا يحذف نفسه)
    match /teachers/{email} {
      allow get: if isVerifiedUser() && userEmail() == email;
      allow get, list: if isAdmin();
      allow create, update: if isAdmin() && isValidTeacherDoc(incoming(), email);
      allow delete: if isAdmin() && userEmail() != email;
    }

    // Aggregated anonymous quiz statistics (no PII)
    // كل كتابة تضيف محاولة واحدة بالضبط، ونسبة بين 0 و100. هذا يمنع تضخيم الأرقام بقيم عشوائية.
    // (التحديد الكامل لمعدل الطلبات يحتاج السيرفر، انظر SECURITY.md)
    match /quizStats/{quizId} {
      allow read: if true;
      allow create: if isValidId(quizId)
        && isValidQuizStat(incoming(), quizId)
        && incoming().attemptsCount == 1
        && incoming().totalPercentageSum <= 100;
      allow update: if isValidId(quizId)
        && isValidQuizStat(incoming(), quizId)
        && incoming().quizId == existing().quizId
        && incoming().attemptsCount == existing().attemptsCount + 1
        && incoming().totalPercentageSum >= existing().totalPercentageSum
        && incoming().totalPercentageSum - existing().totalPercentageSum <= 100;
    }

    // Strictly isolated private student data
    match /users/{userId} {
      allow get: if isOwner(userId);
      allow list: if false;
      allow create: if isOwner(userId) && isValidId(userId) && isValidStudentProfile(incoming(), userId);
      allow update: if isOwner(userId) && isValidId(userId) && isValidStudentProfile(incoming(), userId) && incoming().uid == existing().uid;
      allow delete: if false;

      match /attempts/{attemptId} {
        allow get, list: if isOwner(userId);
        allow create: if isOwner(userId) && isValidId(attemptId) && isValidStudentAttempt(incoming(), userId);
        allow update: if false;
        allow delete: if isOwner(userId) && isValidId(attemptId);
      }

      match /mistakes/{mistakeId} {
        allow get, list: if isOwner(userId);
        allow create: if isOwner(userId) && isValidId(mistakeId) && isValidStudentMistake(incoming(), userId);
        allow update: if isOwner(userId) && isValidId(mistakeId) && isValidStudentMistake(incoming(), userId)
          && incoming().userId == existing().userId
          && incoming().id == existing().id
          && incoming().quizId == existing().quizId
          && incoming().diff(existing()).affectedKeys().hasOnly(['lastWrongAnswer', 'wrongCount', 'lastMissedAt', 'question', 'quizTitle', 'subjectName']);
        allow delete: if isOwner(userId) && isValidId(mistakeId);
      }

      match /bookmarks/{bookmarkId} {
        allow get, list: if isOwner(userId);
        allow create: if isOwner(userId) && isValidId(bookmarkId) && isValidStudentBookmark(incoming(), userId);
        allow update: if false;
        allow delete: if isOwner(userId) && isValidId(bookmarkId);
      }

      match /privateQuizzes/{quizId} {
        allow get, list: if isOwner(userId);
        allow create: if isOwner(userId) && isValidId(quizId) && isValidPrivateQuiz(incoming(), userId);
        allow update: if isOwner(userId) && isValidId(quizId) && isValidPrivateQuiz(incoming(), userId)
          && incoming().userId == existing().userId
          && incoming().id == existing().id
          && incoming().createdAt == existing().createdAt
          && incoming().isPrivate == existing().isPrivate
          && incoming().diff(existing()).affectedKeys().hasOnly(['title', 'subjectName', 'description', 'timeLimitMinutes', 'questions', 'updatedAt']);
        allow delete: if isOwner(userId) && isValidId(quizId);
      }
    }

    // Connection testing (global deny is safe; client checks reachability)
    match /test/{docId} {
      allow read, write: if false;
    }
  }
}

```


---

## `server.ts`

````ts
import express from "express";
import { resolveCaller, sendIfAuthError, applyCors } from "./server/security";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable CORS and preflight handling for seamless Vercel & custom domain support
app.use((req, res, next) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Helper to get GoogleGenAI client with key fallback and quotes sanitization
function getGenAIClient() {
  const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const apiKey = rawKey.replace(/['"]+/g, "").trim();
  if (!apiKey) {
    throw new Error("مفتاح GEMINI_API_KEY غير موجود في متغيرات البيئة على Vercel. يرجى التأكد من إضافته في Vercel -> Settings -> Environment Variables ثم عمل Redeploy.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// ==========================================
// In-Memory High-Speed Cache & Deduplication
// ==========================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const quizCache = new Map<string, CacheEntry<any>>();
const gradeCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 500;

function getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

// ==========================================
// In-Memory IP Rate Limiter & Abuse Shield
// ==========================================
interface RateLimitTracker {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitTracker>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const tracker = rateLimitMap.get(key);
  if (!tracker || now > tracker.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (tracker.count >= maxRequests) {
    return false;
  }
  tracker.count++;
  return true;
}

// ==========================================
// Per-Student Daily AI Generation Quota (5 requests / UTC day)
// ==========================================
const STUDENT_DAILY_AI_LIMIT = 5;
const studentDailyQuotaMap = new Map<string, { count: number; dateKey: string }>();

function getUtcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStudentQuotaInfo(studentKey: string) {
  const dateKey = getUtcDateKey();
  const entry = studentDailyQuotaMap.get(studentKey);
  const used = entry && entry.dateKey === dateKey ? entry.count : 0;
  return {
    used,
    limit: STUDENT_DAILY_AI_LIMIT,
    remaining: Math.max(0, STUDENT_DAILY_AI_LIMIT - used),
    dateKey,
  };
}

function consumeStudentQuota(studentKey: string) {
  const dateKey = getUtcDateKey();
  const entry = studentDailyQuotaMap.get(studentKey);
  const currentUsed = entry && entry.dateKey === dateKey ? entry.count : 0;
  const nextUsed = currentUsed + 1;
  studentDailyQuotaMap.set(studentKey, { count: nextUsed, dateKey });
  return {
    used: nextUsed,
    limit: STUDENT_DAILY_AI_LIMIT,
    remaining: Math.max(0, STUDENT_DAILY_AI_LIMIT - nextUsed),
    dateKey,
  };
}

// Background memory management & cache sweep (Every 15 minutes, non-serverless only)
if (!process.env.VERCEL) {
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, tracker] of rateLimitMap.entries()) {
      if (now > tracker.resetTime) rateLimitMap.delete(key);
    }
    for (const [key, entry] of quizCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS) quizCache.delete(key);
    }
    for (const [key, entry] of gradeCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS) gradeCache.delete(key);
    }
  }, 15 * 60 * 1000);
  sweepInterval.unref();
}

function normalizeArabicText(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // Remove tashkeel/harakat
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\w\s\u0600-\u06FF]/gi, " ")
    .replace(/\s+/g, " ");
}

function computeSimilarityRatio(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const words1 = s1.split(" ").filter((w) => w.length > 1);
  const words2 = new Set(s2.split(" ").filter((w) => w.length > 1));
  if (words1.length === 0 || words2.size === 0) return 0;
  let matches = 0;
  for (const w of words1) {
    if (words2.has(w)) matches++;
  }
  return matches / Math.max(words1.length, words2.size);
}

function resolveLanguage(content: string, requestedLang: string): "ar" | "en" {
  if (requestedLang === "en") return "en";
  if (requestedLang === "ar") return "ar";
  // Intelligent auto-detection based on character counts
  if (!content || !content.trim()) return "ar";
  const arabicMatches = (content.match(/[\u0600-\u06FF]/g) || []).length;
  const latinMatches = (content.match(/[a-zA-Z]/g) || []).length;
  if (latinMatches > arabicMatches) {
    return "en";
  }
  return "ar";
}

function sanitizeQuestionText(text: string, isEnglish: boolean): string {
  if (!text) return "";
  let clean = text.trim();

  // Strip unwanted Arabic meta references
  const arabicBadPrefixes = [
    /^(?:وفقاً|استناداً|بناءً\s*على|طبقاً|بحسب)\s*(?:لما\s*ورد\s*في\s*)?(?:الملاحظات|المذكرة|النص|المستند|الملف|الصفحات|الشريحة|الفقرة)(?:\s*(?:الموضحة|المرفقة|المذكورة|السابقة|أعلاه|المدرجة))?[:،,\s-]*/gi,
    /^(?:في|من)\s*(?:الملاحظات|الملاحظة|المذكرة|النص|المستند|الصفحة\s*(?:الأولى|\d+)?|الصفحات\s*المدرجة|الفقرة\s*السابقة|الشريحة\s*السابقة)(?:\s*(?:الموضحة|المرفقة|المذكورة|السابقة|أعلاه|المدرجة))?[:،,\s-]*/gi,
    /^(?:كما\s*(?:هو\s*)?(?:موضح|مذكور|ورد|جاء)\s*في\s*(?:الملاحظات|النص|المذكرة|المستند|الصفحة\s*(?:الأولى|\d+)?))[:،,\s-]*/gi,
  ];

  for (const rx of arabicBadPrefixes) {
    clean = clean.replace(rx, "");
  }

  // Strip unwanted English meta references
  const englishBadPrefixes = [
    /^(?:according\s*to|based\s*on)\s*(?:the\s*)?(?:notes|text|passage|document|slides?|author|pages?|lecture)(?:\s*(?:above|mentioned|provided|attached))?[:,\s-]*/gi,
    /^(?:in|from)\s*(?:the\s*)?(?:notes|text|passage|document|page\s*\d+|pages?|slides?)(?:\s*(?:above|mentioned|provided|attached))?[:,\s-]*/gi,
    /^(?:as\s*(?:mentioned|stated|shown|described)\s*in\s*(?:the\s*)?(?:notes|text|passage|document|page\s*\d+))[:,\s-]*/gi,
  ];

  for (const rx of englishBadPrefixes) {
    clean = clean.replace(rx, "");
  }

  if (isEnglish && clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return clean.trim();
}

// ==========================================
// Groq Free High-Speed Engine (Dynamic Active Production Models)
// ==========================================
const GROQ_PREFERRED_MODELS = [
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
];
let cachedGroqModels: { models: string[]; fetchedAt: number } | null = null;

async function resolveGroqModels(groqKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedGroqModels && now - cachedGroqModels.fetchedAt < 60 * 60 * 1000 && cachedGroqModels.models.length > 0) {
    return cachedGroqModels.models;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${groqKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const availableIds: string[] = Array.isArray(data?.data)
        ? data.data
            .map((m: any) => String(m?.id || ""))
            .filter(
              (id: string) =>
                id &&
                !/whisper|guard|tts|playai|allam|orpheus|safeguard|embed/i.test(id)
            )
        : [];

      if (availableIds.length > 0) {
        const ordered = GROQ_PREFERRED_MODELS.filter((id) => availableIds.includes(id));
        const extras = availableIds.filter((id) => !ordered.includes(id));
        const finalModels = [...ordered, ...extras].slice(0, 3);
        cachedGroqModels = { models: finalModels, fetchedAt: now };
        return finalModels;
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  return ["openai/gpt-oss-120b", "llama-3.1-8b-instant"];
}

async function callGroqChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature = 0.2
): Promise<string | null> {
  const rawGroq = process.env.GROQ_API_KEY;
  const groqKey = rawGroq ? rawGroq.replace(/['"]+/g, "").trim() : "";
  if (!groqKey) return null;

  const models = await resolveGroqModels(groqKey);

  for (const model of models) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.warn(`[Groq Warning] Model ${model} status ${response.status}: ${errText.slice(0, 150)}`);
        if (response.status === 404 || response.status === 400) {
          cachedGroqModels = null;
          continue;
        }
        return null;
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[Groq Warning] Model ${model} request failed, switching to Gemini fallback:`, err);
      return null;
    }
  }
  return null;
}

// ==========================================
// Multi-Model Gemini Free Cascade
// ==========================================
async function generateWithGeminiCascade(contents: any, config: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("مفتاح GEMINI_API_KEY غير موجود في متغيرات البيئة. يرجى إضافته في إعدادات Vercel ثم إعادة النشر.");
  }

  const ai = getGenAIClient();

  // Cascading priority list of active free-tier Gemini models
  const models = [
    "gemini-4-hydrogen",
    "gemini-3.1-flash-lite",
  ];
  let lastError: any = null;

  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      return { response: res, modelUsed: model };
    } catch (err: any) {
      console.warn(`[Gemini Cascade] Model ${model} encountered issue, switching to next model:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini cascade models failed to respond.");
}

// Health check endpoint
app.get(["/api/health", "/health"], (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  res.json({
    status: "ok",
    hasGeminiKey,
    hasGroqKey: Boolean(process.env.GROQ_API_KEY),
    providers: {
      multimodalVision: "Gemini Vision (Multimodal)",
      textEngine: process.env.GROQ_API_KEY ? "Groq Active Production Models with Gemini Fallback" : "Gemini 4 Hydrogen Cascade",
      cacheStatus: `Quizzes: ${quizCache.size}, Grading: ${gradeCache.size}`,
    },
    time: new Date().toISOString(),
  });
});

// Track 1: Generate Quiz from Teacher Content (Text and/or Images) with Strict Grounding
const handleGenerateQuiz: express.RequestHandler = async (req, res) => {
  req.setTimeout(180000);
  res.setTimeout(180000);

  try {
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`gen_${clientIp}`, 15, 60000)) {
      return res.status(429).json({
        error: "تجاوزت الحد المسموح من طلبات التوليد السريعة. يرجى الانتظار دقيقة والمحاولة مجدداً.",
      });
    }

    const {
      content,
      images = [],
      mode = "generate",
      count = 5,
      mcqCount: reqMcqCount,
      writtenCount: reqWrittenCount,
      questionType = "mixed", // 'mcq' | 'written' | 'mixed'
      difficulty = "medium",  // 'easy' | 'medium' | 'hard' | 'mixed'
      language = "auto",      // 'ar' | 'en' | 'auto'
      lectureTitle,
    } = req.body;

    // الدور يُحدد من توكن Firebase على السيرفر، لا من حقل في الطلب
    let caller;
    try {
      caller = await resolveCaller(req);
    } catch (err) {
      if (sendIfAuthError(res, err)) return;
      throw err;
    }
    const isStudentRequest = caller.role !== "teacher";
    const studentQuotaKey = caller.quotaKey;

    if (isStudentRequest) {
      const currentQuota = getStudentQuotaInfo(studentQuotaKey);
      if (currentQuota.remaining <= 0) {
        return res.status(429).json({
          error: "استنفدت حدك اليومي المجاني لإنشاء الاختبارات بالذكاء الاصطناعي (5 اختبارات يومياً).",
          details: "يتجدد رصيدك تلقائياً كل يوم، ويمكنك الاستمرار في المراجعة والتدريب على اختباراتك المحفوظة وبنك الأخطاء.",
          quota: currentQuota,
        });
      }
    }

    const quizMode: "generate" | "format_existing" = mode === "format_existing" ? "format_existing" : "generate";

    if ((!content || !content.trim()) && (!images || images.length === 0)) {
      return res.status(400).json({
        error: "Content or at least one image is required for quiz generation.",
      });
    }

    if (content && typeof content === "string" && content.length > 250000) {
      return res.status(400).json({
        error: "حجم النص المصدري كبير جداً (الحد الأقصى 250,000 حرف).",
      });
    }

    const safeImages = Array.isArray(images) ? images.slice(0, 30) : [];

    // Determine counts for MCQ and Written (used only in 'generate' mode)
    let mcqTarget: number | null = null;
    let writtenTarget: number | null = null;
    if (typeof reqMcqCount === "number" || typeof reqWrittenCount === "number") {
      mcqTarget = Math.max(0, Math.min(100, Number(reqMcqCount) || 0));
      writtenTarget = Math.max(0, Math.min(100, Number(reqWrittenCount) || 0));
      if (mcqTarget === 0 && writtenTarget === 0) {
        mcqTarget = 5;
      }
    }

    const questionCount =
      mcqTarget !== null && writtenTarget !== null
        ? mcqTarget + writtenTarget
        : Math.max(1, Math.min(100, Number(count) || 5));

    const hasImages = safeImages.length > 0;

    // Check high-speed Cache for text-only queries
    let cacheKey = "";
    if (!hasImages && content) {
      const hashContent = crypto
        .createHash("sha256")
        .update(
          `${quizMode}_${normalizeArabicText(content)}_${mcqTarget}_${writtenTarget}_${questionCount}_${questionType}_${difficulty}_${language}_${lectureTitle || ""}`
        )
        .digest("hex");
      cacheKey = `quiz_${hashContent}`;
      const cachedResult = getFromCache(quizCache, cacheKey);
      if (cachedResult) {
        console.log(`[Cache Hit] Serving generated quiz from memory cache in 0ms`);
        return res.json({
          ...cachedResult,
          cached: true,
          ...(isStudentRequest ? { quota: getStudentQuotaInfo(studentQuotaKey) } : {}),
        });
      }
    }

    const targetLang = resolveLanguage(content || "", language);
    const isEn = targetLang === "en";

    let systemInstruction = "";
    let questionCountDirective = "";

    if (quizMode === "format_existing") {
      const formatLangRuleEn =
        language === "auto"
          ? "LANGUAGE RULE: Keep EVERY question, option, and answer in its EXACT original language as written in the source text/images. Do NOT translate."
          : language === "en"
          ? "LANGUAGE RULE: Output titles, descriptions, questions, options, and answers in English."
          : "LANGUAGE RULE: Output titles, descriptions, questions, options, and answers in Arabic.";

      const formatLangRuleAr =
        language === "auto"
          ? "قاعدة اللغة: حافظ على لغة كل سؤال وخياراته وإجابته كما وردت في النص أو الصور تماماً دون ترجمة."
          : language === "en"
          ? "قاعدة اللغة: أخرج العناوين والأسئلة والخيارات والإجابات باللغة الإنجليزية."
          : "قاعدة اللغة: أخرج العناوين والأسئلة والخيارات والإجابات باللغة العربية.";

      systemInstruction = isEn
        ? `You are a precision academic exam digitizer and proofreader.
PRIMARY TASK: Extract and format EVERY SINGLE ready-made question found in the teacher's input text and/or uploaded images.

STRICT PRESERVATION & PROOFREADING RULES:
1. DO NOT CHANGE QUESTIONS:
   - Keep every question's exact wording, meaning, numbers, formulas, order, and answer choices intact.
   - NEVER rephrase, paraphrase, invent new questions, or skip any question present in the input.
   - ONLY fix clear spelling, punctuation, or grammatical typos, and strip leading numbering/option prefixes (like "1.", "Q1:", "A.", "B)") from question text and option strings so they display cleanly.
   - Classify each question accurately: "mcq" if multiple choices are present (preserve exact options array), or "written" if open-ended/short-answer (options: []).

2. ANSWER KEY PRIORITY & AI FALLBACK:
   - Priority 1 (Provided Answer): If the input text or image marks, highlights, circles, underlines, or states the correct answer or answer key for a question, you MUST use that exact provided answer verbatim as "correctAnswer" and set "isAiSuggestedAnswer": false.
   - Priority 2 (Missing Answer): ONLY if no answer is provided or indicated anywhere in the source for that question, determine the closest, most accurate academic answer for "correctAnswer" and you MUST set "isAiSuggestedAnswer": true so the teacher is alerted to review it.

3. DIAGRAMMATIC QUESTIONS & PERFORMANCE:
   - Set "requiresImage": true if the question references a figure, diagram, graph, or image; otherwise false.
   - Do NOT generate explanations.
   - ${formatLangRuleEn}`
        : `أنت مدقق لغوي ومُنسّق اختبارات إلكترونية عالي الدقة.
المهمة الأساسية: استخراج وتنسيق جميع الأسئلة الجاهزة الموجودة في النص المرفق و/أو الصور المرفوعة كاملةً دون نقصان.

القواعد الصارمة للحفاظ على الأسئلة كما هي:
1. ممنوع تغيير الأسئلة أو إعادة صياغتها:
   - التزم بنص كل سؤال ومعناه وأرقامه ومعادلاته وخياراته كما وردت من المعلم تماماً.
   - يُمنع منعاً باتاً اختراع أسئلة إضافية غير موجودة، أو حذف أسئلة، أو تغيير فكرة السؤال أو استبدال خياراته.
   - دورك يقتصر فقط على إعادة التنسيق وتصحيح الأخطاء الإملائية والنحوية الواضحة (وإزالة ترقيم السؤال أو حروف الخيارات مثل "1." أو "A." أو "أ-" من نص الخيار نفسه ليظهر نظيفاً).
   - صنّف كل سؤال بدقة: "mcq" إذا كان له خيارات (مع الحفاظ على الخيارات كما هي في options)، أو "written" إذا كان مقالياً (options: []).

2. أولوية الإجابة الصحيحة وتمييز إجابات الذكاء الاصطناعي:
   - الأولوية القصوى (إجابة مرفقة): إذا كانت الإجابة الصحيحة أو النموذجية مذكورة في النص أو مؤشراً عليها في الصورة (بتظليل، دائرة، خط، علامة صح، أو مفتاح إجابة)، التزم بها حرفياً في "correctAnswer" وضع حتماً "isAiSuggestedAnswer": false.
   - الحالة الثانية (سؤال بدون إجابة مرفقة): فقط إذا لم تتوفر أي إجابة لهذا السؤال في النص أو الصورة، اختر الإجابة العلمية الأقرب والأدق في "correctAnswer" وضع حتماً "isAiSuggestedAnswer": true لينتبه المعلم ويراجعها.

3. الصور والأشكال وسرعة التنفيذ:
   - ضع "requiresImage": true إذا كان السؤال يعتمد على شكل أو رسم أو صورة، وإلا false.
   - لا تولّد أي شرح أو تفسير للإجابات نهائياً.
   - ${formatLangRuleAr}`;
    } else {
      questionCountDirective = isEn
        ? (mcqTarget !== null && writtenTarget !== null
            ? `PRIMARY TASK: Generate EXACTLY ${mcqTarget} multiple-choice question(s) (type: "mcq") and ${writtenTarget} short-answer/written question(s) (type: "written"), for a total of ${questionCount} question(s).`
            : `PRIMARY TASK: Generate ${questionCount} collegiate examination questions based strictly on the provided material (${questionType === 'mcq' ? 'Multiple choice only' : questionType === 'written' ? 'Written / short answer only' : 'Balanced mix of MCQ and written questions'}).`)
        : (mcqTarget !== null && writtenTarget !== null
            ? `المهمة الأساسية: توليد بالضبط ${mcqTarget} سؤال اختيار من متعدد (type: "mcq") و ${writtenTarget} سؤال مقالي / تحريري (type: "written")، بإجمالي ${questionCount} سؤال.`
            : `المهمة: توليد ${questionCount} أسئلة اختبار جامعي استناداً بشكل حصري وحتمي إلى المحتوى المُقدَّم (${questionType === 'mcq' ? 'اختيار من متعدد فقط' : questionType === 'written' ? 'أسئلة مقالية فقط' : 'مزيج متوازن بين MCQ والأسئلة المقالية'}).`);

      systemInstruction = isEn
        ? `You are a distinguished university professor and veteran examination author with over 15 years of experience designing rigorous collegiate assessments and standardized testing.
${questionCountDirective}

EXAMINATION DESIGN STANDARDS (Bloom's Taxonomy):
1. SENIOR PROFESSOR PERSONA & INTELLECTUAL RIGOR:
   - Formulate thoughtful, authoritative questions that test conceptual understanding, critical analysis, mechanism synthesis, and application—never trivial superficial recall or verbatim phrasing.
   - For Multiple-Choice Questions (type: "mcq"): Provide 4 academically plausible, distinct options. Distractors must represent common, nuanced misconceptions of students, not obviously incorrect options.
   - For Written Questions (type: "written"): Provide a concise, gold-standard model answer (correctAnswer) establishing core grading criteria. Set options to [].
   - Always set "isAiSuggestedAnswer": false. Do NOT generate explanations.

2. 100% SELF-CONTAINED QUESTIONS (STRICT ZERO-META BAN):
   - Every question must be fully independent and self-contained, as if appearing on an official university final exam sheet.
   - STRICT PROHIBITION: NEVER use phrases referencing the presentation of the material:
     * FORBIDDEN: "According to the notes / text / document / author / passage / slides..."
     * FORBIDDEN: "As stated in the text / notes / above / below..."
     * FORBIDDEN: "In page 1 / on the first page / in the previous section..."
   - State the subject-matter question directly!
     * POOR: "According to the notes provided, what causes acute inflammation?"
     * EXCELLENT: "Which cellular mediator is primarily responsible for triggering the acute inflammatory vascular response?"

3. DIAGRAMMATIC QUESTIONS:
   - If a question requires examining an accompanying diagram, graph, or image, mark "requiresImage": true, and formulate the question with appropriate visual phrases ("In the accompanying figure, ...", "Based on the graph shown, what is the value of ...?").
   - If purely conceptual and requiring no visual aid, mark "requiresImage": false.

4. STRICT FACTUAL GROUNDING:
   - Ground all questions and correct answers solely in the provided source material. Do not extrapolate external facts.
   - Difficulty Level: ${difficulty}.
   - CRITICAL LANGUAGE RULE: ALL titles, descriptions, questions, options, and answers MUST BE GENERATED ENTIRELY IN ENGLISH.`
        : `أنت أستاذ جامعي ومحاضر أول خبير ومخضرم، تمتلك خبرة تفوق 15 عاماً في وضع وتصميم الامتحانات المعيارية والتقييمات الأكاديمية الرسمية.
${questionCountDirective}

المعايير المنهجية لصياغة الامتحانات الجامعية الرسمية (Bloom's Taxonomy):
1. جودة أكاديمية رفيعة واختبار حقيقي لقدرات الطالب:
   - تقمص شخصية أستاذ جامعي خبير؛ لا تصغ أسئلة سطحية أو مباشرة مأخوذة نسخاً ولصقاً كأن طالباً هو من صاغها، بل صغ أسئلة تقيس الاستيعاب العميق، التحليل، والربط المفاهيمي.
   - لأسئلة الاختيار من متعدد (type: "mcq"): وفر 4 خيارات علمية متوازنة ورصينة. يجب أن تمثل الخيارات غير الصحيحة (المشتتات) أخطاء شائعة دقيقة يقع فيها الطالب المتعجل، وليست خيارات بديهية أو مستبعدة بسهولة.
   - للأسئلة المقالية (type: "written"): وفر إجابة نموذجية معتمدة وموجزة ودقيقة (correctAnswer) تمثل المعيار الذهبي للتصحيح، واجعل options مصفوفة فارغة [].
   - ضع دائماً "isAiSuggestedAnswer": false. ولا تولّد أي شرح أو تفسير للإجابات نهائياً.

2. استقلالية تامة 100% لكل سؤال (قائم بذاته كلياً دون إشارة لأوراق أو مذكرات):
   - يجب أن يُصاغ كل سؤال كأنه مأخوذ من ورقة امتحان وزاري أو جامعي رسمي معتمد؛ مكتمل الأركان بذاته وواضح دون أي إشارة لوجود أوراق أو مذكرات خارجية.
   - حظر قطعي لا تنازل فيه: يُمنع منعاً باتاً ومطلقاً استخدام أي عبارات تشير إلى المستند أو الملاحظات أو موضع الفقرات، مثل:
     * (في الملاحظات الموضحة / في الملاحظات المرفقة / بحسب الملاحظات)
     * (في الصفحة الأولى / في صفحة 2 / في آخر الصفحة / في الصفحات المدرجة)
     * (وفقاً للنص المصدري / كما هو مذكور في النص / استناداً إلى ما ورد أعلاه / في المذكرة)
     * (في الفقرة السابقة / في الشريحة التالية)
   - بدلاً من ذلك، اطرح السؤال العلمي/الموضوعي مباشرة!
     مثال مرفوض: "في الملاحظات الموضحة في بداية النص، ما هي وظيفة الميتوكوندريا؟"
     مثال معتمد ومستقل: "ما هي الوظيفة الحيوية الأساسية للميتوكوندريا في الخلية الحيوانية؟"

3. صياغة الأسئلة المعتمدة على صور أو رسوم بيانية (requiresImage):
   - عند صياغة سؤال يعتمد حله على شكل توضيحي أو رسم بياني، ضع حتماً "requiresImage": true، واستخدم عبارات علمية مقترنة بالشكل مثل:
     "في الشكل المقابل، ..."، "بناءً على الرسم البياني المرفق، ..."، "يوضح المخطط المجاور ... ما قيمة ...؟".
   - إذا كان السؤال نظرياً/نصياً مستقلاً بذاته ولا يحتاج صورة، ضع "requiresImage": false.

4. قاعدة التأصيل الحصري الصارم (STRICT GROUNDING):
   - يجب أن تكون جميع الأسئلة والخيارات والإجابات مبنية كلياً على الحقائق والمعلومات الموجودة صراحة داخل المحتوى المُقدَّم.
   - مستوى الصعوبة المطلوب: ${difficulty}.
   - شرط لغوي صارم: يجب أن تكون كافة الأسئلة والخيارات والإجابات مكتوبة 100% باللغة العربية الفصحى الأكاديمية الرصينة.`;
    }

    let parsedData: any = null;

    // Track A: If text-only and Groq is configured, leverage Groq's sub-second engine
    if (!hasImages && process.env.GROQ_API_KEY) {
      try {
        const groqPrompt = quizMode === "format_existing"
          ? (isEn
              ? `Teacher's Ready-Made Questions:\n${lectureTitle ? `Quiz Title: ${lectureTitle}\n` : ""}\n"""\n${content}\n"""\n\nTASK: Extract and proofread EVERY question above into JSON matching this exact schema (preserve exact meaning/options, set isAiSuggestedAnswer=true ONLY if answer was missing in source, NO explanation field):
{
  "quizTitle": "${lectureTitle ? lectureTitle.trim() : "Formatted Quiz"}",
  "description": "Brief quiz summary",
  "questions": [
    {
      "question": "Proofread question text preserving original phrasing",
      "type": "mcq" or "written",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"] (or [] for written),
      "correctAnswer": "Exact correct answer text",
      "requiresImage": false,
      "isAiSuggestedAnswer": false
    }
  ]
}`
              : `الأسئلة الجاهزة المقدمة من المعلم:\n${lectureTitle ? `عنوان الاختبار: ${lectureTitle}\n` : ""}\n"""\n${content}\n"""\n\nالمطلوب: استخراج وتدقيق جميع الأسئلة المرفقة في كائن JSON بالشكل التالي مع الحفاظ التام على الأسئلة وخياراتها (ضع isAiSuggestedAnswer: true فقط إذا لم تُرفق الإجابة في المصدر، وبدون حقل تفسير):
{
  "quizTitle": "${lectureTitle ? lectureTitle.trim() : "اختبار منسق"}",
  "description": "وصف موجز للاختبار",
  "questions": [
    {
      "question": "نص السؤال بعد التصحيح الإملائي واللغوي الطفيف دون تغيير معناه",
      "type": "mcq" أو "written",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswer": "نص الإجابة الصحيحة",
      "requiresImage": false,
      "isAiSuggestedAnswer": false
    }
  ]
}`)
          : (isEn
              ? `Course Material:\n${lectureTitle ? `Exam Title: ${lectureTitle}\n` : ""}\n"""\n${content}\n"""\n\nTASK: Generate a standardized JSON object matching this exact schema (NO explanation field):
{
  "quizTitle": "${lectureTitle ? lectureTitle.trim() : "Comprehensive Examination"}",
  "description": "Brief exam description",
  "questions": [
    {
      "question": "Clear, self-contained examination question testing core concepts",
      "type": "mcq" or "written",
      "options": ["Option A", "Option B", "Option C", "Option D"] (or [] for written),
      "correctAnswer": "Exact correct answer text",
      "requiresImage": false,
      "isAiSuggestedAnswer": false
    }
  ]
}`
              : `المحتوى المرجعي:\n${lectureTitle ? `عنوان الاختبار: ${lectureTitle}\n` : ""}\n"""\n${content}\n"""\n\nالمطلوب: قم بتوليد كائن JSON بالشكل التالي (بدون حقل تفسير):
{
  "quizTitle": "${lectureTitle ? lectureTitle.trim() : "عنوان الاختبار"}",
  "description": "وصف موجز للاختبار",
  "questions": [
    {
      "question": "نص السؤال الواضح القائم بذاته دون إشارة للملاحظات",
      "type": "mcq" أو "written",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswer": "الإجابة الصحيحة",
      "requiresImage": false,
      "isAiSuggestedAnswer": false
    }
  ]
}`);
        const groqResult = await callGroqChat(
          [
            { role: "system", content: systemInstruction },
            { role: "user", content: groqPrompt },
          ],
          quizMode === "format_existing" ? 0.0 : 0.2
        );

        if (groqResult) {
          let cleanGroq = groqResult.trim();
          if (cleanGroq.startsWith("```json")) cleanGroq = cleanGroq.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
          else if (cleanGroq.startsWith("```")) cleanGroq = cleanGroq.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
          parsedData = JSON.parse(cleanGroq);
          if (lectureTitle && lectureTitle.trim()) {
            parsedData.quizTitle = lectureTitle.trim();
          }
        }
      } catch (groqErr) {
        console.warn("[Groq Error] Fallback to Gemini:", groqErr);
      }
    }

    // Helper for single Gemini multimodal/text call
    const runGeminiQuizCall = async (batchImages: any[], batchContent: string, batchDirective: string, previousQuestionsSummary = "") => {
      const parts: any[] = [];

      if (batchImages.length > 0) {
        for (const img of batchImages) {
          if (!img || !img.data) continue;
          let base64Data = img.data;
          let mimeType = img.mimeType || "image/jpeg";

          if (base64Data.startsWith("data:")) {
            const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
            }
          }

          parts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }
      }

      const promptText = isEn
        ? `${quizMode === "format_existing" ? "Teacher's Ready-Made Questions Input:" : "Reference Course Material:"}\n${lectureTitle ? `Exam Title: ${lectureTitle}\n` : ""}\n${batchContent ? `Source Text:\n"""\n${batchContent}\n"""` : "(Based on attached images)"}\n${previousQuestionsSummary ? `\n${previousQuestionsSummary}\n` : ""}\n\nTask: ${batchDirective}`
        : `${quizMode === "format_existing" ? "الأسئلة الجاهزة المقدمة من المعلم:" : "المحتوى المرجعي المقدم من المعلم:"}
${lectureTitle ? `عنوان الاختبار: ${lectureTitle}\n` : ""}
${batchContent ? `النص المصدري:\n"""\n${batchContent}\n"""` : "(مستند إلى الصور المرفقة)"}
${previousQuestionsSummary ? `\n${previousQuestionsSummary}\n` : ""}

المطلوب: ${batchDirective}`;

      parts.push({ text: promptText });

      const modelConfig = {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quizTitle: {
              type: Type.STRING,
              description: "Exam title derived from content",
            },
            description: {
              type: Type.STRING,
              description: "Brief summary of concepts tested",
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: {
                    type: Type.STRING,
                    description: quizMode === "format_existing"
                      ? "Original question preserved faithfully with spelling/grammar typos fixed"
                      : "Self-contained examination question",
                  },
                  type: {
                    type: Type.STRING,
                    description: "either 'mcq' or 'written'",
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "MCQ options array or empty [] for written",
                  },
                  correctAnswer: {
                    type: Type.STRING,
                    description: "Exact correct answer text (or closest answer if missing from source)",
                  },
                  requiresImage: {
                    type: Type.BOOLEAN,
                    description: "true if diagram is needed, else false",
                  },
                  isAiSuggestedAnswer: {
                    type: Type.BOOLEAN,
                    description: "true ONLY if answer was missing in source and inferred by AI; false if answer was provided or generated",
                  },
                },
                required: ["question", "type", "options", "correctAnswer", "requiresImage", "isAiSuggestedAnswer"],
              },
            },
          },
          required: ["quizTitle", "questions"],
        },
      };

      const { response: geminiResponse } = await generateWithGeminiCascade(
        { parts },
        modelConfig
      );

      let responseText = geminiResponse.text?.trim() || "{}";
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
      } else if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
      }

      try {
        return JSON.parse(responseText);
      } catch {
        const firstBrace = responseText.indexOf("{");
        const lastBrace = responseText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          return JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
        } else {
          throw new Error("تعذر تحليل هيكل الأسئلة المرتجعة من الذكاء الاصطناعي.");
        }
      }
    };

    // Track B: Gemini Multimodal Vision / Free Cascade (Supports Smart Batching for > 5 images)
    if (!parsedData || !Array.isArray(parsedData.questions)) {
      if (hasImages && safeImages.length > 5) {
        const BATCH_SIZE = 5;
        const totalBatches = Math.ceil(safeImages.length / BATCH_SIZE);
        console.log(`[Image Batching] Teacher uploaded ${safeImages.length} images (${quizMode}). Splitting into ${totalBatches} sequential batches.`);

        let remainingMcq = mcqTarget !== null ? mcqTarget : Math.round(questionCount * 0.7);
        let remainingWritten = writtenTarget !== null ? writtenTarget : questionCount - remainingMcq;
        let allAggregatedQuestions: any[] = [];
        let finalTitle = lectureTitle?.trim() || "";
        let finalDescription = "";

        for (let bIndex = 0; bIndex < totalBatches; bIndex++) {
          const batchSlice = safeImages.slice(bIndex * BATCH_SIZE, (bIndex + 1) * BATCH_SIZE);
          let prevSummary = "";
          if (bIndex > 0 && allAggregatedQuestions.length > 0) {
            prevSummary = isEn
              ? `Sequential batch context (${bIndex + 1} of ${totalBatches}):\n- Avoid repeating questions already extracted/generated in prior batches:\n${allAggregatedQuestions.slice(-15).map((q, idx) => `${idx + 1}. ${q.question}`).join("\n")}`
              : `سياق الترابط التتابعي (الدفعة رقم ${bIndex + 1} من إجمالي ${totalBatches} دفعات مرتبطة لنفس الاختبار):
- تم حتى الآن معالجة ${allAggregatedQuestions.length} سؤال في الدفعات السابقة.
- تجنب تكرار هذه الأسئلة الأخيرة:
${allAggregatedQuestions.slice(-15).map((q, idx) => `${idx + 1}. ${q.question}`).join("\n")}`;
          }

          let batchDirective = "";
          if (quizMode === "format_existing") {
            batchDirective = isEn
              ? `Extract and proofread ALL ready-made questions visible in this batch of ${batchSlice.length} image(s) verbatim (preserve exact questions and options; fix only spelling/grammar typos; mark isAiSuggestedAnswer=true ONLY when an answer is missing from the source).`
              : `استخرج ودقّق إملائياً ولغوياً جميع الأسئلة الجاهزة الموجودة في صور هذه الدفعة (${batchSlice.length} صور) كاملةً كما هي تماماً دون تغيير المعنى أو الخيارات، وضع isAiSuggestedAnswer=true فقط للأسئلة غير المرفق لها إجابة.`;
          } else {
            const batchesLeft = totalBatches - bIndex;
            const currentBatchMcq = Math.round(remainingMcq / batchesLeft);
            const currentBatchWritten = Math.round(remainingWritten / batchesLeft);
            remainingMcq -= currentBatchMcq;
            remainingWritten -= currentBatchWritten;
            const currentBatchTotal = currentBatchMcq + currentBatchWritten;

            batchDirective = isEn
              ? `Generate exactly ${currentBatchMcq} multiple-choice question(s) and ${currentBatchWritten} written question(s), for a total of ${currentBatchTotal} rigorous questions from this image batch.`
              : `قم بتوليد بالضبط ${currentBatchMcq} سؤال اختيار من متعدد (mcq) و ${currentBatchWritten} سؤال مقالي (written)، بإجمالي ${currentBatchTotal} سؤال بصياغة أكاديمية رصينة ومستقلة تماماً من صور هذه الدفعة.`;
          }

          const batchResult = await runGeminiQuizCall(
            batchSlice,
            bIndex === 0 ? content || "" : "",
            batchDirective,
            prevSummary
          );

          if (batchResult) {
            if (!finalTitle && batchResult.quizTitle) finalTitle = batchResult.quizTitle;
            if (!finalDescription && batchResult.description) finalDescription = batchResult.description;
            if (Array.isArray(batchResult.questions)) {
              allAggregatedQuestions.push(...batchResult.questions);
            }
          }
        }

        parsedData = {
          quizTitle: lectureTitle?.trim() || finalTitle || (isEn ? "Comprehensive Exam" : "اختبار شامل"),
          description: finalDescription || (isEn ? "Exam from multi-page material" : "اختبار من عدة دفعات مصورة"),
          questions: allAggregatedQuestions,
        };
      } else {
        const singleDirective = quizMode === "format_existing"
          ? (isEn
              ? `Extract and proofread ALL ready-made questions present in the provided text/images verbatim. Preserve exact question meaning, numbers, and options; fix only spelling/grammar typos; prioritize provided answers (isAiSuggestedAnswer=false) and only infer closest answer if missing (isAiSuggestedAnswer=true).`
              : `استخرج ونسّق جميع الأسئلة الجاهزة الموجودة في النص/الصور كما هي تماماً دون تغيير المعنى أو الخيارات مع تصحيح الأخطاء الإملائية واللغوية فقط، والالتزام بالإجابات المرفقة إن وجدت (isAiSuggestedAnswer=false) أو اختيار الأقرب إذا لم تتوفر (isAiSuggestedAnswer=true).`)
          : (isEn
              ? `Generate ${questionCountDirective} with rigorous, self-contained questions based strictly on the provided material.`
              : `قم بتوليد ${questionCountDirective} بصياغة أكاديمية رصينة ومستقلة تماماً استناداً للمحتوى المرفق.`);
        parsedData = await runGeminiQuizCall(safeImages, content || "", singleDirective);
        if (lectureTitle && lectureTitle.trim()) {
          parsedData.quizTitle = lectureTitle.trim();
        }
      }
    }

    // Heuristic regex to catch any question referencing diagrams/figures even if the model didn't set requiresImage
    const visualKeywordsRegex = /(في الشكل|في الرسم|في الصورة|المخطط المقابل|الشكل المجاور|الموضح بالصورة|الدائرة المقابلة|المنحنى المقابل|من الشكل|بناء على الرسم|طبقاً للرسم|in the figure|in the diagram|shown in the image|in the graph|as shown below|in the illustration|referring to the diagram)/i;

    // Ensure questions have IDs, conform to Question type, and normalize MCQ correctAnswer matching
    const formattedQuestions = (parsedData.questions || []).map((q: any, idx: number) => {
      const rawQuestionText = String(q.question || "").trim();
      const finalQuestion = quizMode === "format_existing"
        ? rawQuestionText
        : (sanitizeQuestionText(rawQuestionText, isEn) || rawQuestionText);
      const explicitFlag = Boolean(q.requiresImage);
      const matchedVisual = visualKeywordsRegex.test(finalQuestion);
      const needsImage = explicitFlag || matchedVisual;
      const options: string[] = Array.isArray(q.options) && q.options.length > 0
        ? q.options.map((o: any) => String(o || "").trim()).filter(Boolean)
        : [];
      const qType = q.type === "written" || options.length === 0 ? "written" : "mcq";

      let resolvedCorrectAnswer = String(q.correctAnswer || "").trim();
      if (qType === "mcq" && options.length > 0) {
        if (!options.includes(resolvedCorrectAnswer)) {
          // Match by case-insensitive trimmed text
          const trimmedMatch = options.find(
            (opt) => opt.toLowerCase() === resolvedCorrectAnswer.toLowerCase()
          );
          if (trimmedMatch) {
            resolvedCorrectAnswer = trimmedMatch;
          } else {
            // Match by letter like "A", "B.", "C)"
            const letterMatch = resolvedCorrectAnswer.match(/^([A-Da-d])[\.\)\-:\s]*$/);
            if (letterMatch) {
              const letterIdx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
              if (letterIdx >= 0 && letterIdx < options.length) {
                resolvedCorrectAnswer = options[letterIdx];
              }
            }
          }
        }
        if (!resolvedCorrectAnswer || !options.includes(resolvedCorrectAnswer)) {
          resolvedCorrectAnswer = options[0];
        }
      }

      return {
        id: `gen_q_${Date.now()}_${idx + 1}`,
        lecture: parsedData.quizTitle || lectureTitle || (isEn ? "Generated Exam" : "اختبار مولّد"),
        question: finalQuestion,
        type: qType,
        options: qType === "mcq" ? options : [],
        correctAnswer: resolvedCorrectAnswer,
        requiresImage: needsImage,
        isAiSuggestedAnswer: quizMode === "format_existing" ? Boolean(q.isAiSuggestedAnswer) : false,
        imageURL: null,
      };
    });

    const responsePayload = {
      success: true,
      quizTitle: parsedData.quizTitle || lectureTitle || (quizMode === "format_existing" ? "اختبار منسق" : "اختبار مولّد"),
      description: parsedData.description || "",
      questions: formattedQuestions,
    };

    if (cacheKey) {
      setInCache(quizCache, cacheKey, responsePayload);
    }

    const updatedQuota = isStudentRequest && formattedQuestions.length > 0
      ? consumeStudentQuota(studentQuotaKey)
      : undefined;

    return res.json({
      ...responsePayload,
      ...(updatedQuota ? { quota: updatedQuota } : {}),
    });
  } catch (error: any) {
    console.error("AI quiz generation error:", error);
    const msg = error?.message || String(error);
    const isQuotaError = error?.status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit|429/i.test(msg);
    return res.status(isQuotaError ? 429 : 500).json({
      error: "فشل توليد الأسئلة بواسطة الذكاء الاصطناعي.",
      details: isQuotaError
        ? "تم تجاوز الحد المؤقت لطلبات واجهة Gemini المجانية. يرجى الانتظار دقيقة واحدة ثم المحاولة مجدداً (أو التحقق من حصة مفتاح API)."
        : msg,
    });
  }
};

// Track 2: Real-time Written Answer Semantic Evaluation
const handleGradeWritten: express.RequestHandler = async (req, res) => {
  try {
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`grade_${clientIp}`, 60, 60000)) {
      return res.status(429).json({
        error: "تجاوزت الحد المسموح من طلبات التقييم المتتالية. يرجى الانتظار قليلاً.",
      });
    }

    const { question, modelAnswer, studentAnswer, language = "ar" } = req.body;

    if (!question || !modelAnswer || !studentAnswer) {
      return res.status(400).json({
        error: "Question, modelAnswer, and studentAnswer are required.",
      });
    }

    // Safety input size limits to prevent memory exhaustion
    if (typeof studentAnswer === "string" && studentAnswer.length > 15000) {
      return res.status(400).json({
        error: "إجابة الطالب طويلة جداً (الحد الأقصى 15,000 حرف).",
      });
    }
    if (typeof question === "string" && question.length > 10000) {
      return res.status(400).json({
        error: "نص السؤال طويل جداً.",
      });
    }
    if (typeof modelAnswer === "string" && modelAnswer.length > 15000) {
      return res.status(400).json({
        error: "الإجابة النموذجية طويلة جداً.",
      });
    }

    const normStudent = normalizeArabicText(studentAnswer);
    const normModel = normalizeArabicText(modelAnswer);

    // ==========================================
    // 1. High-Speed Local Pre-Grading (0ms, 0 tokens)
    // ==========================================
    // A. Blank or minimal text check
    if (normStudent.length < 2) {
      return res.json({
        success: true,
        score: 0,
        isCorrect: false,
        rating: "WRITTEN_WRONG",
        statusText: language === "en" ? "Incomplete Answer" : "إجابة فارغة أو غير مكتملة",
        feedback: language === "en" ? "Please provide a complete answer." : "يرجى كتابة إجابة واضحة ومتكاملة للسؤال.",
        keyPointsMatched: [],
        missingPoints: [modelAnswer],
        source: "local-fast",
      });
    }

    // B. Exact match check (tashkeel & punctuation stripped)
    if (normStudent === normModel) {
      return res.json({
        success: true,
        score: 100,
        isCorrect: true,
        rating: "WRITTEN_CORRECT",
        statusText: language === "en" ? "Model Answer" : "إجابة نموذجية ومطابقة",
        feedback: language === "en" ? "Your answer perfectly matches the expected model answer." : "إجابتك نموذجية ومطابقة تماماً للإجابة المعتمدة.",
        keyPointsMatched: [modelAnswer],
        missingPoints: [],
        source: "local-exact",
      });
    }

    // C. High lexical similarity match
    const simRatio = computeSimilarityRatio(normStudent, normModel);
    if (simRatio >= 0.85) {
      const score = Math.min(100, Math.round(simRatio * 100));
      return res.json({
        success: true,
        score,
        isCorrect: true,
        rating: "WRITTEN_CORRECT",
        statusText: language === "en" ? "Excellent Answer" : "إجابة ممتازة ودقيقة",
        feedback: language === "en" ? "Great understanding of essential concepts." : "إجابة ممتازة تغطي معظم المفاهيم الأساسية للإجابة النموذجية.",
        keyPointsMatched: [modelAnswer],
        missingPoints: [],
        source: "local-similarity",
      });
    }

    // D. Cache check for identical student responses
    const gradeCacheKey = crypto
      .createHash("sha256")
      .update(`${normalizeArabicText(question)}::${normModel}::${normStudent}`)
      .digest("hex");
    const cachedGrade = getFromCache(gradeCache, gradeCacheKey);
    if (cachedGrade) {
      return res.json({
        ...cachedGrade,
        cached: true,
      });
    }

    // ==========================================
    // 2. AI Semantic Grading (Groq -> Gemini Cascade)
    // ==========================================
    const systemInstruction = `أنت مصحح ومعلم أكاديمي متخصص في تقييم الإجابات المقالية والكتابية للطلاب بدقة وعدالة.
المهمة: تقييم إجابة الطالب مقارنة بالإجابة النموذجية المعتمدة.

معايير التقييم الدلالي (Semantic Grading):
1. انظر إلى المعنى والمضمون العلمي وليس التطابق الحرفي للكلمات.
2. إذا صاغ الطالب الفكرة بأسلوبه الخاص أو استخدم مرادفات تعطي نفس المعنى الأساسي، فامنحه الدرجة المستحقة.
3. التقييم العددي من 0 إلى 100:
   - 90 - 100: إجابة نموذجية وكاملة تشمل كل العناصر المفتاحية بدقة.
   - 75 - 89: إجابة ممتازة تغطي الأفكار الجوهرية مع إغفال بسيط لتفاصيل غير أساسية.
   - 50 - 74: إجابة مقبولة تشتمل على بعض المفاهيم الصحيحة ولكن تنقصها نقاط هامة.
   - 25 - 49: إجابة ضعيفة جداً تلامس الموضوع بسطحية دون الوصول للمفهوم المطلوب.
   - 0 - 24: إجابة خاطئة تماماً أو غير ذات صلة بالسؤال.
4. يعتبر الجواب صحيحاً (isCorrect: true) إذا كانت الدرجة 50 فأكثر.
5. قدم تغذية راجعة بناءة ومحفزة للطالب توضح له ما أحسن فيه وما ينقصه، بنفس لغة السؤال (${language === "ar" ? "العربية" : "الإنجليزية"}).
6. حدد النقاط الصحيحة التي أصاب فيها الطالب (keyPointsMatched) والنقاط الناقصة إن وُجدت (missingPoints).`;

    const promptText = `السؤال: ${question}
الإجابة النموذجية المعتمدة: ${modelAnswer}
إجابة الطالب المقدمة: ${studentAnswer}

قم بالتقييم وأعد كائن JSON بالشكل:
{
  "score": عدد صحيح من 0 لـ 100,
  "isCorrect": true أو false,
  "statusText": "وصف موجز للحالة",
  "feedback": "ملاحظات وتغذية راجعة للطالب",
  "keyPointsMatched": ["نقطة صحيحة"],
  "missingPoints": ["نقطة مفقودة"]
}`;

    let result: any = null;

    // Try Groq for super-fast grading if available
    if (process.env.GROQ_API_KEY) {
      try {
        const groqGrade = await callGroqChat([
          { role: "system", content: systemInstruction },
          { role: "user", content: promptText },
        ]);
        if (groqGrade) {
          let clean = groqGrade.trim();
          if (clean.startsWith("```json")) clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
          else if (clean.startsWith("```")) clean = clean.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
          result = JSON.parse(clean);
        }
      } catch (err) {
        console.warn("[Groq Grade Warning] Falling back to Gemini:", err);
      }
    }

    // Gemini Cascade Fallback
    if (!result || typeof result.score !== "number") {
      const gradeConfig = {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: "الدرجة المستحقة من 100 كعدد صحيح",
            },
            isCorrect: {
              type: Type.BOOLEAN,
              description: "true إذا كانت الدرجة 50 أو أكثر، وfalse إذا كانت أقل",
            },
            statusText: {
              type: Type.STRING,
              description: "وصف موجز لحالة الإجابة",
            },
            feedback: {
              type: Type.STRING,
              description: "تغذية راجعة تعليمية مفيدة",
            },
            keyPointsMatched: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "النقاط أو المفاهيم الصحيحة التي ذكرها الطالب",
            },
            missingPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "النقاط الجوهرية المفقودة التي كانت مطلوبة لاكتمال الإجابة",
            },
          },
          required: ["score", "isCorrect", "statusText", "feedback"],
        },
      };

      const { response: geminiResponse } = await generateWithGeminiCascade(
        promptText,
        gradeConfig
      );

      let responseText = geminiResponse.text?.trim() || "{}";
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
      } else if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
      }
      result = JSON.parse(responseText);
    }

    const score = typeof result.score === "number" ? Math.max(0, Math.min(100, Math.round(result.score))) : 0;
    const isCorrect = typeof result.isCorrect === "boolean" ? result.isCorrect : score >= 50;

    const finalResponse = {
      success: true,
      score,
      isCorrect,
      rating: isCorrect ? "WRITTEN_CORRECT" : "WRITTEN_WRONG",
      statusText: result.statusText || (isCorrect ? "إجابة مقبولة" : "إجابة غير مكتملة"),
      feedback: result.feedback || "",
      keyPointsMatched: Array.isArray(result.keyPointsMatched) ? result.keyPointsMatched : [],
      missingPoints: Array.isArray(result.missingPoints) ? result.missingPoints : [],
    };

    setInCache(gradeCache, gradeCacheKey, finalResponse);

    return res.json(finalResponse);
  } catch (error: any) {
    console.error("AI written answer grading error:", error);
    return res.status(500).json({
      error: "فشل تقييم الإجابة بواسطة الذكاء الاصطناعي.",
      details: error?.message || String(error),
    });
  }
};

// Register routes across all potential path aliases for local, Vercel, and Cloud Run
app.post(
  ["/api/ai/generate-quiz", "/ai/generate-quiz", "/generate-quiz", "/api/generate-quiz"],
  handleGenerateQuiz
);

app.post(
  ["/api/ai/grade-written", "/ai/grade-written", "/grade-written", "/api/grade-written"],
  handleGradeWritten
);

app.get(
  ["/api/ai/student-quota", "/ai/student-quota", "/student-quota"],
  async (req, res) => {
    try {
      const caller = await resolveCaller(req);
      return res.json(caller.role === "teacher" ? { used: 0, limit: 0, remaining: 0, unlimited: true } : getStudentQuotaInfo(caller.quotaKey));
    } catch (err) {
      if (sendIfAuthError(res, err)) return;
      throw err;
    }
  }
);

// Fallback for Vercel if rewrite strips URL directly to "/" or "/api"
app.post(["/", "/api"], (req, res, next) => {
  if (req.body && (req.body.content || (Array.isArray(req.body.images) && req.body.images.length > 0))) {
    return handleGenerateQuiz(req, res, next);
  }
  if (req.body && req.body.question && req.body.studentAnswer) {
    return handleGradeWritten(req, res, next);
  }
  return res.status(404).json({ error: "Route not found", path: req.url });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vitePromise = import("vite").then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: "spa",
      })
    );
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Miqyas server running on http://0.0.0.0:${PORT}`);
  });

  const cleanup = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
}

// Only start the standalone HTTP listener if not running in a serverless environment like Vercel
if (!process.env.VERCEL) {
  startServer();
}

export default app;

````


---

## `server/security.ts`

```ts
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * التحقق من هوية المستخدم على السيرفر.
 *
 * - التوكن (ID Token) يصدره Firebase Auth، والتحقق منه يتم هنا بالتوقيع (RS256)
 *   بدون أي مكتبة إضافية، وبالشهادات العامة من Google.
 * - دور المعلم يُقرأ من Firestore (teachers/{email}) بتوكن المستخدم نفسه عبر REST،
 *   فتطبّق قواعد Firestore نفسها، ولا نحتاج Admin SDK ولا مفاتيح خدمة.
 * - المتصفح لا يقرر دوره بعد الآن: حقول userRole/userId في الطلب تُتجاهل.
 */

export class AuthError extends Error {
  status = 401;
}

interface FirebaseConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

let firebaseConfigCache: FirebaseConfig | null = null;
function getFirebaseConfig(): FirebaseConfig {
  if (firebaseConfigCache) return firebaseConfigCache;
  const env = process.env.FIREBASE_PROJECT_ID;
  if (env) {
    firebaseConfigCache = {
      projectId: env,
      firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID,
    };
    return firebaseConfigCache;
  }
  const file = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfigCache = JSON.parse(fs.readFileSync(file, 'utf8')) as FirebaseConfig;
  return firebaseConfigCache;
}

// ───────── شهادات Google (تُخزَّن مؤقتاً حسب max-age) ─────────
const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error(`Could not load Google signing certs (${res.status})`);
  const maxAge = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
  const ttl = maxAge ? Number(maxAge[1]) * 1000 : 60 * 60 * 1000;
  const certs = (await res.json()) as Record<string, string>;
  certCache = { certs, expiresAt: Date.now() + ttl };
  return certs;
}

const b64urlToBuffer = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export interface VerifiedToken {
  uid: string;
  email: string;
  emailVerified: boolean;
  rawToken: string;
}

/** يتحقق من توقيع التوكن وصلاحيته ومصدره ومشروعه. يرمي AuthError لو فشل. */
export async function verifyIdToken(token: string): Promise<VerifiedToken> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthError('malformed token');

  let header: { alg?: string; kid?: string };
  let payload: Record<string, any>;
  try {
    header = JSON.parse(b64urlToBuffer(parts[0]).toString('utf8'));
    payload = JSON.parse(b64urlToBuffer(parts[1]).toString('utf8'));
  } catch {
    throw new AuthError('malformed token');
  }
  if (header.alg !== 'RS256' || !header.kid) throw new AuthError('unsupported token');

  const certs = await getGoogleCerts();
  const pem = certs[header.kid];
  if (!pem) throw new AuthError('unknown signing key');

  const valid = crypto
    .createVerify('RSA-SHA256')
    .update(`${parts[0]}.${parts[1]}`)
    .verify(pem, b64urlToBuffer(parts[2]));
  if (!valid) throw new AuthError('bad signature');

  const { projectId } = getFirebaseConfig();
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new AuthError('wrong audience');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new AuthError('wrong issuer');
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new AuthError('token expired');
  if (typeof payload.iat !== 'number' || payload.iat > now + 300) throw new AuthError('token issued in future');
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) {
    throw new AuthError('bad subject');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email.toLowerCase() : '',
    emailVerified: payload.email_verified === true,
    rawToken: token,
  };
}

// ───────── هل هذا المستخدم معلم؟ (قراءة وثيقته بتوكنه، والقواعد تقرر) ─────────
const teacherCache = new Map<string, { isTeacher: boolean; expiresAt: number }>();
const TEACHER_CACHE_MS = 5 * 60 * 1000;

async function checkIsTeacher(v: VerifiedToken): Promise<boolean> {
  if (!v.emailVerified || !v.email) return false;
  const cached = teacherCache.get(v.uid);
  if (cached && Date.now() < cached.expiresAt) return cached.isTeacher;

  const { projectId, firestoreDatabaseId } = getFirebaseConfig();
  const db = firestoreDatabaseId || '(default)';
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db}` +
    `/documents/teachers/${encodeURIComponent(v.email)}`;

  let isTeacher = false;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${v.rawToken}` } });
    if (res.ok) {
      const doc: any = await res.json();
      const role = doc?.fields?.role?.stringValue;
      isTeacher = role === 'teacher' || role === 'admin';
    }
  } catch {
    isTeacher = false;
  }
  teacherCache.set(v.uid, { isTeacher, expiresAt: Date.now() + TEACHER_CACHE_MS });
  return isTeacher;
}

export type CallerRole = 'guest' | 'student' | 'teacher';
export interface Caller {
  role: CallerRole;
  /** مفتاح حصة الذكاء الاصطناعي اليومية */
  quotaKey: string;
}

const clientIpOf = (req: any): string =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

/**
 * يحدد من هو المتصل:
 * - بدون Authorization: زائر (حصة بالـ IP)
 * - Authorization صالح: طالب (حصة بالـ uid) أو معلم (بدون حصة)
 * - Authorization غير صالح: 401 حتى يجدد المتصفح التوكن
 */
export async function resolveCaller(req: any): Promise<Caller> {
  const header = (req.headers['authorization'] as string) || '';
  const ip = clientIpOf(req);
  if (!header) return { role: 'guest', quotaKey: `ip:${ip}` };

  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) throw new AuthError('bad authorization header');

  const verified = await verifyIdToken(m[1]);
  if (await checkIsTeacher(verified)) return { role: 'teacher', quotaKey: `teacher:${verified.uid}` };
  return { role: 'student', quotaKey: `uid:${verified.uid}` };
}

/** يعيد الرد المناسب لخطأ المصادقة، ويعيد false لو لم يكن كذلك */
export function sendIfAuthError(res: any, err: unknown): boolean {
  if (err instanceof AuthError) {
    res.status(401).json({ error: 'انتهت جلستك أو غير صالحة. سجّل الدخول من جديد.' });
    return true;
  }
  return false;
}

// ───────── CORS: قائمة مسموحة بدل "*" ─────────
/** ALLOWED_ORIGINS=https://miqyas.example.com,https://www.miqyas.example.com */
export function applyCors(req: any, res: any): void {
  const origin = req.headers.origin as string | undefined;
  res.setHeader('Vary', 'Origin');
  if (!origin) return;
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

```


---

## `.gitignore`

```text
node_modules/
build/
dist/
coverage/
.DS_Store
*.log
.env*
!.env.example
!infinityfree_upload/**


# مخرجات بناء قديمة (تحتوي نسخة قديمة من الكود). تُولَّد من npm run build
infinityfree_upload/

```


---

## `CHANGES.md`

```markdown
# ملاحظات المراجعة وما تغيّر

## أولاً: مشاكل وجدتها في الكود (مرتبة بالأهمية)

### 1. الأمان — حرج، لازم يتعالج قبل أي استخدام حقيقي
- **بوابة المعلم حماية شكلية فقط.** تسجيل الدخول يتم بالكامل داخل المتصفح (`src/utils/storage.ts`). كلمة مرور المدير مكتوبة نصاً في الكود (السطر 8 والسطر 40) وبالتالي تنزل لكل زائر، وكلمات مرور المعلمين الآخرين تتخزن نصاً في localStorage.
- **قواعد Firestore تسمح لأي شخص بالكتابة والحذف.** في `firestore.rules` القواعد على `subjects` و`topics` و`quizzes` هي `allow write: if isValidId(...)`، أي أنها تتحقق من شكل المعرّف فقط وليس من هوية الكاتب. يعني أي شخص يعرف عنوان المشروع يقدر يعدل أو يمسح كل المحتوى حتى لو ما دخل بوابة المعلم.
- **المطلوب:** Firebase Authentication للمعلمين + صلاحية (custom claim) + قواعد تتحقق منها، وحذف كلمات المرور من الكود. وغيّر كلمة مرور المدير الحالية فوراً لأنها صارت مكشوفة.
- **تم علاجه (انظر `SECURITY.md` للتفعيل):** صار دخول المعلم بحساب Google مع وثيقة `teachers/{email}` في Firestore، وحُذفت كل كلمات المرور من الكود، ويُمسح المخزن القديم من متصفحات المستخدمين، وقواعد Firestore تشترط معلماً مسجلاً للكتابة وتحصر تعديل المعلم في ما أنشأه.
- ما بقي من ملاحظات أمنية (المسودات، حصة الـ AI، CORS) مذكور في `SECURITY.md`.

### 2. تكرار كبير
- `server.ts` (1291 سطر) و`api/index.ts` (1021 سطر) يحتويان نفس منطق الـ API منسوخاً. أي إصلاح لازم يتكرر في الاثنين. الأفضل استخراج المنطق المشترك في وحدة واحدة.
- منطق "الاختبارات غير المكتملة" كان مكرراً حرفياً في شاشتين (تم دمجه، انظر أدناه).
- نمط الأزرار (سلسلة كلاسات طويلة) مكرر في مئات الأماكن (تم توفير `Button` للاستخدام من الآن).

### 3. ملفات ضخمة لازم تتقسم
`TeacherDashboard.tsx` (3628 سطر) · `StudentDashboard.tsx` (2624) · `QuizRunner.tsx` (1251) · `App.tsx` (1218). كل واحد منها يجمع عدة شاشات وحالات في ملف واحد، وده يصعّب أي تعديل ويرفع احتمال الأخطاء.

### 4. الترجمة غير منظمة
نصف النصوص في `LanguageContext.tsx` ونصفها مكتوب داخل المكونات بصيغة `isArabic ? '...' : '...'`. الأفضل توحيدها في ملف الترجمة.

### 5. أمور أصغر
- مجلد `infinityfree_upload/` فيه نسخة مبنية قديمة باسم "QuizMind AI". لازم يُعاد بناؤه بعد هذه التعديلات وإلا سيظهر الاسم القديم.
- النوع `ViewMode` لا يتضمن `student_dashboard` و`student_runner` رغم استخدامهما.
- كان `priv.subjectId` يُقرأ من `PrivateQuiz` ولا يوجد في النوع (خطأ TypeScript كان سيظهر في `npm run lint`).
- اسم الحزمة كان `react-example` وملف README قادم من AI Studio.

## ثانياً: ما تم تنفيذه

**الاسم:** صار «مقياس» (Miqyas) في العنوان والوصف والشعار وملف metadata والـ README وسجل السيرفر وترجمة `appTitle`. الاسم معرّف مرة واحدة في `src/config/brand.ts`.
مفاتيح التخزين المحلي للثيم واللغة وحجم الخط صارت `miqyas_*` مع قراءة المفاتيح القديمة كاحتياط حتى لا يفقد المستخدمون إعداداتهم. **لم أغيّر** مفاتيح المسودات (`axis_teacher_wip_draft_*` و`axis_student_wip_draft_*`) حتى لا تضيع مسودات غير محفوظة.

**الهوية البصرية (`src/index.css`):** لوحة جديدة (أخضر مقياس + محايدات باردة + مؤشر كهرماني)، خط IBM Plex Sans Arabic، زوايا أهدأ، حلقة تركيز واضحة للوحة المفاتيح، واحترام تفضيل تقليل الحركة. اللوحة معرّفة عبر `@theme` فتنطبق تلقائياً على **كل** الشاشات الحالية.

**شاشات أعدت تصميمها وكتابتها:** الصفحة الرئيسية، الشريط العلوي، الشعار، قائمة المقررات (مع البحث)، تسجيل دخول المعلم، وقائمة "أكمل من حيث توقفت".

**مكونات جديدة:** `ui/Button`, `ui/Ruler` (إحصاءات وتقدم على شكل مسطرة), `ResumeBanner`, `hooks/useResumableQuizzes`.

## ثالثاً: ما لم يتم (بصراحة)

- **قواعد Firestore وتسجيل الدخول الجديد لم تُختبر** (لا emulator ولا إنترنت). جرّبها على نسخة تجريبية قبل الإنتاج.
- **لم أبنِ المشروع ولم أشغّله.** بيئتي بدون إنترنت فلم أستطع `npm install`. فحصت صياغة كل ملف عدّلته بـ esbuild وكلها سليمة، لكن لم يجرِ فحص الأنواع (`npm run lint`) ولا رؤية الشكل في المتصفح. شغّل `npm run dev` وراجعه وأرسل لي أي خطأ أو ملاحظة.
- **باقي الشاشات حصلت على اللوحة الجديدة فقط ولم يُعد تصميمها:** صفحات الموضوعات والاختبارات، مشغّل الاختبار، النتائج، لوحة الطالب، لوحة المعلم، والبطاقات التعليمية. ستظهر بالألوان والخط الجديدين، لكن تخطيطها ما زال القديم.


## رابعاً: الجولة الثانية (الأمان)
- `server/security.ts` (جديد): التحقق من توكن Firebase بالتوقيع، وقراءة دور المعلم من Firestore بتوكن المستخدم، و CORS بقائمة مسموحة.
- `server.ts` و`api/index.ts`: الدور يُحدد من التوكن، لا من حقل في الطلب. حصة الطالب بالـ uid الموثّق. الحد الأقصى للطلب 25MB.
- `firestore.rules`: المسودات للمعلمين فقط، `quizStats` بقت تقبل محاولة واحدة لكل كتابة.
- الواجهة: التوكن بيتبعت مع طلبات الـ AI، والاشتراك في الاختبارات بيتفصل حسب الدور (`subscribeToQuizzes(..., includeDrafts)`)، وفيه ترحيل لمرة واحدة لـ`isPublished`.

```


---

## `README.md`

````markdown
# مقياس (Miqyas)

منصة عربية للاختبارات التفاعلية. الطالب يحل اختبارات المقررات (بدون تسجيل أو بحساب Google)، ويراجع أخطاءه، ويبني اختبارات خاصة. والمعلم يبني الاختبارات وينشرها بمساعدة الذكاء الاصطناعي.

## التشغيل محلياً

```bash
npm install            # أو: bun install
cp .env.example .env.local   # ثم ضع GEMINI_API_KEY (و GROQ_API_KEY اختيارياً)
npm run dev            # يشغّل server.ts (Express + Vite) على المنفذ المحدد
```

الأوامر: `npm run build` (واجهة + سيرفر إلى dist/) · `npm start` · `npm run lint` (فحص TypeScript).

## هيكل المشروع

```
src/
  config/brand.ts          اسم المنصة وشعارها — مصدر واحد للاسم
  index.css                لوحة الألوان والخطوط (الهوية كلها تبدأ من هنا)
  components/
    ui/                    عناصر مشتركة: Button, RulerStats, RulerProgress
    Logo, Navbar, HomeView, ResumeBanner ...
    student/               شاشات الطالب والاختبار والنتائج
    teacher/               بوابة المعلم
  context/                 اللغة (ar/en) وتسجيل دخول الطالب
  hooks/                   useResumableQuizzes
  services/                Firestore وخدمات الذكاء الاصطناعي
  utils/                   التخزين المحلي، تحليل الملفات، الطباعة، ضغط الصور
server.ts                  سيرفر Express (الاستضافة العادية)
api/index.ts               نفس واجهة الـ API كدالة Vercel
firestore.rules            قواعد الأمان — راجع ملاحظات الأمان في CHANGES.md
```

## نظام التصميم

- **اللون:** أخضر مقياس `blue-*` (#0b6e6e) للأزرار والحالة النشطة، ومحايدات `zinc-*` باردة، ولون المؤشر الكهرماني `marker` (#f2b01e) للشعار فقط.
- **الخط:** IBM Plex Sans Arabic لكل شيء (عربي ولاتيني).
- **العنصر المميز:** المسطرة (`.ruler-ticks`, `RulerStats`, `RulerProgress`).
- الألوان معرّفة في `@theme` داخل `index.css`، فتغيير اللوحة يتم من مكان واحد.
- استخدم `Button` / `buttonClass` للأزرار بدل تكرار الكلاسات، وخصائص منطقية (`ms-`, `ps-`, `start-`) بدل left/right ليعمل RTL تلقائياً.

````


---

## `SECURITY.md`

```markdown
# إعداد الأمان (لازم قبل النشر)

بعد هذا التحديث لم يعد في الكود أي كلمة مرور. المعلم يدخل بحساب Google، وصلاحيته تتحدد من وثيقة له في Firestore، وقواعد `firestore.rules` هي التي تمنع غير المعلمين من الكتابة فعلياً.

## خطوات التفعيل (بالترتيب)

1. **Firebase Console ← Authentication ← Sign-in method:** تأكد أن Google مفعّل، وأن نطاق موقعك موجود في Authorized domains.
2. **أنشئ المدير الأول يدوياً** (مرة واحدة): Firestore ← Start collection باسم `teachers`، ثم وثيقة معرّفها (Document ID) هو بريدك **بحروف صغيرة**، مثل `you@gmail.com`، وحقولها كلها من نوع string:
   - `email` = نفس البريد
   - `displayName` = اسمك
   - `role` = `admin`
   - `createdAt` = أي تاريخ ISO مثل `2026-11-23T00:00:00.000Z`
3. **انشر القواعد:** من Console ← Firestore ← Rules الصق محتوى `firestore.rules` واضغط Publish، أو `firebase deploy --only firestore:rules`.
4. **انشر الواجهة الجديدة** (`npm run build` ثم الرفع). انشر القواعد والواجهة في نفس الوقت تقريباً: الواجهة القديمة لن تستطيع الكتابة بعد تفعيل القواعد.
5. **ادخل من `/teacher` بحسابك (المدير) مرة واحدة بعد النشر.** ده بيرحّل الاختبارات القديمة (بتضيف لها حقل `isPublished = true`) عشان الطلاب يشوفوها. من غيره الاختبارات القديمة مش هتظهر للطلاب.
6. من تبويب المعلمين أضف بقية المعلمين بإيميلاتهم.
7. في `.env` على السيرفر (أو إعدادات الاستضافة) حط `ALLOWED_ORIGINS` بدومين الموقع لو الواجهة على دومين مختلف عن السيرفر.

## ما الذي تغيّر في السلوك
- المحتوى القديم الذي كان `createdBy` فيه `admin` أو اسم مستخدم قديم يعدّله **المدير فقط**. لتسليمه لمعلم: غيّر حقل `createdBy` في الوثيقة إلى بريد المعلم.
- المعلم يعدّل ويحذف ما أنشأه فقط. المدير يعدّل ويحذف كل شيء.
- تسجيل الخروج من بوابة المعلم يخرج الحساب من واجهة الطالب أيضاً (جلسة Firebase واحدة).

## ما اتعالج في الجولة الثانية
- **حصة الذكاء الاصطناعي:** السيرفر بيتحقق من توكن Firebase بالتوقيع (`server/security.ts`)، والهوية والدور بيتحددوا من التوكن. حقلا `userRole` و`userId` اللي كان المتصفح بيبعتهم اتشالوا من القرار: الطالب ما يقدرش يدّعي إنه معلم عشان يتجاوز الحصة.
- **المعلم بيتعرف على السيرفر** من وثيقته في `teachers` (بتوكنه نفسه، فالقواعد هي اللي بتقرر).
- **CORS:** بقى مسموح لقائمة `ALLOWED_ORIGINS` بس بدل `*`.
- **حجم الطلب:** من 50MB لـ 25MB. لو رفعت صور كتير وظهر خطأ 413، ارفع الرقم في `server.ts` و`api/index.ts`.
- **المسودات:** الطالب مايقدرش يقرأ اختبار غير منشور من Firestore، لا بالقائمة ولا بالرابط. المعلم بيشوفها.
- **quizStats:** كل كتابة بتضيف محاولة واحدة بالظبط، ونسبة بين 0 و100.

## ما بقي مفتوحاً (لم أعالجه)
- **المسودات والقواعد:** القواعد الجديدة لم تُختبر على Firebase فعلياً (مفيش إنترنت وقت البناء). جرّبها على emulator أو مشروع تجريبي قبل الإنتاج.
- **معدل الطلبات:** مفيش حد لعدد الطلبات من الطالب الواحد للإحصاءات (`quizStats`) غير إنها بتزود محاولة واحدة في كل كتابة. الحد الكامل يحتاج إن الكتابة تتم من السيرفر.
- **الزوار (بدون حساب):** حصتهم بالـ IP، فالشبكات المشتركة (مدرسة/جامعة) ممكن تتعب بسرعة.
- مفتاح Firebase في `firebase-applet-config.json` ليس سراً (مفاتيح الويب مصممة لتكون علنية)، الأمان كله في القواعد. أما `GEMINI_API_KEY` و`GROQ_API_KEY` فسرّية: لا ترفع `.env`.
- **كلمة المرور القديمة** كانت داخل الحزم المبنية القديمة، فاعتبرها مكشوفة. لم تعد تعمل لأن الدخول بها أُلغي، لكن لو استخدمتها في أي مكان آخر غيّرها.

```


---

## `firebase-applet-config.json`

```json
{
  "projectId": "gen-lang-client-0535537774",
  "appId": "1:527994229666:web:42245c1ac101c2703198fb",
  "apiKey": "AIzaSyABuC3wSD4DB8LNLo1J2TJG-AqXuEhpnZs",
  "authDomain": "gen-lang-client-0535537774.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-quizmasterai-0d41dc9b-1eaf-4203-95a7-d2cf48742531",
  "storageBucket": "gen-lang-client-0535537774.firebasestorage.app",
  "messagingSenderId": "527994229666",
  "measurementId": "",
  "oAuthClientId": "527994229666-9v3j8696q5rji4ov7v2fefnl1cek87e1.apps.googleusercontent.com",
  "recaptchaSiteKey": ""
}
```


---

## `index.html`

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="theme-color" content="#0b6e6e" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>مقياس | اختبر فهمك وقِس تقدّمك</title>
    <meta name="description" content="مقياس منصة عربية للاختبارات التفاعلية: حل اختبارات المقررات، راجع أخطاءك، وتابع مستواك. وللمعلمين أدوات لبناء الاختبارات ونشرها." />
    <meta property="og:title" content="مقياس | اختبر فهمك وقِس تقدّمك" />
    <meta property="og:description" content="مقياس منصة عربية للاختبارات التفاعلية: حل اختبارات المقررات، راجع أخطاءك، وتابع مستواك." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  </head>
  <body class="antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>


```


---

## `metadata.json`

```json
{
  "name": "مقياس | اختبر فهمك وقِس تقدّمك",
  "description": "مقياس منصة عربية للاختبارات التفاعلية: حل اختبارات المقررات، مراجعة الأخطاء، ومتابعة المستوى. وللمعلمين أدوات لبناء الاختبارات ونشرها بمساعدة الذكاء الاصطناعي.",
  "requestFramePermissions": [],
  "majorCapabilities": [
    "MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"
  ]
}
```


---

## `package.json`

```json
{
  "name": "miqyas",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "preview": "vite preview",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^3.3.0",
    "@tailwindcss/vite": "^4.1.14",
    "@types/canvas-confetti": "^1.9.0",
    "@vitejs/plugin-react": "^5.0.4",
    "canvas-confetti": "^1.9.4",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "firebase": "^13.0.0",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "pdfjs-dist": "^6.5.438",
    "qrcode.react": "^4.2.0",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "react-router-dom": "^7.18.2",
    "vite": "^6.2.3"
  },
  "devDependencies": {
    "@firebase/eslint-plugin-security-rules": "^0.0.2",
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "eslint": "^10.15.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}

```


---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "noEmit": true
  }
}

```


---

## `vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/index.ts": {
      "maxDuration": 60
    }
  }
}


```


---

## `vite.config.ts`

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

```


---

## `src/App.tsx`

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTeacherSession } from './hooks/useTeacherSession';
import { subscribeToTeachers, addTeacherByEmail, removeTeacher, backfillQuizPublishFlags } from './services/teacherService';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Subject, Topic, Quiz, AIWrittenGradingResult, Question, TeacherUser } from './types';
import {
  getSubjects,
  getTopics,
  getQuizzes,
  saveSubjects,
  clearQuizProgress,
  saveTopics,
  saveQuizzes,
} from './utils/storage';
import {
  subscribeToSubjects,
  subscribeToTopics,
  subscribeToQuizzes,
  saveSubjectToCloud,
  deleteSubjectFromCloud,
  saveTopicToCloud,
  deleteTopicFromCloud,
  saveQuizToCloud,
  deleteQuizFromCloud,
  seedInitialCloudDataIfNeeded,
  fetchSubjectByIdFromCloud,
  fetchTopicByIdFromCloud,
} from './services/firestoreService';
import { Navbar } from './components/Navbar';
import { CloudLoadingState } from './components/CloudLoadingState';
import { StudentSubjectsView } from './components/student/StudentSubjectsView';
import { StudentTopicsView } from './components/student/StudentTopicsView';
import { StudentQuizzesView } from './components/student/StudentQuizzesView';
import { QuizRunnerRoute } from './components/student/QuizRunnerRoute';
import { QuizResultsRoute } from './components/student/QuizResultsRoute';
import { QuizRunner } from './components/student/QuizRunner';
import { QuizResults } from './components/student/QuizResults';
import { StudentDashboard } from './components/student/StudentDashboard';
import { HomeView } from './components/HomeView';
import { TeacherLogin } from './components/teacher/TeacherLogin';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { StudentAuthProvider, useStudentAuth, QuizResultPayload } from './context/StudentAuthContext';

function SubjectViewRoute({
  subjects,
  topics,
  quizzes,
  isSubjectsLoaded,
  selectedSubject,
  onSelectSubject,
  onSubjectLoaded,
  onSelectTopic,
  onStartQuiz,
}: {
  subjects: Subject[];
  topics: Topic[];
  quizzes: Quiz[];
  isSubjectsLoaded: boolean;
  selectedSubject: Subject | null;
  onSelectSubject: (s: Subject) => void;
  onSubjectLoaded: (s: Subject) => void;
  onSelectTopic: (t: Topic) => void;
  onStartQuiz: (q: Quiz, custom?: { limit?: number; qType?: 'all' | 'mcq' | 'written' }) => void;
}) {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const [directSubject, setDirectSubject] = useState<Subject | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = useState(false);
  const [fetchedForId, setFetchedForId] = useState<string | null>(null);

  const currentSubject =
    (selectedSubject && selectedSubject.id === subjectId ? selectedSubject : null) ||
    subjects.find((s) => s.id === subjectId) ||
    (directSubject && directSubject.id === subjectId ? directSubject : null);

  useEffect(() => {
    if (!subjectId || currentSubject || fetchedForId === subjectId) return;

    let cancelled = false;
    setIsFetchingDirect(true);

    fetchSubjectByIdFromCloud(subjectId)
      .then((cloudSubject) => {
        if (cancelled) return;
        setFetchedForId(subjectId);
        if (cloudSubject) {
          setDirectSubject(cloudSubject);
          onSubjectLoaded(cloudSubject);
          onSelectSubject(cloudSubject);
        }
      })
      .finally(() => {
        if (!cancelled) setIsFetchingDirect(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subjectId, currentSubject, fetchedForId, onSubjectLoaded, onSelectSubject]);

  useEffect(() => {
    if (currentSubject && (!selectedSubject || selectedSubject.id !== currentSubject.id)) {
      onSelectSubject(currentSubject);
    }
  }, [currentSubject, selectedSubject, onSelectSubject]);

  if (!currentSubject) {
    const stillLoading = !isSubjectsLoaded || isFetchingDirect || fetchedForId !== subjectId;
    return (
      <>
        <Navbar
          viewMode="student_topics"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
          onBackToSubjects={() => navigate('/courses')}
          onBackToTopics={() => {}}
        />
        <CloudLoadingState
          status={stillLoading ? 'loading' : 'not-found'}
          title={
            stillLoading
              ? isArabic
                ? 'جاري تحميل المساق...'
                : 'Loading Course...'
              : isArabic
              ? 'المساق غير موجود'
              : 'Course Not Found'
          }
          onBackHome={() => navigate('/courses')}
        />
      </>
    );
  }

  return (
    <>
      <Navbar
        viewMode="student_topics"
        onNavigate={() => {}}
        selectedSubject={currentSubject}
        selectedTopic={null}
        selectedQuiz={null}
        onBackToSubjects={() => navigate('/courses')}
        onBackToTopics={() => {}}
      />
      <main className="flex-1">
        <StudentTopicsView
          subject={currentSubject}
          topics={topics}
          quizzes={quizzes}
          onSelectTopic={onSelectTopic}
          onStartQuiz={(quiz, custom) => {
            onSelectSubject(currentSubject);
            onStartQuiz(quiz, custom);
          }}
          onBackToSubjects={() => navigate('/courses')}
        />
      </main>
    </>
  );
}

function TopicViewRoute({
  subjects,
  topics,
  quizzes,
  isSubjectsLoaded,
  isTopicsLoaded,
  selectedSubject,
  selectedTopic,
  onSelectSubject,
  onSelectTopic,
  onSubjectLoaded,
  onTopicLoaded,
  onStartQuiz,
}: {
  subjects: Subject[];
  topics: Topic[];
  quizzes: Quiz[];
  isSubjectsLoaded: boolean;
  isTopicsLoaded: boolean;
  selectedSubject: Subject | null;
  selectedTopic: Topic | null;
  onSelectSubject: (s: Subject) => void;
  onSelectTopic: (t: Topic) => void;
  onSubjectLoaded: (s: Subject) => void;
  onTopicLoaded: (t: Topic) => void;
  onStartQuiz: (q: Quiz, custom?: { limit?: number; qType?: 'all' | 'mcq' | 'written' }) => void;
}) {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const [directTopic, setDirectTopic] = useState<Topic | null>(null);
  const [directSubject, setDirectSubject] = useState<Subject | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = useState(false);
  const [fetchedForId, setFetchedForId] = useState<string | null>(null);

  const currentTopic =
    (selectedTopic && selectedTopic.id === topicId ? selectedTopic : null) ||
    topics.find((t) => t.id === topicId) ||
    (directTopic && directTopic.id === topicId ? directTopic : null);

  const currentSubject =
    (selectedSubject && (!currentTopic || selectedSubject.id === currentTopic.subjectId)
      ? selectedSubject
      : null) ||
    (currentTopic ? subjects.find((s) => s.id === currentTopic.subjectId) || null : null) ||
    (directSubject && currentTopic && directSubject.id === currentTopic.subjectId ? directSubject : null);

  useEffect(() => {
    if (!topicId) return;
    if (currentTopic && currentSubject) return;
    if (fetchedForId === topicId && !currentTopic) return;

    let cancelled = false;
    setIsFetchingDirect(true);

    (async () => {
      try {
        let resolvedTopic = currentTopic;
        if (!resolvedTopic && fetchedForId !== topicId) {
          resolvedTopic = await fetchTopicByIdFromCloud(topicId);
          if (cancelled) return;
          setFetchedForId(topicId);
          if (resolvedTopic) {
            setDirectTopic(resolvedTopic);
            onTopicLoaded(resolvedTopic);
            onSelectTopic(resolvedTopic);
          }
        }

        if (resolvedTopic && !currentSubject) {
          const resolvedSubject = await fetchSubjectByIdFromCloud(resolvedTopic.subjectId);
          if (cancelled) return;
          if (resolvedSubject) {
            setDirectSubject(resolvedSubject);
            onSubjectLoaded(resolvedSubject);
            onSelectSubject(resolvedSubject);
          }
        }
      } finally {
        if (!cancelled) {
          setFetchedForId(topicId);
          setIsFetchingDirect(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [topicId, currentTopic, currentSubject, fetchedForId, onTopicLoaded, onSubjectLoaded, onSelectTopic, onSelectSubject]);

  useEffect(() => {
    if (currentTopic && (!selectedTopic || selectedTopic.id !== currentTopic.id)) {
      onSelectTopic(currentTopic);
    }
    if (currentSubject && (!selectedSubject || selectedSubject.id !== currentSubject.id)) {
      onSelectSubject(currentSubject);
    }
  }, [currentTopic, currentSubject, selectedTopic, selectedSubject, onSelectTopic, onSelectSubject]);

  if (!currentTopic || !currentSubject) {
    const stillLoading =
      !isTopicsLoaded || !isSubjectsLoaded || isFetchingDirect || fetchedForId !== topicId;
    return (
      <>
        <Navbar
          viewMode="student_quizzes"
          onNavigate={() => {}}
          selectedSubject={currentSubject}
          selectedTopic={currentTopic}
          selectedQuiz={null}
          onBackToSubjects={() => navigate('/courses')}
          onBackToTopics={() => (currentSubject ? navigate(`/subject/${currentSubject.id}`) : navigate('/courses'))}
        />
        <CloudLoadingState
          status={stillLoading ? 'loading' : 'not-found'}
          title={
            stillLoading
              ? isArabic
                ? 'جاري تحميل الموضوع والاختبارات...'
                : 'Loading Topic & Quizzes...'
              : isArabic
              ? 'الموضوع غير موجود'
              : 'Topic Not Found'
          }
          onBackHome={() => navigate('/courses')}
        />
      </>
    );
  }

  return (
    <>
      <Navbar
        viewMode="student_quizzes"
        onNavigate={() => {}}
        selectedSubject={currentSubject}
        selectedTopic={currentTopic}
        selectedQuiz={null}
        onBackToSubjects={() => navigate('/courses')}
        onBackToTopics={() => navigate(`/subject/${currentSubject.id}`)}
      />
      <main className="flex-1">
        <StudentQuizzesView
          subject={currentSubject}
          topic={currentTopic}
          quizzes={quizzes}
          onStartQuiz={(quiz, custom) => {
            onSelectSubject(currentSubject);
            onSelectTopic(currentTopic);
            onStartQuiz(quiz, custom);
          }}
          onBackToTopics={() => navigate(`/subject/${currentSubject.id}`)}
        />
      </main>
    </>
  );
}

function PrivateQuizRunnerRoute() {
  const { privateQuizId } = useParams<{ privateQuizId: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const {
    studentUser,
    authLoading,
    authBusy,
    signInWithGoogle,
    dataLoading,
    privateQuizzes,
    recordQuizCompletion,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
  } = useStudentAuth();

  const [sessionKey, setSessionKey] = useState<number>(() => Date.now());
  const [privateResults, setPrivateResults] = useState<QuizResultPayload | null>(null);

  useEffect(() => {
    setPrivateResults(null);
    setSessionKey(Date.now());
  }, [privateQuizId]);

  const privateQuiz = privateQuizzes.find((pq) => pq.id === privateQuizId) || null;

  if (authLoading || (studentUser && dataLoading && !privateQuiz)) {
    return (
      <>
        <Navbar
          viewMode="student_runner"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <CloudLoadingState
          status="loading"
          title={isArabic ? 'جاري تحميل الاختبار الخاص...' : 'Loading Private Quiz...'}
          onBackHome={() => navigate('/student')}
        />
      </>
    );
  }

  if (!studentUser) {
    return <Navigate to="/student" replace />;
  }

  if (!privateQuiz) {
    return (
      <>
        <Navbar
          viewMode="student_dashboard"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <CloudLoadingState
          status="not-found"
          title={isArabic ? 'الاختبار الخاص غير موجود' : 'Private Quiz Not Found'}
          subtitle={
            isArabic
              ? 'ربما تم حذف هذا الاختبار الخاص من حسابك أو أن الرابط غير صحيح.'
              : 'This private quiz may have been removed from your account or the link is invalid.'
          }
          onBackHome={() => navigate('/student')}
        />
      </>
    );
  }

  const quizAsStandard: Quiz = {
    id: privateQuiz.id,
    subjectId: privateQuiz.subjectId || `private_${privateQuiz.subjectName}`,
    topicId: 'private',
    title: privateQuiz.title,
    description: privateQuiz.description || '',
    questions: privateQuiz.questions,
    createdAt: privateQuiz.createdAt,
    updatedAt: privateQuiz.updatedAt || privateQuiz.createdAt,
    timeLimitMinutes: privateQuiz.timeLimitMinutes,
  };

  if (privateResults) {
    return (
      <>
        <Navbar
          viewMode="student_dashboard"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <main className="flex-1">
          <QuizResults
            quiz={quizAsStandard}
            score={privateResults.score}
            totalMCQs={privateResults.totalMCQs}
            totalWritten={privateResults.totalWritten}
            userAnswers={privateResults.userAnswers}
            writtenInputData={privateResults.writtenInputData}
            writtenGradingData={privateResults.writtenGradingData}
            questions={privateResults.questions}
            timeSpentSeconds={privateResults.timeSpentSeconds}
            onRetake={() => {
              clearQuizProgress(quizAsStandard.id);
              setPrivateResults(null);
              setSessionKey(Date.now());
            }}
            onBackToSubjects={() => navigate('/student')}
            isStudentSignedIn={Boolean(studentUser)}
            isQuestionBookmarked={(q) => isQuestionBookmarked(quizAsStandard.id, q)}
            onToggleBookmark={(q) =>
              toggleBookmarkQuestion({
                quiz: quizAsStandard,
                subjectName: privateQuiz.subjectName,
                question: q,
              })
            }
            onOpenStudentDashboard={() => navigate('/student')}
            onSignInStudent={signInWithGoogle}
            authBusy={authBusy}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar
        viewMode="student_runner"
        onNavigate={() => {}}
        selectedSubject={null}
        selectedTopic={null}
        selectedQuiz={quizAsStandard}
        onBackToTopics={() => navigate('/student')}
      />
      <main className="flex-1">
        <QuizRunner
          key={`${quizAsStandard.id}-${sessionKey}`}
          quiz={quizAsStandard}
          onFinishQuiz={(results) => {
            clearQuizProgress(quizAsStandard.id);
            setPrivateResults(results);
            recordQuizCompletion({
              quiz: quizAsStandard,
              subjectName: privateQuiz.subjectName,
              isPrivateQuiz: true,
              practiceMode: null,
              results,
            }).catch(console.error);
          }}
          onExit={() => navigate('/student')}
          isStudentSignedIn={Boolean(studentUser)}
          isQuestionBookmarked={(q) => isQuestionBookmarked(quizAsStandard.id, q)}
          onToggleBookmark={(q) =>
            toggleBookmarkQuestion({
              quiz: quizAsStandard,
              subjectName: privateQuiz.subjectName,
              question: q,
            })
          }
        />
      </main>
    </>
  );
}

function PracticeQuizRunnerRoute() {
  const { mode } = useParams<{ mode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const {
    studentUser,
    authLoading,
    authBusy,
    signInWithGoogle,
    dataLoading,
    mistakes,
    bookmarks,
    recordQuizCompletion,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
  } = useStudentAuth();

  const subjectFilter = searchParams.get('subject');
  const practiceMode: 'mistakes' | 'bookmarks' | null =
    mode === 'mistakes' ? 'mistakes' : mode === 'bookmarks' ? 'bookmarks' : null;

  const [sessionKey, setSessionKey] = useState<number>(() => Date.now());
  const [practiceResults, setPracticeResults] = useState<QuizResultPayload | null>(null);
  const [lockedQuiz, setLockedQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    setLockedQuiz(null);
    setPracticeResults(null);
    setSessionKey(Date.now());
  }, [practiceMode, subjectFilter]);

  useEffect(() => {
    if (!practiceMode || !studentUser || dataLoading || lockedQuiz) return;

    if (practiceMode === 'mistakes') {
      const items = subjectFilter
        ? mistakes.filter((m) => m.subjectName === subjectFilter)
        : mistakes;
      if (items.length === 0) return;

      const quizId = `practice_mistakes_${subjectFilter || 'all'}`;
      clearQuizProgress(quizId);
      setLockedQuiz({
        id: quizId,
        subjectId: 'practice',
        topicId: 'practice_mistakes',
        title: isArabic
          ? subjectFilter
            ? `تدريب الأخطاء — ${subjectFilter}`
            : 'تدريب بنك الأخطاء'
          : subjectFilter
          ? `Mistakes Practice — ${subjectFilter}`
          : 'Mistakes Bank Practice',
        description: isArabic
          ? 'جلسة مراجعة ذكية للأسئلة التي أخطأت فيها سابقاً.'
          : 'Smart practice session built from your previously missed questions.',
        questions: items.map((m) => ({
          ...m.question,
          id: m.id,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (practiceMode === 'bookmarks') {
      const items = subjectFilter
        ? bookmarks.filter((b) => b.subjectName === subjectFilter)
        : bookmarks;
      if (items.length === 0) return;

      const quizId = `practice_bookmarks_${subjectFilter || 'all'}`;
      clearQuizProgress(quizId);
      setLockedQuiz({
        id: quizId,
        subjectId: 'practice',
        topicId: 'practice_bookmarks',
        title: isArabic
          ? subjectFilter
            ? `تدريب المحفوظات — ${subjectFilter}`
            : 'تدريب الأسئلة المحفوظة'
          : subjectFilter
          ? `Bookmarks Practice — ${subjectFilter}`
          : 'Saved Bookmarks Practice',
        description: isArabic
          ? 'مراجعة تفاعلية لأسئلتك المحفوظة.'
          : 'Interactive practice session built from your saved questions.',
        questions: items.map((b) => ({
          ...b.question,
          id: b.question.id || b.id,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [practiceMode, studentUser, dataLoading, lockedQuiz, mistakes, bookmarks, subjectFilter, isArabic]);

  if (!practiceMode) {
    return <Navigate to="/student" replace />;
  }

  if (authLoading || (studentUser && dataLoading && !lockedQuiz && !practiceResults)) {
    return (
      <>
        <Navbar
          viewMode="student_runner"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <CloudLoadingState
          status="loading"
          title={isArabic ? 'جاري تجهيز جلسة التدريب...' : 'Preparing Practice Session...'}
          onBackHome={() => navigate('/student')}
        />
      </>
    );
  }

  if (!studentUser) {
    return <Navigate to="/student" replace />;
  }

  if (practiceResults && lockedQuiz) {
    return (
      <>
        <Navbar
          viewMode="student_dashboard"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <main className="flex-1">
          <QuizResults
            quiz={lockedQuiz}
            score={practiceResults.score}
            totalMCQs={practiceResults.totalMCQs}
            totalWritten={practiceResults.totalWritten}
            userAnswers={practiceResults.userAnswers}
            writtenInputData={practiceResults.writtenInputData}
            writtenGradingData={practiceResults.writtenGradingData}
            questions={practiceResults.questions}
            timeSpentSeconds={practiceResults.timeSpentSeconds}
            onRetake={() => {
              clearQuizProgress(lockedQuiz.id);
              setPracticeResults(null);
              setLockedQuiz(null);
              setSessionKey(Date.now());
            }}
            onBackToSubjects={() => navigate('/student')}
            isStudentSignedIn={Boolean(studentUser)}
            isQuestionBookmarked={(q) => isQuestionBookmarked(lockedQuiz.id, q)}
            onToggleBookmark={(q) =>
              toggleBookmarkQuestion({
                quiz: lockedQuiz,
                subjectName: subjectFilter || (isArabic ? 'عام' : 'General'),
                question: q,
              })
            }
            onOpenStudentDashboard={() => navigate('/student')}
            onSignInStudent={signInWithGoogle}
            authBusy={authBusy}
          />
        </main>
      </>
    );
  }

  if (!lockedQuiz) {
    return (
      <>
        <Navbar
          viewMode="student_dashboard"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <CloudLoadingState
          status="not-found"
          title={
            practiceMode === 'mistakes'
              ? isArabic
                ? 'لا توجد أخطاء للتدريب عليها حالياً'
                : 'No Mistakes to Practice'
              : isArabic
              ? 'لا توجد أسئلة محفوظة للتدريب'
              : 'No Bookmarks to Practice'
          }
          subtitle={
            isArabic
              ? 'عد إلى لوحة الطالب لاختيار اختبار أو قسم آخر.'
              : 'Return to Student Hub to choose another quiz or section.'
          }
          onBackHome={() => navigate('/student')}
        />
      </>
    );
  }

  return (
    <>
      <Navbar
        viewMode="student_runner"
        onNavigate={() => {}}
        selectedSubject={null}
        selectedTopic={null}
        selectedQuiz={lockedQuiz}
        onBackToTopics={() => navigate('/student')}
      />
      <main className="flex-1">
        <QuizRunner
          key={`${lockedQuiz.id}-${sessionKey}`}
          quiz={lockedQuiz}
          onFinishQuiz={(results) => {
            clearQuizProgress(lockedQuiz.id);
            setPracticeResults(results);
            recordQuizCompletion({
              quiz: lockedQuiz,
              subjectName: subjectFilter || (isArabic ? 'عام' : 'General'),
              isPrivateQuiz: true,
              practiceMode,
              results,
            }).catch(console.error);
          }}
          onExit={() => navigate('/student')}
          isStudentSignedIn={Boolean(studentUser)}
          isQuestionBookmarked={(q) => isQuestionBookmarked(lockedQuiz.id, q)}
          onToggleBookmark={(q) =>
            toggleBookmarkQuestion({
              quiz: lockedQuiz,
              subjectName: subjectFilter || (isArabic ? 'عام' : 'General'),
              question: q,
            })
          }
        />
      </main>
    </>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const { recordQuizCompletion } = useStudentAuth();

  // Teacher authentication state
  const teacherSession = useTeacherSession();
  const currentTeacher = teacherSession.teacher;
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);

  // قائمة المعلمين تُقرأ من Firestore، والقواعد تسمح بها للمدير فقط
  useEffect(() => {
    if (currentTeacher?.role !== 'admin') {
      setTeachers([]);
      return;
    }
    return subscribeToTeachers(setTeachers, (err) => console.warn('Teachers list unavailable:', err));
  }, [currentTeacher?.role]);

  // Persistence states
  const [subjects, setSubjects] = useState<Subject[]>(() => getSubjects());
  const [topics, setTopics] = useState<Topic[]>(() => getTopics());
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => getQuizzes());

  // Cloud sync readiness flags (prevents deep links from redirecting before Firestore loads)
  const [subjectsLoaded, setSubjectsLoaded] = useState<boolean>(false);
  const [topicsLoaded, setTopicsLoaded] = useState<boolean>(false);
  const [quizzesLoaded, setQuizzesLoaded] = useState<boolean>(false);
  const hasAttemptedSeedRef = useRef<boolean>(false);

  // Navigation states
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  // Active quiz results state
  const [quizResults, setQuizResults] = useState<{
    score: number;
    totalMCQs: number;
    totalWritten: number;
    userAnswers: Record<string, string>;
    writtenInputData: Record<string, string>;
    writtenGradingData: Record<string, AIWrittenGradingResult>;
    questions: Question[];
    timeSpentSeconds: number;
  } | null>(null);

  // Upsert helpers for direct single-doc deep links
  const handleSubjectLoadedFromDeepLink = useCallback((loaded: Subject) => {
    setSubjects((prev) => (prev.some((s) => s.id === loaded.id) ? prev : [...prev, loaded]));
  }, []);

  const handleTopicLoadedFromDeepLink = useCallback((loaded: Topic) => {
    setTopics((prev) => (prev.some((t) => t.id === loaded.id) ? prev : [...prev, loaded]));
  }, []);

  const handleQuizLoadedFromDeepLink = useCallback((loaded: Quiz) => {
    setQuizzes((prev) => (prev.some((q) => q.id === loaded.id) ? prev : [loaded, ...prev]));
  }, []);

  // Real-time synchronization with Firestore Cloud Database
  // المسودات تظهر للمعلم المصرح له فقط؛ الطالب يسمع المنشور فقط.
  // عند تغيّر حالة المعلم (دخول/خروج) نعيد الاشتراك بالنطاق الصحيح.
  const canSeeDrafts = teacherSession.status === 'ready';
  useEffect(() => {
    const unsubQuizzes = subscribeToQuizzes(
      (cloudQuizzes) => {
        setQuizzesLoaded(true);
        setQuizzes(cloudQuizzes); // نستبدل القائمة كاملة حتى تختفي المسودات عند الخروج
      },
      () => {
        setQuizzesLoaded(true);
      },
      canSeeDrafts
    );
    return () => unsubQuizzes();
  }, [canSeeDrafts]);

  // ترحيل لمرة واحدة: الاختبارات القديمة بدون حقل isPublished تُعتبر منشورة
  const publishFlagsBackfilledRef = useRef(false);
  useEffect(() => {
    if (teacherSession.status !== 'ready' || publishFlagsBackfilledRef.current) return;
    publishFlagsBackfilledRef.current = true;
    backfillQuizPublishFlags().catch((err) =>
      console.warn('Publish-flag backfill skipped:', err)
    );
  }, [teacherSession.status, currentTeacher?.role]);

  useEffect(() => {
    // Safety timeout so offline/blocked networks never stall loading screens indefinitely
    const safetyTimer = setTimeout(() => {
      setSubjectsLoaded(true);
      setTopicsLoaded(true);
      setQuizzesLoaded(true);
    }, 8000);

    // Subscribe to subjects in real-time (and seed only if cloud is empty)
    const unsubSubjects = subscribeToSubjects(
      (cloudSubjects) => {
        setSubjectsLoaded(true);
        if (cloudSubjects && cloudSubjects.length > 0) {
          setSubjects(cloudSubjects);
        } else if (!hasAttemptedSeedRef.current) {
          hasAttemptedSeedRef.current = true;
          seedInitialCloudDataIfNeeded(getSubjects(), getTopics(), getQuizzes()).catch(console.error);
        }
      },
      () => {
        setSubjectsLoaded(true);
      }
    );

    // Subscribe to topics in real-time
    const unsubTopics = subscribeToTopics(
      (cloudTopics) => {
        setTopicsLoaded(true);
        if (cloudTopics && cloudTopics.length > 0) {
          setTopics(cloudTopics);
        }
      },
      () => {
        setTopicsLoaded(true);
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      unsubSubjects();
      unsubTopics();
      
    };
  }, []);

  // Auto-sync local storage as cache / offline fallback
  useEffect(() => {
    saveSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    saveTopics(topics);
  }, [topics]);

  useEffect(() => {
    saveQuizzes(quizzes);
  }, [quizzes]);

  // Teacher Account Management Handlers
  const handleAddTeacher = async (teacherData: { email: string; displayName: string }): Promise<void> => {
    if (!currentTeacher) return;
    await addTeacherByEmail({ ...teacherData, addedBy: currentTeacher.username });
  };

  const handleDeleteTeacher = async (teacherId: string): Promise<void> => {
    await removeTeacher(teacherId);
  };

  // Subject Handlers
  const handleSaveSubject = (newOrUpdatedSubject: Subject) => {
    setSubjects((prev) => {
      const idx = prev.findIndex((s) => s.id === newOrUpdatedSubject.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newOrUpdatedSubject;
        return next;
      }
      return [...prev, newOrUpdatedSubject];
    });
    // Persist to Cloud Firestore
    saveSubjectToCloud(newOrUpdatedSubject).catch(console.error);
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    setTopics((prev) => prev.filter((t) => t.subjectId !== subjectId));
    setQuizzes((prev) => prev.filter((q) => q.subjectId !== subjectId));
    // Remove from Cloud Firestore
    deleteSubjectFromCloud(subjectId).catch(console.error);
  };

  // Topic Handlers
  const handleSaveTopic = (newOrUpdatedTopic: Topic) => {
    setTopics((prev) => {
      const idx = prev.findIndex((t) => t.id === newOrUpdatedTopic.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newOrUpdatedTopic;
        return next;
      }
      return [...prev, newOrUpdatedTopic];
    });
    // Persist to Cloud Firestore
    saveTopicToCloud(newOrUpdatedTopic).catch(console.error);
  };

  const handleDeleteTopic = (topicId: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    setQuizzes((prev) => prev.filter((q) => q.topicId !== topicId));
    // Remove from Cloud Firestore
    deleteTopicFromCloud(topicId).catch(console.error);
  };

  // Quiz Handlers
  const handleSaveQuiz = (newOrUpdatedQuiz: Quiz) => {
    setQuizzes((prev) => {
      const idx = prev.findIndex((q) => q.id === newOrUpdatedQuiz.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newOrUpdatedQuiz;
        return next;
      }
      return [newOrUpdatedQuiz, ...prev];
    });
    // Persist to Cloud Firestore
    saveQuizToCloud(newOrUpdatedQuiz).catch(console.error);
  };

  const handleDeleteQuiz = (quizId: string) => {
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    // Remove from Cloud Firestore
    deleteQuizFromCloud(quizId).catch(console.error);
  };

  // Student Navigation Flows
  const handleStudentSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedTopic(null);
    navigate(`/subject/${subject.id}`);
  };

  const handleStudentSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    navigate(`/topic/${topic.id}`);
  };

  const handleStartQuiz = (quiz: Quiz, custom?: { limit?: number; qType?: 'all' | 'mcq' | 'written' }) => {
    setActiveQuiz(quiz);
    setQuizResults(null);
    if (custom?.limit || (custom?.qType && custom.qType !== 'all')) {
      clearQuizProgress(quiz.id);
      const params = new URLSearchParams();
      if (custom.limit) params.set('limit', String(custom.limit));
      if (custom.qType && custom.qType !== 'all') params.set('qtype', custom.qType);
      navigate(`/quiz/${quiz.id}?${params.toString()}`);
    } else {
      navigate(`/quiz/${quiz.id}`);
    }
  };

  const handleFinishQuiz = (results: {
    score: number;
    totalMCQs: number;
    totalWritten: number;
    userAnswers: Record<string, string>;
    writtenInputData: Record<string, string>;
    writtenGradingData: Record<string, AIWrittenGradingResult>;
    questions: Question[];
    timeSpentSeconds: number;
  }) => {
    if (activeQuiz) {
      clearQuizProgress(activeQuiz.id);
      const matchedSubject =
        (selectedSubject && selectedSubject.id === activeQuiz.subjectId ? selectedSubject : null) ||
        subjects.find((s) => s.id === activeQuiz.subjectId) ||
        null;
      recordQuizCompletion({
        quiz: activeQuiz,
        subjectName: matchedSubject?.name || (isArabic ? 'عام' : 'General'),
        isPrivateQuiz: false,
        practiceMode: null,
        results,
      }).catch(console.error);
    }
    setQuizResults(results);
    navigate(`/quiz/${activeQuiz?.id}/results`);
  };

  const handleRetakeQuiz = (quizToRetake: Quiz) => {
    clearQuizProgress(quizToRetake.id);
    setActiveQuiz(quizToRetake);
    setQuizResults(null);
    navigate(`/quiz/${quizToRetake.id}`);
  };

  const handleTeacherLogout = async () => {
    await teacherSession.signOutTeacher();
    navigate('/');
  };

  const publicQuizzes = React.useMemo(
    () => quizzes.filter((q) => q.isPublished !== false),
    [quizzes]
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors duration-200" dir={isArabic ? 'rtl' : 'ltr'}>
      <Routes>
        {/* Home Landing Gateway */}
        <Route path="/" element={
          <>
            <Navbar viewMode="student_home" onNavigate={() => {}} selectedSubject={null} selectedTopic={null} selectedQuiz={null} onBackToSubjects={() => navigate('/courses')} onBackToTopics={() => {}} />
            <main className="flex-1">
              <HomeView
                subjects={subjects}
                topics={topics}
                quizzes={publicQuizzes}
                onSelectSubject={handleStudentSelectSubject}
                onStartQuiz={(quiz) => {
                  const matchedSub = subjects.find((s) => s.id === quiz.subjectId);
                  const matchedTop = topics.find((t) => t.id === quiz.topicId);
                  if (matchedSub) setSelectedSubject(matchedSub);
                  if (matchedTop) setSelectedTopic(matchedTop);
                  handleStartQuiz(quiz);
                }}
              />
            </main>
          </>
        } />

        {/* Browse All Courses & Quizzes (No Sign-In Required) */}
        <Route path="/courses" element={
          <>
            <Navbar viewMode="student_subjects" onNavigate={() => {}} selectedSubject={null} selectedTopic={null} selectedQuiz={null} onBackToSubjects={() => navigate('/')} onBackToTopics={() => {}} />
            <main className="flex-1">
              <StudentSubjectsView
                subjects={subjects}
                topics={topics}
                quizzes={publicQuizzes}
                onSelectSubject={handleStudentSelectSubject}
                onSelectTopic={(topic) => {
                  const matchedSub = subjects.find((s) => s.id === topic.subjectId);
                  if (matchedSub) setSelectedSubject(matchedSub);
                  handleStudentSelectTopic(topic);
                }}
                onStartQuiz={(quiz) => {
                  const matchedSub = subjects.find((s) => s.id === quiz.subjectId);
                  const matchedTop = topics.find((t) => t.id === quiz.topicId);
                  if (matchedSub) setSelectedSubject(matchedSub);
                  if (matchedTop) setSelectedTopic(matchedTop);
                  handleStartQuiz(quiz);
                }}
              />
            </main>
          </>
        } />

        {/* Student Hub & Private / Practice Routes */}
        <Route path="/student" element={
          <>
            <Navbar
              viewMode="student_dashboard"
              onNavigate={() => {}}
              selectedSubject={null}
              selectedTopic={null}
              selectedQuiz={null}
              onBackToSubjects={() => navigate('/')}
              onBackToTopics={() => {}}
            />
            <main className="flex-1">
              <StudentDashboard subjects={subjects} publicQuizzes={publicQuizzes} />
            </main>
          </>
        } />

        <Route path="/student/quiz/:privateQuizId" element={<PrivateQuizRunnerRoute />} />
        <Route path="/student/practice/:mode" element={<PracticeQuizRunnerRoute />} />

        <Route path="/subject/:subjectId" element={
          <SubjectViewRoute
            subjects={subjects}
            topics={topics}
            quizzes={publicQuizzes}
            isSubjectsLoaded={subjectsLoaded}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
            onSubjectLoaded={handleSubjectLoadedFromDeepLink}
            onSelectTopic={handleStudentSelectTopic}
            onStartQuiz={handleStartQuiz}
          />
        } />

        <Route path="/topic/:topicId" element={
          <TopicViewRoute
            subjects={subjects}
            topics={topics}
            quizzes={publicQuizzes}
            isSubjectsLoaded={subjectsLoaded}
            isTopicsLoaded={topicsLoaded}
            selectedSubject={selectedSubject}
            selectedTopic={selectedTopic}
            onSelectSubject={setSelectedSubject}
            onSelectTopic={setSelectedTopic}
            onSubjectLoaded={handleSubjectLoadedFromDeepLink}
            onTopicLoaded={handleTopicLoadedFromDeepLink}
            onStartQuiz={handleStartQuiz}
          />
        } />

        <Route path="/quiz/:quizId" element={
          <QuizRunnerRoute
            quizzes={quizzes}
            subjects={subjects}
            topics={topics}
            isQuizzesLoaded={quizzesLoaded}
            activeQuiz={activeQuiz}
            selectedSubject={selectedSubject}
            selectedTopic={selectedTopic}
            onSetActiveQuiz={setActiveQuiz}
            onQuizLoaded={handleQuizLoadedFromDeepLink}
            onFinishQuiz={handleFinishQuiz}
            onExitToTopic={(topicId) => {
              if (topicId) {
                navigate(`/topic/${topicId}`);
              } else if (selectedSubject) {
                navigate(`/subject/${selectedSubject.id}`);
              } else {
                navigate('/courses');
              }
            }}
          />
        } />

        <Route path="/quiz/:quizId/results" element={
          <QuizResultsRoute
            quizzes={quizzes}
            subjects={subjects}
            topics={topics}
            isQuizzesLoaded={quizzesLoaded}
            activeQuiz={activeQuiz}
            selectedSubject={selectedSubject}
            selectedTopic={selectedTopic}
            quizResults={quizResults}
            onRetakeQuiz={handleRetakeQuiz}
          />
        } />

        {/* Teacher Routes */}
        <Route path="/teacher/*" element={
          <div className="flex-1 flex flex-col">
            <Navbar viewMode="teacher_dashboard" onNavigate={() => {}} selectedSubject={null} selectedTopic={null} selectedQuiz={null} onBackToSubjects={() => {}} onBackToTopics={() => {}} hideLogo={true} />
            <main className="flex-1">
              {currentTeacher ? (
                <TeacherDashboard
                  currentTeacher={currentTeacher}
                  teachers={teachers}
                  onAddTeacher={handleAddTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
                  subjects={subjects}
                  topics={topics}
                  quizzes={quizzes}
                  onSaveSubject={handleSaveSubject}
                  onDeleteSubject={handleDeleteSubject}
                  onSaveTopic={handleSaveTopic}
                  onDeleteTopic={handleDeleteTopic}
                  onSaveQuiz={handleSaveQuiz}
                  onDeleteQuiz={handleDeleteQuiz}
                  onTestQuizAsStudent={(quiz) => {
                    const sub = subjects.find((s) => s.id === quiz.subjectId);
                    const top = topics.find((t) => t.id === quiz.topicId);
                    if (sub) setSelectedSubject(sub);
                    if (top) setSelectedTopic(top);
                    handleStartQuiz(quiz);
                  }}
                  onLogout={handleTeacherLogout}
                />
              ) : (
                <TeacherLogin
                  status={teacherSession.status}
                  email={teacherSession.email}
                  error={teacherSession.error}
                  onSignIn={teacherSession.signIn}
                  onSignOut={teacherSession.signOutTeacher}
                  onCancel={() => navigate('/')}
                />
              )}
            </main>
          </div>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <StudentAuthProvider>
          <AppContent />
        </StudentAuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;

```


---

## `src/components/CloudLoadingState.tsx`

```tsx
import React from 'react';
import { Loader2, AlertCircle, ArrowLeft, ArrowRight, Cloud } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface CloudLoadingStateProps {
  status: 'loading' | 'not-found';
  title?: string;
  subtitle?: string;
  onBackHome?: () => void;
}

export const CloudLoadingState: React.FC<CloudLoadingStateProps> = ({
  status,
  title,
  subtitle,
  onBackHome,
}) => {
  const { isArabic } = useLanguage();
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-7 text-center">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 relative">
            <Cloud className="w-5 h-5" />
            <Loader2 className="w-11 h-11 animate-spin text-blue-500/40 absolute inset-0" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1.5">
            {title || (isArabic ? 'جاري تحميل البيانات...' : 'Loading from Cloud...')}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {subtitle ||
              (isArabic
                ? 'يتم الآن جلب المحتوى المطلوب من قاعدة البيانات، لحظات من فضلك.'
                : 'Fetching the requested content from the cloud database, please wait a moment.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-7 text-center">
        <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1.5">
          {title || (isArabic ? 'لم يتم العثور على المحتوى' : 'Content Not Found')}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          {subtitle ||
            (isArabic
              ? 'قد يكون الرابط غير صحيح أو تم حذف هذا المحتوى من قِبل المعلم.'
              : 'The link may be invalid or this content may have been removed.')}
        </p>
        {onBackHome && (
          <button
            onClick={onBackHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[40px] px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <BackIcon className="w-4 h-4" />
            <span>{isArabic ? 'العودة للصفحة الرئيسية' : 'Back to Home'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

```


---

## `src/components/ExamModeToggle.tsx`

```tsx
import React from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ExamModeToggleProps {
  isExamMode: boolean;
  onToggle: (checked: boolean) => void;
  className?: string;
}

export const ExamModeToggle: React.FC<ExamModeToggleProps> = ({
  isExamMode,
  onToggle,
  className = '',
}) => {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => onToggle(!isExamMode)}
      className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl cursor-pointer transition-colors select-none border text-xs font-semibold whitespace-nowrap ${
        isExamMode
          ? 'bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      } ${className}`}
      title={isExamMode ? 'Exam Mode: answers shown after completion' : 'Instant Mode: immediate feedback per question'}
    >
      {isExamMode ? (
        <FileText className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="hidden xs:inline sm:inline">{isExamMode ? t('examModeActive') : t('instantModeActive')}</span>
    </button>
  );
};

```


---

## `src/components/HomeView.tsx`

```tsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, GraduationCap, ShieldCheck } from 'lucide-react';
import { Subject, Topic, Quiz } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useResumableQuizzes } from '../hooks/useResumableQuizzes';
import { BRAND } from '../config/brand';
import { Logo } from './Logo';
import { ResumeBanner } from './ResumeBanner';
import { RulerStats } from './ui/Ruler';
import { buttonClass } from './ui/Button';

interface HomeViewProps {
  subjects: Subject[];
  topics: Topic[];
  quizzes: Quiz[];
  onSelectSubject: (subject: Subject) => void;
  onStartQuiz: (quiz: Quiz) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  subjects,
  topics,
  quizzes,
  onSelectSubject,
  onStartQuiz,
}) => {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const { studentUser, studentProfile, attempts, mistakes, privateQuizzes } = useStudentAuth();
  const { items: resumable, discard } = useResumableQuizzes(quizzes, privateQuizzes);

  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  const totalQuestions = useMemo(
    () => quizzes.reduce((acc, q) => acc + q.questions.length, 0),
    [quizzes]
  );
  const featuredSubjects = useMemo(() => subjects.slice(0, 5), [subjects]);
  const firstName = studentProfile?.displayName?.split(' ')[0] || '';

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12 sm:space-y-16">
        {/* ───── المدخل: الجملة الأساسية + أزرار البدء + المسطرة ───── */}
        <section className="space-y-8">
          <div className="max-w-3xl space-y-5">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.2]">
              {isArabic ? BRAND.taglineAr : BRAND.taglineEn}
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-8">
              {isArabic
                ? 'حل اختبارات مقرراتك مباشرة بدون تسجيل دخول. وإن سجّلت، حفظنا لك نتائجك وجمعنا أخطاءك في مكان واحد لتراجعها.'
                : 'Take course quizzes right away, no account needed. Sign in and we keep your results and collect your mistakes in one place to review.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/courses')}
              className={buttonClass('primary', 'lg')}
            >
              <span>{isArabic ? 'ابدأ الحل' : 'Start practicing'}</span>
              <ArrowIcon className="w-4 h-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/student')}
              className={buttonClass('secondary', 'lg')}
            >
              {studentUser
                ? isArabic
                  ? 'لوحتي'
                  : 'My hub'
                : isArabic
                ? 'تسجيل الدخول'
                : 'Sign in'}
            </button>
          </div>

          <RulerStats
            className="pt-4"
            stats={[
              { label: isArabic ? 'مقرر' : 'Courses', value: subjects.length },
              { label: isArabic ? 'موضوع' : 'Topics', value: topics.length },
              { label: isArabic ? 'اختبار' : 'Quizzes', value: quizzes.length },
              { label: isArabic ? 'سؤال' : 'Questions', value: totalQuestions },
            ]}
          />
        </section>

        {/* ───── استكمال ما بدأه الطالب ───── */}
        <ResumeBanner
          items={resumable}
          onDiscard={discard}
          onResume={(item) =>
            item.isPrivate ? navigate(`/student/quiz/${item.quiz.id}`) : onStartQuiz(item.quiz)
          }
        />

        {/* ───── أين تبدأ: المقررات (الأهم) + الطالب + المعلم ───── */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* المقررات */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {isArabic ? 'المقررات' : 'Courses'}
              </h2>
              {subjects.length > featuredSubjects.length && (
                <button
                  type="button"
                  onClick={() => navigate('/courses')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <span>{isArabic ? `كل المقررات (${subjects.length})` : `All courses (${subjects.length})`}</span>
                  <ArrowIcon className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>

            {featuredSubjects.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-center">
                {isArabic
                  ? 'لا توجد مقررات بعد. سيظهر هنا أي مقرر ينشره المعلم.'
                  : 'No courses yet. Courses published by teachers will appear here.'}
              </p>
            ) : (
              <ul className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
                {featuredSubjects.map((subject) => {
                  const topicsCount = topics.filter((tp) => tp.subjectId === subject.id).length;
                  const quizzesCount = quizzes.filter((q) => q.subjectId === subject.id).length;
                  return (
                    <li key={subject.id}>
                      <button
                        type="button"
                        onClick={() => onSelectSubject(subject)}
                        className="group w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-start hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                            {subject.name}
                          </h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
                            {isArabic
                              ? `${topicsCount} موضوع · ${quizzesCount} اختبار`
                              : `${topicsCount} topics, ${quizzesCount} quizzes`}
                          </p>
                        </div>
                        <ArrowIcon className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* الطالب والمعلم */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {isArabic ? 'حسابك' : 'Your space'}
            </h2>

            <button
              type="button"
              onClick={() => navigate('/student')}
              className="group w-full text-start bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-600/60 dark:hover:border-blue-500/60 rounded-xl p-5 space-y-3 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {studentUser
                    ? isArabic
                      ? `أهلاً ${firstName || 'بك'}`
                      : `Welcome${firstName ? `, ${firstName}` : ''}`
                    : isArabic
                    ? 'لوحة الطالب'
                    : 'Student hub'}
                </h3>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-7">
                {studentUser
                  ? isArabic
                    ? `${attempts.length} محاولة محفوظة، و${mistakes.length} سؤال في بنك الأخطاء.`
                    : `${attempts.length} saved attempts and ${mistakes.length} questions in your mistakes bank.`
                  : isArabic
                  ? 'سجّل دخولك بحساب Google لحفظ النتائج، ومراجعة الأخطاء، وبناء اختبارات خاصة بك.'
                  : 'Sign in with Google to save results, review mistakes, and build your own private quizzes.'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/teacher')}
              className="group w-full text-start border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl p-5 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <span className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {isArabic ? 'بوابة المعلم' : 'Teacher portal'}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {isArabic ? 'أنشئ الاختبارات وانشرها' : 'Build and publish quizzes'}
                </p>
              </div>
              <ArrowIcon className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>
          </div>
        </section>
      </div>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <Logo size="sm" />
          <nav className="flex items-center gap-5 font-medium">
            <button type="button" onClick={() => navigate('/courses')} className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">
              {isArabic ? 'المقررات' : 'Courses'}
            </button>
            <button type="button" onClick={() => navigate('/student')} className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">
              {isArabic ? 'لوحة الطالب' : 'Student hub'}
            </button>
            <button type="button" onClick={() => navigate('/teacher')} className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">
              {isArabic ? 'بوابة المعلم' : 'Teacher portal'}
            </button>
          </nav>
        </div>
      </footer>
    </div>
  );
};

```


---

## `src/components/LanguageToggle.tsx`

```tsx
import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { buttonClass } from './ui/Button';

interface LanguageToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  className = '',
  showLabel = true,
}) => {
  const { language, toggleLanguage, isArabic } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      className={buttonClass('secondary', 'sm', className)}
      title={isArabic ? 'Switch to English' : 'التحويل إلى اللغة العربية'}
    >
      <Languages className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
      {showLabel && (
        <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
      )}
    </button>
  );
};

```


---

## `src/components/Logo.tsx`

```tsx
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { brandName } from '../config/brand';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  subtitle?: string;
}

/**
 * شعار مقياس: مسطرة بتدريج، وعلى التدريج مؤشر كهرماني (الإبرة).
 * الرمز نفسه هو فكرة الاسم: "قياس".
 */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
    <rect width="32" height="32" rx="8" className="fill-blue-600 dark:fill-blue-500" />
    {/* خط المسطرة */}
    <path d="M6 22h20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    {/* التدريج: طويلة/قصيرة بالتناوب */}
    <path
      d="M6 22v-7M11 22v-4M16 22v-7M21 22v-4M26 22v-7"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.92"
    />
    {/* المؤشر */}
    <path d="M18.6 6h4.8L21 11.2z" className="fill-marker" />
  </svg>
);

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  subtitle,
}) => {
  const { isArabic } = useLanguage();
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <LogoMark className={`${iconSize} shrink-0`} />

      {showText && (
        <div className="flex flex-col text-start leading-tight">
          <span className={`${textSize} font-bold tracking-tight text-zinc-900 dark:text-zinc-50`}>
            {brandName(isArabic)}
          </span>
          {subtitle && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

```
