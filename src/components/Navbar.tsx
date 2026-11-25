import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, ArrowRight, User } from 'lucide-react';
import { ViewMode, Subject, Topic, Quiz } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { Logo } from './Logo';
import { buttonClass } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { brandName } from '../config/brand';

interface NavbarProps {
  viewMode: string;
  onNavigate: (mode: ViewMode) => void;
  selectedSubject?: Subject | null;
  selectedTopic?: Topic | null;
  selectedQuiz?: Quiz | null;
  onBackToSubjects?: () => void;
  onBackToTopics?: () => void;
  hideLogo?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  selectedSubject,
  selectedTopic,
  selectedQuiz,
  onBackToTopics,
  hideLogo = false,
}) => {
  const isStudentView = viewMode.startsWith('student_');
  const isTeacherView = viewMode === 'teacher_dashboard' || viewMode === 'teacher_login';
  const isDashboardView = viewMode === 'student_dashboard';
  const isSubjectsCatalogView = viewMode === 'student_subjects';
  const isQuizRunnerActive = viewMode === 'student_runner' && Boolean(selectedQuiz);

  const navigate = useNavigate();
  const { t, isArabic } = useLanguage();
  const { studentUser, studentProfile } = useStudentAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  /** عنوان الصفحة الحالية: يظهر في منتصف الشريط */
  const activeTitle = (() => {
    if (viewMode === 'student_runner') return null;
    if (isDashboardView) return isArabic ? 'لوحة الطالب' : 'Student Hub';
    if (isSubjectsCatalogView) return isArabic ? 'المقررات' : 'Courses';
    if (selectedQuiz) return selectedQuiz.title;
    if (selectedTopic) return selectedTopic.title;
    if (selectedSubject) return selectedSubject.name;
    return null;
  })();

  const hasBackAction =
    isStudentView &&
    !isQuizRunnerActive &&
    Boolean(isDashboardView || isSubjectsCatalogView || selectedQuiz || selectedTopic || selectedSubject);

  /** الرجوع درجة واحدة: اختبار ← موضوع ← مقرر ← قائمة المقررات ← الرئيسية */
  const handleGoBack = () => {
    if (isDashboardView || isSubjectsCatalogView) return navigate('/');
    if (selectedQuiz) {
      if (onBackToTopics) return onBackToTopics();
      if (selectedTopic) return navigate(`/topic/${selectedTopic.id}`);
      if (selectedSubject) return navigate(`/subject/${selectedSubject.id}`);
      return navigate(-1);
    }
    if (selectedTopic) {
      return selectedSubject ? navigate(`/subject/${selectedSubject.id}`) : navigate(-1);
    }
    if (selectedSubject) return navigate('/courses');
    return navigate('/');
  };

  const firstName = studentProfile?.displayName?.split(' ')[0] || '';
  const showAvatar = Boolean(studentUser && studentProfile?.photoURL && !avatarFailed);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* البداية: الشعار + زر الرجوع */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!hideLogo && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-lg cursor-pointer"
              aria-label={`${brandName(isArabic)} — ${t('home')}`}
            >
              <Logo size="md" />
            </button>
          )}

          {hasBackAction && (
            <button
              type="button"
              onClick={handleGoBack}
              className={buttonClass('ghost', 'sm', 'ms-1')}
              title={t('goBack')}
            >
              <BackIcon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('goBack')}</span>
            </button>
          )}
        </div>

        {/* الوسط: مكان المستخدم الحالي */}
        <div className="flex-1 min-w-0 px-1">
          {activeTitle && (
            <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate text-center">
              {activeTitle}
            </span>
          )}
        </div>

        {/* النهاية: اللغة، لوحة الطالب، بوابة المعلم، المظهر */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageToggle />

          {isStudentView && !isQuizRunnerActive && (
            <button
              type="button"
              onClick={() => navigate('/student')}
              className={buttonClass(isDashboardView ? 'primary' : 'secondary', 'sm')}
              title={isArabic ? 'لوحة الطالب' : 'Student Hub'}
            >
              {showAvatar ? (
                <img
                  src={studentProfile!.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-5 h-5 rounded-md object-cover shrink-0"
                />
              ) : (
                <User className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden sm:inline max-w-[110px] truncate">
                {studentUser
                  ? firstName || (isArabic ? 'لوحتي' : 'My Hub')
                  : isArabic
                  ? 'حسابي'
                  : 'My account'}
              </span>
            </button>
          )}

          {isStudentView && (
            <button
              type="button"
              onClick={() => navigate('/teacher')}
              className={buttonClass('secondary', 'sm')}
              title={t('teacherPortal')}
              aria-label={t('teacherPortal')}
            >
              <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <span className="hidden md:inline">{t('teacherPortal')}</span>
            </button>
          )}

          {isTeacherView && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className={buttonClass('secondary', 'sm')}
              title={t('studentView')}
            >
              <BackIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <span className="hidden sm:inline">{t('studentView')}</span>
            </button>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

