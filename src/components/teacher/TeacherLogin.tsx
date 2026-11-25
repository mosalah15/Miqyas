import React from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { TeacherSessionStatus } from '../../hooks/useTeacherSession';
import { Logo } from '../Logo';
import { buttonClass } from '../ui/Button';

interface TeacherLoginProps {
  status: TeacherSessionStatus;
  /** بريد الحساب المسجل حالياً (لو فيه) */
  email: string;
  error: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onCancel: () => void;
}

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
  </svg>
);

export const TeacherLogin: React.FC<TeacherLoginProps> = ({
  status,
  email,
  error,
  onSignIn,
  onSignOut,
  onCancel,
}) => {
  const { isArabic } = useLanguage();
  const unauthorized = status === 'unauthorized';

  const errorText = error
    ? error === 'auth/popup-blocked'
      ? isArabic
        ? 'المتصفح منع نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة وحاول مرة أخرى.'
        : 'The browser blocked the sign-in popup. Allow popups and try again.'
      : error === 'auth/unauthorized-domain'
      ? isArabic
        ? 'النطاق الحالي غير مصرح له بتسجيل الدخول عبر Google في إعدادات Firebase.'
        : 'The current domain is not authorized for Google sign-in in Firebase settings.'
      : error === 'auth/network-request-failed'
      ? isArabic
        ? 'تعذّر الاتصال بخدمة المصادقة. تحقّق من الاتصال وحاول مرة أخرى.'
        : 'Network error while signing in. Check your connection and try again.'
      : isArabic
      ? `تعذّر تسجيل الدخول (${error}). حاول مرة أخرى.`
      : `Sign-in failed (${error}). Please try again.`
    : '';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-md w-full">
        <div className="mb-6">
          <Logo size="md" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
          {isArabic ? 'بوابة المعلم' : 'Teacher portal'}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-7">
          {isArabic
            ? 'سجّل الدخول بحساب Google المسجّل لدى المدير كمعلم.'
            : 'Sign in with the Google account your admin registered as a teacher.'}
        </p>

        {unauthorized && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm leading-7"
          >
            {isArabic ? (
              <>
                الحساب <span dir="ltr" className="font-semibold">{email}</span> غير مسجّل كمعلم. اطلب من المدير إضافة بريدك، أو سجّل الدخول بحساب آخر.
              </>
            ) : (
              <>
                <span className="font-semibold">{email}</span> is not registered as a teacher. Ask your admin to add your email, or sign in with another account.
              </>
            )}
          </div>
        )}

        {errorText && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-1" />
            <span>{errorText}</span>
          </div>
        )}

        {status === 'loading' ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-3">
            {isArabic ? 'جارٍ التحقق من الحساب...' : 'Checking your account...'}
          </p>
        ) : unauthorized ? (
          <button type="button" onClick={onSignOut} className={buttonClass('secondary', 'lg', 'w-full')}>
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{isArabic ? 'تبديل الحساب' : 'Use another account'}</span>
          </button>
        ) : (
          <button type="button" onClick={onSignIn} className={buttonClass('primary', 'lg', 'w-full')}>
            <span className="bg-white rounded-md p-0.5 flex">
              <GoogleMark />
            </span>
            <span>{isArabic ? 'الدخول بحساب Google' : 'Continue with Google'}</span>
          </button>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            {isArabic ? 'العودة للرئيسية' : 'Back to home'}
          </button>
        </div>
      </div>
    </div>
  );
};

