import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { Layer } from 'leaflet';
import type { Feature } from 'geojson';
import type { AggRegiao } from '../lib/api';

/** Escala verde por IDEB (mais escuro = melhor). */
function corIDEB(ideb?: number): string {
  if (ideb == null) return '#e5e4e7';
  if (ideb >= 6) return '#1b5e2a';
  if (ideb >= 5.5) return '#2f8f43';
  if (ideb >= 5) return '#57c79a';
  if (ideb >= 4.5) return '#a3d3ac';
  if (ideb >= 4) return '#cfe8d4';
  return '#eef6ee';
}

const FAIXAS = [
  { label: '≥ 6,0', cor: '#1b5e2a' },
  { label: '5,5–6,0', cor: '#2f8f43' },
  { label: '5,0–5,5', cor: '#57c79a' },
  { label: '4,5–5,0', cor: '#a3d3ac' },
  { label: '4,0–4,5', cor: '#cfe8d4' },
  { label: '< 4,0', cor: '#eef6ee' },
];

export function ChoroplethMap({
  malha,
  dados,
  className,
}: {
  malha: any;
  dados: AggRegiao[];
  className?: string;
}) {
  const porSigla = new Map(dados.map((d) => [d.chave, d]));
  const chaveDados = dados.map((d) => `${d.chave}:${d.ideb}`).join('|'); // força re-render por etapa

  function estilo(feature?: Feature) {
    const sigla = (feature?.properties as any)?.sigla as string | undefined;
    const ideb = sigla ? porSigla.get(sigla)?.ideb : undefined;
    return { fillColor: corIDEB(ideb), weight: 1, color: '#ffffff', fillOpacity: 0.85 };
  }

  function aoCriar(feature: Feature, layer: Layer) {
    const p = feature.properties as any;
    const d = p?.sigla ? porSigla.get(p.sigla) : undefined;
    const nome = p?.nome ?? p?.sigla ?? 'UF';
    layer.bindTooltip(
      `<div style="font-family:Inter,sans-serif"><b>${nome}</b><br>IDEB: <b>${
        d?.ideb != null ? d.ideb.toFixed(1) : '—'
      }</b><br>${d?.escolas != null ? d.escolas.toLocaleString('pt-BR') + ' escolas' : ''}</div>`,
      { sticky: true }
    );
    layer.on({
      mouseover: (e) => (e.target as any).setStyle({ weight: 2.5, color: '#2f8f43' }),
      mouseout: (e) => (e.target as any).setStyle({ weight: 1, color: '#ffffff' }),
    });
  }

  return (
    <MapContainer
      center={[-14.235, -51.925]}
      zoom={4}
      scrollWheelZoom={false}
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap &copy; CARTO" />
      {malha && <GeoJSON key={chaveDados} data={malha} style={estilo as any} onEachFeature={aoCriar as any} />}

      {/* Legenda */}
      <div className="leaflet-bottom leaflet-right">
        <div className="leaflet-control rounded-xl bg-surface/95 backdrop-blur border border-line shadow-sm m-3 p-3">
          <p className="text-[11px] font-semibold text-ink-soft mb-1.5">IDEB por estado</p>
          <div className="space-y-1">
            {FAIXAS.map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-[11px] text-ink-soft">
                <span className="h-3 w-3 rounded-sm" style={{ background: f.cor }} />
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MapContainer>
  );
}
