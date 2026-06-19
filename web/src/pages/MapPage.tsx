import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { SchoolMap } from '../components/SchoolMap';
import { api, useFetch } from '../lib/api';
import { useEtapa } from '../lib/etapa';
import { UFS, REGIOES } from '../data/mock';
import { cx } from '../lib/utils';

type Desempenho = 'todos' | 'bom' | 'atencao' | 'critico';

const deps = [
  { v: 'todas', label: 'Todas' },
  { v: 'federal', label: 'Federal' },
  { v: 'estadual', label: 'Estadual' },
  { v: 'municipal', label: 'Municipal' },
  { v: 'privada', label: 'Privada' },
];

const desempenhos: { v: Desempenho; label: string; dot: string }[] = [
  { v: 'todos', label: 'Todos', dot: 'bg-ink-faint' },
  { v: 'bom', label: 'Bom (≥6)', dot: 'bg-mint-500' },
  { v: 'atencao', label: 'Atenção', dot: 'bg-sun-500' },
  { v: 'critico', label: 'Crítico', dot: 'bg-peach-500' },
];

const INFRA_FILTROS = [
  { v: 'internet', label: '🌐 Internet' },
  { v: 'lab_ciencias', label: '🔬 Lab. ciências' },
  { v: 'biblioteca', label: '📚 Biblioteca' },
  { v: 'banheiro_acessivel', label: '♿ Acessível' },
];

export default function MapPage() {
  const [uf, setUf] = useState('todas');
  const [regiao, setRegiao] = useState('todas');
  const [dep, setDep] = useState('todas');
  const [desempenho, setDesempenho] = useState<Desempenho>('todos');
  const [localizacao, setLocalizacao] = useState('todas');
  const [recorte, setRecorte] = useState('todas');
  const [infra, setInfra] = useState<string[]>([]);
  const [bbox, setBbox] = useState<string | undefined>(undefined);

  const { etapa } = useEtapa();
  const { data, loading } = useFetch(
    () => api.mapa({ etapa, uf, regiao, dependencia: dep, desempenho, localizacao, recorte, infra: infra.join(','), bbox }),
    [etapa, uf, regiao, dep, desempenho, localizacao, recorte, infra, bbox]
  );

  const toggleInfra = (v: string) =>
    setInfra((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-7rem)]">
      {/* Painel de filtros */}
      <Card className="flex flex-col overflow-y-auto">
        <h2 className="text-base font-semibold text-ink mb-1">Filtros do mapa</h2>
        <p className="text-sm text-ink-soft mb-1">
          {data ? (
            <>
              <strong className="text-ink">{data.exibidas.toLocaleString('pt-BR')}</strong> na área
              {' · '}
              {data.total.toLocaleString('pt-BR')} no total
            </>
          ) : (
            '...'
          )}
        </p>
        <p className="text-[11px] text-ink-faint mb-4">
          {data?.amostrado
            ? 'Muitas escolas nesta área — dê mais zoom para ver todas.'
            : 'Dê zoom no mapa para carregar as escolas da região.'}
        </p>

        <label className="block text-xs font-semibold text-ink-soft mb-1.5 mt-2">Região</label>
        <select
          value={regiao}
          onChange={(e) => setRegiao(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm mb-4 outline-none focus:border-brand-300"
        >
          <option value="todas">Todas as regiões</option>
          {REGIOES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Estado (UF)</label>
        <select
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm mb-4 outline-none focus:border-brand-300"
        >
          <option value="todas">Todos os estados</option>
          {UFS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Dependência</label>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {deps.map((d) => (
            <button
              key={d.v}
              onClick={() => setDep(d.v)}
              className={cx(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                dep === d.v ? 'bg-brand-500 text-white' : 'bg-brand-50 text-ink-soft hover:bg-brand-100'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Desempenho</label>
        <div className="space-y-1.5 mb-5">
          {desempenhos.map((d) => (
            <button
              key={d.v}
              onClick={() => setDesempenho(d.v)}
              className={cx(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
                desempenho === d.v ? 'bg-brand-100 text-brand-600' : 'text-ink-soft hover:bg-brand-50'
              )}
            >
              <span className={cx('h-2.5 w-2.5 rounded-full', d.dot)} />
              {d.label}
            </button>
          ))}
        </div>

        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Localização</label>
        <select
          value={localizacao}
          onChange={(e) => setLocalizacao(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm mb-4 outline-none focus:border-brand-300"
        >
          <option value="todas">Todas</option>
          <option value="urbana">Urbana</option>
          <option value="rural">Rural</option>
        </select>

        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Recorte</label>
        <select
          value={recorte}
          onChange={(e) => setRecorte(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm mb-4 outline-none focus:border-brand-300"
        >
          <option value="todas">Todos</option>
          <option value="indigena">Escola indígena</option>
          <option value="quilombola">Comunidade quilombola</option>
        </select>

        <label className="block text-xs font-semibold text-ink-soft mb-1.5">Infraestrutura</label>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {INFRA_FILTROS.map((f) => (
            <button
              key={f.v}
              onClick={() => toggleInfra(f.v)}
              className={cx(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                infra.includes(f.v) ? 'bg-brand-500 text-white' : 'bg-brand-50 text-ink-soft hover:bg-brand-100'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setUf('todas'); setRegiao('todas'); setDep('todas'); setDesempenho('todos');
            setLocalizacao('todas'); setRecorte('todas'); setInfra([]);
          }}
          className="mt-auto rounded-xl border border-line py-2 text-sm font-medium text-ink-soft hover:bg-brand-50 transition-colors"
        >
          Limpar filtros
        </button>
      </Card>

      {/* Mapa */}
      <Card padded={false} className="overflow-hidden relative">
        <div className="absolute z-[500] top-4 left-4 rounded-xl bg-surface/90 backdrop-blur px-4 py-2.5 shadow-sm border border-line">
          <p className="text-xs font-semibold text-ink-soft mb-1.5">Legenda — IDEB</p>
          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-mint-500" /> Bom</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sun-500" /> Atenção</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-peach-500" /> Crítico</span>
          </div>
        </div>
        <SchoolMap
          escolas={data?.itens ?? []}
          onViewport={(b) => setBbox(`${b.oeste},${b.sul},${b.leste},${b.norte}`)}
        />
        {data && data.itens.length === 0 && (
          <div className="absolute z-[500] inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none">
            <span className="inline-block rounded-xl bg-surface/90 backdrop-blur px-4 py-2 text-sm text-ink-soft shadow-sm border border-line">
              {loading ? 'Carregando…' : 'Nenhuma escola nesta área/filtro — afaste o zoom.'}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
