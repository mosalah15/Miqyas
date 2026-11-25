import React, { useState } from 'react';
import { Subject, Topic, Quiz, Question, TeacherUser } from '../../types';
import {
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  FileText,
  Trash2,
  Edit3,
  Download,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Layers,
  Eye,
  LogOut,
  FolderPlus,
  Play,
  X,
  Wand2,
  Printer,
  Users,
  UserPlus,
  UserCheck,
  Shield,
  ShieldCheck,
  Lock,
  User,
  EyeOff,
  Clock,
  Check,
  Image as ImageIcon,
  UploadCloud,
  RefreshCw,
  Plus,
  Loader2,
  FileCheck,
  AlertTriangle,
  Link as LinkIcon,
  Link2,
  BarChart3,
  QrCode,
  Copy,
  ArrowUp,
  ArrowDown,
  FileUp,
  Globe,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateStandaloneHTML } from '../../utils/parser';
import { printQuizAsPDF } from '../../utils/printHelper';
import { useLanguage } from '../../context/LanguageContext';
import { generateQuizFromAI } from '../../services/aiService';
import { compressImage } from '../../utils/imageCompressor';
import { extractPdfContent } from '../../utils/pdfExtractor';
import { QuizStat } from '../../types';
import { subscribeToQuizStats } from '../../services/studentCloudService';

