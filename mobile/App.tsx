import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/auth';
import { EtapaProvider } from './src/etapa';
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

export type RootStackParamList = {
  Tabs: undefined;
  DetalheEscola: { id: string; nome?: string };
  Alertas: undefined;
  Comparativo: undefined;
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tema = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: cores.canvas, primary: cores.brand, card: cores.surface,
    text: cores.ink, border: cores.line,
  },
};

const headerComum = {
  headerStyle: { backgroundColor: cores.surface },
  headerTintColor: cores.brandDark,
  headerTitleStyle: { color: cores.ink, fontWeight: '700' as const },
};

function Abas() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerComum,
        tabBarActiveTintColor: cores.brand,
        tabBarInactiveTintColor: cores.inkFaint,
        tabBarStyle: { backgroundColor: cores.surface, borderTopColor: cores.line, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarIcon: ({ color, size }) => {
          const m: Record<string, keyof typeof Ionicons.glyphMap> = {
            Início: 'home-outline', Escolas: 'business-outline', Estados: 'stats-chart-outline',
            Assistente: 'chatbubbles-outline', Perfil: 'person-outline',
          };
          return <Ionicons name={m[route.name] ?? 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Início" component={InicioScreen} />
      <Tab.Screen name="Escolas" component={EscolasScreen} />
      <Tab.Screen name="Estados" component={EstadosScreen} />
      <Tab.Screen name="Assistente" component={AssistenteScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

function Raiz() {
  const { user, carregando } = useAuth();

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.canvas, justifyContent: 'center' }}>
        <Carregando texto="Abrindo o EduInsight…" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={headerComum}>
      {!user ? (
        <Stack.Group screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Cadastro" component={CadastroScreen} />
        </Stack.Group>
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Abas} options={{ headerShown: false }} />
          <Stack.Screen name="DetalheEscola" component={DetalheEscolaScreen} options={{ title: 'Escola' }} />
          <Stack.Screen name="Alertas" component={AlertasScreen} options={{ title: 'Alertas' }} />
          <Stack.Screen name="Comparativo" component={ComparativoScreen} options={{ title: 'Comparar escolas' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EtapaProvider>
          <NavigationContainer theme={tema}>
            <StatusBar style="dark" />
            <Raiz />
          </NavigationContainer>
        </EtapaProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
