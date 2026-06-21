import React, { useState } from 'react';
import { View, Text, Pressable, Platform, StatusBar as RNStatusBar, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/auth';
import { EtapaProvider } from './src/etapa';
import { NavProvider, useNav, ABAS, TITULOS, type Tela } from './src/nav';
import { cores } from './src/theme';
import { Carregando } from './src/ui';

import LoginScreen from './src/screens/Login';
import CadastroScreen from './src/screens/Cadastro';
import InicioScreen from './src/screens/Inicio';
import EscolasScreen from './src/screens/Escolas';
import DetalheEscolaScreen from './src/screens/DetalheEscola';
import EstadosScreen from './src/screens/Estados';
import AlertasScreen from './src/screens/Alertas';
import ComparativoScreen from './src/screens/Comparativo';
import AssistenteScreen from './src/screens/Assistente';
import PerfilScreen from './src/screens/Perfil';

const TELAS: Record<Tela, React.ComponentType<any>> = {
  inicio: InicioScreen, escolas: EscolasScreen, estados: EstadosScreen,
  assistente: AssistenteScreen, perfil: PerfilScreen,
  DetalheEscola: DetalheEscolaScreen, Alertas: AlertasScreen, Comparativo: ComparativoScreen,
};

const padTopo = Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0;

function Header({ titulo, onBack }: { titulo: string; onBack?: () => void }) {
  return (
    <View style={{ backgroundColor: cores.surface, borderBottomWidth: 1, borderBottomColor: cores.line, paddingTop: padTopo }}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 }}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={cores.brandDark} />
          </Pressable>
        )}
        <Text style={{ fontSize: 18, fontWeight: '700', color: cores.ink }}>{titulo}</Text>
      </View>
    </View>
  );
}

function TabBar() {
  const { aba, pilha, trocarAba } = useNav();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: cores.surface, borderTopWidth: 1, borderTopColor: cores.line, paddingBottom: Platform.OS === 'ios' ? 18 : 6, paddingTop: 6 }}>
      {ABAS.map((a) => {
        const ativo = pilha.length === 0 && aba === a.key;
        const cor = ativo ? cores.brand : cores.inkFaint;
        return (
          <Pressable key={a.key} onPress={() => trocarAba(a.key)} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <Ionicons name={a.icone as any} size={22} color={cor} />
            <Text style={{ fontSize: 11, color: cor, fontWeight: ativo ? '700' : '500' }}>{a.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Shell() {
  const { atual, pilha, voltar } = useNav();
  const Tela = TELAS[atual.tela];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.canvas }}>
      <Header titulo={TITULOS[atual.tela]} onBack={pilha.length ? voltar : undefined} />
      <View style={{ flex: 1 }}>
        <Tela />
      </View>
      <TabBar />
    </SafeAreaView>
  );
}

function AuthFlow() {
  const [tela, setTela] = useState<'login' | 'cadastro'>('login');
  return tela === 'login'
    ? <LoginScreen irCadastro={() => setTela('cadastro')} />
    : <CadastroScreen irLogin={() => setTela('login')} />;
}

function Conteudo() {
  const { user, carregando } = useAuth();
  if (carregando) {
    return <View style={{ flex: 1, backgroundColor: cores.canvas, justifyContent: 'center' }}><Carregando texto="Abrindo o EduInsight…" /></View>;
  }
  if (!user) return <AuthFlow />;
  return <NavProvider><Shell /></NavProvider>;
}

export default function App() {
  return (
    <AuthProvider>
      <EtapaProvider>
        <StatusBar style="dark" />
        <Conteudo />
      </EtapaProvider>
    </AuthProvider>
  );
}