interface TeacherDashboardProps {
  currentTeacher: TeacherUser;
  teachers: TeacherUser[];
  onAddTeacher: (teacherData: { email: string; displayName: string }) => Promise<void>;
  onDeleteTeacher: (teacherId: string) => Promise<void>;
  subjects: Subject[];
  topics: Topic[];
  quizzes: Quiz[];
  onSaveSubject: (subject: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
  onSaveTopic: (topic: Topic) => void;
  onDeleteTopic: (topicId: string) => void;
  onSaveQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  onTestQuizAsStudent: (quiz: Quiz) => void;
  onLogout: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentTeacher,
  teachers,
  onAddTeacher,
  onDeleteTeacher,
  subjects,
  topics,
  quizzes,
  onSaveSubject,
  onDeleteSubject,
  onSaveTopic,
  onDeleteTopic,
  onSaveQuiz,
  onDeleteQuiz,
  onTestQuizAsStudent,
  onLogout,
}) => {
  const { t, isArabic } = useLanguage();
  const isAdmin = currentTeacher.role === 'admin';

  const [activeTab, setActiveTab] = useState<'overview' | 'create_quiz' | 'subjects_topics' | 'manage_quizzes' | 'manage_teachers'>('overview');

  // Permission check helper
  const canModify = (itemCreatedBy?: string): boolean => {
    if (isAdmin) return true;
    if (!itemCreatedBy) return false;
    return itemCreatedBy.toLowerCase() === currentTeacher.username.toLowerCase();
  };

  const getItemOwnerBadge = (itemCreatedBy?: string) => {
    if (!itemCreatedBy || itemCreatedBy.toLowerCase() === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{t('byAdmin')}</span>
        </span>
      );
    }
    if (itemCreatedBy.toLowerCase() === currentTeacher.username.toLowerCase()) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <UserCheck className="w-3.5 h-3.5" />
          <span>{t('byYou')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Lock className="w-3.5 h-3.5" />
        <span>{t('byTeacher').replace('{name}', itemCreatedBy)}</span>
      </span>
    );
  };

  // Quiz Editor State
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizDescription, setQuizDescription] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [quizTimeLimit, setQuizTimeLimit] = useState<number>(0);

  // Automated AI Input Mode: 'generate' (build new questions from material) vs 'format_existing' (digitize & proofread ready-made questions)
  const [aiInputMode, setAiInputMode] = useState<'generate' | 'format_existing'>('generate');

  // AI Quiz Generation State
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiImages, setAiImages] = useState<Array<{ id: string; name: string; data: string; mimeType: string }>>([]);
  const [aiMcqCount, setAiMcqCount] = useState<number>(5);
  const [aiWrittenCount, setAiWrittenCount] = useState<number>(2);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [aiLanguage, setAiLanguage] = useState<'auto' | 'ar' | 'en'>('auto');
  const [aiLectureTitle, setAiLectureTitle] = useState('');
  const [aiIsGenerating, setAiIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // States for attaching images/URLs to questions
  const [urlInputStates, setUrlInputStates] = useState<Record<number, string>>({});
  const [showUrlInputIndex, setShowUrlInputIndex] = useState<number | null>(null);

  // Review Mode State (when questions have been generated/formatted and need verification before saving)
  const [reviewedQuestions, setReviewedQuestions] = useState<Question[] | null>(null);
  const [reviewedQuizTitle, setReviewedQuizTitle] = useState('');
  const [reviewedQuizDesc, setReviewedQuizDesc] = useState('');

  // Append More Questions with AI State (used inside Review & Edit modes)
  const [showAppendAiPanel, setShowAppendAiPanel] = useState(false);
  const [appendAiMode, setAppendAiMode] = useState<'generate' | 'format_existing'>('generate');
  const [appendAiText, setAppendAiText] = useState('');
  const [appendAiImages, setAppendAiImages] = useState<Array<{ id: string; name: string; data: string; mimeType: string }>>([]);
  const [appendAiMcqCount, setAppendAiMcqCount] = useState<number>(5);
  const [appendAiWrittenCount, setAppendAiWrittenCount] = useState<number>(0);
  const [appendAiDifficulty, setAppendAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [appendAiLanguage, setAppendAiLanguage] = useState<'auto' | 'ar' | 'en'>('auto');
  const [appendAiIsGenerating, setAppendAiIsGenerating] = useState(false);
  const [appendAiError, setAppendAiError] = useState<string | null>(null);

  // Modals
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showNewTeacherModal, setShowNewTeacherModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean; message: string; onConfirm: () => void} | null>(null);

  // New Subject Form
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  const [newSubjectIcon] = useState('BookOpen');
  const [newSubjectColor] = useState('from-blue-600 to-indigo-600');

  // New Topic Form
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newTopicSubjectId, setNewTopicSubjectId] = useState(subjects[0]?.id || '');

  // New Teacher Form (Admin Only)
  const [newTeacherDisplayName, setNewTeacherDisplayName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherError, setNewTeacherError] = useState('');

  // Notification Toast & Modals
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quizStats, setQuizStats] = useState<Record<string, QuizStat>>({});
  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);
  const [qrModalQuiz, setQrModalQuiz] = useState<Quiz | null>(null);
  const [printModalQuiz, setPrintModalQuiz] = useState<{ title: string; questions: Question[] } | null>(null);
  const [pdfProcessingTarget, setPdfProcessingTarget] = useState<'main' | 'append' | null>(null);

  // Auto-save WIP draft recovery banner
  const wipStorageKey = `axis_teacher_wip_draft_${currentTeacher.username}`;
  const [recoverableWip, setRecoverableWip] = useState<{
    editingQuizId: string | null;
    selectedSubjectId: string;
    selectedTopicId: string;
    quizTimeLimit: number;
    reviewedQuizTitle: string;
    reviewedQuizDesc: string;
    reviewedQuestions: Question[];
    savedAt: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem(`axis_teacher_wip_draft_${currentTeacher.username}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.reviewedQuestions) && parsed.reviewedQuestions.length > 0) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const clearWipDraft = () => {
    setRecoverableWip(null);
    try {
      localStorage.removeItem(wipStorageKey);
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    if (!reviewedQuestions || reviewedQuestions.length === 0) return;
    const timer = setTimeout(() => {
      const payload = {
        editingQuizId,
        selectedSubjectId,
        selectedTopicId,
        quizTimeLimit,
        reviewedQuizTitle,
        reviewedQuizDesc,
        reviewedQuestions,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(wipStorageKey, JSON.stringify(payload));
      } catch {
        // Retry stripped of inline images if localStorage quota is tight
        try {
          const compact = {
            ...payload,
            reviewedQuestions: reviewedQuestions.map((q) => ({
              ...q,
              imageURL: q.imageURL && q.imageURL.startsWith('data:') ? null : q.imageURL,
            })),
          };
          localStorage.setItem(wipStorageKey, JSON.stringify(compact));
        } catch {
          // ignore
        }
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [
    reviewedQuestions,
    editingQuizId,
    selectedSubjectId,
    selectedTopicId,
    quizTimeLimit,
    reviewedQuizTitle,
    reviewedQuizDesc,
    wipStorageKey,
  ]);

  React.useEffect(() => {
    const unsub = subscribeToQuizStats((map) => setQuizStats(map));
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyQuizLink = (quizId: string) => {
    const url = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedQuizId(quizId);
    showToast(isArabic ? 'تم نسخ رابط الاختبار المباشر!' : 'Direct quiz link copied!');
    setTimeout(() => setCopiedQuizId((curr) => (curr === quizId ? null : curr)), 2200);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'main' | 'append') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPdfProcessingTarget(target);
    showToast(isArabic ? `جاري قراءة ملف PDF: ${file.name}...` : `Processing PDF: ${file.name}...`);

    try {
      const extracted = await extractPdfContent(file);
      if (!extracted.text.trim() && extracted.images.length === 0) {
        showToast(isArabic ? 'تعذر استخراج محتوى مقروء من هذا الملف.' : 'No readable content found in this PDF.');
        return;
      }

      if (target === 'main') {
        if (extracted.text.trim()) {
          setAiSourceText((prev) => (prev.trim() ? `${prev.trim()}\n\n${extracted.text}` : extracted.text));
        }
        if (extracted.images.length > 0) {
          setAiImages((prev) => [...prev, ...extracted.images]);
        }
      } else {
        if (extracted.text.trim()) {
          setAppendAiText((prev) => (prev.trim() ? `${prev.trim()}\n\n${extracted.text}` : extracted.text));
        }
        if (extracted.images.length > 0) {
          setAppendAiImages((prev) => [...prev, ...extracted.images]);
        }
      }

      showToast(
        isArabic
          ? `تمت معالجة ${extracted.pageCount} صفحة (${extracted.textPageCount} نصية، ${extracted.renderedPageCount} مصورة).`
          : `Processed ${extracted.pageCount} pages (${extracted.textPageCount} text, ${extracted.renderedPageCount} scanned).`
      );
    } catch (err) {
      console.error('PDF extraction failed:', err);
      showToast(isArabic ? 'تعذر قراءة ملف PDF. تأكد أنه غير محمي بكلمة مرور.' : 'Failed to read PDF file.');
    } finally {
      setPdfProcessingTarget(null);
    }
  };

  // Sync selectedTopicId when subject changes
  const availableTopicsForSubject = topics.filter((t) => t.subjectId === selectedSubjectId);

  // Handle image upload for AI quiz generation with automatic client-side compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray: File[] = Array.from(files);
    e.target.value = '';

    showToast(isArabic ? `جاري معالجة وضغط ${filesArray.length} صورة...` : `Compressing ${filesArray.length} images...`);

    for (const file of filesArray) {
      if (!file.type.startsWith('image/')) {
        showToast(isArabic ? `الملف ${file.name} ليس صورة صالحة.` : `${file.name} is not an image.`);
        continue;
      }

      try {
        const compressed = await compressImage(file, 1600, 0.82);
        if (compressed.data) {
          setAiImages((prev) => [
            ...prev,
            {
              id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

  const handleRemoveImage = (imgId: string) => {
    setAiImages((prev) => prev.filter((img) => img.id !== imgId));
  };

  const handleAppendImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray: File[] = Array.from(files);
    e.target.value = '';

    showToast(isArabic ? `جاري معالجة وضغط ${filesArray.length} صورة...` : `Compressing ${filesArray.length} images...`);

    for (const file of filesArray) {
      if (!file.type.startsWith('image/')) {
        showToast(isArabic ? `الملف ${file.name} ليس صورة صالحة.` : `${file.name} is not an image.`);
        continue;
      }

      try {
        const compressed = await compressImage(file, 1600, 0.82);
        if (compressed.data) {
          setAppendAiImages((prev) => [
            ...prev,
            {
              id: `app_img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

  const handleRemoveAppendImage = (imgId: string) => {
    setAppendAiImages((prev) => prev.filter((img) => img.id !== imgId));
  };

  const handleAppendQuizQuestionsWithAI = async () => {
    if (!appendAiText.trim() && appendAiImages.length === 0) {
      showToast(isArabic ? 'يرجى إدخال نص أو رفع صورة واحدة على الأقل للدفعة الجديدة.' : 'Enter text or upload at least one image.');
      return;
    }

    const isFormatMode = appendAiMode === 'format_existing';
    const mcqs = Math.max(0, Number(appendAiMcqCount) || 0);
    const writtens = Math.max(0, Number(appendAiWrittenCount) || 0);
    const totalCount = Math.max(1, mcqs + writtens);

    if (!isFormatMode && mcqs === 0 && writtens === 0) {
      showToast(isArabic ? 'يرجى تحديد عدد الأسئلة (سؤال واحد على الأقل).' : 'Please specify question count.');
      return;
    }

    setAppendAiIsGenerating(true);
    setAppendAiError(null);

    try {
      const result = await generateQuizFromAI({
        content: appendAiText.trim(),
        images: appendAiImages.map((img) => ({ data: img.data, mimeType: img.mimeType })),
        mode: appendAiMode,
        ...(isFormatMode
          ? {}
          : {
              count: totalCount,
              mcqCount: mcqs,
              writtenCount: writtens,
              questionType: mcqs > 0 && writtens > 0 ? 'mixed' : mcqs > 0 ? 'mcq' : 'written',
              difficulty: appendAiDifficulty,
            }),
        language: appendAiLanguage,
        lectureTitle: reviewedQuizTitle.trim() || undefined,
      });

      if (!result.questions || result.questions.length === 0) {
        setAppendAiError(isArabic ? 'لم يتمكن الذكاء الاصطناعي من استخراج أسئلة جديدة من هذا المحتوى.' : 'No questions could be extracted from this batch.');
        return;
      }

      const stamp = Date.now();
      const uniqueNewQuestions: Question[] = result.questions.map((q, idx) => ({
        ...q,
        id: `q_${stamp}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        lecture: reviewedQuizTitle.trim() || q.lecture || 'Quiz',
      }));

      setReviewedQuestions((prev) => [...(prev || []), ...uniqueNewQuestions]);
      setAppendAiText('');
      setAppendAiImages([]);
      setAppendAiError(null);
      setShowAppendAiPanel(false);

      const suggestedCount = uniqueNewQuestions.filter((q) => q.isAiSuggestedAnswer).length;
      showToast(
        isArabic
          ? suggestedCount > 0
            ? `تمت إضافة ${uniqueNewQuestions.length} سؤال جديد للقائمة (${suggestedCount} بإجابة مقترحة للمراجعة).`
            : `تمت إضافة ${uniqueNewQuestions.length} سؤال جديد إلى القائمة بنجاح!`
          : `Added ${uniqueNewQuestions.length} new question(s) to the list!`
      );
    } catch (err: any) {
      console.error('Append AI generation failed:', err);
      setAppendAiError(err?.message || (isArabic ? 'حدث خطأ أثناء معالجة الدفعة الجديدة.' : 'Failed to process additional questions.'));
    } finally {
      setAppendAiIsGenerating(false);
    }
  };

  // Generate or Format Quiz with AI (Automated)
  const handleGenerateQuizWithAI = async () => {
    if (!aiSourceText.trim() && aiImages.length === 0) {
      showToast(isArabic ? 'يرجى إدخال محتوى نصي أو رفع صورة واحدة على الأقل.' : 'Please enter source text or upload at least one image.');
      return;
    }

    const isFormatMode = aiInputMode === 'format_existing';
    const mcqs = Math.max(0, Number(aiMcqCount) || 0);
    const writtens = Math.max(0, Number(aiWrittenCount) || 0);
    const totalCount = Math.max(1, mcqs + writtens);

    if (!isFormatMode && mcqs === 0 && writtens === 0) {
      showToast(isArabic ? 'يرجى تحديد عدد الأسئلة (سؤال واحد على الأقل إما اختيار من متعدد أو مقالي).' : 'Please specify question count.');
      return;
    }

    setAiIsGenerating(true);
    setAiError(null);

    try {
      const result = await generateQuizFromAI({
        content: aiSourceText.trim(),
        images: aiImages.map((img) => ({ data: img.data, mimeType: img.mimeType })),
        mode: aiInputMode,
        ...(isFormatMode
          ? {}
          : {
              count: totalCount,
              mcqCount: mcqs,
              writtenCount: writtens,
              questionType: mcqs > 0 && writtens > 0 ? 'mixed' : mcqs > 0 ? 'mcq' : 'written',
              difficulty: aiDifficulty,
            }),
        language: aiLanguage,
        lectureTitle: aiLectureTitle.trim() || undefined,
      });

      if (!result.questions || result.questions.length === 0) {
        showToast(isArabic ? 'لم يتمكن الذكاء الاصطناعي من استخراج أسئلة من المحتوى. تأكد من إدراج نص أو صور واضحة.' : 'No questions extracted. Please provide clearer content.');
        return;
      }

      setReviewedQuestions(result.questions);
      setReviewedQuizTitle(result.quizTitle || aiLectureTitle || (isArabic ? (isFormatMode ? 'اختبار منسق' : 'اختبار مولّد') : (isFormatMode ? 'Formatted Quiz' : 'Generated Quiz')));
      setReviewedQuizDesc(result.description || '');

      const suggestedCount = result.questions.filter((q) => q.isAiSuggestedAnswer).length;
      if (isFormatMode && suggestedCount > 0) {
        showToast(
          isArabic
            ? `تم استخراج ${result.questions.length} سؤال (${suggestedCount} منها بإجابة مقترحة من AI للمراجعة).`
            : `Extracted ${result.questions.length} questions (${suggestedCount} with AI-suggested answers to review).`
        );
      } else {
        showToast(
          isArabic
            ? `تم تجهيز ${result.questions.length} سؤال بنجاح! راجعها الآن قبل الحفظ.`
            : `Prepared ${result.questions.length} questions! Review before saving.`
        );
      }
    } catch (err: any) {
      console.error('Quiz generation failed:', err);
      const msg = err?.message || (isArabic ? 'حدث خطأ أثناء المعالجة بالذكاء الاصطناعي.' : 'AI processing error.');
      setAiError(msg);
      showToast(isArabic ? 'فشلت المعالجة بالذكاء الاصطناعي. تأكد من جودة المحتوى.' : 'Failed to process quiz.');
    } finally {
      setAiIsGenerating(false);
    }
  };

  // Save / Publish or Save as Draft Reviewed Quiz directly to Firestore
  const handlePublishReviewedQuiz = (publishNow: boolean = true) => {
    if (!reviewedQuestions || reviewedQuestions.length === 0) {
      showToast(isArabic ? 'لا توجد أسئلة لاعتمادها.' : 'No questions to approve.');
      return;
    }

    const topicId = selectedTopicId || '';
    const fallbackTitle =
      reviewedQuizTitle.trim() ||
      (selectedTopicId && availableTopicsForSubject.find((t) => t.id === selectedTopicId)?.title) ||
      subjects.find((s) => s.id === selectedSubjectId)?.name ||
      'AI Generated Quiz';

    const cleanedQuestions: Question[] = reviewedQuestions.map(({ isAiSuggestedAnswer, ...rest }) => rest);

    const existingQuiz = editingQuizId ? quizzes.find((q) => q.id === editingQuizId) : null;
    const newQuiz: Quiz = {
      id: editingQuizId || `quiz_${Date.now()}`,
      title: reviewedQuizTitle.trim() || fallbackTitle,
      description: reviewedQuizDesc || quizDescription,
      subjectId: selectedSubjectId,
      topicId: topicId,
      timeLimitMinutes: Number(quizTimeLimit) || 0,
      questions: cleanedQuestions,
      createdAt: existingQuiz ? existingQuiz.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublished: publishNow,
      createdBy: existingQuiz?.createdBy || currentTeacher.username,
    };

    onSaveQuiz(newQuiz);
    clearWipDraft();
    showToast(
      publishNow
        ? isArabic
          ? `تم اعتماد ونشر الاختبار "${newQuiz.title}" (${newQuiz.questions.length} سؤال) للطلاب بنجاح!`
          : `Quiz "${newQuiz.title}" published to students!`
        : isArabic
        ? `تم حفظ "${newQuiz.title}" كمسودة خاصة بك (غير مرئية للطلاب).`
        : `Saved "${newQuiz.title}" as a draft (hidden from students).`
    );

    setReviewedQuestions(null);
    setEditingQuizId(null);
    setQuizDescription('');
    setAiImages([]);
    setAiSourceText('');
    setAiLectureTitle('');
    setShowAppendAiPanel(false);
    setAppendAiText('');
    setAppendAiImages([]);
    setAppendAiError(null);
    setActiveTab('manage_quizzes');
  };

  // Duplicate existing quiz as a Draft copy
  const handleDuplicateQuiz = (quiz: Quiz) => {
    const duplicate: Quiz = {
      ...quiz,
      id: `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: isArabic ? `${quiz.title} (نسخة)` : `${quiz.title} (Copy)`,
      questions: quiz.questions.map((q, idx) => ({
        ...q,
        id: `q_dup_${Date.now()}_${idx}`,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublished: false,
      createdBy: currentTeacher.username,
    };
    onSaveQuiz(duplicate);
    showToast(isArabic ? `تم إنشاء نسخة مسودة: "${duplicate.title}"` : `Created draft copy: "${duplicate.title}"`);
  };

  // Toggle published / draft status on an existing quiz
  const handleToggleQuizPublishStatus = (quiz: Quiz) => {
    const nextPublished = quiz.isPublished === false;
    onSaveQuiz({
      ...quiz,
      isPublished: nextPublished,
      updatedAt: new Date().toISOString(),
    });
    showToast(
      nextPublished
        ? isArabic
          ? `تم نشر "${quiz.title}" وإتاحته للطلاب.`
          : `Published "${quiz.title}".`
        : isArabic
        ? `تم تحويل "${quiz.title}" إلى مسودة.`
        : `Moved "${quiz.title}" to drafts.`
    );
  };

  // Reorder question Up/Down in review mode
  const handleMoveReviewedQuestion = (qIdx: number, direction: 'up' | 'down') => {
    if (!reviewedQuestions) return;
    const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
    if (targetIdx < 0 || targetIdx >= reviewedQuestions.length) return;
    const updated = [...reviewedQuestions];
    const temp = updated[qIdx];
    updated[qIdx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setReviewedQuestions(updated);
  };

  // Update a question in review mode
  const handleUpdateReviewedQuestion = (qIdx: number, updatedFields: Partial<Question>) => {
    if (!reviewedQuestions) return;
    const updated = [...reviewedQuestions];
    updated[qIdx] = { ...updated[qIdx], ...updatedFields };
    setReviewedQuestions(updated);
  };

  // Confirm an AI-suggested answer in review mode
  const handleConfirmAiSuggestedAnswer = (qIdx: number) => {
    handleUpdateReviewedQuestion(qIdx, { isAiSuggestedAnswer: false });
    showToast(isArabic ? 'تم تأكيد واعتماد الإجابة.' : 'Answer confirmed.');
  };

  // Delete a question in review mode
  const handleDeleteReviewedQuestion = (qIdx: number) => {
    if (!reviewedQuestions) return;
    const updated = reviewedQuestions.filter((_, idx) => idx !== qIdx);
    setReviewedQuestions(updated);
    showToast(isArabic ? 'تم حذف السؤال.' : 'Question removed.');
  };

  // Update option in MCQ review mode
  const handleUpdateOption = (qIdx: number, optIdx: number, newOptionText: string) => {
    if (!reviewedQuestions) return;
    const question = reviewedQuestions[qIdx];
    const updatedOptions = [...question.options];
    const oldOptionText = updatedOptions[optIdx];
    updatedOptions[optIdx] = newOptionText;

    // If this was the correct answer, update correctAnswer as well
    const isCorrect = question.correctAnswer === oldOptionText;
    const updatedCorrectAnswer = isCorrect ? newOptionText : question.correctAnswer;

    handleUpdateReviewedQuestion(qIdx, {
      options: updatedOptions,
      correctAnswer: updatedCorrectAnswer,
    });
  };

  // Set option as correct in MCQ review mode
  const handleSetCorrectOption = (qIdx: number, optionText: string) => {
    handleUpdateReviewedQuestion(qIdx, { correctAnswer: optionText, isAiSuggestedAnswer: false });
  };

  // Add option to question in review mode
  const handleAddOptionToQuestion = (qIdx: number) => {
    if (!reviewedQuestions) return;
    const question = reviewedQuestions[qIdx];
    const newOptLetter = String.fromCharCode(65 + question.options.length);
    const updatedOptions = [...question.options, `${isArabic ? 'خيار جديد' : 'New option'} ${newOptLetter}`];
    handleUpdateReviewedQuestion(qIdx, { options: updatedOptions });
  };

  // Remove option from question in review mode
  const handleRemoveOptionFromQuestion = (qIdx: number, optIdx: number) => {
    if (!reviewedQuestions) return;
    const question = reviewedQuestions[qIdx];
    if (question.options.length <= 2) {
      showToast(isArabic ? 'يجب الإبقاء على خيارين على الأقل.' : 'Minimum 2 options required.');
      return;
    }
    const removedOption = question.options[optIdx];
    const updatedOptions = question.options.filter((_, idx) => idx !== optIdx);
    const updatedCorrect = question.correctAnswer === removedOption ? updatedOptions[0] : question.correctAnswer;
    handleUpdateReviewedQuestion(qIdx, { options: updatedOptions, correctAnswer: updatedCorrect });
  };

  // Add brand-new question to reviewed list
  const handleAddNewQuestionToReviewed = () => {
    if (!reviewedQuestions) return;
    const newQ: Question = {
      id: `q_manual_${Date.now()}`,
      lecture: reviewedQuizTitle || 'New Quiz',
      question: isArabic ? 'نص السؤال الجديد' : 'New question text',
      type: 'mcq',
      options: [
        isArabic ? 'الخيار الأول' : 'Option A',
        isArabic ? 'الخيار الثاني' : 'Option B',
        isArabic ? 'الخيار الثالث' : 'Option C',
        isArabic ? 'الخيار الرابع' : 'Option D',
      ],
      correctAnswer: isArabic ? 'الخيار الأول' : 'Option A',
      isAiSuggestedAnswer: false,
    };
    setReviewedQuestions([...reviewedQuestions, newQ]);
    showToast(isArabic ? 'تمت إضافة سؤال جديد للقائمة.' : 'Added new question.');
  };

  // Upload an image file for a specific question in review mode
  const handleUploadQuestionImage = async (qIdx: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(isArabic ? 'يرجى اختيار ملف صورة صالح.' : 'Please select a valid image file.');
      return;
    }
    try {
      const compressed = await compressImage(file, 1400, 0.85);
      if (compressed.data) {
        handleUpdateReviewedQuestion(qIdx, {
          imageURL: compressed.data,
          requiresImage: true,
        });
        showToast(isArabic ? 'تم إرفاق الصورة بالسؤال بنجاح!' : 'Image attached to question!');
      }
    } catch (err) {
      console.error('Failed to attach image to question:', err);
      showToast(isArabic ? 'فشل إرفاق الصورة.' : 'Failed to attach image.');
    }
  };

  // Attach a direct URL to a specific question in review mode
  const handleSetQuestionImageURL = (qIdx: number, url: string) => {
    if (!url.trim()) return;
    handleUpdateReviewedQuestion(qIdx, {
      imageURL: url.trim(),
      requiresImage: true,
    });
    setShowUrlInputIndex(null);
    showToast(isArabic ? 'تم حفظ رابط الصورة بنجاح!' : 'Image URL saved!');
  };

  // Remove attached image from a specific question
  const handleRemoveQuestionImage = (qIdx: number) => {
    handleUpdateReviewedQuestion(qIdx, {
      imageURL: null,
    });
    showToast(isArabic ? 'تم إزالة الصورة من السؤال.' : 'Image removed from question.');
  };

  // Download Standalone HTML from Reviewed Questions
  const handleDownloadReviewedHTML = () => {
    if (!reviewedQuestions || reviewedQuestions.length === 0) {
      showToast(isArabic ? 'لا توجد أسئلة لتنزيلها.' : 'No questions to export.');
      return;
    }

    const title =
      reviewedQuizTitle.trim() ||
      (selectedTopicId && availableTopicsForSubject.find((t) => t.id === selectedTopicId)?.title) ||
      subjects.find((s) => s.id === selectedSubjectId)?.name ||
      'Quiz';

    const htmlCode = generateStandaloneHTML(title, reviewedQuestions);
    const blob = new Blob([htmlCode], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    const filename = title.replace(/[^a-z0-9\u0600-\u06FF]/gi, '_').substring(0, 50) || 'quiz';
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    showToast(isArabic ? 'تم تنزيل ملف HTML المستقل!' : 'Downloaded standalone HTML file!');
  };

  // Create Subject Form Submit
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const newSub: Subject = {
      id: `sub_${Date.now()}`,
      name: newSubjectName.trim(),
      description: newSubjectDesc.trim(),
      icon: newSubjectIcon,
      color: '#2563eb',
      gradient: newSubjectColor,
      order: subjects.length + 1,
      createdBy: currentTeacher.username,
    };

    onSaveSubject(newSub);
    setSelectedSubjectId(newSub.id);
    setNewSubjectName('');
    setNewSubjectDesc('');
    setShowSubjectModal(false);
    showToast(isArabic ? 'تم إنشاء المقرر الدراسي بنجاح!' : 'Course created successfully!');
  };

  // Create Topic Form Submit
  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;

    const newTop: Topic = {
      id: `topic_${Date.now()}`,
      subjectId: newTopicSubjectId || selectedSubjectId,
      title: newTopicTitle.trim(),
      description: newTopicDesc.trim(),
      createdBy: currentTeacher.username,
    };

    onSaveTopic(newTop);
    setSelectedTopicId(newTop.id);
    setNewTopicTitle('');
    setNewTopicDesc('');
    setShowTopicModal(false);
    showToast(isArabic ? 'تمت إضافة الموضوع بنجاح!' : 'Topic added successfully!');
  };

  // Handle Add New Teacher Account (Admin only)
  const handleCreateTeacherAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newTeacherEmail.trim().toLowerCase();
    const cleanName = newTeacherDisplayName.trim() || cleanEmail;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setNewTeacherError(isArabic ? 'أدخل بريد Google صحيحاً.' : 'Enter a valid Google email address.');
      return;
    }
    if (teachers.some((tc) => tc.username.toLowerCase() === cleanEmail)) {
      setNewTeacherError(t('usernameAlreadyExists'));
      return;
    }

    try {
      await onAddTeacher({ email: cleanEmail, displayName: cleanName });
    } catch {
      setNewTeacherError(isArabic ? 'تعذّرت إضافة المعلم. تأكد من صلاحياتك وحاول مرة أخرى.' : 'Could not add the teacher. Check your permissions and try again.');
      return;
    }

    setNewTeacherEmail('');
    setNewTeacherDisplayName('');
    setNewTeacherError('');
    setShowNewTeacherModal(false);
    showToast(t('teacherAddedSuccess'));
  };

  const handleEditExistingQuiz = (quiz: Quiz) => {
    if (!canModify(quiz.createdBy)) {
      showToast(t('noEditPermission'));
      return;
    }

    setEditingQuizId(quiz.id);
    setQuizDescription(quiz.description || '');
    setSelectedSubjectId(quiz.subjectId);
    setSelectedTopicId(quiz.topicId);
    setQuizTimeLimit(quiz.timeLimitMinutes || 0);

    // Load existing questions directly into interactive cards editor
    setReviewedQuestions(quiz.questions.map((q) => ({ ...q })));
    setReviewedQuizTitle(quiz.title);
    setReviewedQuizDesc(quiz.description || '');
    setShowAppendAiPanel(false);
    setAppendAiText('');
    setAppendAiImages([]);
    setAppendAiError(null);

    setActiveTab('create_quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl shadow-md text-xs sm:text-sm font-semibold flex items-center gap-2 border border-zinc-800 dark:border-zinc-200 animate-fade-in max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Teacher Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
            {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <LayoutDashboard className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight truncate">
                {currentTeacher.displayName || currentTeacher.username}
              </h1>
              <span className={`text-xs font-semibold ${
                isAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
              }`}>
                · {isAdmin ? t('adminRoleBadge') : t('teacherRoleBadge')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              @{currentTeacher.username} · {t('dashboardSubtitle')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => {
                setNewTeacherError('');
                setShowNewTeacherModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[38px] rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('addNewTeacherBtn')}</span>
            </button>
          )}

          <button
            onClick={() => setShowSubjectModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[38px] rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">{t('newSubjectBtn')}</span>
          </button>

          <button
            onClick={() => setShowTopicModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[38px] rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">{t('newTopicBtn')}</span>
          </button>

          <button
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-1.5 px-3 min-h-[38px] rounded-xl text-xs font-semibold text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title={t('logoutBtn')}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{t('logoutBtn')}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 min-h-[38px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span>{t('tabAnalytics')}</span>
        </button>

        <button
          onClick={() => setActiveTab('create_quiz')}
          className={`flex items-center gap-2 px-4 min-h-[38px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            activeTab === 'create_quiz'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          <span>{t('tabCreateQuiz')}</span>
        </button>

        <button
          onClick={() => setActiveTab('manage_quizzes')}
          className={`flex items-center gap-2 px-4 min-h-[38px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 tabular-nums ${
            activeTab === 'manage_quizzes'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('tabManageQuizzes')} ({quizzes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects_topics')}
          className={`flex items-center gap-2 px-4 min-h-[38px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 tabular-nums ${
            activeTab === 'subjects_topics'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t('tabSubjectsTopics')} ({subjects.length})</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('manage_teachers')}
            className={`flex items-center gap-2 px-4 min-h-[38px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 tabular-nums ${
              activeTab === 'manage_teachers'
                ? 'bg-amber-600 text-white'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('tabManageTeachers')} ({teachers.length})</span>
          </button>
        )}
      </div>

      {/* TAB 0: Dashboard Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/70 dark:border-blue-800">
                <Layers className="w-4 h-4" />
              </div>
              <div className="mt-4">
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">{t('totalSubjectsStat')}</h3>
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">{subjects.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/70 dark:border-blue-800">
                <FolderPlus className="w-4 h-4" />
              </div>
              <div className="mt-4">
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">{t('totalTopicsStat')}</h3>
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">{topics.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/70 dark:border-emerald-800">
                <FileText className="w-4 h-4" />
              </div>
              <div className="mt-4">
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">{t('totalQuizzesStat')}</h3>
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">{quizzes.length}</p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/70 dark:border-amber-800">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="mt-4">
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mb-1">{t('totalQuestionsStat')}</h3>
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {quizzes.reduce((acc, q) => acc + q.questions.length, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4">
                <Wand2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1.5">{t('tabCreateQuiz')}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mb-5 max-w-sm">
                {isArabic ? 'إنشاء وتنسيق ونشر الأسئلة المقالية والاختيار من متعدد بسهولة تامة.' : 'Easily create, format and publish interactive multiple choice and written questions.'}
              </p>
              <button 
                onClick={() => setActiveTab('create_quiz')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 min-h-[42px] rounded-xl font-semibold transition-colors cursor-pointer text-xs sm:text-sm"
              >
                {t('tabCreateQuiz')}
              </button>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1.5">{t('tabManageQuizzes')}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mb-5 max-w-sm">
                {isArabic ? 'مراجعة وتعديل وتصدير وطباعة الاختبارات المنشورة.' : 'Review, edit, export or print published student quizzes.'}
              </p>
              <button 
                onClick={() => setActiveTab('manage_quizzes')}
                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 px-6 min-h-[42px] rounded-xl font-semibold hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-xs sm:text-sm"
              >
                {t('tabManageQuizzes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Quiz Creator */}
      {activeTab === 'create_quiz' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 flex flex-wrap items-center gap-2">
                  <span>{editingQuizId ? t('updateQuizBtn') : t('tabCreateQuiz')}</span>
                  {editingQuizId && (
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      · {t('editingQuizBanner')}
                    </span>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {isArabic ? 'أدخل تفاصيل المقرر، واختر بين توليد أسئلة جديدة أو تنسيق أسئلة جاهزة بالذكاء الاصطناعي' : 'Select course details, then generate new questions or format ready-made questions with AI'}
                </p>
              </div>

              {editingQuizId && (
                <button
                  onClick={() => {
                    setEditingQuizId(null);
                    setQuizDescription('');
                    setReviewedQuestions(null);
                    setAiSourceText('');
                    setAiImages([]);
                    setAiError(null);
                    setShowAppendAiPanel(false);
                    setAppendAiText('');
                    setAppendAiImages([]);
                    setAppendAiError(null);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 min-h-[36px] rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  {t('cancelEditBtn')}
                </button>
              )}
            </div>

            {/* Form Fields: Subject & Topic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5 text-start">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t('selectSubjectLabel')}
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    const relevantTopics = topics.filter((t) => t.subjectId === e.target.value);
                    setSelectedTopicId(relevantTopics[0]?.id || '');
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t('selectTopicLabel')}
                </label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">
                    {isArabic ? '-- بدون تحديد موضوع (اختبار عام للمادة) --' : '-- No topic (General Course Quiz) --'}
                  </option>
                  {availableTopicsForSubject.map((top) => (
                    <option key={top.id} value={top.id}>
                      {top.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t('timeLimitLabel')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={quizTimeLimit}
                  onChange={(e) => setQuizTimeLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500 transition-colors tabular-nums"
                />
              </div>
            </div>

            {/* Quiz Description (Optional) */}
            <div className="mb-6 text-start">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                {t('descriptionOptionalLabel')}
              </label>
              <input
                type="text"
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500 transition-colors"
                dir="auto"
              />
            </div>

            {/* WIP Auto-Save Restore Banner */}
            {recoverableWip && !reviewedQuestions && (
              <div className="mb-5 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-start">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100">
                    {isArabic
                      ? `توجد مسودة عمل محفوظة تلقائياً (${recoverableWip.reviewedQuestions.length} سؤال)`
                      : `Auto-saved unsaved draft found (${recoverableWip.reviewedQuestions.length} questions)`}
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-200/80 mt-0.5">
                    {recoverableWip.reviewedQuizTitle || (isArabic ? 'بدون عنوان' : 'Untitled')}
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
                      setEditingQuizId(recoverableWip.editingQuizId);
                      setSelectedSubjectId(recoverableWip.selectedSubjectId || subjects[0]?.id || '');
                      setSelectedTopicId(recoverableWip.selectedTopicId || '');
                      setQuizTimeLimit(recoverableWip.quizTimeLimit || 0);
                      setReviewedQuizTitle(recoverableWip.reviewedQuizTitle || '');
                      setReviewedQuizDesc(recoverableWip.reviewedQuizDesc || '');
                      setReviewedQuestions(recoverableWip.reviewedQuestions);
                      setRecoverableWip(null);
                      showToast(isArabic ? 'تمت استعادة مسودة الأسئلة بنجاح!' : 'Restored unsaved draft!');
                    }}
                    className="min-h-[34px] px-3.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  >
                    {isArabic ? 'استعادة العمل' : 'Restore Draft'}
                  </button>
                </div>
              </div>
            )}

            {/* Automated AI Creation & Review Flow */}
            <div>
              {reviewedQuestions ? (
                <div className="space-y-6 text-start">
                  {/* Review Header Banner */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className={`w-8 h-8 rounded-lg text-white flex items-center justify-center shrink-0 ${editingQuizId ? 'bg-amber-600' : 'bg-blue-600'}`}>
                          {editingQuizId ? <Edit3 className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 flex flex-wrap items-center gap-2">
                          <span>
                            {editingQuizId
                              ? (isArabic ? 'تعديل أسئلة الاختبار' : 'Edit Quiz Questions')
                              : aiInputMode === 'format_existing'
                              ? (isArabic ? 'مراجعة واعتماد الأسئلة المنسقة' : 'Review Formatted Questions')
                              : (isArabic ? 'مراجعة واعتماد الأسئلة المولدة' : 'Review Generated Questions')}
                          </span>
                          {editingQuizId && (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              · {isArabic ? 'وضع التعديل' : 'Edit Mode'}
                            </span>
                          )}
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
                        {editingQuizId
                          ? (isArabic
                            ? `لديك ${reviewedQuestions.length} سؤال في هذا الاختبار. يمكنك تعديل أي سؤال، إرفاق صور، وحذف أو إضافة أسئلة جديدة ثم حفظ التعديلات.`
                            : `Currently editing ${reviewedQuestions.length} questions. You can edit text, options, attach images, add/delete questions, and save changes.`)
                          : aiInputMode === 'format_existing'
                          ? (isArabic
                            ? `تم استخراج وتنسيق ${reviewedQuestions.length} سؤال مع الحفاظ التام على نصها الأصلي. راجع الأسئلة المميزة قبل النشر.`
                            : `Formatted ${reviewedQuestions.length} questions while preserving original wording. Review any highlighted items before publishing.`)
                          : (isArabic
                            ? `تم استخراج ${reviewedQuestions.length} سؤال استناداً حصرياً إلى المحتوى المرفق وبصياغة أكاديمية مستقلة. يمكنك مراجعتها وتعديلها.`
                            : `Extracted ${reviewedQuestions.length} strictly grounded, self-contained questions. Edit or delete any question before final publication.`)}
                      </p>
                      {reviewedQuestions.filter((q) => q.isAiSuggestedAnswer).length > 0 && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isArabic
                              ? `تنبيه: يوجد ${reviewedQuestions.filter((q) => q.isAiSuggestedAnswer).length} سؤال بإجابة مقترحة من الذكاء الاصطناعي (مظللة باللون البنفسجي للمراجعة)`
                              : `Notice: ${reviewedQuestions.filter((q) => q.isAiSuggestedAnswer).length} question(s) have AI-suggested answers highlighted in violet for your review.`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setAppendAiMode(aiInputMode);
                          setAppendAiError(null);
                          setShowAppendAiPanel((prev) => !prev);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3.5 min-h-[38px] rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          showAppendAiPanel
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'إضافة أسئلة بالـ AI' : 'Add via AI'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddNewQuestionToReviewed}
                        className="inline-flex items-center gap-1.5 px-3.5 min-h-[38px] rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'سؤال يدوي' : 'Manual Question'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAppendAiPanel(false);
                          setAppendAiText('');
                          setAppendAiImages([]);
                          setAppendAiError(null);
                          if (editingQuizId) {
                            setEditingQuizId(null);
                            setReviewedQuestions(null);
                            setQuizDescription('');
                            setActiveTab('manage_quizzes');
                          } else {
                            setReviewedQuestions(null);
                          }
                        }}
                        className="text-xs font-semibold text-zinc-500 hover:text-rose-600 px-3 min-h-[38px] rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                      >
                        {editingQuizId ? (isArabic ? 'إلغاء التعديل' : 'Cancel Edit') : (isArabic ? 'إلغاء' : 'Cancel')}
                      </button>
                    </div>
                  </div>

                    {/* Quiz Title & Description in Review */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          {isArabic ? 'عنوان الاختبار المعتمد:' : 'Quiz Title:'}
                        </label>
                        <input
                          type="text"
                          value={reviewedQuizTitle}
                          onChange={(e) => setReviewedQuizTitle(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:outline-none"
                          dir="auto"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          {isArabic ? 'وصف الاختبار:' : 'Quiz Description:'}
                        </label>
                        <input
                          type="text"
                          value={reviewedQuizDesc}
                          onChange={(e) => setReviewedQuizDesc(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:outline-none"
                          dir="auto"
                        />
                      </div>
                    </div>

                    {/* Questions Review Cards List */}
                    <div className="space-y-4">
                      {reviewedQuestions.map((q, qIdx) => {
                        const visualKeywordsRegex = /(في الشكل|في الرسم|في الصورة|المخطط المقابل|الشكل المجاور|الموضح بالصورة|الدائرة المقابلة|المنحنى المقابل|من الشكل|بناء على الرسم|طبقاً للرسم|in the figure|in the diagram|shown in the image|in the graph|as shown below|in the illustration)/i;
                        const needsImage = Boolean(q.requiresImage) || visualKeywordsRegex.test(q.question || '');
                        const isMissingRequiredImage = needsImage && !q.imageURL;

                        return (
                          <div
                            key={q.id || qIdx}
                            className={`rounded-2xl p-4 sm:p-5 space-y-4 transition-colors ${
                              isMissingRequiredImage
                                ? 'border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-600'
                                : q.isAiSuggestedAnswer
                                ? 'border-2 border-violet-400 bg-violet-50/40 dark:bg-violet-950/20 dark:border-violet-600'
                                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            {/* Missing Required Image Notice */}
                            {isMissingRequiredImage && (
                              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-100/80 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100">
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div className="flex-1 text-start">
                                  <h5 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100">
                                    {isArabic
                                      ? 'هذا السؤال يتطلب صورة أو شكلاً توضيحياً للإجابة عليه'
                                      : 'This question requires an image or diagram to answer'}
                                  </h5>
                                  <p className="text-xs text-amber-800 dark:text-amber-200/90 mt-1 leading-relaxed">
                                    {isArabic
                                      ? 'يرجى إرفاق الصورة بالسؤال عبر زر "رفع صورة من الجهاز" أو "رابط مباشر" بالأسفل.'
                                      : 'Please attach the image from your device or via direct URL below.'}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* AI-Suggested Answer Notice */}
                            {q.isAiSuggestedAnswer && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-violet-100/80 dark:bg-violet-900/40 border border-violet-300 dark:border-violet-700 text-violet-950 dark:text-violet-100">
                                <div className="flex items-start gap-2.5 text-start">
                                  <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                                  <div>
                                    <h5 className="text-xs sm:text-sm font-bold text-violet-950 dark:text-violet-100">
                                      {isArabic
                                        ? 'إجابة مقترحة من الذكاء الاصطناعي — يرجى المراجعة'
                                        : 'AI-Suggested Answer — Please Review'}
                                    </h5>
                                    <p className="text-xs text-violet-800 dark:text-violet-200/90 mt-0.5 leading-relaxed">
                                      {isArabic
                                        ? 'لم يتضمن المصدر إجابة محددة لهذا السؤال، فاختار الذكاء الاصطناعي الإجابة الأقرب. يمكنك تعديلها أو تأكيدها.'
                                        : 'No explicit answer was provided in the source, so AI selected the closest option. Edit or confirm below.'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmAiSuggestedAnswer(qIdx)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[34px] rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isArabic ? 'تأكيد الإجابة' : 'Confirm Answer'}</span>
                                </button>
                              </div>
                            )}

                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-800 tabular-nums">
                                  {qIdx + 1}
                                </span>
                                <select
                                  value={q.type}
                                  onChange={(e) => {
                                    const newType = e.target.value as 'mcq' | 'written';
                                    handleUpdateReviewedQuestion(qIdx, {
                                      type: newType,
                                      options:
                                        newType === 'mcq'
                                          ? q.options.length >= 2
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
                                          ? q.options[0] || (isArabic ? 'الخيار أ' : 'Option A')
                                          : q.correctAnswer || (isArabic ? 'الإجابة النموذجية' : 'Model Answer'),
                                    });
                                  }}
                                  className="text-xs font-semibold rounded-lg px-2.5 min-h-[32px] bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 focus:outline-none cursor-pointer"
                                >
                                  <option value="mcq">{isArabic ? 'اختيار من متعدد' : 'Multiple Choice'}</option>
                                  <option value="written">{isArabic ? 'سؤال مقالي / كتابي' : 'Written / Short Answer'}</option>
                                </select>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={qIdx === 0}
                                  onClick={() => handleMoveReviewedQuestion(qIdx, 'up')}
                                  className="text-zinc-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
                                  title={isArabic ? 'تحريك لأعلى' : 'Move up'}
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={!reviewedQuestions || qIdx === reviewedQuestions.length - 1}
                                  onClick={() => handleMoveReviewedQuestion(qIdx, 'down')}
                                  className="text-zinc-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
                                  title={isArabic ? 'تحريك لأسفل' : 'Move down'}
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReviewedQuestion(qIdx)}
                                  className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                  title={isArabic ? 'حذف هذا السؤال' : 'Delete question'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Question Text Field */}
                            <div>
                              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                                {isArabic ? 'نص السؤال:' : 'Question text:'}
                              </label>
                              <textarea
                                rows={2}
                                value={q.question}
                                onChange={(e) => handleUpdateReviewedQuestion(qIdx, { question: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:outline-none"
                                dir="auto"
                              />
                            </div>

                            {/* MCQ Options vs Written Answer */}
                            {q.type === 'mcq' ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    {isArabic
                                      ? 'خيارات الإجابة (اضغط الحرف لتحديد الإجابة الصحيحة):'
                                      : 'Options (Select letter to mark correct answer):'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddOptionToQuestion(qIdx)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>{isArabic ? 'إضافة خيار' : 'Add Option'}</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {q.options.map((opt, optIdx) => {
                                    const isCorrect = q.correctAnswer === opt;
                                    const optLetter = String.fromCharCode(65 + optIdx);
                                    return (
                                      <div
                                        key={optIdx}
                                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-colors ${
                                          isCorrect
                                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950'
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleSetCorrectOption(qIdx, opt)}
                                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold cursor-pointer transition-colors ${
                                            isCorrect
                                              ? 'bg-emerald-600 text-white'
                                              : 'border border-zinc-300 dark:border-zinc-600 text-zinc-500 hover:border-emerald-500'
                                          }`}
                                          title={isArabic ? 'تحديد كإجابة صحيحة' : 'Mark as correct answer'}
                                        >
                                          {isCorrect ? <Check className="w-3.5 h-3.5" /> : optLetter}
                                        </button>

                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                          className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none min-w-0"
                                          dir="auto"
                                        />

                                        {q.options.length > 2 && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveOptionFromQuestion(qIdx, optIdx)}
                                            className="text-zinc-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                                  {isArabic ? 'الإجابة النموذجية المعتمدة:' : 'Model Answer:'}
                                </label>
                                <textarea
                                  rows={2}
                                  value={q.correctAnswer}
                                  onChange={(e) => handleUpdateReviewedQuestion(qIdx, { correctAnswer: e.target.value, isAiSuggestedAnswer: false })}
                                  className="w-full bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:border-emerald-500 focus:outline-none"
                                  dir="auto"
                                />
                              </div>
                            )}

                            {/* Legacy Explanation Field (shown only if already present on older quizzes) */}
                            {Boolean(q.explanation) && (
                              <div>
                                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                                  {isArabic ? 'شرح الإجابة:' : 'Explanation:'}
                                </label>
                                <input
                                  type="text"
                                  value={q.explanation || ''}
                                  onChange={(e) => handleUpdateReviewedQuestion(qIdx, { explanation: e.target.value })}
                                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[38px] text-xs text-zinc-700 dark:text-zinc-300 focus:border-blue-500 focus:outline-none"
                                  dir="auto"
                                />
                              </div>
                            )}

                            {/* Question Image Attachment */}
                            <div className={`p-3.5 rounded-xl border transition-colors ${
                              isMissingRequiredImage
                                ? 'bg-amber-100/40 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                                : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800'
                            }`}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isMissingRequiredImage
                                      ? 'bg-amber-500 text-white'
                                      : q.imageURL
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                                  }`}>
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                                      {isArabic ? 'صورة السؤال التوضيحية:' : 'Question Diagram / Image:'}
                                    </span>
                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                      {q.imageURL
                                        ? (isArabic ? 'تم إرفاق الصورة وستظهر للطالب' : 'Image attached and ready')
                                        : isMissingRequiredImage
                                        ? (isArabic ? 'مطلوب إرفاق صورة لهذا السؤال' : 'Image is required for this question')
                                        : (isArabic ? 'اختياري: يمكنك إرفاق رسم أو مخطط' : 'Optional diagram or chart')}
                                    </span>
                                  </div>
                                </div>

                                {!q.imageURL && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className={`inline-flex items-center gap-1.5 px-3 min-h-[34px] rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                      isMissingRequiredImage
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}>
                                      <UploadCloud className="w-3.5 h-3.5" />
                                      <span>{isArabic ? 'رفع صورة من الجهاز' : 'Upload from Device'}</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadQuestionImage(qIdx, file);
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() => setShowUrlInputIndex(showUrlInputIndex === qIdx ? null : qIdx)}
                                      className="inline-flex items-center gap-1.5 px-3 min-h-[34px] rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 transition-colors cursor-pointer"
                                    >
                                      <LinkIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                      <span>{isArabic ? 'رابط مباشر' : 'Image URL'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {!q.imageURL && showUrlInputIndex === qIdx && (
                                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                  <input
                                    type="url"
                                    placeholder={isArabic ? 'أدخل رابط الصورة المباشر (https://...)' : 'Enter image URL (https://...)'}
                                    value={urlInputStates[qIdx] || ''}
                                    onChange={(e) => setUrlInputStates({ ...urlInputStates, [qIdx]: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSetQuestionImageURL(qIdx, urlInputStates[qIdx] || '');
                                      }
                                    }}
                                    className="flex-1 min-w-[180px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 min-h-[36px] text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                                    dir="ltr"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSetQuestionImageURL(qIdx, urlInputStates[qIdx] || '')}
                                    className="px-3.5 min-h-[36px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                                  >
                                    {isArabic ? 'حفظ' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowUrlInputIndex(null)}
                                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2 min-h-[36px] cursor-pointer"
                                  >
                                    {isArabic ? 'إلغاء' : 'Cancel'}
                                  </button>
                                </div>
                              )}

                              {q.imageURL && (
                                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={q.imageURL}
                                      alt="Question diagram preview"
                                      className="w-20 h-16 sm:w-28 sm:h-20 object-contain rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-1"
                                    />
                                    <div>
                                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span>{isArabic ? 'تم إرفاق الصورة بنجاح' : 'Image Attached Successfully'}</span>
                                      </span>
                                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        {isArabic ? 'ستظهر واضحة للطالب أثناء الاختبار مع إمكانية التكبير.' : 'Students can view and zoom this image during the test.'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <label className="inline-flex items-center gap-1 text-xs font-semibold px-3 min-h-[34px] rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 cursor-pointer transition-colors">
                                      <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                                      <span>{isArabic ? 'تغيير' : 'Change'}</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleUploadQuestionImage(qIdx, file);
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveQuestionImage(qIdx)}
                                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 min-h-[34px] rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>{isArabic ? 'إزالة' : 'Remove'}</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add More Questions Inline Section (Manual or AI) */}
                    <div className="space-y-4">
                      {!showAppendAiPanel ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setAppendAiMode(aiInputMode);
                              setAppendAiError(null);
                              setShowAppendAiPanel(true);
                            }}
                            className="min-h-[46px] px-4 rounded-xl border border-dashed border-blue-400 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/35 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
                            onClick={handleAddNewQuestionToReviewed}
                            className="min-h-[46px] px-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4 shrink-0" />
                            <span>{isArabic ? 'إضافة سؤال فارغ يدوياً' : 'Add Blank Question Manually'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-zinc-50/80 dark:bg-zinc-950/70 p-4 sm:p-5 space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
                                  {isArabic ? 'إضافة دفعة أسئلة جديدة للقائمة' : 'Append Additional Questions via AI'}
                                </h4>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {isArabic
                                    ? 'ستُضاف الأسئلة الناتجة إلى نهاية الأسئلة الحالية دون مسح أي سؤال.'
                                    : 'New questions will be appended after your existing cards.'}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowAppendAiPanel(false)}
                              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 cursor-pointer"
                              aria-label={isArabic ? 'إغلاق' : 'Close'}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Append AI Mode Switch */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <button
                              type="button"
                              onClick={() => {
                                setAppendAiMode('generate');
                                setAppendAiError(null);
                              }}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg text-start text-xs font-bold transition-colors cursor-pointer ${
                                appendAiMode === 'generate'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-zinc-800'
                              }`}
                            >
                              <Sparkles className="w-4 h-4 shrink-0" />
                              <span>{isArabic ? 'توليد أسئلة جديدة من محتوى' : 'Generate New Questions'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAppendAiMode('format_existing');
                                setAppendAiError(null);
                              }}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg text-start text-xs font-bold transition-colors cursor-pointer ${
                                appendAiMode === 'format_existing'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-zinc-800'
                              }`}
                            >
                              <FileCheck className="w-4 h-4 shrink-0" />
                              <span>{isArabic ? 'استخراج وتنسيق أسئلة جاهزة' : 'Extract Ready Questions'}</span>
                            </button>
                          </div>

                          {/* Append Text Content */}
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
                                ? 'الصق نصاً أو ملخصاً إضافياً لتوليد أسئلة جديدة منه...'
                                : 'Paste additional study notes or lecture material here...'
                            }
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500"
                            dir="auto"
                          />

                          {/* Append Image & PDF Upload */}
                          <div className="space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex items-center gap-2 min-h-[38px] px-4 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:border-blue-500 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer border border-zinc-200 dark:border-zinc-700 transition-colors">
                                  <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span>{isArabic ? 'رفع صور إضافية' : 'Upload Additional Images'}</span>
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleAppendImageUpload}
                                    className="hidden"
                                  />
                                </label>
                                <label className="inline-flex items-center gap-2 min-h-[38px] px-4 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:border-blue-500 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer border border-zinc-200 dark:border-zinc-700 transition-colors">
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
                              </div>
                              {appendAiImages.length > 0 && (
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                                  {appendAiImages.length} {isArabic ? 'صور مرفوعة' : 'images'}
                                </span>
                              )}
                            </div>

                            {appendAiImages.length > 0 && (
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                                {appendAiImages.map((img) => (
                                  <div
                                    key={img.id}
                                    className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 aspect-video flex items-center justify-center"
                                  >
                                    <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAppendImage(img.id)}
                                      className="w-6 h-6 rounded-lg bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-700 absolute top-1 end-1 cursor-pointer"
                                      title={isArabic ? 'إزالة الصورة' : 'Remove image'}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Append AI Config Grid */}
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
                                onChange={(e) => setAppendAiLanguage(e.target.value as 'auto' | 'ar' | 'en')}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 min-h-[36px] text-xs font-medium cursor-pointer"
                              >
                                <option value="auto">{isArabic ? 'تلقائي' : 'Auto'}</option>
                                <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                                <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                              </select>
                            </div>
                          </div>

                          {appendAiError && (
                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
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
                              onClick={handleAppendQuizQuestionsWithAI}
                              disabled={appendAiIsGenerating || (!appendAiText.trim() && appendAiImages.length === 0)}
                              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-5 min-h-[38px] rounded-xl transition-colors cursor-pointer"
                            >
                              {appendAiIsGenerating ? (
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

                    {/* Bottom Action Buttons for Review / Edit Mode */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadReviewedHTML}
                          className="inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>{t('downloadHtmlBtn')}</span>
                        </button>

                        {!editingQuizId && (
                          <button
                            type="button"
                            onClick={handleGenerateQuizWithAI}
                            className="inline-flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>
                              {aiInputMode === 'format_existing'
                                ? (isArabic ? 'إعادة التنسيق' : 'Reformat')
                                : (isArabic ? 'إعادة التوليد' : 'Regenerate')}
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {editingQuizId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuizId(null);
                              setReviewedQuestions(null);
                              setQuizDescription('');
                              setShowAppendAiPanel(false);
                              setAppendAiText('');
                              setAppendAiImages([]);
                              setAppendAiError(null);
                              clearWipDraft();
                              setActiveTab('manage_quizzes');
                            }}
                            className="px-4 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            {isArabic ? 'إلغاء التعديل' : 'Cancel Edit'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePublishReviewedQuiz(false)}
                          className="inline-flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold px-4 min-h-[42px] rounded-xl transition-colors cursor-pointer"
                        >
                          <EyeOff className="w-4 h-4" />
                          <span>{isArabic ? 'حفظ كمسودة' : 'Save Draft'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePublishReviewedQuiz(true)}
                          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-6 min-h-[42px] rounded-xl transition-colors cursor-pointer w-full sm:w-auto"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isArabic ? (editingQuizId ? 'حفظ ونشر للطلاب' : 'اعتماد ونشر الاختبار') : (editingQuizId ? 'Save & Publish' : 'Publish Quiz')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 text-start">
                    {/* Automated AI Mode Switch: Generate New vs Format Ready Questions */}
                    <div>
                      <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        {isArabic ? 'طريقة معالجة المحتوى بالذكاء الاصطناعي:' : 'AI Processing Mode:'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <button
                          type="button"
                          onClick={() => {
                            setAiInputMode('generate');
                            setAiError(null);
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl text-start transition-colors cursor-pointer ${
                            aiInputMode === 'generate'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-900/50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            aiInputMode === 'generate'
                              ? 'bg-white/15 text-white'
                              : 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border border-zinc-200 dark:border-zinc-700'
                          }`}>
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs sm:text-sm font-bold">
                              {isArabic ? 'توليد أسئلة جديدة' : 'Generate New Questions'}
                            </span>
                            <span className={`block text-[11px] mt-0.5 ${
                              aiInputMode === 'generate' ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'
                            }`}>
                              {isArabic ? 'بناء أسئلة اختبار جديدة من شرح أو ملخص' : 'Create new exam questions from study notes'}
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAiInputMode('format_existing');
                            setAiError(null);
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl text-start transition-colors cursor-pointer ${
                            aiInputMode === 'format_existing'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-900/50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            aiInputMode === 'format_existing'
                              ? 'bg-white/15 text-white'
                              : 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border border-zinc-200 dark:border-zinc-700'
                          }`}>
                            <FileCheck className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs sm:text-sm font-bold">
                              {isArabic ? 'تنسيق أسئلة جاهزة' : 'Format Ready Questions'}
                            </span>
                            <span className={`block text-[11px] mt-0.5 ${
                              aiInputMode === 'format_existing' ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'
                            }`}>
                              {isArabic ? 'إدخال أسئلة موجودة كما هي دون تغيير صياغتها' : 'Import existing questions verbatim with typo fixes'}
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Context Notice Banner */}
                    <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {aiInputMode === 'format_existing'
                            ? (isArabic ? 'الحفاظ التام على نص الأسئلة المرفقة' : 'Strict Verbatim Question Preservation')
                            : (isArabic ? 'توليد أسئلة من المحتوى المرفق حصرياً' : 'Strictly Grounded Question Generation')}
                        </h4>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                          {aiInputMode === 'format_existing'
                            ? (isArabic
                              ? 'يستخرج الذكاء الاصطناعي جميع الأسئلة من النص أو الصور بنفس صياغتها مع تصحيح الإملاء فقط. يتم الالتزام بالإجابات المرفقة، وفي حال عدم توفرها يقترح الإجابة الأقرب ويظللها للمراجعة.'
                              : 'Extracts all questions verbatim with spelling/grammar fixes only. Uses marked answers when present, and highlights AI-suggested answers when missing.')
                            : (isArabic
                              ? 'يتم بناء أسئلة اختبارية مستقلة بدقة تامة من النصوص والصور المرفقة فقط، مع إتاحة مراجعة وتعديل كل سؤال قبل الحفظ.'
                              : 'Questions and answers are strictly grounded in your provided text and images. You review and edit everything before saving.')}
                        </p>
                      </div>
                    </div>

                    {/* Quiz Title Input */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {isArabic ? 'عنوان الاختبار (اختياري):' : 'Quiz Title (Optional):'}
                        </label>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          {isArabic ? 'اتركه فارغاً للاقتراح التلقائي' : 'Leave blank for auto-generation'}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={aiLectureTitle}
                        onChange={(e) => setAiLectureTitle(e.target.value)}
                        placeholder={isArabic ? 'مثال: اختبار فيزياء الحركة الموجية - الفصل الأول' : 'e.g. Wave Motion Physics Quiz - Chapter 1'}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                        dir="auto"
                      />
                    </div>

                    {/* Source 1: Text Content */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {aiInputMode === 'format_existing'
                            ? (isArabic ? '1. نص الأسئلة الجاهزة:' : '1. Ready Questions Text:')
                            : (isArabic ? '1. المحتوى النصي للدرس أو المحاضرة:' : '1. Lecture or Text Content:')}
                        </label>
                        <span className="text-[11px] text-zinc-400 tabular-nums">
                          {aiSourceText.length > 0
                            ? `${aiSourceText.length} ${isArabic ? 'حرف' : 'chars'}`
                            : (aiInputMode === 'format_existing'
                              ? (isArabic ? 'الصق الأسئلة هنا' : 'Paste questions here')
                              : (isArabic ? 'الصق نص المادة هنا' : 'Paste content here'))}
                        </span>
                      </div>
                      <textarea
                        rows={6}
                        value={aiSourceText}
                        onChange={(e) => setAiSourceText(e.target.value)}
                        placeholder={
                          aiInputMode === 'format_existing'
                            ? (isArabic
                              ? 'الصق هنا الأسئلة الجاهزة بأي تنسيق (مع الإجابات أو بدونها)، وسيتم تحويلها إلى اختبار تفاعلي دون تغيير معناها...'
                              : 'Paste your ready-made questions in any format (with or without answers) to convert them verbatim...')
                            : (isArabic
                              ? 'الصق هنا نص المحاضرة، فقرات الكتاب، الملخص، أو النقاط التعليمية...'
                              : 'Paste lecture notes, textbook text, or study summary here...')
                        }
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-xs sm:text-sm text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:outline-none transition-colors"
                        dir="auto"
                      />
                    </div>

                    {/* Source 2: Multimodal Image Upload */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>
                            {aiInputMode === 'format_existing'
                              ? (isArabic ? '2. صور صفحات الأسئلة أو الامتحانات (اختياري):' : '2. Images of Question Sheets (Optional):')
                              : (isArabic ? '2. صور أو شرائح عرض (اختياري):' : '2. Images or Slides (Optional):')}
                          </span>
                        </label>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                          {aiImages.length} {isArabic ? 'صور مرفوعة' : 'images'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-zinc-50/70 dark:bg-zinc-950/60 transition-colors">
                          <UploadCloud className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 text-center">
                            {isArabic ? 'اضغط لرفع صور أو اسحبها هنا' : 'Click to upload images'}
                          </span>
                          <span className="text-[11px] text-zinc-400 text-center">
                            {isArabic
                              ? 'PNG, JPG, WEBP — مع تقسيم الدفعات تلقائياً'
                              : 'PNG, JPG, WEBP — auto-batched'}
                          </span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>

                        <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-zinc-50/70 dark:bg-zinc-950/60 transition-colors">
                          {pdfProcessingTarget === 'main' ? (
                            <Loader2 className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
                          ) : (
                            <FileUp className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                          )}
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 text-center">
                            {isArabic ? 'رفع ملف PDF مباشر (محاضرة / امتحان)' : 'Upload PDF Document'}
                          </span>
                          <span className="text-[11px] text-zinc-400 text-center">
                            {isArabic
                              ? 'يستخرج النص أو يحول الصفحات المصورة تلقائياً'
                              : 'Extracts text or renders scanned pages automatically'}
                          </span>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            disabled={pdfProcessingTarget === 'main'}
                            onChange={(e) => handlePdfUpload(e, 'main')}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {aiImages.length > 5 && (
                        <div className="mt-2.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-medium leading-relaxed tabular-nums">
                            {isArabic
                              ? `تم رفع ${aiImages.length} صور: سيتم تقسيم المعالجة تلقائياً إلى ${Math.ceil(aiImages.length / 5)} دفعات متتالية.`
                              : `${aiImages.length} images: Will process in ${Math.ceil(aiImages.length / 5)} sequential batches.`}
                          </span>
                        </div>
                      )}

                      {aiImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3">
                          {aiImages.map((img) => (
                            <div
                              key={img.id}
                              className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 aspect-video flex items-center justify-center"
                            >
                              <img
                                src={img.data}
                                alt={img.name}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(img.id)}
                                className="w-7 h-7 rounded-lg bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-700 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 absolute top-1.5 end-1.5 cursor-pointer"
                                title={isArabic ? 'إزالة الصورة' : 'Remove image'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="absolute bottom-1 start-1 end-1 text-[9px] font-semibold text-white bg-zinc-900/75 px-1.5 py-0.5 rounded truncate">
                                {img.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* AI Configuration Options */}
                    {aiInputMode === 'generate' ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                          {/* MCQ Questions Count */}
                          <div className="flex flex-col justify-between">
                            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center justify-between">
                              <span>{isArabic ? 'اختيار من متعدد:' : 'MCQ Count:'}</span>
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                {aiMcqCount}
                              </span>
                            </label>
                            <div className="flex items-center gap-1.5 mb-2">
                              <button
                                type="button"
                                onClick={() => setAiMcqCount((c) => Math.max(0, (Number(c) || 0) - 1))}
                                className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer shrink-0 text-base"
                                title="-1"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={aiMcqCount}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setAiMcqCount(isNaN(val) ? 0 : Math.max(0, val));
                                }}
                                className="w-full text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl min-h-[36px] text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 tabular-nums"
                                placeholder="5"
                              />
                              <button
                                type="button"
                                onClick={() => setAiMcqCount((c) => Math.min(100, (Number(c) || 0) + 1))}
                                className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer shrink-0 text-base"
                                title="+1"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              {[0, 3, 5, 10, 15].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setAiMcqCount(num)}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer tabular-nums ${
                                    aiMcqCount === num
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-blue-400'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Written Questions Count */}
                          <div className="flex flex-col justify-between">
                            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center justify-between">
                              <span>{isArabic ? 'أسئلة مقالية:' : 'Written Count:'}</span>
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {aiWrittenCount}
                              </span>
                            </label>
                            <div className="flex items-center gap-1.5 mb-2">
                              <button
                                type="button"
                                onClick={() => setAiWrittenCount((c) => Math.max(0, (Number(c) || 0) - 1))}
                                className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer shrink-0 text-base"
                                title="-1"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={aiWrittenCount}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setAiWrittenCount(isNaN(val) ? 0 : Math.max(0, val));
                                }}
                                className="w-full text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl min-h-[36px] text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 tabular-nums"
                                placeholder="2"
                              />
                              <button
                                type="button"
                                onClick={() => setAiWrittenCount((c) => Math.min(100, (Number(c) || 0) + 1))}
                                className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer shrink-0 text-base"
                                title="+1"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              {[0, 1, 2, 3, 5].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setAiWrittenCount(num)}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer tabular-nums ${
                                    aiWrittenCount === num
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Difficulty */}
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                              {isArabic ? 'مستوى الصعوبة:' : 'Difficulty Level:'}
                            </label>
                            <select
                              value={aiDifficulty}
                              onChange={(e) => setAiDifficulty(e.target.value as any)}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 min-h-[40px] text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              <option value="medium">{isArabic ? 'متوسط' : 'Medium'}</option>
                              <option value="easy">{isArabic ? 'سهل' : 'Easy'}</option>
                              <option value="hard">{isArabic ? 'متقدم' : 'Hard'}</option>
                              <option value="mixed">{isArabic ? 'متنوع' : 'Mixed'}</option>
                            </select>
                          </div>

                          {/* Question Language */}
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                              {isArabic ? 'لغة الأسئلة:' : 'Language:'}
                            </label>
                            <select
                              value={aiLanguage}
                              onChange={(e) => setAiLanguage(e.target.value as 'auto' | 'ar' | 'en')}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 min-h-[40px] text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              <option value="auto">{isArabic ? 'تلقائي (حسب المحتوى)' : 'Auto (Match Content)'}</option>
                              <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                              <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                            </select>
                          </div>
                        </div>

                        {/* Live Total Count Summary Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs">
                          <div className="flex flex-wrap items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                            <span>
                              {isArabic
                                ? `الإجمالي: ${(aiMcqCount || 0) + (aiWrittenCount || 0)} سؤال`
                                : `Total: ${(aiMcqCount || 0) + (aiWrittenCount || 0)} questions`}
                            </span>
                            <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                              · {aiMcqCount} {isArabic ? 'اختيار من متعدد' : 'MCQ'} · {aiWrittenCount} {isArabic ? 'مقالي' : 'Written'}
                            </span>
                          </div>
                          {aiMcqCount === 0 && aiWrittenCount === 0 && (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              {isArabic ? 'يرجى تحديد سؤال واحد على الأقل' : 'Please select at least 1 question'}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                            {isArabic ? 'لغة الإخراج:' : 'Output Language:'}
                          </label>
                          <select
                            value={aiLanguage}
                            onChange={(e) => setAiLanguage(e.target.value as 'auto' | 'ar' | 'en')}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 min-h-[40px] text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="auto">{isArabic ? 'تلقائي (نفس لغة المدخلات)' : 'Auto (Keep Original Language)'}</option>
                            <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                            <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
                            {isArabic ? 'استخراج تلقائي لجميع الأسئلة المتوفرة:' : 'Automatic Extraction of All Questions:'}
                          </span>
                          {isArabic
                            ? 'سيتم استخراج كل الأسئلة الموجودة في النص أو الصور بالعدد الفعلي دون تحديد عدد مسبق، مع تمييز أي إجابة يقترحها الذكاء الاصطناعي بلون خاص للمراجعة.'
                            : 'Every question detected in your text or images will be extracted automatically, with missing answers clearly highlighted for review.'}
                        </div>
                      </div>
                    )}

                    {/* Error Banner */}
                    {aiError && (
                      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="flex-1 font-semibold">{aiError}</span>
                      </div>
                    )}

                    {/* Generate / Extract Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {isArabic
                          ? 'ستتمكن من مراجعة وتعديل كل سؤال وخيار قبل الحفظ.'
                          : 'You can review and edit every question and answer before publishing.'}
                      </p>

                      <button
                        type="button"
                        onClick={handleGenerateQuizWithAI}
                        disabled={aiIsGenerating || (!aiSourceText.trim() && aiImages.length === 0)}
                        className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold px-7 min-h-[44px] rounded-xl transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
                      >
                        {aiIsGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>
                              {aiInputMode === 'format_existing'
                                ? (isArabic ? 'جاري الاستخراج والتنسيق...' : 'Extracting & Formatting...')
                                : (isArabic ? 'جاري التوليد...' : 'Generating...')}
                            </span>
                          </>
                        ) : (
                          <>
                            {aiInputMode === 'format_existing' ? <FileCheck className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                            <span>
                              {aiInputMode === 'format_existing'
                                ? (isArabic ? 'استخراج وتنسيق الأسئلة' : 'Extract & Format Questions')
                                : (isArabic ? 'توليد الأسئلة' : 'Generate Questions')}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      )}

      {/* TAB 2: Quizzes Manager */}
      {activeTab === 'manage_quizzes' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {t('quizzesListTitle').replace('{count}', quizzes.length.toString())}
            </h2>
            <button
              onClick={() => {
                setEditingQuizId(null);
                setQuizDescription('');
                setReviewedQuestions(null);
                setAiSourceText('');
                setAiImages([]);
                setAiError(null);
                setShowAppendAiPanel(false);
                setAppendAiText('');
                setAppendAiImages([]);
                setAppendAiError(null);
                setActiveTab('create_quiz');
              }}
              className="inline-flex items-center gap-1.5 px-4 min-h-[38px] rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('tabCreateQuiz')}</span>
            </button>
          </div>

          {quizzes.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
              <FileText className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{t('noQuizzesYet')}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('createNewQuizPrompt')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {quizzes.map((quiz) => {
                const sub = subjects.find((s) => s.id === quiz.subjectId);
                const top = topics.find((t) => t.id === quiz.topicId);
                const isOwner = canModify(quiz.createdBy);

                return (
                  <div
                    key={quiz.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-start hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {sub?.name || 'General'}
                        </span>
                        <span>·</span>
                        <span>
                          {top ? top.title : (isArabic ? 'عام للمادة' : 'General')}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-300">
                          {quiz.questions.length} {isArabic ? 'سؤال' : 'questions'}
                        </span>
                        {(() => {
                          const stat = quizStats[quiz.id];
                          if (!stat || !stat.attemptsCount) return null;
                          const avg = Math.round(stat.totalPercentageSum / stat.attemptsCount);
                          return (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>
                                  {stat.attemptsCount} {isArabic ? 'محاولة' : 'attempts'} · {isArabic ? 'متوسط' : 'Avg'} {avg}%
                                </span>
                              </span>
                            </>
                          );
                        })()}
                        <span>·</span>
                        {getItemOwnerBadge(quiz.createdBy)}
                        {quiz.isPublished === false && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>{isArabic ? 'مسودة (مخفي عن الطلاب)' : 'Draft (Hidden)'}</span>
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 break-words">
                        {quiz.title}
                      </h3>
                      {quiz.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {quiz.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto flex-wrap">
                      <button
                        onClick={() => onTestQuizAsStudent(quiz)}
                        className="inline-flex items-center gap-1.5 px-3.5 min-h-[36px] rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                        title={t('testAsStudentBtn')}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{t('testAsStudentBtn')}</span>
                      </button>

                      <button
                        onClick={() => handleCopyQuizLink(quiz.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                          copiedQuizId === quiz.id
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                            : 'text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                        title={isArabic ? 'نسخ رابط الاختبار' : 'Copy direct link'}
                      >
                        {copiedQuizId === quiz.id ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => setQrModalQuiz(quiz)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={isArabic ? 'رمز QR لمشاركة الاختبار' : 'QR Code Share'}
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicateQuiz(quiz)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={isArabic ? 'نسخ الاختبار كمسودة جديدة' : 'Duplicate as draft'}
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {isOwner && (
                        <button
                          onClick={() => handleToggleQuizPublishStatus(quiz)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                            quiz.isPublished === false
                              ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                          title={
                            quiz.isPublished === false
                              ? isArabic
                                ? 'نشر للطلاب الآن'
                                : 'Publish to students'
                              : isArabic
                              ? 'إخفاء كمسودة'
                              : 'Unpublish to draft'
                          }
                        >
                          {quiz.isPublished === false ? <Globe className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const html = generateStandaloneHTML(quiz.title, quiz.questions);
                          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.download = `${quiz.title}.html`;
                          link.click();
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={t('downloadHtmlBtn')}
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setPrintModalQuiz({ title: quiz.title, questions: quiz.questions })}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={isArabic ? 'طباعة / تصدير PDF' : 'Print / Export PDF'}
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {isOwner ? (
                        <button
                          onClick={() => handleEditExistingQuiz(quiz)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title={t('edit')}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span 
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-300 dark:text-zinc-700 cursor-not-allowed" 
                          title={t('noEditPermission')}
                        >
                          <Lock className="w-4 h-4" />
                        </span>
                      )}

                      {isOwner ? (
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              message: t('deleteConfirmQuiz'),
                              onConfirm: () => {
                                onDeleteQuiz(quiz.id);
                                showToast(isArabic ? 'تم حذف الاختبار' : 'Quiz deleted');
                              }
                            });
                          }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Subjects & Topics Manager */}
      {activeTab === 'subjects_topics' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {t('subjectsAndTopicsTitle')}
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowSubjectModal(true)}
                className="inline-flex items-center gap-1.5 px-4 min-h-[38px] rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('newSubjectBtn')}</span>
              </button>
              <button
                onClick={() => setShowTopicModal(true)}
                className="inline-flex items-center gap-1.5 px-4 min-h-[38px] rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t('newTopicBtn')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {subjects.map((sub) => {
              const subTopics = topics.filter((t) => t.subjectId === sub.id);
              const subQuizzes = quizzes.filter((q) => q.subjectId === sub.id);
              const isSubOwner = canModify(sub.createdBy);

              return (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 text-start"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 break-words">
                            {sub.name}
                          </h3>
                          {getItemOwnerBadge(sub.createdBy)}
                        </div>
                        {sub.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {sub.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap shrink-0">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {subTopics.length} {isArabic ? 'مواضيع' : 'Topics'} · {subQuizzes.length} {isArabic ? 'اختبارات' : 'Quizzes'}
                      </span>

                      <button
                        onClick={() => {
                          setNewTopicSubjectId(sub.id);
                          setShowTopicModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 min-h-[34px] rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 transition-colors cursor-pointer"
                        title={t('newTopicBtn')}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>{t('newTopicBtn')}</span>
                      </button>

                      {isSubOwner ? (
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              message: t('deleteConfirmSubject'),
                              onConfirm: () => {
                                onDeleteSubject(sub.id);
                                showToast(isArabic ? 'تم حذف المقرر' : 'Course deleted');
                              }
                            });
                          }}
                          className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span 
                          className="w-9 h-9 flex items-center justify-center text-zinc-300 dark:text-zinc-700 cursor-not-allowed" 
                          title={t('noEditPermission')}
                        >
                          <Lock className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subtopics sub-list */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-2">
                      {isArabic ? 'الموضوعات والوحدات التابعة:' : 'Topics & Units:'}
                    </span>
                    {subTopics.length === 0 ? (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        {isArabic ? 'لم تتم إضافة أي موضوعات لهذا المقرر بعد.' : 'No topics added to this course yet.'}
                      </p>
                    ) : (
                      subTopics.map((top) => {
                        const topQuizzes = quizzes.filter((q) => q.topicId === top.id);
                        const isTopOwner = canModify(top.createdBy);

                        return (
                          <div
                            key={top.id}
                            className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                          >
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span dir="auto">{top.title}</span>
                              <span className="text-zinc-400 dark:text-zinc-500 font-normal tabular-nums">
                                · {topQuizzes.length} {isArabic ? 'اختبار' : 'quizzes'}
                              </span>
                              {getItemOwnerBadge(top.createdBy)}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isTopOwner ? (
                                <button
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      message: t('deleteConfirmTopic'),
                                      onConfirm: () => {
                                        onDeleteTopic(top.id);
                                        showToast(isArabic ? 'تم حذف الموضوع' : 'Topic deleted');
                                      }
                                    });
                                  }}
                                  className="text-zinc-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                  title={t('delete')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="p-1.5 text-zinc-300 dark:text-zinc-700 cursor-not-allowed" title={t('noEditPermission')}>
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Direct quizzes without a topic under this subject */}
                    {(() => {
                      const untopickedQuizzes = subQuizzes.filter(
                        (q) => !q.topicId || q.topicId === 'topic_default' || !subTopics.some((t) => t.id === q.topicId)
                      );
                      if (untopickedQuizzes.length === 0) return null;
                      return (
                        <div className="pt-3 mt-3 border-t border-zinc-200/80 dark:border-zinc-800">
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mb-2">
                            {isArabic ? 'اختبارات عامة تابعة للمادة مباشرة:' : 'Direct course quizzes:'}
                          </span>
                          <div className="space-y-2">
                            {untopickedQuizzes.map((quiz) => (
                              <div
                                key={quiz.id}
                                className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                              >
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <span dir="auto">{quiz.title}</span>
                                  <span className="text-zinc-500 dark:text-zinc-400 font-normal tabular-nums">
                                    · {quiz.questions.length} {isArabic ? 'سؤال' : 'questions'}
                                  </span>
                                  {getItemOwnerBadge(quiz.createdBy)}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => onTestQuizAsStudent(quiz)}
                                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                                    title={t('testAsStudentBtn')}
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                  {canModify(quiz.createdBy) && (
                                    <button
                                      onClick={() => handleEditExistingQuiz(quiz)}
                                      className="p-1.5 text-zinc-400 hover:text-blue-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                      title={t('edit')}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Manage Teachers (ADMIN ONLY) */}
      {isAdmin && activeTab === 'manage_teachers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 tabular-nums">
                <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>{t('teachersListTitle').replace('{count}', teachers.length.toString())}</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {t('teachersListSubtitle')}
              </p>
            </div>

            <button
              onClick={() => {
                setNewTeacherError('');
                setShowNewTeacherModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('addNewTeacherBtn')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teachers.map((teacher) => {
              const isMainAdmin = teacher.id === currentTeacher.id;
              const createdSubjectsCount = subjects.filter((s) => s.createdBy?.toLowerCase() === teacher.username.toLowerCase()).length;
              const createdQuizzesCount = quizzes.filter((q) => q.createdBy?.toLowerCase() === teacher.username.toLowerCase()).length;

              return (
                <div
                  key={teacher.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-4 text-start hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        teacher.role === 'admin' 
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {teacher.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate">
                            {teacher.displayName || teacher.username}
                          </h3>
                          <span className={`text-xs font-semibold ${
                            teacher.role === 'admin' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            · {teacher.role === 'admin' ? 'Admin' : 'Teacher'}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                          @{teacher.username}
                        </p>
                      </div>
                    </div>

                    {!isMainAdmin && (
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            message: t('deleteTeacherConfirm').replace('{name}', teacher.displayName || teacher.username),
                            onConfirm: () => {
                              onDeleteTeacher(teacher.id)
                                .then(() => showToast(t('teacherDeletedSuccess')))
                                .catch(() => showToast(isArabic ? 'تعذّر حذف المعلم' : 'Could not delete the teacher'));
                            }
                          });
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                    <div className="flex items-center gap-2">
                      <span>{isArabic ? `${createdSubjectsCount} مقرر` : `${createdSubjectsCount} Courses`}</span>
                      <span>·</span>
                      <span>{isArabic ? `${createdQuizzesCount} اختبار` : `${createdQuizzesCount} Quizzes`}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(teacher.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Add Subject */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-lg text-start">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>{t('newSubjectBtn')}</span>
              </h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4 text-start">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isArabic ? 'اسم المقرر الدراسي:' : 'Course Name:'}
                </label>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder={isArabic ? 'مثال: علم الأدوية (Pharmacology)' : 'e.g. Pharmacology'}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500 transition-colors"
                  dir="auto"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isArabic ? 'الوصف (اختياري):' : 'Description (Optional):'}
                </label>
                <input
                  type="text"
                  value={newSubjectDesc}
                  onChange={(e) => setNewSubjectDesc(e.target.value)}
                  placeholder={isArabic ? 'مثال: آليات عمل الأدوية والعلاجات السريرية' : 'e.g. Drug mechanisms and clinical applications'}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500 transition-colors"
                  dir="auto"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold min-h-[42px] rounded-xl transition-colors cursor-pointer text-sm"
                >
                  {t('save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="flex-1 flex items-center justify-center text-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-semibold min-h-[42px] rounded-xl transition-colors cursor-pointer text-sm"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Topic */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-lg text-start">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>{t('newTopicBtn')}</span>
              </h3>
              <button onClick={() => setShowTopicModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-4 text-start">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t('selectSubjectLabel')}
                </label>
                <select
                  value={newTopicSubjectId}
                  onChange={(e) => setNewTopicSubjectId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isArabic ? 'عنوان الموضوع / الوحدة:' : 'Topic Title:'}
                </label>
                <input
                  type="text"
                  required
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder={isArabic ? 'مثال: المضادات الحيوية (Antibiotics)' : 'e.g. Antibiotics'}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500 transition-colors"
                  dir="auto"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isArabic ? 'الوصف (اختياري):' : 'Description (Optional):'}
                </label>
                <input
                  type="text"
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  placeholder={isArabic ? 'مثال: تصنيفات المضادات وآليات المقاومة' : 'e.g. Types and resistance mechanisms'}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500 transition-colors"
                  dir="auto"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold min-h-[42px] rounded-xl transition-colors cursor-pointer text-sm"
                >
                  {t('save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="flex-1 flex items-center justify-center text-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-semibold min-h-[42px] rounded-xl transition-colors cursor-pointer text-sm"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Teacher (Admin Only) */}
      {isAdmin && showNewTeacherModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-lg text-start">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>{t('newTeacherModalTitle')}</span>
              </h3>
              <button onClick={() => setShowNewTeacherModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {newTeacherError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{newTeacherError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeacherAccount} className="space-y-4 text-start">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t('teacherDisplayNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={newTeacherDisplayName}
                  onChange={(e) => {
                    setNewTeacherDisplayName(e.target.value);
                    setNewTeacherError('');
                  }}
                  placeholder={t('teacherDisplayNamePlaceholder')}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-sm font-medium text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-blue-500 transition-colors"
                  dir="auto"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isArabic ? 'بريد حساب Google' : 'Google account email'}
                </label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={newTeacherEmail}
                  onChange={(e) => {
                    setNewTeacherEmail(e.target.value);
                    setNewTeacherError('');
                  }}
                  placeholder="teacher@gmail.com"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 min-h-[42px] text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
                />
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-6">
                  {isArabic
                    ? 'سيدخل المعلم بهذا الحساب عبر "الدخول بحساب Google". لا توجد كلمات مرور.'
                    : 'The teacher signs in with this account via "Continue with Google". There are no passwords.'}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold min-h-[42px] rounded-xl transition-colors cursor-pointer text-sm"
                >
                  {t('createTeacherSubmit')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewTeacherModal(false)}
                  className="flex-1 flex items-center justify-center text-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-semibold min-h-[42px] rounded-xl transition-colors cursor-pointer text-sm"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Action */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-[60] bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-lg text-center">
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              {t('confirm')}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {confirmDialog.message}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 flex items-center justify-center text-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-semibold min-h-[42px] rounded-xl transition-colors cursor-pointer text-sm"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="flex-1 flex items-center justify-center text-center bg-rose-600 hover:bg-rose-700 text-white font-semibold min-h-[42px] rounded-xl transition-colors cursor-pointer text-sm"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Print PDF Mode Picker */}
      {printModalQuiz && (
        <div className="fixed inset-0 z-[60] bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-lg text-start space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {isArabic ? 'اختر صيغة الطباعة (PDF)' : 'Select PDF Print Mode'}
              </h3>
              <button
                type="button"
                onClick={() => setPrintModalQuiz(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{printModalQuiz.title}</p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const target = printModalQuiz;
                  setPrintModalQuiz(null);
                  printQuizAsPDF(target.title, target.questions, { includeAnswerKey: false });
                }}
                className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 bg-zinc-50 dark:bg-zinc-950 text-start transition-colors cursor-pointer"
              >
                <span className="block text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {isArabic ? 'ورقة امتحان للطالب (أسئلة فقط)' : 'Student Exam Paper (Questions Only)'}
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isArabic ? 'جاهزة للتوزيع بدون كشف الإجابات' : 'Clean exam sheet with student name header'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = printModalQuiz;
                  setPrintModalQuiz(null);
                  printQuizAsPDF(target.title, target.questions, { includeAnswerKey: true });
                }}
                className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 bg-zinc-50 dark:bg-zinc-950 text-start transition-colors cursor-pointer"
              >
                <span className="block text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {isArabic ? 'نسخة المعلم (الأسئلة + نموذج الإجابة)' : 'Instructor Copy (+ Answer Key)'}
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isArabic ? 'تشمل صفحة جدول الإجابات الصحيحة' : 'Includes full Answer Key table at the end'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QR Code Share */}
      {qrModalQuiz && (
        <div className="fixed inset-0 z-[60] bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-lg text-center space-y-4">
            <div className="flex items-center justify-between text-start">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {isArabic ? 'مشاركة عبر رمز QR' : 'Share Quiz via QR'}
              </h3>
              <button
                type="button"
                onClick={() => setQrModalQuiz(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200 inline-flex items-center justify-center mx-auto">
              <QRCodeSVG
                id="miqyas-quiz-qr-svg"
                value={`${window.location.origin}/quiz/${qrModalQuiz.id}`}
                size={196}
                level="M"
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{qrModalQuiz.title}</p>
              <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 break-all">
                {`${window.location.origin}/quiz/${qrModalQuiz.id}`}
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleCopyQuizLink(qrModalQuiz.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{isArabic ? 'نسخ الرابط' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const svgEl = document.getElementById('miqyas-quiz-qr-svg');
                  if (!svgEl) return;
                  const svgData = new XMLSerializer().serializeToString(svgEl);
                  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `qr_${qrModalQuiz.id}.svg`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تنزيل QR' : 'Download SVG'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

