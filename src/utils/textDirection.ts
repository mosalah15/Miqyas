/**
 * Utility for detecting text direction (RTL vs LTR)
 * specifically designed to ensure Arabic questions align right (RTL)
 * and English questions align left (LTR), regardless of page language.
 */

export function isArabicText(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;

  // Strip image tags, code tags, numbers, punctuation, spaces
  const clean = text
    .replace(/<[^>]*>/g, '')
    .replace(/\[\s*img\s*:[^\]]*\]/gi, '')
    .replace(/[0-9\s.,!?:;()[\]{}<>"'`~@#$%^&*_\-+=|\\/،؛؟]/g, '');

  if (!clean) return false;

  const arabicCharRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const arabicMatches = clean.match(arabicCharRegex);
  const arabicCount = arabicMatches ? arabicMatches.length : 0;

  const latinCharRegex = /[a-zA-Z]/g;
  const latinMatches = clean.match(latinCharRegex);
  const latinCount = latinMatches ? latinMatches.length : 0;

  // More Arabic characters than Latin
  if (arabicCount > latinCount) return true;
  // Has Arabic and no Latin
  if (arabicCount > 0 && latinCount === 0) return true;
  // Substantial Arabic presence (35% or more)
  if (arabicCount / clean.length >= 0.35) return true;

  // Check first word
  const firstWordMatch = text.match(/[^\s\d\p{P}]+/u);
  if (firstWordMatch && arabicCharRegex.test(firstWordMatch[0]) && arabicCount >= 3) {
    if (arabicCount / (arabicCount + latinCount) >= 0.3) {
      return true;
    }
  }

  return false;
}

export function getQuestionDirection(questionText?: string | null): 'rtl' | 'ltr' {
  return isArabicText(questionText) ? 'rtl' : 'ltr';
}

export function getQuestionAlign(questionText?: string | null): 'text-right' | 'text-left' {
  return isArabicText(questionText) ? 'text-right' : 'text-left';
}

export function getDirectionClasses(questionText?: string | null) {
  const isRTL = isArabicText(questionText);
  return {
    dir: (isRTL ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    align: isRTL ? 'text-right' : 'text-left',
    isRTL,
  };
}

