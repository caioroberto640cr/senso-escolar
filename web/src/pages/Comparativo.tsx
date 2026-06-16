import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, SectionTitle } from '../components/ui/Card';
import { Loading } from '../components/ui/State';
import { api, useFetch } from '../lib/api';
import type { Escola } from '../types';
import { cx } from '../lib/utils';

const cores = ['#2f8f43', '#5ab6e8', '#f0876a'];

function useDebounce<T>(v: T, ms = 350): T {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export default function Comparativo() {
  const [busca, setBusca] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const [escolasSel, setEscolasSel] = useState<Escola[]>([]);

  const buscaD = useDebounce(busca);
  const resultados = useFetch(() => api.escolas({ q: buscaD, limit: 10, sort: 'ideb' }), [buscaD]);

  // carrega dados completos das escolas selecionadas
  useEffect(() => {
    let vivo = true;
    Promise.all(ids.map((id) => api.escola(id))).then((arr) => {
      if (vivo) setEscolasSel(arr);
    });
    return () => {
      vivo = false;
    };
  }, [ids]);

  function toggle(id: string) {
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const anos = [2017, 2019, 2021, 2023];
  const dados = anos.map((ano) => {
    const row: Record<string, number | string> = { ano };
    escolasSel.forEach((e) => {
      const v = e.historico_ideb.find((p) => p.ano === ano)?.valor;
      if (v != null) row[e.nome] = v;
    });
    return row;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      {/* Seletor */}
      <Card className="h-fit">
        <SectionTitle title="Selecionar escolas" subtitle="Busque e compare até 3 (dados reais)" />
        <div className="flex items-center gap-2 rounded-xl bg-surface-2 border border-line px-3 mb-3">
          <span>🔍</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar escola ou município..."
            className="bg-transparent outline-none py-2 text-sm flex-1 placeholder:text-ink-faint"
          />
        </div>

        {ids.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {escolasSel.map((e, i) => (
              <span
                key={e.id_escola}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 text-brand-600 px-2.5 py-1 text-xs font-medium"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: cores[i] }} />
                {e.nome.slice(0, 22)}
                <button onClick={() => toggle(e.id_escola)} className="hover:text-brand-700">✕</button>
              </span>
            ))}
          </div>
        )}

        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
          {!resultados.data ? (
            <Loading label="..." />
          ) : (
            resultados.data.itens.map((e) => {
              const ativo = ids.includes(e.id_escola);
              const bloqueado = !ativo && ids.length >= 3;
              return (
                <button
                  key={e.id_escola}
                  onClick={() => toggle(e.id_escola)}
                  disabled={bloqueado}
                  className={cx(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                    ativo ? 'bg-brand-100 text-brand-600' : 'hover:bg-brand-50 text-ink-soft',
                    bloqueado && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-ink truncate">{e.nome}</span>
                    <span className="block text-[11px] text-ink-faint">{e.municipio} · {e.estado}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold">{e.ideb.toFixed(1)}</span>
                </button>
              );
            })
          )}
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <SectionTitle title="Evolução comparativa do IDEB" subtitle="Linhas sobrepostas por escola" />
          {escolasSel.length === 0 ? (
            <p className="text-sm text-ink-faint py-16 text-center">
              Busque e selecione escolas à esquerda para comparar.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dados} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#ece9f5" vertical={false} />
                <XAxis dataKey="ano" tick={{ fontSize: 12, fill: '#9b96ad' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: '#9b96ad' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #ece9f5', fontSize: 13 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {escolasSel.map((e, i) => (
                  <Line key={e.id_escola} type="monotone" dataKey={e.nome} stroke={cores[i]} strokeWidth={3} dot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {escolasSel.length > 0 && (
          <Card padded={false}>
            <div className="p-5 pb-0">
              <SectionTitle title="Tabela comparativa" subtitle="Indicadores reais (2023)" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-faint border-b border-line">
                    <th className="px-5 py-3 font-medium">Escola</th>
                    <th className="px-5 py-3 font-medium">IDEB</th>
                    <th className="px-5 py-3 font-medium">Aprovação</th>
                    <th className="px-5 py-3 font-medium">SAEB</th>
                  </tr>
                </thead>
                <tbody>
                  {escolasSel.map((e, i) => (
                    <tr key={e.id_escola} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: cores[i] }} />
                          <span className="font-medium text-ink">{e.nome}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink">{e.ideb.toFixed(1)}</td>
                      <td className="px-5 py-3 text-ink">{e.taxa_aprovacao != null ? `${e.taxa_aprovacao}%` : '—'}</td>
                      <td className="px-5 py-3 text-ink">{e.nota_saeb ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
