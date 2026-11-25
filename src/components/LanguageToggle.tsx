import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { buttonClass } from './ui/Button';

interface LanguageToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  className = '',
  showLabel = true,
}) => {
  const { language, toggleLanguage, isArabic } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      className={buttonClass('secondary', 'sm', className)}
      title={isArabic ? 'Switch to English' : 'التحويل إلى اللغة العربية'}
    >
      <Languages className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
      {showLabel && (
        <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
      )}
    </button>
  );
};

