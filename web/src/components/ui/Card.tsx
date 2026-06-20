import type { ReactNode } from 'react';
import { cx } from '../../lib/utils';

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cx(
        'rounded-2xl bg-surface border border-line shadow-[0_8px_24px_-16px_rgba(34,90,45,0.3)]',
        padded && 'p-5',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-ink-soft mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
