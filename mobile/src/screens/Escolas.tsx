import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useNav } from '../nav';
import { api, type EscolaLista } from '../api';
import { useEtapa } from '../etapa';
import { cores, dependenciaLabel, etapaLabel, toneIdeb, UFS } from '../theme';
import { Campo, Etiqueta, Aviso, SelectModal } from '../ui';

const DEPS = [
  { v: 'todas', label: 'Todas' }, { v: 'federal', label: 'Federal' }, { v: 'estadual', label: 'Estadual' },
  { v: 'municipal', label: 'Municipal' }, { v: 'privada', label: 'Privada' },
];
const DESEMPENHOS = [
  { v: 'todos', label: 'Todos' }, { v: 'bom', label: 'Bom' }, { v: 'atencao', label: 'Atenção' }, { v: 'critico', label: 'Crítico' },
];
const UF_OPCOES = [{ v: 'todas', label: 'Todos' }, ...UFS.map((u) => ({ v: u, label: u }))];

function Chips({ opcoes, valor, onChange }: { opcoes: { v: string; label: string }[]; valor: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {opcoes.map((o) => {
        const ativo = o.v === valor;
        return (
          <Pressable key={o.v} onPress={() => onChange(o.v)}
            style={{ backgroundColor: ativo ? cores.brand : cores.brand50, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: ativo ? '#fff' : cores.inkSoft, fontSize: 12, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function Escolas() {
  const { navegar } = useNav();
  const { etapa } = useEtapa();
  const [busca, setBusca] = useState('');
  const [uf, setUf] = useState('todas');
  const [dep, setDep] = useState('todas');
  const [desempenho, setDesempenho] = useState('todos');
  const [itens, setItens] = useState<EscolaLista[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // busca com debounce; recarrega ao trocar etapa/filtros
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(null);
    const t = setTimeout(() => {
      api.escolas({ etapa, q: busca.trim() || undefined, uf, dependencia: dep, desempenho, limit: 40 })
        .then((r) => { if (vivo) { setItens(r.itens); setTotal(r.total); } })
        .catch((e) => vivo && setErro(e?.response?.data?.erro || 'Falha ao buscar'))
        .finally(() => vivo && setCarregando(false));
    }, busca ? 350 : 0);
    return () => { vivo = false; clearTimeout(t); };
  }, [busca, etapa, uf, dep, desempenho]);

  return (
    <View style={{ flex: 1, backgroundColor: cores.canvas }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Campo icone="search-outline" placeholder="Buscar por nome ou município…" value={busca} onChangeText={setBusca} autoCapitalize="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SelectModal rotulo="UF" valor={uf} opcoes={UF_OPCOES} onChange={setUf} />
          <View style={{ flex: 1 }}><Chips opcoes={DEPS} valor={dep} onChange={setDep} /></View>
        </View>
        <Chips opcoes={DESEMPENHOS} valor={desempenho} onChange={setDesempenho} />
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
                onPress={() => navegar('DetalheEscola', { id: item.id_escola, nome: item.nome })}
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
