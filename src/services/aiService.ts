import { Question, AIWrittenGradingResult } from '../types';
import { auth } from '../firebase';

/** يرسل توكن Firebase للسيرفر ليحدد هويتك ودورك. الزائر بدون توكن (يُحسب بالـ IP). */
async function authHeaders(): Promise<Record<string, string>> {
  try {
    const user = auth?.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export interface StudentAiQuota {
  used: number;
  limit: number;
  remaining: number;
  dateKey?: string;
}

export interface GenerateQuizOptions {
  content: string;
  images?: Array<{ data: string; mimeType: string }>;
  mode?: 'generate' | 'format_existing';
  count?: number;
  mcqCount?: number;
  writtenCount?: number;
  questionType?: 'mcq' | 'written' | 'mixed';
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  language?: 'ar' | 'en' | 'auto';
  lectureTitle?: string;
  userRole?: 'student' | 'teacher';
  userId?: string;
}

export interface GeneratedQuizResult {
  quizTitle: string;
  description: string;
  questions: Question[];
  quota?: StudentAiQuota;
}

export interface GradeWrittenOptions {
  question: string;
  modelAnswer: string;
  studentAnswer: string;
  language?: 'ar' | 'en';
}

export async function fetchStudentAiQuota(_uid?: string): Promise<StudentAiQuota> {
  try {
    const res = await fetch('/api/ai/student-quota', { headers: await authHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch student AI quota:', err);
  }
  return { used: 0, limit: 5, remaining: 5 };
}

/**
 * Generate quiz questions using Gemini API via backend proxy
 */
async function requestQuizSingleCall(options: GenerateQuizOptions): Promise<GeneratedQuizResult> {
  const maxAttempts = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
        },
        body: JSON.stringify(options),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();
      let parsedBody: any = null;
      try {
        parsedBody = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsedBody = null;
      }

      if (!response.ok || !parsedBody || typeof parsedBody !== 'object') {
        const errorData = parsedBody && typeof parsedBody === 'object' ? parsedBody : {};
        const looksLikeHtml = /^\s*</.test(rawText);
        const detailedMsg = errorData.details
          ? `${errorData.error || 'خطأ في التوليد'}: ${errorData.details}`
          : errorData.error ||
            (response.status === 503 || looksLikeHtml
              ? 'خدمة الذكاء الاصطناعي مزدحمة مؤقتاً أو استغرقت الاستجابة وقتاً طويلاً. يرجى المحاولة مرة أخرى بعد قليل.'
              : response.status === 429
              ? 'تم تجاوز الحد المؤقت للطلبات. يرجى الانتظار دقيقة ثم المحاولة مجدداً.'
              : rawText && rawText.length < 250
              ? rawText
              : `خطأ في الخادم (${response.status})`);
        throw new Error(detailedMsg);
      }

      const data = parsedBody;
      return {
        quizTitle: data.quizTitle || 'اختبار مولّد',
        description: data.description || '',
        questions: data.questions || [],
        quota: data.quota,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      const isNetworkError =
        err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(String(err?.message || ''));
      if (isNetworkError && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (err?.name === 'AbortError') {
        throw new Error('استغرقت العملية وقتاً أطول من المتوقع أثناء معالجة المحتوى. يرجى المحاولة مرة أخرى.');
      }
      if (isNetworkError) {
        throw new Error('تعذّر الاتصال بخادم الذكاء الاصطناعي أو انقطع الاتصال مؤقتاً. تأكد من الاتصال وحاول مرة أخرى.');
      }
      throw err;
    }
  }

  throw lastError || new Error('فشل توليد الأسئلة بواسطة الذكاء الاصطناعي.');
}

/**
 * Generate quiz questions using Gemini API via backend proxy.
 * Splits large teacher image sets (> 5 images) into sequential 5-image requests
 * to keep each HTTP request fast and avoid proxy timeouts.
 */
export async function generateQuizFromAI(options: GenerateQuizOptions): Promise<GeneratedQuizResult> {
  const images = Array.isArray(options.images) ? options.images : [];
  const isStudent = options.userRole === 'student';

  if (!isStudent && images.length > 5) {
    const BATCH_SIZE = 5;
    const totalBatches = Math.ceil(images.length / BATCH_SIZE);
    const totalCount = Math.max(1, Number(options.count) || 5);
    let remainingMcq =
      typeof options.mcqCount === 'number' ? options.mcqCount : Math.round(totalCount * 0.7);
    let remainingWritten =
      typeof options.writtenCount === 'number'
        ? options.writtenCount
        : Math.max(0, totalCount - remainingMcq);

    const allQuestions: Question[] = [];
    let finalTitle = options.lectureTitle?.trim() || '';
    let finalDescription = '';

    for (let i = 0; i < totalBatches; i++) {
      const batchImages = images.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const batchesLeft = totalBatches - i;
      const batchMcq = Math.round(remainingMcq / batchesLeft);
      const batchWritten = Math.round(remainingWritten / batchesLeft);
      remainingMcq -= batchMcq;
      remainingWritten -= batchWritten;

      const res = await requestQuizSingleCall({
        ...options,
        content: i === 0 ? options.content : '',
        images: batchImages,
        ...(options.mode === 'format_existing'
          ? {}
          : {
              count: Math.max(1, batchMcq + batchWritten),
              mcqCount: batchMcq,
              writtenCount: batchWritten,
              questionType:
                batchMcq > 0 && batchWritten > 0 ? 'mixed' : batchMcq > 0 ? 'mcq' : 'written',
            }),
      });

      if (!finalTitle && res.quizTitle) finalTitle = res.quizTitle;
      if (!finalDescription && res.description) finalDescription = res.description;
      if (Array.isArray(res.questions)) {
        allQuestions.push(...res.questions);
      }
    }

    return {
      quizTitle: options.lectureTitle?.trim() || finalTitle || 'اختبار مولّد',
      description: finalDescription,
      questions: allQuestions,
    };
  }

  return requestQuizSingleCall(options);
}

/**
 * Evaluate a student's written response using semantic AI grading via backend proxy
 * Falls back to local heuristic if server is unavailable
 */
export async function gradeWrittenAnswerAI(options: GradeWrittenOptions): Promise<AIWrittenGradingResult> {
  try {
    const response = await fetch('/api/ai/grade-written', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      },
      body: JSON.stringify(options),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          isCorrect: Boolean(data.isCorrect),
          score: Number(data.score) || 0,
          rating: data.isCorrect ? 'WRITTEN_CORRECT' : 'WRITTEN_WRONG',
          statusText: data.statusText || (data.isCorrect ? 'إجابة مقبولة' : 'إجابة غير مكتملة'),
          feedback: data.feedback || '',
          keyPointsMatched: Array.isArray(data.keyPointsMatched) ? data.keyPointsMatched : [],
          missingPoints: Array.isArray(data.missingPoints) ? data.missingPoints : [],
        };
      }
    }
  } catch (err) {
    console.warn('AI grading request failed, using intelligent heuristic fallback:', err);
  }

  // Graceful heuristic fallback if backend or API is unreachable
  return fallbackHeuristicGrading(options.studentAnswer, options.modelAnswer, options.language === 'en');
}

