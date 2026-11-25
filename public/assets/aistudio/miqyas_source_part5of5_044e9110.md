# مقياس — كود المشروع (الجزء 5 من 5)

هذا الملف جزء من نسخة نصية كاملة من مشروع مقياس (React + Vite + Express + Firebase). الملفات مرتبة بمسارها داخل المشروع، وكل ملف يبدأ بعنوان فيه مساره.

## ملفات هذا الجزء

- `src/components/teacher/TeacherLogin.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Ruler.tsx`
- `src/config/brand.ts`
- `src/context/LanguageContext.tsx`
- `src/context/StudentAuthContext.tsx`
- `src/data/defaultData.ts`
- `src/firebase.ts`
- `src/hooks/useResumableQuizzes.ts`
- `src/hooks/useTeacherSession.ts`
- `src/index.css`
- `src/main.tsx`
- `src/services/aiService.ts`
- `src/services/firestoreService.ts`
- `src/services/studentCloudService.ts`
- `src/services/teacherService.ts`
- `src/types.ts`
- `src/utils/imageCompressor.ts`
- `src/utils/parser.ts`
- `src/utils/pdfExtractor.ts`
- `src/utils/printHelper.ts`
- `src/utils/storage.ts`
- `src/utils/textDirection.ts`


---

## `src/components/teacher/TeacherLogin.tsx`

```tsx
import React from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { TeacherSessionStatus } from '../../hooks/useTeacherSession';
import { Logo } from '../Logo';
import { buttonClass } from '../ui/Button';

interface TeacherLoginProps {
  status: TeacherSessionStatus;
  /** بريد الحساب المسجل حالياً (لو فيه) */
  email: string;
  error: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onCancel: () => void;
}

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
  </svg>
);

export const TeacherLogin: React.FC<TeacherLoginProps> = ({
  status,
  email,
  error,
  onSignIn,
  onSignOut,
  onCancel,
}) => {
  const { isArabic } = useLanguage();
  const unauthorized = status === 'unauthorized';

  const errorText = error
    ? error === 'auth/popup-blocked'
      ? isArabic
        ? 'المتصفح منع نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة وحاول مرة أخرى.'
        : 'The browser blocked the sign-in popup. Allow popups and try again.'
      : isArabic
      ? 'تعذّر تسجيل الدخول. حاول مرة أخرى.'
      : 'Sign-in failed. Please try again.'
    : '';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-md w-full">
        <div className="mb-6">
          <Logo size="md" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
          {isArabic ? 'بوابة المعلم' : 'Teacher portal'}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-7">
          {isArabic
            ? 'سجّل الدخول بحساب Google المسجّل لدى المدير كمعلم.'
            : 'Sign in with the Google account your admin registered as a teacher.'}
        </p>

        {unauthorized && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm leading-7"
          >
            {isArabic ? (
              <>
                الحساب <span dir="ltr" className="font-semibold">{email}</span> غير مسجّل كمعلم. اطلب من المدير إضافة بريدك، أو سجّل الدخول بحساب آخر.
              </>
            ) : (
              <>
                <span className="font-semibold">{email}</span> is not registered as a teacher. Ask your admin to add your email, or sign in with another account.
              </>
            )}
          </div>
        )}

        {errorText && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-1" />
            <span>{errorText}</span>
          </div>
        )}

        {status === 'loading' ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-3">
            {isArabic ? 'جارٍ التحقق من الحساب...' : 'Checking your account...'}
          </p>
        ) : unauthorized ? (
          <button type="button" onClick={onSignOut} className={buttonClass('secondary', 'lg', 'w-full')}>
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{isArabic ? 'تبديل الحساب' : 'Use another account'}</span>
          </button>
        ) : (
          <button type="button" onClick={onSignIn} className={buttonClass('primary', 'lg', 'w-full')}>
            <span className="bg-white rounded-md p-0.5 flex">
              <GoogleMark />
            </span>
            <span>{isArabic ? 'الدخول بحساب Google' : 'Continue with Google'}</span>
          </button>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            {isArabic ? 'العودة للرئيسية' : 'Back to home'}
          </button>
        </div>
      </div>
    </div>
  );
};

```


---

## `src/components/ui/Button.tsx`

```tsx
import React from 'react';

/**
 * زر موحّد لكل التطبيق.
 * كان الكود القديم يكرر نفس سلسلة الكلاسات في عشرات الأماكن؛
 * هنا أربعة أشكال فقط، وكلها بحد أدنى 40px للمس على الموبايل.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 border border-transparent',
  secondary:
    'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800',
  ghost:
    'bg-transparent text-zinc-700 dark:text-zinc-300 border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 border border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 text-sm gap-1.5',
  md: 'min-h-[42px] px-4 text-sm gap-2',
  lg: 'min-h-[48px] px-6 text-base gap-2.5',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap cursor-pointer select-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) => <button type={type} className={buttonClass(variant, size, className)} {...props} />;

```


---

## `src/components/ui/Ruler.tsx`

```tsx
import React from 'react';

interface RulerStat {
  label: string;
  value: number | string;
}

/**
 * شريط إحصاءات على شكل مسطرة: الأرقام فوق خط التدريج.
 * هو العنصر البصري المميز للصفحة الرئيسية.
 */
export const RulerStats: React.FC<{ stats: RulerStat[]; className?: string }> = ({
  stats,
  className = '',
}) => (
  <div className={className}>
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-y-5">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`px-4 first:ps-0 ${i > 0 ? 'sm:border-s border-zinc-200 dark:border-zinc-800' : ''}`}
        >
          <dd className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
            {s.value}
          </dd>
          <dt className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{s.label}</dt>
        </div>
      ))}
    </dl>
    <div className="ruler-ticks mt-5" aria-hidden="true" />
  </div>
);

/** شريط تقدم بتدريج: يُستخدم لعرض نسبة الإنجاز في الاختبار أو المقرر */
export const RulerProgress: React.FC<{ value: number; max: number; label?: string }> = ({
  value,
  max,
  label,
}) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="relative h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden"
    >
      <div
        className="absolute inset-y-0 start-0 rounded-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

```


---

## `src/config/brand.ts`

```ts
/**
 * مصدر واحد لاسم المنصة وهويتها.
 * أي مكان في الكود يحتاج الاسم يستورد من هنا بدل ما يكتبه يدوياً.
 */
export const BRAND = {
  nameAr: 'مقياس',
  nameEn: 'Miqyas',
  taglineAr: 'اختبر فهمك، وقِس تقدّمك',
  taglineEn: 'Test your understanding. Measure your progress.',
  descriptionAr:
    'مقياس منصة عربية للاختبارات التفاعلية: حل اختبارات المقررات، راجع أخطاءك، وتابع مستواك. وللمعلمين أدوات لبناء الاختبارات ونشرها.',
  descriptionEn:
    'Miqyas is an Arabic-first platform for interactive quizzes: practice course quizzes, review your mistakes, and track your level. Teachers get tools to build and publish quizzes.',
} as const;

/** يرجع الاسم المناسب للغة الحالية */
export const brandName = (isArabic: boolean) => (isArabic ? BRAND.nameAr : BRAND.nameEn);

```


---

