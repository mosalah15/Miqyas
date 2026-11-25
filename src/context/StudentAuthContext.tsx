import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../firebase';
import {
  StudentProfile,
  StudentAttempt,
  StudentMistake,
  StudentBookmark,
  PrivateQuiz,
  Quiz,
  Question,
  AIWrittenGradingResult,
} from '../types';
import {
  upsertStudentProfile,
  subscribeToStudentAttempts,
  saveStudentAttempt,
  deleteStudentAttempt,
  subscribeToStudentMistakes,
  upsertStudentMistake,
  deleteStudentMistake,
  subscribeToStudentBookmarks,
  addStudentBookmark,
  removeStudentBookmark,
  subscribeToStudentPrivateQuizzes,
  saveStudentPrivateQuiz,
  deleteStudentPrivateQuiz,
  incrementQuizStat,
  buildDeterministicEntityId,
  sanitizeDocId,
} from '../services/studentCloudService';
import { StudentAiQuota, fetchStudentAiQuota } from '../services/aiService';

export interface QuizResultPayload {
  score: number;
  totalMCQs: number;
  totalWritten: number;
  userAnswers: Record<string, string>;
  writtenInputData: Record<string, string>;
  writtenGradingData: Record<string, AIWrittenGradingResult>;
  questions: Question[];
  timeSpentSeconds: number;
}

interface StudentAuthContextType {
  studentUser: User | null;
  studentProfile: StudentProfile | null;
  authLoading: boolean;
  authBusy: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signOutStudent: () => Promise<void>;
  attempts: StudentAttempt[];
  mistakes: StudentMistake[];
  bookmarks: StudentBookmark[];
  privateQuizzes: PrivateQuiz[];
  dataLoading: boolean;
  aiQuota: StudentAiQuota;
  refreshAiQuota: () => Promise<void>;
  setAiQuotaDirect: (quota: StudentAiQuota) => void;
  isQuestionBookmarked: (quizId: string, question: Question) => boolean;
  toggleBookmarkQuestion: (params: {
    quiz: Pick<Quiz, 'id' | 'title' | 'subjectId'>;
    subjectName: string;
    question: Question;
  }) => Promise<boolean>;
  removeBookmarkById: (bookmarkId: string) => Promise<void>;
  removeMistakeById: (mistakeId: string) => Promise<void>;
  removeAttemptById: (attemptId: string) => Promise<void>;
  savePrivateQuiz: (quiz: PrivateQuiz, isEdit?: boolean) => Promise<void>;
  removePrivateQuiz: (quizId: string) => Promise<void>;
  recordQuizCompletion: (params: {
    quiz: Pick<Quiz, 'id' | 'title' | 'subjectId' | 'topicId'>;
    subjectName: string;
    isPrivateQuiz?: boolean;
    practiceMode?: 'mistakes' | 'bookmarks' | null;
    results: QuizResultPayload;
  }) => Promise<{ savedToAccount: boolean }>;
}

const DEFAULT_QUOTA: StudentAiQuota = { used: 0, limit: 5, remaining: 5 };

const StudentAuthContext = createContext<StudentAuthContextType>({
  studentUser: null,
  studentProfile: null,
  authLoading: true,
  authBusy: false,
  authError: null,
  clearAuthError: () => {},
  signInWithGoogle: async () => false,
  signOutStudent: async () => {},
  attempts: [],
  mistakes: [],
  bookmarks: [],
  privateQuizzes: [],
  dataLoading: false,
  aiQuota: DEFAULT_QUOTA,
  refreshAiQuota: async () => {},
  setAiQuotaDirect: () => {},
  isQuestionBookmarked: () => false,
  toggleBookmarkQuestion: async () => false,
  removeBookmarkById: async () => {},
  removeMistakeById: async () => {},
  removeAttemptById: async () => {},
  savePrivateQuiz: async () => {},
  removePrivateQuiz: async () => {},
  recordQuizCompletion: async () => ({ savedToAccount: false }),
});

