import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNav } from '../nav';
import { api } from '../api';
import { useEtapa } from '../etapa';
import { useDados } from '../useDados';
import { cores, UFS, ETAPAS } from '../theme';
import { SelectModal, Segmentos } from '../ui';

const UF_OPCOES = [{ v: 'todas', label: 'Todos' }, ...UFS.map((u) => ({ v: u, label: u }))];

// Leaflet (mesma base do web): tiles CARTO + máscara do Brasil + clusters por IDEB.
const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>html,body,#map{height:100%;margin:0;background:#eef3f6}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
  var RN = window.ReactNativeWebView;
  var post = function(o){ RN && RN.postMessage(JSON.stringify(o)); };
  var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([-14.2, -51.9], 4);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(map);
  map.setMaxBounds([[-34, -74], [6, -34]]);
  map.setMinZoom(4);
  var _t;
  function emitirBbox(){
    clearTimeout(_t);
    _t = setTimeout(function(){
      var b = map.getBounds();
      post({ bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] });
    }, 350);
  }
  map.on('moveend', emitirBbox);
  map.on('zoomend', emitirBbox);
  var camadaMask = L.layerGroup().addTo(map);
  var cluster = null;
  function cor(v){ if (v >= 6) return '#17a24a'; if (v >= 4.5) return '#f4a11e'; return '#e2463a'; }
  window.renderEscolas = function(itens){
    if (cluster) { map.removeLayer(cluster); }
    cluster = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 55, showCoverageOnHover: false });
    (itens || []).forEach(function(e){
      if (e.latitude == null || e.longitude == null) return;
      var m = L.circleMarker([e.latitude, e.longitude], { radius: 5, color: '#fff', weight: 1, fillColor: cor(e.ideb), fillOpacity: 0.95 });
      m.on('click', function(){ post({ id: e.id_escola }); });
      cluster.addLayer(m);
    });
    map.addLayer(cluster);
  };
  window.renderMascara = function(geo){
    try {
      camadaMask.clearLayers();
      var mundo = [[-85,-180],[-85,180],[85,180],[85,-180]];
      var buracos = [];
      var feats = geo.type === 'FeatureCollection' ? geo.features : [geo];
      feats.forEach(function(f){
        var g = f.geometry || f;
        var polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
        polys.forEach(function(p){ buracos.push(p[0].map(function(c){ return [c[1], c[0]]; })); });
      });
      L.polygon([mundo].concat(buracos), { stroke: false, fillColor: '#eef3f6', fillOpacity: 1, interactive: false }).addTo(camadaMask);
      L.geoJSON(geo, { style: { color: '#17a24a', weight: 1.2, fill: false } }).addTo(camadaMask);
    } catch (err) {}
  };
  post({ ready: true });
  setTimeout(emitirBbox, 300);
</script></body></html>`;

export default function Mapa() {
  const { navegar } = useNav();
  const { etapa, setEtapa } = useEtapa();
  const [uf, setUf] = useState('todas');
  const [bbox, setBbox] = useState<string | undefined>(undefined);
  const webRef = useRef<WebView>(null);
  const [pronto, setPronto] = useState(false);

  // carrega por área visível (bbox) → ao dar zoom numa cidade, traz todas as escolas dali
  const { data, carregando } = useDados(() => api.mapa({ etapa, uf, bbox, limit: 3000 }), [etapa, uf, bbox]);
  const pais = useDados(() => api.malhaPais(), []);
  const itens = data?.itens ?? [];

  useEffect(() => {
    if (pronto && webRef.current) {
      webRef.current.injectJavaScript(`window.renderEscolas && renderEscolas(${JSON.stringify(itens)}); true;`);
    }
  }, [pronto, itens]);

  useEffect(() => {
    if (pronto && webRef.current && pais.data) {
      webRef.current.injectJavaScript(`window.renderMascara && renderMascara(${JSON.stringify(pais.data)}); true;`);
    }
  }, [pronto, pais.data]);

  return (
    <View style={{ flex: 1, backgroundColor: cores.canvas }}>
      <View style={{ padding: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 12, color: cores.inkFaint, flex: 1 }}>
            {carregando ? 'carregando escolas…' : `${itens.length.toLocaleString('pt-BR')} escolas no mapa${data?.amostrado ? ' (amostra)' : ''}`}
          </Text>
          <SelectModal rotulo="UF" valor={uf} opcoes={UF_OPCOES} onChange={setUf} />
        </View>
        <Segmentos opcoes={ETAPAS.map((e) => ({ key: e.key, label: e.curto }))} valor={etapa} onPress={setEtapa} />
      </View>

      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: HTML }}
        style={{ flex: 1, backgroundColor: '#eef3f6' }}
        onMessage={(ev) => {
          try {
            const msg = JSON.parse(ev.nativeEvent.data);
            if (msg.ready) setPronto(true);
            else if (msg.bbox) setBbox(msg.bbox.join(','));
            else if (msg.id) navegar('DetalheEscola', { id: String(msg.id) });
          } catch {}
        }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 8, backgroundColor: cores.surface, borderTopWidth: 1, borderTopColor: cores.line }}>
        {[['Bom (≥6)', cores.brand], ['Atenção', cores.gold], ['Crítico (<4,5)', cores.coral]].map(([l, c]) => (
          <View key={l as string} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c as string }} />
            <Text style={{ fontSize: 12, color: cores.inkSoft }}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
