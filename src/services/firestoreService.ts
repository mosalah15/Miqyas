import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Subject, Topic, Quiz } from '../types';
import { query, where } from 'firebase/firestore';

/**
 * Removes undefined fields which Firestore does not allow.
 */
function sanitizeForFirestore<T>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  if (!data || typeof data !== 'object') return clean;

  for (const [key, val] of Object.entries(data as Record<string, any>)) {
    if (val === undefined) {
      continue;
    }
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

// -------------------------------------------------------------
// Subscriptions (Realtime Listeners)
// -------------------------------------------------------------

export function subscribeToSubjects(
  onUpdate: (subjects: Subject[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'subjects');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Subject[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Subject);
      });
      // Sort by order or name
      list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      onUpdate(list);
    },
    (error) => {
      console.warn('Error syncing subjects from cloud:', error);
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'subjects');
    }
  );
}

export function subscribeToTopics(
  onUpdate: (topics: Topic[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'topics');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Topic[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Topic);
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Error syncing topics from cloud:', error);
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'topics');
    }
  );
}

/**
 * الطلاب يشوفوا المنشور فقط. المسودات تظهر للمعلم (includeDrafts = true)،
 * وقواعد Firestore تمنع الطالب من طلب المسودات حتى لو حاول.
 */
export function subscribeToQuizzes(
  onUpdate: (quizzes: Quiz[]) => void,
  onError?: (err: Error) => void,
  includeDrafts = false
): Unsubscribe {
  const colRef = includeDrafts
    ? collection(db, 'quizzes')
    : query(collection(db, 'quizzes'), where('isPublished', '==', true));
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Quiz[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Quiz);
      });
      // Sort newest first
      list.sort((a, b) => {
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tB - tA;
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Error syncing quizzes from cloud:', error);
      if (onError) {
        onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'quizzes');
    }
  );
}

// -------------------------------------------------------------
// Direct Single-Document Fetching (Fast Deep-Link Resolution)
// -------------------------------------------------------------

export async function fetchQuizByIdFromCloud(quizId: string): Promise<Quiz | null> {
  if (!quizId) return null;
  try {
    const snap = await getDoc(doc(db, 'quizzes', quizId));
    return snap.exists() ? (snap.data() as Quiz) : null;
  } catch (err) {
    console.warn(`Direct fetch failed for quiz ${quizId}:`, err);
    return null;
  }
}

export async function fetchSubjectByIdFromCloud(subjectId: string): Promise<Subject | null> {
  if (!subjectId) return null;
  try {
    const snap = await getDoc(doc(db, 'subjects', subjectId));
    return snap.exists() ? (snap.data() as Subject) : null;
  } catch (err) {
    console.warn(`Direct fetch failed for subject ${subjectId}:`, err);
    return null;
  }
}

export async function fetchTopicByIdFromCloud(topicId: string): Promise<Topic | null> {
  if (!topicId) return null;
  try {
    const snap = await getDoc(doc(db, 'topics', topicId));
    return snap.exists() ? (snap.data() as Topic) : null;
  } catch (err) {
    console.warn(`Direct fetch failed for topic ${topicId}:`, err);
    return null;
  }
}

// -------------------------------------------------------------
// Mutation operations (Write to Cloud)
// -------------------------------------------------------------

export async function saveSubjectToCloud(subject: Subject): Promise<void> {
  const path = `subjects/${subject.id}`;
  try {
    const docRef = doc(db, 'subjects', subject.id);
    const sanitized = sanitizeForFirestore(subject);
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`[Cloud Sync] Subject saved to Firestore: ${subject.name} (${subject.id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSubjectFromCloud(subjectId: string): Promise<void> {
  const path = `subjects/${subjectId}`;
  try {
    await deleteDoc(doc(db, 'subjects', subjectId));
    console.log(`[Cloud Sync] Subject deleted from Firestore: ${subjectId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveTopicToCloud(topic: Topic): Promise<void> {
  const path = `topics/${topic.id}`;
  try {
    const docRef = doc(db, 'topics', topic.id);
    const sanitized = sanitizeForFirestore(topic);
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`[Cloud Sync] Topic saved to Firestore: ${topic.title} (${topic.id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTopicFromCloud(topicId: string): Promise<void> {
  const path = `topics/${topicId}`;
  try {
    await deleteDoc(doc(db, 'topics', topicId));
    console.log(`[Cloud Sync] Topic deleted from Firestore: ${topicId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveQuizToCloud(quiz: Quiz): Promise<void> {
  const path = `quizzes/${quiz.id}`;
  try {
    const docRef = doc(db, 'quizzes', quiz.id);
    const sanitized = sanitizeForFirestore(quiz);
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`[Cloud Sync] Quiz published to Firestore: ${quiz.title} (${quiz.id})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteQuizFromCloud(quizId: string): Promise<void> {
  const path = `quizzes/${quizId}`;
  try {
    await deleteDoc(doc(db, 'quizzes', quizId));
    console.log(`[Cloud Sync] Quiz deleted from Firestore: ${quizId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Initial Data Seeding
// -------------------------------------------------------------

/**
 * If the cloud database is empty, seed it with the default subjects, topics, and sample quizzes
 * so students visiting for the first time on any device have full sample data.
 */
export async function seedInitialCloudDataIfNeeded(
  defaultSubjects: Subject[],
  defaultTopics: Topic[],
  defaultQuizzes: Quiz[]
): Promise<void> {
  try {
    const subjectsSnap = await getDocs(collection(db, 'subjects'));
    if (subjectsSnap.empty && defaultSubjects.length > 0) {
      console.log('[Cloud Sync] Seeding initial subjects to Firestore...');
      const batch = writeBatch(db);
      for (const s of defaultSubjects) {
        batch.set(doc(db, 'subjects', s.id), sanitizeForFirestore(s));
      }
      for (const t of defaultTopics) {
        batch.set(doc(db, 'topics', t.id), sanitizeForFirestore(t));
      }
      for (const q of defaultQuizzes) {
        batch.set(doc(db, 'quizzes', q.id), sanitizeForFirestore(q));
      }
      await batch.commit();
      console.log('[Cloud Sync] Seeding complete! All default data uploaded to cloud.');
    }
  } catch (err) {
    console.warn('[Cloud Sync] Initial seeding check skipped or non-critical error:', err);
  }
}