## `src/context/LanguageContext.tsx`

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isArabic: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Brand & General
    appTitle: 'مقياس',
    teacherPortal: 'بوابة المعلم',
    studentView: 'بوابة الطالب',
    lightMode: 'فاتح',
    darkMode: 'داكن',
    back: 'رجوع',
    goBack: 'العودة',
    cancel: 'إلغاء',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    confirm: 'تأكيد',
    search: 'بحث...',
    loading: 'جاري التحميل...',
    
    // Breadcrumbs & Nav
    home: 'الرئيسية',
    courses: 'المقررات',
    topics: 'الموضوعات',
    quizzes: 'الاختبارات',

    // Student Subjects View
    academicCourses: 'المقررات الدراسية',
    selectCourse: 'اختر المقرر الدراسي',
    browseCoursesSubtitle: 'تصفح الموضوعات والمحاضرات والاختبارات التفاعلية',
    searchCoursesPlaceholder: 'ابحث عن مقرر...',
    noCoursesAvailable: 'لا توجد مقررات دراسية حالياً',
    noCoursesDesc: 'لم تتم إضافة أي مقررات بعد. يرجى المراجعة لاحقاً.',
    noMatchingCourses: 'لا توجد مقررات مطابقة للبحث',
    tryDifferentKeywords: 'جرب البحث بكلمات مختلفة.',
    topicsCountBadge: '{count} موضوع',
    quizzesCountBadge: '{count} اختبار',
    startLearning: 'ابدأ التعلم',

    // Student Topics View
    courseBadge: 'المقرر',
    searchTopicsPlaceholder: 'ابحث في الموضوعات والمحاضرات...',
    topicsListHeader: 'الموضوعات والمحاضرات ({count})',
    directQuizzesHeader: 'الاختبارات المتاحة للمادة ({count})',
    directQuizzesDesc: 'اختبارات تابعة للمادة مباشرة بدون تحديد موضوع',
    generalQuizBadge: 'اختبار عام للمادة',
    noTopicsAvailable: 'لا توجد موضوعات متاحة',
    noTopicsDesc: 'تحقق لاحقاً أو اختر مقرراً دراسياً آخر.',
    noTopicsOrQuizzesAvailable: 'لا توجد موضوعات أو اختبارات متاحة حالياً',
    noTopicsOrQuizzesDesc: 'لم تتم إضافة أي موضوعات أو اختبارات لهذا المقرر بعد.',
    noMatchingTopicsOrQuizzes: 'لا توجد نتائج مطابقة للبحث في هذا المقرر',
    questionsCountBadge: '{count} سؤال',
    practiceNow: 'تدرب الآن',

    // Student Quizzes View
    availableQuizzesHeader: 'الاختبارات المتاحة ({count})',
    noQuizzesAvailable: 'لا توجد اختبارات متاحة',
    noQuizzesDesc: 'ستظهر الاختبارات الخاصة بهذا الموضوع هنا بمجرد إضافتها.',
    questionsCount: '{count} أسئلة',
    writtenCount: '{count} مقالي',
    multipleChoiceCount: '{count} اختيار من متعدد',
    timeLimitMins: '{count} دقيقة',
    noTimeLimit: 'بدون وقت محدد',
    startQuizButton: 'بدء الاختبار',

    // Quiz Runner Header & Controls
    examModeActive: 'وضع الاختبار مفعل',
    instantModeActive: 'المراجعة الفورية مفعلة',
    examModeDesc: 'يتم عرض النتائج والإجابات النموذجية بعد تسليم الاختبار',
    instantModeDesc: 'يتم فحص كل إجابة فور اختيارها مع التوضيح والشرح',
    timeRemaining: 'الوقت المتبقي',
    finishQuizBtn: 'إنهاء الاختبار',
    exitQuizBtn: 'خروج',
    submitQuizBtn: 'تسليم',
    questionProgress: 'سؤال {current} من {total}',
    completedProgress: 'مكتمل ({percent}%)',
    shuffleBtn: 'ترتيب عشوائي',
    shuffleQuizBtn: 'ترتيب عشوائي',
    shuffleQuestionsTooltip: 'إعادة ترتيب الأسئلة والخيارات عشوائياً',
    resetBtn: 'إعادة تعيين',
    resetAnswersBtn: 'إعادة تعيين',
    resetAnswersTooltip: 'مسح وتصفير الإجابات الحالية',
    showAnswersBtn: 'عرض الإجابات',
    showAllAnswersBtn: 'عرض الإجابات',
    showAllAnswersTooltip: 'إظهار الإجابات النموذجية لجميع الأسئلة',
    multipleChoiceBadge: 'اختيار من متعدد',
    writtenBadge: 'سؤال مقالي',
    correctBadge: 'إجابة صحيحة',
    incorrectBadge: 'إجابة غير صحيحة',
    notAnsweredBadge: 'لم يتم الإجابة',
    evaluatedBadge: 'تم التقييم',
    needsReviewBadge: 'تحتاج مراجعة',
    explanationTitle: '💡 التوضيح والشرح:',
    explanationHeader: '💡 التوضيح والشرح:',
    typeAnswerPlaceholder: 'اكتب إجابتك هنا بالتفصيل...',
    writeYourAnswerHere: 'اكتب إجابتك هنا بالتفصيل...',
    submitToViewModel: 'أرسل إجابتك لعرض وتقييم الإجابة النموذجية',
    submitAnswerBtn: 'تسليم الإجابة',
    submitWrittenAnswer: 'تسليم الإجابة',
    yourAnswerLabel: 'إجابتك المسلمة:',
    modelAnswerLabel: 'الإجابة النموذجية المعتمدة:',
    overrideLabel: 'تعديل التقييم:',
    markCorrect: 'صحيحة',
    markWrong: 'خاطئة',
    markCorrectBtn: 'صحيحة',
    markWrongBtn: 'خاطئة',
    flagQuestion: 'تمييز',
    unflagQuestion: 'إلغاء التمييز',
    flagForReview: 'تمييز',
    flaggedForReview: 'مميز للمراجعة',
    flaggedBadge: 'مميز للمراجعة',
    flaggedCountBadge: '{count} مميز للمراجعة',
    flaggedNotice: 'لديك {count} سؤال مميز للمراجعة لم تنتهِ منه بعد',
    fontSize: 'حجم الخط',
    fontSizeNormal: 'عادي',
    fontSizeLarge: 'كبير',
    fontSizeXLarge: 'كبير جداً',
    singleQuestionMode: 'سؤال بسؤال',
    allQuestionsMode: 'عرض كامل الأسئلة',
    viewModeLabel: 'طريقة العرض:',
    questionNavigator: 'قائمة الأسئلة',
    questionPalette: 'قائمة الأسئلة',
    questionNumber: 'سؤال {current} من {total}',
    previous: 'السابق',
    next: 'التالي',
    prevQuestion: 'السابق',
    nextQuestion: 'التالي',
    answered: 'تم الحل',
    answeredStatus: 'تم الحل',
    unansweredStatus: 'لم يحل',
    flaggedStatus: 'محدد للمراجعة',

    // Modals
    exitQuizTitle: 'الخروج من الاختبار؟',
    exitQuizDesc: 'سيتم حفظ تقدمك الحالي في هذا الاختبار للعودة إليه لاحقاً.',
    keepPracticing: 'متابعة',
    saveAndExit: 'خروج',
    submitQuizTitle: 'إنهاء وتسليم الاختبار؟',
    submitConfirmTitle: 'إنهاء وتسليم الاختبار؟',
    submitQuizDesc: 'أجبت على {answered} من {total} سؤال. هل تود تسليم الإجابات الآن وعرض نتيجتك النهائية؟',
    submitUnansweredWarning: 'لديك {count} سؤال لم تقم بالإجابة عليه بعد. هل أنت متأكد من التسليم الآن؟',
    submitReadyDesc: 'لقد قمت بالإجابة على جميع الأسئلة. هل أنت مستعد لتسليم الاختبار وعرض النتيجة النهائية؟',
    submitNow: 'تسليم',
    shuffleQuizTitle: 'ترتيب عشوائي للأسئلة والخيارات؟',
    shuffleConfirmTitle: 'ترتيب عشوائي للأسئلة والخيارات؟',
    shuffleQuizDesc: 'سيتم إعادة خلط وترتيب الأسئلة والخيارات عشوائياً وتصفير الإجابات الحالية. هل تود المتابعة؟',
    shuffleConfirmDesc: 'سيتم إعادة خلط وترتيب الأسئلة والخيارات عشوائياً وتصفير الإجابات الحالية. هل تود المتابعة؟',
    shuffleNow: 'ترتيب',
    resetAnswersTitle: 'إعادة تعيين جميع الإجابات؟',
    resetConfirmTitle: 'إعادة تعيين جميع الإجابات؟',
    resetAnswersDesc: 'سيتم مسح جميع الإجابات الحالية والبدء من جديد. هل أنت متأكد؟',
    resetConfirmDesc: 'سيتم مسح جميع الإجابات الحالية والبدء من جديد. هل أنت متأكد؟',
    clearAll: 'تصفير',
    showAllAnswersTitle: 'كشف جميع الإجابات النموذجية؟',
    showAnswersConfirmTitle: 'كشف جميع الإجابات النموذجية؟',
    showAllAnswersDesc: 'سيتم إظهار الإجابات النموذجية لجميع الأسئلة في هذا الاختبار فوراً.',
    showAnswersConfirmDesc: 'سيتم إظهار الإجابات النموذجية لجميع الأسئلة في هذا الاختبار فوراً.',
    revealNow: 'كشف',
    restoreProgressTitle: 'استعادة التقدم المحفوظ؟',
    restoreProgressDesc: 'تم العثور على محاولة سابقة غير مكتملة لهذا الاختبار. هل ترغب في متابعتها أم البدء من جديد؟',
    startFreshBtn: 'بدء جديد',
    restoreBtn: 'متابعة',

    // Quiz Results
    quizCompletedTitle: 'اكتمل الاختبار بنجاح!',
    scoreSummary: 'النتيجة النهائية',
    timeSpentSummary: 'الوقت المستغرق',
    accuracySummary: 'نسبة الدقة',
    unansweredCount: 'لم تتم الإجابة',
    reviewQuestions: 'مراجعة الأسئلة',
    reviewWrongQuestions: 'مراجعة الأخطاء',
    questionsNeedReview: 'لديك {count} أسئلة بحاجة إلى مراجعة وتدقيق',
    retakeQuizBtn: 'إعادة الاختبار',
    backToCoursesBtn: 'المقررات',
    reviewQuestionsHeader: 'مراجعة الأسئلة ({count})',
    reviewQuestionsDesc: 'هذه الأسئلة تحتاج إلى مراجعة وتدقيق للإجابة الصحيحة',
    yourChoiceWrong: '❌ إجابتك',
    correctChoiceTag: '✔ الإجابة الصحيحة',
    noAnswerProvided: 'لم يتم تقديم إجابة',
    aiFeedbackTitle: 'ملاحظات التقييم الذكي:',

    // Teacher Login
    teacherAccessTitle: 'تسجيل دخول المعلم',
    teacherAccessSubtitle: 'أدخل اسم المستخدم وكلمة المرور للوصول إلى لوحة التحكم',
    usernameLabel: 'اسم المستخدم:',
    usernamePlaceholder: 'أدخل اسم المستخدم (مثال: admin)',
    passwordLabel: 'كلمة المرور:',
    passwordPlaceholder: 'أدخل كلمة المرور',
    loginSubmitBtn: 'تسجيل الدخول',
    loginInvalidError: 'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.',

    // Teacher Dashboard
    dashboardTitle: 'لوحة تحكم المعلم',
    dashboardSubtitle: 'إنشاء وتعديل ونشر المقررات والاختبارات التفاعلية',
    tabCreateQuiz: 'إنشاء اختبار',
    tabSubjectsTopics: 'المقررات والموضوعات',
    tabManageQuizzes: 'إدارة الاختبارات',
    tabManageTeachers: 'إدارة المعلمين',
    tabAnalytics: 'الإحصائيات',
    logoutBtn: 'خروج',
    welcomeTeacher: 'مرحباً، {name}',
    adminRoleBadge: 'مدير عام (Admin)',
    teacherRoleBadge: 'معلم مصرح',
    createdByLabel: 'المنشئ:',
    byYou: 'بواسطتك',
    byAdmin: 'المدير العام (Admin)',
    byTeacher: 'المعلم: {name}',
    noEditPermission: 'لا تملك صلاحية تعديل أو حذف هذا العنصر لأنه تم إنشاؤه بواسطة معلم آخر.',
    
    // Teacher - Manage Teachers Tab (Admin only)
    teachersListTitle: 'حسابات المعلمين المسجلة ({count})',
    teachersListSubtitle: 'يمكن للمدير العام فقط إنشاء حسابات معلمين جدد وإدارة صلاحياتهم',
    addNewTeacherBtn: 'معلم جديد',
    newTeacherModalTitle: 'إنشاء حساب معلم جديد',
    teacherDisplayNameLabel: 'الاسم الظاهر للمعلم:',
    teacherDisplayNamePlaceholder: 'مثال: أ. محمد أحمد أو د. سارة',
    teacherUsernameLabel: 'اسم المستخدم (لتسجيل الدخول):',
    teacherUsernamePlaceholder: 'مثال: mohamed2025',
    teacherPasswordLabel: 'كلمة المرور:',
    teacherPasswordPlaceholder: 'أدخل كلمة مرور قوية للحساب',
    createTeacherSubmit: 'إنشاء الحساب',
    usernameAlreadyExists: 'اسم المستخدم هذا مستخدم بالفعل، يرجى اختيار اسم مستخدم آخر.',
    usernameRequired: 'يرجى إدخال اسم المستخدم وكلمة المرور.',
    deleteTeacherConfirm: 'هل أنت متأكد من حذف حساب المعلم "{name}"؟ لن يتمكن من تسجيل الدخول مجدداً.',
    cannotDeleteAdmin: 'لا يمكن حذف حساب المدير العام الأساسي.',
    teacherAddedSuccess: 'تم إنشاء حساب المعلم بنجاح!',
    teacherDeletedSuccess: 'تم حذف حساب المعلم بنجاح.',
    
    // Teacher - Create Quiz Tab
    aiFormatBtn: 'قالب AI',
    autoFormatBtn: 'تنسيق تلقائي',
    aiPromptModalTitle: 'برومبت الذكاء الاصطناعي لتنسيق الأسئلة',
    aiPromptModalSubtitle: 'انسخ هذا البرومبت المجهز بالكامل مع أسئلتك والصقه في أي نموذج ذكاء اصطناعي (مثل ChatGPT أو Gemini أو Claude) للحصول على التنسيق المطلوب بدقة متناهية.',
    copyPromptBtn: 'نسخ البرومبت',
    promptCopied: 'تم النسخ!',
    aiPromptCustomNote: 'البرومبت يحتوي على القواعد الإرشادية القياسية للتنسيق مرفقاً معها نص أسئلتك الحالي.',
    pasteAiResultTitle: 'لصق نتيجة الذكاء الاصطناعي:',
    pasteAiResultBtn: 'تطبيق المحتوى',
    aiResultPastedSuccess: 'تم تطبيق النتيجة وتحديث محرر الأسئلة بنجاح!',
    clearTextBtn: 'مسح',
    pasteQuestionsPlaceholder: 'الصق الأسئلة هنا...\n\nمثال:\nLecture: مقدمة في البرمجة\n\n1. ما هو المتغير؟\nA. مكان لتخزين البيانات\nB. دالة حسابية\nCorrect: A',
    selectSubjectLabel: 'المقرر الدراسي:',
    selectTopicLabel: 'الموضوع / الوحدة:',
    timeLimitLabel: 'المدة الزمنية (بالدقائق - 0 بدون وقت):',
    descriptionOptionalLabel: 'الوصف (اختياري):',
    descriptionPlaceholder: 'مثال: أسئلة تدريبية للمحاضرة الأولى...',
    detectedQuizTitles: 'عناوين الاختبارات المكتشفة من وسم (Lecture):',
    noLectureDetected: 'لم يتم تحديد وسم Lecture (سيتم استخدام اسم الموضوع كعنوان)',
    willCreateMultiple: 'سيتم إنشاء {count} اختبارات مستقلة عند النشر',
    previewQuizBtn: 'معاينة',
    downloadHtmlBtn: 'تصدير',
    publishQuizBtn: 'نشر',
    updateQuizBtn: 'حفظ',
    editingQuizBanner: 'أنت تقوم بتعديل الاختبار حالياً: ',
    cancelEditBtn: 'إلغاء',

    // Teacher - Subjects & Topics Tab
    subjectsAndTopicsTitle: 'إدارة المقررات والموضوعات',
    newSubjectBtn: 'مقرر جديد',
    newTopicBtn: 'موضوع جديد',
    deleteConfirmSubject: 'هل أنت متأكد من حذف هذا المقرر؟ سيتم حذف جميع موضوعاته واختباراته.',
    deleteConfirmTopic: 'هل أنت متأكد من حذف هذا الموضوع وجميع اختباراته؟',
    deleteConfirmQuiz: 'هل أنت متأكد من حذف هذا الاختبار؟',

    // Teacher - Quizzes List Tab
    quizzesListTitle: 'الاختبارات المنشورة ({count})',
    noQuizzesYet: 'لم يتم إنشاء أي اختبارات بعد.',
    createNewQuizPrompt: 'ابدأ بإنشاء أول اختبار من تبويب "إنشاء اختبار".',
    testAsStudentBtn: 'تجربة كطالب',

    // Teacher - Analytics Tab
    totalSubjectsStat: 'إجمالي المقررات',
    totalTopicsStat: 'إجمالي الموضوعات',
    totalQuizzesStat: 'إجمالي الاختبارات',
    totalQuestionsStat: 'إجمالي الأسئلة',
  },
  en: {
    // Brand & General
    appTitle: 'Miqyas',
    teacherPortal: 'Teacher Portal',
    studentView: 'Student View',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    back: 'Back',
    goBack: 'Go Back',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    search: 'Search...',
    loading: 'Loading...',
    
    // Breadcrumbs & Nav
    home: 'Home',
    courses: 'Courses',
    topics: 'Topics',
    quizzes: 'Quizzes',

    // Student Subjects View
    academicCourses: 'Academic Courses',
    selectCourse: 'Select Course',
    browseCoursesSubtitle: 'Browse topics, lectures, and interactive quizzes',
    searchCoursesPlaceholder: 'Search courses...',
    noCoursesAvailable: 'No Courses Available',
    noCoursesDesc: 'No subjects have been added yet. Please check back later.',
    noMatchingCourses: 'No matching courses',
    tryDifferentKeywords: 'Try searching with different keywords.',
    topicsCountBadge: '{count} Topics',
    quizzesCountBadge: '{count} Quizzes',
    startLearning: 'Start Learning',

    // Student Topics View
    courseBadge: 'Course',
    searchTopicsPlaceholder: 'Search topics and quizzes...',
    topicsListHeader: 'Topics & Units ({count})',
    directQuizzesHeader: 'Course Quizzes ({count})',
    directQuizzesDesc: 'Quizzes linked directly to this course',
    generalQuizBadge: 'General Quiz',
    noTopicsAvailable: 'No topics available',
    noTopicsDesc: 'Check back later or choose another course.',
    noTopicsOrQuizzesAvailable: 'No topics or quizzes available',
    noTopicsOrQuizzesDesc: 'No topics or quizzes have been added to this course yet.',
    noMatchingTopicsOrQuizzes: 'No matching topics or quizzes found in this course',
    questionsCountBadge: '{count} Questions',
    practiceNow: 'Practice',

    // Student Quizzes View
    availableQuizzesHeader: 'Available Quizzes ({count})',
    noQuizzesAvailable: 'No quizzes available',
    noQuizzesDesc: 'Quizzes for this topic will appear here once added.',
    questionsCount: '{count} Questions',
    writtenCount: '{count} Written',
    multipleChoiceCount: '{count} Multiple Choice',
    timeLimitMins: '{count}m',
    noTimeLimit: 'No limit',
    startQuizButton: 'Start Quiz',

    // Quiz Runner Header & Controls
    examModeActive: 'Exam Mode Active',
    instantModeActive: 'Instant Mode Active',
    examModeDesc: 'Results and model answers are shown after completing the quiz',
    instantModeDesc: 'Check feedback and explanations instantly as you answer',
    timeRemaining: 'Time remaining',
    finishQuizBtn: 'Finish Quiz',
    exitQuizBtn: 'Exit',
    submitQuizBtn: 'Submit Quiz',
    questionProgress: 'Question {current} of {total}',
    completedProgress: 'Completed ({percent}%)',
    shuffleBtn: 'Shuffle',
    shuffleQuizBtn: 'Shuffle Questions & Options',
    shuffleQuestionsTooltip: 'Randomize questions and options order',
    resetBtn: 'Reset',
    resetAnswersBtn: 'Reset Answers',
    resetAnswersTooltip: 'Clear current answers',
    showAnswersBtn: 'Show Answers',
    showAllAnswersBtn: 'Reveal All Answers',
    showAllAnswersTooltip: 'Reveal model answers for all questions',
    multipleChoiceBadge: 'Multiple Choice',
    writtenBadge: 'Written',
    correctBadge: 'Correct',
    incorrectBadge: 'Incorrect',
    notAnsweredBadge: 'Not Answered',
    evaluatedBadge: 'Evaluated',
    needsReviewBadge: 'Needs Review',
    explanationTitle: '💡 Explanation:',
    explanationHeader: '💡 Explanation:',
    typeAnswerPlaceholder: 'Type your answer here...',
    writeYourAnswerHere: 'Type your answer here in detail...',
    submitToViewModel: 'Submit your answer to view the model answer',
    submitAnswerBtn: 'Submit Answer',
    submitWrittenAnswer: 'Submit Answer',
    yourAnswerLabel: 'Your answer:',
    modelAnswerLabel: 'Model Answer:',
    overrideLabel: 'Override:',
    markCorrect: 'Mark Correct',
    markWrong: 'Mark Wrong',
    markCorrectBtn: 'Mark Correct',
    markWrongBtn: 'Mark Wrong',
    flagQuestion: 'Flag for review',
    unflagQuestion: 'Remove flag',
    flagForReview: 'Flag for review',
    flaggedForReview: 'Flagged for review',
    flaggedBadge: 'Flagged',
    flaggedCountBadge: '{count} Flagged',
    flaggedNotice: 'You have {count} flagged question(s) marked for review',
    fontSize: 'Font Size',
    fontSizeNormal: 'Normal',
    fontSizeLarge: 'Large',
    fontSizeXLarge: 'Extra Large',
    singleQuestionMode: 'One-by-One',
    allQuestionsMode: 'All Questions',
    viewModeLabel: 'Display Mode:',
    questionNavigator: 'Question Index',
    questionPalette: 'Question Index',
    questionNumber: 'Question {current} of {total}',
    previous: 'Previous',
    next: 'Next',
    prevQuestion: 'Previous Question',
    nextQuestion: 'Next Question',
    answered: 'answered',
    answeredStatus: 'Answered',
    unansweredStatus: 'Unanswered',
    flaggedStatus: 'Flagged for Review',

    // Modals
    exitQuizTitle: 'Exit Quiz?',
    exitQuizDesc: 'Your current progress will be saved so you can continue later.',
    keepPracticing: 'Keep Practicing',
    saveAndExit: 'Save & Exit',
    submitQuizTitle: 'Submit Quiz?',
    submitConfirmTitle: 'Submit Quiz?',
    submitQuizDesc: 'You answered {answered} of {total} questions. Ready to submit and see your final score?',
    submitUnansweredWarning: 'You have {count} unanswered question(s). Are you sure you want to submit now?',
    submitReadyDesc: 'You answered all questions. Ready to submit and see your final score?',
    submitNow: 'Submit Now',
    shuffleQuizTitle: 'Shuffle Questions & Options?',
    shuffleConfirmTitle: 'Shuffle Questions & Options?',
    shuffleQuizDesc: 'Questions and options will be randomized in random order and current answers will be reset. Proceed?',
    shuffleConfirmDesc: 'Questions and options will be randomized in random order and current answers will be reset. Proceed?',
    shuffleNow: 'Shuffle and Start',
    resetAnswersTitle: 'Reset Answers?',
    resetConfirmTitle: 'Reset Answers?',
    resetAnswersDesc: 'Are you sure you want to clear all your answers and restart?',
    resetConfirmDesc: 'Are you sure you want to clear all your answers and restart?',
    clearAll: 'Clear and Restart',
    showAllAnswersTitle: 'Show All Model Answers?',
    showAnswersConfirmTitle: 'Reveal All Model Answers?',
    showAllAnswersDesc: 'Model answers will be revealed for all questions in this quiz.',
    showAnswersConfirmDesc: 'Model answers will be revealed for all questions in this quiz.',
    revealNow: 'Reveal Answers',
    restoreProgressTitle: 'Resume Saved Progress?',
    restoreProgressDesc: 'We found an incomplete previous attempt for this quiz. Would you like to resume or start fresh?',
    startFreshBtn: 'Start Fresh',
    restoreBtn: 'Resume Quiz',

    // Quiz Results
    quizCompletedTitle: 'Quiz Completed!',
    scoreSummary: 'Final Score',
    timeSpentSummary: 'Time Spent',
    accuracySummary: 'Accuracy',
    unansweredCount: 'Unanswered',
    reviewQuestions: 'Review Questions',
    reviewWrongQuestions: 'Review Questions',
    questionsNeedReview: '{count} question(s) need review',
    retakeQuizBtn: 'Retake Quiz',
    backToCoursesBtn: 'Back to Courses',
    reviewQuestionsHeader: 'Review Questions ({count})',
    reviewQuestionsDesc: 'These questions need review to ensure mastery',
    yourChoiceWrong: '❌ Your answer',
    correctChoiceTag: '✔ Correct',
    noAnswerProvided: 'No answer provided',
    aiFeedbackTitle: 'AI Feedback:',

    // Teacher Login
    teacherAccessTitle: 'Teacher Portal Login',
    teacherAccessSubtitle: 'Enter your username and password to access the control panel',
    usernameLabel: 'Username:',
    usernamePlaceholder: 'Enter username (e.g. admin)',
    passwordLabel: 'Password:',
    passwordPlaceholder: 'Enter password',
    loginSubmitBtn: 'Log In',
    loginInvalidError: 'Invalid username or password. Please try again.',

    // Teacher Dashboard
    dashboardTitle: 'Teacher Dashboard',
    dashboardSubtitle: 'Create, edit, and organize quizzes and academic subjects',
    tabCreateQuiz: 'Create & Format Quiz',
    tabSubjectsTopics: 'Subjects & Topics',
    tabManageQuizzes: 'Manage Quizzes',
    tabManageTeachers: 'Teacher Management',
    tabAnalytics: 'Analytics',
    logoutBtn: 'Log Out',
    welcomeTeacher: 'Welcome, {name}',
    adminRoleBadge: 'Administrator (Admin)',
    teacherRoleBadge: 'Authorized Teacher',
    createdByLabel: 'Created by:',
    byYou: 'By You',
    byAdmin: 'Administrator (Admin)',
    byTeacher: 'Teacher: {name}',
    noEditPermission: 'You do not have permission to edit or delete this item because it was created by another teacher.',

    // Teacher - Manage Teachers Tab (Admin only)
    teachersListTitle: 'Registered Teacher Accounts ({count})',
    teachersListSubtitle: 'Only the administrator can create new teacher accounts and manage their permissions',
    addNewTeacherBtn: 'Add New Teacher',
    newTeacherModalTitle: 'Create New Teacher Account',
    teacherDisplayNameLabel: 'Display Name:',
    teacherDisplayNamePlaceholder: 'e.g. Prof. John Doe or Dr. Sarah',
    teacherUsernameLabel: 'Username (for login):',
    teacherUsernamePlaceholder: 'e.g. jdoe2025',
    teacherPasswordLabel: 'Password:',
    teacherPasswordPlaceholder: 'Enter account password',
    createTeacherSubmit: 'Create Account',
    usernameAlreadyExists: 'This username is already taken. Please choose another username.',
    usernameRequired: 'Please enter both username and password.',
    deleteTeacherConfirm: 'Are you sure you want to delete teacher account "{name}"? They will not be able to log in anymore.',
    cannotDeleteAdmin: 'Cannot delete the primary Administrator account.',
    teacherAddedSuccess: 'Teacher account created successfully!',
    teacherDeletedSuccess: 'Teacher account deleted successfully.',
    
    // Teacher - Create Quiz Tab
    aiFormatBtn: 'AI Format Prompt',
    autoFormatBtn: 'Auto Format',
    aiPromptModalTitle: 'AI Prompt for Quiz Formatting',
    aiPromptModalSubtitle: 'Copy this ready prompt containing your questions and formatting guidelines, then paste it into any AI model (ChatGPT, Gemini, Claude) for instant formatting.',
    copyPromptBtn: 'Copy Full Prompt',
    promptCopied: 'Prompt copied successfully!',
    aiPromptCustomNote: 'The prompt includes syntax guidelines alongside your currently entered raw questions.',
    pasteAiResultTitle: 'Paste AI Output:',
    pasteAiResultBtn: 'Apply Output to Editor',
    aiResultPastedSuccess: 'AI output successfully applied to editor!',
    clearTextBtn: 'Clear Text',
    pasteQuestionsPlaceholder: 'Paste questions here...\n\nExample:\nLecture: Introduction to Algorithms\n\n1. What is the time complexity of binary search?\nA. O(n)\nB. O(log n)\nCorrect: B',
    selectSubjectLabel: 'Subject:',
    selectTopicLabel: 'Topic / Unit:',
    timeLimitLabel: 'Time Limit (minutes - 0 for unlimited):',
    descriptionOptionalLabel: 'Description (Optional):',
    descriptionPlaceholder: 'e.g. Practice questions for lecture 1...',
    detectedQuizTitles: 'Detected Quizzes / Titles (from Lecture tag):',
    noLectureDetected: 'No Lecture tag specified (will default to Topic / Course name)',
    willCreateMultiple: 'Will create {count} separate quizzes upon publishing',
    previewQuizBtn: 'Preview',
    downloadHtmlBtn: 'Export',
    publishQuizBtn: 'Publish',
    updateQuizBtn: 'Save',
    editingQuizBanner: 'Currently editing quiz: ',
    cancelEditBtn: 'Cancel',

    // Teacher - Subjects & Topics Tab
    subjectsAndTopicsTitle: 'Manage Subjects & Topics',
    newSubjectBtn: 'Add Subject',
    newTopicBtn: 'Add Topic',
    deleteConfirmSubject: 'Are you sure you want to delete this subject? All associated topics and quizzes will be deleted.',
    deleteConfirmTopic: 'Are you sure you want to delete this topic and all its quizzes?',
    deleteConfirmQuiz: 'Are you sure you want to delete this quiz?',

    // Teacher - Quizzes List Tab
    quizzesListTitle: 'Published Quizzes ({count})',
    noQuizzesYet: 'No quizzes created yet.',
    createNewQuizPrompt: 'Start by creating your first quiz in the "Create & Format Quiz" tab.',
    testAsStudentBtn: 'Test as Student',

    // Teacher - Analytics Tab
    totalSubjectsStat: 'Total Subjects',
    totalTopicsStat: 'Total Topics',
    totalQuizzesStat: 'Total Quizzes',
    totalQuestionsStat: 'Total Questions',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  toggleLanguage: () => {},
  isArabic: true,
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('miqyas_lang') || localStorage.getItem('quiz_master_lang');
      if (saved === 'ar' || saved === 'en') return saved;
    }
    return 'ar'; // Default to Arabic as requested by user
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('miqyas_lang', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language]?.[key] || translations['en']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        isArabic: language === 'ar',
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

