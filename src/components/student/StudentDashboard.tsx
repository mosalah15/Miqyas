import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  LogIn,
  LogOut,
  Award,
  Clock,
  AlertCircle,
  Bookmark,
  Sparkles,
  FileCheck,
  Play,
  Trash2,
  Edit3,
  Download,
  Printer,
  Plus,
  Eye,
  EyeOff,
  Check,
  X,
  UploadCloud,
  Loader2,
  BookOpen,
  RotateCcw,
  Lock,
  CheckCircle2,
  BarChart3,
  AlertTriangle,
  Image as ImageIcon,
  Wand2,
  ArrowUp,
  ArrowDown,
  FileUp,
  Layers,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStudentAuth } from '../../context/StudentAuthContext';
import {
  Subject,
  Quiz,
  Question,
  PrivateQuiz,
  StudentAttempt,
} from '../../types';
import { generateQuizFromAI } from '../../services/aiService';
import { compressImage } from '../../utils/imageCompressor';
import { extractPdfContent } from '../../utils/pdfExtractor';
import { generateStandaloneHTML } from '../../utils/parser';
import { printQuizAsPDF } from '../../utils/printHelper';
import { listSavedQuizProgress, clearQuizProgress } from '../../utils/storage';
import { sanitizeDocId } from '../../services/studentCloudService';
import { QuizResults } from './QuizResults';
import { FlashcardsModal } from './FlashcardsModal';

