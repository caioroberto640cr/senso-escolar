import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useDados } from '../useDados';
import { cores } from '../theme';
import { Carregando, Aviso } from '../ui';

const sev = {
  critico: { cor: cores.coral, icone: 'warning-outline' as const, label: 'Crítico' },
  atencao: { cor: cores.gold, icone: 'alert-circle-outline' as const, label: 'Atenção' },
  info: { cor: cores.blue, icone: 'information-circle-outline' as const, label: 'Informativo' },
};

export default function Alertas() {
  const { data, carregando, erro } = useDados(() => api.alertas(), []);

  if (carregando) return <View style={{ flex: 1, backgroundColor: cores.canvas }}><Carregando /></View>;
  if (erro) return <View style={{ flex: 1, backgroundColor: cores.canvas }}><Aviso texto={erro} /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: cores.canvas }}
      data={data ?? []}
      keyExtractor={(a) => a.id_alerta}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      ListHeaderComponent={
        <Text style={{ color: cores.inkSoft, marginBottom: 4 }}>
          Gerados a partir das maiores variações reais de IDEB (2021→2023).
        </Text>
      }
      ListEmptyComponent={<Aviso texto="Nenhum alerta." />}
      renderItem={({ item }) => {
        const s = sev[item.severidade] ?? sev.info;
        return (
          <View style={{ flexDirection: 'row', gap: 12, backgroundColor: cores.surface, borderRadius: 14, borderWidth: 1, borderColor: cores.line, padding: 14 }}>
            <Ionicons name={s.icone} size={22} color={s.cor} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: cores.ink, fontWeight: '700' }}>{item.indicador}</Text>
              <Text style={{ color: cores.inkSoft, fontSize: 13, marginTop: 2 }}>{item.descricao}</Text>
              {item.nome_escola && (
                <Text style={{ color: cores.inkFaint, fontSize: 12, marginTop: 4 }}>
                  <Ionicons name="location-outline" size={12} color={cores.inkFaint} /> {item.nome_escola}
                </Text>
              )}
            </View>
            <View style={{ backgroundColor: s.cor + '22', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
              <Text style={{ color: s.cor, fontSize: 11, fontWeight: '700' }}>{s.label}</Text>
            </View>
          </View>
        );
      }}
    />
  );
}