```


---

## `src/context/StudentAuthContext.tsx`

```tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../firebase';
import {
  StudentProfile,
  StudentAttempt,
  StudentMistake,
  StudentBookmark,
  PrivateQuiz,
  Quiz,
  Question,
  AIWrittenGradingResult,
} from '../types';
import {
  upsertStudentProfile,
  subscribeToStudentAttempts,
  saveStudentAttempt,
  deleteStudentAttempt,
  subscribeToStudentMistakes,
  upsertStudentMistake,
  deleteStudentMistake,
  subscribeToStudentBookmarks,
  addStudentBookmark,
  removeStudentBookmark,
  subscribeToStudentPrivateQuizzes,
  saveStudentPrivateQuiz,
  deleteStudentPrivateQuiz,
  incrementQuizStat,
  buildDeterministicEntityId,
  sanitizeDocId,
} from '../services/studentCloudService';
import { StudentAiQuota, fetchStudentAiQuota } from '../services/aiService';

export interface QuizResultPayload {
  score: number;
  totalMCQs: number;
  totalWritten: number;
  userAnswers: Record<string, string>;
  writtenInputData: Record<string, string>;
  writtenGradingData: Record<string, AIWrittenGradingResult>;
  questions: Question[];
  timeSpentSeconds: number;
}

interface StudentAuthContextType {
  studentUser: User | null;
  studentProfile: StudentProfile | null;
  authLoading: boolean;
  authBusy: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signOutStudent: () => Promise<void>;
  attempts: StudentAttempt[];
  mistakes: StudentMistake[];
  bookmarks: StudentBookmark[];
  privateQuizzes: PrivateQuiz[];
  dataLoading: boolean;
  aiQuota: StudentAiQuota;
  refreshAiQuota: () => Promise<void>;
  setAiQuotaDirect: (quota: StudentAiQuota) => void;
  isQuestionBookmarked: (quizId: string, question: Question) => boolean;
  toggleBookmarkQuestion: (params: {
    quiz: Pick<Quiz, 'id' | 'title' | 'subjectId'>;
    subjectName: string;
    question: Question;
  }) => Promise<boolean>;
  removeBookmarkById: (bookmarkId: string) => Promise<void>;
  removeMistakeById: (mistakeId: string) => Promise<void>;
  removeAttemptById: (attemptId: string) => Promise<void>;
  savePrivateQuiz: (quiz: PrivateQuiz, isEdit?: boolean) => Promise<void>;
  removePrivateQuiz: (quizId: string) => Promise<void>;
  recordQuizCompletion: (params: {
    quiz: Pick<Quiz, 'id' | 'title' | 'subjectId' | 'topicId'>;
    subjectName: string;
    isPrivateQuiz?: boolean;
    practiceMode?: 'mistakes' | 'bookmarks' | null;
    results: QuizResultPayload;
  }) => Promise<{ savedToAccount: boolean }>;
}

const DEFAULT_QUOTA: StudentAiQuota = { used: 0, limit: 5, remaining: 5 };

const StudentAuthContext = createContext<StudentAuthContextType>({
  studentUser: null,
  studentProfile: null,
  authLoading: true,
  authBusy: false,
  authError: null,
  clearAuthError: () => {},
  signInWithGoogle: async () => false,
  signOutStudent: async () => {},
  attempts: [],
  mistakes: [],
  bookmarks: [],
  privateQuizzes: [],
  dataLoading: false,
  aiQuota: DEFAULT_QUOTA,
  refreshAiQuota: async () => {},
  setAiQuotaDirect: () => {},
  isQuestionBookmarked: () => false,
  toggleBookmarkQuestion: async () => false,
  removeBookmarkById: async () => {},
  removeMistakeById: async () => {},
  removeAttemptById: async () => {},
  savePrivateQuiz: async () => {},
  removePrivateQuiz: async () => {},
  recordQuizCompletion: async () => ({ savedToAccount: false }),
});

