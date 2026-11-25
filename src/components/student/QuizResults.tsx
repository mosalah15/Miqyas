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

