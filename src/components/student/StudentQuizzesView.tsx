import React, { useState } from 'react';
import { Subject, Topic, Quiz } from '../../types';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  FileQuestion,
  Play,
  HelpCircle,
  BrainCircuit,
  Link2,
  Check,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { FlashcardsModal } from './FlashcardsModal';
import { CustomPracticeModal } from './CustomPracticeModal';

interface StudentQuizzesViewProps {
  subject: Subject;
  topic: Topic;
  quizzes: Quiz[];
  onStartQuiz: (quiz: Quiz, custom?: { limit?: number; qType?: 'all' | 'mcq' | 'written' }) => void;
  onBackToTopics: () => void;
}

export const StudentQuizzesView: React.FC<StudentQuizzesViewProps> = ({
  subject,
  topic,
  quizzes,
  onStartQuiz,
  onBackToTopics,
}) => {
  const { t, isArabic } = useLanguage();
  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);
  const [flashcardsQuiz, setFlashcardsQuiz] = useState<Quiz | null>(null);
  const [customQuiz, setCustomQuiz] = useState<Quiz | null>(null);
  const topicQuizzes = quizzes.filter((q) => q.topicId === topic.id);
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const handleCopyLink = (e: React.MouseEvent, quizId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedQuizId(quizId);
    setTimeout(() => setCopiedQuizId((curr) => (curr === quizId ? null : curr)), 2200);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      {/* Back button */}
      <button
        onClick={onBackToTopics}
        className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors mb-6 cursor-pointer"
      >
        <BackIcon className="w-4 h-4" />
        <span>{t('back')}</span>
      </button>

      {/* Topic Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 mb-8 text-start">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
          <span>{subject.name}</span>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span className="text-blue-600 dark:text-blue-400 font-medium">{topic.title}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          {topic.title}
        </h1>
        {topic.description && (
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed">
            {topic.description}
          </p>
        )}
      </div>

      {/* Quizzes List */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <FileQuestion className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {t('availableQuizzesHeader', { count: topicQuizzes.length })}
          </h2>
        </div>

        {topicQuizzes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-3">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {t('noQuizzesAvailable')}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {t('noQuizzesDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topicQuizzes.map((quiz) => {
              const mcqCount = quiz.questions.filter((q) => q.type !== 'written').length;
              const writtenCount = quiz.questions.filter((q) => q.type === 'written').length;

              return (
                <div
                  key={quiz.id}
                  onClick={() => onStartQuiz(quiz)}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-2xl p-5 sm:p-6 transition-colors cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5"
                >
                  <div className="space-y-2 flex-1 min-w-0 text-start">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {quiz.title}
                    </h3>

                    {quiz.description && (
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                        {quiz.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {t('questionsCount', { count: quiz.questions.length })}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">·</span>
                      <span>{t('multipleChoiceCount', { count: mcqCount })}</span>
                      {writtenCount > 0 && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-700">·</span>
                          <span className="inline-flex items-center gap-1">
                            <BrainCircuit className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{t('writtenCount', { count: writtenCount })}</span>
                          </span>
                        </>
                      )}
                      <span className="text-zinc-300 dark:text-zinc-700">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>
                          {quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0
                            ? t('timeLimitMins', { count: quiz.timeLimitMinutes })
                            : t('noTimeLimit')}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFlashcardsQuiz(quiz);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      title={isArabic ? 'وضع البطاقات السريعة' : 'Flashcards Mode'}
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{isArabic ? 'بطاقات' : 'Cards'}</span>
                    </button>

                    {quiz.questions.length > 5 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomQuiz(quiz);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                        title={isArabic ? 'تدريب بعدد أسئلة مخصص' : 'Custom Question Count'}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{isArabic ? 'مخصص' : 'Custom'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(e, quiz.id)}
                      className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                        copiedQuizId === quiz.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                          : 'bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                      title={isArabic ? 'نسخ رابط الاختبار' : 'Copy quiz link'}
                    >
                      {copiedQuizId === quiz.id ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">
                        {copiedQuizId === quiz.id
                          ? isArabic
                            ? 'تم النسخ'
                            : 'Copied'
                          : isArabic
                          ? 'الرابط'
                          : 'Link'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartQuiz(quiz);
                      }}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl transition-colors cursor-pointer text-xs sm:text-sm shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t('startQuizButton')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FlashcardsModal
        isOpen={Boolean(flashcardsQuiz)}
        title={flashcardsQuiz?.title || ''}
        questions={flashcardsQuiz?.questions || []}
        onClose={() => setFlashcardsQuiz(null)}
      />

      <CustomPracticeModal
        quiz={customQuiz}
        onClose={() => setCustomQuiz(null)}
        onStartCustom={(quiz, limit, qType) => {
          setCustomQuiz(null);
          onStartQuiz(quiz, { limit, qType });
        }}
      />
    </div>
  );
};