export const StudentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [studentUser, setStudentUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [mistakes, setMistakes] = useState<StudentMistake[]>([]);
  const [bookmarks, setBookmarks] = useState<StudentBookmark[]>([]);
  const [privateQuizzes, setPrivateQuizzes] = useState<PrivateQuiz[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [aiQuota, setAiQuota] = useState<StudentAiQuota>(DEFAULT_QUOTA);

  const refreshAiQuota = useCallback(async () => {
    if (!studentUser?.uid) {
      setAiQuota(DEFAULT_QUOTA);
      return;
    }
    const q = await fetchStudentAiQuota(studentUser.uid);
    setAiQuota(q);
  }, [studentUser?.uid]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setStudentUser(user);
      setAuthLoading(false);

      if (user) {
        const profile: StudentProfile = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'طالب',
          email: user.email || '',
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
          updatedAt: new Date().toISOString(),
        };
        setStudentProfile(profile);
        if (user.emailVerified) {
          upsertStudentProfile(profile).catch((e) => console.warn('Profile sync warning:', e));
        }
      } else {
        setStudentProfile(null);
        setAttempts([]);
        setMistakes([]);
        setBookmarks([]);
        setPrivateQuizzes([]);
        setAiQuota(DEFAULT_QUOTA);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!studentUser || !studentUser.emailVerified) {
      setDataLoading(false);
      return;
    }

    const uid = studentUser.uid;
    setDataLoading(true);

    let readyFlags = { attempts: false, mistakes: false, bookmarks: false, privateQuizzes: false };
    const markReady = (key: keyof typeof readyFlags) => {
      readyFlags[key] = true;
      if (readyFlags.attempts && readyFlags.mistakes && readyFlags.bookmarks && readyFlags.privateQuizzes) {
        setDataLoading(false);
      }
    };

    const unsubAttempts = subscribeToStudentAttempts(
      uid,
      (list) => {
        setAttempts(list);
        markReady('attempts');
      },
      () => markReady('attempts')
    );

    const unsubMistakes = subscribeToStudentMistakes(
      uid,
      (list) => {
        setMistakes(list);
        markReady('mistakes');
      },
      () => markReady('mistakes')
    );

    const unsubBookmarks = subscribeToStudentBookmarks(
      uid,
      (list) => {
        setBookmarks(list);
        markReady('bookmarks');
      },
      () => markReady('bookmarks')
    );

    const unsubPrivate = subscribeToStudentPrivateQuizzes(
      uid,
      (list) => {
        setPrivateQuizzes(list);
        markReady('privateQuizzes');
      },
      () => markReady('privateQuizzes')
    );

    fetchStudentAiQuota(uid).then(setAiQuota).catch(() => {});

    const fallbackTimer = setTimeout(() => setDataLoading(false), 5000);

    return () => {
      clearTimeout(fallbackTimer);
      unsubAttempts();
      unsubMistakes();
      unsubBookmarks();
      unsubPrivate();
    };
  }, [studentUser]);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      return true;
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(null);
      } else if (code === 'auth/popup-blocked') {
        setAuthError('تم حظر نافذة تسجيل الدخول المنبثقة من المتصفح. يرجى السماح بالنوافذ المنبثقة والمحاولة مرة أخرى.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError('النطاق الحالي غير مصرح له بتسجيل الدخول عبر Google في إعدادات Firebase.');
      } else {
        setAuthError(err?.message || 'تعذر تسجيل الدخول عبر Google حالياً.');
      }
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutStudent = useCallback(async () => {
    setAuthBusy(true);
    try {
      await signOut(auth);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const getBookmarkDocId = useCallback((quizId: string, question: Question) => {
    return buildDeterministicEntityId('bm', quizId, question.id, question.question);
  }, []);

  const isQuestionBookmarked = useCallback(
    (quizId: string, question: Question): boolean => {
      if (!studentUser) return false;
      const targetId = getBookmarkDocId(quizId, question);
      return bookmarks.some(
        (b) => b.id === targetId || b.question?.question === question.question
      );
    },
    [studentUser, bookmarks, getBookmarkDocId]
  );

  const toggleBookmarkQuestion = useCallback(
    async ({
      quiz,
      subjectName,
      question,
    }: {
      quiz: Pick<Quiz, 'id' | 'title' | 'subjectId'>;
      subjectName: string;
      question: Question;
    }): Promise<boolean> => {
      if (!studentUser || !studentUser.emailVerified) return false;
      const bmId = getBookmarkDocId(quiz.id, question);
      const existing = bookmarks.find(
        (b) => b.id === bmId || b.question?.question === question.question
      );
      if (existing) {
        await removeStudentBookmark(studentUser.uid, existing.id);
        return false;
      } else {
        await addStudentBookmark({
          id: bmId,
          userId: studentUser.uid,
          quizId: quiz.id,
          quizTitle: quiz.title,
          subjectId: quiz.subjectId || '',
          subjectName: subjectName || 'عام',
          question,
          savedAt: new Date().toISOString(),
        });
        return true;
      }
    },
    [studentUser, bookmarks, getBookmarkDocId]
  );

  const removeBookmarkById = useCallback(
    async (bookmarkId: string) => {
      if (!studentUser) return;
      await removeStudentBookmark(studentUser.uid, bookmarkId);
    },
    [studentUser]
  );

  const removeMistakeById = useCallback(
    async (mistakeId: string) => {
      if (!studentUser) return;
      await deleteStudentMistake(studentUser.uid, mistakeId);
    },
    [studentUser]
  );

  const removeAttemptById = useCallback(
    async (attemptId: string) => {
      if (!studentUser) return;
      await deleteStudentAttempt(studentUser.uid, attemptId);
    },
    [studentUser]
  );

  const savePrivateQuiz = useCallback(
    async (quiz: PrivateQuiz, isEdit = false) => {
      if (!studentUser) return;
      await saveStudentPrivateQuiz(
        {
          ...quiz,
          userId: studentUser.uid,
          isPrivate: true,
        },
        isEdit
      );
    },
    [studentUser]
  );

  const removePrivateQuiz = useCallback(
    async (quizId: string) => {
      if (!studentUser) return;
      await deleteStudentPrivateQuiz(studentUser.uid, quizId);
    },
    [studentUser]
  );

  const recordQuizCompletion = useCallback(
    async ({
      quiz,
      subjectName,
      isPrivateQuiz = false,
      practiceMode = null,
      results,
    }: {
      quiz: Pick<Quiz, 'id' | 'title' | 'subjectId' | 'topicId'>;
      subjectName: string;
      isPrivateQuiz?: boolean;
      practiceMode?: 'mistakes' | 'bookmarks' | null;
      results: QuizResultPayload;
    }): Promise<{ savedToAccount: boolean }> => {
      const totalQ = results.questions.length;
      const percentage = totalQ > 0 ? Math.round((results.score / totalQ) * 100) : 0;

      // Update anonymous aggregated public quiz stats for teacher analytics
      if (!isPrivateQuiz && !practiceMode && quiz.id) {
        incrementQuizStat(quiz.id, percentage).catch(() => {});
      }

      if (!studentUser || !studentUser.emailVerified) {
        return { savedToAccount: false };
      }

      const uid = studentUser.uid;
      const nowIso = new Date().toISOString();

      // Save completed attempt for standard & private quizzes
      if (!practiceMode) {
        const attemptId = sanitizeDocId(`att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, 'att');
        await saveStudentAttempt({
          id: attemptId,
          userId: uid,
          quizId: quiz.id,
          quizTitle: quiz.title,
          subjectId: quiz.subjectId || '',
          subjectName: subjectName || 'عام',
          topicId: quiz.topicId || '',
          isPrivateQuiz,
          score: results.score,
          totalQuestions: totalQ,
          percentage,
          timeSpentSeconds: results.timeSpentSeconds,
          completedAt: nowIso,
          questions: results.questions,
          userAnswers: results.userAnswers,
          writtenInputData: results.writtenInputData,
          writtenGradingData: results.writtenGradingData,
        });
      }

      // Sync Mistakes Bank: add/increment wrong questions; clear mastered mistakes if solved correctly
      const tasks: Promise<void>[] = [];
      for (const q of results.questions) {
        const ans = results.userAnswers[q.id];
        if (ans === 'SHOW_ANSWERS_FLAG') continue;

        const isCorrect =
          q.type === 'written'
            ? ans === 'WRITTEN_CORRECT'
            : Boolean(ans) && ans === q.correctAnswer;

        const existingMistake = mistakes.find(
          (m) =>
            m.id === q.id ||
            (m.question?.id === q.id && m.question?.question === q.question) ||
            (m.quizId === quiz.id && m.question?.question === q.question)
        );

        if (!isCorrect) {
          const mistakeId =
            existingMistake?.id ||
            buildDeterministicEntityId('mst', quiz.id, q.id, q.question);
          const wrongDisplay =
            q.type === 'written'
              ? results.writtenInputData[q.id] || ''
              : ans || '';
          tasks.push(
            upsertStudentMistake({
              id: mistakeId,
              userId: uid,
              quizId: existingMistake?.quizId || quiz.id,
              quizTitle: existingMistake?.quizTitle || quiz.title,
              subjectId: existingMistake?.subjectId || quiz.subjectId || '',
              subjectName: existingMistake?.subjectName || subjectName || 'عام',
              question: q,
              lastWrongAnswer: wrongDisplay,
              wrongCount: existingMistake ? existingMistake.wrongCount + 1 : 1,
              lastMissedAt: nowIso,
            })
          );
        } else if (practiceMode === 'mistakes' && existingMistake) {
          // Mastered during Mistakes Bank practice! Clear it from Mistakes Bank.
          tasks.push(deleteStudentMistake(uid, existingMistake.id));
        }
      }

      await Promise.allSettled(tasks);
      return { savedToAccount: true };
    },
    [studentUser, mistakes]
  );

  return (
    <StudentAuthContext.Provider
      value={{
        studentUser,
        studentProfile,
        authLoading,
        authBusy,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithGoogle,
        signOutStudent,
        attempts,
        mistakes,
        bookmarks,
        privateQuizzes,
        dataLoading,
        aiQuota,
        refreshAiQuota,
        setAiQuotaDirect: setAiQuota,
        isQuestionBookmarked,
        toggleBookmarkQuestion,
        removeBookmarkById,
        removeMistakeById,
        removeAttemptById,
        savePrivateQuiz,
        removePrivateQuiz,
        recordQuizCompletion,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => useContext(StudentAuthContext);

```


---

## `src/data/defaultData.ts`

```ts
import { Subject, Topic, Quiz } from '../types';

export const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'sub_general_surgery',
    name: 'الطب والجراحة العامة (Surgery)',
    description: 'تشمل أساسيات الجراحة العامة، العناية المركزة، والتشخيص السريري',
    icon: 'Stethoscope',
    color: '#2563eb',
    gradient: 'from-blue-600 to-cyan-600',
    order: 1,
  },
  {
    id: 'sub_computer_science',
    name: 'علوم الحاسب وهندسة البرمجيات (Computer Science)',
    description: 'الخوارزميات، هياكل البيانات، قواعد البيانات، والذكاء الاصطناعي',
    icon: 'Code2',
    color: '#7c3aed',
    gradient: 'from-purple-600 to-indigo-600',
    order: 2,
  },
  {
    id: 'sub_general_knowledge',
    name: 'المعرفة العامة والتاريخ والجغرافيا (General Knowledge)',
    description: 'معالم العالم، الحضارات التاريخية، الجغرافيا والثقافة العامة المصورة',
    icon: 'Globe2',
    color: '#059669',
    gradient: 'from-emerald-600 to-teal-600',
    order: 3,
  },
  {
    id: 'sub_biology',
    name: 'الأحياء والعلوم الطبية الحيوية (Biology)',
    description: 'علم وظائف الأعضاء، الوراثة، الخلية والكيمياء الحيوية',
    icon: 'Dna',
    color: '#e11d48',
    gradient: 'from-rose-600 to-pink-600',
    order: 4,
  },
];

export const DEFAULT_TOPICS: Topic[] = [
  {
    id: 'topic_acute_abdomen',
    subjectId: 'sub_general_surgery',
    title: 'Acute Abdomen & Appendicitis (البطن الحادة والزائدة)',
    description: 'تشخيص حالات البطن الإسعافية وتدبير التهاب الزائدة الدودية',
  },
  {
    id: 'topic_trauma_care',
    subjectId: 'sub_general_surgery',
    title: 'Trauma & Wound Healing (الحوادث والتئام الجروح)',
    description: 'بروتوكولات ATLS ومراحل شفاء وتضميد الجروح الجراحية',
  },
  {
    id: 'topic_data_structures',
    subjectId: 'sub_computer_science',
    title: 'Data Structures & Algorithms (هياكل البيانات)',
    description: 'الأشجار والمصفوفات والتعقيد الزمني Big-O',
  },
  {
    id: 'topic_world_landmarks',
    subjectId: 'sub_general_knowledge',
    title: 'World Landmarks & Heritage (معالم العالم وعجائبه)',
    description: 'اختبارات صورية ومعرفية حول أبرز معالم كوكب الأرض',
  },
];

export const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: 'quiz_surgery_01',
    title: 'اختبار شامل في الجراحة العامة والبطن الحادة',
    subjectId: 'sub_general_surgery',
    topicId: 'topic_acute_abdomen',
    description: 'اختبار تدريبي يشمل أسئلة اختيار من متعدد وأسئلة تشخيص مقالية مع تصحيح ذكي',
    timeLimitMinutes: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublished: true,
    questions: [
      {
        id: 'q_surg_1',
        lecture: 'Acute Abdomen',
        question: 'What is the most common early symptom of acute appendicitis?',
        type: 'mcq',
        options: [
          'Severe sharp pain in the Right Iliac Fossa',
          'Vague periumbilical visceral pain',
          'High grade fever with rigors',
          'Profuse watery diarrhea'
        ],
        correctAnswer: 'Vague periumbilical visceral pain',
        explanation: 'Early appendiceal pain is visceral and referred to the T10 periumbilical dermatome before somatic localization to the RIF.',
      },
      {
        id: 'q_surg_2',
        lecture: 'Acute Abdomen',
        question: 'What is Rovsing sign in acute abdominal examination?',
        type: 'mcq',
        options: [
          'Pain in RIF on palpation of the Left Lower Quadrant',
          'Pain on hyperextension of the right hip',
          'Tenderness elicited by internal rotation of the hip',
          'Rebound tenderness at McBurney point'
        ],
        correctAnswer: 'Pain in RIF on palpation of the Left Lower Quadrant',
      },
      {
        id: 'q_surg_3',
        lecture: 'Acute Abdomen',
        question: 'ما هي الخطوات الإسعافية الثلاث الأولى لتدبير مريض يعاني من صدمة نزفية ناتجة عن تمزق الطحال الحاد؟',
        type: 'written',
        options: [],
        correctAnswer: '1. تأمين مجرى التنفس والأكسجين 2. تركيب قثطارين وريديين عريضي اللمعة والبدء بالإعاضة بالسوائل الدافئة والدم 3. إيقاف النزف والتحضير لعمل جراحي إسعافي (استئصال طحال أو إصلاحه).',
        explanation: 'ABC protocols, IV large-bore access, fluid resuscitation & urgent surgical exploration.',
      },
      {
        id: 'q_surg_4',
        lecture: 'Acute Abdomen',
        question: 'Which scoring system is most widely used in evaluating suspected appendicitis?',
        type: 'mcq',
        options: [
          'Alvarado Score (MANTRELS)',
          'Glasgow Coma Scale',
          'Child-Pugh Score',
          'Ranson Criteria'
        ],
        correctAnswer: 'Alvarado Score (MANTRELS)',
      },
      {
        id: 'q_surg_5',
        lecture: 'Acute Abdomen',
        question: 'اشرح باختصار آلية حدوث الألم المرتد (Rebound Tenderness) في حالات التهاب البريتوان الجداري.',
        type: 'written',
        options: [],
        correctAnswer: 'يحدث الألم المرتد نتيجة التهاب البريتوان الجداري (Parietal Peritoneum) الحساس للألم الجسدي، فعند الضغط ثم رفع اليد فجأة يحصل ارتداد سريع في الغشاء البريتواني الملتهب مما يثير المستقبلات العصبية الحسية بشكل حاد.',
      }
    ],
  },
  {
    id: 'quiz_landmarks_01',
    title: 'اختبار المعالم العالمية المصورة (Visual Landmarks)',
    subjectId: 'sub_general_knowledge',
    topicId: 'topic_world_landmarks',
    description: 'اختبار تفاعلي مصور حول معالم العالم وعواصم الدول',
    timeLimitMinutes: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublished: true,
    questions: [
      {
        id: 'q_lm_1',
        lecture: 'World Landmarks',
        question: 'What is the name of this ancient wonder landmark located in Giza?',
        type: 'mcq',
        imageURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kheops-Pyramid.jpg/640px-Kheops-Pyramid.jpg',
        options: [
          'Eiffel Tower',
          'Great Pyramid of Giza',
          'Big Ben',
          'Colosseum'
        ],
        correctAnswer: 'Great Pyramid of Giza',
      },
      {
        id: 'q_lm_2',
        lecture: 'World Landmarks',
        question: 'ما هي عاصمة فرنسا، وما هو أشهر برج حديدي يقع في قلبها؟',
        type: 'written',
        options: [],
        correctAnswer: 'عاصمة فرنسا هي باريس، وأشهر برج فيها هو برج إيفل (Eiffel Tower).',
      },
      {
        id: 'q_lm_3',
        lecture: 'World Landmarks',
        question: 'In which city is the famous Colosseum amphitheatre located?',
        type: 'mcq',
        options: [
          'Athens',
          'Rome',
          'Madrid',
          'Cairo'
        ],
        correctAnswer: 'Rome',
      },
      {
        id: 'q_lm_4',
        lecture: 'World Landmarks',
        question: 'Which river is widely considered the longest river in the world flowing through northeastern Africa?',
        type: 'mcq',
        options: [
          'Amazon River',
          'Nile River',
          'Yangtze River',
          'Mississippi River'
        ],
        correctAnswer: 'Nile River',
      },
      {
        id: 'q_lm_5',
        lecture: 'World Landmarks',
        question: 'اذكر اثنين من عجائب الدنيا السبع القديمة التي اندثرت أو ما زالت قائمة.',
        type: 'written',
        options: [],
        correctAnswer: 'الأهرامات في الجيزة، حدائق بابل المعلقة، تمثال زيوس، هيكل أرتميس، ضريح موسولوس، عملاق رودس، منارة الإسكندرية.',
      }
    ],
  },
  {
    id: 'quiz_ds_01',
    title: 'تحدي الخوارزميات وهياكل البيانات (Data Structures)',
    subjectId: 'sub_computer_science',
    topicId: 'topic_data_structures',
    description: 'اختبار المفاهيم البرمجية الأساسية وهياكل البيانات والتعقيد الحسابي',
    timeLimitMinutes: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublished: true,
    questions: [
      {
        id: 'q_cs_1',
        lecture: 'Algorithms & Structures',
        question: 'What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?',
        type: 'mcq',
        options: [
          'O(1)',
          'O(log n)',
          'O(n)',
          'O(n log n)'
        ],
        correctAnswer: 'O(log n)',
      },
      {
        id: 'q_cs_2',
        lecture: 'Algorithms & Structures',
        question: 'Which data structure operates on a Last-In, First-Out (LIFO) basis?',
        type: 'mcq',
        options: [
          'Queue',
          'Stack',
          'Array',
          'Graph'
        ],
        correctAnswer: 'Stack',
      },
      {
        id: 'q_cs_3',
        lecture: 'Algorithms & Structures',
        question: 'ما هو الفرق الجوهري بين المصفوفة (Array) والقائمة المتصلة (Linked List) من حيث تخصيص الذاكرة؟',
        type: 'written',
        options: [],
        correctAnswer: 'المصفوفة تحجز حجماً متصلاً في الذاكرة (Contiguous Memory) بحجم ثابت أو محدد، بينما القائمة المتصلة تتكون من عقد (Nodes) موزعة ديناميكياً في الذاكرة ترتبط ببعضها عن طريق المؤشرات (Pointers).',
      }
    ],
  }
];

```


---

## `src/firebase.ts`

```ts
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with specified Database ID and Auto-Detect Long Polling for fast connections & iframe compatibility

export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Connection verification test
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection verified successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is disconnected.');
    } else {
      console.log('Firebase initialized (normal response).');
    }
    return false;
  }
}

// Run connection test non-blocking
testConnection().catch(() => {});

```


---

## `src/hooks/useResumableQuizzes.ts`

```ts
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

```


---

## `src/hooks/useTeacherSession.ts`

```ts
import { useCallback, useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { TeacherUser } from '../types';
import { fetchTeacherProfile } from '../services/teacherService';

export type TeacherSessionStatus =
  | 'loading' // لسه بنتحقق
  | 'signed-out' // مفيش حساب مسجل
  | 'unauthorized' // مسجل دخول لكن البريد ليس ضمن المعلمين
  | 'ready'; // معلم مصرح له

/**
 * جلسة المعلم = حساب Google في Firebase Auth + وجود وثيقة `teachers/{email}`.
 * لا توجد كلمات مرور في الكود ولا في المتصفح.
 */
export const useTeacherSession = () => {
  const [status, setStatus] = useState<TeacherSessionStatus>('loading');
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (cancelled) return;
        setTeacher(null);
        setEmail('');
        setStatus('signed-out');
        return;
      }
      setEmail(user.email || '');
      const profile = await fetchTeacherProfile(user);
      if (cancelled) return;
      setTeacher(profile);
      setStatus(profile ? 'ready' : 'unauthorized');
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const signIn = useCallback(async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setError(e?.code || 'auth-error');
      }
    }
  }, []);

  /** ملاحظة: Firebase Auth له جلسة واحدة، فتسجيل الخروج يخرج الحساب من واجهة الطالب أيضاً */
  const signOutTeacher = useCallback(async () => {
    await signOut(auth);
  }, []);

  return { status, teacher, email, error, signIn, signOutTeacher };
};

```


---

## `src/index.css`

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

/*
 * ───────────────────────── هوية مقياس ─────────────────────────
 * بدل ما نعدّل آلاف الأسطر، نعيد تعريف سلالم الألوان الأساسية التي يستخدمها
 * الكود الحالي (zinc = المحايدات، blue = لون العلامة). كل كلاس مثل
 * bg-blue-600 أو dark:bg-zinc-900 صار يرسم بلوحة مقياس تلقائياً.
 *
 *  zinc → محايدات باردة بميل خفيف للأخضر المزرق (ورق + حبر)
 *  blue → "أخضر المقياس" الداكن، هو لون الأزرار والروابط والحالة النشطة
 *  amber → "المؤشر": لون الإبرة، يُستخدم بحذر شديد (الشعار + التقدم)
 */
@theme {
  --font-sans: "IBM Plex Sans Arabic", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  /* محايدات */
  --color-zinc-50: #f5f8f9;
  --color-zinc-100: #eaeff1;
  --color-zinc-200: #dce3e6;
  --color-zinc-300: #bcc7cc;
  --color-zinc-400: #8f9fa6;
  --color-zinc-500: #667880;
  --color-zinc-600: #4a5b63;
  --color-zinc-700: #34444b;
  --color-zinc-800: #1c2b31;
  --color-zinc-900: #111c20;
  --color-zinc-950: #0a1316;

  /* لون العلامة */
  --color-blue-50: #e8f6f4;
  --color-blue-100: #c9ebe7;
  --color-blue-200: #9bd9d2;
  --color-blue-300: #66c1b9;
  --color-blue-400: #3aa59d;
  --color-blue-500: #1b8a85;
  --color-blue-600: #0b6e6e;
  --color-blue-700: #095a5b;
  --color-blue-800: #08484a;
  --color-blue-900: #07393b;
  --color-blue-950: #04282a;

  /* المؤشر */
  --color-marker: #f2b01e;

  /* زوايا أهدأ من الافتراضي: البطاقات 12px بدل 16px */
  --radius-xl: 0.625rem;
  --radius-2xl: 0.75rem;
  --radius-3xl: 1rem;
}

@layer base {
  :root {
    --bg-main: #f5f8f9;
    --surface-card: #ffffff;
    --border-color: #dce3e6;
    --text-primary: #111c20;
    --text-muted: #667880;
    --brand-primary: #0b6e6e;
    --brand-accent: #f2b01e;
  }

  .dark {
    --bg-main: #0a1316;
    --surface-card: #111c20;
    --border-color: #1c2b31;
    --text-primary: #eaeff1;
    --text-muted: #8f9fa6;
    --brand-primary: #3aa59d;
    --brand-accent: #f2b01e;
  }

  html {
    color-scheme: light;
  }
  html.dark {
    color-scheme: dark;
  }

  body {
    background-color: var(--bg-main);
    color: var(--text-primary);
    font-family: var(--font-sans);
    line-height: 1.7; /* العربية تحتاج ارتفاع سطر أكبر */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  * {
    border-color: var(--border-color);
  }

  h1, h2, h3 {
    text-wrap: balance;
    line-height: 1.3;
  }

  /* تركيز واضح للوحة المفاتيح في كل مكان */
  :where(a, button, input, select, textarea, [role="button"], [tabindex]):focus-visible {
    outline: 2px solid var(--color-blue-500);
    outline-offset: 2px;
  }
  .dark :where(a, button, input, select, textarea, [role="button"], [tabindex]):focus-visible {
    outline-color: var(--color-blue-400);
  }

  ::selection {
    background: var(--color-blue-600);
    color: #fff;
  }
}

/* ───────── محاذاة النص (RTL / LTR) ───────── */
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="submit"]):not([type="button"]),
textarea {
  text-align: start;
}

button,
input[type="button"],
input[type="submit"],
input[type="reset"],
[role="button"] {
  text-align: center;
}

.text-center { text-align: center !important; }
.text-start  { text-align: start !important; }
.text-end    { text-align: end !important; }
.text-left   { text-align: left !important; }
.text-right  { text-align: right !important; }

/* ───────── شريط التمرير ───────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-zinc-300); border-radius: 9999px; }
.dark ::-webkit-scrollbar-thumb { background: var(--color-zinc-700); }
::-webkit-scrollbar-thumb:hover { background: var(--color-zinc-400); }

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.tabular-nums { font-variant-numeric: tabular-nums; }

/*
 * ───────── المسطرة (عنصر مقياس المميز) ─────────
 * خط تدريج أفقي يُرسم بـ CSS فقط: علامة كل 8px وعلامة أطول كل 5 علامات.
 * يُستخدم كفاصل في الصفحة الرئيسية وكخلفية لشريط التقدم.
 */
.ruler-ticks {
  --tick: var(--color-zinc-300);
  height: 10px;
  background-image:
    repeating-linear-gradient(to right, var(--tick) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(to right, var(--tick) 0 1px, transparent 1px 40px);
  background-size: 100% 5px, 100% 10px;
  background-position: 0 100%, 0 100%;
  background-repeat: no-repeat;
}
.dark .ruler-ticks { --tick: var(--color-zinc-700); }

/* احترام تفضيل تقليل الحركة */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* ───────── الطباعة ───────── */
@media print {
  .no-print { display: none !important; }
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
}

```


---

## `src/main.tsx`

```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { purgeLegacyTeacherCredentials } from './utils/storage';

purgeLegacyTeacherCredentials();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

```


---

## `src/services/aiService.ts`

```ts
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

```


---

## `src/services/firestoreService.ts`

```ts
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Subject, Topic, Quiz } from '../types';
import { query, where } from 'firebase/firestore';

/**
 * Removes undefined fields which Firestore does not allow.
 */
function sanitizeForFirestore<T>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  if (!data || typeof data !== 'object') return clean;

  for (const [key, val] of Object.entries(data as Record<string, any>)) {
    if (val === undefined) {
      continue;
    }
    if (Array.isArray(val)) {
      clean[key] = val.map((item) =>
        item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item
      );
    } else if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      clean[key] = sanitizeForFirestore(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

// -------------------------------------------------------------
// Subscriptions (Realtime Listeners)
// -------------------------------------------------------------

export function subscribeToSubjects(
  onUpdate: (subjects: Subject[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'subjects');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Subject[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Subject);
      });
      // Sort by order or name
      list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      onUpdate(list);
    },
    (error) => {
      console.warn('Error syncing subjects from cloud:', error);
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'subjects');
    }
  );
}

export function subscribeToTopics(
  onUpdate: (topics: Topic[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'topics');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Topic[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Topic);
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Error syncing topics from cloud:', error);
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'topics');
    }
  );
}

/**
 * الطلاب يشوفوا المنشور فقط. المسودات تظهر للمعلم (includeDrafts = true)،
 * وقواعد Firestore تمنع الطالب من طلب المسودات حتى لو حاول.
 */
export function subscribeToQuizzes(
  onUpdate: (quizzes: Quiz[]) => void,
  onError?: (err: Error) => void,
  includeDrafts = false
): Unsubscribe {
  const colRef = includeDrafts
    ? collection(db, 'quizzes')
    : query(collection(db, 'quizzes'), where('isPublished', '==', true));
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Quiz[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Quiz);
      });
      // Sort newest first
      list.sort((a, b) => {
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tB - tA;
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Error syncing quizzes from cloud:', error);
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'quizzes');
    }
  );
}

