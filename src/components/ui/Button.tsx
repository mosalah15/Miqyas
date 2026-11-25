import React from 'react';

/**
 * زر موحّد لكل التطبيق.
 * كان الكود القديم يكرر نفس سلسلة الكلاسات في عشرات الأماكن؛
 * هنا أربعة أشكال فقط، وكلها بحد أدنى 40px للمس على الموبايل.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 border border-transparent',
  secondary:
    'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800',
  ghost:
    'bg-transparent text-zinc-700 dark:text-zinc-300 border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 border border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 text-sm gap-1.5',
  md: 'min-h-[42px] px-4 text-sm gap-2',
  lg: 'min-h-[48px] px-6 text-base gap-2.5',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap cursor-pointer select-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) => <button type={type} className={buttonClass(variant, size, className)} {...props} />;

