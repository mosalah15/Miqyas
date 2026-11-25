import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { brandName } from '../config/brand';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  subtitle?: string;
}

/**
 * شعار مقياس: مسطرة بتدريج، وعلى التدريج مؤشر كهرماني (الإبرة).
 * الرمز نفسه هو فكرة الاسم: "قياس".
 */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
    <rect width="32" height="32" rx="8" className="fill-blue-600 dark:fill-blue-500" />
    {/* خط المسطرة */}
    <path d="M6 22h20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    {/* التدريج: طويلة/قصيرة بالتناوب */}
    <path
      d="M6 22v-7M11 22v-4M16 22v-7M21 22v-4M26 22v-7"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.92"
    />
    {/* المؤشر */}
    <path d="M18.6 6h4.8L21 11.2z" className="fill-marker" />
  </svg>
);

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  subtitle,
}) => {
  const { isArabic } = useLanguage();
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <LogoMark className={`${iconSize} shrink-0`} />

      {showText && (
        <div className="flex flex-col text-start leading-tight">
          <span className={`${textSize} font-bold tracking-tight text-zinc-900 dark:text-zinc-50`}>
            {brandName(isArabic)}
          </span>
          {subtitle && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