// -------------------------------------------------------------
// Direct Single-Document Fetching (Fast Deep-Link Resolution)
// -------------------------------------------------------------

export async function fetchQuizByIdFromCloud(quizId: string): Promise<Quiz | null> {
  if (!quizId) return null;
  try {
    const snap = await getDoc(doc(db, 'quizzes', quizId));
    return snap.exists() ? (snap.data() as Quiz) : null;
  } catch (err) {
    console.warn(`Direct fetch failed for quiz ${quizId}:`, err);
    return null;
  }
}

export async function fetchSubjectByIdFromCloud(subjectId: string): Promise<Subject | null> {
  if (!subjectId) return null;
  try {
    const snap = await getDoc(doc(db, 'subjects', subjectId));
    return snap.exists() ? (snap.data() as Subject) : null;
  } catch (err) {
    console.warn(`Direct fetch failed for subject ${subjectId}:`, err);
    return null;
  }
}

export async function fetchTopicByIdFromCloud(topicId: string): Promise<Topic | null> {
  if (!topicId) return null;
  try {
    const snap = await getDoc(doc(db, 'topics', topicId));
    return snap.exists() ? (snap.data() as Topic) : null;
  } catch (err) {
    console.warn(`Direct fetch failed for topic ${topicId}:`, err);
    return null;
  }
}

// -------------------------------------------------------------
// Mutation operations (Write to Cloud)
// -------------------------------------------------------------

