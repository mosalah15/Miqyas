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

