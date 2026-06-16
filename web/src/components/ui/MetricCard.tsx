import { Card } from './Card';
import { cx } from '../../lib/utils';
import type { ReactNode } from 'react';

export function MetricCard({
  label,
  value,
  unit,
  variacao,
  icon,
  tone = 'brand',
  invertTrend = false,
}: {
  label: string;
  value: string | number;
  unit?: string;
  variacao?: number;
  icon?: ReactNode;
  tone?: 'brand' | 'mint' | 'peach' | 'sky';
  /** Para indicadores onde cair é bom (ex.: evasão) */
  invertTrend?: boolean;
}) {
  const toneBg = {
    brand: 'bg-brand-100 text-brand-600',
    mint: 'bg-mint-100 text-mint-600',
    peach: 'bg-peach-100 text-peach-600',
    sky: 'bg-sky-100 text-sky-500',
  }[tone];

  const positivo = variacao === undefined ? null : invertTrend ? variacao < 0 : variacao > 0;

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-soft">{label}</p>
          <p className="mt-1.5 text-3xl font-semibold text-ink">
            {value}
            {unit && <span className="text-base font-medium text-ink-faint ml-1">{unit}</span>}
          </p>
        </div>
        {icon && (
          <div className={cx('h-10 w-10 rounded-xl grid place-items-center text-lg', toneBg)}>
            {icon}
          </div>
        )}
      </div>
      {variacao !== undefined && variacao !== 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-sm">
          <span
            className={cx(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
              positivo ? 'bg-mint-100 text-mint-600' : 'bg-peach-100 text-peach-600'
            )}
          >
            {variacao > 0 ? '▲' : '▼'} {Math.abs(variacao)}
          </span>
          <span className="text-ink-faint text-xs">vs. período anterior</span>
        </div>
      )}
    </Card>
  );
}