interface StudentDashboardProps {
  subjects: Subject[];
  publicQuizzes: Quiz[];
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  subjects,
  publicQuizzes,
}) => {
  const { isArabic, t } = useLanguage();
  const navigate = useNavigate();
  const {
    studentUser,
    studentProfile,
    authLoading,
    authBusy,
    authError,
    clearAuthError,
    signInWithGoogle,
    signOutStudent,
    attempts,
    mistakes,
    bookmarks,
    privateQuizzes,
    dataLoading,
    aiQuota,
    setAiQuotaDirect,
    isQuestionBookmarked,
    toggleBookmarkQuestion,
    removeBookmarkById,
    removeMistakeById,
    removeAttemptById,
    savePrivateQuiz,
    removePrivateQuiz,
  } = useStudentAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'mistakes' | 'bookmarks' | 'private_quizzes'>('overview');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Attempt Review Sheet state
  const [reviewingAttempt, setReviewingAttempt] = useState<StudentAttempt | null>(null);

  // Filters & Reveal states
  const [mistakesSubjectFilter, setMistakesSubjectFilter] = useState<string>('ALL');
  const [revealedMistakeIds, setRevealedMistakeIds] = useState<Record<string, boolean>>({});
  const [bookmarksSubjectFilter, setBookmarksSubjectFilter] = useState<string>('ALL');
  const [revealedBookmarkIds, setRevealedBookmarkIds] = useState<Record<string, boolean>>({});
  const [dismissedProgressIds, setDismissedProgressIds] = useState<string[]>([]);

  // Private Quiz AI Creator / Editor state
  const [showCreatorForm, setShowCreatorForm] = useState<boolean>(false);
  const [editingPrivateId, setEditingPrivateId] = useState<string | null>(null);
  const [pqSubjectName, setPqSubjectName] = useState<string>('');
  const [pqTitle, setPqTitle] = useState<string>('');
  const [pqDescription, setPqDescription] = useState<string>('');
  const [pqTimeLimit, setPqTimeLimit] = useState<number>(0);

  const [aiInputMode, setAiInputMode] = useState<'generate' | 'format_existing'>('generate');
  const [aiSourceText, setAiSourceText] = useState<string>('');
  const [aiImages, setAiImages] = useState<Array<{ id: string; name: string; data: string; mimeType: string }>>([]);
  const [aiMcqCount, setAiMcqCount] = useState<number>(5);
  const [aiWrittenCount, setAiWrittenCount] = useState<number>(1);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [aiLanguage, setAiLanguage] = useState<'auto' | 'ar' | 'en'>('auto');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [reviewedQuestions, setReviewedQuestions] = useState<Question[] | null>(null);
  const [reviewedTitle, setReviewedTitle] = useState<string>('');
  const [reviewedDesc, setReviewedDesc] = useState<string>('');
  const [savingPrivate, setSavingPrivate] = useState<boolean>(false);

  // Append More Questions with AI inside Private Quiz Review/Edit
  const [showAppendAiPanel, setShowAppendAiPanel] = useState<boolean>(false);
  const [appendAiMode, setAppendAiMode] = useState<'generate' | 'format_existing'>('generate');
  const [appendAiText, setAppendAiText] = useState<string>('');
  const [appendAiImages, setAppendAiImages] = useState<Array<{ id: string; name: string; data: string; mimeType: string }>>([]);
  const [appendAiMcqCount, setAppendAiMcqCount] = useState<number>(5);
  const [appendAiWrittenCount, setAppendAiWrittenCount] = useState<number>(0);
  const [appendAiDifficulty, setAppendAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [appendAiLanguage, setAppendAiLanguage] = useState<'auto' | 'ar' | 'en'>('auto');
  const [appendAiGenerating, setAppendAiGenerating] = useState<boolean>(false);
  const [appendAiError, setAppendAiError] = useState<string | null>(null);
  const [pdfProcessingTarget, setPdfProcessingTarget] = useState<'main' | 'append' | null>(null);
  const [flashcardsData, setFlashcardsData] = useState<{ title: string; questions: Question[] } | null>(null);
  const [printTarget, setPrintTarget] = useState<{ title: string; questions: Question[] } | null>(null);

  const wipKey = studentUser ? `axis_student_wip_draft_${studentUser.uid}` : 'axis_student_wip_draft_guest';
  const [recoverableWip, setRecoverableWip] = useState<{
    editingPrivateId: string | null;
    pqSubjectName: string;
    pqTitle: string;
    pqDescription: string;
    pqTimeLimit: number;
    reviewedTitle: string;
    reviewedDesc: string;
    reviewedQuestions: Question[];
  } | null>(null);

  React.useEffect(() => {
    if (!studentUser) return;
    try {
      const raw = localStorage.getItem(wipKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.reviewedQuestions) && parsed.reviewedQuestions.length > 0) {
        setRecoverableWip(parsed);
      }
    } catch {
      // ignore
    }
  }, [studentUser, wipKey]);

  const clearWipDraft = () => {
    setRecoverableWip(null);
    try {
      localStorage.removeItem(wipKey);
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    if (!studentUser || !reviewedQuestions || reviewedQuestions.length === 0) return;
    const timer = setTimeout(() => {
      const payload = {
        editingPrivateId,
        pqSubjectName,
        pqTitle,
        pqDescription,
        pqTimeLimit,
        reviewedTitle,
        reviewedDesc,
        reviewedQuestions,
      };
      try {
        localStorage.setItem(wipKey, JSON.stringify(payload));
      } catch {
        try {
          localStorage.setItem(
            wipKey,
            JSON.stringify({
              ...payload,
              reviewedQuestions: reviewedQuestions.map((q) => ({
                ...q,
                imageURL: q.imageURL && q.imageURL.startsWith('data:') ? null : q.imageURL,
              })),
            })
          );
        } catch {
          // ignore
        }
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [
    studentUser,
    wipKey,
    editingPrivateId,
    pqSubjectName,
    pqTitle,
    pqDescription,
    pqTimeLimit,
    reviewedTitle,
    reviewedDesc,
    reviewedQuestions,
  ]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'main' | 'append') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPdfProcessingTarget(target);
    showToast(isArabic ? `جاري معالجة ملف PDF: ${file.name}...` : `Processing PDF: ${file.name}...`);

    try {
      const extracted = await extractPdfContent(file);
      if (!extracted.text.trim() && extracted.images.length === 0) {
        showToast(isArabic ? 'لم يتم العثور على نص أو صفحات صالحة في الملف.' : 'No readable content found in PDF.');
        return;
      }

      if (target === 'main') {
        if (extracted.text.trim()) {
          setAiSourceText((prev) => (prev.trim() ? `${prev.trim()}\n\n${extracted.text}` : extracted.text));
        }
        if (extracted.images.length > 0) {
          setAiImages((prev) => [...prev, ...extracted.images].slice(0, 30));
        }
      } else {
        if (extracted.text.trim()) {
          setAppendAiText((prev) => (prev.trim() ? `${prev.trim()}\n\n${extracted.text}` : extracted.text));
        }
        if (extracted.images.length > 0) {
          setAppendAiImages((prev) => [...prev, ...extracted.images].slice(0, 30));
        }
      }

      showToast(
        isArabic
          ? `تمت قراءة ${extracted.pageCount} صفحة (${extracted.textPageCount} نصية، ${extracted.renderedPageCount} مصورة).`
          : `Processed ${extracted.pageCount} pages (${extracted.textPageCount} text, ${extracted.renderedPageCount} scanned).`
      );
    } catch (err) {
      console.error('Student PDF extraction error:', err);
      showToast(isArabic ? 'تعذر قراءة ملف PDF.' : 'Failed to read PDF.');
    } finally {
      setPdfProcessingTarget(null);
    }
  };

  // KPI metrics
  const stats = useMemo(() => {
    const totalAttempts = attempts.length;
    const avgScore =
      totalAttempts > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0) / totalAttempts)
        : 0;
    const totalSeconds = attempts.reduce((sum, a) => sum + (Number(a.timeSpentSeconds) || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    return {
      totalAttempts,
      avgScore,
      totalMinutes,
      bankCount: mistakes.length + bookmarks.length,
    };
  }, [attempts, mistakes.length, bookmarks.length]);

  // Subject Mastery breakdown
  const subjectMastery = useMemo(() => {
    const map = new Map<string, { subjectName: string; attempts: number; pctSum: number; bestPct: number }>();
    for (const att of attempts) {
      const name = att.subjectName || (isArabic ? 'عام' : 'General');
      const existing = map.get(name) || { subjectName: name, attempts: 0, pctSum: 0, bestPct: 0 };
      existing.attempts += 1;
      existing.pctSum += Number(att.percentage) || 0;
      existing.bestPct = Math.max(existing.bestPct, Number(att.percentage) || 0);
      map.set(name, existing);
    }
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        avgPct: Math.round(item.pctSum / item.attempts),
      }))
      .sort((a, b) => b.attempts - a.attempts);
  }, [attempts, isArabic]);

  // In-progress quizzes from localStorage (both public and private)
  const inProgressEntries = useMemo(() => {
    const entries = listSavedQuizProgress();
    return entries
      .filter((e) => !dismissedProgressIds.includes(e.quizId))
      .map((e) => {
        const pub = publicQuizzes.find((q) => q.id === e.quizId);
        if (pub) return { ...e, title: pub.title, isPrivate: false };
        const priv = privateQuizzes.find((q) => q.id === e.quizId);
        if (priv) return { ...e, title: priv.title, isPrivate: true };
        return null;
      })
      .filter((x): x is { quizId: string; answeredCount: number; totalQuestions: number; timeSpentSeconds: number; title: string; isPrivate: boolean } => Boolean(x));
  }, [publicQuizzes, privateQuizzes, dismissedProgressIds]);

  const mistakeSubjects = useMemo(() => {
    const set = new Set<string>();
    mistakes.forEach((m) => {
      if (m.subjectName) set.add(m.subjectName);
    });
    return Array.from(set);
  }, [mistakes]);

  const filteredMistakes = useMemo(() => {
    if (mistakesSubjectFilter === 'ALL') return mistakes;
    return mistakes.filter((m) => m.subjectName === mistakesSubjectFilter);
  }, [mistakes, mistakesSubjectFilter]);

  const bookmarkSubjects = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach((b) => {
      if (b.subjectName) set.add(b.subjectName);
    });
    return Array.from(set);
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    if (bookmarksSubjectFilter === 'ALL') return bookmarks;
    return bookmarks.filter((b) => b.subjectName === bookmarksSubjectFilter);
  }, [bookmarks, bookmarksSubjectFilter]);

  const formatStudyTime = (mins: number) => {
    if (mins < 60) return isArabic ? `${mins} د` : `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return isArabic ? `${hrs} س ${rem} د` : `${hrs}h ${rem}m`;
  };

  // Image upload for Student Private Quiz AI Creator
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const filesArray: File[] = Array.from(files);
    e.target.value = '';

    for (const file of filesArray) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file, 1600, 0.82);
        if (compressed.data) {
          setAiImages((prev) => [
            ...prev.slice(0, 29),
            {
              id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: compressed.name || file.name,
              data: compressed.data,
              mimeType: compressed.mimeType,
            },
          ]);
        }
      } catch (err) {
        console.error('Image compression failed:', err);
      }
    }
  };

  const resetCreatorState = () => {
    setShowCreatorForm(false);
    setEditingPrivateId(null);
    setPqSubjectName('');
    setPqTitle('');
    setPqDescription('');
    setPqTimeLimit(0);
    setAiSourceText('');
    setAiImages([]);
    setAiError(null);
    setReviewedQuestions(null);
    setReviewedTitle('');
    setReviewedDesc('');
    setShowAppendAiPanel(false);
    setAppendAiText('');
    setAppendAiImages([]);
    setAppendAiError(null);
    clearWipDraft();
  };

  const handleAppendImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const filesArray: File[] = Array.from(files);
    e.target.value = '';

    for (const file of filesArray) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file, 1600, 0.82);
        if (compressed.data) {
          setAppendAiImages((prev) => [
            ...prev.slice(0, 29),
            {
              id: `app_img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: compressed.name || file.name,
              data: compressed.data,
              mimeType: compressed.mimeType,
            },
          ]);
        }
      } catch (err) {
        console.error('Append image compression failed:', err);
      }
    }
  };

  const handleAppendPrivateQuestions = async () => {
    if (!studentUser) return;
    if (!appendAiText.trim() && appendAiImages.length === 0) {
      showToast(isArabic ? 'يرجى إدخال نص أو رفع صورة واحدة على الأقل للدفعة الجديدة.' : 'Enter text or upload an image first.');
      return;
    }

    const isFormatMode = appendAiMode === 'format_existing';
    const mcqs = Math.max(0, Number(appendAiMcqCount) || 0);
    const writtens = Math.max(0, Number(appendAiWrittenCount) || 0);
    if (!isFormatMode && mcqs === 0 && writtens === 0) {
      showToast(isArabic ? 'حدد عدد الأسئلة أولاً.' : 'Specify question counts.');
      return;
    }

    setAppendAiGenerating(true);
    setAppendAiError(null);

    try {
      const res = await generateQuizFromAI({
        content: appendAiText.trim(),
        images: appendAiImages.map((img) => ({ data: img.data, mimeType: img.mimeType })),
        mode: appendAiMode,
        ...(isFormatMode
          ? {}
          : {
              count: mcqs + writtens,
              mcqCount: mcqs,
              writtenCount: writtens,
              questionType: mcqs > 0 && writtens > 0 ? 'mixed' : mcqs > 0 ? 'mcq' : 'written',
              difficulty: appendAiDifficulty,
            }),
        language: appendAiLanguage,
        lectureTitle: reviewedTitle.trim() || pqTitle.trim() || undefined,
        userRole: 'student',
        userId: studentUser.uid,
      });

      if (res.quota) {
        setAiQuotaDirect(res.quota);
      }

      if (!res.questions || res.questions.length === 0) {
        setAppendAiError(isArabic ? 'لم يتم استخراج أسئلة واضحة من المحتوى الإضافي.' : 'Could not extract clear questions.');
        return;
      }

      const stamp = Date.now();
      const uniqueNewQuestions: Question[] = res.questions.map((q, idx) => ({
        ...q,
        id: `pq_q_${stamp}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        lecture: reviewedTitle.trim() || q.lecture || 'Private Quiz',
      }));

      setReviewedQuestions((prev) => [...(prev || []), ...uniqueNewQuestions]);
      setAppendAiText('');
      setAppendAiImages([]);
      setAppendAiError(null);
      setShowAppendAiPanel(false);

      showToast(
        isArabic
          ? `تمت إضافة ${uniqueNewQuestions.length} سؤال جديد إلى القائمة بنجاح!`
          : `Added ${uniqueNewQuestions.length} new question(s) to the list!`
      );
    } catch (err: any) {
      setAppendAiError(err?.message || (isArabic ? 'حدث خطأ أثناء معالجة المحتوى الإضافي.' : 'AI processing failed.'));
    } finally {
      setAppendAiGenerating(false);
    }
  };

  const handleGeneratePrivateQuiz = async () => {
    if (!studentUser) return;
    if (!aiSourceText.trim() && aiImages.length === 0) {
      showToast(isArabic ? 'يرجى إدخال نص أو رفع صورة واحدة على الأقل.' : 'Enter text or upload an image first.');
      return;
    }

    const isFormatMode = aiInputMode === 'format_existing';
    const mcqs = Math.max(0, Number(aiMcqCount) || 0);
    const writtens = Math.max(0, Number(aiWrittenCount) || 0);
    if (!isFormatMode && mcqs === 0 && writtens === 0) {
      showToast(isArabic ? 'حدد عدد الأسئلة أولاً.' : 'Specify question counts.');
      return;
    }

    setAiGenerating(true);
    setAiError(null);

    try {
      const res = await generateQuizFromAI({
        content: aiSourceText.trim(),
        images: aiImages.map((img) => ({ data: img.data, mimeType: img.mimeType })),
        mode: aiInputMode,
        ...(isFormatMode
          ? {}
          : {
              count: mcqs + writtens,
              mcqCount: mcqs,
              writtenCount: writtens,
              questionType: mcqs > 0 && writtens > 0 ? 'mixed' : mcqs > 0 ? 'mcq' : 'written',
              difficulty: aiDifficulty,
            }),
        language: aiLanguage,
        lectureTitle: pqTitle.trim() || undefined,
        userRole: 'student',
        userId: studentUser.uid,
      });

      if (res.quota) {
        setAiQuotaDirect(res.quota);
      }

      if (!res.questions || res.questions.length === 0) {
        setAiError(isArabic ? 'لم يتم استخراج أسئلة واضحة من المحتوى المرفق.' : 'Could not extract clear questions.');
        return;
      }

      setReviewedQuestions(res.questions);
      setReviewedTitle(pqTitle.trim() || res.quizTitle || (isArabic ? 'اختباري الخاص' : 'My Private Quiz'));
      setReviewedDesc(pqDescription.trim() || res.description || '');
      showToast(
        isArabic
          ? `تم تجهيز ${res.questions.length} سؤال! راجعها ثم احفظ الاختبار في حسابك.`
          : `Prepared ${res.questions.length} questions! Review and save privately.`
      );
    } catch (err: any) {
      setAiError(err?.message || (isArabic ? 'حدث خطأ أثناء معالجة المحتوى.' : 'AI processing failed.'));
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSavePrivateQuiz = async () => {
    if (!studentUser || !reviewedQuestions || reviewedQuestions.length === 0) return;

    setSavingPrivate(true);
    try {
      const cleanedQuestions: Question[] = reviewedQuestions.map(({ isAiSuggestedAnswer, ...rest }) => rest);
      const existing = editingPrivateId ? privateQuizzes.find((p) => p.id === editingPrivateId) : null;
      const quizObj: PrivateQuiz = {
        id: existing ? existing.id : sanitizeDocId(`pq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, 'pq'),
        userId: studentUser.uid,
        title: reviewedTitle.trim() || pqTitle.trim() || (isArabic ? 'اختبار خاص' : 'Private Quiz'),
        subjectName: pqSubjectName.trim() || subjects[0]?.name || (isArabic ? 'عام' : 'General'),
        description: reviewedDesc.trim() || pqDescription.trim(),
        timeLimitMinutes: Math.max(0, Number(pqTimeLimit) || 0),
        questions: cleanedQuestions,
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPrivate: true,
      };

      await savePrivateQuiz(quizObj, Boolean(existing));
      showToast(
        isArabic
          ? `تم حفظ الاختبار الخاص "${quizObj.title}" في حسابك بنجاح.`
          : `Saved private quiz "${quizObj.title}".`
      );
      resetCreatorState();
    } catch (err: any) {
      showToast(err?.message || (isArabic ? 'تعذر حفظ الاختبار الخاص.' : 'Could not save private quiz.'));
    } finally {
      setSavingPrivate(false);
    }
  };

  const handleEditPrivateQuiz = (pq: PrivateQuiz) => {
    setEditingPrivateId(pq.id);
    setPqSubjectName(pq.subjectName || '');
    setPqTitle(pq.title);
    setPqDescription(pq.description || '');
    setPqTimeLimit(pq.timeLimitMinutes || 0);
    setReviewedTitle(pq.title);
    setReviewedDesc(pq.description || '');
    setReviewedQuestions(pq.questions.map((q) => ({ ...q })));
    setShowAppendAiPanel(false);
    setAppendAiText('');
    setAppendAiImages([]);
    setAppendAiError(null);
    setShowCreatorForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateReviewedQuestion = (qIdx: number, fields: Partial<Question>) => {
    if (!reviewedQuestions) return;
    const next = [...reviewedQuestions];
    next[qIdx] = { ...next[qIdx], ...fields };
    setReviewedQuestions(next);
  };

  const handleMoveReviewedQuestion = (qIdx: number, dir: 'up' | 'down') => {
    if (!reviewedQuestions) return;
    const target = dir === 'up' ? qIdx - 1 : qIdx + 1;
    if (target < 0 || target >= reviewedQuestions.length) return;
    const next = [...reviewedQuestions];
    const tmp = next[qIdx];
    next[qIdx] = next[target];
    next[target] = tmp;
    setReviewedQuestions(next);
  };

  const handleAddOptionToReviewed = (qIdx: number) => {
    if (!reviewedQuestions) return;
    const q = reviewedQuestions[qIdx];
    const letter = String.fromCharCode(65 + q.options.length);
    handleUpdateReviewedQuestion(qIdx, {
      options: [...q.options, `${isArabic ? 'خيار جديد' : 'Option'} ${letter}`],
    });
  };

  const handleRemoveOptionFromReviewed = (qIdx: number, optIdx: number) => {
    if (!reviewedQuestions) return;
    const q = reviewedQuestions[qIdx];
    if (q.options.length <= 2) {
      showToast(isArabic ? 'يجب الإبقاء على خيارين على الأقل.' : 'Minimum 2 options required.');
      return;
    }
    const removed = q.options[optIdx];
    const nextOpts = q.options.filter((_, idx) => idx !== optIdx);
    handleUpdateReviewedQuestion(qIdx, {
      options: nextOpts,
      correctAnswer: q.correctAnswer === removed ? nextOpts[0] : q.correctAnswer,
    });
  };

  const handleUploadQuestionImage = async (qIdx: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const compressed = await compressImage(file, 1400, 0.85);
      if (compressed.data) {
        handleUpdateReviewedQuestion(qIdx, { imageURL: compressed.data, requiresImage: true });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Loading auth state
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isArabic ? 'جاري التحقق من الجلسة...' : 'Checking student session...'}
        </p>
      </div>
    );
  }

  // Signed-out Gate View
  if (!studentUser) {
    return (
      <div className="max-w-xl mx-auto py-12 sm:py-16 px-4 sm:px-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto mb-4">
            <User className="w-6 h-6" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {isArabic ? 'لوحة الطالب الذكية' : 'Student Hub'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
            {isArabic
              ? 'سجّل الدخول بحساب Google لحفظ جميع نتائجك، تتبع نقاط قوتك وضعفك، مراجعة أخطائك، وإنشاء اختبارات خاصة بك غير منشورة.'
              : 'Sign in with Google to save quiz history, track subject mastery, drill your Mistakes Bank, and create private AI quizzes.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-start mb-6">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                <Award className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{isArabic ? 'سجل النتائج والمحاولات' : 'Results & Analytics'}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isArabic ? 'راجع جميع إجاباتك الصح والخطأ في أي وقت.' : 'Review every past attempt and accuracy by subject.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{isArabic ? 'بنك الأخطاء التلقائي' : 'Auto Mistakes Bank'}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isArabic ? 'يجمع الأسئلة التي أخطأت بها للتدرب عليها مجدداً.' : 'Collects missed questions so you can practice and master them.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{isArabic ? 'الأسئلة المحفوظة' : 'Saved Bookmarks'}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isArabic ? 'احفظ أي سؤال مهم أثناء الحل للرجوع إليه لاحقاً.' : 'Bookmark tricky questions during quizzes for quick flashcards.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isArabic ? 'اختباراتك الخاصة' : 'Private AI Quizzes'}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isArabic ? 'أنشئ اختبارات من محاضراتك بالـ AI خاصة بحسابك فقط.' : 'Generate or format quizzes from your notes—visible only to you.'}
              </p>
            </div>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2 text-start">
              <span>{authError}</span>
              <button type="button" onClick={clearAuthError} className="shrink-0 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              disabled={authBusy}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {authBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>{isArabic ? 'تسجيل الدخول بحساب Google' : 'Sign in with Google'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/courses')}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('backToCoursesBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reviewing a past attempt full-view
  if (reviewingAttempt) {
    const attemptAsQuiz: Quiz = {
      id: reviewingAttempt.quizId,
      title: reviewingAttempt.quizTitle,
      subjectId: reviewingAttempt.subjectId,
      topicId: reviewingAttempt.topicId,
      questions: reviewingAttempt.questions,
      createdAt: reviewingAttempt.completedAt,
      updatedAt: reviewingAttempt.completedAt,
    };
    const totalMCQs = reviewingAttempt.questions.filter((q) => q.type !== 'written').length;
    const totalWritten = reviewingAttempt.questions.filter((q) => q.type === 'written').length;

    return (
      <QuizResults
        quiz={attemptAsQuiz}
        score={reviewingAttempt.score}
        totalMCQs={totalMCQs}
        totalWritten={totalWritten}
        userAnswers={reviewingAttempt.userAnswers || {}}
        writtenInputData={reviewingAttempt.writtenInputData || {}}
        writtenGradingData={reviewingAttempt.writtenGradingData || {}}
        questions={reviewingAttempt.questions}
        timeSpentSeconds={reviewingAttempt.timeSpentSeconds}
        initialReviewMode={true}
        initialReviewFilter="all"
        onRetake={() => {
          const targetId = reviewingAttempt.quizId;
          const isPriv = reviewingAttempt.isPrivateQuiz;
          setReviewingAttempt(null);
          navigate(isPriv ? `/student/quiz/${targetId}` : `/quiz/${targetId}`);
        }}
        onBackToSubjects={() => setReviewingAttempt(null)}
        isStudentSignedIn={true}
        isQuestionBookmarked={(q) => isQuestionBookmarked(reviewingAttempt.quizId, q)}
        onToggleBookmark={(q) =>
          toggleBookmarkQuestion({
            quiz: { id: reviewingAttempt.quizId, title: reviewingAttempt.quizTitle, subjectId: reviewingAttempt.subjectId },
            subjectName: reviewingAttempt.subjectName,
            question: q,
          })
        }
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl shadow-md text-xs sm:text-sm font-semibold flex items-center gap-2 border border-zinc-800 dark:border-zinc-200 max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3.5 min-w-0">
          {studentProfile?.photoURL && !avatarFailed ? (
            <img
              src={studentProfile.photoURL}
              alt={studentProfile.displayName}
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0 text-start">
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {studentProfile?.displayName}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {studentProfile?.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('private_quizzes');
              setShowCreatorForm(true);
            }}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? 'إنشاء اختبار خاص' : 'New Private Quiz'}</span>
          </button>

          <button
            type="button"
            onClick={() => signOutStudent()}
            disabled={authBusy}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logoutBtn')}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 min-h-[38px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{isArabic ? 'النظرة العامة والنتائج' : 'Overview & History'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mistakes')}
          className={`flex items-center gap-2 px-4 min-h-[38px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 tabular-nums ${
            activeTab === 'mistakes'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>{isArabic ? `بنك الأخطاء (${mistakes.length})` : `Mistakes Bank (${mistakes.length})`}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 px-4 min-h-[38px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 tabular-nums ${
            activeTab === 'bookmarks'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>{isArabic ? `المحفوظات (${bookmarks.length})` : `Bookmarks (${bookmarks.length})`}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('private_quizzes')}
          className={`flex items-center gap-2 px-4 min-h-[38px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 tabular-nums ${
            activeTab === 'private_quizzes'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{isArabic ? `اختباراتي الخاصة (${privateQuizzes.length})` : `Private Quizzes (${privateQuizzes.length})`}</span>
        </button>
      </div>

      {dataLoading && (
        <div className="mb-6 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5 text-xs text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>{isArabic ? 'جاري مزامنة بياناتك...' : 'Syncing your dashboard data...'}</span>
        </div>
      )}

      {/* TAB 1: Overview & History */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                {isArabic ? 'الاختبارات المكتملة' : 'Completed Quizzes'}
              </span>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums mt-1">
                {stats.totalAttempts}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Award className="w-4 h-4" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                {isArabic ? 'متوسط الدرجات' : 'Average Score'}
              </span>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums mt-1">
                {stats.avgScore}%
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mb-3">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                {isArabic ? 'إجمالي وقت الدراسة' : 'Total Study Time'}
              </span>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums mt-1">
                {formatStudyTime(stats.totalMinutes)}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <Bookmark className="w-4 h-4" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                {isArabic ? 'بنك الأخطاء والمحفوظات' : 'Mistakes & Saved'}
              </span>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums mt-1">
                {stats.bankCount}
              </p>
            </div>
          </div>

          {/* Resume In-Progress Quizzes */}
          {inProgressEntries.length > 0 && (
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3 text-start">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{isArabic ? 'اختبارات قيد التقدم (لم تكتمل بعد)' : 'Resume Incomplete Quizzes'}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {inProgressEntries.map((entry) => (
                  <div
                    key={entry.quizId}
                    className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {entry.title}
                      </p>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {entry.answeredCount}/{entry.totalQuestions || '?'} {isArabic ? 'تم الحل' : 'answered'}
                        {entry.isPrivate ? (isArabic ? ' · اختبار خاص' : ' · Private') : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(entry.isPrivate ? `/student/quiz/${entry.quizId}` : `/quiz/${entry.quizId}`)
                        }
                        className="inline-flex items-center gap-1 min-h-[34px] px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{isArabic ? 'متابعة' : 'Resume'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearQuizProgress(entry.quizId);
                          setDismissedProgressIds((prev) => [...prev, entry.quizId]);
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title={isArabic ? 'مسح' : 'Discard'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Subject Mastery */}
          {subjectMastery.length > 0 && (
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 text-start">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50">
                {isArabic ? 'الأداء حسب المادة' : 'Subject Mastery'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {subjectMastery.map((sub) => (
                  <div
                    key={sub.subjectName}
                    className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {sub.subjectName}
                      </span>
                      <span className="font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums shrink-0">
                        {sub.avgPct}% · {sub.attempts} {isArabic ? 'محاولة' : 'attempts'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sub.avgPct >= 75
                            ? 'bg-emerald-600'
                            : sub.avgPct >= 50
                            ? 'bg-blue-600'
                            : 'bg-rose-600'
                        }`}
                        style={{ width: `${sub.avgPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Attempts History */}
          <section className="space-y-3 text-start">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50">
              {isArabic ? `سجل المحاولات (${attempts.length})` : `Completed Attempts (${attempts.length})`}
            </h2>

            {attempts.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
                <BookOpen className="w-9 h-9 text-zinc-400 mx-auto mb-3" />
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {isArabic ? 'لا توجد اختبارات مكتملة بعد' : 'No completed quizzes yet'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4">
                  {isArabic
                    ? 'ابدأ بحل أي اختبار وستُحفظ نتائجك وأخطاؤك هنا تلقائياً.'
                    : 'Take any quiz while signed in and your score history will appear here.'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/courses')}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'تصفح المقررات' : 'Browse Courses'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((att) => (
                  <div
                    key={att.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {att.subjectName}
                        </span>
                        {att.isPrivateQuiz && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {isArabic ? 'اختبار خاص' : 'Private Quiz'}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span>{new Date(att.completedAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}</span>
                        <span>·</span>
                        <span>{Math.floor(att.timeSpentSeconds / 60)}m {att.timeSpentSeconds % 60}s</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 truncate">
                        {att.quizTitle}
                      </h3>
                      <p className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                        {isArabic ? 'الدرجة:' : 'Score:'}{' '}
                        <span
                          className={
                            att.percentage >= 75
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : att.percentage >= 50
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {att.score}/{att.totalQuestions} ({att.percentage}%)
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setReviewingAttempt(att)}
                        className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'مراجعة الأسئلة' : 'Review Answers'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(att.isPrivateQuiz ? `/student/quiz/${att.quizId}` : `/quiz/${att.quizId}`)
                        }
                        className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'إعادة' : 'Retake'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            message: isArabic ? 'حذف هذه المحاولة من السجل؟' : 'Delete this attempt from history?',
                            onConfirm: () => {
                              removeAttemptById(att.id);
                              showToast(isArabic ? 'تم حذف المحاولة.' : 'Attempt deleted.');
                            },
                          })
                        }
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: Mistakes Bank */}
      {activeTab === 'mistakes' && (
        <div className="space-y-5 text-start">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {isArabic ? 'بنك الأخطاء التلقائي' : 'Mistakes Bank'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isArabic
                  ? 'كل سؤال أخطأت فيه يُجمع هنا. تدرب عليها وحلها بشكل صحيح لإزالتها تلقائياً.'
                  : 'Missed questions are collected here. Solve them right during practice to clear them.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {mistakeSubjects.length > 0 && (
                <select
                  value={mistakesSubjectFilter}
                  onChange={(e) => setMistakesSubjectFilter(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 min-h-[38px] text-xs font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  <option value="ALL">{isArabic ? 'كل المواد' : 'All Subjects'}</option>
                  {mistakeSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              )}

              {filteredMistakes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const q =
                      mistakesSubjectFilter !== 'ALL'
                        ? `?subject=${encodeURIComponent(mistakesSubjectFilter)}`
                        : '';
                    navigate(`/student/practice/mistakes${q}`);
                  }}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer tabular-nums"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {isArabic
                      ? `ابدأ اختبار من أخطائك (${filteredMistakes.length})`
                      : `Practice Mistakes (${filteredMistakes.length})`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {filteredMistakes.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isArabic ? 'بنك الأخطاء فارغ!' : 'No Mistakes Recorded'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {isArabic
                  ? 'أحسنت! أي أسئلة تخطئ فيها مستقبلاً ستظهر هنا للمراجعة.'
                  : 'Great work! Any questions missed in future quizzes will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMistakes.map((m) => {
                const isRevealed = Boolean(revealedMistakeIds[m.id]);
                return (
                  <div
                    key={m.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{m.subjectName}</span>
                        <span>·</span>
                        <span>{m.quizTitle}</span>
                        {m.wrongCount > 1 && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                              {isArabic ? `تكرر الخطأ ${m.wrongCount} مرات` : `Missed ${m.wrongCount}×`}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedMistakeIds((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                          }
                          className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{isRevealed ? (isArabic ? 'إخفاء' : 'Hide') : isArabic ? 'الإجابة' : 'Answer'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            removeMistakeById(m.id);
                            showToast(isArabic ? 'تمت إزالة السؤال من بنك الأخطاء.' : 'Removed from Mistakes Bank.');
                          }}
                          className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isArabic ? 'تم الإتقان' : 'Mastered'}</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50 leading-relaxed" dir="auto">
                      {m.question.question}
                    </p>

                    {m.question.imageURL && (
                      <img
                        src={m.question.imageURL}
                        alt="Visual"
                        className="max-h-48 rounded-xl border border-zinc-200 dark:border-zinc-800 object-contain"
                      />
                    )}

                    {m.lastWrongAnswer && (
                      <p className="text-xs text-rose-600 dark:text-rose-400">
                        <span className="font-semibold">{isArabic ? 'آخر إجابة خاطئة:' : 'Last wrong answer:'}</span>{' '}
                        {m.lastWrongAnswer}
                      </p>
                    )}

                    {isRevealed && (
                      <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                        <span className="font-semibold block text-[11px] mb-0.5 text-emerald-700 dark:text-emerald-400">
                          {isArabic ? 'الإجابة الصحيحة:' : 'Correct Answer:'}
                        </span>
                        <span dir="auto">{m.question.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-5 text-start">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {isArabic ? 'الأسئلة المحفوظة' : 'Saved Questions'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isArabic
                  ? 'الأسئلة التي حفظتها أثناء حل الاختبارات للمراجعة السريعة.'
                  : 'Questions you bookmarked across quizzes for quick flashcard review.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {bookmarkSubjects.length > 0 && (
                <select
                  value={bookmarksSubjectFilter}
                  onChange={(e) => setBookmarksSubjectFilter(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 min-h-[38px] text-xs font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  <option value="ALL">{isArabic ? 'كل المواد' : 'All Subjects'}</option>
                  {bookmarkSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              )}

              {filteredBookmarks.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setFlashcardsData({
                        title: isArabic ? 'بطاقات الأسئلة المحفوظة' : 'Saved Bookmarks Flashcards',
                        questions: filteredBookmarks.map((b) => b.question),
                      })
                    }
                    className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer tabular-nums"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isArabic ? 'وضع البطاقات' : 'Flashcards'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const q =
                        bookmarksSubjectFilter !== 'ALL'
                          ? `?subject=${encodeURIComponent(bookmarksSubjectFilter)}`
                          : '';
                      navigate(`/student/practice/bookmarks${q}`);
                    }}
                    className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer tabular-nums"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {isArabic
                        ? `تدرب على المحفوظات (${filteredBookmarks.length})`
                        : `Practice Bookmarks (${filteredBookmarks.length})`}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          {filteredBookmarks.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
              <Bookmark className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isArabic ? 'لا توجد أسئلة محفوظة بعد' : 'No bookmarked questions yet'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {isArabic
                  ? 'اضغط على أيقونة "حفظ" بجانب أي سؤال أثناء الاختبار لإضافته هنا.'
                  : 'Click "Save" on any question during a quiz or review to keep it here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookmarks.map((bm) => {
                const isRevealed = Boolean(revealedBookmarkIds[bm.id]);
                return (
                  <div
                    key={bm.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{bm.subjectName}</span>
                        <span>·</span>
                        <span>{bm.quizTitle}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedBookmarkIds((prev) => ({ ...prev, [bm.id]: !prev[bm.id] }))
                          }
                          className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{isRevealed ? (isArabic ? 'إخفاء الإجابة' : 'Hide Answer') : isArabic ? 'كشف الإجابة' : 'Reveal Answer'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            removeBookmarkById(bm.id);
                            showToast(isArabic ? 'تمت إزالة السؤال من المحفوظات.' : 'Bookmark removed.');
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50 leading-relaxed" dir="auto">
                      {bm.question.question}
                    </p>

                    {bm.question.options && bm.question.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {bm.question.options.map((opt, idx) => {
                          const isCorr = opt === bm.question.correctAnswer;
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border ${
                                isRevealed && isCorr
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-semibold'
                                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                              }`}
                              dir="auto"
                            >
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isRevealed && (!bm.question.options || bm.question.options.length === 0) && (
                      <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                        <span className="font-semibold block text-[11px] mb-0.5 text-emerald-700 dark:text-emerald-400">
                          {isArabic ? 'الإجابة النموذجية:' : 'Model Answer:'}
                        </span>
                        <span dir="auto">{bm.question.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Private Student Quizzes */}
      {activeTab === 'private_quizzes' && (
        <div className="space-y-6 text-start">
          {/* Quota + Header Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {isArabic ? 'اختباراتي الخاصة (غير منشورة)' : 'My Private Quizzes'}
                </h2>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isArabic
                  ? 'تُحفظ هذه الاختبارات داخل حسابك الشخصي فقط ولا تظهر للطلاب الآخرين على الموقع.'
                  : 'Saved strictly inside your personal account—never published to public courses.'}
              </p>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                {isArabic
                  ? `رصيد التوليد اليومي بالذكاء الاصطناعي: متبقي ${aiQuota.remaining} من ${aiQuota.limit}`
                  : `Daily AI generation quota: ${aiQuota.remaining} / ${aiQuota.limit} remaining today`}
              </p>
            </div>

            {!showCreatorForm ? (
              <button
                type="button"
                onClick={() => setShowCreatorForm(true)}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shrink-0"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isArabic ? 'إنشاء اختبار جديد' : 'Create Private Quiz'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={resetCreatorState}
                className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
                <span>{t('cancel')}</span>
              </button>
            )}
          </div>

          {/* WIP Auto-Save Recovery Banner */}
          {recoverableWip && !reviewedQuestions && (
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100">
                  {isArabic
                    ? `توجد مسودة عمل غير محفوظة (${recoverableWip.reviewedQuestions.length} سؤال)`
                    : `Auto-saved unsaved quiz draft (${recoverableWip.reviewedQuestions.length} questions)`}
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-200/80 mt-0.5">
                  {recoverableWip.reviewedTitle || recoverableWip.pqTitle || (isArabic ? 'اختبار خاص' : 'Private Quiz')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={clearWipDraft}
                  className="min-h-[34px] px-3 rounded-lg text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer"
                >
                  {isArabic ? 'تجاهل' : 'Discard'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPrivateId(recoverableWip.editingPrivateId);
                    setPqSubjectName(recoverableWip.pqSubjectName);
                    setPqTitle(recoverableWip.pqTitle);
                    setPqDescription(recoverableWip.pqDescription);
                    setPqTimeLimit(recoverableWip.pqTimeLimit);
                    setReviewedTitle(recoverableWip.reviewedTitle);
                    setReviewedDesc(recoverableWip.reviewedDesc);
                    setReviewedQuestions(recoverableWip.reviewedQuestions);
                    setShowCreatorForm(true);
                    setRecoverableWip(null);
                    showToast(isArabic ? 'تمت استعادة المسودة بنجاح!' : 'Draft restored!');
                  }}
                  className="min-h-[34px] px-3.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  {isArabic ? 'استعادة العمل' : 'Restore Draft'}
                </button>
              </div>
            </div>
          )}

          {/* Creator / Editor Panel */}
          {showCreatorForm && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {isArabic ? 'اسم المادة / التصنيف:' : 'Subject / Category:'}
                  </label>
                  <input
                    type="text"
                    value={pqSubjectName}
                    onChange={(e) => setPqSubjectName(e.target.value)}
                    list="public-subjects-suggestions"
                    placeholder={isArabic ? 'مثال: باطنة، تشريح، برمجة...' : 'e.g. Anatomy, Algorithms...'}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[40px] text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                    dir="auto"
                  />
                  <datalist id="public-subjects-suggestions">
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {isArabic ? 'عنوان الاختبار (اختياري):' : 'Quiz Title (Optional):'}
                  </label>
                  <input
                    type="text"
                    value={reviewedQuestions ? reviewedTitle : pqTitle}
                    onChange={(e) =>
                      reviewedQuestions ? setReviewedTitle(e.target.value) : setPqTitle(e.target.value)
                    }
                    placeholder={isArabic ? 'يستخلص تلقائياً إن تُرك فارغاً' : 'Auto-detected if blank'}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[40px] text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                    dir="auto"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {t('timeLimitLabel')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={pqTimeLimit}
                    onChange={(e) => setPqTimeLimit(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[40px] text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 tabular-nums"
                  />
                </div>
              </div>

              {reviewedQuestions ? (
                /* Interactive Cards Review Mode */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
                        {isArabic
                          ? `مراجعة الأسئلة (${reviewedQuestions.length} سؤال)`
                          : `Review Questions (${reviewedQuestions.length})`}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {isArabic
                          ? 'راجع الأسئلة وعدّل أي خيار أو إجابة قبل الحفظ في حسابك.'
                          : 'Inspect or tweak any question before saving privately.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAppendAiMode(aiInputMode);
                          setAppendAiError(null);
                          setShowAppendAiPanel((prev) => !prev);
                        }}
                        className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          showAppendAiPanel
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'إضافة أسئلة بالـ AI' : 'Add via AI'}</span>
                      </button>
                      {!editingPrivateId && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAppendAiPanel(false);
                            setReviewedQuestions(null);
                          }}
                          className="min-h-[36px] px-3 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer"
                        >
                          {isArabic ? 'رجوع للمصدر' : 'Back to Input'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSavePrivateQuiz}
                        disabled={savingPrivate}
                        className="inline-flex items-center gap-1.5 min-h-[38px] px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
                      >
                        {savingPrivate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{isArabic ? 'حفظ في اختباراتي الخاصة' : 'Save Private Quiz'}</span>
                      </button>
                    </div>
                  </div>

                  {reviewedQuestions.map((q, qIdx) => {
                    const isAiSuggested = Boolean(q.isAiSuggestedAnswer);
                    return (
                      <div
                        key={q.id || qIdx}
                        className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                          isAiSuggested
                            ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-300 dark:border-amber-700/70'
                            : 'bg-zinc-50/60 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                              #{qIdx + 1}
                            </span>
                            <select
                              value={q.type}
                              onChange={(e) => {
                                const newType = e.target.value as 'mcq' | 'written';
                                handleUpdateReviewedQuestion(qIdx, {
                                  type: newType,
                                  options:
                                    newType === 'mcq'
                                      ? q.options && q.options.length >= 2
                                        ? q.options
                                        : [
                                            isArabic ? 'الخيار أ' : 'Option A',
                                            isArabic ? 'الخيار ب' : 'Option B',
                                            isArabic ? 'الخيار ج' : 'Option C',
                                            isArabic ? 'الخيار د' : 'Option D',
                                          ]
                                      : [],
                                  correctAnswer:
                                    newType === 'mcq'
                                      ? (q.options && q.options[0]) || (isArabic ? 'الخيار أ' : 'Option A')
                                      : q.correctAnswer || (isArabic ? 'الإجابة النموذجية' : 'Model Answer'),
                                });
                              }}
                              className="text-xs font-semibold rounded-lg px-2 py-1 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                            >
                              <option value="mcq">{isArabic ? 'اختيار من متعدد' : 'MCQ'}</option>
                              <option value="written">{isArabic ? 'مقالي' : 'Written'}</option>
                            </select>
                            {isAiSuggested && (
                              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{isArabic ? 'إجابة مقترحة من AI' : 'AI Suggested Answer'}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isAiSuggested && (
                              <button
                                type="button"
                                onClick={() => handleUpdateReviewedQuestion(qIdx, { isAiSuggestedAnswer: false })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>{isArabic ? 'اعتماد' : 'Confirm'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={qIdx === 0}
                              onClick={() => handleMoveReviewedQuestion(qIdx, 'up')}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                              title={isArabic ? 'تحريك لأعلى' : 'Move up'}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={!reviewedQuestions || qIdx === reviewedQuestions.length - 1}
                              onClick={() => handleMoveReviewedQuestion(qIdx, 'down')}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                              title={isArabic ? 'تحريك لأسفل' : 'Move down'}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer">
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>{isArabic ? 'صورة' : 'Image'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleUploadQuestionImage(qIdx, f);
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() =>
                                setReviewedQuestions((prev) =>
                                  prev ? prev.filter((_, i) => i !== qIdx) : null
                                )
                              }
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={q.question}
                          onChange={(e) => handleUpdateReviewedQuestion(qIdx, { question: e.target.value })}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                          dir="auto"
                        />

                        {q.imageURL && (
                          <div className="flex items-center gap-3">
                            <img src={q.imageURL} alt="Visual" className="max-h-32 rounded-lg border border-zinc-200 dark:border-zinc-800" />
                            <button
                              type="button"
                              onClick={() => handleUpdateReviewedQuestion(qIdx, { imageURL: null })}
                              className="text-xs text-rose-600 hover:underline cursor-pointer"
                            >
                              {isArabic ? 'إزالة الصورة' : 'Remove image'}
                            </button>
                          </div>
                        )}

                        {q.type === 'mcq' ? (
                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorr = q.correctAnswer === opt;
                              return (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateReviewedQuestion(qIdx, {
                                        correctAnswer: opt,
                                        isAiSuggestedAnswer: false,
                                      })
                                    }
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 cursor-pointer ${
                                      isCorr
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-400'
                                    }`}
                                    title={isArabic ? 'تعيين كإجابة صحيحة' : 'Mark as correct'}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const updatedOpts = [...q.options];
                                      const oldOpt = updatedOpts[optIdx];
                                      updatedOpts[optIdx] = e.target.value;
                                      handleUpdateReviewedQuestion(qIdx, {
                                        options: updatedOpts,
                                        correctAnswer: q.correctAnswer === oldOpt ? e.target.value : q.correctAnswer,
                                      });
                                    }}
                                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 min-h-[36px] text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500"
                                    dir="auto"
                                  />
                                  {q.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOptionFromReviewed(qIdx, optIdx)}
                                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 cursor-pointer"
                                      title={isArabic ? 'حذف الخيار' : 'Remove option'}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => handleAddOptionToReviewed(qIdx)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isArabic ? 'إضافة خيار' : 'Add Option'}</span>
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={q.correctAnswer}
                            onChange={(e) =>
                              handleUpdateReviewedQuestion(qIdx, {
                                correctAnswer: e.target.value,
                                isAiSuggestedAnswer: false,
                              })
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 min-h-[38px] text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 focus:outline-none focus:border-blue-500"
                            dir="auto"
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Add More Questions Actions (Manual or AI) */}
                  {!showAppendAiPanel ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAppendAiMode(aiInputMode);
                          setAppendAiError(null);
                          setShowAppendAiPanel(true);
                        }}
                        className="w-full min-h-[42px] px-4 border border-dashed border-blue-400 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/35 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>
                          {isArabic
                            ? 'إضافة أسئلة إضافية بالذكاء الاصطناعي (صور / نص)'
                            : 'Add More Questions via AI (Images / Text)'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setReviewedQuestions((prev) => [
                            ...(prev || []),
                            {
                              id: `pq_q_${Date.now()}`,
                              lecture: reviewedTitle || 'Private Quiz',
                              question: isArabic ? 'سؤال جديد' : 'New question',
                              type: 'mcq',
                              options: isArabic
                                ? ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع']
                                : ['Option A', 'Option B', 'Option C', 'Option D'],
                              correctAnswer: isArabic ? 'الخيار الأول' : 'Option A',
                            },
                          ])
                        }
                        className="w-full min-h-[42px] px-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:border-blue-500 hover:text-blue-600 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>{isArabic ? 'إضافة سؤال يدوياً' : 'Add Question Manually'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-zinc-50/80 dark:bg-zinc-950/70 p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>
                              {isArabic ? 'إضافة أسئلة جديدة للقائمة بالذكاء الاصطناعي' : 'Append Additional Questions via AI'}
                            </span>
                          </h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                            {isArabic
                              ? `تُضاف الأسئلة الجديدة بعد الأسئلة الحالية · المتبقي اليوم: ${aiQuota.remaining} من ${aiQuota.limit}`
                              : `New questions append below existing cards · Daily quota left: ${aiQuota.remaining}/${aiQuota.limit}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAppendAiPanel(false)}
                          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                          aria-label={isArabic ? 'إغلاق' : 'Close'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setAppendAiMode('generate')}
                          className={`flex items-center gap-2 p-2.5 rounded-lg text-start text-xs font-bold transition-colors cursor-pointer ${
                            appendAiMode === 'generate'
                              ? 'bg-blue-600 text-white'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>{isArabic ? 'توليد أسئلة من محتوى' : 'Generate From Material'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAppendAiMode('format_existing')}
                          className={`flex items-center gap-2 p-2.5 rounded-lg text-start text-xs font-bold transition-colors cursor-pointer ${
                            appendAiMode === 'format_existing'
                              ? 'bg-blue-600 text-white'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <FileCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>{isArabic ? 'تنسيق أسئلة جاهزة' : 'Format Ready Questions'}</span>
                        </button>
                      </div>

                      <textarea
                        rows={4}
                        value={appendAiText}
                        onChange={(e) => setAppendAiText(e.target.value)}
                        placeholder={
                          appendAiMode === 'format_existing'
                            ? isArabic
                              ? 'الصق الأسئلة الجاهزة الإضافية هنا (أو ارفع صورها بالأسفل)...'
                              : 'Paste additional ready-made questions here (or upload images below)...'
                            : isArabic
                            ? 'الصق نصاً أو ملخصاً إضافياً لتوليد أسئلة منه...'
                            : 'Paste additional lecture notes or summary here...'
                        }
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                        dir="auto"
                      />

                      <div className="flex flex-wrap items-center gap-2.5">
                        <label className="inline-flex items-center gap-2 min-h-[38px] px-4 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:border-blue-500 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer border border-zinc-200 dark:border-zinc-700">
                          <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{isArabic ? 'رفع صور إضافية' : 'Upload Additional Images'}</span>
                          <input type="file" accept="image/*" multiple onChange={handleAppendImageUpload} className="hidden" />
                        </label>
                        <label className="inline-flex items-center gap-2 min-h-[38px] px-4 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:border-blue-500 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer border border-zinc-200 dark:border-zinc-700">
                          {pdfProcessingTarget === 'append' ? (
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                          ) : (
                            <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                          <span>{isArabic ? 'استيراد PDF' : 'Import PDF'}</span>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            disabled={pdfProcessingTarget === 'append'}
                            onChange={(e) => handlePdfUpload(e, 'append')}
                            className="hidden"
                          />
                        </label>
                        {appendAiImages.length > 0 && (
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                            {isArabic ? `${appendAiImages.length} صورة مرفقة` : `${appendAiImages.length} image(s) attached`}
                          </span>
                        )}
                      </div>

                      {appendAiImages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {appendAiImages.map((img) => (
                            <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                              <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setAppendAiImages((prev) => prev.filter((x) => x.id !== img.id))}
                                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        {appendAiMode === 'generate' && (
                          <>
                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                                {isArabic ? 'اختيار من متعدد:' : 'MCQ Count:'}
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                value={appendAiMcqCount}
                                onChange={(e) => setAppendAiMcqCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 min-h-[36px] text-xs font-semibold tabular-nums"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                                {isArabic ? 'مقالي:' : 'Written Count:'}
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="30"
                                value={appendAiWrittenCount}
                                onChange={(e) => setAppendAiWrittenCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 min-h-[36px] text-xs font-semibold tabular-nums"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                                {isArabic ? 'المستوى:' : 'Difficulty:'}
                              </label>
                              <select
                                value={appendAiDifficulty}
                                onChange={(e) => setAppendAiDifficulty(e.target.value as any)}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 min-h-[36px] text-xs font-medium cursor-pointer"
                              >
                                <option value="easy">{isArabic ? 'سهل' : 'Easy'}</option>
                                <option value="medium">{isArabic ? 'متوسط' : 'Medium'}</option>
                                <option value="hard">{isArabic ? 'صعب' : 'Hard'}</option>
                                <option value="mixed">{isArabic ? 'متنوع' : 'Mixed'}</option>
                              </select>
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                            {isArabic ? 'اللغة:' : 'Language:'}
                          </label>
                          <select
                            value={appendAiLanguage}
                            onChange={(e) => setAppendAiLanguage(e.target.value as any)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 min-h-[36px] text-xs font-medium cursor-pointer"
                          >
                            <option value="auto">{isArabic ? 'تلقائي' : 'Auto'}</option>
                            <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                            <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                          </select>
                        </div>
                      </div>

                      {appendAiError && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{appendAiError}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAppendAiPanel(false)}
                          className="min-h-[38px] px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={handleAppendPrivateQuestions}
                          disabled={appendAiGenerating || (!appendAiText.trim() && appendAiImages.length === 0) || aiQuota.remaining <= 0}
                          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-5 min-h-[38px] rounded-xl transition-colors cursor-pointer"
                        >
                          {appendAiGenerating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{isArabic ? 'جاري المعالجة...' : 'Processing...'}</span>
                            </>
                          ) : (
                            <>
                              {appendAiMode === 'format_existing' ? <FileCheck className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                              <span>
                                {appendAiMode === 'format_existing'
                                  ? isArabic
                                    ? 'استخراج وإضافة للقائمة'
                                    : 'Extract & Append'
                                  : isArabic
                                  ? 'توليد وإضافة للقائمة'
                                  : 'Generate & Append'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Source Input & Automated Mode Switch */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setAiInputMode('generate')}
                      className={`flex items-start gap-2.5 p-3 rounded-xl text-start transition-colors cursor-pointer ${
                        aiInputMode === 'generate'
                          ? 'bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-white/60 dark:hover:bg-zinc-900/50'
                      }`}
                    >
                      <Sparkles className={`w-4 h-4 mt-0.5 shrink-0 ${aiInputMode === 'generate' ? 'text-blue-600' : 'text-zinc-400'}`} />
                      <div>
                        <span className="text-xs sm:text-sm font-bold block text-zinc-900 dark:text-zinc-100">
                          {isArabic ? 'توليد أسئلة من محتوى' : 'Generate From Material'}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {isArabic ? 'الصق ملخصك أو صور المحاضرة وسيبني الـ AI أسئلة جديدة.' : 'AI builds new questions from your notes or images.'}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAiInputMode('format_existing')}
                      className={`flex items-start gap-2.5 p-3 rounded-xl text-start transition-colors cursor-pointer ${
                        aiInputMode === 'format_existing'
                          ? 'bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-white/60 dark:hover:bg-zinc-900/50'
                      }`}
                    >
                      <FileCheck className={`w-4 h-4 mt-0.5 shrink-0 ${aiInputMode === 'format_existing' ? 'text-blue-600' : 'text-zinc-400'}`} />
                      <div>
                        <span className="text-xs sm:text-sm font-bold block text-zinc-900 dark:text-zinc-100">
                          {isArabic ? 'تنسيق أسئلة جاهزة' : 'Format Ready Questions'}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {isArabic ? 'الصق أسئلة أو صور أسئلة ويحولها الـ AI لاختبار تفاعلي دون تغييرها.' : 'Digitize existing questions or sheets verbatim.'}
                        </span>
                      </div>
                    </button>
                  </div>

                  <textarea
                    rows={5}
                    value={aiSourceText}
                    onChange={(e) => setAiSourceText(e.target.value)}
                    placeholder={
                      aiInputMode === 'format_existing'
                        ? isArabic
                          ? 'الصق الأسئلة الجاهزة هنا (أو ارفع صورها بالأسفل)...'
                          : 'Paste your ready-made questions here (or upload images below)...'
                        : isArabic
                        ? 'الصق نص المحاضرة أو الملخص هنا لتوليد أسئلة منه...'
                        : 'Paste lecture notes or study material here...'
                    }
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                    dir="auto"
                  />

                  {/* Image & PDF upload */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="inline-flex items-center gap-2 min-h-[38px] px-4 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer border border-zinc-200 dark:border-zinc-700">
                      <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{isArabic ? 'رفع صور (ملخص أو أسئلة)' : 'Upload Images'}</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </label>
                    <label className="inline-flex items-center gap-2 min-h-[38px] px-4 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer border border-zinc-200 dark:border-zinc-700">
                      {pdfProcessingTarget === 'main' ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                      <span>{isArabic ? 'استيراد ملف PDF' : 'Import PDF'}</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        disabled={pdfProcessingTarget === 'main'}
                        onChange={(e) => handlePdfUpload(e, 'main')}
                        className="hidden"
                      />
                    </label>
                    {aiImages.length > 0 && (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                        {isArabic ? `${aiImages.length} صورة مرفقة` : `${aiImages.length} image(s) attached`}
                      </span>
                    )}
                  </div>

                  {aiImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {aiImages.map((img) => (
                        <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setAiImages((prev) => prev.filter((x) => x.id !== img.id))}
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Options Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    {aiInputMode === 'generate' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                            {isArabic ? 'اختيار من متعدد:' : 'MCQ Count:'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={aiMcqCount}
                            onChange={(e) => setAiMcqCount(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 min-h-[36px] text-xs font-semibold tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                            {isArabic ? 'مقالي:' : 'Written Count:'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={aiWrittenCount}
                            onChange={(e) => setAiWrittenCount(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 min-h-[36px] text-xs font-semibold tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                            {isArabic ? 'المستوى:' : 'Difficulty:'}
                          </label>
                          <select
                            value={aiDifficulty}
                            onChange={(e) => setAiDifficulty(e.target.value as any)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 min-h-[36px] text-xs font-medium cursor-pointer"
                          >
                            <option value="easy">{isArabic ? 'سهل' : 'Easy'}</option>
                            <option value="medium">{isArabic ? 'متوسط' : 'Medium'}</option>
                            <option value="hard">{isArabic ? 'صعب' : 'Hard'}</option>
                            <option value="mixed">{isArabic ? 'متنوع' : 'Mixed'}</option>
                          </select>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        {isArabic ? 'اللغة:' : 'Language:'}
                      </label>
                      <select
                        value={aiLanguage}
                        onChange={(e) => setAiLanguage(e.target.value as any)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 min-h-[36px] text-xs font-medium cursor-pointer"
                      >
                        <option value="auto">{isArabic ? 'تلقائي' : 'Auto'}</option>
                        <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                        <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                      </select>
                    </div>
                  </div>

                  {aiError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleGeneratePrivateQuiz}
                      disabled={aiGenerating || (!aiSourceText.trim() && aiImages.length === 0) || aiQuota.remaining <= 0}
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold px-6 min-h-[42px] rounded-xl transition-colors cursor-pointer"
                    >
                      {aiGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isArabic ? 'جاري المعالجة...' : 'Processing...'}</span>
                        </>
                      ) : (
                        <>
                          {aiInputMode === 'format_existing' ? <FileCheck className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                          <span>
                            {aiInputMode === 'format_existing'
                              ? isArabic
                                ? 'استخراج وتنسيق الأسئلة'
                                : 'Extract & Format Questions'
                              : isArabic
                              ? 'توليد الاختبار الخاص'
                              : 'Generate Private Quiz'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Saved Private Quizzes List */}
          {privateQuizzes.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
              <Lock className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isArabic ? 'لم تنشئ أي اختبار خاص بعد' : 'No private quizzes yet'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {isArabic
                  ? 'اضغط على "إنشاء اختبار جديد" لتحويل ملخصاتك أو صورك إلى اختبار تفاعلي خاص بك.'
                  : 'Click "Create Private Quiz" to build personal quizzes from your notes or photos.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {privateQuizzes.map((pq) => (
                <div
                  key={pq.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{pq.subjectName}</span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>{isArabic ? 'خاص بك فقط' : 'Private'}</span>
                      </span>
                      <span>·</span>
                      <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-300">
                        {pq.questions.length} {isArabic ? 'سؤال' : 'questions'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate">{pq.title}</h3>
                    {pq.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{pq.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => navigate(`/student/quiz/${pq.id}`)}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t('startQuizButton')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFlashcardsData({ title: pq.title, questions: pq.questions })}
                      className="inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      title={isArabic ? 'وضع البطاقات السريعة' : 'Flashcards Mode'}
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{isArabic ? 'بطاقات' : 'Cards'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditPrivateQuiz(pq)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      title={t('edit')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const html = generateStandaloneHTML(pq.title, pq.questions);
                        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `${pq.title}.html`;
                        link.click();
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      title={t('downloadHtmlBtn')}
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrintTarget({ title: pq.title, questions: pq.questions })}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      title={isArabic ? 'طباعة / تصدير PDF' : 'Print PDF'}
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmState({
                          message: isArabic ? `حذف الاختبار الخاص "${pq.title}"؟` : `Delete "${pq.title}"?`,
                          onConfirm: () => {
                            removePrivateQuiz(pq.id);
                            showToast(isArabic ? 'تم حذف الاختبار الخاص.' : 'Private quiz deleted.');
                          },
                        })
                      }
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{confirmState.message}</p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="flex-1 min-h-[40px] py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = confirmState.onConfirm;
                  setConfirmState(null);
                  fn();
                }}
                className="flex-1 min-h-[40px] py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      <FlashcardsModal
        isOpen={Boolean(flashcardsData)}
        title={flashcardsData?.title || ''}
        questions={flashcardsData?.questions || []}
        onClose={() => setFlashcardsData(null)}
      />

      {printTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-start">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {isArabic ? 'اختر صيغة الطباعة (PDF)' : 'Select PDF Print Mode'}
              </h3>
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{printTarget.title}</p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const t = printTarget;
                  setPrintTarget(null);
                  printQuizAsPDF(t.title, t.questions, { includeAnswerKey: false });
                }}
                className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 bg-zinc-50 dark:bg-zinc-950 text-start cursor-pointer"
              >
                <span className="block text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {isArabic ? 'ورقة امتحان (أسئلة فقط للتدريب)' : 'Exam Paper (Questions Only)'}
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isArabic ? 'للطباعة والحل الذاتي بدون إجابات' : 'Clean sheet without answers'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const t = printTarget;
                  setPrintTarget(null);
                  printQuizAsPDF(t.title, t.questions, { includeAnswerKey: true });
                }}
                className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 bg-zinc-50 dark:bg-zinc-950 text-start cursor-pointer"
              >
                <span className="block text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {isArabic ? 'مع نموذج الإجابة' : 'With Answer Key'}
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isArabic ? 'تشمل جدول الإجابات في الصفحة الأخيرة' : 'Includes full Answer Key table'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

