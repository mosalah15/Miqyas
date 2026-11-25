import { useCallback, useMemo, useState } from 'react';
import { Quiz, PrivateQuiz } from '../types';
import { listSavedQuizProgress, clearQuizProgress } from '../utils/storage';

export interface ResumableQuiz {
  quiz: Quiz;
  isPrivate: boolean;
  answeredCount: number;
  total: number;
}

/**
 * يجمع الاختبارات التي بدأها الطالب ولم يكمل حلها (من التخزين المحلي).
 * كان هذا المنطق مكرراً حرفياً في HomeView وStudentSubjectsView؛ صار هنا مرة واحدة.
 */
export const useResumableQuizzes = (publicQuizzes: Quiz[], privateQuizzes: PrivateQuiz[] = []) => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const items = useMemo<ResumableQuiz[]>(() => {
    const result: ResumableQuiz[] = [];
    for (const entry of listSavedQuizProgress()) {
      if (dismissed.includes(entry.quizId)) continue;

      const pub = publicQuizzes.find((q) => q.id === entry.quizId);
      if (pub) {
        result.push({
          quiz: pub,
          isPrivate: false,
          answeredCount: entry.answeredCount,
          total: entry.totalQuestions || pub.questions.length,
        });
        continue;
      }

      const priv = privateQuizzes.find((q) => q.id === entry.quizId);
      if (priv) {
        result.push({
          quiz: {
            id: priv.id,
            title: priv.title,
            subjectId: (priv as PrivateQuiz & { subjectId?: string }).subjectId || '',
            topicId: 'private',
            description: priv.description,
            questions: priv.questions,
            createdAt: priv.createdAt,
            updatedAt: priv.updatedAt || priv.createdAt,
            timeLimitMinutes: priv.timeLimitMinutes,
          },
          isPrivate: true,
          answeredCount: entry.answeredCount,
          total: entry.totalQuestions || priv.questions.length,
        });
      }
    }
    return result;
  }, [publicQuizzes, privateQuizzes, dismissed]);

  /** يحذف التقدم المحفوظ ويخفي الاختبار من القائمة */
  const discard = useCallback((quizId: string) => {
    clearQuizProgress(quizId);
    setDismissed((prev) => [...prev, quizId]);
  }, []);

  return { items, discard };
};

