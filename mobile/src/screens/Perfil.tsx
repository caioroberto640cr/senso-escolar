import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth';
import { useEtapa } from '../etapa';
import { cores, ETAPAS, etapaLabel } from '../theme';
import { Cartao, Botao, Segmentos, Logo } from '../ui';
import { API_BASE } from '../api';

export default function Perfil() {
  const { user, sair } = useAuth();
  const { etapa, setEtapa } = useEtapa();
  const iniciais = (user?.nome || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: cores.canvas }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Cartao>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: cores.brand100, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: cores.brandDark, fontWeight: '800', fontSize: 18 }}>{iniciais}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: cores.ink }}>{user?.nome}</Text>
            <Text style={{ color: cores.inkSoft, fontSize: 13 }}>{user?.email}</Text>
            <Text style={{ color: cores.inkFaint, fontSize: 12, textTransform: 'capitalize' }}>{user?.perfil}</Text>
          </View>
        </View>
      </Cartao>

      <Cartao>
        <Text style={{ fontSize: 15, fontWeight: '700', color: cores.ink, marginBottom: 8 }}>Etapa de ensino</Text>
        <Text style={{ color: cores.inkSoft, fontSize: 12, marginBottom: 10 }}>
          Define a etapa usada nos indicadores do app. Atual: {etapaLabel(etapa)}.
        </Text>
        <Segmentos opcoes={ETAPAS.map((e) => ({ key: e.key, label: e.curto }))} valor={etapa} onPress={setEtapa} />
      </Cartao>

      <Cartao>
        <Text style={{ fontSize: 15, fontWeight: '700', color: cores.ink, marginBottom: 6 }}>Sobre o app</Text>
        <Linha icone="cube-outline" texto="React Native (Expo) + TypeScript" />
        <Linha icone="git-network-outline" texto="React Navigation (abas + pilha)" />
        <Linha icone="cloud-download-outline" texto="Dados reais via API (Axios)" />
        <Linha icone="sparkles-outline" texto="Assistente com IA (Claude)" />
        <Linha icone="server-outline" texto={API_BASE.replace('https://', '')} />
      </Cartao>

      <Botao titulo="Sair da conta" icone="log-out-outline" variante="contorno" onPress={sair} />
      <Text style={{ textAlign: 'center', color: cores.inkFaint, fontSize: 12 }}>EduInsight Mobile · v1.0</Text>
      <View style={{ alignItems: 'center', marginTop: 4 }}><Logo tamanho={28} comTexto={false} /></View>
    </ScrollView>
  );
}

function Linha({ icone, texto }: { icone: keyof typeof Ionicons.glyphMap; texto: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
      <Ionicons name={icone} size={18} color={cores.brand} />
      <Text style={{ color: cores.inkSoft, fontSize: 13, flex: 1 }}>{texto}</Text>
    </View>
  );
}
