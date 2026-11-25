import React from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ExamModeToggleProps {
  isExamMode: boolean;
  onToggle: (checked: boolean) => void;
  className?: string;
}

export const ExamModeToggle: React.FC<ExamModeToggleProps> = ({
  isExamMode,
  onToggle,
  className = '',
}) => {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => onToggle(!isExamMode)}
      className={`inline-flex items-center gap-1.5 min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl cursor-pointer transition-colors select-none border text-xs font-semibold whitespace-nowrap ${
        isExamMode
          ? 'bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      } ${className}`}
      title={isExamMode ? 'Exam Mode: answers shown after completion' : 'Instant Mode: immediate feedback per question'}
    >
      {isExamMode ? (
        <FileText className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="hidden xs:inline sm:inline">{isExamMode ? t('examModeActive') : t('instantModeActive')}</span>
    </button>
  );
};

