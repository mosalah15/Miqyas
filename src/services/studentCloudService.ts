import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  StudentProfile,
  StudentAttempt,
  StudentMistake,
  StudentBookmark,
  PrivateQuiz,
  QuizStat,
} from '../types';

/**
 * Strips undefined values recursively because Firestore rejects undefined fields.
 */
function sanitizeForFirestore<T>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  if (!data || typeof data !== 'object') return clean;

  for (const [key, val] of Object.entries(data as Record<string, any>)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      clean[key] = val.map((item) =>
        item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item
      );
    } else if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      clean[key] = sanitizeForFirestore(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Ensures any Firestore document ID strictly matches ^[a-zA-Z0-9_-]{1,120}$
 */
export function sanitizeDocId(raw: string, prefix = 'doc'): string {
  const cleaned = String(raw || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
  if (cleaned.length > 0) return cleaned;
  return `${prefix}_${Date.now()}`;
}

/**
 * Deterministic compact ASCII ID for question-keyed entities (mistakes / bookmarks)
 */
export function buildDeterministicEntityId(prefix: string, quizId: string, questionId: string, questionText: string): string {
  const seed = `${quizId}::${questionId}::${questionText.trim().slice(0, 120)}`;
  let h1 = 2166136261;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 16777619);
    h2 += (h2 << 1) + (h2 << 4) + (h2 << 7) + (h2 << 8) + (h2 << 24) + ch;
  }
  const part1 = (h1 >>> 0).toString(36);
  const part2 = (h2 >>> 0).toString(36);
  return sanitizeDocId(`${prefix}_${part1}_${part2}`, prefix);
}

