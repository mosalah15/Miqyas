import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTeacherSession } from './hooks/useTeacherSession';
import { subscribeToTeachers, addTeacherByEmail, removeTeacher, backfillQuizPublishFlags } from './services/teacherService';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Subject, Topic, Quiz, AIWrittenGradingResult, Question, TeacherUser } from './types';
import {
  getSubjects,
  getTopics,
  getQuizzes,
  saveSubjects,
  clearQuizProgress,
  saveTopics,
  saveQuizzes,
} from './utils/storage';
import {
  subscribeToSubjects,
  subscribeToTopics,
  subscribeToQuizzes,
  saveSubjectToCloud,
  deleteSubjectFromCloud,
  saveTopicToCloud,
  deleteTopicFromCloud,
  saveQuizToCloud,
  deleteQuizFromCloud,
  seedInitialCloudDataIfNeeded,
  fetchSubjectByIdFromCloud,
  fetchTopicByIdFromCloud,
} from './services/firestoreService';
import { Navbar } from './components/Navbar';
import { CloudLoadingState } from './components/CloudLoadingState';
import { StudentSubjectsView } from './components/student/StudentSubjectsView';
import { StudentTopicsView } from './components/student/StudentTopicsView';
import { StudentQuizzesView } from './components/student/StudentQuizzesView';
import { QuizRunnerRoute } from './components/student/QuizRunnerRoute';
import { QuizResultsRoute } from './components/student/QuizResultsRoute';
import { QuizRunner } from './components/student/QuizRunner';
import { QuizResults } from './components/student/QuizResults';
import { StudentDashboard } from './components/student/StudentDashboard';
import { HomeView } from './components/HomeView';
import { TeacherLogin } from './components/teacher/TeacherLogin';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { StudentAuthProvider, useStudentAuth, QuizResultPayload } from './context/StudentAuthContext';

