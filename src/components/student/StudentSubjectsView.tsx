import React, { useState, useMemo } from 'react';
import { Subject, Topic, Quiz } from '../../types';
import {
  Search,
  BookOpen,
  Stethoscope,
  Code2,
  Globe2,
  Dna,
  Layers,
  ArrowRight,
  ArrowLeft,
  Play,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useResumableQuizzes } from '../../hooks/useResumableQuizzes';
import { ResumeBanner } from '../ResumeBanner';
import { buttonClass } from '../ui/Button';

interface StudentSubjectsViewProps {
  subjects: Subject[];
  topics: Topic[];
  quizzes: Quiz[];
  onSelectSubject: (subject: Subject) => void;
  onSelectTopic?: (topic: Topic) => void;
  onStartQuiz?: (quiz: Quiz) => void;
}

const SUBJECT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Stethoscope,
  Code2,
  Globe2,
  Dna,
};

const SubjectIcon: React.FC<{ name: string }> = ({ name }) => {
  const Icon = SUBJECT_ICONS[name] || BookOpen;
  return <Icon className="w-5 h-5" />;
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 pb-2 mb-3 border-b border-zinc-200 dark:border-zinc-800">
    {children}
  </h2>
);

export const StudentSubjectsView: React.FC<StudentSubjectsViewProps> = ({
  subjects,
  topics,
  quizzes,
  onSelectSubject,
  onSelectTopic,
  onStartQuiz,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { t, isArabic } = useLanguage();
  const { items: resumable, discard } = useResumableQuizzes(quizzes);

  const query = searchTerm.trim().toLowerCase();
  const matches = (title: string, description?: string) =>
    title.toLowerCase().includes(query) || Boolean(description && description.toLowerCase().includes(query));

  const filteredSubjects = useMemo(
    () => subjects.filter((s) => matches(s.name, s.description)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subjects, query]
  );
  const matchingTopics = useMemo(
    () => (query ? topics.filter((tp) => matches(tp.title, tp.description)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topics, query]
  );
  const matchingQuizzes = useMemo(
    () => (query ? quizzes.filter((q) => matches(q.title, q.description)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quizzes, query]
  );

  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;
  const hasAnyMatch = filteredSubjects.length > 0 || matchingTopics.length > 0 || matchingQuizzes.length > 0;

  const rowClass =
    'group w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-600/60 dark:hover:border-blue-500/60 rounded-xl p-4 flex items-center justify-between gap-3 text-start transition-colors cursor-pointer';

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-8">
      {/* العنوان + البحث */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t('selectCourse')}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('browseCoursesSubtitle')}</p>
        </div>

        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="w-4 h-4 text-zinc-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isArabic ? 'ابحث عن مقرر أو اختبار' : 'Search courses or quizzes'}
            aria-label={isArabic ? 'بحث' : 'Search'}
            className="w-full min-h-[44px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 ps-9 pe-9 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors [&::-webkit-search-cancel-button]:hidden"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              aria-label={isArabic ? 'مسح البحث' : 'Clear search'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* اختبارات غير مكتملة */}
      {!query && onStartQuiz && (
        <ResumeBanner items={resumable} onDiscard={discard} onResume={(item) => onStartQuiz(item.quiz)} />
      )}

      {/* نتائج البحث: الاختبارات والموضوعات */}
      {query && matchingQuizzes.length > 0 && onStartQuiz && (
        <section>
          <SectionTitle>
            {isArabic ? `اختبارات (${matchingQuizzes.length})` : `Quizzes (${matchingQuizzes.length})`}
          </SectionTitle>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matchingQuizzes.slice(0, 8).map((quiz) => {
              const sub = subjects.find((s) => s.id === quiz.subjectId);
              const top = topics.find((tp) => tp.id === quiz.topicId);
              return (
                <li key={quiz.id}>
                  <button type="button" onClick={() => onStartQuiz(quiz)} className={rowClass}>
                    <div className="min-w-0">
                      <span className="text-xs text-blue-600 dark:text-blue-400 block truncate">
                        {[sub?.name, top?.title].filter(Boolean).join(' / ')}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                        {quiz.title}
                      </h3>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {t('questionsCount', { count: quiz.questions.length })}
                      </span>
                    </div>
                    <span className={buttonClass('primary', 'sm', 'shrink-0')}>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t('startQuizButton')}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {query && matchingTopics.length > 0 && onSelectTopic && (
        <section>
          <SectionTitle>
            {isArabic ? `موضوعات (${matchingTopics.length})` : `Topics (${matchingTopics.length})`}
          </SectionTitle>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matchingTopics.slice(0, 8).map((tp) => {
              const sub = subjects.find((s) => s.id === tp.subjectId);
              const count = quizzes.filter((q) => q.topicId === tp.id).length;
              return (
                <li key={tp.id}>
                  <button type="button" onClick={() => onSelectTopic(tp)} className={rowClass}>
                    <div className="min-w-0">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 block truncate">
                        {sub?.name || ''}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                        {tp.title}
                      </h3>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {t('quizzesCountBadge', { count })}
                      </span>
                    </div>
                    <ArrowIcon className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* المقررات */}
      {subjects.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-5 h-5" />} title={t('noCoursesAvailable')} body={t('noCoursesDesc')} />
      ) : query && !hasAnyMatch ? (
        <EmptyState
          icon={<Search className="w-5 h-5" />}
          title={isArabic ? 'لا توجد نتائج مطابقة' : t('noMatchingCourses')}
          body={t('tryDifferentKeywords')}
        />
      ) : filteredSubjects.length > 0 ? (
        <section>
          {query && (
            <SectionTitle>
              {isArabic ? `مقررات (${filteredSubjects.length})` : `Courses (${filteredSubjects.length})`}
            </SectionTitle>
          )}
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((subject) => {
              const topicsCount = topics.filter((tp) => tp.subjectId === subject.id).length;
              const subjectQuizzes = quizzes.filter((q) => q.subjectId === subject.id);
              const questionsCount = subjectQuizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0);

              return (
                <li key={subject.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSubject(subject)}
                    className="group h-full w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-600/60 dark:hover:border-blue-500/60 rounded-xl p-5 flex flex-col justify-between gap-5 text-start transition-colors cursor-pointer"
                  >
                    <div className="space-y-2">
                      <span className="inline-flex w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 items-center justify-center">
                        <SubjectIcon name={subject.icon} />
                      </span>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {subject.name}
                      </h3>
                      {subject.description && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-7 line-clamp-2">
                          {subject.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 tabular-nums pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <Layers className="w-4 h-4 shrink-0" />
                      <span>
                        {isArabic
                          ? `${topicsCount} موضوع · ${subjectQuizzes.length} اختبار · ${questionsCount} سؤال`
                          : `${topicsCount} topics · ${subjectQuizzes.length} quizzes · ${questionsCount} questions`}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="text-center py-16 px-6 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
    <div className="w-11 h-11 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-3">
      {icon}
    </div>
    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{title}</h2>
    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">{body}</p>
  </div>
);

