# مقياس — كود المشروع (الجزء 2 من 5)

هذا الملف جزء من نسخة نصية كاملة من مشروع مقياس (React + Vite + Express + Firebase). الملفات مرتبة بمسارها داخل المشروع، وكل ملف يبدأ بعنوان فيه مساره.

## ملفات هذا الجزء

- `src/components/Navbar.tsx`
- `src/components/ResumeBanner.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/student/CustomPracticeModal.tsx`
- `src/components/student/FlashcardsModal.tsx`
- `src/components/student/QuizResults.tsx`
- `src/components/student/QuizResultsRoute.tsx`
- `src/components/student/QuizRunner.tsx`
- `src/components/student/QuizRunnerRoute.tsx`


---

## `src/components/Navbar.tsx`

```tsx
import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, ArrowRight, User } from 'lucide-react';
import { ViewMode, Subject, Topic, Quiz } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { Logo } from './Logo';
import { buttonClass } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { brandName } from '../config/brand';

interface NavbarProps {
  viewMode: string;
  onNavigate: (mode: ViewMode) => void;
  selectedSubject?: Subject | null;
  selectedTopic?: Topic | null;
  selectedQuiz?: Quiz | null;
  onBackToSubjects?: () => void;
  onBackToTopics?: () => void;
  hideLogo?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  selectedSubject,
  selectedTopic,
  selectedQuiz,
  onBackToTopics,
  hideLogo = false,
}) => {
  const isStudentView = viewMode.startsWith('student_');
  const isTeacherView = viewMode === 'teacher_dashboard' || viewMode === 'teacher_login';
  const isDashboardView = viewMode === 'student_dashboard';
  const isSubjectsCatalogView = viewMode === 'student_subjects';
  const isQuizRunnerActive = viewMode === 'student_runner' && Boolean(selectedQuiz);

  const navigate = useNavigate();
  const { t, isArabic } = useLanguage();
  const { studentUser, studentProfile } = useStudentAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  /** عنوان الصفحة الحالية: يظهر في منتصف الشريط */
  const activeTitle = (() => {
    if (viewMode === 'student_runner') return null;
    if (isDashboardView) return isArabic ? 'لوحة الطالب' : 'Student Hub';
    if (isSubjectsCatalogView) return isArabic ? 'المقررات' : 'Courses';
    if (selectedQuiz) return selectedQuiz.title;
    if (selectedTopic) return selectedTopic.title;
    if (selectedSubject) return selectedSubject.name;
    return null;
  })();

  const hasBackAction =
    isStudentView &&
    !isQuizRunnerActive &&
    Boolean(isDashboardView || isSubjectsCatalogView || selectedQuiz || selectedTopic || selectedSubject);

  /** الرجوع درجة واحدة: اختبار ← موضوع ← مقرر ← قائمة المقررات ← الرئيسية */
  const handleGoBack = () => {
    if (isDashboardView || isSubjectsCatalogView) return navigate('/');
    if (selectedQuiz) {
      if (onBackToTopics) return onBackToTopics();
      if (selectedTopic) return navigate(`/topic/${selectedTopic.id}`);
      if (selectedSubject) return navigate(`/subject/${selectedSubject.id}`);
      return navigate(-1);
    }
    if (selectedTopic) {
      return selectedSubject ? navigate(`/subject/${selectedSubject.id}`) : navigate(-1);
    }
    if (selectedSubject) return navigate('/courses');
    return navigate('/');
  };

  const firstName = studentProfile?.displayName?.split(' ')[0] || '';
  const showAvatar = Boolean(studentUser && studentProfile?.photoURL && !avatarFailed);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* البداية: الشعار + زر الرجوع */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!hideLogo && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-lg cursor-pointer"
              aria-label={`${brandName(isArabic)} — ${t('home')}`}
            >
              <Logo size="md" />
            </button>
          )}

          {hasBackAction && (
            <button
              type="button"
              onClick={handleGoBack}
              className={buttonClass('ghost', 'sm', 'ms-1')}
              title={t('goBack')}
            >
              <BackIcon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('goBack')}</span>
            </button>
          )}
        </div>

        {/* الوسط: مكان المستخدم الحالي */}
        <div className="flex-1 min-w-0 px-1">
          {activeTitle && (
            <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate text-center">
              {activeTitle}
            </span>
          )}
        </div>

        {/* النهاية: اللغة، لوحة الطالب، بوابة المعلم، المظهر */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageToggle />

          {isStudentView && !isQuizRunnerActive && (
            <button
              type="button"
              onClick={() => navigate('/student')}
              className={buttonClass(isDashboardView ? 'primary' : 'secondary', 'sm')}
              title={isArabic ? 'لوحة الطالب' : 'Student Hub'}
            >
              {showAvatar ? (
                <img
                  src={studentProfile!.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-5 h-5 rounded-md object-cover shrink-0"
                />
              ) : (
                <User className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden sm:inline max-w-[110px] truncate">
                {studentUser
                  ? firstName || (isArabic ? 'لوحتي' : 'My Hub')
                  : isArabic
                  ? 'حسابي'
                  : 'My account'}
              </span>
            </button>
          )}

          {isStudentView && (
            <button
              type="button"
              onClick={() => navigate('/teacher')}
              className={buttonClass('secondary', 'sm')}
              title={t('teacherPortal')}
              aria-label={t('teacherPortal')}
            >
              <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <span className="hidden md:inline">{t('teacherPortal')}</span>
            </button>
          )}

          {isTeacherView && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className={buttonClass('secondary', 'sm')}
              title={t('studentView')}
            >
              <BackIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <span className="hidden sm:inline">{t('studentView')}</span>
            </button>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

```


---

## `src/components/ResumeBanner.tsx`

```tsx
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

```


---

## `src/components/ThemeToggle.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabel = false, className = '' }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('miqyas_theme') || localStorage.getItem('axis_theme') || localStorage.getItem('quiz_master_theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('miqyas_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('miqyas_theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      type="button"
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer transition-colors select-none bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 ${className}`}
      title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      aria-label={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      aria-pressed={isDark}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-zinc-300" />
      ) : (
        <Moon className="w-4 h-4 text-zinc-700" />
      )}
      {showLabel && (
        <span className="text-xs font-medium ml-2">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};

```


---

## `src/components/student/CustomPracticeModal.tsx`

```tsx
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

```


---

