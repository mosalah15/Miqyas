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

