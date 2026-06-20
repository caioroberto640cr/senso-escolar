import { useState } from 'react';
import { IconAlertTriangle, IconAlertCircle, IconInfoCircle, IconMapPin, IconClock } from '@tabler/icons-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Loading, ErrorState } from '../components/ui/State';
import { api, useFetch } from '../lib/api';
import { cx, formatData } from '../lib/utils';

type Sev = 'critico' | 'atencao' | 'info';
const sevTone = { critico: 'peach', atencao: 'sun', info: 'sky' } as const;
const sevLabel = { critico: 'Crítico', atencao: 'Atenção', info: 'Informativo' };
const sevIcon = { critico: IconAlertTriangle, atencao: IconAlertCircle, info: IconInfoCircle };
const sevColor = { critico: 'text-peach-600', atencao: 'text-sun-500', info: 'text-sky-500' };

export default function Alertas() {
  const [filtro, setFiltro] = useState<Sev | 'todos'>('todos');
  const { data, loading, error } = useFetch(() => api.alertas(), []);

  if (error) return <ErrorState message={error} />;
  if (loading || !data) return <Loading />;

  const lista = data.filter((a) => filtro === 'todos' || a.severidade === filtro);
  const filtros: { v: Sev | 'todos'; label: string }[] = [
    { v: 'todos', label: 'Todos' },
    { v: 'critico', label: 'Críticos' },
    { v: 'atencao', label: 'Atenção' },
    { v: 'info', label: 'Informativos' },
  ];

  return (
    <div className="space-y-5">
      <Card className="bg-brand-50 border-brand-100">
        <p className="text-sm text-ink-soft">
          Alertas gerados automaticamente a partir das <strong className="text-ink">maiores variações reais de IDEB</strong> entre 2021 e 2023 (fonte: INEP).
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.v}
            onClick={() => setFiltro(f.v)}
            className={cx(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              filtro === f.v ? 'bg-brand-500 text-white' : 'bg-surface border border-line text-ink-soft hover:bg-brand-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {lista.map((a) => {
          const SevI = sevIcon[a.severidade];
          return (
          <Card key={a.id_alerta} className="flex items-start gap-4">
            <SevI size={24} className={cx('mt-0.5 shrink-0', sevColor[a.severidade])} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-ink">{a.indicador}</h3>
                <Badge tone={sevTone[a.severidade]}>{sevLabel[a.severidade]}</Badge>
                <Badge tone="neutral">{a.condicao}</Badge>
              </div>
              <p className="text-sm text-ink-soft">{a.descricao}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-ink-faint">
                {a.nome_escola && <span className="inline-flex items-center gap-1"><IconMapPin size={13} /> {a.nome_escola}</span>}
                <span className="inline-flex items-center gap-1"><IconClock size={13} /> {formatData(a.data)}</span>
              </div>
            </div>
            {a.id_escola && (
              <a
                href={`/escolas/${a.id_escola}`}
                className="text-sm text-brand-600 font-medium hover:text-brand-500 shrink-0"
              >
                Ver escola →
              </a>
            )}
          </Card>
          );
        })}
      </div>
    </div>
  );
}
