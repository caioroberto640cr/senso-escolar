import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useAuth } from '../auth';
import { cores } from '../theme';
import { Logo, Campo, Botao, Cartao } from '../ui';

export default function Login({ irCadastro }: { irCadastro: () => void }) {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onEntrar() {
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (e: any) {
      setErro(e?.response?.data?.erro || 'E-mail ou senha incorretos.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: cores.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Logo tamanho={56} />
        </View>

        <Cartao>
          <Text style={{ fontSize: 18, fontWeight: '700', color: cores.ink, marginBottom: 2 }}>Entrar</Text>
          <Text style={{ color: cores.inkSoft, marginBottom: 16 }}>Acesse os indicadores da educação básica.</Text>

          <View style={{ gap: 12 }}>
            <Campo label="E-mail" icone="mail-outline" value={email} onChangeText={setEmail}
              placeholder="voce@exemplo.com" autoCapitalize="none" keyboardType="email-address" />
            <Campo label="Senha" icone="lock-closed-outline" value={senha} onChangeText={setSenha}
              placeholder="Sua senha" secureTextEntry />

            {erro && (
              <Text style={{ color: cores.coralDark, backgroundColor: cores.coral + '1A', padding: 10, borderRadius: 10 }}>{erro}</Text>
            )}

            <Botao titulo="Entrar" icone="log-in-outline" onPress={onEntrar} carregando={enviando}
              desabilitado={!email || !senha} />
          </View>
        </Cartao>

        <Pressable onPress={irCadastro} style={{ marginTop: 18, alignItems: 'center' }}>
          <Text style={{ color: cores.inkSoft }}>
            Não tem conta? <Text style={{ color: cores.brandDark, fontWeight: '700' }}>Criar conta</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