export const StudentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [studentUser, setStudentUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [mistakes, setMistakes] = useState<StudentMistake[]>([]);
  const [bookmarks, setBookmarks] = useState<StudentBookmark[]>([]);
  const [privateQuizzes, setPrivateQuizzes] = useState<PrivateQuiz[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [aiQuota, setAiQuota] = useState<StudentAiQuota>(DEFAULT_QUOTA);

  const refreshAiQuota = useCallback(async () => {
    if (!studentUser?.uid) {
      setAiQuota(DEFAULT_QUOTA);
      return;
    }
    const q = await fetchStudentAiQuota(studentUser.uid);
    setAiQuota(q);
  }, [studentUser?.uid]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setStudentUser(user);
      setAuthLoading(false);

      if (user) {
        const profile: StudentProfile = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'طالب',
          email: user.email || '',
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
          updatedAt: new Date().toISOString(),
        };
        setStudentProfile(profile);
        if (user.emailVerified) {
          upsertStudentProfile(profile).catch((e) => console.warn('Profile sync warning:', e));
        }
      } else {
        setStudentProfile(null);
        setAttempts([]);
        setMistakes([]);
        setBookmarks([]);
        setPrivateQuizzes([]);
        setAiQuota(DEFAULT_QUOTA);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!studentUser || !studentUser.emailVerified) {
      setDataLoading(false);
      return;
    }

    const uid = studentUser.uid;
    setDataLoading(true);

    let readyFlags = { attempts: false, mistakes: false, bookmarks: false, privateQuizzes: false };
    const markReady = (key: keyof typeof readyFlags) => {
      readyFlags[key] = true;
      if (readyFlags.attempts && readyFlags.mistakes && readyFlags.bookmarks && readyFlags.privateQuizzes) {
        setDataLoading(false);
      }
    };

    const unsubAttempts = subscribeToStudentAttempts(
      uid,
      (list) => {
        setAttempts(list);
        markReady('attempts');
      },
      () => markReady('attempts')
    );

    const unsubMistakes = subscribeToStudentMistakes(
      uid,
      (list) => {
        setMistakes(list);
        markReady('mistakes');
      },
      () => markReady('mistakes')
    );

    const unsubBookmarks = subscribeToStudentBookmarks(
      uid,
      (list) => {
        setBookmarks(list);
        markReady('bookmarks');
      },
      () => markReady('bookmarks')
    );

    const unsubPrivate = subscribeToStudentPrivateQuizzes(
      uid,
      (list) => {
        setPrivateQuizzes(list);
        markReady('privateQuizzes');
      },
      () => markReady('privateQuizzes')
    );

    fetchStudentAiQuota(uid).then(setAiQuota).catch(() => {});

    const fallbackTimer = setTimeout(() => setDataLoading(false), 5000);

    return () => {
      clearTimeout(fallbackTimer);
      unsubAttempts();
      unsubMistakes();
      unsubBookmarks();
      unsubPrivate();
    };
  }, [studentUser]);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      return true;
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(null);
      } else if (code === 'auth/popup-blocked') {
        setAuthError('تم حظر نافذة تسجيل الدخول المنبثقة من المتصفح. يرجى السماح بالنوافذ المنبثقة والمحاولة مرة أخرى.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError('النطاق الحالي غير مصرح له بتسجيل الدخول عبر Google في إعدادات Firebase.');
      } else {
        setAuthError(err?.message || 'تعذر تسجيل الدخول عبر Google حالياً.');
      }
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutStudent = useCallback(async () => {
    setAuthBusy(true);
    try {
      await signOut(auth);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const getBookmarkDocId = useCallback((quizId: string, question: Question) => {
    return buildDeterministicEntityId('bm', quizId, question.id, question.question);
  }, []);

  const isQuestionBookmarked = useCallback(
    (quizId: string, question: Question): boolean => {
      if (!studentUser) return false;
      const targetId = getBookmarkDocId(quizId, question);
      return bookmarks.some(
        (b) => b.id === targetId || b.question?.question === question.question
      );
    },
    [studentUser, bookmarks, getBookmarkDocId]
  );

  const toggleBookmarkQuestion = useCallback(
    async ({
      quiz,
      subjectName,
      question,
    }: {
      quiz: Pick<Quiz, 'id' | 'title' | 'subjectId'>;
      subjectName: string;
      question: Question;
    }): Promise<boolean> => {
      if (!studentUser || !studentUser.emailVerified) return false;
      const bmId = getBookmarkDocId(quiz.id, question);
      const existing = bookmarks.find(
        (b) => b.id === bmId || b.question?.question === question.question
      );
      if (existing) {
        await removeStudentBookmark(studentUser.uid, existing.id);
        return false;
      } else {
        await addStudentBookmark({
          id: bmId,
          userId: studentUser.uid,
          quizId: quiz.id,
          quizTitle: quiz.title,
          subjectId: quiz.subjectId || '',
          subjectName: subjectName || 'عام',
          question,
          savedAt: new Date().toISOString(),
        });
        return true;
      }
    },
    [studentUser, bookmarks, getBookmarkDocId]
  );

  const removeBookmarkById = useCallback(
    async (bookmarkId: string) => {
      if (!studentUser) return;
      await removeStudentBookmark(studentUser.uid, bookmarkId);
    },
    [studentUser]
  );

  const removeMistakeById = useCallback(
    async (mistakeId: string) => {
      if (!studentUser) return;
      await deleteStudentMistake(studentUser.uid, mistakeId);
    },
    [studentUser]
  );

  const removeAttemptById = useCallback(
    async (attemptId: string) => {
      if (!studentUser) return;
      await deleteStudentAttempt(studentUser.uid, attemptId);
    },
    [studentUser]
  );

  const savePrivateQuiz = useCallback(
    async (quiz: PrivateQuiz, isEdit = false) => {
      if (!studentUser) return;
      await saveStudentPrivateQuiz(
        {
          ...quiz,
          userId: studentUser.uid,
          isPrivate: true,
        },
        isEdit
      );
    },
    [studentUser]
  );

  const removePrivateQuiz = useCallback(
    async (quizId: string) => {
      if (!studentUser) return;
      await deleteStudentPrivateQuiz(studentUser.uid, quizId);
    },
    [studentUser]
  );

  const recordQuizCompletion = useCallback(
    async ({
      quiz,
      subjectName,
      isPrivateQuiz = false,
      practiceMode = null,
      results,
    }: {
      quiz: Pick<Quiz, 'id' | 'title' | 'subjectId' | 'topicId'>;
      subjectName: string;
      isPrivateQuiz?: boolean;
      practiceMode?: 'mistakes' | 'bookmarks' | null;
      results: QuizResultPayload;
    }): Promise<{ savedToAccount: boolean }> => {
      const totalQ = results.questions.length;
      const percentage = totalQ > 0 ? Math.round((results.score / totalQ) * 100) : 0;

      // Update anonymous aggregated public quiz stats for teacher analytics
      if (!isPrivateQuiz && !practiceMode && quiz.id) {
        incrementQuizStat(quiz.id, percentage).catch(() => {});
      }

      if (!studentUser || !studentUser.emailVerified) {
        return { savedToAccount: false };
      }

      const uid = studentUser.uid;
      const nowIso = new Date().toISOString();

      // Save completed attempt for standard & private quizzes
      if (!practiceMode) {
        const attemptId = sanitizeDocId(`att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, 'att');
        await saveStudentAttempt({
          id: attemptId,
          userId: uid,
          quizId: quiz.id,
          quizTitle: quiz.title,
          subjectId: quiz.subjectId || '',
          subjectName: subjectName || 'عام',
          topicId: quiz.topicId || '',
          isPrivateQuiz,
          score: results.score,
          totalQuestions: totalQ,
          percentage,
          timeSpentSeconds: results.timeSpentSeconds,
          completedAt: nowIso,
          questions: results.questions,
          userAnswers: results.userAnswers,
          writtenInputData: results.writtenInputData,
          writtenGradingData: results.writtenGradingData,
        });
      }

      // Sync Mistakes Bank: add/increment wrong questions; clear mastered mistakes if solved correctly
      const tasks: Promise<void>[] = [];
      for (const q of results.questions) {
        const ans = results.userAnswers[q.id];
        if (ans === 'SHOW_ANSWERS_FLAG') continue;

        const isCorrect =
          q.type === 'written'
            ? ans === 'WRITTEN_CORRECT'
            : Boolean(ans) && ans === q.correctAnswer;

        const existingMistake = mistakes.find(
          (m) =>
            m.id === q.id ||
            (m.question?.id === q.id && m.question?.question === q.question) ||
            (m.quizId === quiz.id && m.question?.question === q.question)
        );

        if (!isCorrect) {
          const mistakeId =
            existingMistake?.id ||
            buildDeterministicEntityId('mst', quiz.id, q.id, q.question);
          const wrongDisplay =
            q.type === 'written'
              ? results.writtenInputData[q.id] || ''
              : ans || '';
          tasks.push(
            upsertStudentMistake({
              id: mistakeId,
              userId: uid,
              quizId: existingMistake?.quizId || quiz.id,
              quizTitle: existingMistake?.quizTitle || quiz.title,
              subjectId: existingMistake?.subjectId || quiz.subjectId || '',
              subjectName: existingMistake?.subjectName || subjectName || 'عام',
              question: q,
              lastWrongAnswer: wrongDisplay,
              wrongCount: existingMistake ? existingMistake.wrongCount + 1 : 1,
              lastMissedAt: nowIso,
            })
          );
        } else if (practiceMode === 'mistakes' && existingMistake) {
          // Mastered during Mistakes Bank practice! Clear it from Mistakes Bank.
          tasks.push(deleteStudentMistake(uid, existingMistake.id));
        }
      }

      await Promise.allSettled(tasks);
      return { savedToAccount: true };
    },
    [studentUser, mistakes]
  );

  return (
    <StudentAuthContext.Provider
      value={{
        studentUser,
        studentProfile,
        authLoading,
        authBusy,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithGoogle,
        signOutStudent,
        attempts,
        mistakes,
        bookmarks,
        privateQuizzes,
        dataLoading,
        aiQuota,
        refreshAiQuota,
        setAiQuotaDirect: setAiQuota,
        isQuestionBookmarked,
        toggleBookmarkQuestion,
        removeBookmarkById,
        removeMistakeById,
        removeAttemptById,
        savePrivateQuiz,
        removePrivateQuiz,
        recordQuizCompletion,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => useContext(StudentAuthContext);

