import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, type EscolaLista } from '../api';
import { useEtapa } from '../etapa';
import { cores, dependenciaLabel, etapaLabel, toneIdeb } from '../theme';
import { Campo, Etiqueta, Aviso } from '../ui';

export default function Escolas() {
  const nav = useNavigation<any>();
  const { etapa } = useEtapa();
  const [busca, setBusca] = useState('');
  const [itens, setItens] = useState<EscolaLista[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // busca com debounce; recarrega ao trocar etapa
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    const t = setTimeout(() => {
      api.escolas({ etapa, q: busca.trim() || undefined, limit: 40 })
        .then((r) => { if (vivo) { setItens(r.itens); setTotal(r.total); } })
        .catch((e) => vivo && setErro(e?.response?.data?.erro || 'Falha ao buscar'))
        .finally(() => vivo && setCarregando(false));
    }, busca ? 350 : 0);
    return () => { vivo = false; clearTimeout(t); };
  }, [busca, etapa]);

  return (
    <View style={{ flex: 1, backgroundColor: cores.canvas }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: cores.ink }}>Escolas</Text>
        <Campo icone="search-outline" placeholder="Buscar por nome ou município…" value={busca} onChangeText={setBusca} autoCapitalize="none" />
        <Text style={{ color: cores.inkFaint, fontSize: 12 }}>
          {carregando ? 'Buscando…' : `${total.toLocaleString('pt-BR')} escolas · ${etapaLabel(etapa)}`}
        </Text>
      </View>

      {carregando && itens.length === 0 ? (
        <ActivityIndicator color={cores.brand} style={{ marginTop: 30 }} />
      ) : erro ? (
        <Aviso texto={erro} />
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(e) => e.id_escola}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
          ListEmptyComponent={<Aviso texto="Nenhuma escola encontrada." />}
          renderItem={({ item }) => {
            const t = toneIdeb(item.ideb);
            return (
              <Pressable
                onPress={() => nav.navigate('DetalheEscola', { id: item.id_escola, nome: item.nome })}
                style={{ backgroundColor: cores.surface, borderRadius: 14, borderWidth: 1, borderColor: cores.line, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: t.cor + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: t.cor, fontWeight: '800', fontSize: 15 }}>{item.ideb.toFixed(1)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: cores.ink, fontWeight: '700' }}>{item.nome}</Text>
                  <Text numberOfLines={1} style={{ color: cores.inkSoft, fontSize: 12 }}>
                    {item.municipio} · {item.estado} · {dependenciaLabel(item.dependencia)}
                  </Text>
                </View>
                <Etiqueta texto={t.label} cor={t.cor} />
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
