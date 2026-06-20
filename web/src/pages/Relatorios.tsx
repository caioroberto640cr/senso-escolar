import { useState } from 'react';
import { Card, SectionTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { api, useFetch } from '../lib/api';
import { useEtapa } from '../lib/etapa';
import { etapaLabel } from '../types';
import { IconCheck, IconDownload, IconFileText, IconChartBar } from '@tabler/icons-react';
import { exportarEscolasCSV, exportarEscolasPDF } from '../lib/export';
import { REGIOES, UFS } from '../data/mock';
import { cx } from '../lib/utils';

const COLUNAS = [
  { k: 'ideb', label: 'IDEB' },
  { k: 'aprovacao', label: 'Aprovação' },
  { k: 'abandono', label: 'Abandono' },
  { k: 'reprovacao', label: 'Reprovação' },
  { k: 'saeb', label: 'Nota SAEB' },
  { k: 'distorcao', label: 'Distorção idade-série' },
];

const ATALHOS = [
  { nome: 'Escolas rurais', filtros: { localizacao: 'rural' } },
  { nome: 'Escolas indígenas', filtros: { recorte: 'indigena' } },
  { nome: 'Comunidades quilombolas', filtros: { recorte: 'quilombola' } },
  { nome: 'Desempenho crítico (IDEB < 4,5)', filtros: { desempenho: 'critico' } },
];

export default function Relatorios() {
  const { etapa } = useEtapa();
  const [cols, setCols] = useState<string[]>(COLUNAS.map((c) => c.k));
  const [regiao, setRegiao] = useState('Todas');
  const [uf, setUf] = useState('todas');
  const [localizacao, setLocalizacao] = useState('todas');

  const filtros = {
    etapa,
    regiao: regiao !== 'Todas' ? regiao : undefined,
    uf: uf !== 'todas' ? uf : undefined,
    localizacao: localizacao !== 'todas' ? localizacao : undefined,
  };

  // quantas escolas serão exportadas (com os filtros atuais)
  const contagem = useFetch(
    () => api.escolas({ ...filtros, limit: 1 }),
    [etapa, regiao, uf, localizacao]
  );

  function toggleCol(k: string) {
    setCols((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  }

  const [gerandoPdf, setGerandoPdf] = useState(false);

  function exportar() {
    exportarEscolasCSV({ ...filtros, cols });
  }

  async function exportarPdf() {
    setGerandoPdf(true);
    try {
      const sub = `Etapa: ${etapaLabel(etapa)} · Região: ${regiao}`
        + (uf !== 'todas' ? ` / ${uf}` : '')
        + (localizacao !== 'todas' ? ` · ${localizacao}` : '');
      await exportarEscolasPDF({ ...filtros, cols }, cols, sub);
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      {/* Configurador */}
      <Card>
        <SectionTitle
          title="Exportar dados das escolas"
          subtitle={`Gera um CSV (abre no Excel) com os dados reais do INEP · etapa: ${etapaLabel(etapa)}`}
        />

        <label className="block text-xs font-semibold text-ink-soft mb-2">Colunas (indicadores)</label>
        <div className="flex flex-wrap gap-2 mb-5">
          {COLUNAS.map((c) => (
            <button
              key={c.k}
              onClick={() => toggleCol(c.k)}
              className={cx(
                'inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                cols.includes(c.k) ? 'bg-brand-500 text-white' : 'bg-brand-50 text-ink-soft hover:bg-brand-100'
              )}
            >
              {cols.includes(c.k) && <IconCheck size={15} />}
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-2">Região</label>
            <select
              value={regiao}
              onChange={(e) => { setRegiao(e.target.value); setUf('todas'); }}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
            >
              <option>Todas</option>
              {REGIOES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-2">Estado (UF)</label>
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
            >
              <option value="todas">Todos</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-2">Localização</label>
            <select
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
            >
              <option value="todas">Todas</option>
              <option value="urbana">Urbana</option>
              <option value="rural">Rural</option>
            </select>
          </div>
        </div>

        {/* Prévia */}
        <div className="rounded-2xl border border-dashed border-brand-200 bg-surface-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint mb-2">Prévia da exportação</p>
          <p className="text-sm text-ink">
            <strong className="text-ink">
              {contagem.data ? contagem.data.total.toLocaleString('pt-BR') : '...'}
            </strong>{' '}
            escolas · {etapaLabel(etapa)} · {regiao}
            {uf !== 'todas' ? ` / ${uf}` : ''}
            {localizacao !== 'todas' ? ` · ${localizacao}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cols.map((k) => (
              <Badge key={k} tone="brand">{COLUNAS.find((c) => c.k === k)?.label}</Badge>
            ))}
            {cols.length === 0 && <span className="text-xs text-ink-faint">Selecione ao menos uma coluna.</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5 no-print">
          <button
            onClick={exportar}
            disabled={!contagem.data || contagem.data.total === 0}
            className="inline-flex items-center justify-center gap-1.5 flex-1 min-w-[160px] rounded-xl bg-mint-500 hover:bg-mint-600 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <IconDownload size={17} /> Exportar CSV (Excel)
          </button>
          <button
            onClick={exportarPdf}
            disabled={!contagem.data || contagem.data.total === 0 || cols.length === 0 || gerandoPdf}
            className="inline-flex items-center justify-center gap-1.5 flex-1 min-w-[160px] rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <IconFileText size={17} /> {gerandoPdf ? 'Gerando PDF…' : 'Baixar PDF (com dados)'}
          </button>
        </div>
      </Card>

      {/* Atalhos rápidos */}
      <Card padded={false} className="h-fit">
        <div className="p-5 pb-3">
          <SectionTitle title="Atalhos rápidos" subtitle="Exporta direto com um recorte" />
        </div>
        <div className="px-5 pb-5 space-y-2">
          {ATALHOS.map((a) => (
            <button
              key={a.nome}
              onClick={() => exportarEscolasCSV({ etapa, cols, ...a.filtros })}
              className="flex w-full items-center gap-3 rounded-xl border border-line p-3 hover:bg-brand-50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-brand-100 text-brand-600 grid place-items-center"><IconChartBar size={18} /></div>
              <span className="flex-1 text-sm font-medium text-ink">{a.nome}</span>
              <IconDownload size={16} className="text-brand-600" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