// -------------------------------------------------------------
// Student Profile
// -------------------------------------------------------------
export async function upsertStudentProfile(profile: StudentProfile): Promise<void> {
  const uid = sanitizeDocId(profile.uid, 'user');
  const path = `users/${uid}`;
  try {
    const payload = sanitizeForFirestore({
      uid,
      displayName: (profile.displayName || 'طالب').slice(0, 140),
      email: (profile.email || '').slice(0, 190),
      ...(profile.photoURL ? { photoURL: profile.photoURL.slice(0, 950) } : {}),
      updatedAt: profile.updatedAt || new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', uid), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// Student Attempts History
// -------------------------------------------------------------
export function subscribeToStudentAttempts(
  userId: string,
  onUpdate: (attempts: StudentAttempt[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/attempts`;
  const colRef = collection(db, 'users', userId, 'attempts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: StudentAttempt[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StudentAttempt);
      });
      list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      onUpdate(list);
    },
    (error) => {
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveStudentAttempt(attempt: StudentAttempt): Promise<void> {
  const safeId = sanitizeDocId(attempt.id, 'att');
  const path = `users/${attempt.userId}/attempts/${safeId}`;
  try {
    const payload = sanitizeForFirestore({
      id: safeId,
      userId: attempt.userId,
      quizId: String(attempt.quizId).slice(0, 120),
      quizTitle: String(attempt.quizTitle || 'Quiz').slice(0, 280),
      subjectId: String(attempt.subjectId || '').slice(0, 120),
      subjectName: String(attempt.subjectName || '').slice(0, 190),
      topicId: String(attempt.topicId || '').slice(0, 120),
      isPrivateQuiz: Boolean(attempt.isPrivateQuiz),
      score: Math.max(0, Number(attempt.score) || 0),
      totalQuestions: Math.max(0, Number(attempt.totalQuestions) || 0),
      percentage: Math.max(0, Math.min(100, Number(attempt.percentage) || 0)),
      timeSpentSeconds: Math.max(0, Math.min(86400, Number(attempt.timeSpentSeconds) || 0)),
      completedAt: attempt.completedAt || new Date().toISOString(),
      questions: (attempt.questions || []).slice(0, 200),
      userAnswers: attempt.userAnswers || {},
      writtenInputData: attempt.writtenInputData || {},
      writtenGradingData: attempt.writtenGradingData || {},
    });
    await setDoc(doc(db, 'users', attempt.userId, 'attempts', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteStudentAttempt(userId: string, attemptId: string): Promise<void> {
  const safeId = sanitizeDocId(attemptId, 'att');
  const path = `users/${userId}/attempts/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'attempts', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Mistakes Bank
// -------------------------------------------------------------
export function subscribeToStudentMistakes(
  userId: string,
  onUpdate: (mistakes: StudentMistake[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/mistakes`;
  const colRef = collection(db, 'users', userId, 'mistakes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: StudentMistake[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StudentMistake);
      });
      list.sort((a, b) => new Date(b.lastMissedAt).getTime() - new Date(a.lastMissedAt).getTime());
      onUpdate(list);
    },
    (error) => {
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function upsertStudentMistake(mistake: StudentMistake): Promise<void> {
  const safeId = sanitizeDocId(mistake.id, 'm');
  const path = `users/${mistake.userId}/mistakes/${safeId}`;
  try {
    const docRef = doc(db, 'users', mistake.userId, 'mistakes', safeId);
    const payload = sanitizeForFirestore({
      id: safeId,
      userId: mistake.userId,
      quizId: String(mistake.quizId).slice(0, 120),
      quizTitle: String(mistake.quizTitle || 'Quiz').slice(0, 280),
      subjectId: String(mistake.subjectId || '').slice(0, 120),
      subjectName: String(mistake.subjectName || '').slice(0, 190),
      question: mistake.question,
      lastWrongAnswer: String(mistake.lastWrongAnswer || '').slice(0, 1900),
      wrongCount: Math.max(1, Number(mistake.wrongCount) || 1),
      lastMissedAt: mistake.lastMissedAt || new Date().toISOString(),
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudentMistake(userId: string, mistakeId: string): Promise<void> {
  const safeId = sanitizeDocId(mistakeId, 'm');
  const path = `users/${userId}/mistakes/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'mistakes', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Saved / Bookmarked Questions
// -------------------------------------------------------------
export function subscribeToStudentBookmarks(
  userId: string,
  onUpdate: (bookmarks: StudentBookmark[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/bookmarks`;
  const colRef = collection(db, 'users', userId, 'bookmarks');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: StudentBookmark[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StudentBookmark);
      });
      list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      onUpdate(list);
    },
    (error) => {
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addStudentBookmark(bookmark: StudentBookmark): Promise<void> {
  const safeId = sanitizeDocId(bookmark.id, 'bm');
  const path = `users/${bookmark.userId}/bookmarks/${safeId}`;
  try {
    const payload = sanitizeForFirestore({
      id: safeId,
      userId: bookmark.userId,
      quizId: String(bookmark.quizId).slice(0, 120),
      quizTitle: String(bookmark.quizTitle || 'Quiz').slice(0, 280),
      subjectId: String(bookmark.subjectId || '').slice(0, 120),
      subjectName: String(bookmark.subjectName || '').slice(0, 190),
      question: bookmark.question,
      savedAt: bookmark.savedAt || new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', bookmark.userId, 'bookmarks', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeStudentBookmark(userId: string, bookmarkId: string): Promise<void> {
  const safeId = sanitizeDocId(bookmarkId, 'bm');
  const path = `users/${userId}/bookmarks/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'bookmarks', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Private Student Quizzes (Never Published Publicly)
// -------------------------------------------------------------
export function subscribeToStudentPrivateQuizzes(
  userId: string,
  onUpdate: (quizzes: PrivateQuiz[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/privateQuizzes`;
  const colRef = collection(db, 'users', userId, 'privateQuizzes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PrivateQuiz[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as PrivateQuiz);
      });
      list.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );
      onUpdate(list);
    },
    (error) => {
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveStudentPrivateQuiz(quiz: PrivateQuiz, isEdit = false): Promise<void> {
  const safeId = sanitizeDocId(quiz.id, 'pquiz');
  const path = `users/${quiz.userId}/privateQuizzes/${safeId}`;
  try {
    const payload = sanitizeForFirestore({
      id: safeId,
      userId: quiz.userId,
      title: String(quiz.title || 'Private Quiz').slice(0, 240),
      subjectName: String(quiz.subjectName || 'عام').slice(0, 190),
      description: String(quiz.description || '').slice(0, 1900),
      timeLimitMinutes: Math.max(0, Math.min(600, Number(quiz.timeLimitMinutes) || 0)),
      questions: (quiz.questions || []).slice(0, 200),
      createdAt: quiz.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPrivate: true,
    });
    await setDoc(doc(db, 'users', quiz.userId, 'privateQuizzes', safeId), payload, { merge: isEdit });
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteStudentPrivateQuiz(userId: string, quizId: string): Promise<void> {
  const safeId = sanitizeDocId(quizId, 'pquiz');
  const path = `users/${userId}/privateQuizzes/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'privateQuizzes', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Aggregated Anonymous Quiz Stats (/quizStats/{quizId})
// -------------------------------------------------------------
export function subscribeToQuizStats(
  onUpdate: (statsMap: Record<string, QuizStat>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'quizStats');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const map: Record<string, QuizStat> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as QuizStat;
        if (data?.quizId) {
          map[data.quizId] = data;
        }
      });
      onUpdate(map);
    },
    (error) => {
      console.warn('Error subscribing to quizStats:', error);
      if (onError) onError(error);
    }
  );
}

export async function incrementQuizStat(rawQuizId: string, percentage: number): Promise<void> {
  const safeQuizId = sanitizeDocId(rawQuizId, 'quiz');
  if (!safeQuizId) return;
  const statRef = doc(db, 'quizStats', safeQuizId);
  const clampedPct = Math.max(0, Math.min(100, Math.round(Number(percentage) || 0)));
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(statRef);
      if (!snap.exists()) {
        tx.set(statRef, {
          quizId: rawQuizId.slice(0, 128),
          attemptsCount: 1,
          totalPercentageSum: clampedPct,
          lastAttemptAt: new Date().toISOString(),
        });
      } else {
        const curr = snap.data() as QuizStat;
        tx.set(statRef, {
          quizId: curr.quizId || rawQuizId.slice(0, 128),
          attemptsCount: (Number(curr.attemptsCount) || 0) + 1,
          totalPercentageSum: (Number(curr.totalPercentageSum) || 0) + clampedPct,
          lastAttemptAt: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    // Non-blocking anonymous stat increment; never interrupt quiz submission
    console.warn('Could not update anonymous quizStats:', err);
  }
}