/**
 * Fallback semantic & token heuristic grading when offline
 */
function fallbackHeuristicGrading(studentText: string, modelAnswer: string, isEnglish: boolean): AIWrittenGradingResult {
  const cleanStudent = studentText.toLowerCase().trim();
  const cleanModel = modelAnswer.toLowerCase().trim();
  const isExact = cleanStudent === cleanModel;

  const modelWords = cleanModel.split(/[\s,.;:!?،؟]+/).filter((w) => w.length > 2);
  const studentWordSet = new Set(cleanStudent.split(/[\s,.;:!?،؟]+/).filter((w) => w.length > 2));

  const matchedWords: string[] = [];
  const missingWords: string[] = [];

  modelWords.forEach((word) => {
    if (studentWordSet.has(word)) {
      if (!matchedWords.includes(word)) matchedWords.push(word);
    } else {
      if (!missingWords.includes(word)) missingWords.push(word);
    }
  });

  const ratio = modelWords.length > 0 ? matchedWords.length / modelWords.length : 0.5;
  const score = isExact ? 100 : Math.min(100, Math.max(20, Math.round(ratio * 100)));
  const isCorrect = score >= 50;

  return {
    isCorrect,
    score,
    rating: isCorrect ? 'WRITTEN_CORRECT' : 'WRITTEN_WRONG',
    statusText: isCorrect
      ? (isEnglish ? 'Answer Acceptable' : 'إجابة مقبولة')
      : (isEnglish ? 'Answer Incomplete' : 'إجابة غير مكتملة'),
    feedback: isEnglish
      ? 'Evaluated using local matching. Compare your answer with the official model answer.'
      : 'تم التقييم ومطابقة المفاهيم الأساسية. يرجى مقارنة إجابتك بالإجابة النموذجية المعتمدة.',
    keyPointsMatched: matchedWords.slice(0, 4),
    missingPoints: missingWords.slice(0, 3),
  };
}