## `src/components/student/FlashcardsModal.tsx`

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Question } from '../../types';
import {
  X,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Shuffle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { isArabicText } from '../../utils/textDirection';

interface FlashcardsModalProps {
  isOpen: boolean;
  title: string;
  questions: Question[];
  onClose: () => void;
}

const cleanQ = (text: string) =>
  text
    .replace(/^(\s*\d+[\.\)]\s*)/, '')
    .replace(/^(question|سؤال)\s*(\d+)?\s*[:\-]\s*/i, '')
    .replace(/^\s*\d+[\.\)]\s*/, '')
    .trim();

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({
  isOpen,
  title,
  questions,
  onClose,
}) => {
  const { isArabic } = useLanguage();
  const [deck, setDeck] = useState<Question[]>(questions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showChoicesOnFront, setShowChoicesOnFront] = useState(false);
  const [ratings, setRatings] = useState<Record<string, 'knew' | 'again'>>({});
  const [completedRound, setCompletedRound] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDeck(questions);
      setCurrentIndex(0);
      setIsFlipped(false);
      setRatings({});
      setCompletedRound(false);
    }
  }, [isOpen, questions]);

  const currentCard = deck[currentIndex] || null;
  const PrevIcon = isArabic ? ArrowRight : ArrowLeft;
  const NextIcon = isArabic ? ArrowLeft : ArrowRight;

  const knewCount = useMemo(
    () => deck.filter((q) => ratings[q.id] === 'knew').length,
    [deck, ratings]
  );
  const againCards = useMemo(
    () => deck.filter((q) => ratings[q.id] === 'again'),
    [deck, ratings]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!completedRound) setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        if (completedRound) return;
        setIsFlipped(false);
        setCurrentIndex((i) =>
          isArabic ? Math.max(0, i - 1) : Math.min(deck.length - 1, i + 1)
        );
      } else if (e.key === 'ArrowLeft') {
        if (completedRound) return;
        setIsFlipped(false);
        setCurrentIndex((i) =>
          isArabic ? Math.min(deck.length - 1, i + 1) : Math.max(0, i - 1)
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deck.length, isArabic, completedRound, onClose]);

  if (!isOpen || questions.length === 0) return null;

  const handleRate = (status: 'knew' | 'again') => {
    if (!currentCard) return;
    setRatings((prev) => ({ ...prev, [currentCard.id]: status }));
    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((i) => i + 1);
    } else {
      setCompletedRound(true);
    }
  };

  const handleShuffleDeck = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompletedRound(false);
  };

  const handleStudyWeakOnly = () => {
    if (againCards.length === 0) return;
    setDeck(againCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setRatings({});
    setCompletedRound(false);
  };

  const handleRestartAll = () => {
    setDeck(questions);
    setCurrentIndex(0);
    setIsFlipped(false);
    setRatings({});
    setCompletedRound(false);
  };

  const progressPct = deck.length > 0 ? Math.round(((currentIndex + (completedRound ? 1 : 0)) / deck.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-start">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {title}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                {isArabic
                  ? `بطاقة ${Math.min(currentIndex + 1, deck.length)} من ${deck.length} · أتقنت ${knewCount}`
                  : `Card ${Math.min(currentIndex + 1, deck.length)} of ${deck.length} · ${knewCount} known`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowChoicesOnFront((v) => !v)}
              className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                showChoicesOnFront
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}
              title={isArabic ? 'إظهار الخيارات على وجه البطاقة' : 'Show options on front'}
            >
              {showChoicesOnFront ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isArabic ? 'الخيارات' : 'Options'}</span>
            </button>

            <button
              type="button"
              onClick={handleShuffleDeck}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title={isArabic ? 'خلط البطاقات' : 'Shuffle deck'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              aria-label={isArabic ? 'إغلاق' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-1 bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-between gap-5">
          {completedRound ? (
            <div className="py-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {isArabic ? 'أنهيت مراجعة البطاقات!' : 'Flashcard Session Complete!'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {isArabic
                    ? `أتقنت ${knewCount} من ${deck.length} بطاقة${againCards.length > 0 ? ` · تحتاج مراجعة: ${againCards.length}` : ''}`
                    : `Known: ${knewCount}/${deck.length}${againCards.length > 0 ? ` · Review again: ${againCards.length}` : ''}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                {againCards.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStudyWeakOnly}
                    className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>
                      {isArabic
                        ? `مراجعة الصعبة فقط (${againCards.length})`
                        : `Review Difficult (${againCards.length})`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRestartAll}
                  className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isArabic ? 'إعادة الكل من البداية' : 'Restart Full Deck'}</span>
                </button>
              </div>
            </div>
          ) : currentCard ? (
            <>
              {/* Interactive Flip Card */}
              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsFlipped((prev) => !prev);
                  }
                }}
                dir={isArabicText(currentCard.question) ? 'rtl' : 'ltr'}
                className={`min-h-[260px] sm:min-h-[300px] rounded-2xl border p-5 sm:p-8 flex flex-col justify-between cursor-pointer transition-colors select-none ${
                  isFlipped
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-zinc-50 dark:bg-zinc-950/70 border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {isFlipped
                      ? isArabic
                        ? 'الإجابة والشرح'
                        : 'Answer & Explanation'
                      : isArabic
                      ? 'السؤال — اضغط لكشف الإجابة'
                      : 'Question — Click to flip'}
                  </span>
                  <span className="font-mono tabular-nums">
                    #{currentIndex + 1}
                  </span>
                </div>

                {!isFlipped ? (
                  <div className="space-y-4 my-auto text-start">
                    <p className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-relaxed">
                      {cleanQ(currentCard.question)}
                    </p>

                    {currentCard.imageURL && (
                      <img
                        src={currentCard.imageURL}
                        alt="Question visual"
                        className="max-h-44 rounded-xl border border-zinc-200 dark:border-zinc-800 object-contain"
                      />
                    )}

                    {showChoicesOnFront && currentCard.type === 'mcq' && currentCard.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {currentCard.options.map((opt, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 my-auto text-start">
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
                        {isArabic ? 'الإجابة الصحيحة:' : 'Correct Answer:'}
                      </span>
                      <p className="text-base sm:text-lg font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
                        {currentCard.correctAnswer}
                      </p>
                    </div>

                    {currentCard.explanation && (
                      <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900 text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                        <span className="font-semibold block mb-0.5">
                          {isArabic ? 'الشرح:' : 'Explanation:'}
                        </span>
                        {currentCard.explanation}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-zinc-400 text-center pt-3">
                  {isArabic ? 'مسافة (Space) أو اضغط البطاقة للقلب' : 'Press Space or click card to flip'}
                </div>
              </div>

              {/* Footer Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentIndex((i) => Math.max(0, i - 1));
                    }}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
                  >
                    <PrevIcon className="w-4 h-4" />
                    <span>{isArabic ? 'السابق' : 'Prev'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentIndex >= deck.length - 1}
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentIndex((i) => Math.min(deck.length - 1, i + 1));
                    }}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
                  >
                    <span>{isArabic ? 'التالي' : 'Next'}</span>
                    <NextIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRate('again')}
                    className="flex-1 sm:flex-initial min-h-[40px] px-4 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold cursor-pointer"
                  >
                    {isArabic ? 'أحتاج مراجعة' : 'Review Again'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate('knew')}
                    className="flex-1 sm:flex-initial min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isArabic ? 'أتقنتها' : 'Knew It'}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

```


---

## `src/components/student/QuizResults.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  BookOpen,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Award,
  Bookmark,
  LayoutDashboard,
  LogIn,
  Eye,
} from 'lucide-react';
import { Quiz, Question, AIWrittenGradingResult } from '../../types';
import { isArabicText } from '../../utils/textDirection';
import { useLanguage } from '../../context/LanguageContext';

interface QuizResultsProps {
  quiz: Quiz;
  score: number;
  totalMCQs: number;
  totalWritten: number;
  userAnswers: Record<string, string>;
  writtenInputData: Record<string, string>;
  writtenGradingData: Record<string, AIWrittenGradingResult>;
  questions: Question[];
  timeSpentSeconds: number;
  onRetake: () => void;
  onBackToSubjects: () => void;
  initialReviewMode?: boolean;
  initialReviewFilter?: 'wrong' | 'all';
  isStudentSignedIn?: boolean;
  isQuestionBookmarked?: (question: Question) => boolean;
  onToggleBookmark?: (question: Question) => Promise<boolean> | void;
  onOpenStudentDashboard?: () => void;
  onSignInStudent?: () => void;
  authBusy?: boolean;
}

export const QuizResults: React.FC<QuizResultsProps> = ({
  quiz,
  score,
  totalMCQs,
  totalWritten,
  userAnswers,
  writtenInputData,
  writtenGradingData,
  questions,
  timeSpentSeconds,
  onRetake,
  onBackToSubjects,
  initialReviewMode = false,
  initialReviewFilter = 'wrong',
  isStudentSignedIn = false,
  isQuestionBookmarked,
  onToggleBookmark,
  onOpenStudentDashboard,
  onSignInStudent,
  authBusy = false,
}) => {
  const [isReviewMode, setIsReviewMode] = useState<boolean>(initialReviewMode);
  const [reviewFilter, setReviewFilter] = useState<'wrong' | 'all'>(initialReviewFilter);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { t, isArabic } = useLanguage();

  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  useEffect(() => {
    if (!initialReviewMode && percentage >= 60) {
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {
        console.log('Confetti error:', e);
      }
    }
  }, [percentage, initialReviewMode]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const isQuestionCorrect = (q: Question) => {
    const ans = userAnswers[q.id];
    if (!ans || ans === 'SHOW_ANSWERS_FLAG') return false;
    if (q.type === 'written') return ans === 'WRITTEN_CORRECT';
    return ans === q.correctAnswer;
  };

  // Identify wrong and unanswered questions
  const wrongQuestions = questions.filter((q) => {
    const ans = userAnswers[q.id];
    if (!ans) return true; // Unanswered
    if (q.type === 'written') {
      return ans === 'WRITTEN_WRONG';
    }
    return ans !== q.correctAnswer && ans !== 'SHOW_ANSWERS_FLAG';
  });

  const displayedReviewQuestions = reviewFilter === 'all' ? questions : wrongQuestions;

  const getGradeText = (pct: number) => {
    if (pct >= 90) return isArabic ? 'أداء ممتاز ورائع!' : 'Excellent performance!';
    if (pct >= 75) return isArabic ? 'عمل رائع جداً!' : 'Great job!';
    if (pct >= 50) return isArabic ? 'محاولة جيدة، واصل التدريب!' : 'Good effort, keep practicing!';
    return isArabic ? 'تحتاج إلى مزيد من المراجعة، استمر في المحاولة!' : 'Needs more review, keep trying!';
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s}s`;
  };

  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  if (isReviewMode) {
    return (
      <div className="max-w-3xl mx-auto py-8 sm:py-10 px-4 sm:px-6">
        {toastMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-xl shadow-md text-xs font-semibold flex items-center gap-2 border border-zinc-800 dark:border-zinc-200 max-w-[90vw]">
            <Bookmark className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{toastMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            onClick={() => {
              if (initialReviewMode) {
                onBackToSubjects();
              } else {
                setIsReviewMode(false);
              }
            }}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            <BackIcon className="w-4 h-4" />
            <span>{t('back')}</span>
          </button>

          {/* Segmented Filter: Wrong Only vs All Questions */}
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setReviewFilter('wrong')}
              className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums ${
                reviewFilter === 'wrong'
                  ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {isArabic ? `الأخطاء فقط (${wrongQuestions.length})` : `Wrong Only (${wrongQuestions.length})`}
            </button>
            <button
              type="button"
              onClick={() => setReviewFilter('all')}
              className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums ${
                reviewFilter === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {isArabic ? `جميع الأسئلة (${questions.length})` : `All Questions (${questions.length})`}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            {t('reviewQuestions')}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
            {reviewFilter === 'all'
              ? isArabic
                ? `عرض جميع أسئلة الاختبار (${questions.length} سؤال)`
                : `Showing all ${questions.length} questions`
              : t('questionsNeedReview', { count: wrongQuestions.length })}
          </p>
        </div>

        {displayedReviewQuestions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              {isArabic ? 'لا توجد أخطاء في هذه المحاولة!' : 'No wrong answers in this attempt!'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              {isArabic ? 'يمكنك عرض جميع الأسئلة لمراجعتها.' : 'You can switch to All Questions to review everything.'}
            </p>
            <button
              type="button"
              onClick={() => setReviewFilter('all')}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isArabic ? 'عرض جميع الأسئلة' : 'View All Questions'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedReviewQuestions.map((q, idx) => {
              const studentAns = userAnswers[q.id];
              const studentText = writtenInputData[q.id];
              const grading = writtenGradingData[q.id];
              const isCorrectQ = isQuestionCorrect(q);

              const isArabicQ = isArabicText(q.question);
              const qDir = isArabicQ ? 'rtl' : 'ltr';
              const qAlign = isArabicQ ? 'text-right' : 'text-left';

              return (
                <div
                  key={q.id}
                  dir={qDir}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 text-xs">
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 tabular-nums">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {isArabic ? `سؤال #${idx + 1}` : `Question #${idx + 1}`}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">·</span>
                      <span>{q.type === 'mcq' ? t('multipleChoiceBadge') : t('writtenBadge')}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {onToggleBookmark && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!isStudentSignedIn) {
                              showToast(
                                isArabic
                                  ? 'سجّل الدخول بحساب الطالب لحفظ الأسئلة.'
                                  : 'Sign in to Student Hub to bookmark questions.'
                              );
                              return;
                            }
                            const saved = await onToggleBookmark(q);
                            showToast(
                              saved
                                ? isArabic
                                  ? 'تم حفظ السؤال في المحفوظات.'
                                  : 'Saved to bookmarks.'
                                : isArabic
                                ? 'تمت إزالة السؤال من المحفوظات.'
                                : 'Removed from bookmarks.'
                            );
                          }}
                          className={`inline-flex items-center gap-1 min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            isQuestionBookmarked?.(q)
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Bookmark
                            className={`w-3.5 h-3.5 ${
                              isQuestionBookmarked?.(q) ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400' : ''
                            }`}
                          />
                          <span>
                            {isQuestionBookmarked?.(q)
                              ? isArabic
                                ? 'محفوظ'
                                : 'Saved'
                              : isArabic
                              ? 'حفظ'
                              : 'Save'}
                          </span>
                        </button>
                      )}

                      {isCorrectQ ? (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('correctBadge')}</span>
                        </span>
                      ) : !studentAns || studentAns === 'SHOW_ANSWERS_FLAG' ? (
                        <span className="font-medium text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{t('unansweredCount')}</span>
                        </span>
                      ) : (
                        <span className="font-medium text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{t('incorrectBadge')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className={`text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4 leading-relaxed ${qAlign}`} dir={qDir}>
                    {q.question}
                  </h3>

                  {q.imageURL && (
                    <div className="mb-4">
                      <img src={q.imageURL} alt="Visual" className="max-h-56 rounded-xl border border-zinc-200 dark:border-zinc-800 object-contain" />
                    </div>
                  )}

                  {q.type === 'written' ? (
                    <div className="space-y-3" dir={qDir}>
                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                        <span className={`text-[11px] font-medium text-zinc-400 block mb-1 ${qAlign}`}>
                          {t('yourAnswerLabel')}
                        </span>
                        <p className={`font-medium text-zinc-900 dark:text-zinc-100 ${qAlign}`} dir={isArabicText(studentText) ? 'rtl' : qDir}>
                          {studentText || t('noAnswerProvided')}
                        </p>
                      </div>
                      {grading && (
                        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                          <span className={`font-semibold text-zinc-900 dark:text-zinc-100 block mb-1 ${qAlign}`}>
                            {t('aiFeedbackTitle')}
                          </span>
                          <p className={qAlign} dir={isArabicText(grading.feedback) ? 'rtl' : qDir}>{grading.feedback}</p>
                        </div>
                      )}
                      <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-100">
                        <span className={`text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block mb-1 ${qAlign}`}>
                          {t('modelAnswerLabel')}
                        </span>
                        <p className={`font-semibold text-xs sm:text-sm ${isArabicText(q.correctAnswer) ? 'text-right' : 'text-left'}`} dir={isArabicText(q.correctAnswer) ? 'rtl' : qDir}>
                          {q.correctAnswer}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2" dir={qDir}>
                      {q.options.map((opt, i) => {
                        const isSelected = studentAns === opt;
                        const isCorrect = opt === q.correctAnswer;
                        let optCls = 'bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300';
                        if (isSelected && !isCorrect) {
                          optCls = 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200 font-medium';
                        } else if (isCorrect) {
                          optCls = 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 font-medium';
                        }

                        const optIsAr = isArabicText(opt);
                        const optAlign = optIsAr ? 'text-right' : qAlign;

                        return (
                          <div key={i} className={`p-3 sm:p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm ${optCls}`}>
                            <span className={`flex-1 min-w-0 ${optAlign}`} dir={optIsAr ? 'rtl' : qDir}>
                              {opt}
                            </span>
                            {isSelected && !isCorrect && (
                              <span className="text-xs font-medium text-rose-600 dark:text-rose-400 shrink-0">
                                {t('yourChoiceWrong')}
                              </span>
                            )}
                            {isCorrect && (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('correctChoiceTag')}</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center">
        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
          <Award className="w-5 h-5" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 tracking-tight">
          {t('quizCompletedTitle')}
        </h2>

        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-6 truncate">
          {quiz.title}
        </p>

        <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 mb-5">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">
            {t('scoreSummary')}
          </span>

          <div className="flex items-baseline justify-center gap-1.5 mb-1.5 tabular-nums">
            <span className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {score}
            </span>
            <span className="text-xl text-zinc-400">/ {totalQuestions}</span>
          </div>

          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums mb-2">
            {percentage}%
          </div>

          <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {getGradeText(percentage)}
          </p>

          <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-3 gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            <div>
              <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">{totalMCQs}</span>
              <span className="text-[11px]">{t('multipleChoiceBadge')}</span>
            </div>
            <div>
              <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">{totalWritten}</span>
              <span className="text-[11px]">{t('writtenBadge')}</span>
            </div>
            <div>
              <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 inline-flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span>{formatTime(timeSpentSeconds)}</span>
              </span>
              <span className="text-[11px] block">{t('timeSpentSummary')}</span>
            </div>
          </div>
        </div>

        {/* Account Sync Banner / Guest CTA */}
        {isStudentSignedIn ? (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 text-start">
            <div className="text-xs text-emerald-800 dark:text-emerald-200 leading-snug">
              <span className="font-semibold block">
                {isArabic ? 'تم حفظ نتيجتك في لوحة الطالب' : 'Saved to your Student Hub'}
              </span>
              <span className="opacity-85 text-[11px]">
                {wrongQuestions.length > 0
                  ? isArabic
                    ? 'تمت إضافة الأسئلة الخاطئة إلى بنك الأخطاء.'
                    : 'Missed questions added to Mistakes Bank.'
                  : isArabic
                  ? 'نتيجة مسجلة في سجل محاولاتك.'
                  : 'Attempt recorded in your history.'}
              </span>
            </div>
            {onOpenStudentDashboard && (
              <button
                type="button"
                onClick={onOpenStudentDashboard}
                className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{isArabic ? 'لوحتي' : 'Hub'}</span>
              </button>
            )}
          </div>
        ) : onSignInStudent ? (
          <div className="mb-5 p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-800/60 text-start space-y-2.5">
            <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              {isArabic
                ? 'سجّل الدخول بحساب Google لحفظ نتائجك، تجميع أخطائك في بنك المراجعة، وإنشاء اختبارات خاصة بك.'
                : 'Sign in with Google to save results, collect missed questions, and create private quizzes.'}
            </p>
            <button
              type="button"
              onClick={onSignInStudent}
              disabled={authBusy}
              className="w-full min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تسجيل الدخول بحساب Google' : 'Sign in with Google'}</span>
            </button>
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="space-y-2.5">
          {wrongQuestions.length > 0 && (
            <button
              onClick={() => {
                setReviewFilter('wrong');
                setIsReviewMode(true);
              }}
              className="w-full min-h-[42px] flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-semibold py-2.5 rounded-xl transition-colors cursor-pointer text-xs sm:text-sm tabular-nums"
            >
              <span>{t('reviewWrongQuestions')}</span>
              <span className="font-bold">({wrongQuestions.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setReviewFilter('all');
              setIsReviewMode(true);
            }}
            className="w-full min-h-[42px] flex items-center justify-center gap-2 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 font-semibold py-2.5 rounded-xl transition-colors cursor-pointer text-xs sm:text-sm tabular-nums"
          >
            <Eye className="w-4 h-4 text-zinc-400" />
            <span>{isArabic ? `مراجعة جميع الأسئلة (${totalQuestions})` : `Review All Questions (${totalQuestions})`}</span>
          </button>

          <button
            onClick={onRetake}
            className="w-full min-h-[42px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors cursor-pointer text-xs sm:text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('retakeQuizBtn')}</span>
          </button>

          <button
            onClick={onBackToSubjects}
            className="w-full min-h-[42px] flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 font-semibold py-2.5 rounded-xl transition-colors cursor-pointer text-xs sm:text-sm"
          >
            <BookOpen className="w-4 h-4 text-zinc-400" />
            <span>{t('backToCoursesBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

```


---

## `src/components/student/QuizResultsRoute.tsx`

```tsx
import React from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Subject, Topic, Quiz, AIWrittenGradingResult, Question } from '../../types';
import { Navbar } from '../Navbar';
import { QuizResults } from './QuizResults';
import { CloudLoadingState } from '../CloudLoadingState';
import { useLanguage } from '../../context/LanguageContext';
import { useStudentAuth } from '../../context/StudentAuthContext';

interface QuizResultsRouteProps {
  quizzes: Quiz[];
  subjects: Subject[];
  topics: Topic[];
  isQuizzesLoaded: boolean;
  activeQuiz: Quiz | null;
  selectedSubject: Subject | null;
  selectedTopic: Topic | null;
  quizResults: {
    score: number;
    totalMCQs: number;
    totalWritten: number;
    userAnswers: Record<string, string>;
    writtenInputData: Record<string, string>;
    writtenGradingData: Record<string, AIWrittenGradingResult>;
    questions: Question[];
    timeSpentSeconds: number;
  } | null;
  onRetakeQuiz: (quiz: Quiz) => void;
}

export const QuizResultsRoute: React.FC<QuizResultsRouteProps> = ({
  quizzes,
  subjects,
  topics,
  isQuizzesLoaded,
  activeQuiz,
  selectedSubject,
  selectedTopic,
  quizResults,
  onRetakeQuiz,
}) => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const {
    studentUser,
    authBusy,
    signInWithGoogle,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
  } = useStudentAuth();

  const currentQuiz =
    (activeQuiz && activeQuiz.id === quizId ? activeQuiz : null) ||
    quizzes.find((q) => q.id === quizId) ||
    null;

  if (!currentQuiz && !isQuizzesLoaded) {
    return (
      <>
        <Navbar
          viewMode="student_results"
          onNavigate={() => {}}
          selectedSubject={selectedSubject}
          selectedTopic={selectedTopic}
          selectedQuiz={null}
          onBackToSubjects={() => navigate('/courses')}
          onBackToTopics={() => (selectedSubject ? navigate(`/subject/${selectedSubject.id}`) : navigate('/courses'))}
        />
        <CloudLoadingState
          status="loading"
          title={isArabic ? 'جاري تحميل بيانات الاختبار...' : 'Loading Quiz Data...'}
        />
      </>
    );
  }

  if (!currentQuiz || !quizResults) {
    if (quizId) {
      return <Navigate to={`/quiz/${quizId}`} replace />;
    }
    return <Navigate to="/" replace />;
  }

  const currentTopic = selectedTopic || topics.find((t) => t.id === currentQuiz.topicId) || null;
  const currentSubject = selectedSubject || subjects.find((s) => s.id === currentQuiz.subjectId) || null;

  return (
    <>
      <Navbar
        viewMode="student_results"
        onNavigate={() => {}}
        selectedSubject={currentSubject}
        selectedTopic={currentTopic}
        selectedQuiz={currentQuiz}
        onBackToSubjects={() => navigate('/courses')}
        onBackToTopics={() => (currentSubject ? navigate(`/subject/${currentSubject.id}`) : navigate('/courses'))}
      />
      <main className="flex-1">
        <QuizResults
          quiz={currentQuiz}
          score={quizResults.score}
          totalMCQs={quizResults.totalMCQs}
          totalWritten={quizResults.totalWritten}
          userAnswers={quizResults.userAnswers}
          writtenInputData={quizResults.writtenInputData}
          writtenGradingData={quizResults.writtenGradingData}
          questions={quizResults.questions}
          timeSpentSeconds={quizResults.timeSpentSeconds}
          onRetake={() => onRetakeQuiz(currentQuiz)}
          onBackToSubjects={() => navigate('/courses')}
          isStudentSignedIn={Boolean(studentUser)}
          isQuestionBookmarked={(q) => isQuestionBookmarked(currentQuiz.id, q)}
          onToggleBookmark={(q) =>
            toggleBookmarkQuestion({
              quiz: currentQuiz,
              subjectName: currentSubject?.name || (isArabic ? 'عام' : 'General'),
              question: q,
            })
          }
          onOpenStudentDashboard={() => navigate('/student')}
          onSignInStudent={() => {
            signInWithGoogle();
          }}
          authBusy={authBusy}
        />
      </main>
    </>
  );
};

```


---

## `src/components/student/QuizRunner.tsx`

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Quiz, Question, AIWrittenGradingResult } from '../../types';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Shuffle,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Check,
  X,
  RotateCcw,
  Bookmark,
  Type,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Layers,
  Flag,
  Send,
  Bot,
  Loader2,
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { ExamModeToggle } from '../ExamModeToggle';
import { saveQuizProgress, getQuizProgress, clearQuizProgress } from '../../utils/storage';
import { isArabicText } from '../../utils/textDirection';
import { useLanguage } from '../../context/LanguageContext';
import { gradeWrittenAnswerAI } from '../../services/aiService';

interface QuizRunnerProps {
  quiz: Quiz;
  onFinishQuiz: (results: {
    score: number;
    totalMCQs: number;
    totalWritten: number;
    userAnswers: Record<string, string>;
    writtenInputData: Record<string, string>;
    writtenGradingData: Record<string, AIWrittenGradingResult>;
    questions: Question[];
    timeSpentSeconds: number;
  }) => void;
  onExit: () => void;
  isStudentSignedIn?: boolean;
  isQuestionBookmarked?: (question: Question) => boolean;
  onToggleBookmark?: (question: Question) => Promise<boolean> | void;
}

// Clean up question text from any prefixes like "Question:", "Question 1:", "سؤال 1:", "1."
const cleanQuestionText = (text: string) => {
  return text
    .replace(/^(\s*\d+[\.\)]\s*)/, '')
    .replace(/^(question|سؤال)\s*(\d+)?\s*[:\-]\s*/i, '')
    .replace(/^\s*\d+[\.\)]\s*/, '')
    .trim();
};

export type FontSizeLevel = 'normal' | 'large' | 'xlarge';
export type DisplayMode = 'single' | 'all';

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  quiz,
  onFinishQuiz,
  onExit,
  isStudentSignedIn = false,
  isQuestionBookmarked,
  onToggleBookmark,
}) => {
  const { t, isArabic } = useLanguage();
  const [runnerToast, setRunnerToast] = useState<string | null>(null);

  const showRunnerToast = (msg: string) => {
    setRunnerToast(msg);
    setTimeout(() => setRunnerToast(null), 2600);
  };

  const [questions, setQuestions] = useState<Question[]>(() => {
    return quiz.questions.map((q) => ({
      ...q,
      question: cleanQuestionText(q.question),
      options: q.staticOptions ? q.options : [...q.options].sort(() => Math.random() - 0.5),
    }));
  });

  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [writtenInputData, setWrittenInputData] = useState<Record<string, string>>({});
  const [writtenGradingData, setWrittenGradingData] = useState<Record<string, AIWrittenGradingResult>>({});
  const [writtenRevealedState, setWrittenRevealedState] = useState<Record<string, boolean>>({});
  const [gradingLoadingState, setGradingLoadingState] = useState<Record<string, boolean>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});

  // Display Mode: 'single' (Focus one question) or 'all' (Full scroll list)
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    const saved = localStorage.getItem('miqyas_display_mode') || localStorage.getItem('axis_display_mode') || localStorage.getItem('quiz_mind_display_mode');
    return saved === 'all' ? 'all' : 'single';
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  const handleSetDisplayMode = (mode: DisplayMode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('miqyas_display_mode', mode);
    } catch (e) {
      console.error(e);
    }
  };

  const [fontSize, setFontSize] = useState<FontSizeLevel>(() => {
    const saved = localStorage.getItem('miqyas_font_size') || localStorage.getItem('axis_font_size') || localStorage.getItem('quiz_mind_font_size');
    if (saved === 'large' || saved === 'xlarge' || saved === 'normal') return saved;
    return 'normal';
  });

  const handleSetFontSize = (size: FontSizeLevel) => {
    setFontSize(size);
    try {
      localStorage.setItem('miqyas_font_size', size);
    } catch (e) {
      console.error(e);
    }
  };

  const [isExamMode, setIsExamMode] = useState<boolean>(false);
  const [answersRevealed, setAnswersRevealed] = useState<boolean>(false);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);

  // Modals state
  const [showShuffleConfirm, setShowShuffleConfirm] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showAnswersConfirm, setShowAnswersConfirm] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [savedDataToRestore, setSavedDataToRestore] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [paletteFilter, setPaletteFilter] = useState<'all' | 'unanswered' | 'flagged'>('all');

  // Timer and Time Limit Enforcement
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => {
        const nextTime = prev + 1;
        if (quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0) {
          const maxSeconds = quiz.timeLimitMinutes * 60;
          if (nextTime >= maxSeconds) {
            clearInterval(timer);
            return maxSeconds;
          }
        }
        return nextTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz.timeLimitMinutes]);

  // Auto-submit when time is up
  useEffect(() => {
    if (quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0) {
      if (timeElapsed >= quiz.timeLimitMinutes * 60) {
        handleSubmit();
      }
    }
  }, [timeElapsed, quiz.timeLimitMinutes]);

  // Check saved progress on mount
  useEffect(() => {
    const saved = getQuizProgress(quiz.id);
    if (saved && saved.answers && Object.keys(saved.answers).length > 0) {
      setSavedDataToRestore(saved);
      setShowRestoreModal(true);
    }
  }, [quiz.id]);

  const restoreProgress = () => {
    if (savedDataToRestore) {
      if (savedDataToRestore.questions) setQuestions(savedDataToRestore.questions);
      if (savedDataToRestore.answers) setUserAnswers(savedDataToRestore.answers);
      if (savedDataToRestore.writtenInputData) setWrittenInputData(savedDataToRestore.writtenInputData);
      if (savedDataToRestore.writtenGradingData) setWrittenGradingData(savedDataToRestore.writtenGradingData);
      if (savedDataToRestore.flaggedQuestions) setFlaggedQuestions(savedDataToRestore.flaggedQuestions);
      if (savedDataToRestore.timeSpentSeconds) setTimeElapsed(savedDataToRestore.timeSpentSeconds);
    }
    setShowRestoreModal(false);
  };

  const resetProgress = () => {
    clearQuizProgress(quiz.id);
    setUserAnswers({});
    setWrittenInputData({});
    setWrittenGradingData({});
    setWrittenRevealedState({});
    setFlaggedQuestions({});
    setShowRestoreModal(false);
  };

  const timeElapsedRef = useRef(timeElapsed);
  timeElapsedRef.current = timeElapsed;

  // Sync save progress ONLY when user interacts (answers, written submissions, or flags), NOT every second!
  useEffect(() => {
    if (Object.keys(userAnswers).length > 0 || Object.keys(writtenInputData).length > 0 || Object.keys(flaggedQuestions).length > 0) {
      saveQuizProgress(quiz.id, {
        answers: userAnswers,
        writtenInputData,
        writtenGradingData,
        questions,
        flaggedQuestions,
        timeSpentSeconds: timeElapsedRef.current,
      });
    }
  }, [userAnswers, writtenInputData, writtenGradingData, questions, flaggedQuestions, quiz.id]);

  // Answer handler for MCQ
  const handleSelectOption = (question: Question, option: string) => {
    if (userAnswers[question.id] && !isExamMode) return;
    setUserAnswers((prev) => ({
      ...prev,
      [question.id]: option,
    }));
  };

  // Submit Written Answer with Real-time AI Semantic Grading
  const handleSubmitWritten = async (question: Question) => {
    const studentText = writtenInputData[question.id]?.trim();
    if (!studentText) return;

    setWrittenRevealedState((prev) => ({ ...prev, [question.id]: true }));
    setGradingLoadingState((prev) => ({ ...prev, [question.id]: true }));

    try {
      const gradingResult = await gradeWrittenAnswerAI({
        question: question.question,
        modelAnswer: question.correctAnswer || '',
        studentAnswer: studentText,
        language: isArabic ? 'ar' : 'en',
      });

      setWrittenGradingData((prev) => ({ ...prev, [question.id]: gradingResult }));
      setUserAnswers((prev) => ({
        ...prev,
        [question.id]: gradingResult.isCorrect ? 'WRITTEN_CORRECT' : 'WRITTEN_WRONG',
      }));
    } catch (err) {
      console.error('Error in AI written answer evaluation:', err);
    } finally {
      setGradingLoadingState((prev) => ({ ...prev, [question.id]: false }));
    }
  };

  // Manual rating for written question
  const handleManualRateWritten = (questionId: string, isCorrect: boolean) => {
    const rating = isCorrect ? 'WRITTEN_CORRECT' : 'WRITTEN_WRONG';
    setUserAnswers((prev) => ({ ...prev, [questionId]: rating }));
    setWrittenGradingData((prev) => ({
      ...prev,
      [questionId]: {
        isCorrect,
        score: isCorrect ? 100 : 0,
        rating,
        statusText: isCorrect ? 'Marked Correct' : 'Marked Incorrect',
        feedback: isCorrect ? (isArabic ? 'تم تأكيد صحة الإجابة.' : 'Answer confirmed correct.') : (isArabic ? 'يرجى مراجعة الإجابة النموذجية.' : 'Review model answer.'),
      },
    }));
  };

  // Shuffle questions & options
  const handleShuffle = () => {
    clearQuizProgress(quiz.id);
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5).map((q) => {
      if (q.type === 'mcq' && !q.staticOptions) {
        return { ...q, options: [...q.options].sort(() => Math.random() - 0.5) };
      }
      return q;
    });
    setQuestions(shuffledQuestions);
    setUserAnswers({});
    setWrittenInputData({});
    setWrittenGradingData({});
    setWrittenRevealedState({});
    setAnswersRevealed(false);
    setShowShuffleConfirm(false);
    setCurrentQuestionIndex(0);
  };

  // Reset answers only (preserves question order)
  const handleResetAnswersOnly = () => {
    clearQuizProgress(quiz.id);
    setUserAnswers({});
    setWrittenInputData({});
    setWrittenGradingData({});
    setWrittenRevealedState({});
    setAnswersRevealed(false);
    setShowResetConfirm(false);
  };

  // Reveal All
  const handleRevealAll = () => {
    setIsExamMode(false);
    const allAns: Record<string, string> = { ...userAnswers };
    questions.forEach((q) => {
      if (!allAns[q.id]) {
        allAns[q.id] = 'SHOW_ANSWERS_FLAG';
      }
    });
    setUserAnswers(allAns);
    setAnswersRevealed(true);
    setShowAnswersConfirm(false);
  };

  // Submit test
  const handleSubmit = () => {
    setShowSubmitConfirm(false);
    clearQuizProgress(quiz.id);
    
    let mcqScore = 0;
    let writtenScore = 0;
    const mcqQuestions = questions.filter((q) => q.type !== 'written');
    const writtenQuestions = questions.filter((q) => q.type === 'written');

    mcqQuestions.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) mcqScore++;
    });

    writtenQuestions.forEach((q) => {
      if (userAnswers[q.id] === 'WRITTEN_CORRECT') writtenScore++;
    });

    onFinishQuiz({
      score: mcqScore + writtenScore,
      totalMCQs: mcqQuestions.length,
      totalWritten: writtenQuestions.length,
      userAnswers,
      writtenInputData,
      writtenGradingData,
      questions,
      timeSpentSeconds: timeElapsed,
    });
  };

  // Toggle flag for a question
  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;

  // Keyboard shortcuts for desktop efficiency in single-question mode
  useEffect(() => {
    if (displayMode !== 'single') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        showShuffleConfirm ||
        showResetConfirm ||
        showAnswersConfirm ||
        showSubmitConfirm ||
        showRestoreModal ||
        zoomedImage
      ) {
        return;
      }

      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      const currentQ = questions[currentQuestionIndex];
      if (!currentQ) return;

      if (e.key >= '1' && e.key <= '9') {
        const optIdx = parseInt(e.key, 10) - 1;
        if (currentQ.type === 'mcq' && currentQ.options[optIdx]) {
          e.preventDefault();
          handleSelectOption(currentQ, currentQ.options[optIdx]);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentQuestionIndex((prev) =>
          isArabic ? Math.max(0, prev - 1) : Math.min(questions.length - 1, prev + 1)
        );
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentQuestionIndex((prev) =>
          isArabic ? Math.min(questions.length - 1, prev + 1) : Math.max(0, prev - 1)
        );
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFlag(currentQ.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    displayMode,
    currentQuestionIndex,
    questions,
    userAnswers,
    isExamMode,
    isArabic,
    showShuffleConfirm,
    showResetConfirm,
    showAnswersConfirm,
    showSubmitConfirm,
    showRestoreModal,
    zoomedImage,
  ]);

  // Font size responsive classes
  const questionTitleClass =
    fontSize === 'xlarge'
      ? 'text-xl sm:text-2xl'
      : fontSize === 'large'
      ? 'text-lg sm:text-xl'
      : 'text-base sm:text-lg';

  const optionTextClass =
    fontSize === 'xlarge'
      ? 'text-base sm:text-lg'
      : fontSize === 'large'
      ? 'text-sm sm:text-base'
      : 'text-xs sm:text-sm';

  const answeredCount = Object.keys(userAnswers).filter(id => userAnswers[id] && userAnswers[id] !== 'SHOW_ANSWERS_FLAG').length;
  const isTimeLimit = quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0;
  
  const displayTimeSeconds = isTimeLimit 
    ? Math.max(0, (quiz.timeLimitMinutes! * 60) - timeElapsed)
    : timeElapsed;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const isLowTime = isTimeLimit && displayTimeSeconds < 60;
  const BackArrow = isArabic ? ArrowRight : ArrowLeft;
  const NextArrow = isArabic ? ArrowLeft : ArrowRight;

  const progressPercent = Math.round((answeredCount / (questions.length || 1)) * 100);

  // Render individual Question Card
  const renderQuestionCard = (question: Question, index: number) => {
    const userAns = userAnswers[question.id];
    const isRealAnswered = !!userAns && userAns !== 'SHOW_ANSWERS_FLAG';
    const isRevealedUnanswered = answersRevealed && (!userAns || userAns === 'SHOW_ANSWERS_FLAG');
    const isMCQ = question.type === 'mcq';
    const isCorrectMCQ = isMCQ && isRealAnswered && userAns === question.correctAnswer;
    const isWrongMCQ = isMCQ && isRealAnswered && userAns !== question.correctAnswer;
    const writtenGrading = writtenGradingData[question.id];

    const isArabicQ = isArabicText(question.question);
    const qDir = isArabicQ ? 'rtl' : 'ltr';

    let cardBorderCls = 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900';
    if (!isExamMode || answersRevealed) {
      if (isMCQ) {
        if (isCorrectMCQ) cardBorderCls = 'border-emerald-500/70 bg-emerald-50/20 dark:bg-emerald-950/10 dark:border-emerald-500/50';
        else if (isWrongMCQ) cardBorderCls = 'border-rose-500/70 bg-rose-50/20 dark:bg-rose-950/10 dark:border-rose-500/50';
      } else {
        if (userAns === 'WRITTEN_CORRECT') cardBorderCls = 'border-emerald-500/70 bg-emerald-50/20 dark:bg-emerald-950/10 dark:border-emerald-500/50';
        else if (userAns === 'WRITTEN_WRONG') cardBorderCls = 'border-rose-500/70 bg-rose-50/20 dark:bg-rose-950/10 dark:border-rose-500/50';
      }
    }

    return (
      <div
        key={question.id}
        id={`question-${index}`}
        dir={qDir}
        className={`border rounded-2xl p-4 sm:p-7 transition-colors ${cardBorderCls}`}
      >
        {/* Question Header */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {isArabic ? `سؤال ${index + 1}` : `Question ${index + 1}`}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span>{isMCQ ? t('multipleChoiceBadge') : t('writtenBadge')}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleBookmark && (
              <button
                type="button"
                onClick={async () => {
                  if (!isStudentSignedIn) {
                    showRunnerToast(
                      isArabic
                        ? 'سجّل الدخول بحساب الطالب لحفظ الأسئلة في مفضلتك.'
                        : 'Sign in to Student Hub to bookmark questions.'
                    );
                    return;
                  }
                  const saved = await onToggleBookmark(question);
                  showRunnerToast(
                    saved
                      ? isArabic
                        ? 'تم حفظ السؤال في المحفوظات.'
                        : 'Question saved to bookmarks.'
                      : isArabic
                      ? 'تمت إزالة السؤال من المحفوظات.'
                      : 'Removed from bookmarks.'
                  );
                }}
                className={`inline-flex items-center gap-1 min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer select-none ${
                  isQuestionBookmarked?.(question)
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title={isArabic ? 'حفظ السؤال في المفضلة' : 'Bookmark question'}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${
                    isQuestionBookmarked?.(question) ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400' : ''
                  }`}
                />
                <span className="hidden sm:inline">
                  {isQuestionBookmarked?.(question)
                    ? isArabic
                      ? 'محفوظ'
                      : 'Saved'
                    : isArabic
                    ? 'حفظ'
                    : 'Save'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => toggleFlag(question.id)}
              className={`inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer select-none ${
                flaggedQuestions[question.id]
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={flaggedQuestions[question.id] ? t('flaggedForReview') : t('flagForReview')}
            >
              <Flag
                className={`w-3.5 h-3.5 ${
                  flaggedQuestions[question.id] ? 'fill-amber-500 text-amber-500' : ''
                }`}
              />
              <span className="hidden sm:inline">
                {flaggedQuestions[question.id] ? t('flaggedForReview') : t('flagForReview')}
              </span>
            </button>
          </div>
        </div>

        {/* Question Prompt */}
        <h3
          className={`font-semibold text-zinc-900 dark:text-zinc-50 leading-relaxed mb-4 text-start ${questionTitleClass}`}
        >
          {question.question}
        </h3>

        {/* Optional Image */}
        {question.imageURL && (
          <div className="mb-5">
            <img
              src={question.imageURL}
              alt="Question diagram"
              onClick={() => setZoomedImage(question.imageURL!)}
              className="max-h-72 rounded-xl border border-zinc-200 dark:border-zinc-800 object-contain cursor-zoom-in hover:opacity-95 transition-opacity bg-zinc-50 dark:bg-zinc-950"
            />
          </div>
        )}

        {/* MCQ Options */}
        {isMCQ ? (
          <div className="space-y-2.5 mt-4">
            {question.options.map((option, optIdx) => {
              const isSelected = userAns === option;
              const isCorrectOpt = option === question.correctAnswer;
              const showValidation = (!isExamMode && isRealAnswered) || answersRevealed;

              let btnCls = 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600';

              if (showValidation) {
                if (isCorrectOpt) {
                  btnCls = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-100 font-medium';
                } else if (isSelected && !isCorrectOpt) {
                  btnCls = 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/25 text-rose-900 dark:text-rose-100';
                }
              } else if (isSelected) {
                btnCls = 'border-blue-600 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-zinc-900 dark:text-zinc-50 font-medium';
              }

              const optLetter = String.fromCharCode(65 + optIdx);

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(question, option)}
                  disabled={!isExamMode && isRealAnswered}
                  className={`w-full min-h-[48px] text-start p-3.5 sm:p-4 rounded-xl border transition-colors flex items-start gap-3 cursor-pointer ${btnCls}`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 border ${
                      showValidation && isCorrectOpt
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : showValidation && isSelected && !isCorrectOpt
                        ? 'bg-rose-600 text-white border-rose-600'
                        : isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {showValidation && isCorrectOpt ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : showValidation && isSelected && !isCorrectOpt ? (
                      <X className="w-3.5 h-3.5" />
                    ) : (
                      optLetter
                    )}
                  </span>

                  <span className={`flex-1 text-start leading-relaxed ${optionTextClass}`}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Written Question Interface */
          <div className="space-y-4 mt-4">
            <textarea
              value={writtenInputData[question.id] || ''}
              onChange={(e) => setWrittenInputData({ ...writtenInputData, [question.id]: e.target.value })}
              disabled={writtenRevealedState[question.id]}
              placeholder={t('writeYourAnswerHere')}
              rows={3}
              className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors resize-y"
            />

            {!writtenRevealedState[question.id] ? (
              <button
                type="button"
                onClick={() => handleSubmitWritten(question)}
                disabled={!writtenInputData[question.id]?.trim() || gradingLoadingState[question.id]}
                className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('submitWrittenAnswer')}</span>
              </button>
            ) : gradingLoadingState[question.id] ? (
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center gap-3 text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-semibold">
                  {isArabic ? 'جاري تقييم الإجابة بالذكاء الاصطناعي...' : 'Evaluating response with AI...'}
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3.5 text-start">
                {/* Model Answer */}
                <div>
                  <span className="text-[11px] font-medium text-zinc-400 block mb-1">
                    {t('modelAnswerLabel')}
                  </span>
                  <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {question.correctAnswer}
                  </p>
                </div>

                {/* AI Evaluation Box */}
                {writtenGrading && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {writtenGrading.statusText}
                        </span>
                      </div>

                      <span
                        className={`text-xs sm:text-sm font-bold tabular-nums ${
                          writtenGrading.score >= 75
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : writtenGrading.score >= 50
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {writtenGrading.score} / 100
                      </span>
                    </div>

                    {writtenGrading.feedback && (
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {writtenGrading.feedback}
                      </p>
                    )}

                    {writtenGrading.keyPointsMatched && writtenGrading.keyPointsMatched.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
                          {isArabic ? 'النقاط الصحيحة:' : 'Matched Concepts:'}
                        </span>
                        <ul className="space-y-1 text-xs text-emerald-700 dark:text-emerald-300 list-disc list-inside">
                          {writtenGrading.keyPointsMatched.map((pt, pIdx) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {writtenGrading.missingPoints && writtenGrading.missingPoints.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block mb-1">
                          {isArabic ? 'نقاط ينصح بإضافتها:' : 'Missing Key Points:'}
                        </span>
                        <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
                          {writtenGrading.missingPoints.map((pt, pIdx) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Manual override rating bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                      <span className="text-[11px] text-zinc-400">
                        {isArabic ? 'تعديل التقييم يدوياً:' : 'Override rating:'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleManualRateWritten(question.id, true)}
                          className={`min-h-[32px] px-3 py-1 rounded-lg font-medium text-xs border transition-colors cursor-pointer ${
                            userAns === 'WRITTEN_CORRECT'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-emerald-500'
                          }`}
                        >
                          {t('markCorrect')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleManualRateWritten(question.id, false)}
                          className={`min-h-[32px] px-3 py-1 rounded-lg font-medium text-xs border transition-colors cursor-pointer ${
                            userAns === 'WRITTEN_WRONG'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-rose-500'
                          }`}
                        >
                          {t('markWrong')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Explanation text */}
        {((!isExamMode && isRealAnswered) || answersRevealed) && question.explanation && (
          <div className="mt-4 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/50 text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-relaxed text-start">
            <span className="font-semibold block mb-0.5">{t('explanationHeader')}:</span>
            {question.explanation}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-24">
      {runnerToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-xl shadow-md text-xs font-semibold flex items-center gap-2 border border-zinc-800 dark:border-zinc-200 max-w-[90vw]">
          <Bookmark className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="truncate">{runnerToast}</span>
        </div>
      )}
      {/* Compact Sticky Test Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Exit & Quiz Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer shrink-0"
              title={t('exitQuizBtn')}
            >
              <BackArrow className="w-4 h-4" />
              <span className="hidden sm:inline">{t('exitQuizBtn')}</span>
            </button>
            <span className="font-semibold text-xs sm:text-sm truncate text-zinc-900 dark:text-zinc-100">
              {quiz.title}
            </span>
          </div>

          {/* Timer & Progress */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 tabular-nums">
            <div
              className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                isLowTime
                  ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900 animate-pulse'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatTime(displayTimeSeconds)}</span>
            </div>

            <span className="hidden md:inline text-xs font-mono text-zinc-500 dark:text-zinc-400">
              {answeredCount}/{questions.length}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ExamModeToggle isExamMode={isExamMode} onToggle={setIsExamMode} />

            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>{t('submitQuizBtn')}</span>
            </button>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-0.5">
          <div
            className="bg-blue-600 h-0.5 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto py-6 sm:py-8 px-3 sm:px-6">
        {/* Quick Toolbar (Display Mode, Shuffle, Reset, Reveal, Font Size) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-5 pb-4 border-b border-zinc-200 dark:border-zinc-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Single / All View Mode Toggle (Visible on all screens) */}
            <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-100 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => handleSetDisplayMode('single')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  displayMode === 'single'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                title={t('singleQuestionMode')}
                aria-label={t('singleQuestionMode')}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSetDisplayMode('all')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  displayMode === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                title={t('allQuestionsMode')}
                aria-label={t('allQuestionsMode')}
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setShowShuffleConfirm(true)}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
              title={t('shuffleQuestionsTooltip')}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">{t('shuffleBtn')}</span>
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
              title={t('resetAnswersTooltip')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">{t('resetBtn')}</span>
            </button>

            <button
              onClick={() => setShowAnswersConfirm(true)}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
              title={t('showAllAnswersTooltip')}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">{t('showAnswersBtn')}</span>
            </button>
          </div>

          {/* Font Size Selector */}
          <div className="flex items-center gap-1">
            <Type className="w-3.5 h-3.5 text-zinc-400 me-1" />
            {(['normal', 'large', 'xlarge'] as FontSizeLevel[]).map((sz) => (
              <button
                key={sz}
                onClick={() => handleSetFontSize(sz)}
                className={`min-h-[30px] px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                  fontSize === sz
                    ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {sz === 'normal' ? 'A' : sz === 'large' ? 'A+' : 'A++'}
              </button>
            ))}
          </div>
        </div>

        {/* Single Mode View vs All Mode View */}
        {displayMode === 'single' ? (
          <div>
            {renderQuestionCard(questions[currentQuestionIndex], currentQuestionIndex)}

            {/* Single mode Next/Prev pagination */}
            <div className="flex items-center justify-between gap-3 mt-5">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 disabled:opacity-35 transition-colors cursor-pointer"
              >
                <BackArrow className="w-4 h-4" />
                <span>{t('previous')}</span>
              </button>

              <span className="text-xs sm:text-sm font-mono text-zinc-500 tabular-nums">
                {currentQuestionIndex + 1} / {questions.length}
              </span>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <span>{t('next')}</span>
                  <NextArrow className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  className="inline-flex items-center gap-1.5 min-h-[42px] px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <span>{t('submitQuizBtn')}</span>
                </button>
              )}
            </div>

            <p className="hidden lg:block text-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 tabular-nums">
              {isArabic
                ? 'اختصارات لوحة المفاتيح: 1-4 لاختيار الإجابة · الأسهم للتنقل · F لتمييز السؤال'
                : 'Shortcuts: Keys 1-4 to pick option · Arrow keys for Prev/Next · F to flag'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => renderQuestionCard(q, idx))}
          </div>
        )}

        {/* Question Palette / Quick Jumper */}
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            <div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 me-2">{t('questionPalette')}</span>
              <span>
                {answeredCount}/{questions.length} {t('answered')}
                {flaggedCount > 0 ? ` · ${flaggedCount} ${t('flaggedForReview')}` : ''}
              </span>
            </div>

            {/* Filter Palette Items */}
            <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              {(
                [
                  { id: 'all', label: isArabic ? `الكل (${questions.length})` : `All (${questions.length})` },
                  {
                    id: 'unanswered',
                    label: isArabic
                      ? `غير المحلول (${Math.max(0, questions.length - answeredCount)})`
                      : `Unanswered (${Math.max(0, questions.length - answeredCount)})`,
                  },
                  { id: 'flagged', label: isArabic ? `المميز (${flaggedCount})` : `Flagged (${flaggedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPaletteFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    paletteFilter === tab.id
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const paletteEntries = questions
              .map((q, idx) => ({
                q,
                idx,
                isAnswered: !!userAnswers[q.id] && userAnswers[q.id] !== 'SHOW_ANSWERS_FLAG',
                isFlagged: !!flaggedQuestions[q.id],
              }))
              .filter((item) => {
                if (paletteFilter === 'unanswered') return !item.isAnswered;
                if (paletteFilter === 'flagged') return item.isFlagged;
                return true;
              });

            if (paletteEntries.length === 0) {
              return (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2">
                  {paletteFilter === 'flagged'
                    ? isArabic
                      ? 'لا توجد أسئلة مميزة للمراجعة حالياً.'
                      : 'No flagged questions yet.'
                    : isArabic
                    ? 'تمت الإجابة على جميع الأسئلة!'
                    : 'All questions have been answered!'}
                </p>
              );
            }

            return (
              <div className="flex flex-wrap gap-2">
                {paletteEntries.map(({ q, idx, isAnswered, isFlagged }) => {
                  const isCurrent = displayMode === 'single' && currentQuestionIndex === idx;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        if (displayMode === 'single') {
                          setCurrentQuestionIndex(idx);
                        } else {
                          document.getElementById(`question-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className={`w-8 h-8 rounded-lg text-xs font-mono font-medium flex items-center justify-center transition-colors cursor-pointer border tabular-nums ${
                        isCurrent
                          ? 'ring-2 ring-blue-600 dark:ring-blue-500 border-transparent font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          : isFlagged
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-700 font-semibold'
                          : isAnswered
                          ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 border-transparent'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </main>

      {/* Compact Bottom Action Button for Submit Quiz */}
      <aside aria-label="Quick Actions" className="fixed bottom-4 end-4 z-30">
        <button
          type="button"
          onClick={() => setShowSubmitConfirm(true)}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/20 transition-colors cursor-pointer tabular-nums"
          title={t('submitQuizBtn')}
        >
          <Send className="w-4 h-4 shrink-0" />
          <span>{t('submitQuizBtn')}</span>
          <span className="opacity-85 font-mono text-xs">
            ({answeredCount}/{questions.length})
          </span>
        </button>
      </aside>

      {/* Confirmation Modals */}
      {showShuffleConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-2">{t('shuffleConfirmTitle')}</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t('shuffleConfirmDesc')}</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowShuffleConfirm(false)}
                className="flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleShuffle}
                className="flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-2">{t('resetConfirmTitle')}</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t('resetConfirmDesc')}</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleResetAnswersOnly}
                className="flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                {t('resetBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnswersConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-2">{t('showAnswersConfirmTitle')}</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t('showAnswersConfirmDesc')}</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowAnswersConfirm(false)}
                className="flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleRevealAll}
                className="flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-2">{t('submitConfirmTitle')}</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {answeredCount < questions.length
                ? t('submitUnansweredWarning', { count: questions.length - answeredCount })
                : t('submitReadyDesc')}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {t('submitQuizBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-2">{t('restoreProgressTitle')}</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t('restoreProgressDesc')}</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={resetProgress}
                  className="flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {t('startFreshBtn')}
                </button>
                <button
                  type="button"
                  onClick={restoreProgress}
                  className="flex-1 min-h-[40px] py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                >
                  {t('restoreBtn')}
                </button>
              </div>
              <button
                type="button"
                onClick={onExit}
                className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <BackArrow className="w-4 h-4" />
                <span>{t('goBack')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Lightbox */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={zoomedImage}
            alt="Zoomed diagram"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
};

```


---

## `src/components/student/QuizRunnerRoute.tsx`

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Subject, Topic, Quiz, AIWrittenGradingResult, Question } from '../../types';
import { Navbar } from '../Navbar';
import { QuizRunner } from './QuizRunner';
import { CloudLoadingState } from '../CloudLoadingState';
import { fetchQuizByIdFromCloud } from '../../services/firestoreService';
import { useTeacherSession } from '../../hooks/useTeacherSession';
import { useLanguage } from '../../context/LanguageContext';
import { useStudentAuth } from '../../context/StudentAuthContext';

interface QuizRunnerRouteProps {
  quizzes: Quiz[];
  subjects: Subject[];
  topics: Topic[];
  isQuizzesLoaded: boolean;
  activeQuiz: Quiz | null;
  selectedSubject: Subject | null;
  selectedTopic: Topic | null;
  onSetActiveQuiz: (quiz: Quiz) => void;
  onQuizLoaded?: (quiz: Quiz) => void;
  onFinishQuiz: (results: {
    score: number;
    totalMCQs: number;
    totalWritten: number;
    userAnswers: Record<string, string>;
    writtenInputData: Record<string, string>;
    writtenGradingData: Record<string, AIWrittenGradingResult>;
    questions: Question[];
    timeSpentSeconds: number;
  }) => void;
  onExitToTopic: (topicId?: string) => void;
}

export const QuizRunnerRoute: React.FC<QuizRunnerRouteProps> = ({
  quizzes,
  subjects,
  topics,
  isQuizzesLoaded,
  activeQuiz,
  selectedSubject,
  selectedTopic,
  onSetActiveQuiz,
  onQuizLoaded,
  onFinishQuiz,
  onExitToTopic,
}) => {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const { studentUser, isQuestionBookmarked, toggleBookmarkQuestion } = useStudentAuth();
  const [sessionKey] = useState<number>(() => Date.now());
  const [directQuiz, setDirectQuiz] = useState<Quiz | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = useState<boolean>(false);
  const [fetchedForId, setFetchedForId] = useState<string | null>(null);

  const limitParam = parseInt(searchParams.get('limit') || '0', 10);
  const qTypeParam = (searchParams.get('qtype') as 'all' | 'mcq' | 'written') || 'all';

  // Find quiz from activeQuiz, synced quizzes list, or direct single-doc fetch
  const currentQuiz =
    (activeQuiz && activeQuiz.id === quizId ? activeQuiz : null) ||
    quizzes.find((q) => q.id === quizId) ||
    (directQuiz && directQuiz.id === quizId ? directQuiz : null);

  // Direct single-document fetch when opening a copied quiz link before collection sync completes
  useEffect(() => {
    if (!quizId || currentQuiz || fetchedForId === quizId) return;

    let cancelled = false;
    setIsFetchingDirect(true);

    fetchQuizByIdFromCloud(quizId)
      .then((cloudQuiz) => {
        if (cancelled) return;
        setFetchedForId(quizId);
        if (cloudQuiz) {
          setDirectQuiz(cloudQuiz);
          onQuizLoaded?.(cloudQuiz);
          onSetActiveQuiz(cloudQuiz);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFetchingDirect(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [quizId, currentQuiz, fetchedForId, onQuizLoaded, onSetActiveQuiz]);

  // Sync activeQuiz if found via collection subscription
  useEffect(() => {
    if (currentQuiz && (!activeQuiz || activeQuiz.id !== currentQuiz.id)) {
      onSetActiveQuiz(currentQuiz);
    }
  }, [currentQuiz, activeQuiz, onSetActiveQuiz]);

  const preparedQuiz = useMemo(() => {
    if (!currentQuiz) return null;
    const hasCustomCount = Number.isFinite(limitParam) && limitParam > 0 && limitParam < currentQuiz.questions.length;
    const hasTypeFilter = qTypeParam === 'mcq' || qTypeParam === 'written';
    if (!hasCustomCount && !hasTypeFilter) return currentQuiz;

    const filtered =
      qTypeParam === 'mcq'
        ? currentQuiz.questions.filter((q) => q.type !== 'written')
        : qTypeParam === 'written'
        ? currentQuiz.questions.filter((q) => q.type === 'written')
        : currentQuiz.questions;

    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const sliced = limitParam > 0 ? shuffled.slice(0, Math.min(limitParam, shuffled.length)) : shuffled;

    if (sliced.length === 0) return currentQuiz;

    return {
      ...currentQuiz,
      title: `${currentQuiz.title} (${sliced.length})`,
      questions: sliced,
    };
  }, [currentQuiz, limitParam, qTypeParam, sessionKey]);

  const teacherSession = useTeacherSession();
  const isDraftBlocked = Boolean(
    currentQuiz &&
      currentQuiz.isPublished === false &&
      teacherSession.status !== 'ready' &&
      teacherSession.status !== 'loading'
  );

  if (!currentQuiz || !preparedQuiz || isDraftBlocked) {
    const stillLoading = !isDraftBlocked && (!isQuizzesLoaded || isFetchingDirect || fetchedForId !== quizId);
    return (
      <>
        <Navbar
          viewMode="student_runner"
          onNavigate={() => {}}
          selectedSubject={selectedSubject}
          selectedTopic={selectedTopic}
          selectedQuiz={null}
          onBackToSubjects={() => navigate('/courses')}
          onBackToTopics={() => (selectedSubject ? navigate(`/subject/${selectedSubject.id}`) : navigate('/courses'))}
        />
        <CloudLoadingState
          status={stillLoading ? 'loading' : 'not-found'}
          title={
            stillLoading
              ? isArabic
                ? 'جاري تحميل الاختبار...'
                : 'Loading Quiz...'
              : isDraftBlocked
              ? isArabic
                ? 'هذا الاختبار مسودة قيد الإعداد'
                : 'Quiz is Currently a Draft'
              : isArabic
              ? 'الاختبار غير موجود'
              : 'Quiz Not Found'
          }
          subtitle={
            stillLoading
              ? isArabic
                ? 'يتم الآن جلب أسئلة الاختبار من السحابة، سيفتح الاختبار تلقائياً فور اكتمال التحميل.'
                : 'Fetching quiz questions from the cloud database. The quiz will open automatically once ready.'
              : isDraftBlocked
              ? isArabic
                ? 'لم يقم المعلم بنشر هذا الاختبار للطلاب بعد.'
                : 'The instructor has not published this quiz to students yet.'
              : isArabic
              ? 'لم يتم العثور على هذا الاختبار في قاعدة البيانات، قد يكون الرابط غير مكتمل أو تم حذفه.'
              : 'This quiz could not be found in the database. The link may be invalid or removed.'
          }
          onBackHome={() => navigate('/')}
        />
      </>
    );
  }

  const currentTopic = selectedTopic || topics.find((t) => t.id === currentQuiz.topicId) || null;
  const currentSubject = selectedSubject || subjects.find((s) => s.id === currentQuiz.subjectId) || null;

  return (
    <>
      <Navbar
        viewMode="student_runner"
        onNavigate={() => {}}
        selectedSubject={currentSubject}
        selectedTopic={currentTopic}
        selectedQuiz={preparedQuiz}
        onBackToSubjects={() => navigate('/courses')}
        onBackToTopics={() => (currentSubject ? navigate(`/subject/${currentSubject.id}`) : navigate('/courses'))}
      />
      <main className="flex-1">
        <QuizRunner
          key={`${preparedQuiz.id}-${limitParam || 'full'}-${qTypeParam}-${sessionKey}`}
          quiz={preparedQuiz}
          onFinishQuiz={onFinishQuiz}
          onExit={() => onExitToTopic(currentTopic?.id || currentQuiz.topicId || undefined)}
          isStudentSignedIn={Boolean(studentUser)}
          isQuestionBookmarked={(q) => isQuestionBookmarked(currentQuiz.id, q)}
          onToggleBookmark={(q) =>
            toggleBookmarkQuestion({
              quiz: currentQuiz,
              subjectName: currentSubject?.name || (isArabic ? 'عام' : 'General'),
              question: q,
            })
          }
        />
      </main>
    </>
  );
};


```