function SubjectViewRoute({
  subjects,
  topics,
  quizzes,
  isSubjectsLoaded,
  selectedSubject,
  onSelectSubject,
  onSubjectLoaded,
  onSelectTopic,
  onStartQuiz,
}: {
  subjects: Subject[];
  topics: Topic[];
  quizzes: Quiz[];
  isSubjectsLoaded: boolean;
  selectedSubject: Subject | null;
  onSelectSubject: (s: Subject) => void;
  onSubjectLoaded: (s: Subject) => void;
  onSelectTopic: (t: Topic) => void;
  onStartQuiz: (q: Quiz, custom?: { limit?: number; qType?: 'all' | 'mcq' | 'written' }) => void;
}) {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const [directSubject, setDirectSubject] = useState<Subject | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = useState(false);
  const [fetchedForId, setFetchedForId] = useState<string | null>(null);

  const currentSubject =
    (selectedSubject && selectedSubject.id === subjectId ? selectedSubject : null) ||
    subjects.find((s) => s.id === subjectId) ||
    (directSubject && directSubject.id === subjectId ? directSubject : null);

  useEffect(() => {
    if (!subjectId || currentSubject || fetchedForId === subjectId) return;

    let cancelled = false;
    setIsFetchingDirect(true);

    fetchSubjectByIdFromCloud(subjectId)
      .then((cloudSubject) => {
        if (cancelled) return;
        setFetchedForId(subjectId);
        if (cloudSubject) {
          setDirectSubject(cloudSubject);
          onSubjectLoaded(cloudSubject);
          onSelectSubject(cloudSubject);
        }
      })
      .finally(() => {
        if (!cancelled) setIsFetchingDirect(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subjectId, currentSubject, fetchedForId, onSubjectLoaded, onSelectSubject]);

  useEffect(() => {
    if (currentSubject && (!selectedSubject || selectedSubject.id !== currentSubject.id)) {
      onSelectSubject(currentSubject);
    }
  }, [currentSubject, selectedSubject, onSelectSubject]);

  if (!currentSubject) {
    const stillLoading = !isSubjectsLoaded || isFetchingDirect || fetchedForId !== subjectId;
    return (
      <>
        <Navbar
          viewMode="student_topics"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
          onBackToSubjects={() => navigate('/courses')}
          onBackToTopics={() => {}}
        />
        <CloudLoadingState
          status={stillLoading ? 'loading' : 'not-found'}
          title={
            stillLoading
              ? isArabic
                ? 'جاري تحميل المساق...'
                : 'Loading Course...'
              : isArabic
              ? 'المساق غير موجود'
              : 'Course Not Found'
          }
          onBackHome={() => navigate('/courses')}
        />
      </>
    );
  }

  return (
    <>
      <Navbar
        viewMode="student_topics"
        onNavigate={() => {}}
        selectedSubject={currentSubject}
        selectedTopic={null}
        selectedQuiz={null}
        onBackToSubjects={() => navigate('/courses')}
        onBackToTopics={() => {}}
      />
      <main className="flex-1">
        <StudentTopicsView
          subject={currentSubject}
          topics={topics}
          quizzes={quizzes}
          onSelectTopic={onSelectTopic}
          onStartQuiz={(quiz, custom) => {
            onSelectSubject(currentSubject);
            onStartQuiz(quiz, custom);
          }}
          onBackToSubjects={() => navigate('/courses')}
        />
      </main>
    </>
  );
}

function TopicViewRoute({
  subjects,
  topics,
  quizzes,
  isSubjectsLoaded,
  isTopicsLoaded,
  selectedSubject,
  selectedTopic,
  onSelectSubject,
  onSelectTopic,
  onSubjectLoaded,
  onTopicLoaded,
  onStartQuiz,
}: {
  subjects: Subject[];
  topics: Topic[];
  quizzes: Quiz[];
  isSubjectsLoaded: boolean;
  isTopicsLoaded: boolean;
  selectedSubject: Subject | null;
  selectedTopic: Topic | null;
  onSelectSubject: (s: Subject) => void;
  onSelectTopic: (t: Topic) => void;
  onSubjectLoaded: (s: Subject) => void;
  onTopicLoaded: (t: Topic) => void;
  onStartQuiz: (q: Quiz, custom?: { limit?: number; qType?: 'all' | 'mcq' | 'written' }) => void;
}) {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const [directTopic, setDirectTopic] = useState<Topic | null>(null);
  const [directSubject, setDirectSubject] = useState<Subject | null>(null);
  const [isFetchingDirect, setIsFetchingDirect] = useState(false);
  const [fetchedForId, setFetchedForId] = useState<string | null>(null);

  const currentTopic =
    (selectedTopic && selectedTopic.id === topicId ? selectedTopic : null) ||
    topics.find((t) => t.id === topicId) ||
    (directTopic && directTopic.id === topicId ? directTopic : null);

  const currentSubject =
    (selectedSubject && (!currentTopic || selectedSubject.id === currentTopic.subjectId)
      ? selectedSubject
      : null) ||
    (currentTopic ? subjects.find((s) => s.id === currentTopic.subjectId) || null : null) ||
    (directSubject && currentTopic && directSubject.id === currentTopic.subjectId ? directSubject : null);

  useEffect(() => {
    if (!topicId) return;
    if (currentTopic && currentSubject) return;
    if (fetchedForId === topicId && !currentTopic) return;

    let cancelled = false;
    setIsFetchingDirect(true);

    (async () => {
      try {
        let resolvedTopic = currentTopic;
        if (!resolvedTopic && fetchedForId !== topicId) {
          resolvedTopic = await fetchTopicByIdFromCloud(topicId);
          if (cancelled) return;
          setFetchedForId(topicId);
          if (resolvedTopic) {
            setDirectTopic(resolvedTopic);
            onTopicLoaded(resolvedTopic);
            onSelectTopic(resolvedTopic);
          }
        }

        if (resolvedTopic && !currentSubject) {
          const resolvedSubject = await fetchSubjectByIdFromCloud(resolvedTopic.subjectId);
          if (cancelled) return;
          if (resolvedSubject) {
            setDirectSubject(resolvedSubject);
            onSubjectLoaded(resolvedSubject);
            onSelectSubject(resolvedSubject);
          }
        }
      } finally {
        if (!cancelled) {
          setFetchedForId(topicId);
          setIsFetchingDirect(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [topicId, currentTopic, currentSubject, fetchedForId, onTopicLoaded, onSubjectLoaded, onSelectTopic, onSelectSubject]);

  useEffect(() => {
    if (currentTopic && (!selectedTopic || selectedTopic.id !== currentTopic.id)) {
      onSelectTopic(currentTopic);
    }
    if (currentSubject && (!selectedSubject || selectedSubject.id !== currentSubject.id)) {
      onSelectSubject(currentSubject);
    }
  }, [currentTopic, currentSubject, selectedTopic, selectedSubject, onSelectTopic, onSelectSubject]);

  if (!currentTopic || !currentSubject) {
    const stillLoading =
      !isTopicsLoaded || !isSubjectsLoaded || isFetchingDirect || fetchedForId !== topicId;
    return (
      <>
        <Navbar
          viewMode="student_quizzes"
          onNavigate={() => {}}
          selectedSubject={currentSubject}
          selectedTopic={currentTopic}
          selectedQuiz={null}
          onBackToSubjects={() => navigate('/courses')}
          onBackToTopics={() => (currentSubject ? navigate(`/subject/${currentSubject.id}`) : navigate('/courses'))}
        />
        <CloudLoadingState
          status={stillLoading ? 'loading' : 'not-found'}
          title={
            stillLoading
              ? isArabic
                ? 'جاري تحميل الموضوع والاختبارات...'
                : 'Loading Topic & Quizzes...'
              : isArabic
              ? 'الموضوع غير موجود'
              : 'Topic Not Found'
          }
          onBackHome={() => navigate('/courses')}
        />
      </>
    );
  }

  return (
    <>
      <Navbar
        viewMode="student_quizzes"
        onNavigate={() => {}}
        selectedSubject={currentSubject}
        selectedTopic={currentTopic}
        selectedQuiz={null}
        onBackToSubjects={() => navigate('/courses')}
        onBackToTopics={() => navigate(`/subject/${currentSubject.id}`)}
      />
      <main className="flex-1">
        <StudentQuizzesView
          subject={currentSubject}
          topic={currentTopic}
          quizzes={quizzes}
          onStartQuiz={(quiz, custom) => {
            onSelectSubject(currentSubject);
            onSelectTopic(currentTopic);
            onStartQuiz(quiz, custom);
          }}
          onBackToTopics={() => navigate(`/subject/${currentSubject.id}`)}
        />
      </main>
    </>
  );
}

function PrivateQuizRunnerRoute() {
  const { privateQuizId } = useParams<{ privateQuizId: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const {
    studentUser,
    authLoading,
    authBusy,
    signInWithGoogle,
    dataLoading,
    privateQuizzes,
    recordQuizCompletion,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
  } = useStudentAuth();

  const [sessionKey, setSessionKey] = useState<number>(() => Date.now());
  const [privateResults, setPrivateResults] = useState<QuizResultPayload | null>(null);

  useEffect(() => {
    setPrivateResults(null);
    setSessionKey(Date.now());
  }, [privateQuizId]);

  const privateQuiz = privateQuizzes.find((pq) => pq.id === privateQuizId) || null;

  if (authLoading || (studentUser && dataLoading && !privateQuiz)) {
    return (
      <>
        <Navbar
          viewMode="student_runner"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <CloudLoadingState
          status="loading"
          title={isArabic ? 'جاري تحميل الاختبار الخاص...' : 'Loading Private Quiz...'}
          onBackHome={() => navigate('/student')}
        />
      </>
    );
  }

  if (!studentUser) {
    return <Navigate to="/student" replace />;
  }

  if (!privateQuiz) {
    return (
      <>
        <Navbar
          viewMode="student_dashboard"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <CloudLoadingState
          status="not-found"
          title={isArabic ? 'الاختبار الخاص غير موجود' : 'Private Quiz Not Found'}
          subtitle={
            isArabic
              ? 'ربما تم حذف هذا الاختبار الخاص من حسابك أو أن الرابط غير صحيح.'
              : 'This private quiz may have been removed from your account or the link is invalid.'
          }
          onBackHome={() => navigate('/student')}
        />
      </>
    );
  }

  const quizAsStandard: Quiz = {
    id: privateQuiz.id,
    subjectId: privateQuiz.subjectId || `private_${privateQuiz.subjectName}`,
    topicId: 'private',
    title: privateQuiz.title,
    description: privateQuiz.description || '',
    questions: privateQuiz.questions,
    createdAt: privateQuiz.createdAt,
    updatedAt: privateQuiz.updatedAt || privateQuiz.createdAt,
    timeLimitMinutes: privateQuiz.timeLimitMinutes,
  };

  if (privateResults) {
    return (
      <>
        <Navbar
          viewMode="student_dashboard"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <main className="flex-1">
          <QuizResults
            quiz={quizAsStandard}
            score={privateResults.score}
            totalMCQs={privateResults.totalMCQs}
            totalWritten={privateResults.totalWritten}
            userAnswers={privateResults.userAnswers}
            writtenInputData={privateResults.writtenInputData}
            writtenGradingData={privateResults.writtenGradingData}
            questions={privateResults.questions}
            timeSpentSeconds={privateResults.timeSpentSeconds}
            onRetake={() => {
              clearQuizProgress(quizAsStandard.id);
              setPrivateResults(null);
              setSessionKey(Date.now());
            }}
            onBackToSubjects={() => navigate('/student')}
            isStudentSignedIn={Boolean(studentUser)}
            isQuestionBookmarked={(q) => isQuestionBookmarked(quizAsStandard.id, q)}
            onToggleBookmark={(q) =>
              toggleBookmarkQuestion({
                quiz: quizAsStandard,
                subjectName: privateQuiz.subjectName,
                question: q,
              })
            }
            onOpenStudentDashboard={() => navigate('/student')}
            onSignInStudent={signInWithGoogle}
            authBusy={authBusy}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar
        viewMode="student_runner"
        onNavigate={() => {}}
        selectedSubject={null}
        selectedTopic={null}
        selectedQuiz={quizAsStandard}
        onBackToTopics={() => navigate('/student')}
      />
      <main className="flex-1">
        <QuizRunner
          key={`${quizAsStandard.id}-${sessionKey}`}
          quiz={quizAsStandard}
          onFinishQuiz={(results) => {
            clearQuizProgress(quizAsStandard.id);
            setPrivateResults(results);
            recordQuizCompletion({
              quiz: quizAsStandard,
              subjectName: privateQuiz.subjectName,
              isPrivateQuiz: true,
              practiceMode: null,
              results,
            }).catch(console.error);
          }}
          onExit={() => navigate('/student')}
          isStudentSignedIn={Boolean(studentUser)}
          isQuestionBookmarked={(q) => isQuestionBookmarked(quizAsStandard.id, q)}
          onToggleBookmark={(q) =>
            toggleBookmarkQuestion({
              quiz: quizAsStandard,
              subjectName: privateQuiz.subjectName,
              question: q,
            })
          }
        />
      </main>
    </>
  );
}

function PracticeQuizRunnerRoute() {
  const { mode } = useParams<{ mode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const {
    studentUser,
    authLoading,
    authBusy,
    signInWithGoogle,
    dataLoading,
    mistakes,
    bookmarks,
    recordQuizCompletion,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
  } = useStudentAuth();

  const subjectFilter = searchParams.get('subject');
  const practiceMode: 'mistakes' | 'bookmarks' | null =
    mode === 'mistakes' ? 'mistakes' : mode === 'bookmarks' ? 'bookmarks' : null;

  const [sessionKey, setSessionKey] = useState<number>(() => Date.now());
  const [practiceResults, setPracticeResults] = useState<QuizResultPayload | null>(null);
  const [lockedQuiz, setLockedQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    setLockedQuiz(null);
    setPracticeResults(null);
    setSessionKey(Date.now());
  }, [practiceMode, subjectFilter]);

  useEffect(() => {
    if (!practiceMode || !studentUser || dataLoading || lockedQuiz) return;

    if (practiceMode === 'mistakes') {
      const items = subjectFilter
        ? mistakes.filter((m) => m.subjectName === subjectFilter)
        : mistakes;
      if (items.length === 0) return;

      const quizId = `practice_mistakes_${subjectFilter || 'all'}`;
      clearQuizProgress(quizId);
      setLockedQuiz({
        id: quizId,
        subjectId: 'practice',
        topicId: 'practice_mistakes',
        title: isArabic
          ? subjectFilter
            ? `تدريب الأخطاء — ${subjectFilter}`
            : 'تدريب بنك الأخطاء'
          : subjectFilter
          ? `Mistakes Practice — ${subjectFilter}`
          : 'Mistakes Bank Practice',
        description: isArabic
          ? 'جلسة مراجعة ذكية للأسئلة التي أخطأت فيها سابقاً.'
          : 'Smart practice session built from your previously missed questions.',
        questions: items.map((m) => ({
          ...m.question,
          id: m.id,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (practiceMode === 'bookmarks') {
      const items = subjectFilter
        ? bookmarks.filter((b) => b.subjectName === subjectFilter)
        : bookmarks;
      if (items.length === 0) return;

      const quizId = `practice_bookmarks_${subjectFilter || 'all'}`;
      clearQuizProgress(quizId);
      setLockedQuiz({
        id: quizId,
        subjectId: 'practice',
        topicId: 'practice_bookmarks',
        title: isArabic
          ? subjectFilter
            ? `تدريب المحفوظات — ${subjectFilter}`
            : 'تدريب الأسئلة المحفوظة'
          : subjectFilter
          ? `Bookmarks Practice — ${subjectFilter}`
          : 'Saved Bookmarks Practice',
        description: isArabic
          ? 'مراجعة تفاعلية لأسئلتك المحفوظة.'
          : 'Interactive practice session built from your saved questions.',
        questions: items.map((b) => ({
          ...b.question,
          id: b.question.id || b.id,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [practiceMode, studentUser, dataLoading, lockedQuiz, mistakes, bookmarks, subjectFilter, isArabic]);

  if (!practiceMode) {
    return <Navigate to="/student" replace />;
  }

  if (authLoading || (studentUser && dataLoading && !lockedQuiz && !practiceResults)) {
    return (
      <>
        <Navbar
          viewMode="student_runner"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <CloudLoadingState
          status="loading"
          title={isArabic ? 'جاري تجهيز جلسة التدريب...' : 'Preparing Practice Session...'}
          onBackHome={() => navigate('/student')}
        />
      </>
    );
  }

  if (!studentUser) {
    return <Navigate to="/student" replace />;
  }

  if (practiceResults && lockedQuiz) {
    return (
      <>
        <Navbar
          viewMode="student_dashboard"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <main className="flex-1">
          <QuizResults
            quiz={lockedQuiz}
            score={practiceResults.score}
            totalMCQs={practiceResults.totalMCQs}
            totalWritten={practiceResults.totalWritten}
            userAnswers={practiceResults.userAnswers}
            writtenInputData={practiceResults.writtenInputData}
            writtenGradingData={practiceResults.writtenGradingData}
            questions={practiceResults.questions}
            timeSpentSeconds={practiceResults.timeSpentSeconds}
            onRetake={() => {
              clearQuizProgress(lockedQuiz.id);
              setPracticeResults(null);
              setLockedQuiz(null);
              setSessionKey(Date.now());
            }}
            onBackToSubjects={() => navigate('/student')}
            isStudentSignedIn={Boolean(studentUser)}
            isQuestionBookmarked={(q) => isQuestionBookmarked(lockedQuiz.id, q)}
            onToggleBookmark={(q) =>
              toggleBookmarkQuestion({
                quiz: lockedQuiz,
                subjectName: subjectFilter || (isArabic ? 'عام' : 'General'),
                question: q,
              })
            }
            onOpenStudentDashboard={() => navigate('/student')}
            onSignInStudent={signInWithGoogle}
            authBusy={authBusy}
          />
        </main>
      </>
    );
  }

  if (!lockedQuiz) {
    return (
      <>
        <Navbar
          viewMode="student_dashboard"
          onNavigate={() => {}}
          selectedSubject={null}
          selectedTopic={null}
          selectedQuiz={null}
        />
        <CloudLoadingState
          status="not-found"
          title={
            practiceMode === 'mistakes'
              ? isArabic
                ? 'لا توجد أخطاء للتدريب عليها حالياً'
                : 'No Mistakes to Practice'
              : isArabic
              ? 'لا توجد أسئلة محفوظة للتدريب'
              : 'No Bookmarks to Practice'
          }
          subtitle={
            isArabic
              ? 'عد إلى لوحة الطالب لاختيار اختبار أو قسم آخر.'
              : 'Return to Student Hub to choose another quiz or section.'
          }
          onBackHome={() => navigate('/student')}
        />
      </>
    );
  }

  return (
    <>
      <Navbar
        viewMode="student_runner"
        onNavigate={() => {}}
        selectedSubject={null}
        selectedTopic={null}
        selectedQuiz={lockedQuiz}
        onBackToTopics={() => navigate('/student')}
      />
      <main className="flex-1">
        <QuizRunner
          key={`${lockedQuiz.id}-${sessionKey}`}
          quiz={lockedQuiz}
          onFinishQuiz={(results) => {
            clearQuizProgress(lockedQuiz.id);
            setPracticeResults(results);
            recordQuizCompletion({
              quiz: lockedQuiz,
              subjectName: subjectFilter || (isArabic ? 'عام' : 'General'),
              isPrivateQuiz: true,
              practiceMode,
              results,
            }).catch(console.error);
          }}
          onExit={() => navigate('/student')}
          isStudentSignedIn={Boolean(studentUser)}
          isQuestionBookmarked={(q) => isQuestionBookmarked(lockedQuiz.id, q)}
          onToggleBookmark={(q) =>
            toggleBookmarkQuestion({
              quiz: lockedQuiz,
              subjectName: subjectFilter || (isArabic ? 'عام' : 'General'),
              question: q,
            })
          }
        />
      </main>
    </>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const { recordQuizCompletion } = useStudentAuth();

  // Teacher authentication state
  const teacherSession = useTeacherSession();
  const currentTeacher = teacherSession.teacher;
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);

  // قائمة المعلمين تُقرأ من Firestore، والقواعد تسمح بها للمدير فقط
  useEffect(() => {
    if (currentTeacher?.role !== 'admin') {
      setTeachers([]);
      return;
    }
    return subscribeToTeachers(setTeachers, (err) => console.warn('Teachers list unavailable:', err));
  }, [currentTeacher?.role]);

  // Persistence states
  const [subjects, setSubjects] = useState<Subject[]>(() => getSubjects());
  const [topics, setTopics] = useState<Topic[]>(() => getTopics());
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => getQuizzes());

  // Cloud sync readiness flags (prevents deep links from redirecting before Firestore loads)
  const [subjectsLoaded, setSubjectsLoaded] = useState<boolean>(false);
  const [topicsLoaded, setTopicsLoaded] = useState<boolean>(false);
  const [quizzesLoaded, setQuizzesLoaded] = useState<boolean>(false);
  const hasAttemptedSeedRef = useRef<boolean>(false);

  // Navigation states
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  // Active quiz results state
  const [quizResults, setQuizResults] = useState<{
    score: number;
    totalMCQs: number;
    totalWritten: number;
    userAnswers: Record<string, string>;
    writtenInputData: Record<string, string>;
    writtenGradingData: Record<string, AIWrittenGradingResult>;
    questions: Question[];
    timeSpentSeconds: number;
  } | null>(null);

  // Upsert helpers for direct single-doc deep links
  const handleSubjectLoadedFromDeepLink = useCallback((loaded: Subject) => {
    setSubjects((prev) => (prev.some((s) => s.id === loaded.id) ? prev : [...prev, loaded]));
  }, []);

  const handleTopicLoadedFromDeepLink = useCallback((loaded: Topic) => {
    setTopics((prev) => (prev.some((t) => t.id === loaded.id) ? prev : [...prev, loaded]));
  }, []);

  const handleQuizLoadedFromDeepLink = useCallback((loaded: Quiz) => {
    setQuizzes((prev) => (prev.some((q) => q.id === loaded.id) ? prev : [loaded, ...prev]));
  }, []);

  // Real-time synchronization with Firestore Cloud Database
  // المسودات تظهر للمعلم المصرح له فقط؛ الطالب يسمع المنشور فقط.
  // عند تغيّر حالة المعلم (دخول/خروج) نعيد الاشتراك بالنطاق الصحيح.
  const canSeeDrafts = teacherSession.status === 'ready';
  useEffect(() => {
    const unsubQuizzes = subscribeToQuizzes(
      (cloudQuizzes) => {
        setQuizzesLoaded(true);
        setQuizzes(cloudQuizzes); // نستبدل القائمة كاملة حتى تختفي المسودات عند الخروج
      },
      () => {
        setQuizzesLoaded(true);
      },
      canSeeDrafts
    );
    return () => unsubQuizzes();
  }, [canSeeDrafts]);

  // ترحيل لمرة واحدة: الاختبارات القديمة بدون حقل isPublished تُعتبر منشورة
  const publishFlagsBackfilledRef = useRef(false);
  useEffect(() => {
    if (teacherSession.status !== 'ready' || publishFlagsBackfilledRef.current) return;
    publishFlagsBackfilledRef.current = true;
    backfillQuizPublishFlags().catch((err) =>
      console.warn('Publish-flag backfill skipped:', err)
    );
  }, [teacherSession.status, currentTeacher?.role]);

  useEffect(() => {
    // Safety timeout so offline/blocked networks never stall loading screens indefinitely
    const safetyTimer = setTimeout(() => {
      setSubjectsLoaded(true);
      setTopicsLoaded(true);
      setQuizzesLoaded(true);
    }, 8000);

    // Subscribe to subjects in real-time (and seed only if cloud is empty)
    const unsubSubjects = subscribeToSubjects(
      (cloudSubjects) => {
        setSubjectsLoaded(true);
        if (cloudSubjects && cloudSubjects.length > 0) {
          setSubjects(cloudSubjects);
        } else if (!hasAttemptedSeedRef.current) {
          hasAttemptedSeedRef.current = true;
          seedInitialCloudDataIfNeeded(getSubjects(), getTopics(), getQuizzes()).catch(console.error);
        }
      },
      () => {
        setSubjectsLoaded(true);
      }
    );

    // Subscribe to topics in real-time
    const unsubTopics = subscribeToTopics(
      (cloudTopics) => {
        setTopicsLoaded(true);
        if (cloudTopics && cloudTopics.length > 0) {
          setTopics(cloudTopics);
        }
      },
      () => {
        setTopicsLoaded(true);
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      unsubSubjects();
      unsubTopics();
      
    };
  }, []);

  // Auto-sync local storage as cache / offline fallback
  useEffect(() => {
    saveSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    saveTopics(topics);
  }, [topics]);

  useEffect(() => {
    saveQuizzes(quizzes);
  }, [quizzes]);

  // Teacher Account Management Handlers
  const handleAddTeacher = async (teacherData: { email: string; displayName: string }): Promise<void> => {
    if (!currentTeacher) return;
    await addTeacherByEmail({ ...teacherData, addedBy: currentTeacher.username });
  };

  const handleDeleteTeacher = async (teacherId: string): Promise<void> => {
    await removeTeacher(teacherId);
  };

  // Subject Handlers
  const handleSaveSubject = (newOrUpdatedSubject: Subject) => {
    setSubjects((prev) => {
      const idx = prev.findIndex((s) => s.id === newOrUpdatedSubject.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newOrUpdatedSubject;
        return next;
      }
      return [...prev, newOrUpdatedSubject];
    });
    // Persist to Cloud Firestore
    saveSubjectToCloud(newOrUpdatedSubject).catch(console.error);
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    setTopics((prev) => prev.filter((t) => t.subjectId !== subjectId));
    setQuizzes((prev) => prev.filter((q) => q.subjectId !== subjectId));
    // Remove from Cloud Firestore
    deleteSubjectFromCloud(subjectId).catch(console.error);
  };

  // Topic Handlers
  const handleSaveTopic = (newOrUpdatedTopic: Topic) => {
    setTopics((prev) => {
      const idx = prev.findIndex((t) => t.id === newOrUpdatedTopic.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newOrUpdatedTopic;
        return next;
      }
      return [...prev, newOrUpdatedTopic];
    });
    // Persist to Cloud Firestore
    saveTopicToCloud(newOrUpdatedTopic).catch(console.error);
  };

  const handleDeleteTopic = (topicId: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    setQuizzes((prev) => prev.filter((q) => q.topicId !== topicId));
    // Remove from Cloud Firestore
    deleteTopicFromCloud(topicId).catch(console.error);
  };

  // Quiz Handlers
  const handleSaveQuiz = (newOrUpdatedQuiz: Quiz) => {
    setQuizzes((prev) => {
      const idx = prev.findIndex((q) => q.id === newOrUpdatedQuiz.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newOrUpdatedQuiz;
        return next;
      }
      return [newOrUpdatedQuiz, ...prev];
    });
    // Persist to Cloud Firestore
    saveQuizToCloud(newOrUpdatedQuiz).catch(console.error);
  };

  const handleDeleteQuiz = (quizId: string) => {
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    // Remove from Cloud Firestore
    deleteQuizFromCloud(quizId).catch(console.error);
  };

  // Student Navigation Flows
  const handleStudentSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedTopic(null);
    navigate(`/subject/${subject.id}`);
  };

  const handleStudentSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    navigate(`/topic/${topic.id}`);
  };

  const handleStartQuiz = (quiz: Quiz, custom?: { limit?: number; qType?: 'all' | 'mcq' | 'written' }) => {
    setActiveQuiz(quiz);
    setQuizResults(null);
    if (custom?.limit || (custom?.qType && custom.qType !== 'all')) {
      clearQuizProgress(quiz.id);
      const params = new URLSearchParams();
      if (custom.limit) params.set('limit', String(custom.limit));
      if (custom.qType && custom.qType !== 'all') params.set('qtype', custom.qType);
      navigate(`/quiz/${quiz.id}?${params.toString()}`);
    } else {
      navigate(`/quiz/${quiz.id}`);
    }
  };

  const handleFinishQuiz = (results: {
    score: number;
    totalMCQs: number;
    totalWritten: number;
    userAnswers: Record<string, string>;
    writtenInputData: Record<string, string>;
    writtenGradingData: Record<string, AIWrittenGradingResult>;
    questions: Question[];
    timeSpentSeconds: number;
  }) => {
    if (activeQuiz) {
      clearQuizProgress(activeQuiz.id);
      const matchedSubject =
        (selectedSubject && selectedSubject.id === activeQuiz.subjectId ? selectedSubject : null) ||
        subjects.find((s) => s.id === activeQuiz.subjectId) ||
        null;
      recordQuizCompletion({
        quiz: activeQuiz,
        subjectName: matchedSubject?.name || (isArabic ? 'عام' : 'General'),
        isPrivateQuiz: false,
        practiceMode: null,
        results,
      }).catch(console.error);
    }
    setQuizResults(results);
    navigate(`/quiz/${activeQuiz?.id}/results`);
  };

  const handleRetakeQuiz = (quizToRetake: Quiz) => {
    clearQuizProgress(quizToRetake.id);
    setActiveQuiz(quizToRetake);
    setQuizResults(null);
    navigate(`/quiz/${quizToRetake.id}`);
  };

  const handleTeacherLogout = async () => {
    await teacherSession.signOutTeacher();
    navigate('/');
  };

  const publicQuizzes = React.useMemo(
    () => quizzes.filter((q) => q.isPublished !== false),
    [quizzes]
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors duration-200" dir={isArabic ? 'rtl' : 'ltr'}>
      <Routes>
        {/* Home Landing Gateway */}
        <Route path="/" element={
          <>
            <Navbar viewMode="student_home" onNavigate={() => {}} selectedSubject={null} selectedTopic={null} selectedQuiz={null} onBackToSubjects={() => navigate('/courses')} onBackToTopics={() => {}} />
            <main className="flex-1">
              <HomeView
                subjects={subjects}
                topics={topics}
                quizzes={publicQuizzes}
                onSelectSubject={handleStudentSelectSubject}
                onStartQuiz={(quiz) => {
                  const matchedSub = subjects.find((s) => s.id === quiz.subjectId);
                  const matchedTop = topics.find((t) => t.id === quiz.topicId);
                  if (matchedSub) setSelectedSubject(matchedSub);
                  if (matchedTop) setSelectedTopic(matchedTop);
                  handleStartQuiz(quiz);
                }}
              />
            </main>
          </>
        } />

        {/* Browse All Courses & Quizzes (No Sign-In Required) */}
        <Route path="/courses" element={
          <>
            <Navbar viewMode="student_subjects" onNavigate={() => {}} selectedSubject={null} selectedTopic={null} selectedQuiz={null} onBackToSubjects={() => navigate('/')} onBackToTopics={() => {}} />
            <main className="flex-1">
              <StudentSubjectsView
                subjects={subjects}
                topics={topics}
                quizzes={publicQuizzes}
                onSelectSubject={handleStudentSelectSubject}
                onSelectTopic={(topic) => {
                  const matchedSub = subjects.find((s) => s.id === topic.subjectId);
                  if (matchedSub) setSelectedSubject(matchedSub);
                  handleStudentSelectTopic(topic);
                }}
                onStartQuiz={(quiz) => {
                  const matchedSub = subjects.find((s) => s.id === quiz.subjectId);
                  const matchedTop = topics.find((t) => t.id === quiz.topicId);
                  if (matchedSub) setSelectedSubject(matchedSub);
                  if (matchedTop) setSelectedTopic(matchedTop);
                  handleStartQuiz(quiz);
                }}
              />
            </main>
          </>
        } />

        {/* Student Hub & Private / Practice Routes */}
        <Route path="/student" element={
          <>
            <Navbar
              viewMode="student_dashboard"
              onNavigate={() => {}}
              selectedSubject={null}
              selectedTopic={null}
              selectedQuiz={null}
              onBackToSubjects={() => navigate('/')}
              onBackToTopics={() => {}}
            />
            <main className="flex-1">
              <StudentDashboard subjects={subjects} publicQuizzes={publicQuizzes} />
            </main>
          </>
        } />

        <Route path="/student/quiz/:privateQuizId" element={<PrivateQuizRunnerRoute />} />
        <Route path="/student/practice/:mode" element={<PracticeQuizRunnerRoute />} />

        <Route path="/subject/:subjectId" element={
          <SubjectViewRoute
            subjects={subjects}
            topics={topics}
            quizzes={publicQuizzes}
            isSubjectsLoaded={subjectsLoaded}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
            onSubjectLoaded={handleSubjectLoadedFromDeepLink}
            onSelectTopic={handleStudentSelectTopic}
            onStartQuiz={handleStartQuiz}
          />
        } />

        <Route path="/topic/:topicId" element={
          <TopicViewRoute
            subjects={subjects}
            topics={topics}
            quizzes={publicQuizzes}
            isSubjectsLoaded={subjectsLoaded}
            isTopicsLoaded={topicsLoaded}
            selectedSubject={selectedSubject}
            selectedTopic={selectedTopic}
            onSelectSubject={setSelectedSubject}
            onSelectTopic={setSelectedTopic}
            onSubjectLoaded={handleSubjectLoadedFromDeepLink}
            onTopicLoaded={handleTopicLoadedFromDeepLink}
            onStartQuiz={handleStartQuiz}
          />
        } />

        <Route path="/quiz/:quizId" element={
          <QuizRunnerRoute
            quizzes={quizzes}
            subjects={subjects}
            topics={topics}
            isQuizzesLoaded={quizzesLoaded}
            activeQuiz={activeQuiz}
            selectedSubject={selectedSubject}
            selectedTopic={selectedTopic}
            onSetActiveQuiz={setActiveQuiz}
            onQuizLoaded={handleQuizLoadedFromDeepLink}
            onFinishQuiz={handleFinishQuiz}
            onExitToTopic={(topicId) => {
              if (topicId) {
                navigate(`/topic/${topicId}`);
              } else if (selectedSubject) {
                navigate(`/subject/${selectedSubject.id}`);
              } else {
                navigate('/courses');
              }
            }}
          />
        } />

        <Route path="/quiz/:quizId/results" element={
          <QuizResultsRoute
            quizzes={quizzes}
            subjects={subjects}
            topics={topics}
            isQuizzesLoaded={quizzesLoaded}
            activeQuiz={activeQuiz}
            selectedSubject={selectedSubject}
            selectedTopic={selectedTopic}
            quizResults={quizResults}
            onRetakeQuiz={handleRetakeQuiz}
          />
        } />

        {/* Teacher Routes */}
        <Route path="/teacher/*" element={
          <div className="flex-1 flex flex-col">
            <Navbar viewMode="teacher_dashboard" onNavigate={() => {}} selectedSubject={null} selectedTopic={null} selectedQuiz={null} onBackToSubjects={() => {}} onBackToTopics={() => {}} hideLogo={true} />
            <main className="flex-1">
              {currentTeacher ? (
                <TeacherDashboard
                  currentTeacher={currentTeacher}
                  teachers={teachers}
                  onAddTeacher={handleAddTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
                  subjects={subjects}
                  topics={topics}
                  quizzes={quizzes}
                  onSaveSubject={handleSaveSubject}
                  onDeleteSubject={handleDeleteSubject}
                  onSaveTopic={handleSaveTopic}
                  onDeleteTopic={handleDeleteTopic}
                  onSaveQuiz={handleSaveQuiz}
                  onDeleteQuiz={handleDeleteQuiz}
                  onTestQuizAsStudent={(quiz) => {
                    const sub = subjects.find((s) => s.id === quiz.subjectId);
                    const top = topics.find((t) => t.id === quiz.topicId);
                    if (sub) setSelectedSubject(sub);
                    if (top) setSelectedTopic(top);
                    handleStartQuiz(quiz);
                  }}
                  onLogout={handleTeacherLogout}
                />
              ) : (
                <TeacherLogin
                  status={teacherSession.status}
                  email={teacherSession.email}
                  error={teacherSession.error}
                  onSignIn={teacherSession.signIn}
                  onSignOut={teacherSession.signOutTeacher}
                  onCancel={() => navigate('/')}
                />
              )}
            </main>
          </div>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <StudentAuthProvider>
          <AppContent />
        </StudentAuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;

