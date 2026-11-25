import React from 'react';
import { Play, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ResumableQuiz } from '../hooks/useResumableQuizzes';
import { RulerProgress } from './ui/Ruler';
import { buttonClass } from './ui/Button';

interface ResumeBannerProps {
  items: ResumableQuiz[];
  onResume: (item: ResumableQuiz) => void;
  onDiscard: (quizId: string) => void;
  /** أقصى عدد يُعرض */
  limit?: number;
}

/** قائمة "أكمل من حيث توقفت": تظهر فقط لو فيه اختبارات غير مكتملة */
export const ResumeBanner: React.FC<ResumeBannerProps> = ({ items, onResume, onDiscard, limit = 4 }) => {
  const { isArabic } = useLanguage();
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="resume-heading" className="space-y-3">
      <h2 id="resume-heading" className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
        {isArabic ? 'أكمل من حيث توقفت' : 'Pick up where you left off'}
      </h2>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.slice(0, limit).map((item) => (
          <li
            key={item.quiz.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {item.quiz.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {isArabic
                    ? `${item.answeredCount} من ${item.total} سؤال`
                    : `${item.answeredCount} of ${item.total} answered`}
                  {item.isPrivate && (isArabic ? ' — اختبار خاص' : ' — private')}
                </p>
              </div>
              <RulerProgress value={item.answeredCount} max={item.total} />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onResume(item)}
                className={buttonClass('primary', 'sm')}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isArabic ? 'متابعة' : 'Resume'}</span>
              </button>
              <button
                type="button"
                onClick={() => onDiscard(item.quiz.id)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                title={isArabic ? 'حذف التقدم المحفوظ' : 'Discard saved progress'}
                aria-label={isArabic ? 'حذف التقدم المحفوظ' : 'Discard saved progress'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

