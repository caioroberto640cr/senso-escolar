import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Loading, ErrorState } from '../components/ui/State';
import { api, useFetch } from '../lib/api';
import { useEtapa } from '../lib/etapa';
import { exportarEscolasCSV } from '../lib/export';
import { UFS } from '../data/mock';
import { etapaLabel } from '../types';
import { cx, dependenciaLabel, scoreTone } from '../lib/utils';

type Ordem = 'ideb' | 'aprovacao' | 'nome';

/** debounce simples para a busca */
function useDebounce<T>(valor: T, ms = 350): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

export default function Schools() {
  const [busca, setBusca] = useState('');
  const [uf, setUf] = useState('todas');
  const [ordem, setOrdem] = useState<Ordem>('ideb');
  const [localizacao, setLocalizacao] = useState('todas');
  const [recorte, setRecorte] = useState('todas');
  const [limit, setLimit] = useState(24);

  const buscaDebounced = useDebounce(busca);
  const { etapa } = useEtapa();

  const { data, loading, error } = useFetch(
    () => api.escolas({ etapa, q: buscaDebounced, uf, sort: ordem, limit, localizacao, recorte }),
    [etapa, buscaDebounced, uf, ordem, limit, localizacao, recorte]
  );

  // reseta paginação ao mudar filtros
  useEffect(() => setLimit(24), [buscaDebounced, uf, ordem, etapa, localizacao, recorte]);

  return (
    <div className="space-y-5">
      {/* Barra de busca/filtros */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 border border-line px-3.5 flex-1">
            <span>🔍</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome da escola ou município..."
              className="bg-transparent outline-none py-2.5 flex-1 text-sm placeholder:text-ink-faint"
            />
          </div>
          <select
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          >
            <option value="todas">Todos os estados</option>
            {UFS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <select
            value={localizacao}
            onChange={(e) => setLocalizacao(e.target.value)}
            className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          >
            <option value="todas">Toda localização</option>
            <option value="urbana">Urbana</option>
            <option value="rural">Rural</option>
          </select>
          <select
            value={recorte}
            onChange={(e) => setRecorte(e.target.value)}
            className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          >
            <option value="todas">Todos os perfis</option>
            <option value="indigena">Indígena</option>
            <option value="quilombola">Quilombola</option>
          </select>
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordem)}
            className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          >
            <option value="ideb">Maior IDEB</option>
            <option value="aprovacao">Maior aprovação</option>
            <option value="nome">Nome (A–Z)</option>
          </select>
        </div>
      </Card>

      {error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-sm text-ink-soft">
              {data.total.toLocaleString('pt-BR')} escolas encontradas (dados reais INEP)
            </p>
            {data.total > 0 && (
              <button
                onClick={() => exportarEscolasCSV({ etapa, q: buscaDebounced, uf, localizacao, recorte })}
                className="shrink-0 rounded-xl bg-mint-500 hover:bg-mint-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
              >
                ⬇ Exportar CSV
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.itens.map((e) => {
              const tone = scoreTone(e.score_geral);
              return (
                <Link key={e.id_escola} to={`/escolas/${e.id_escola}`}>
                  <Card className="h-full hover:border-brand-300 hover:shadow-[0_12px_30px_-18px_rgba(34,90,45,0.45)] transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-ink leading-snug text-[15px]">{e.nome}</h3>
                      <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', tone.bg, tone.text)}>
                        {e.score_geral.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-ink-faint mb-3">{e.municipio} · {e.estado}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <Badge tone="brand">{dependenciaLabel(e.dependencia)}</Badge>
                      <Badge tone="neutral">{etapaLabel(etapa)}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-line pt-3">
                      <div>
                        <p className="text-[11px] text-ink-faint">IDEB</p>
                        <p className="text-sm font-semibold text-ink">{e.ideb.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-ink-faint">Aprov.</p>
                        <p className="text-sm font-semibold text-ink">
                          {e.taxa_aprovacao != null ? `${e.taxa_aprovacao}%` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-ink-faint">SAEB</p>
                        <p className="text-sm font-semibold text-ink">{e.nota_saeb ?? '—'}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {loading && <Loading label="Atualizando..." />}

          {data.total > data.itens.length && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setLimit((l) => l + 24)}
                className="rounded-xl bg-brand-50 hover:bg-brand-100 px-6 py-2.5 text-sm font-semibold text-brand-600 transition-colors"
              >
                Carregar mais ({(data.total - data.itens.length).toLocaleString('pt-BR')} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
