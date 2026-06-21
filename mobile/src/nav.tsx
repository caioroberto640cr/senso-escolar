// Navegação própria (leve) — sem react-navigation, para máxima compatibilidade
// com o Expo Snack. Abas na base + pilha para telas empilhadas (com "voltar").
import React, { createContext, useContext, useState, useCallback } from 'react';

export type Tela =
  | 'inicio' | 'escolas' | 'estados' | 'assistente' | 'perfil'
  | 'DetalheEscola' | 'Alertas' | 'Comparativo';

interface Empilhada { tela: Tela; params?: any }

interface NavCtx {
  aba: Tela;
  pilha: Empilhada[];
  atual: Empilhada;
  navegar: (tela: Tela, params?: any) => void;
  voltar: () => void;
  trocarAba: (aba: Tela) => void;
}
const Ctx = createContext<NavCtx | null>(null);

export const ABAS: { key: Tela; label: string; icone: string }[] = [
  { key: 'inicio', label: 'Início', icone: 'home-outline' },
  { key: 'escolas', label: 'Escolas', icone: 'business-outline' },
  { key: 'estados', label: 'Estados', icone: 'stats-chart-outline' },
  { key: 'assistente', label: 'Assistente', icone: 'chatbubbles-outline' },
  { key: 'perfil', label: 'Perfil', icone: 'person-outline' },
];

export const TITULOS: Record<Tela, string> = {
  inicio: 'Início', escolas: 'Escolas', estados: 'Estados', assistente: 'Assistente', perfil: 'Perfil',
  DetalheEscola: 'Escola', Alertas: 'Alertas', Comparativo: 'Comparar escolas',
};

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [aba, setAba] = useState<Tela>('inicio');
  const [pilha, setPilha] = useState<Empilhada[]>([]);

  const navegar = useCallback((tela: Tela, params?: any) => setPilha((p) => [...p, { tela, params }]), []);
  const voltar = useCallback(() => setPilha((p) => p.slice(0, -1)), []);
  const trocarAba = useCallback((a: Tela) => { setAba(a); setPilha([]); }, []);

  const atual: Empilhada = pilha.length ? pilha[pilha.length - 1] : { tela: aba };

  return <Ctx.Provider value={{ aba, pilha, atual, navegar, voltar, trocarAba }}>{children}</Ctx.Provider>;
}

export function useNav() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useNav fora do NavProvider');
  return c;
}
