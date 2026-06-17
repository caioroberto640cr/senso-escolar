import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Card, SectionTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { Loading, ErrorState } from '../components/ui/State';
import { api, useFetch } from '../lib/api';
import { useEtapa } from '../lib/etapa';
import { etapaLabel, type EtapaKey } from '../types';
import { dependenciaLabel, scoreTone, cx } from '../lib/utils';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #ece9f5',
  boxShadow: '0 8px 24px -16px rgba(34,90,45,.45)',
  fontSize: 13,
};

const pin = L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#2f8f43;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 10px -2px rgba(34,90,45,.45)"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

export default function SchoolDetail() {
  const { id } = useParams();
  const { etapa } = useEtapa();
  const escolaQ = useFetch(() => api.escola(id!), [id]);
  const [aba, setAba] = useState<EtapaKey>(etapa);

  const escola = escolaQ.data;
  // se a escola não tem a etapa selecionada, cai na primeira disponível
  useEffect(() => {
    if (escola && !escola.indicadores[aba] && escola.etapas.length) {
      setAba(escola.etapas[0]);
    }
  }, [escola, aba]);

  const nacQ = useFetch(() => api.indicadoresNacionais(aba), [aba]);
  const regQ = useFetch(() => api.indicadoresRegioes(aba), [aba]);

  if (escolaQ.error) return <ErrorState message={escolaQ.error} />;
  if (escolaQ.loading || !escola) return <Loading />;

  const ind = escola.indicadores[aba];
  const tone = ind ? scoreTone(ind.ideb) : scoreTone(0);
  const regiaoIdeb = regQ.data?.find((r) => r.chave === escola.regiao)?.ideb;

  const comparativo = (ind?.historico_ideb ?? []).map((p) => ({
    ano: p.ano,
    Escola: p.valor,
    'Média nacional': nacQ.data?.historico_ideb.find((h) => h.ano === p.ano)?.valor ?? null,
  }));

  const barras = [
    { nome: 'Esta escola', ideb: ind?.ideb ?? 0 },
    { nome: `Região ${escola.regiao}`, ideb: regiaoIdeb ?? 0 },
    { nome: 'Nacional', ideb: nacQ.data?.ideb ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <Link to="/escolas" className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium">
        ← Voltar para a busca
      </Link>

      {/* Cabeçalho */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-ink">{escola.nome}</h1>
              {ind && (
                <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${tone.bg} ${tone.text}`}>
                  {tone.label}
                </span>
              )}
            </div>
            <p className="text-ink-soft">📍 {escola.municipio}, {escola.estado} · {escola.regiao}</p>
            <p className="text-xs text-ink-faint mt-1">Código INEP: {escola.id_escola} · Fonte: INEP/IDEB 2023</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge tone="brand">{dependenciaLabel(escola.dependencia)}</Badge>
              {escola.etapas.map((et) => (
                <Badge key={et} tone="neutral">{etapaLabel(et)}</Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl bg-brand-50 hover:bg-brand-100 px-4 py-2 text-sm font-medium text-brand-600 transition-colors">
              ★ Favoritar
            </button>
            <button className="rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors">
              Exportar PDF
            </button>
          </div>
        </div>
      </Card>

      {/* Abas de etapa (só as que a escola tem) */}
      {escola.etapas.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-ink-soft mr-1">Etapa:</span>
          {escola.etapas.map((et) => (
            <button
              key={et}
              onClick={() => setAba(et)}
              className={cx(
                'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                aba === et ? 'bg-brand-500 text-white' : 'bg-surface border border-line text-ink-soft hover:bg-brand-50'
              )}
            >
              {etapaLabel(et)}
            </button>
          ))}
        </div>
      )}

      {!ind ? (
        <Card><p className="text-sm text-ink-faint">Sem dados de {etapaLabel(aba)} para esta escola.</p></Card>
      ) : (
        <>
          {/* Métricas reais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard label={`IDEB 2023 · ${etapaLabel(aba)}`} value={ind.ideb.toFixed(1)} icon="🎓" tone="brand" />
            <MetricCard
              label="Taxa de aprovação"
              value={ind.taxa_aprovacao ?? '—'}
              unit={ind.taxa_aprovacao != null ? '%' : ''}
              icon="✅"
              tone="mint"
            />
            <MetricCard label="Nota média SAEB" value={ind.nota_saeb ?? '—'} icon="📖" tone="sky" />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <SectionTitle title="Evolução do IDEB" subtitle={`${etapaLabel(aba)} · escola vs. média nacional`} />
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={comparativo} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#ece9f5" vertical={false} />
                  <XAxis dataKey="ano" tick={{ fontSize: 12, fill: '#9b96ad' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: '#9b96ad' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="Escola" stroke="#2f8f43" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Média nacional" stroke="#a3d3ac" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle title="Comparativo de IDEB 2023" subtitle="Escola vs. região vs. nacional" />
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barras} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#ece9f5" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#9b96ad' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: '#9b96ad' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#eaf4ec' }} />
                  <Bar dataKey="ideb" name="IDEB" fill="#43a85a" radius={[8, 8, 0, 0]} barSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}

      {/* Localização real */}
      <Card padded={false}>
        <div className="p-5 pb-3">
          <SectionTitle title="Localização" subtitle="Município da escola (centroide real)" />
        </div>
        <div className="h-[300px] px-5 pb-5">
          <MapContainer
            center={[escola.latitude, escola.longitude]}
            zoom={11}
            scrollWheelZoom={false}
            className="rounded-2xl"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <Marker position={[escola.latitude, escola.longitude]} icon={pin} />
          </MapContainer>
        </div>
      </Card>
    </div>
  );
}
