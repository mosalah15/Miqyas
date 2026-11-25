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


