import React, { useState } from 'react';
import { Subject, Topic, Quiz } from '../../types';
import {
  Search,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  FileQuestion,
  Play,
  Clock,
  BrainCircuit,
  Layers,
  Link2,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { FlashcardsModal } from './FlashcardsModal';
import { CustomPracticeModal } from './CustomPracticeModal';

interface StudentTopicsViewProps {
  subject: Subject;
  topics: Topic[];
  quizzes: Quiz[];
  onSelectTopic: (topic: Topic) => void;
  onStartQuiz: (quiz: Quiz, custom?: { limit?: number; qType?: 'all' | 'mcq' | 'written' }) => void;
  onBackToSubjects: () => void;
}

export const StudentTopicsView: React.FC<StudentTopicsViewProps> = ({
  subject,
  topics,
  quizzes,
  onSelectTopic,
  onStartQuiz,
  onBackToSubjects,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);
  const [flashcardsQuiz, setFlashcardsQuiz] = useState<Quiz | null>(null);
  const [customQuiz, setCustomQuiz] = useState<Quiz | null>(null);
  const { t, isArabic } = useLanguage();

  const handleCopyLink = (e: React.MouseEvent, quizId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedQuizId(quizId);
    setTimeout(() => setCopiedQuizId((curr) => (curr === quizId ? null : curr)), 2200);
  };

  const subjectTopics = topics.filter((t) => t.subjectId === subject.id);
  const subjectTopicIds = new Set(subjectTopics.map((t) => t.id));

  // Quizzes belonging to this subject that do not belong to a valid topic (Direct/General Quizzes)
  const directQuizzes = quizzes.filter(
    (q) =>
      q.subjectId === subject.id &&
      (!q.topicId ||
        q.topicId.trim() === '' ||
        q.topicId === 'topic_default' ||
        q.topicId === 'general' ||
        !subjectTopicIds.has(q.topicId))
  );

  const allSubjectQuizzes = quizzes.filter((q) => q.subjectId === subject.id);
  const totalQuestions = allSubjectQuizzes.reduce(
    (acc, q) => acc + (q.questions?.length || 0),
    0
  );

  const filteredTopics = subjectTopics.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredDirectQuizzes = directQuizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  const hasAnyItems = subjectTopics.length > 0 || directQuizzes.length > 0;
  const hasMatchingItems = filteredTopics.length > 0 || filteredDirectQuizzes.length > 0;

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      {/* Top Bar: Back + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <button
          onClick={onBackToSubjects}
          className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors self-start cursor-pointer"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t('back')}</span>
        </button>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchTopicsPlaceholder')}
            className={`w-full min-h-[40px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 ${
              isArabic ? 'pr-9 pl-3.5' : 'pl-9 pr-3.5'
            } text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors`}
          />
          <Search
            className={`w-4 h-4 text-zinc-400 absolute ${
              isArabic ? 'right-3' : 'left-3'
            } top-1/2 -translate-y-1/2 pointer-events-none`}
          />
        </div>
      </div>

      {/* Subject Summary Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 mb-8 text-start">
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 block mb-1">
          {t('courseBadge')}
        </span>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          {subject.name}
        </h1>

        {subject.description && (
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed mb-4">
            {subject.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {subjectTopics.length > 0 && (
            <>
              <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t('topicsCountBadge', { count: subjectTopics.length })}</span>
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
            </>
          )}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {t('quizzesCountBadge', { count: allSubjectQuizzes.length })}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>{t('questionsCountBadge', { count: totalQuestions })}</span>
        </div>
      </div>

      {/* 1. Direct Quizzes */}
      {filteredDirectQuizzes.length > 0 && (
        <section className="space-y-3.5 mb-10">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <FileQuestion className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h2 className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {t('directQuizzesHeader', { count: filteredDirectQuizzes.length })}
            </h2>
          </div>

          <div className="space-y-3">
            {filteredDirectQuizzes.map((quiz) => {
              const mcqCount = quiz.questions.filter((q) => q.type !== 'written').length;
              const writtenCount = quiz.questions.filter((q) => q.type === 'written').length;

              return (
                <div
                  key={quiz.id}
                  onClick={() => onStartQuiz(quiz)}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-2xl p-4 sm:p-5 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0 text-start">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 block">
                      {t('generalQuizBadge')}
                    </span>

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

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
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
        </section>
      )}

      {/* 2. Topics List */}
      {subjectTopics.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <BookOpen className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h2 className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {t('topicsListHeader', { count: filteredTopics.length })}
            </h2>
          </div>

          {filteredTopics.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-2">
                <Search className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('noMatchingTopicsOrQuizzes')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTopics.map((topic, index) => {
                const topicQuizzes = quizzes.filter((q) => q.topicId === topic.id);
                const totalTopicQuestions = topicQuizzes.reduce(
                  (acc, q) => acc + (q.questions?.length || 0),
                  0
                );

                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => onSelectTopic(topic)}
                    className="group w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-2xl p-4 sm:p-5 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-start"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {index + 1}
                      </span>

                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {topic.title}
                        </h3>
                        {topic.description && (
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                            {topic.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800 w-full sm:w-auto">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {t('quizzesCountBadge', { count: topicQuizzes.length })}
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-700">·</span>
                        <span>{t('questionsCountBadge', { count: totalTopicQuestions })}</span>
                      </div>

                      <ArrowIcon className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Empty States */}
      {!hasAnyItems && (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {t('noTopicsOrQuizzesAvailable')}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('noTopicsOrQuizzesDesc')}
          </p>
        </div>
      )}

      {hasAnyItems && !hasMatchingItems && (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {t('noMatchingTopicsOrQuizzes')}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('tryDifferentKeywords')}
          </p>
        </div>
      )}
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

