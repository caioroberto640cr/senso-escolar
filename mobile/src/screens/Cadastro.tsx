import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useAuth } from '../auth';
import { cores } from '../theme';
import { Logo, Campo, Botao, Cartao } from '../ui';

const PERFIS = [
  { v: 'pai', label: 'Pai / Responsável' },
  { v: 'docente', label: 'Docente' },
  { v: 'gestor', label: 'Gestor' },
];

export default function Cadastro({ irLogin }: { irLogin: () => void }) {
  const { cadastrar } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('pai');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onCadastrar() {
    setErro(null);
    setEnviando(true);
    try {
      await cadastrar({ nome: nome.trim(), email: email.trim(), senha, perfil });
    } catch (e: any) {
      setErro(e?.response?.data?.erro || 'Não foi possível criar a conta.');
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: cores.ink, marginBottom: 2 }}>Criar conta</Text>
          <Text style={{ color: cores.inkSoft, marginBottom: 16 }}>Leva menos de um minuto.</Text>

          <View style={{ gap: 12 }}>
            <Campo label="Nome completo" icone="person-outline" value={nome} onChangeText={setNome} placeholder="Seu nome" />
            <Campo label="E-mail" icone="mail-outline" value={email} onChangeText={setEmail}
              placeholder="voce@exemplo.com" autoCapitalize="none" keyboardType="email-address" />
            <Campo label="Senha" icone="lock-closed-outline" value={senha} onChangeText={setSenha}
              placeholder="Mínimo 6 caracteres" secureTextEntry />

            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: cores.inkSoft, marginBottom: 6 }}>Perfil</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PERFIS.map((p) => {
                  const ativo = perfil === p.v;
                  return (
                    <Pressable key={p.v} onPress={() => setPerfil(p.v)}
                      style={{ backgroundColor: ativo ? cores.brand : cores.brand50, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                      <Text style={{ color: ativo ? '#fff' : cores.inkSoft, fontWeight: '600', fontSize: 13 }}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {erro && (
              <Text style={{ color: cores.coralDark, backgroundColor: cores.coral + '1A', padding: 10, borderRadius: 10 }}>{erro}</Text>
            )}

            <Botao titulo="Criar conta" icone="person-add-outline" onPress={onCadastrar} carregando={enviando}
              desabilitado={!nome || !email || senha.length < 6} />
          </View>
        </Cartao>

        <Pressable onPress={irLogin} style={{ marginTop: 18, alignItems: 'center' }}>
          <Text style={{ color: cores.inkSoft }}>
            Já tem conta? <Text style={{ color: cores.brandDark, fontWeight: '700' }}>Entrar</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
