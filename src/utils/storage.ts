import { Subject, Topic, Quiz } from '../types';
import { DEFAULT_SUBJECTS, DEFAULT_TOPICS, DEFAULT_QUIZZES } from '../data/defaultData';

const STORAGE_KEYS = {
  SUBJECTS: 'quiz_master_subjects_v1',
  TOPICS: 'quiz_master_topics_v1',
  QUIZZES: 'quiz_master_quizzes_v1',
  THEME: 'quiz_master_theme',
  QUIZ_PROGRESS_PREFIX: 'quiz_progress_',
};

/**
 * النظام القديم كان يخزن حسابات المعلمين وكلمات مرورهم نصاً في localStorage.
 * نحذفها من أي متصفح قديم عند أول تشغيل بعد التحديث.
 */
export const purgeLegacyTeacherCredentials = (): void => {
  try {
    localStorage.removeItem('quiz_master_teachers_v2');
    localStorage.removeItem('quiz_master_current_teacher_v2');
  } catch {
    /* ignore */
  }
};

export const getStoredSubjects = (): Subject[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
      return DEFAULT_SUBJECTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading subjects:', e);
    return DEFAULT_SUBJECTS;
  }
};

export const saveStoredSubjects = (subjects: Subject[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  } catch (e) {
    console.error('Error saving subjects:', e);
  }
};

export const getStoredTopics = (): Topic[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TOPICS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(DEFAULT_TOPICS));
      return DEFAULT_TOPICS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading topics:', e);
    return DEFAULT_TOPICS;
  }
};

export const saveStoredTopics = (topics: Topic[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  } catch (e) {
    console.error('Error saving topics:', e);
  }
};

export const getStoredQuizzes = (): Quiz[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUIZZES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(DEFAULT_QUIZZES));
      return DEFAULT_QUIZZES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading quizzes:', e);
    return DEFAULT_QUIZZES;
  }
};

export const saveStoredQuizzes = (quizzes: Quiz[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
  } catch (e) {
    console.error('Error saving quizzes:', e);
  }
};

export const getSubjects = getStoredSubjects;
export const saveSubjects = saveStoredSubjects;
export const getTopics = getStoredTopics;
export const saveTopics = saveStoredTopics;
export const getQuizzes = getStoredQuizzes;
export const saveQuizzes = saveStoredQuizzes;

export const saveQuizProgress = (quizId: string, data: any): void => {
  try {
    localStorage.setItem(`${STORAGE_KEYS.QUIZ_PROGRESS_PREFIX}${quizId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving progress:', e);
  }
};

export const getQuizProgress = (quizId: string): any => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.QUIZ_PROGRESS_PREFIX}${quizId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error getting progress:', e);
    return null;
  }
};

export const clearQuizProgress = (quizId: string): void => {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.QUIZ_PROGRESS_PREFIX}${quizId}`);
  } catch (e) {
    console.error('Error clearing progress:', e);
  }
};

export interface SavedQuizProgressEntry {
  quizId: string;
  answeredCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
}

export const listSavedQuizProgress = (): SavedQuizProgressEntry[] => {
  const entries: SavedQuizProgressEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_KEYS.QUIZ_PROGRESS_PREFIX)) continue;
      const quizId = key.slice(STORAGE_KEYS.QUIZ_PROGRESS_PREFIX.length);
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const answers = parsed?.answers || {};
      const answeredCount = Object.values(answers).filter(
        (v) => Boolean(v) && v !== 'SHOW_ANSWERS_FLAG'
      ).length;
      const totalQuestions = Array.isArray(parsed?.questions) ? parsed.questions.length : 0;
      if (answeredCount > 0 || (parsed?.writtenInputData && Object.keys(parsed.writtenInputData).length > 0)) {
        entries.push({
          quizId,
          answeredCount,
          totalQuestions,
          timeSpentSeconds: Number(parsed?.timeSpentSeconds) || 0,
        });
      }
    }
  } catch (e) {
    console.error('Error listing saved quiz progress:', e);
  }
  return entries;
};


