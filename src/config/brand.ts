/**
 * مصدر واحد لاسم المنصة وهويتها.
 * أي مكان في الكود يحتاج الاسم يستورد من هنا بدل ما يكتبه يدوياً.
 */
export const BRAND = {
  nameAr: 'مقياس',
  nameEn: 'Miqyas',
  taglineAr: 'اختبر فهمك، وقِس تقدّمك',
  taglineEn: 'Test your understanding. Measure your progress.',
  descriptionAr:
    'مقياس منصة عربية للاختبارات التفاعلية: حل اختبارات المقررات، راجع أخطاءك، وتابع مستواك. وللمعلمين أدوات لبناء الاختبارات ونشرها.',
  descriptionEn:
    'Miqyas is an Arabic-first platform for interactive quizzes: practice course quizzes, review your mistakes, and track your level. Teachers get tools to build and publish quizzes.',
} as const;

/** يرجع الاسم المناسب للغة الحالية */
export const brandName = (isArabic: boolean) => (isArabic ? BRAND.nameAr : BRAND.nameEn);

