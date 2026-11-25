import React, { useState, useEffect } from 'react';
import { Quiz } from '../../types';
import { X, SlidersHorizontal, Play } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface CustomPracticeModalProps {
  quiz: Quiz | null;
  onClose: () => void;
  onStartCustom: (quiz: Quiz, questionLimit: number, qType: 'all' | 'mcq' | 'written') => void;
}

export const CustomPracticeModal: React.FC<CustomPracticeModalProps> = ({
  quiz,
  onClose,
  onStartCustom,
}) => {
  const { isArabic } = useLanguage();
  const [qType, setQType] = useState<'all' | 'mcq' | 'written'>('all');
  const [count, setCount] = useState<number>(10);

  const mcqCount = quiz ? quiz.questions.filter((q) => q.type !== 'written').length : 0;
  const writtenCount = quiz ? quiz.questions.filter((q) => q.type === 'written').length : 0;
  const maxForType = !quiz
    ? 0
    : qType === 'mcq'
    ? mcqCount
    : qType === 'written'
    ? writtenCount
    : quiz.questions.length;

  useEffect(() => {
    if (quiz) {
      setQType('all');
      setCount(Math.min(10, quiz.questions.length));
    }
  }, [quiz]);

  useEffect(() => {
    if (maxForType > 0 && count > maxForType) {
      setCount(maxForType);
    }
  }, [maxForType, count]);

  if (!quiz) return null;

  const presets = [5, 10, 15, 20, 30].filter((n) => n < maxForType);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-5 text-start">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50">
                {isArabic ? 'تدريب سريع مخصص' : 'Custom Practice Session'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{quiz.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question Type Filter */}
        {mcqCount > 0 && writtenCount > 0 && (
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              {isArabic ? 'نوع الأسئلة:' : 'Question Type:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'all', label: isArabic ? `الكل (${quiz.questions.length})` : `All (${quiz.questions.length})` },
                  { id: 'mcq', label: isArabic ? `اختيار (${mcqCount})` : `MCQ (${mcqCount})` },
                  { id: 'written', label: isArabic ? `مقالي (${writtenCount})` : `Written (${writtenCount})` },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setQType(item.id)}
                  className={`min-h-[36px] px-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                    qType === item.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question Count Picker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {isArabic ? 'عدد الأسئلة العشوائية:' : 'Number of Random Questions:'}
            </label>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {count} / {maxForType}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {presets.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
                  count === n
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                    : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCount(maxForType)}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
                count === maxForType
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                  : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {isArabic ? `الكل (${maxForType})` : `All (${maxForType})`}
            </button>
          </div>

          <input
            type="number"
            min={1}
            max={maxForType}
            value={count}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 1;
              setCount(Math.min(maxForType, Math.max(1, val)));
            }}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[40px] text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[42px] rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={maxForType === 0}
            onClick={() => onStartCustom(quiz, count, qType)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[42px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isArabic ? 'بدء التدريب' : 'Start Practice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

