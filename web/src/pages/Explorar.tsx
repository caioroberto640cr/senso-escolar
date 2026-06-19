import { useState } from 'react';
import { Card, SectionTitle } from '../components/ui/Card';
import { Loading, ErrorState } from '../components/ui/State';
import { api, useFetch, type NoArvore } from '../lib/api';
import { cx } from '../lib/utils';

const DIMS = [
  { k: 'regiao', label: 'Região' },
  { k: 'estado', label: 'Estado' },
  { k: 'dependencia', label: 'Dependência' },
  { k: 'localizacao', label: 'Localização' },
  { k: 'porte', label: 'Porte' },
  { k: 'recorte', label: 'Perfil' },
];

type Metrica = 'escolas' | 'matriculas';

function fmt(n: number) {
  return n.toLocaleString('pt-BR');
}

function No({ no, metrica, maxIrmao, depth }: { no: NoArvore; metrica: Metrica; maxIrmao: number; depth: number }) {
  const [aberto, setAberto] = useState(depth === 0);
  const valor = no[metrica];
  const temFilhos = !!no.filhos?.length;
  const maxFilho = temFilhos ? Math.max(...no.filhos!.map((f) => f[metrica])) : 0;
  const pct = maxIrmao > 0 ? (valor / maxIrmao) * 100 : 0;

  return (
    <div>
      <button
        onClick={() => temFilhos && setAberto((a) => !a)}
        className={cx(
          'w-full flex items-center gap-2 py-1.5 pr-3 rounded-lg transition-colors text-left',
          temFilhos ? 'hover:bg-brand-50 cursor-pointer' : 'cursor-default'
        )}
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        <span className={cx('w-3 text-ink-faint text-xs shrink-0', !temFilhos && 'opacity-0')}>
          {aberto ? '▾' : '▸'}
        </span>
        <span className="text-sm text-ink w-44 shrink-0 truncate">{no.nome}</span>
        <span className="flex-1 h-2.5 rounded-full bg-brand-50 overflow-hidden">
          <span className="block h-full rounded-full bg-brand-400" style={{ width: `${Math.max(pct, 2)}%` }} />
        </span>
        <span className="text-sm font-semibold text-ink w-24 text-right shrink-0">{fmt(valor)}</span>
      </button>
      {aberto && temFilhos && (
        <div>
          {no.filhos!.map((f) => (
            <No key={f.nome} no={f} metrica={metrica} maxIrmao={maxFilho} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Explorar() {
  const [path, setPath] = useState<string[]>(['regiao', 'dependencia']);
  const [metrica, setMetrica] = useState<Metrica>('escolas');
  const { data, loading, error } = useFetch(() => api.decomposicao(path), [path]);

  function toggleDim(k: string) {
    setPath((prev) => {
      if (prev.includes(k)) return prev.filter((x) => x !== k);
      if (prev.length >= 4) return prev; // máximo 4 níveis
      return [...prev, k];
    });
  }

  const maxRaiz = data?.arvore.length ? Math.max(...data.arvore.map((n) => n[metrica])) : 0;
  const totalRotulo = metrica === 'escolas' ? 'escolas' : 'matrículas';
  const total = data ? (metrica === 'escolas' ? data.total_escolas : data.total_matriculas) : 0;

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          title="Explorar dados"
          subtitle="Monte uma quebra hierárquica — clique nas dimensões na ordem desejada"
        />

        {/* Métrica */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-ink-soft">Medir por:</span>
          {(['escolas', 'matriculas'] as Metrica[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetrica(m)}
              className={cx(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                metrica === m ? 'bg-brand-500 text-white' : 'bg-brand-50 text-ink-soft hover:bg-brand-100'
              )}
            >
              {m === 'escolas' ? 'Nº de escolas' : 'Matrículas'}
            </button>
          ))}
        </div>

        {/* Dimensões */}
        <span className="text-xs font-semibold text-ink-soft">Dimensões (até 4):</span>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {DIMS.map((d) => {
            const ordem = path.indexOf(d.k);
            const ativo = ordem >= 0;
            return (
              <button
                key={d.k}
                onClick={() => toggleDim(d.k)}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  ativo ? 'bg-brand-500 text-white' : 'bg-surface border border-line text-ink-soft hover:bg-brand-50'
                )}
              >
                {ativo && (
                  <span className="grid place-items-center h-4 w-4 rounded-full bg-white/25 text-[10px] font-bold">
                    {ordem + 1}
                  </span>
                )}
                {d.label}
              </button>
            );
          })}
        </div>
      </Card>

      {error ? (
        <ErrorState message={error} />
      ) : !data || loading ? (
        <Loading />
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-ink-soft">
              Total: <strong className="text-ink">{fmt(total)}</strong> {totalRotulo}
            </p>
            <p className="text-xs text-ink-faint">{path.length} nível(is) · clique para expandir</p>
          </div>
          <div className="border-t border-line pt-2">
            {data.arvore.map((n) => (
              <No key={n.nome} no={n} metrica={metrica} maxIrmao={maxRaiz} depth={0} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
