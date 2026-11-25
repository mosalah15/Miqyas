import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { TeacherUser } from '../types';

/**
 * صلاحيات المعلمين تعيش في Firestore: وثيقة لكل معلم في المجموعة `teachers`
 * ومعرّفها هو بريده بحروف صغيرة. قواعد Firestore (firestore.rules) هي التي تفرض
 * الصلاحية فعلياً على السيرفر؛ هذا الملف فقط يقرأ الدور ليعرض الواجهة المناسبة.
 */

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toTeacherUser = (email: string, data: Record<string, unknown>): TeacherUser => ({
  id: email,
  username: email,
  displayName: (typeof data.displayName === 'string' && data.displayName) || email,
  role: data.role === 'admin' ? 'admin' : 'teacher',
  createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
});

/** يرجع ملف المعلم لو بريد المستخدم مسجل كمعلم، وإلا null */
export async function fetchTeacherProfile(user: User): Promise<TeacherUser | null> {
  if (!user.email || !user.emailVerified) return null;
  const email = normalizeEmail(user.email);
  try {
    const snap = await getDoc(doc(db, 'teachers', email));
    if (!snap.exists()) return null;
    const teacher = toTeacherUser(email, snap.data());
    if (!teacher.displayName || teacher.displayName === email) {
      teacher.displayName = user.displayName || email;
    }
    return teacher;
  } catch {
    // القاعدة ترفض القراءة لغير المسجلين؛ نعتبره غير مصرح له
    return null;
  }
}

/** قائمة المعلمين (للمدير فقط؛ القواعد ترفض غيره) */
export function subscribeToTeachers(
  onData: (teachers: TeacherUser[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, 'teachers'),
    (snap) => {
      onData(
        snap.docs
          .map((d) => toTeacherUser(d.id, d.data()))
          .sort((a, b) => (a.role === b.role ? a.username.localeCompare(b.username) : a.role === 'admin' ? -1 : 1))
      );
    },
    (err) => onError?.(err)
  );
}

export async function addTeacherByEmail(params: {
  email: string;
  displayName: string;
  addedBy: string;
}): Promise<void> {
  const email = normalizeEmail(params.email);
  await setDoc(doc(db, 'teachers', email), {
    email,
    displayName: params.displayName.trim() || email,
    role: 'teacher',
    createdAt: new Date().toISOString(),
    createdBy: normalizeEmail(params.addedBy),
  });
}

export async function removeTeacher(email: string): Promise<void> {
  await deleteDoc(doc(db, 'teachers', normalizeEmail(email)));
}

/**
 * ترحيل: الاختبارات التي أُنشئت قبل هذا التحديث لا تحمل حقل isPublished،
 * والقواعد الجديدة تخفي غير المنشور، فنضع الحقل = true للمحتوى القديم.
 * المعلم يعدّل ما أنشأه، والمدير يعدّل كل شيء؛ وأي وثيقة يُرفض تعديلها تُتجاوز.
 */
export async function backfillQuizPublishFlags(): Promise<number> {
  const snap = await getDocs(collection(db, 'quizzes'));
  let updated = 0;
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data.isPublished !== undefined) continue;
    try {
      await updateDoc(doc(db, 'quizzes', d.id), { isPublished: true });
      updated++;
    } catch {
      /* ليس مالكاً لهذا الاختبار */
    }
  }
  return updated;
}

