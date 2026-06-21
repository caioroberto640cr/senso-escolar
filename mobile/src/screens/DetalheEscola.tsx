import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNav } from '../nav';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useDados } from '../useDados';
import { cores, etapaLabel, toneIdeb, dependenciaLabel, type EtapaKey } from '../theme';
import { Cartao, Metrica, Carregando, Aviso, Segmentos, Etiqueta } from '../ui';

const INFRA: { key: string; label: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'internet', label: 'Internet', icone: 'wifi-outline' },
  { key: 'lab_informatica', label: 'Lab. informática', icone: 'laptop-outline' },
  { key: 'lab_ciencias', label: 'Lab. ciências', icone: 'flask-outline' },
  { key: 'biblioteca', label: 'Biblioteca', icone: 'book-outline' },
  { key: 'quadra', label: 'Quadra', icone: 'basketball-outline' },
  { key: 'banheiro_acessivel', label: 'Acessível', icone: 'accessibility-outline' },
];

export default function DetalheEscola() {
  const nav = useNav();
  const id = nav.atual.params?.id as string;
  const { data, carregando, erro } = useDados(() => api.escola(id), [id]);
  const [aba, setAba] = useState<EtapaKey | null>(null);

  if (carregando) return <View style={{ flex: 1, backgroundColor: cores.canvas }}><Carregando /></View>;
  if (erro || !data) return <View style={{ flex: 1, backgroundColor: cores.canvas }}><Aviso texto={erro || 'Escola não encontrada'} /></View>;

  const etapas = (data.etapas || []).filter((e) => data.indicadores[e]) as EtapaKey[];
  const atual = aba && etapas.includes(aba) ? aba : etapas[0];
  const ind = atual ? data.indicadores[atual] : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: cores.canvas }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: cores.ink }}>{data.nome}</Text>
        <Text style={{ color: cores.inkSoft, marginTop: 2 }}>
          <Ionicons name="location-outline" size={13} color={cores.brand} /> {data.municipio}, {data.estado} · {data.regiao}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <Etiqueta texto={dependenciaLabel(data.dependencia)} />
          <Etiqueta texto={`INEP ${data.id_escola}`} cor={cores.inkFaint} />
        </View>
      </View>

      {etapas.length > 1 && (
        <Segmentos opcoes={etapas.map((e) => ({ key: e, label: etapaLabel(e) }))} valor={atual!} onPress={setAba} />
      )}

      {ind ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Metrica label={`IDEB · ${etapaLabel(atual!)}`} valor={ind.ideb.toFixed(1)} cor={toneIdeb(ind.ideb).cor} />
          <Metrica label="Aprovação" valor={ind.taxa_aprovacao ?? '—'} unidade={ind.taxa_aprovacao != null ? '%' : ''} cor={cores.brandDark} />
          <Metrica label="Abandono" valor={ind.abandono ?? '—'} unidade={ind.abandono != null ? '%' : ''} cor={cores.coral} />
          <Metrica label="Nota SAEB" valor={ind.nota_saeb ?? '—'} cor={cores.blue} />
          <Metrica label="Reprovação" valor={ind.reprovacao ?? '—'} unidade={ind.reprovacao != null ? '%' : ''} cor={cores.gold} />
          <Metrica label="Distorção" valor={ind.distorcao ?? '—'} unidade={ind.distorcao != null ? '%' : ''} cor={cores.coral} />
        </View>
      ) : (
        <Aviso texto="Sem indicadores para esta etapa." />
      )}

      {data.censo && (
        <Cartao>
          <Text style={{ fontSize: 16, fontWeight: '700', color: cores.ink, marginBottom: 4 }}>Infraestrutura</Text>
          <Text style={{ color: cores.inkFaint, fontSize: 12, marginBottom: 10 }}>
            Censo Escolar 2023 · {data.censo.matriculas != null ? `${data.censo.matriculas.toLocaleString('pt-BR')} matrículas` : 'matrículas n/d'}
            {data.censo.localizacao ? ` · ${data.censo.localizacao}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {INFRA.map((it) => {
              const tem = !!data.censo!.infra[it.key];
              return (
                <View key={it.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tem ? cores.brand50 : cores.canvas, borderWidth: 1, borderColor: cores.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Ionicons name={it.icone} size={14} color={tem ? cores.brandDark : cores.inkFaint} />
                  <Text style={{ color: tem ? cores.ink : cores.inkFaint, fontSize: 12 }}>{it.label}</Text>
                  <Ionicons name={tem ? 'checkmark-circle' : 'close-circle-outline'} size={14} color={tem ? cores.mint : cores.coral} />
                </View>
              );
            })}
          </View>
        </Cartao>
      )}
    </ScrollView>
  );
}
