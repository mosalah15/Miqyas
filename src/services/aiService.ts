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
export async function generateQuizFromAI(options: GenerateQuizOptions): Promise<GeneratedQuizResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for large multimodal content

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

    if (!response.ok) {
      let errorData: any = {};
      let rawText = '';
      try {
        rawText = await response.text();
        errorData = JSON.parse(rawText);
      } catch {
        // Response was not JSON
      }

      const detailedMsg = errorData.details
        ? `${errorData.error || 'خطأ في التوليد'}: ${errorData.details}`
        : errorData.error || (rawText && rawText.length < 250 ? rawText : `خطأ في الخادم (${response.status})`);
      throw new Error(detailedMsg);
    }

    const data = await response.json();
    return {
      quizTitle: data.quizTitle || 'اختبار مولّد',
      description: data.description || '',
      questions: data.questions || [],
      quota: data.quota,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('استغرقت العملية وقتاً أطول من المتوقع أثناء معالجة المحتوى. تم تحسين الصور وتسريع الاستجابة، يرجى المحاولة مرة أخرى.');
    }
    throw err;
  }
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

