import { cx } from '../lib/utils';

/** Ícone da marca: livro aberto com barras de dados em cima.
 *  mono = branco (para o quadrado verde); senão, versão colorida. */
function BookMark({ size = 26, mono = false }: { size?: number; mono?: boolean }) {
  const pgFrente = mono ? '#ffffff' : '#0e7a38';
  const pgFundo = mono ? '#ffffff' : '#17a24a';
  const spine = mono ? '#0e7a38' : '#0b5e2b';
  const barA = mono ? '#ffffff' : '#1f6fe0';
  const barB = mono ? '#ffffff' : '#17a24a';
  const barC = mono ? '#ffffff' : '#f4a11e';
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path d="M7 31 L24 27 L24 39 L7 35 Z" fill={pgFrente} />
      <path d="M41 31 L24 27 L24 39 L41 35 Z" fill={pgFundo} opacity={mono ? 0.78 : 1} />
      <line x1="24" y1="27.5" x2="24" y2="38.5" stroke={spine} strokeWidth="1" />
      <rect x="13.5" y="18" width="4.5" height="8" rx="1" fill={barA} />
      <rect x="21.7" y="11" width="4.5" height="15" rx="1" fill={barB} />
      <rect x="29.9" y="14.5" width="4.5" height="11.5" rx="1" fill={barC} />
    </svg>
  );
}

/** Marca completa do EduInsight (ícone em quadrado verde + wordmark Sora em duas cores). */
export function Logo({
  withText = true,
  tileSize = 38,
  className,
}: {
  withText?: boolean;
  tileSize?: number;
  className?: string;
}) {
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <div
        className="grid place-items-center rounded-xl bg-brand-500 shrink-0"
        style={{ width: tileSize, height: tileSize }}
      >
        <BookMark size={Math.round(tileSize * 0.68)} mono />
      </div>
      {withText && (
        <div className="leading-tight">
          <p className="font-display font-semibold text-[17px] tracking-tight">
            <span className="text-brand-600">Edu</span>
            <span className="text-ink">Insight</span>
          </p>
          <p className="text-[11px] text-ink-faint">BI Educacional</p>
        </div>
      )}
    </div>
  );
}
