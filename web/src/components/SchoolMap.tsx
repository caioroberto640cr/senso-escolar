import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EscolaMapa } from '../types';
import { scoreTone, dependenciaLabel } from '../lib/utils';

export type Bbox = { oeste: number; sul: number; leste: number; norte: number };

/** Pin pastel circular colorido pelo desempenho da escola. */
function pinIcon(score: number): L.DivIcon {
  const { hex } = scoreTone(score);
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:28px;height:28px;">
        <div style="width:28px;height:28px;border-radius:50% 50% 50% 0;
          background:${hex};transform:rotate(-45deg);border:3px solid #fff;
          box-shadow:0 4px 10px -2px rgba(34,90,45,.4);"></div>
        <div style="position:absolute;top:6px;left:0;width:28px;text-align:center;
          font:700 10px/16px Inter,sans-serif;color:#fff;">${score.toFixed(1)}</div>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

function FitBounds({ escolas }: { escolas: EscolaMapa[] }) {
  const map = useMap();
  useEffect(() => {
    if (escolas.length === 0) return;
    const t = setTimeout(() => {
      map.invalidateSize();
      const bounds = L.latLngBounds(escolas.map((e) => [e.latitude, e.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 7 });
    }, 60);
    return () => clearTimeout(t);
  }, [escolas, map]);
  return null;
}

/** Reporta a área visível (debounced) — usado para carregar só as escolas em tela. */
function ViewportReporter({ onViewport }: { onViewport: (b: Bbox) => void }) {
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const emitir = (map: L.Map) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => {
      const b = map.getBounds();
      onViewport({ oeste: b.getWest(), sul: b.getSouth(), leste: b.getEast(), norte: b.getNorth() });
    }, 350);
  };
  const map = useMapEvents({ moveend: () => emitir(map), zoomend: () => emitir(map) });
  useEffect(() => {
    setTimeout(() => { map.invalidateSize(); emitir(map); }, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function SchoolMap({
  escolas,
  className,
  interactive = true,
  cluster = true,
  onViewport,
}: {
  escolas: EscolaMapa[];
  className?: string;
  interactive?: boolean;
  cluster?: boolean;
  /** Se fornecido, o mapa carrega por área visível (não usa auto-zoom). */
  onViewport?: (b: Bbox) => void;
}) {
  const navigate = useNavigate();

  const marcadores = escolas.map((e) => {
    const tone = scoreTone(e.score_geral);
    return (
      <Marker key={e.id_escola} position={[e.latitude, e.longitude]} icon={pinIcon(e.score_geral)}>
        <Popup>
          <div className="w-56">
            <h3 className="font-semibold text-[15px] text-ink leading-snug">{e.nome}</h3>
            <p className="text-xs text-ink-faint mb-2">
              {e.municipio} · {e.estado} · {dependenciaLabel(e.dependencia)}
            </p>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <div className="rounded-lg bg-brand-50 px-2 py-1.5 text-center">
                <p className="text-[10px] text-ink-faint">IDEB</p>
                <p className="text-sm font-semibold text-ink">{e.ideb.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-mint-100 px-2 py-1.5 text-center">
                <p className="text-[10px] text-ink-faint">Aprov.</p>
                <p className="text-sm font-semibold text-ink">
                  {e.taxa_aprovacao != null ? `${e.taxa_aprovacao}%` : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-peach-100 px-2 py-1.5 text-center">
                <p className="text-[10px] text-ink-faint">Abandono</p>
                <p className="text-sm font-semibold text-ink">
                  {e.abandono != null ? `${e.abandono}%` : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.bg} ${tone.text}`}>
                {tone.label}
              </span>
              <button
                onClick={() => navigate(`/escolas/${e.id_escola}`)}
                className="rounded-lg bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                Ver detalhe →
              </button>
            </div>
          </div>
        </Popup>
      </Marker>
    );
  });

  return (
    <MapContainer
      center={[-14.235, -51.925]}
      zoom={4}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
      doubleClickZoom={interactive}
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {onViewport ? <ViewportReporter onViewport={onViewport} /> : <FitBounds escolas={escolas} />}
      {cluster ? (
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {marcadores}
        </MarkerClusterGroup>
      ) : (
        marcadores
      )}
    </MapContainer>
  );
}
