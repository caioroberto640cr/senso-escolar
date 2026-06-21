import React, { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { useNav } from '../nav';
import { api } from '../api';
import { useEtapa } from '../etapa';
import { useDados } from '../useDados';
import { cores, etapaLabel, toneIdeb, UFS, BBOX_BR } from '../theme';
import { Carregando, Aviso, SelectModal } from '../ui';

const MAPA_URL = 'https://raw.githubusercontent.com/caioroberto640cr/senso-escolar/main/brand/brasil-mapa.png';

// projeta lat/long para % dentro do mapa (mesmo bbox usado para gerar a imagem)
function pos(lat: number, lng: number) {
  const x = ((lng - BBOX_BR.oeste) / (BBOX_BR.leste - BBOX_BR.oeste)) * 100;
  const y = ((BBOX_BR.norte - lat) / (BBOX_BR.norte - BBOX_BR.sul)) * 100;
  return { x, y };
}

const UF_OPCOES = [{ v: 'todas', label: 'Todos' }, ...UFS.map((u) => ({ v: u, label: u }))];

export default function Mapa() {
  const { navegar } = useNav();
  const { etapa } = useEtapa();
  const [uf, setUf] = useState('todas');
  const { data, carregando, erro } = useDados(() => api.mapa({ etapa, uf, limit: 350 }), [etapa, uf]);

  const itens = (data?.itens ?? []).filter(
    (e) => e.latitude != null && e.longitude != null
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: cores.canvas }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: cores.inkSoft }}>
            Escolas no Brasil · {etapaLabel(etapa)}
          </Text>
          <Text style={{ fontSize: 11, color: cores.inkFaint }}>
            {carregando ? 'carregando…' : `${itens.length} no mapa${data?.amostrado ? ' (amostra)' : ''}`}
          </Text>
        </View>
        <SelectModal rotulo="UF" valor={uf} opcoes={UF_OPCOES} onChange={setUf} />
      </View>

      {/* Mapa: imagem do Brasil + pontos absolutos */}
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: cores.surface, borderRadius: 16, borderWidth: 1, borderColor: cores.line, overflow: 'hidden' }}>
        <Image source={{ uri: MAPA_URL }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="contain" />
        {!carregando && itens.map((e) => {
          const p = pos(e.latitude, e.longitude);
          if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null;
          const cor = toneIdeb(e.ideb).cor;
          return (
            <Pressable
              key={e.id_escola}
              onPress={() => navegar('DetalheEscola', { id: e.id_escola, nome: e.nome })}
              hitSlop={6}
              style={{
                position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
                width: 9, height: 9, borderRadius: 5, marginLeft: -4.5, marginTop: -4.5,
                backgroundColor: cor, borderWidth: 1, borderColor: '#fff',
              }}
            />
          );
        })}
        {carregando && <View style={{ flex: 1, justifyContent: 'center' }}><Carregando /></View>}
      </View>

      {erro && <Aviso texto={erro} />}

      {/* Legenda */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        {[['Bom (≥6)', cores.brand], ['Atenção', cores.gold], ['Crítico (<4,5)', cores.coral]].map(([l, c]) => (
          <View key={l as string} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c as string }} />
            <Text style={{ fontSize: 12, color: cores.inkSoft }}>{l}</Text>
          </View>
        ))}
      </View>

      <Text style={{ textAlign: 'center', color: cores.inkFaint, fontSize: 11 }}>
        Toque num ponto para ver a escola. Contorno: IBGE · cor pelo IDEB.
      </Text>
    </ScrollView>
  );
}
