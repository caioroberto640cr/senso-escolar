// Contexto de autenticação (token Bearer persistido no dispositivo).
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, salvarToken, limparToken, type Conta } from './api';

const USER_KEY = 'eduinsight.user';

interface AuthCtx {
  user: Conta | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (d: { nome: string; email: string; senha: string; perfil?: string }) => Promise<void>;
  sair: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Conta | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cache = await AsyncStorage.getItem(USER_KEY);
        if (cache) setUser(JSON.parse(cache));
        const u = await api.me(); // valida o token salvo
        setUser(u);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
      } catch {
        await limparToken();
        await AsyncStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  async function aplicar(token: string, u: Conta) {
    await salvarToken(token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }

  const entrar = async (email: string, senha: string) => {
    const r = await api.login(email, senha);
    await aplicar(r.token, r.usuario);
  };
  const cadastrar = async (d: { nome: string; email: string; senha: string; perfil?: string }) => {
    const r = await api.registrar(d);
    await aplicar(r.token, r.usuario);
  };
  const sair = async () => {
    await limparToken();
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, carregando, entrar, cadastrar, sair }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
