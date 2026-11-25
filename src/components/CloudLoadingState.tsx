import React from 'react';
import { Loader2, AlertCircle, ArrowLeft, ArrowRight, Cloud } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface CloudLoadingStateProps {
  status: 'loading' | 'not-found';
  title?: string;
  subtitle?: string;
  onBackHome?: () => void;
}

export const CloudLoadingState: React.FC<CloudLoadingStateProps> = ({
  status,
  title,
  subtitle,
  onBackHome,
}) => {
  const { isArabic } = useLanguage();
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-7 text-center">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 relative">
            <Cloud className="w-5 h-5" />
            <Loader2 className="w-11 h-11 animate-spin text-blue-500/40 absolute inset-0" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1.5">
            {title || (isArabic ? 'جاري تحميل البيانات...' : 'Loading from Cloud...')}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {subtitle ||
              (isArabic
                ? 'يتم الآن جلب المحتوى المطلوب من قاعدة البيانات، لحظات من فضلك.'
                : 'Fetching the requested content from the cloud database, please wait a moment.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-7 text-center">
        <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1.5">
          {title || (isArabic ? 'لم يتم العثور على المحتوى' : 'Content Not Found')}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          {subtitle ||
            (isArabic
              ? 'قد يكون الرابط غير صحيح أو تم حذف هذا المحتوى من قِبل المعلم.'
              : 'The link may be invalid or this content may have been removed.')}
        </p>
        {onBackHome && (
          <button
            onClick={onBackHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[40px] px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <BackIcon className="w-4 h-4" />
            <span>{isArabic ? 'العودة للصفحة الرئيسية' : 'Back to Home'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