export async function saveSubjectToCloud(subject: Subject): Promise<void> {
  const path = `subjects/${subject.id}`;
  try {
    const docRef = doc(db, 'subjects', subject.id);
    const sanitized = sanitizeForFirestore(subject);
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`[Cloud Sync] Subject saved to Firestore: ${subject.name} (${subject.id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSubjectFromCloud(subjectId: string): Promise<void> {
  const path = `subjects/${subjectId}`;
  try {
    await deleteDoc(doc(db, 'subjects', subjectId));
    console.log(`[Cloud Sync] Subject deleted from Firestore: ${subjectId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveTopicToCloud(topic: Topic): Promise<void> {
  const path = `topics/${topic.id}`;
  try {
    const docRef = doc(db, 'topics', topic.id);
    const sanitized = sanitizeForFirestore(topic);
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`[Cloud Sync] Topic saved to Firestore: ${topic.title} (${topic.id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTopicFromCloud(topicId: string): Promise<void> {
  const path = `topics/${topicId}`;
  try {
    await deleteDoc(doc(db, 'topics', topicId));
    console.log(`[Cloud Sync] Topic deleted from Firestore: ${topicId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveQuizToCloud(quiz: Quiz): Promise<void> {
  const path = `quizzes/${quiz.id}`;
  try {
    const docRef = doc(db, 'quizzes', quiz.id);
    const sanitized = sanitizeForFirestore(quiz);
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`[Cloud Sync] Quiz published to Firestore: ${quiz.title} (${quiz.id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteQuizFromCloud(quizId: string): Promise<void> {
  const path = `quizzes/${quizId}`;
  try {
    await deleteDoc(doc(db, 'quizzes', quizId));
    console.log(`[Cloud Sync] Quiz deleted from Firestore: ${quizId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Initial Data Seeding
// -------------------------------------------------------------

/**
 * If the cloud database is empty, seed it with the default subjects, topics, and sample quizzes
 * so students visiting for the first time on any device have full sample data.
 */
export async function seedInitialCloudDataIfNeeded(
  defaultSubjects: Subject[],
  defaultTopics: Topic[],
  defaultQuizzes: Quiz[]
): Promise<void> {
  try {
    const subjectsSnap = await getDocs(collection(db, 'subjects'));
    if (subjectsSnap.empty && defaultSubjects.length > 0) {
      console.log('[Cloud Sync] Seeding initial subjects to Firestore...');
      const batch = writeBatch(db);
      for (const s of defaultSubjects) {
        batch.set(doc(db, 'subjects', s.id), sanitizeForFirestore(s));
      }
      for (const t of defaultTopics) {
        batch.set(doc(db, 'topics', t.id), sanitizeForFirestore(t));
      }
      for (const q of defaultQuizzes) {
        batch.set(doc(db, 'quizzes', q.id), sanitizeForFirestore(q));
      }
      await batch.commit();
      console.log('[Cloud Sync] Seeding complete! All default data uploaded to cloud.');
    }
  } catch (err) {
    console.warn('[Cloud Sync] Initial seeding check skipped or non-critical error:', err);
  }
}

```


---

## `src/services/studentCloudService.ts`

```ts
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  StudentProfile,
  StudentAttempt,
  StudentMistake,
  StudentBookmark,
  PrivateQuiz,
  QuizStat,
} from '../types';

/**
 * Strips undefined values recursively because Firestore rejects undefined fields.
 */
function sanitizeForFirestore<T>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  if (!data || typeof data !== 'object') return clean;

  for (const [key, val] of Object.entries(data as Record<string, any>)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      clean[key] = val.map((item) =>
        item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item
      );
    } else if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      clean[key] = sanitizeForFirestore(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Ensures any Firestore document ID strictly matches ^[a-zA-Z0-9_-]{1,120}$
 */
export function sanitizeDocId(raw: string, prefix = 'doc'): string {
  const cleaned = String(raw || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
  if (cleaned.length > 0) return cleaned;
  return `${prefix}_${Date.now()}`;
}

/**
 * Deterministic compact ASCII ID for question-keyed entities (mistakes / bookmarks)
 */
export function buildDeterministicEntityId(prefix: string, quizId: string, questionId: string, questionText: string): string {
  const seed = `${quizId}::${questionId}::${questionText.trim().slice(0, 120)}`;
  let h1 = 2166136261;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 16777619);
    h2 += (h2 << 1) + (h2 << 4) + (h2 << 7) + (h2 << 8) + (h2 << 24) + ch;
  }
  const part1 = (h1 >>> 0).toString(36);
  const part2 = (h2 >>> 0).toString(36);
  return sanitizeDocId(`${prefix}_${part1}_${part2}`, prefix);
}

// -------------------------------------------------------------
// Student Profile
// -------------------------------------------------------------
export async function upsertStudentProfile(profile: StudentProfile): Promise<void> {
  const uid = sanitizeDocId(profile.uid, 'user');
  const path = `users/${uid}`;
  try {
    const payload = sanitizeForFirestore({
      uid,
      displayName: (profile.displayName || 'طالب').slice(0, 140),
      email: (profile.email || '').slice(0, 190),
      ...(profile.photoURL ? { photoURL: profile.photoURL.slice(0, 950) } : {}),
      updatedAt: profile.updatedAt || new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', uid), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// Student Attempts History
// -------------------------------------------------------------
export function subscribeToStudentAttempts(
  userId: string,
  onUpdate: (attempts: StudentAttempt[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/attempts`;
  const colRef = collection(db, 'users', userId, 'attempts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: StudentAttempt[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StudentAttempt);
      });
      list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      onUpdate(list);
    },
    (error) => {
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveStudentAttempt(attempt: StudentAttempt): Promise<void> {
  const safeId = sanitizeDocId(attempt.id, 'att');
  const path = `users/${attempt.userId}/attempts/${safeId}`;
  try {
    const payload = sanitizeForFirestore({
      id: safeId,
      userId: attempt.userId,
      quizId: String(attempt.quizId).slice(0, 120),
      quizTitle: String(attempt.quizTitle || 'Quiz').slice(0, 280),
      subjectId: String(attempt.subjectId || '').slice(0, 120),
      subjectName: String(attempt.subjectName || '').slice(0, 190),
      topicId: String(attempt.topicId || '').slice(0, 120),
      isPrivateQuiz: Boolean(attempt.isPrivateQuiz),
      score: Math.max(0, Number(attempt.score) || 0),
      totalQuestions: Math.max(0, Number(attempt.totalQuestions) || 0),
      percentage: Math.max(0, Math.min(100, Number(attempt.percentage) || 0)),
      timeSpentSeconds: Math.max(0, Math.min(86400, Number(attempt.timeSpentSeconds) || 0)),
      completedAt: attempt.completedAt || new Date().toISOString(),
      questions: (attempt.questions || []).slice(0, 200),
      userAnswers: attempt.userAnswers || {},
      writtenInputData: attempt.writtenInputData || {},
      writtenGradingData: attempt.writtenGradingData || {},
    });
    await setDoc(doc(db, 'users', attempt.userId, 'attempts', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteStudentAttempt(userId: string, attemptId: string): Promise<void> {
  const safeId = sanitizeDocId(attemptId, 'att');
  const path = `users/${userId}/attempts/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'attempts', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Mistakes Bank
// -------------------------------------------------------------
export function subscribeToStudentMistakes(
  userId: string,
  onUpdate: (mistakes: StudentMistake[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/mistakes`;
  const colRef = collection(db, 'users', userId, 'mistakes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: StudentMistake[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StudentMistake);
      });
      list.sort((a, b) => new Date(b.lastMissedAt).getTime() - new Date(a.lastMissedAt).getTime());
      onUpdate(list);
    },
    (error) => {
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function upsertStudentMistake(mistake: StudentMistake): Promise<void> {
  const safeId = sanitizeDocId(mistake.id, 'm');
  const path = `users/${mistake.userId}/mistakes/${safeId}`;
  try {
    const docRef = doc(db, 'users', mistake.userId, 'mistakes', safeId);
    const payload = sanitizeForFirestore({
      id: safeId,
      userId: mistake.userId,
      quizId: String(mistake.quizId).slice(0, 120),
      quizTitle: String(mistake.quizTitle || 'Quiz').slice(0, 280),
      subjectId: String(mistake.subjectId || '').slice(0, 120),
      subjectName: String(mistake.subjectName || '').slice(0, 190),
      question: mistake.question,
      lastWrongAnswer: String(mistake.lastWrongAnswer || '').slice(0, 1900),
      wrongCount: Math.max(1, Number(mistake.wrongCount) || 1),
      lastMissedAt: mistake.lastMissedAt || new Date().toISOString(),
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudentMistake(userId: string, mistakeId: string): Promise<void> {
  const safeId = sanitizeDocId(mistakeId, 'm');
  const path = `users/${userId}/mistakes/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'mistakes', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Saved / Bookmarked Questions
// -------------------------------------------------------------
export function subscribeToStudentBookmarks(
  userId: string,
  onUpdate: (bookmarks: StudentBookmark[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/bookmarks`;
  const colRef = collection(db, 'users', userId, 'bookmarks');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: StudentBookmark[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StudentBookmark);
      });
      list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      onUpdate(list);
    },
    (error) => {
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addStudentBookmark(bookmark: StudentBookmark): Promise<void> {
  const safeId = sanitizeDocId(bookmark.id, 'bm');
  const path = `users/${bookmark.userId}/bookmarks/${safeId}`;
  try {
    const payload = sanitizeForFirestore({
      id: safeId,
      userId: bookmark.userId,
      quizId: String(bookmark.quizId).slice(0, 120),
      quizTitle: String(bookmark.quizTitle || 'Quiz').slice(0, 280),
      subjectId: String(bookmark.subjectId || '').slice(0, 120),
      subjectName: String(bookmark.subjectName || '').slice(0, 190),
      question: bookmark.question,
      savedAt: bookmark.savedAt || new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', bookmark.userId, 'bookmarks', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeStudentBookmark(userId: string, bookmarkId: string): Promise<void> {
  const safeId = sanitizeDocId(bookmarkId, 'bm');
  const path = `users/${userId}/bookmarks/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'bookmarks', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Private Student Quizzes (Never Published Publicly)
// -------------------------------------------------------------
export function subscribeToStudentPrivateQuizzes(
  userId: string,
  onUpdate: (quizzes: PrivateQuiz[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/privateQuizzes`;
  const colRef = collection(db, 'users', userId, 'privateQuizzes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PrivateQuiz[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as PrivateQuiz);
      });
      list.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );
      onUpdate(list);
    },
    (error) => {
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveStudentPrivateQuiz(quiz: PrivateQuiz, isEdit = false): Promise<void> {
  const safeId = sanitizeDocId(quiz.id, 'pquiz');
  const path = `users/${quiz.userId}/privateQuizzes/${safeId}`;
  try {
    const payload = sanitizeForFirestore({
      id: safeId,
      userId: quiz.userId,
      title: String(quiz.title || 'Private Quiz').slice(0, 240),
      subjectName: String(quiz.subjectName || 'عام').slice(0, 190),
      description: String(quiz.description || '').slice(0, 1900),
      timeLimitMinutes: Math.max(0, Math.min(600, Number(quiz.timeLimitMinutes) || 0)),
      questions: (quiz.questions || []).slice(0, 200),
      createdAt: quiz.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPrivate: true,
    });
    await setDoc(doc(db, 'users', quiz.userId, 'privateQuizzes', safeId), payload, isEdit ? { merge: true } : undefined);
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteStudentPrivateQuiz(userId: string, quizId: string): Promise<void> {
  const safeId = sanitizeDocId(quizId, 'pquiz');
  const path = `users/${userId}/privateQuizzes/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'privateQuizzes', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Aggregated Anonymous Quiz Stats (/quizStats/{quizId})
// -------------------------------------------------------------
export function subscribeToQuizStats(
  onUpdate: (statsMap: Record<string, QuizStat>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'quizStats');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const map: Record<string, QuizStat> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as QuizStat;
        if (data?.quizId) {
          map[data.quizId] = data;
        }
      });
      onUpdate(map);
    },
    (error) => {
      console.warn('Error subscribing to quizStats:', error);
      if (onError) onError(error);
    }
  );
}

export async function incrementQuizStat(rawQuizId: string, percentage: number): Promise<void> {
  const safeQuizId = sanitizeDocId(rawQuizId, 'quiz');
  if (!safeQuizId) return;
  const statRef = doc(db, 'quizStats', safeQuizId);
  const clampedPct = Math.max(0, Math.min(100, Math.round(Number(percentage) || 0)));
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(statRef);
      if (!snap.exists()) {
        tx.set(statRef, {
          quizId: rawQuizId.slice(0, 128),
          attemptsCount: 1,
          totalPercentageSum: clampedPct,
          lastAttemptAt: new Date().toISOString(),
        });
      } else {
        const curr = snap.data() as QuizStat;
        tx.set(statRef, {
          quizId: curr.quizId || rawQuizId.slice(0, 128),
          attemptsCount: (Number(curr.attemptsCount) || 0) + 1,
          totalPercentageSum: (Number(curr.totalPercentageSum) || 0) + clampedPct,
          lastAttemptAt: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    // Non-blocking anonymous stat increment; never interrupt quiz submission
    console.warn('Could not update anonymous quizStats:', err);
  }
}

```


---

## `src/services/teacherService.ts`

```ts
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { TeacherUser } from '../types';

/**
 * صلاحيات المعلمين تعيش في Firestore: وثيقة لكل معلم في المجموعة `teachers`
 * ومعرّفها هو بريده بحروف صغيرة. قواعد Firestore (firestore.rules) هي التي تفرض
 * الصلاحية فعلياً على السيرفر؛ هذا الملف فقط يقرأ الدور ليعرض الواجهة المناسبة.
 */

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toTeacherUser = (email: string, data: Record<string, unknown>): TeacherUser => ({
  id: email,
  username: email,
  displayName: (typeof data.displayName === 'string' && data.displayName) || email,
  role: data.role === 'admin' ? 'admin' : 'teacher',
  createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
});

/** يرجع ملف المعلم لو بريد المستخدم مسجل كمعلم، وإلا null */
export async function fetchTeacherProfile(user: User): Promise<TeacherUser | null> {
  if (!user.email || !user.emailVerified) return null;
  const email = normalizeEmail(user.email);
  try {
    const snap = await getDoc(doc(db, 'teachers', email));
    if (!snap.exists()) return null;
    const teacher = toTeacherUser(email, snap.data());
    if (!teacher.displayName || teacher.displayName === email) {
      teacher.displayName = user.displayName || email;
    }
    return teacher;
  } catch {
    // القاعدة ترفض القراءة لغير المسجلين؛ نعتبره غير مصرح له
    return null;
  }
}

/** قائمة المعلمين (للمدير فقط؛ القواعد ترفض غيره) */
export function subscribeToTeachers(
  onData: (teachers: TeacherUser[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, 'teachers'),
    (snap) => {
      onData(
        snap.docs
          .map((d) => toTeacherUser(d.id, d.data()))
          .sort((a, b) => (a.role === b.role ? a.username.localeCompare(b.username) : a.role === 'admin' ? -1 : 1))
      );
    },
    (err) => onError?.(err)
  );
}

export async function addTeacherByEmail(params: {
  email: string;
  displayName: string;
  addedBy: string;
}): Promise<void> {
  const email = normalizeEmail(params.email);
  await setDoc(doc(db, 'teachers', email), {
    email,
    displayName: params.displayName.trim() || email,
    role: 'teacher',
    createdAt: new Date().toISOString(),
    createdBy: normalizeEmail(params.addedBy),
  });
}

export async function removeTeacher(email: string): Promise<void> {
  await deleteDoc(doc(db, 'teachers', normalizeEmail(email)));
}

/**
 * ترحيل: الاختبارات التي أُنشئت قبل هذا التحديث لا تحمل حقل isPublished،
 * والقواعد الجديدة تخفي غير المنشور، فنضع الحقل = true للمحتوى القديم.
 * المعلم يعدّل ما أنشأه، والمدير يعدّل كل شيء؛ وأي وثيقة يُرفض تعديلها تُتجاوز.
 */
export async function backfillQuizPublishFlags(): Promise<number> {
  const snap = await getDocs(collection(db, 'quizzes'));
  let updated = 0;
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data.isPublished !== undefined) continue;
    try {
      await updateDoc(doc(db, 'quizzes', d.id), { isPublished: true });
      updated++;
    } catch {
      /* ليس مالكاً لهذا الاختبار */
    }
  }
  return updated;
}

```


---

## `src/types.ts`

```ts
export type QuestionType = 'mcq' | 'written';

export interface Question {
  id: string;
  lecture: string;
  question: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  staticOptions?: boolean;
  imageURL?: string | null;
  requiresImage?: boolean;
  isAiSuggestedAnswer?: boolean;
  explanation?: string;
}

export interface TeacherUser {
  id: string;
  /** بريد المعلم (حروف صغيرة). هو أيضاً قيمة createdBy في المحتوى */
  username: string;
  displayName: string;
  role: 'admin' | 'teacher';
  createdAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  subjectId: string;
  topicId: string;
  description?: string;
  timeLimitMinutes?: number; // 0 for unlimited
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  isPublished?: boolean;
  createdBy?: string; // username of the teacher who created it
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  gradient: string;
  order?: number;
  createdBy?: string; // username of the teacher who created it
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  createdBy?: string; // username of the teacher who created it
}

export interface AIWrittenGradingResult {
  isCorrect: boolean;
  score: number; // 0 - 100
  rating: 'WRITTEN_CORRECT' | 'WRITTEN_WRONG';
  statusText: string;
  feedback: string;
  keyPointsMatched?: string[];
  missingPoints?: string[];
}

export type ViewMode = 
  | 'home'
  | 'student_subjects'
  | 'student_topics'
  | 'student_quizzes'
  | 'student_active_quiz'
  | 'teacher_login'
  | 'teacher_dashboard';

export interface QuizAttemptState {
  answers: Record<string, string>; // questionId -> selectedOption or 'WRITTEN_CORRECT' / 'WRITTEN_WRONG'
  writtenInputData: Record<string, string>; // questionId -> student text
  writtenGradingData: Record<string, AIWrittenGradingResult>; // questionId -> AI evaluation result
  timeSpentSeconds: number;
  isCompleted: boolean;
  isExamMode: boolean;
}

export interface StudentProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  updatedAt: string;
}

export interface StudentAttempt {
  id: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  isPrivateQuiz: boolean;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number;
  completedAt: string;
  questions: Question[];
  userAnswers: Record<string, string>;
  writtenInputData: Record<string, string>;
  writtenGradingData: Record<string, AIWrittenGradingResult>;
}

export interface StudentMistake {
  id: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  subjectId: string;
  subjectName: string;
  question: Question;
  lastWrongAnswer: string;
  wrongCount: number;
  lastMissedAt: string;
}

export interface StudentBookmark {
  id: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  subjectId: string;
  subjectName: string;
  question: Question;
  savedAt: string;
}

export interface PrivateQuiz {
  id: string;
  userId: string;
  title: string;
  subjectName: string;
  description?: string;
  timeLimitMinutes?: number;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
}

export interface QuizStat {
  quizId: string;
  attemptsCount: number;
  totalPercentageSum: number;
  lastAttemptAt: string;
}

```


---

## `src/utils/imageCompressor.ts`

```ts
/**
 * Utility for fast client-side image compression and resizing.
 * Prevents network bottlenecks and API timeouts when teachers upload
 * high-resolution camera photos or scans.
 */

export interface CompressedImageResult {
  data: string;
  mimeType: string;
  name: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Compress an image file to max dimension (default 1600px) and JPEG quality 0.82
 */
export async function compressImage(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.82
): Promise<CompressedImageResult> {
  const originalSize = file.size;

  return new Promise((resolve) => {
    // If not an image or SVG, read as-is
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve({
          data: base64,
          mimeType: file.type || 'image/jpeg',
          name: file.name,
          originalSize,
          compressedSize: originalSize,
        });
      };
      reader.onerror = () => {
        resolve({
          data: '',
          mimeType: file.type || 'image/jpeg',
          name: file.name,
          originalSize,
          compressedSize: 0,
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      resolve({
        data: '',
        mimeType: file.type,
        name: file.name,
        originalSize,
        compressedSize: 0,
      });
    };

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        // Fallback to original base64
        resolve({
          data: reader.result as string,
          mimeType: file.type,
          name: file.name,
          originalSize,
          compressedSize: originalSize,
        });
      };

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If both dimensions are within maxDimension and file is reasonably small (<400KB), keep as-is or compress
        if (width <= maxDimension && height <= maxDimension && originalSize < 400 * 1024) {
          resolve({
            data: reader.result as string,
            mimeType: file.type,
            name: file.name,
            originalSize,
            compressedSize: originalSize,
          });
          return;
        }

        // Calculate aspect ratio preserving dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({
            data: reader.result as string,
            mimeType: file.type,
            name: file.name,
            originalSize,
            compressedSize: originalSize,
          });
          return;
        }

        // Draw with white background in case of transparent PNGs converting to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const compressedData = canvas.toDataURL(mimeType, quality);
        const approxBytes = Math.round((compressedData.length * 3) / 4);

        resolve({
          data: compressedData,
          mimeType,
          name: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
          originalSize,
          compressedSize: approxBytes,
        });
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

```


---

## `src/utils/parser.ts`

```ts
import { Question } from '../types';

export function parseRawQuizText(rawText: string, defaultLecture = 'General'): Question[] {
  const questions: Question[] = [];
  const blocks = rawText.trim().split(/\n\s*\n/);
  let currentLecture = defaultLecture;

  blocks.forEach((block, blockIndex) => {
    let lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    const lectureRegex = /^(?:lecture|محاضرة|عنوان|درس|topic)\s*:\s*(.*)/i;
    const lectureIndex = lines.findIndex(l => lectureRegex.test(l));
    if (lectureIndex !== -1) {
      const match = lines[lectureIndex].match(lectureRegex);
      if (match && match[1]?.trim()) {
        currentLecture = match[1].trim();
      }
      lines.splice(lectureIndex, 1);
    }
    if (lines.length === 0) return;

    let imageURL: string | null = null;
    const imageIndex = lines.findIndex(l => l.toLowerCase().startsWith('image:'));
    if (imageIndex !== -1) {
      imageURL = lines[imageIndex].substring(6).trim();
      lines.splice(imageIndex, 1);
    }

    let explanation: string | undefined = undefined;
    const explanationRegex = /^(?:explanation|تفسير|شرح|توضيح)\s*:\s*(.*)/i;
    const explanationIndex = lines.findIndex(l => explanationRegex.test(l));
    if (explanationIndex !== -1) {
      const match = lines[explanationIndex].match(explanationRegex);
      if (match && match[1]?.trim()) {
        explanation = match[1].trim();
      }
      lines.splice(explanationIndex, 1);
    }

    const correctIndex = lines.findIndex(l => l.toLowerCase().startsWith('correct:'));
    if (correctIndex === -1) return;

    let questionText = "";
    let optionsStartIndex = 0;
    const optionRegex = /^[A-Z][\.\)]\s/;
    if (lines[0] && !optionRegex.test(lines[0])) {
      questionText = lines[0];
      optionsStartIndex = 1;
      if (questionText.toLowerCase().includes('[static_options]')) {
        questionText = questionText.replace(/\[static_options\]/i, '').trim();
      }
      // Remove any leading numbering like "1." or "1)" or "Question:" / "Question 1:" / "سؤال:"
      questionText = questionText.replace(/^(\s*\d+[\.\)]\s*)/, '');
      questionText = questionText.replace(/^(question|سؤال)\s*(\d+)?\s*[:\-]\s*/i, '').trim();
      questionText = questionText.replace(/^\s*\d+[\.\)]\s*/, '').trim();
    }

    const staticOptions = block.toLowerCase().includes('[static_options]');
    const optionLines = lines.slice(optionsStartIndex, correctIndex);
    const options: string[] = [];
    const optionsMap: Record<string, string> = {};

    optionLines.forEach(line => {
      const match = line.match(/^([A-Z])[\.\)]\s*(.*)/i);
      if (match) {
        const letter = match[1].toUpperCase();
        const text = match[2].trim();
        options.push(text);
        optionsMap[letter] = text;
      }
    });

    // Check if MCQ or Written
    if (options.length > 0) {
      const correctLine = lines[correctIndex];
      let correctLetter = correctLine.substring(8).trim().toUpperCase();
      correctLetter = correctLetter.replace(/[^A-Z]/g, '').charAt(0);

      const resolvedAnswer = optionsMap[correctLetter] || correctLine.substring(8).trim();
      questions.push({
        id: `q_${Date.now()}_${blockIndex}`,
        lecture: currentLecture,
        question: questionText || `سؤال ${questions.length + 1}`,
        type: 'mcq',
        options: options,
        correctAnswer: resolvedAnswer,
        staticOptions: staticOptions,
        imageURL: imageURL,
        explanation: explanation,
      });
    } else {
      const correctLine = lines[correctIndex];
      const answerText = correctLine.substring(8).trim();
      if (answerText) {
        questions.push({
          id: `q_${Date.now()}_${blockIndex}`,
          lecture: currentLecture,
          question: questionText || `سؤال مقالي ${questions.length + 1}`,
          type: 'written',
          options: [],
          correctAnswer: answerText,
          staticOptions: false,
          imageURL: imageURL,
          explanation: explanation,
        });
      }
    }
  });

  return questions;
}

export function formatQuestionsToRawText(questions: Question[]): string {
  let currentLecture = "";
  const blocks: string[] = [];

  questions.forEach(q => {
    const lines: string[] = [];
    if (q.lecture && q.lecture !== currentLecture) {
      lines.push(`Lecture: ${q.lecture}`);
      currentLecture = q.lecture;
    }
    
    if (q.staticOptions) {
      lines.push(`${q.question} [static_options]`);
    } else {
      lines.push(q.question);
    }

    if (q.imageURL) {
      lines.push(`Image: ${q.imageURL}`);
    }

    if (q.type === 'mcq' && q.options.length > 0) {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      let correctLetter = 'A';
      q.options.forEach((opt, idx) => {
        const letter = letters[idx] || `${idx + 1}`;
        lines.push(`${letter}. ${opt}`);
        if (opt === q.correctAnswer) {
          correctLetter = letter;
        }
      });
      lines.push(`Correct: ${correctLetter}`);
    } else {
      lines.push(`Correct: ${q.correctAnswer}`);
    }

    if (q.explanation) {
      lines.push(`Explanation: ${q.explanation}`);
    }

    blocks.push(lines.join('\n'));
  });

  return blocks.join('\n\n');
}

export function generateStandaloneHTML(pageTitle: string, parsedQuestions: Question[]): string {
  const lectures = [...new Set(parsedQuestions.map(q => q.lecture || 'General'))];
  
  const lectureButtonsHTML = lectures.map(lecture => {
    const safeLecture = lecture.replace(/"/g, '&quot;');
    const count = parsedQuestions.filter(q => (q.lecture || 'General') === lecture).length;
    return `<button class="lecture-button" dir="ltr" data-lecture="${safeLecture}">
        <span class="text-xl font-bold mr-2" style="word-break: break-word;">${lecture}</span>
        <span class="text-sm bg-white/20 px-3 py-1 rounded-full whitespace-nowrap">(${count} Questions)</span>
    </button>`;
  }).join('');

  const jsonString = JSON.stringify(parsedQuestions).replace(/<\/script>/g, '<\\/script>');

  const quizStyles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');

:root {
    --bg-body: #f8fafc;
    --bg-card: #ffffff;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --border-color: #e2e8f0;
    --option-bg: #ffffff;
    --option-border: #e2e8f0;
    --option-hover: #f1f5f9;
    --header-bg: rgba(255, 255, 255, 0.9);
    --header-border: #e0f2fe;
    --shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    --shadow-heavy: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    
    --success-bg: #ecfdf5; --success-text: #15803d; --success-border: #bbf7d0;
    --error-bg: #fef2f2; --error-text: #b91c1c; --error-border: #fecaca;
    --info-bg: #eff6ff; --info-text: #1d4ed8; --info-border: #bfdbfe;
    --warning-bg: #fffbeb; --warning-text: #92400e; --warning-border: #fde68a;
    --selected-bg: #eff6ff; --selected-border: #3b82f6;
    --subtle-bg: #f8fafc;
    --textarea-bg: #ffffff;
}

[data-theme="dark"] {
    --bg-body: #0f172a;
    --bg-card: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --border-color: #334155;
    --option-bg: #1e293b;
    --option-border: #334155;
    --option-hover: #334155;
    --input-bg: #1e293b;
    --input-border: #475569;
    --header-bg: rgba(30, 41, 59, 0.9);
    --header-border: #334155;
    --shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    --shadow-heavy: 0 20px 25px -5px rgba(0, 0, 0, 0.5);

    --success-bg: rgba(20, 83, 45, 0.3); --success-text: #4ade80; --success-border: #14532d;
    --error-bg: rgba(127, 29, 29, 0.3); --error-text: #f87171; --error-border: #7f1d1d;
    --info-bg: rgba(30, 58, 138, 0.3); --info-text: #60a5fa; --info-border: #1e3a8a;
    --warning-bg: rgba(180, 83, 9, 0.2); --warning-text: #fbbf24; --warning-border: #92400e;
    --selected-bg: rgba(59, 130, 246, 0.15); --selected-border: #60a5fa;
    --subtle-bg: #1e293b;
    --textarea-bg: #334155;
}

body { font-family: 'Cairo', sans-serif; background-color: var(--bg-body); color: var(--text-primary); transition: background-color 0.3s, color 0.3s; }
[dir="auto"], .bidi-text { unicode-bidi: plaintext; text-align: start; }
:dir(ltr), [dir="ltr"] { text-align: left; }
:dir(rtl), [dir="rtl"] { text-align: right; }
.surface-card { background-color: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); box-shadow: var(--shadow-heavy); }
.text-main { color: var(--text-primary); }
.text-sub { color: var(--text-secondary); }

.floating-header { 
    position: sticky; top: 0; z-index: 40; 
    padding: 0.75rem 1.5rem; 
    display: flex; justify-content: space-between; align-items: center; 
    width: 100%; max-width: 48rem; margin: 0 auto;
}

.floating-pill { 
    background: var(--header-bg); border: 1px solid var(--header-border); 
    box-shadow: var(--shadow-soft); padding: 0.4rem 1rem; border-radius: 9999px; 
    display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); 
    backdrop-filter: blur(8px); cursor: pointer;
}

.title-card { background-color: var(--bg-card); padding: 2rem; border-radius: 1.5rem; margin-bottom: 2rem; box-shadow: var(--shadow-soft); border: 1px solid var(--border-color); text-align: center; position: relative; overflow: hidden; }
.title-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(to right, #3b82f6, #6366f1); }
.title-text { font-family: 'Cairo', 'Roboto', sans-serif; font-weight: 900; font-size: 1.75rem; color: #2563eb; text-align: center; }

.question-card { background-color: var(--bg-card); border-radius: 1.5rem; padding: 2rem; margin-bottom: 2rem; box-shadow: var(--shadow-soft); border: 1px solid var(--border-color); text-align: start; font-family: 'Cairo', 'Roboto', sans-serif; transition: background-color 0.3s ease; }
.question-header { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; text-align: start; }
.question-image-area img { max-width: 100%; max-height: 350px; border-radius: 0.75rem; object-fit: contain; cursor: pointer; }

.option { display: flex; align-items: center; padding: 1rem 1.25rem; border: 2px solid var(--option-border); background-color: var(--option-bg); color: var(--text-primary); border-radius: 1rem; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s; font-size: 1.05rem; text-align: start; }
.option:hover { border-color: #93c5fd; background-color: var(--option-hover); }
.option span { flex: 1; text-align: start; unicode-bidi: plaintext; }

.radio-circle { width: 1.5rem; height: 1.5rem; border: 2px solid #cbd5e1; border-radius: 50%; margin-left: 0.75rem; margin-right: 0.75rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.radio-dot { width: 0.85rem; height: 0.85rem; background: transparent; border-radius: 50%; transform: scale(0); transition: all 0.2s; }

.option.selected { border-color: var(--selected-border); background-color: var(--selected-bg); }
.option.selected .radio-circle { border-color: var(--selected-border); }
.option.selected .radio-dot { background: var(--selected-border); transform: scale(1); }

.option.wrong { border-color: var(--error-text) !important; background-color: var(--error-bg) !important; }
.option.correct { border-color: var(--success-text) !important; background-color: var(--success-bg) !important; }
.option.correct-highlight { border-color: var(--success-text) !important; background-color: var(--success-bg) !important; }

.chat-input-container { display: flex; align-items: flex-end; background-color: var(--textarea-bg); border: 1px solid var(--border-color); border-radius: 2rem; padding: 0.5rem 0.5rem 0.5rem 1rem; box-shadow: var(--shadow-soft); margin-bottom: 1rem; }
.chat-textarea { flex: 1; background: transparent; border: none; padding: 0.75rem 0; font-family: inherit; font-size: 1rem; color: var(--text-primary); outline: none; resize: vertical; min-height: 48px; text-align: start; unicode-bidi: plaintext; }
.chat-send-btn { width: 45px; height: 45px; background-color: #3b82f6; color: white; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-right: 0.75rem; }

.btn-control { padding: 0.6rem 1.25rem; border-radius: 9999px; font-weight: 600; font-size: 0.9rem; border: 1px solid var(--border-color); cursor: pointer; background: var(--bg-card); color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem; justify-content: center; }
.btn-control:hover { background-color: var(--option-hover); color: var(--text-primary); }

.theme-switch-wrapper { display: flex; align-items: center; gap: 10px; cursor: pointer; justify-content: center; background: var(--option-hover); padding: 0.5rem 1rem; border-radius: 9999px; border: 1px solid var(--border-color); }
.theme-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.theme-switch input { opacity: 0; width: 0; height: 0; }
.theme-switch .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
.theme-switch .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
.theme-switch input:checked + .slider { background-color: #4f46e5; }
.theme-switch input:checked + .slider:before { transform: translateX(20px); }

.lecture-button { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 1.5rem; margin-bottom: 1rem; background: rgba(37, 99, 235, 0.08); color: #2563eb; border-radius: 1rem; border: 1px solid rgba(37, 99, 235, 0.2); cursor: pointer; font-family: 'Cairo', 'Roboto', sans-serif; text-align: start; }
.lecture-button:hover { background: rgba(37, 99, 235, 0.15); border-color: #2563eb; }
.hidden { display: none !important; }
`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>${quizStyles}</style>
</head>
<body>
    <div id="lecture-screen" class="min-h-screen flex flex-col items-center justify-center p-4">
        <div class="w-full max-w-3xl surface-card p-8 md:p-12 rounded-3xl shadow-xl">
            <h1 class="text-3xl md:text-4xl font-extrabold text-center mb-6 border-b pb-6 text-main">${pageTitle}</h1>
            
            <div class="flex justify-center mb-8">
                <label class="theme-switch-wrapper" title="تبديل الوضع الليلي">
                    <span class="text-sm font-bold">الوضع المظلم</span>
                    <div class="theme-switch">
                        <input type="checkbox" onchange="toggleTheme(this)">
                        <span class="slider"></span>
                    </div>
                </label>
            </div>

            <h2 class="text-lg font-semibold text-sub mb-6 text-center">اختر المحاضرة أو الموضوع للبدء</h2>
            <div class="space-y-4">
                ${lectureButtonsHTML}
            </div>
        </div>
    </div>

    <div id="quiz-screen" class="hidden min-h-screen">
        <div class="floating-header">
            <button onclick="goHome()" class="floating-pill">🏠 الرئيسية</button>
            <div class="floating-pill text-blue-600">
                <span>النتيجة:</span>
                <span id="current-score" class="font-bold text-lg">0</span>
            </div>
        </div>

        <div class="max-w-3xl mx-auto px-4 pb-24">
            <div id="lecture-title-card" class="title-card">
                <h2 id="lecture-title-text" class="title-text">Lecture</h2>
            </div>

            <div id="quiz-controls" class="flex flex-wrap justify-center gap-3 mb-6">
                <label class="theme-switch-wrapper">
                     <span class="text-sm font-bold">الوضع المظلم</span>
                     <div class="theme-switch">
                        <input type="checkbox" onchange="toggleTheme(this)">
                        <span class="slider"></span>
                     </div>
                </label>
                <button onclick="shuffleCurrentQuiz()" class="btn-control">🔀 ترتيب عشوائي</button>
                <button onclick="showAllAnswers()" class="btn-control">👁️ إظهار الإجابات</button>
            </div>

            <div id="questions-container"></div>
        </div>

        <div class="fixed bottom-6 left-0 w-full flex justify-center z-30">
            <button id="submit-btn" onclick="submitQuiz()" class="hidden bg-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-700 shadow-xl">إنهاء وعرض النتيجة</button>
        </div>
    </div>

    <div id="results-screen" class="hidden min-h-screen flex items-center justify-center p-4">
        <div class="surface-card p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center">
            <div class="text-7xl mb-4">🏆</div>
            <h2 class="text-3xl font-extrabold text-main mb-2">تم إنهاء الاختبار بنجاح</h2>
            <p class="text-sub mb-6 font-medium" id="result-lecture-name"></p>
            <div class="p-6 rounded-2xl bg-blue-50 dark:bg-slate-800 border mb-6">
                <div class="text-sm font-bold text-sub mb-2">النتيجة النهائية</div>
                <div class="text-5xl font-black text-blue-600" id="final-score">0</div>
                <div class="mt-2 font-bold text-lg" id="score-percentage">0%</div>
            </div>
            <button onclick="goHome()" class="w-full bg-slate-900 text-white py-4 rounded-xl font-bold">العودة للرئيسية</button>
        </div>
    </div>

    <script id="quiz-data-json" type="application/json">${jsonString}</script>
    <script>
        let allQuestions = [];
        try { allQuestions = JSON.parse(document.getElementById('quiz-data-json').textContent); } catch(e) {}
        let currentQuestions = [], userAnswers = {}, currentLecture = "";

        allQuestions.forEach((q, i) => q._id = i);

        function toggleTheme(cb) {
            if(cb.checked) document.documentElement.setAttribute('data-theme', 'dark');
            else document.documentElement.removeAttribute('data-theme');
        }

        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.lecture-button');
            if (btn) startQuiz(btn.getAttribute('data-lecture'));
        });

        function goHome() {
            document.getElementById('lecture-screen').classList.remove('hidden');
            document.getElementById('quiz-screen').classList.add('hidden');
            document.getElementById('results-screen').classList.add('hidden');
        }

        function startQuiz(lectureName) {
            currentLecture = lectureName;
            currentQuestions = allQuestions.filter(q => (q.lecture || 'General') === lectureName);
            userAnswers = {};
            document.getElementById('lecture-title-text').textContent = lectureName;
            document.getElementById('lecture-screen').classList.add('hidden');
            document.getElementById('results-screen').classList.add('hidden');
            document.getElementById('quiz-screen').classList.remove('hidden');
            renderQuiz();
            window.scrollTo(0, 0);
        }

        function renderQuiz() {
            const container = document.getElementById('questions-container');
            container.innerHTML = '';
            let score = 0;
            currentQuestions.forEach(q => {
                if (userAnswers[q._id] === q.correctAnswer) score++;
            });
            document.getElementById('current-score').textContent = score;

            currentQuestions.forEach((q, idx) => {
                const card = document.createElement('div');
                card.className = 'question-card';
                let img = q.imageURL ? \`<div class="question-image-area mb-4"><img src="\${q.imageURL}"></div>\` : '';
                card.innerHTML = \`<div class="question-header"><h3 class="text-xl font-bold">\${idx + 1}. \${q.question}</h3>\${img}</div><div class="opts"></div>\`;
                const opts = card.querySelector('.opts');

                if (q.type === 'written') {
                    const ans = userAnswers[q._id];
                    if (ans) {
                        opts.innerHTML = \`<div class="p-4 bg-blue-50 dark:bg-slate-800 rounded-xl mb-2 font-bold">الإجابة النموذجية: \${q.correctAnswer}</div><div class="p-3 bg-green-50 text-green-700 font-bold rounded-lg">تم تسجيل إجابتك: \${ans}</div>\`;
                    } else {
                        opts.innerHTML = \`<div class="chat-input-container"><textarea id="in-\${q._id}" class="chat-textarea" placeholder="اكتب إجابتك هنا..."></textarea><button onclick="submitWritten(\${q._id})" class="chat-send-btn">✓</button></div>\`;
                    }
                } else {
                    q.options.forEach(opt => {
                        const optDiv = document.createElement('div');
                        optDiv.className = 'option';
                        const selected = userAnswers[q._id] === opt;
                        if (selected) {
                            optDiv.classList.add('selected');
                            if (opt === q.correctAnswer) optDiv.classList.add('correct');
                            else optDiv.classList.add('wrong');
                        }
                        if (userAnswers[q._id] && opt === q.correctAnswer && !selected) {
                            optDiv.classList.add('correct-highlight');
                        }
                        optDiv.innerHTML = \`<div class="radio-circle"><div class="radio-dot"></div></div><span>\${opt}</span>\`;
                        optDiv.onclick = () => {
                            if (userAnswers[q._id]) return;
                            userAnswers[q._id] = opt;
                            renderQuiz();
                        };
                        opts.appendChild(optDiv);
                    });
                }
                container.appendChild(card);
            });

            const answeredCount = Object.keys(userAnswers).length;
            const submitBtn = document.getElementById('submit-btn');
            if (answeredCount > 0) {
                submitBtn.classList.remove('hidden');
                submitBtn.textContent = \`إنهاء وعرض النتيجة (\${answeredCount}/\${currentQuestions.length})\`;
            } else {
                submitBtn.classList.add('hidden');
            }
        }

        function submitWritten(qId) {
            const input = document.getElementById('in-' + qId);
            if (input && input.value.trim()) {
                userAnswers[qId] = input.value.trim();
                renderQuiz();
            }
        }

        function shuffleCurrentQuiz() {
            currentQuestions.sort(() => Math.random() - 0.5);
            userAnswers = {};
            renderQuiz();
        }

        function showAllAnswers() {
            currentQuestions.forEach(q => {
                userAnswers[q._id] = q.correctAnswer;
            });
            renderQuiz();
        }

        function submitQuiz() {
            let score = 0;
            const mcqs = currentQuestions.filter(q => q.type !== 'written');
            mcqs.forEach(q => {
                if (userAnswers[q._id] === q.correctAnswer) score++;
            });
            const pct = mcqs.length > 0 ? Math.round((score / mcqs.length) * 100) : 100;
            document.getElementById('quiz-screen').classList.add('hidden');
            document.getElementById('results-screen').classList.remove('hidden');
            document.getElementById('result-lecture-name').textContent = currentLecture;
            document.getElementById('final-score').textContent = score + ' / ' + mcqs.length;
            document.getElementById('score-percentage').textContent = pct + '%';
        }
    </script>
</body>
</html>`;
}

export function downloadMistakesHTML(lectureName: string, wrongQuestions: Question[], userAnswers: Record<string, string>, writtenInputData: Record<string, string>): void {
  const content = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مراجعة الأخطاء - ${lectureName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Cairo', sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem; }
      .card { background: white; border-radius: 1.25rem; padding: 1.75rem; margin-bottom: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
      .opt { padding: 0.85rem 1.25rem; border-radius: 0.75rem; margin-bottom: 0.5rem; border: 1px solid #e2e8f0; }
      .opt-wrong { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
      .opt-correct { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; font-weight: bold; }
    </style>
</head>
<body class="max-w-3xl mx-auto">
    <div class="text-center mb-8">
        <h1 class="text-3xl font-black text-slate-800 mb-2">📑 مراجعة الأسئلة غير المجابة والخاطئة</h1>
        <p class="text-slate-500 font-bold">${lectureName} - إجمالي ${wrongQuestions.length} سؤال</p>
    </div>
    
    <div class="space-y-6">
      ${wrongQuestions.map((q, i) => {
        const studentAns = userAnswers[q.id];
        const studentText = writtenInputData[q.id];
        
        let details = '';
        if (q.type === 'written') {
          details = `
            <div class="p-4 bg-slate-50 rounded-xl mb-3 border">
              <span class="font-bold text-slate-500 text-sm">إجابتك:</span>
              <p class="text-slate-800 font-medium mt-1">${studentText || 'لم يتم كتابة إجابة'}</p>
            </div>
            <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span class="font-bold text-emerald-700 text-sm">الإجابة النموذجية:</span>
              <p class="text-emerald-900 font-bold mt-1">${q.correctAnswer}</p>
            </div>
          `;
        } else {
          details = `
            <div class="space-y-2">
              ${q.options.map(opt => {
                const isSelected = studentAns === opt;
                const isCorrect = opt === q.correctAnswer;
                let cls = 'opt bg-white';
                let tag = '';
                if (isSelected && !isCorrect) {
                  cls = 'opt opt-wrong';
                  tag = ' ❌ (إجابتك)';
                } else if (isCorrect) {
                  cls = 'opt opt-correct';
                  tag = ' ✅ (الإجابة الصحيحة)';
                }
                return `<div class="${cls}"><span>${opt}</span><span class="font-bold mr-2">${tag}</span></div>`;
              }).join('')}
            </div>
          `;
        }

        return `
          <div class="card">
            <h3 class="text-xl font-bold mb-4 font-sans text-slate-800">${i + 1}. ${q.question}</h3>
            ${q.imageURL ? `<div class="mb-4"><img src="${q.imageURL}" class="max-h-64 rounded-lg object-contain"></div>` : ''}
            ${details}
          </div>
        `;
      }).join('')}
    </div>
</body>
</html>`;

  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const safeName = lectureName.replace(/[^a-z0-9\u0600-\u06FF]/gi, '_').substring(0, 30);
  link.download = `Mistakes_${safeName}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

```


---

## `src/utils/pdfExtractor.ts`

```ts
import * as pdfjsLib from 'pdfjs-dist';

// Resolve worker URL safely in Vite production & dev bundles
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ExtractedPdfImage {
  id: string;
  name: string;
  data: string;
  mimeType: string;
}

export interface PdfExtractionResult {
  text: string;
  images: ExtractedPdfImage[];
  pageCount: number;
  textPageCount: number;
  renderedPageCount: number;
}

/**
 * Extracts text from digital PDFs and renders scanned/low-text pages as JPEG images
 * so both digital lecture PDFs and scanned exam sheets work seamlessly with AI.
 */
export async function extractPdfContent(
  file: File,
  options?: {
    maxPages?: number;
    maxRenderedImages?: number;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<PdfExtractionResult> {
  const maxPages = options?.maxPages ?? 30;
  const maxRenderedImages = options?.maxRenderedImages ?? 15;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPagesToRead = Math.min(pdf.numPages, maxPages);
  const textChunks: string[] = [];
  const images: ExtractedPdfImage[] = [];
  let textPageCount = 0;
  let renderedPageCount = 0;

  for (let pageNum = 1; pageNum <= totalPagesToRead; pageNum++) {
    options?.onProgress?.(pageNum, totalPagesToRead);
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const nonSpaceLength = pageText.replace(/\s/g, '').length;

    if (nonSpaceLength >= 40) {
      textPageCount++;
      textChunks.push(`--- Page ${pageNum} ---\n${pageText}`);
    } else if (renderedPageCount < maxRenderedImages) {
      // Scanned or image-based page: render to offscreen canvas for vision processing
      const baseViewport = page.getViewport({ scale: 1 });
      const targetScale = Math.min(2, Math.max(1.2, 1300 / Math.max(baseViewport.width, 1)));
      const viewport = page.getViewport({ scale: targetScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        renderedPageCount++;
        images.push({
          id: `pdf_${Date.now()}_p${pageNum}_${Math.random().toString(36).slice(2, 6)}`,
          name: `${file.name.replace(/\.pdf$/i, '')}_p${pageNum}.jpg`,
          data: dataUrl,
          mimeType: 'image/jpeg',
        });

        canvas.width = 0;
        canvas.height = 0;
      }
    }
  }

  return {
    text: textChunks.join('\n\n'),
    images,
    pageCount: pdf.numPages,
    textPageCount,
    renderedPageCount,
  };
}

```


---

## `src/utils/printHelper.ts`

```ts
import { Question } from '../types';

export interface PrintQuizOptions {
  includeAnswerKey?: boolean;
}

export function printQuizAsPDF(
  title: string,
  questions: Question[],
  options: PrintQuizOptions = {}
) {
  const { includeAnswerKey = true } = options;
  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  let html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}${includeAnswerKey ? ' - Answer Key' : ' - Exam Paper'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap');
        
        @page {
          margin: 1.5cm;
        }
        
        body {
          font-family: 'Cairo', 'Plus Jakarta Sans', sans-serif;
          color: #1e1e1e;
          line-height: 1.6;
          background: #ffffff;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Bidirectional Auto Alignment */
        [dir="auto"], .bidi-text {
          unicode-bidi: plaintext;
          text-align: start;
        }
        
        :dir(ltr), [dir="ltr"] {
          text-align: left;
        }
        
        :dir(rtl), [dir="rtl"] {
          text-align: right;
        }

        .header {
          text-align: center;
          margin-bottom: 24px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
        }
        
        .header h1 {
          font-size: 24px;
          color: #0f172a;
          margin: 0 0 6px 0;
          text-align: center;
        }

        .exam-meta {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-top: 10px;
          font-size: 13px;
          color: #475569;
        }

        .question-image {
          display: block;
          max-width: 100%;
          max-height: 240px;
          margin: 8px 0 12px 0;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .question-block {
          margin-bottom: 25px;
          page-break-inside: avoid;
          text-align: start;
        }

        .question-text {
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 10px;
          text-align: start;
          unicode-bidi: plaintext;
        }

        .options-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .option-item {
          font-size: 14px;
          margin-bottom: 8px;
          display: flex;
          align-items: baseline;
          gap: 8px;
          text-align: start;
          unicode-bidi: plaintext;
        }

        .option-letter {
          font-weight: bold;
          flex-shrink: 0;
        }

        .option-text {
          flex: 1;
          text-align: start;
          unicode-bidi: plaintext;
        }

        /* Written Question */
        .written-area {
          margin-top: 15px;
          height: 100px;
          border: 1px dashed #94a3b8;
          border-radius: 8px;
        }

        /* Answer Key Table */
        .answer-key-page {
          page-break-before: always;
        }

        .answer-key-header {
          text-align: center;
          margin-bottom: 20px;
          color: #0f172a;
        }

        .answer-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0 auto;
          font-size: 12px;
        }

        .answer-table th, .answer-table td {
          border: 1px solid #e0f2fe;
          padding: 6px 8px;
          text-align: center;
        }

        .answer-table th {
          background-color: #f0f9ff;
          font-weight: bold;
          color: #0f172a;
        }

        .answer-table tr:nth-child(even) {
          background-color: #FAFAFA;
        }
        
        /* Highlight Question Column */
        .answer-table th.q-col, .answer-table td.q-col {
          background-color: #f8fafc !important;
          font-weight: bold;
          color: #334155;
          width: 10%;
        }
        
        .answer-table td.a-col {
          width: 23%;
          text-align: start;
          unicode-bidi: plaintext;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 dir="auto">${title}</h1>
        ${
          !includeAnswerKey
            ? `<div class="exam-meta" dir="auto"><span>الاسم / Name: ___________________________</span><span>الدرجة / Score: _____ / ${questions.length}</span></div>`
            : `<div class="exam-meta" dir="auto"><span>نسخة المعلم ونموذج الإجابة · Instructor Copy</span><span>عدد الأسئلة: ${questions.length}</span></div>`
        }
      </div>
  `;

  // Clean Question: prefix if any
  const cleanQ = (text: string) => {
    return text
      .replace(/^(\s*\d+[\.\)]\s*)/, '')
      .replace(/^(question|سؤال)\s*(\d+)?\s*[:\-]\s*/i, '')
      .replace(/^\s*\d+[\.\)]\s*/, '')
      .trim();
  };

  // Render Questions
  questions.forEach((q, idx) => {
    const cleanedQuestion = cleanQ(q.question);
    html += `
      <div class="question-block">
        <div class="question-text" dir="auto">${idx + 1}. ${cleanedQuestion}</div>
    `;

    if (q.imageURL) {
      html += `<img src="${q.imageURL}" class="question-image" alt="Question figure" />`;
    }

    if (q.type === 'mcq' && q.options) {
      html += `<ul class="options-list">`;
      q.options.forEach((opt, optIdx) => {
        html += `
          <li class="option-item" dir="auto">
            <span class="option-letter">${getOptionLetter(optIdx)}.</span>
            <span class="option-text" dir="auto">${opt}</span>
          </li>
        `;
      });
      html += `</ul>`;
    } else {
      html += `<div class="written-area"></div>`;
    }

    html += `</div>`;
  });

  if (includeAnswerKey) {

  // Prepare Answers Array
  const answersList = questions.map((q, idx) => {
    let answerText = '';
    if (q.type === 'mcq' && q.options && q.correctAnswer) {
      const correctIdx = q.options.findIndex(opt => opt.trim() === q.correctAnswer?.trim());
      if (correctIdx !== -1) {
        answerText = `${getOptionLetter(correctIdx)}. ${q.correctAnswer}`;
      } else {
        answerText = q.correctAnswer;
      }
    } else {
      answerText = q.correctAnswer || 'Not specified';
    }
    return { num: idx + 1, text: answerText };
  });

  const columnsPerRow = 3;
  const rows = Math.ceil(answersList.length / columnsPerRow);

  // Render Answer Key
  html += `
      <div class="answer-key-page" dir="ltr">
        <div class="answer-key-header">
          <h2>Answer Key</h2>
        </div>
        <table class="answer-table">
          <thead>
            <tr>
              <th class="q-col">Question</th>
              <th class="a-col">Correct Answer</th>
              <th class="q-col">Question</th>
              <th class="a-col">Correct Answer</th>
              <th class="q-col">Question</th>
              <th class="a-col">Correct Answer</th>
            </tr>
          </thead>
          <tbody>
  `;

  for (let i = 0; i < rows; i++) {
    html += `<tr>`;
    for (let c = 0; c < columnsPerRow; c++) {
      const idx = i + c * rows; // Vertical fill is better for scanning lists (Q1, Q2, Q3 down first column)
      if (idx < answersList.length) {
        html += `<td class="q-col">Question ${answersList[idx].num}</td><td class="a-col" dir="auto">${answersList[idx].text}</td>`;
      } else {
        html += `<td class="q-col"></td><td class="a-col"></td>`;
      }
    }
    html += `</tr>`;
  }

  html += `
          </tbody>
        </table>
      </div>
  `;
  }

  html += `
    </body>
    </html>
  `;

  // Use a hidden iframe for printing to prevent popup-blockers and avoid window.open / window.alert in sandbox environments
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }
      }, 500);
    }
  } catch (err) {
    console.error('Print iframe error:', err);
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}


```


---

## `src/utils/storage.ts`

```ts
import { Subject, Topic, Quiz } from '../types';
import { DEFAULT_SUBJECTS, DEFAULT_TOPICS, DEFAULT_QUIZZES } from '../data/defaultData';

const STORAGE_KEYS = {
  SUBJECTS: 'quiz_master_subjects_v1',
  TOPICS: 'quiz_master_topics_v1',
  QUIZZES: 'quiz_master_quizzes_v1',
  THEME: 'quiz_master_theme',
  QUIZ_PROGRESS_PREFIX: 'quiz_progress_',
};

/**
 * النظام القديم كان يخزن حسابات المعلمين وكلمات مرورهم نصاً في localStorage.
 * نحذفها من أي متصفح قديم عند أول تشغيل بعد التحديث.
 */
export const purgeLegacyTeacherCredentials = (): void => {
  try {
    localStorage.removeItem('quiz_master_teachers_v2');
    localStorage.removeItem('quiz_master_current_teacher_v2');
  } catch {
    /* ignore */
  }
};

export const getStoredSubjects = (): Subject[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
      return DEFAULT_SUBJECTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading subjects:', e);
    return DEFAULT_SUBJECTS;
  }
};

export const saveStoredSubjects = (subjects: Subject[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  } catch (e) {
    console.error('Error saving subjects:', e);
  }
};

export const getStoredTopics = (): Topic[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TOPICS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(DEFAULT_TOPICS));
      return DEFAULT_TOPICS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading topics:', e);
    return DEFAULT_TOPICS;
  }
};

export const saveStoredTopics = (topics: Topic[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  } catch (e) {
    console.error('Error saving topics:', e);
  }
};

export const getStoredQuizzes = (): Quiz[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUIZZES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(DEFAULT_QUIZZES));
      return DEFAULT_QUIZZES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading quizzes:', e);
    return DEFAULT_QUIZZES;
  }
};

export const saveStoredQuizzes = (quizzes: Quiz[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
  } catch (e) {
    console.error('Error saving quizzes:', e);
  }
};

export const getSubjects = getStoredSubjects;
export const saveSubjects = saveStoredSubjects;
export const getTopics = getStoredTopics;
export const saveTopics = saveStoredTopics;
export const getQuizzes = getStoredQuizzes;
export const saveQuizzes = saveStoredQuizzes;

export const saveQuizProgress = (quizId: string, data: any): void => {
  try {
    localStorage.setItem(`${STORAGE_KEYS.QUIZ_PROGRESS_PREFIX}${quizId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving progress:', e);
  }
};

export const getQuizProgress = (quizId: string): any => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.QUIZ_PROGRESS_PREFIX}${quizId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error getting progress:', e);
    return null;
  }
};

export const clearQuizProgress = (quizId: string): void => {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.QUIZ_PROGRESS_PREFIX}${quizId}`);
  } catch (e) {
    console.error('Error clearing progress:', e);
  }
};

export interface SavedQuizProgressEntry {
  quizId: string;
  answeredCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
}

export const listSavedQuizProgress = (): SavedQuizProgressEntry[] => {
  const entries: SavedQuizProgressEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_KEYS.QUIZ_PROGRESS_PREFIX)) continue;
      const quizId = key.slice(STORAGE_KEYS.QUIZ_PROGRESS_PREFIX.length);
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const answers = parsed?.answers || {};
      const answeredCount = Object.values(answers).filter(
        (v) => Boolean(v) && v !== 'SHOW_ANSWERS_FLAG'
      ).length;
      const totalQuestions = Array.isArray(parsed?.questions) ? parsed.questions.length : 0;
      if (answeredCount > 0 || (parsed?.writtenInputData && Object.keys(parsed.writtenInputData).length > 0)) {
        entries.push({
          quizId,
          answeredCount,
          totalQuestions,
          timeSpentSeconds: Number(parsed?.timeSpentSeconds) || 0,
        });
      }
    }
  } catch (e) {
    console.error('Error listing saved quiz progress:', e);
  }
  return entries;
};


```


---

## `src/utils/textDirection.ts`

```ts
/**
 * Utility for detecting text direction (RTL vs LTR)
 * specifically designed to ensure Arabic questions align right (RTL)
 * and English questions align left (LTR), regardless of page language.
 */

export function isArabicText(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;

  // Strip image tags, code tags, numbers, punctuation, spaces
  const clean = text
    .replace(/<[^>]*>/g, '')
    .replace(/\[\s*img\s*:[^\]]*\]/gi, '')
    .replace(/[0-9\s.,!?:;()[\]{}<>"'`~@#$%^&*_\-+=|\\/،؛؟]/g, '');

  if (!clean) return false;

  const arabicCharRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const arabicMatches = clean.match(arabicCharRegex);
  const arabicCount = arabicMatches ? arabicMatches.length : 0;

  const latinCharRegex = /[a-zA-Z]/g;
  const latinMatches = clean.match(latinCharRegex);
  const latinCount = latinMatches ? latinMatches.length : 0;

  // More Arabic characters than Latin
  if (arabicCount > latinCount) return true;
  // Has Arabic and no Latin
  if (arabicCount > 0 && latinCount === 0) return true;
  // Substantial Arabic presence (35% or more)
  if (arabicCount / clean.length >= 0.35) return true;

  // Check first word
  const firstWordMatch = text.match(/[^\s\d\p{P}]+/u);
  if (firstWordMatch && arabicCharRegex.test(firstWordMatch[0]) && arabicCount >= 3) {
    if (arabicCount / (arabicCount + latinCount) >= 0.3) {
      return true;
    }
  }

  return false;
}

export function getQuestionDirection(questionText?: string | null): 'rtl' | 'ltr' {
  return isArabicText(questionText) ? 'rtl' : 'ltr';
}

export function getQuestionAlign(questionText?: string | null): 'text-right' | 'text-left' {
  return isArabicText(questionText) ? 'text-right' : 'text-left';
}

export function getDirectionClasses(questionText?: string | null) {
  const isRTL = isArabicText(questionText);
  return {
    dir: (isRTL ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    align: isRTL ? 'text-right' : 'text-left',
    isRTL,
  };
}

```
