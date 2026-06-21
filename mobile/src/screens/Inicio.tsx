import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useNav } from '../nav';
import { api } from '../api';
import { useEtapa } from '../etapa';
import { useDados } from '../useDados';
import { cores, ETAPAS, etapaLabel, toneIdeb } from '../theme';
import { Cartao, Metrica, Carregando, Aviso, Botao, Segmentos, Etiqueta } from '../ui';

export default function Inicio() {
  const { navegar } = useNav();
  const { etapa, setEtapa } = useEtapa();
  const nac = useDados(() => api.indicadoresNacionais(etapa), [etapa]);
  const reg = useDados(() => api.indicadoresRegioes(etapa), [etapa]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: cores.canvas }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => setEtapa(etapa)} />}
    >
      <View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: cores.ink }}>Panorama nacional</Text>
        <Text style={{ color: cores.inkSoft }}>Indicadores reais do INEP · {etapaLabel(etapa)}</Text>
      </View>

      <Segmentos opcoes={ETAPAS.map((e) => ({ key: e.key, label: e.curto }))} valor={etapa} onPress={setEtapa} />

      {nac.carregando ? (
        <Carregando />
      ) : nac.erro || !nac.data ? (
        <Aviso texto={nac.erro || 'Sem dados'} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Metrica label="IDEB nacional" valor={nac.data.ideb.toFixed(2)} cor={toneIdeb(nac.data.ideb).cor} />
          <Metrica label="Aprovação" valor={nac.data.taxa_aprovacao} unidade="%" cor={cores.brandDark} />
          <Metrica label="Nota SAEB" valor={nac.data.nota_saeb} cor={cores.blue} />
          <Metrica label="Escolas" valor={nac.data.escolas.toLocaleString('pt-BR')} />
        </View>
      )}

      <Cartao>
        <Text style={{ fontSize: 16, fontWeight: '700', color: cores.ink, marginBottom: 10 }}>IDEB por região</Text>
        {reg.carregando ? (
          <Carregando />
        ) : reg.data && reg.data.length ? (
          reg.data
            .slice()
            .sort((a, b) => b.ideb - a.ideb)
            .map((r) => (
              <View key={r.chave} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: cores.line }}>
                <Text style={{ color: cores.ink, fontWeight: '600' }}>{r.chave}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: cores.inkFaint, fontSize: 12 }}>{r.escolas.toLocaleString('pt-BR')} esc.</Text>
                  <Etiqueta texto={`IDEB ${r.ideb}`} cor={toneIdeb(r.ideb).cor} />
                </View>
              </View>
            ))
        ) : (
          <Aviso texto="Sem dados de região" />
        )}
      </Cartao>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Botao titulo="Alertas" icone="notifications-outline" variante="suave" onPress={() => navegar('Alertas')} />
        </View>
        <View style={{ flex: 1 }}>
          <Botao titulo="Comparar" icone="git-compare-outline" variante="suave" onPress={() => navegar('Comparativo')} />
        </View>
      </View>

      <Text style={{ textAlign: 'center', color: cores.inkFaint, fontSize: 12, marginTop: 4 }}>
        Fonte: INEP/IDEB 2023 · etapas não são comparáveis entre si.
      </Text>
    </ScrollView>
  );
}
