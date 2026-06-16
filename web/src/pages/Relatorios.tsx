import { useState } from 'react';
import { Card, SectionTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { REGIOES } from '../data/mock';
import { cx } from '../lib/utils';

const indicadores = ['IDEB', 'Taxa de evasão', 'Índice de alfabetização', 'Taxa de aprovação'];
const periodos = ['2021', '2023', '2025', 'Últimos 5 anos', 'Últimos 10 anos'];

const salvos = [
  { nome: 'Panorama IDEB — Sudeste 2025', tipo: 'PDF', data: '14 jun 2026' },
  { nome: 'Evasão escolar por região', tipo: 'Excel', data: '09 jun 2026' },
  { nome: 'Comparativo capitais — alfabetização', tipo: 'PDF', data: '02 jun 2026' },
];

export default function Relatorios() {
  const [indSel, setIndSel] = useState<string[]>(['IDEB', 'Taxa de evasão']);
  const [periodo, setPeriodo] = useState('Últimos 5 anos');
  const [regiao, setRegiao] = useState('Todas');

  function toggleInd(i: string) {
    setIndSel((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* Configurador */}
      <Card>
        <SectionTitle title="Configurar relatório" subtitle="Monte um relatório personalizado para exportar" />

        <label className="block text-xs font-semibold text-ink-soft mb-2">Indicadores</label>
        <div className="flex flex-wrap gap-2 mb-5">
          {indicadores.map((i) => (
            <button
              key={i}
              onClick={() => toggleInd(i)}
              className={cx(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                indSel.includes(i) ? 'bg-brand-500 text-white' : 'bg-brand-50 text-ink-soft hover:bg-brand-100'
              )}
            >
              {indSel.includes(i) ? '✓ ' : ''}
              {i}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-2">Período</label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
            >
              {periodos.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-2">Região</label>
            <select
              value={regiao}
              onChange={(e) => setRegiao(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
            >
              <option>Todas</option>
              {REGIOES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Prévia */}
        <div className="rounded-2xl border border-dashed border-brand-200 bg-surface-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint mb-2">Prévia</p>
          <h3 className="font-semibold text-ink mb-1">
            Relatório — {indSel.join(', ') || 'sem indicadores'}
          </h3>
          <p className="text-sm text-ink-soft">
            Período: {periodo} · Região: {regiao}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {indSel.map((i) => (
              <Badge key={i} tone="brand">
                {i}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button className="flex-1 rounded-xl bg-brand-500 hover:bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors">
            Exportar PDF
          </button>
          <button className="flex-1 rounded-xl bg-mint-500 hover:bg-mint-600 py-2.5 text-sm font-semibold text-white transition-colors">
            Exportar Excel
          </button>
        </div>
      </Card>

      {/* Relatórios salvos */}
      <Card padded={false} className="h-fit">
        <div className="p-5 pb-3">
          <SectionTitle title="Relatórios salvos" />
        </div>
        <div className="px-5 pb-5 space-y-2">
          {salvos.map((s) => (
            <div
              key={s.nome}
              className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-brand-50 transition-colors cursor-pointer"
            >
              <div className="h-9 w-9 rounded-lg bg-brand-100 grid place-items-center">
                {s.tipo === 'PDF' ? '📄' : '📊'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{s.nome}</p>
                <p className="text-[11px] text-ink-faint">
                  {s.tipo} · {s.data}
                </p>
              </div>
              <button className="text-brand-600 text-sm font-medium">⬇</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
