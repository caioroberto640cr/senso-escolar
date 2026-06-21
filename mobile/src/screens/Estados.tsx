import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { api } from '../api';
import { useEtapa } from '../etapa';
import { useDados } from '../useDados';
import { cores, ETAPAS, etapaLabel, toneIdeb } from '../theme';
import { Segmentos, Carregando, Aviso, Etiqueta } from '../ui';

export default function Estados() {
  const { etapa, setEtapa } = useEtapa();
  const { data, carregando, erro } = useDados(() => api.indicadoresEstados(etapa), [etapa]);

  const ordenado = (data ?? []).slice().sort((a, b) => b.ideb - a.ideb);

  return (
    <View style={{ flex: 1, backgroundColor: cores.canvas }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: cores.ink }}>Ranking por estado</Text>
        <Text style={{ color: cores.inkSoft }}>IDEB médio · {etapaLabel(etapa)}</Text>
        <Segmentos opcoes={ETAPAS.map((e) => ({ key: e.key, label: e.curto }))} valor={etapa} onPress={setEtapa} />
      </View>

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <Aviso texto={erro} />
      ) : (
        <FlatList
          data={ordenado}
          keyExtractor={(e) => e.chave}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
          renderItem={({ item, index }) => {
            const t = toneIdeb(item.ideb);
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.surface, borderRadius: 12, borderWidth: 1, borderColor: cores.line, padding: 12 }}>
                <Text style={{ width: 28, textAlign: 'center', fontWeight: '800', color: index < 3 ? cores.brand : cores.inkFaint }}>{index + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: cores.ink, fontWeight: '700' }}>{item.chave}</Text>
                  <Text style={{ color: cores.inkFaint, fontSize: 12 }}>{item.escolas.toLocaleString('pt-BR')} escolas</Text>
                </View>
                <Etiqueta texto={`IDEB ${item.ideb}`} cor={t.cor} />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
