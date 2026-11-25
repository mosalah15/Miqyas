import { useCallback, useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { TeacherUser } from '../types';
import { fetchTeacherProfile } from '../services/teacherService';

export type TeacherSessionStatus =
  | 'loading' // لسه بنتحقق
  | 'signed-out' // مفيش حساب مسجل
  | 'unauthorized' // مسجل دخول لكن البريد ليس ضمن المعلمين
  | 'ready'; // معلم مصرح له

/**
 * جلسة المعلم = حساب Google في Firebase Auth + وجود وثيقة `teachers/{email}`.
 * لا توجد كلمات مرور في الكود ولا في المتصفح.
 */
export const useTeacherSession = () => {
  const [status, setStatus] = useState<TeacherSessionStatus>('loading');
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (cancelled) return;
        setTeacher(null);
        setEmail('');
        setStatus('signed-out');
        return;
      }
      setEmail(user.email || '');
      const profile = await fetchTeacherProfile(user);
      if (cancelled) return;
      setTeacher(profile);
      setStatus(profile ? 'ready' : 'unauthorized');
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const signIn = useCallback(async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setError(e?.code || 'auth-error');
      }
    }
  }, []);

  /** ملاحظة: Firebase Auth له جلسة واحدة، فتسجيل الخروج يخرج الحساب من واجهة الطالب أيضاً */
  const signOutTeacher = useCallback(async () => {
    await signOut(auth);
  }, []);

  return { status, teacher, email, error, signIn, signOutTeacher };
};

