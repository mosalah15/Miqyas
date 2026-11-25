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
  subjectId?: string;
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

