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

