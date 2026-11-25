import React, { useState, useEffect, useMemo } from 'react';
import { Question } from '../../types';
import {
  X,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Shuffle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { isArabicText } from '../../utils/textDirection';

interface FlashcardsModalProps {
  isOpen: boolean;
  title: string;
  questions: Question[];
  onClose: () => void;
}

const cleanQ = (text: string) =>
  text
    .replace(/^(\s*\d+[\.\)]\s*)/, '')
    .replace(/^(question|سؤال)\s*(\d+)?\s*[:\-]\s*/i, '')
    .replace(/^\s*\d+[\.\)]\s*/, '')
    .trim();

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({
  isOpen,
  title,
  questions,
  onClose,
}) => {
  const { isArabic } = useLanguage();
  const [deck, setDeck] = useState<Question[]>(questions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showChoicesOnFront, setShowChoicesOnFront] = useState(false);
  const [ratings, setRatings] = useState<Record<string, 'knew' | 'again'>>({});
  const [completedRound, setCompletedRound] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDeck(questions);
      setCurrentIndex(0);
      setIsFlipped(false);
      setRatings({});
      setCompletedRound(false);
    }
  }, [isOpen, questions]);

  const currentCard = deck[currentIndex] || null;
  const PrevIcon = isArabic ? ArrowRight : ArrowLeft;
  const NextIcon = isArabic ? ArrowLeft : ArrowRight;

  const knewCount = useMemo(
    () => deck.filter((q) => ratings[q.id] === 'knew').length,
    [deck, ratings]
  );
  const againCards = useMemo(
    () => deck.filter((q) => ratings[q.id] === 'again'),
    [deck, ratings]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!completedRound) setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        if (completedRound) return;
        setIsFlipped(false);
        setCurrentIndex((i) =>
          isArabic ? Math.max(0, i - 1) : Math.min(deck.length - 1, i + 1)
        );
      } else if (e.key === 'ArrowLeft') {
        if (completedRound) return;
        setIsFlipped(false);
        setCurrentIndex((i) =>
          isArabic ? Math.min(deck.length - 1, i + 1) : Math.max(0, i - 1)
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deck.length, isArabic, completedRound, onClose]);

  if (!isOpen || questions.length === 0) return null;

  const handleRate = (status: 'knew' | 'again') => {
    if (!currentCard) return;
    setRatings((prev) => ({ ...prev, [currentCard.id]: status }));
    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((i) => i + 1);
    } else {
      setCompletedRound(true);
    }
  };

  const handleShuffleDeck = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompletedRound(false);
  };

  const handleStudyWeakOnly = () => {
    if (againCards.length === 0) return;
    setDeck(againCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setRatings({});
    setCompletedRound(false);
  };

  const handleRestartAll = () => {
    setDeck(questions);
    setCurrentIndex(0);
    setIsFlipped(false);
    setRatings({});
    setCompletedRound(false);
  };

  const progressPct = deck.length > 0 ? Math.round(((currentIndex + (completedRound ? 1 : 0)) / deck.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-start">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {title}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                {isArabic
                  ? `بطاقة ${Math.min(currentIndex + 1, deck.length)} من ${deck.length} · أتقنت ${knewCount}`
                  : `Card ${Math.min(currentIndex + 1, deck.length)} of ${deck.length} · ${knewCount} known`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowChoicesOnFront((v) => !v)}
              className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                showChoicesOnFront
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}
              title={isArabic ? 'إظهار الخيارات على وجه البطاقة' : 'Show options on front'}
            >
              {showChoicesOnFront ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isArabic ? 'الخيارات' : 'Options'}</span>
            </button>

            <button
              type="button"
              onClick={handleShuffleDeck}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title={isArabic ? 'خلط البطاقات' : 'Shuffle deck'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              aria-label={isArabic ? 'إغلاق' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-1 bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-between gap-5">
          {completedRound ? (
            <div className="py-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {isArabic ? 'أنهيت مراجعة البطاقات!' : 'Flashcard Session Complete!'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {isArabic
                    ? `أتقنت ${knewCount} من ${deck.length} بطاقة${againCards.length > 0 ? ` · تحتاج مراجعة: ${againCards.length}` : ''}`
                    : `Known: ${knewCount}/${deck.length}${againCards.length > 0 ? ` · Review again: ${againCards.length}` : ''}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                {againCards.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStudyWeakOnly}
                    className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>
                      {isArabic
                        ? `مراجعة الصعبة فقط (${againCards.length})`
                        : `Review Difficult (${againCards.length})`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRestartAll}
                  className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isArabic ? 'إعادة الكل من البداية' : 'Restart Full Deck'}</span>
                </button>
              </div>
            </div>
          ) : currentCard ? (
            <>
              {/* Interactive Flip Card */}
              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsFlipped((prev) => !prev);
                  }
                }}
                dir={isArabicText(currentCard.question) ? 'rtl' : 'ltr'}
                className={`min-h-[260px] sm:min-h-[300px] rounded-2xl border p-5 sm:p-8 flex flex-col justify-between cursor-pointer transition-colors select-none ${
                  isFlipped
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-zinc-50 dark:bg-zinc-950/70 border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {isFlipped
                      ? isArabic
                        ? 'الإجابة والشرح'
                        : 'Answer & Explanation'
                      : isArabic
                      ? 'السؤال — اضغط لكشف الإجابة'
                      : 'Question — Click to flip'}
                  </span>
                  <span className="font-mono tabular-nums">
                    #{currentIndex + 1}
                  </span>
                </div>

                {!isFlipped ? (
                  <div className="space-y-4 my-auto text-start">
                    <p className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-relaxed">
                      {cleanQ(currentCard.question)}
                    </p>

                    {currentCard.imageURL && (
                      <img
                        src={currentCard.imageURL}
                        alt="Question visual"
                        className="max-h-44 rounded-xl border border-zinc-200 dark:border-zinc-800 object-contain"
                      />
                    )}

                    {showChoicesOnFront && currentCard.type === 'mcq' && currentCard.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {currentCard.options.map((opt, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 my-auto text-start">
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
                        {isArabic ? 'الإجابة الصحيحة:' : 'Correct Answer:'}
                      </span>
                      <p className="text-base sm:text-lg font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
                        {currentCard.correctAnswer}
                      </p>
                    </div>

                    {currentCard.explanation && (
                      <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900 text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                        <span className="font-semibold block mb-0.5">
                          {isArabic ? 'الشرح:' : 'Explanation:'}
                        </span>
                        {currentCard.explanation}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-zinc-400 text-center pt-3">
                  {isArabic ? 'مسافة (Space) أو اضغط البطاقة للقلب' : 'Press Space or click card to flip'}
                </div>
              </div>

              {/* Footer Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentIndex((i) => Math.max(0, i - 1));
                    }}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
                  >
                    <PrevIcon className="w-4 h-4" />
                    <span>{isArabic ? 'السابق' : 'Prev'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentIndex >= deck.length - 1}
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentIndex((i) => Math.min(deck.length - 1, i + 1));
                    }}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
                  >
                    <span>{isArabic ? 'التالي' : 'Next'}</span>
                    <NextIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRate('again')}
                    className="flex-1 sm:flex-initial min-h-[40px] px-4 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold cursor-pointer"
                  >
                    {isArabic ? 'أحتاج مراجعة' : 'Review Again'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate('knew')}
                    className="flex-1 sm:flex-initial min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isArabic ? 'أتقنتها' : 'Knew It'}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

