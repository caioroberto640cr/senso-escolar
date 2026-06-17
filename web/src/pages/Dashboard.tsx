import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Link } from 'react-router-dom';
import { Card, SectionTitle } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { SchoolMap } from '../components/SchoolMap';
import { Loading, ErrorState } from '../components/ui/State';
import { api, useFetch } from '../lib/api';
import { useEtapa } from '../lib/etapa';
import { etapaLabel } from '../types';
import { formatData } from '../lib/utils';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #ece9f5',
  boxShadow: '0 8px 24px -16px rgba(34,90,45,.45)',
  fontSize: 13,
};

export default function Dashboard() {
  const { etapa } = useEtapa();
  const nac = useFetch(() => api.indicadoresNacionais(etapa), [etapa]);
  const reg = useFetch(() => api.indicadoresRegioes(etapa), [etapa]);
  const mapa = useFetch(() => api.mapa({ etapa, limit: 900 }), [etapa]);
  const alertas = useFetch(() => api.alertas(), []);

  const sevTone = { critico: 'peach', atencao: 'sun', info: 'sky' } as const;

  if (nac.error) return <ErrorState message={nac.error} />;

  return (
    <div className="space-y-6">
      {/* Métricas principais (reais) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {nac.loading || !nac.data ? (
          <Card className="sm:col-span-2 xl:col-span-4">
            <Loading />
          </Card>
        ) : (
          <>
            <MetricCard label={`IDEB Nacional · ${etapaLabel(etapa)}`} value={nac.data.ideb.toFixed(2)} icon="🎓" tone="brand" />
            <MetricCard label="Taxa de Aprovação" value={nac.data.taxa_aprovacao} unit="%" icon="✅" tone="mint" />
            <MetricCard label="Nota Média SAEB" value={nac.data.nota_saeb} icon="📖" tone="sky" />
            <MetricCard label="Escolas (reais)" value={nac.data.escolas.toLocaleString('pt-BR')} icon="🏫" tone="peach" />
          </>
        )}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle title="Evolução do IDEB nacional" subtitle={`${etapaLabel(etapa)} · média real das escolas`} />
          {nac.data ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={nac.data.historico_ideb} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#ece9f5" vertical={false} />
                <XAxis dataKey="ano" tick={{ fontSize: 12, fill: '#9b96ad' }} axisLine={false} tickLine={false} />
                <YAxis domain={[3, 6]} tick={{ fontSize: 12, fill: '#9b96ad' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="valor" name="IDEB" stroke="#2f8f43" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Loading />
          )}
        </Card>

        <Card>
          <SectionTitle title="IDEB por região" subtitle="Média real das escolas monitoradas" />
          {reg.data ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={reg.data} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#ece9f5" vertical={false} />
                <XAxis dataKey="chave" tick={{ fontSize: 11, fill: '#9b96ad' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9b96ad' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#eaf4ec' }} />
                <Bar dataKey="ideb" name="IDEB" fill="#43a85a" radius={[8, 8, 0, 0]} barSize={38} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Loading />
          )}
        </Card>
      </div>

      {/* Mapa + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" padded={false}>
          <div className="flex items-center justify-between p-5 pb-3">
            <SectionTitle title="Distribuição geográfica" subtitle="Amostra de escolas por desempenho (IDEB real)" />
            <Link to="/mapa" className="text-sm font-semibold text-brand-600 hover:text-brand-500 whitespace-nowrap">
              Abrir mapa completo →
            </Link>
          </div>
          <div className="h-[340px] px-5 pb-5">
            {mapa.data ? (
              <SchoolMap escolas={mapa.data.itens} className="rounded-2xl" />
            ) : (
              <Loading label="Carregando mapa..." />
            )}
          </div>
        </Card>

        <Card padded={false} className="flex flex-col">
          <div className="p-5 pb-3">
            <SectionTitle title="Alertas" subtitle="Maiores quedas de IDEB (2021→2023)" />
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3 max-h-[320px]">
            {alertas.data ? (
              alertas.data.slice(0, 6).map((a) => (
                <div key={a.id_alerta} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge tone={sevTone[a.severidade]}>{a.indicador}</Badge>
                    <span className="text-[11px] text-ink-faint">{formatData(a.data)}</span>
                  </div>
                  <p className="text-sm text-ink leading-snug">{a.descricao}</p>
                </div>
              ))
            ) : (
              <Loading label="..." />
            )}
          </div>
          <div className="p-4 border-t border-line">
            <Link to="/alertas" className="block text-center text-sm font-semibold text-brand-600 hover:text-brand-500">
              Ver todos os alertas
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
