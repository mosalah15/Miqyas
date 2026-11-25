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

