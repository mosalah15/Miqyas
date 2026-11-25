import React from 'react';

interface RulerStat {
  label: string;
  value: number | string;
}

/**
 * شريط إحصاءات على شكل مسطرة: الأرقام فوق خط التدريج.
 * هو العنصر البصري المميز للصفحة الرئيسية.
 */
export const RulerStats: React.FC<{ stats: RulerStat[]; className?: string }> = ({
  stats,
  className = '',
}) => (
  <div className={className}>
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-y-5">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`px-4 first:ps-0 ${i > 0 ? 'sm:border-s border-zinc-200 dark:border-zinc-800' : ''}`}
        >
          <dd className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
            {s.value}
          </dd>
          <dt className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{s.label}</dt>
        </div>
      ))}
    </dl>
    <div className="ruler-ticks mt-5" aria-hidden="true" />
  </div>
);

/** شريط تقدم بتدريج: يُستخدم لعرض نسبة الإنجاز في الاختبار أو المقرر */
export const RulerProgress: React.FC<{ value: number; max: number; label?: string }> = ({
  value,
  max,
  label,
}) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="relative h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden"
    >
      <div
        className="absolute inset-y-0 start-0 rounded-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

