import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, KeyboardAvoidingView, Platform, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, type MsgChat } from '../api';
import { useEtapa } from '../etapa';
import { cores, etapaLabel } from '../theme';

const SUGESTOES = [
  'Qual o IDEB nacional?',
  'Quais estados têm o melhor IDEB?',
  'O que é o IDEB?',
];

export default function Assistente() {
  const { etapa } = useEtapa();
  const [mensagens, setMensagens] = useState<MsgChat[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente do EduInsight. Posso responder sobre IDEB, aprovação e SAEB com base nos dados reais do INEP (2023). O que você quer saber?' },
  ]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<FlatList>(null);

  async function enviar(msg?: string) {
    const conteudo = (msg ?? texto).trim();
    if (!conteudo || enviando) return;
    setTexto('');
    const novas: MsgChat[] = [...mensagens, { role: 'user', content: conteudo }];
    setMensagens(novas);
    setEnviando(true);
    try {
      const r = await api.assistente(novas.filter((m) => m.role !== 'assistant' || m.content), etapa);
      setMensagens((m) => [...m, { role: 'assistant', content: r.resposta }]);
    } catch {
      setMensagens((m) => [...m, { role: 'assistant', content: 'Não consegui responder agora. Verifique sua conexão e tente de novo.' }]);
    } finally {
      setEnviando(false);
      setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: cores.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listaRef}
        data={mensagens}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const meu = item.role === 'user';
          return (
            <View style={{ alignSelf: meu ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: meu ? cores.brand : cores.surface, borderWidth: meu ? 0 : 1, borderColor: cores.line, borderRadius: 16, padding: 12 }}>
              <Text style={{ color: meu ? '#fff' : cores.ink, fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
            </View>
          );
        }}
        ListFooterComponent={
          enviando ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 8 }}>
              <ActivityIndicator color={cores.brand} />
              <Text style={{ color: cores.inkFaint }}>pensando…</Text>
            </View>
          ) : mensagens.length <= 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {SUGESTOES.map((s) => (
                <Pressable key={s} onPress={() => enviar(s)} style={{ backgroundColor: cores.brand50, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: cores.brandDark, fontSize: 12, fontWeight: '600' }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null
        }
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: cores.line, backgroundColor: cores.surface }}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder={`Pergunte sobre ${etapaLabel(etapa)}…`}
          placeholderTextColor={cores.inkFaint}
          style={{ flex: 1, backgroundColor: cores.canvas, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, color: cores.ink }}
          onSubmitEditing={() => enviar()}
          returnKeyType="send"
        />
        <Pressable onPress={() => enviar()} disabled={!texto.trim() || enviando}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: cores.brand, alignItems: 'center', justifyContent: 'center', opacity: !texto.trim() || enviando ? 0.5 : 1 }}>
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
