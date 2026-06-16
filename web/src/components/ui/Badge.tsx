import type { ReactNode } from 'react';
import { cx } from '../../lib/utils';

type Tone = 'brand' | 'mint' | 'peach' | 'sky' | 'sun' | 'neutral';

const tones: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-600',
  mint: 'bg-mint-100 text-mint-600',
  peach: 'bg-peach-100 text-peach-600',
  sky: 'bg-sky-100 text-sky-500',
  sun: 'bg-sun-100 text-sun-500',
  neutral: 'bg-brand-50 text-ink-soft',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
