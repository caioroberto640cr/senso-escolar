// Cliente da API EduInsight (consome a API de produção via Axios).
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EtapaKey } from './theme';

export const API_BASE = 'https://eduinsight-25ys.onrender.com/api';
const TOKEN_KEY = 'eduinsight.token';

export const http = axios.create({ baseURL: API_BASE, timeout: 20000 });

// injeta o token (Bearer) salvo no dispositivo em toda requisição
http.interceptors.request.use(async (config) => {
  const t = await AsyncStorage.getItem(TOKEN_KEY);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export async function salvarToken(t: string) {
  await AsyncStorage.setItem(TOKEN_KEY, t);
}
export async function limparToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ---------- Tipos ----------
export interface Conta {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
}
export interface IndicadoresNacionais {
  ideb: number;
  taxa_aprovacao: number;
  nota_saeb: number;
  escolas: number;
  historico_ideb: { ano: number; valor: number }[];
}
export interface AggRegiao { chave: string; ideb: number; escolas: number }
export interface EscolaMapa {
  id_escola: string; nome: string; municipio: string; estado: string;
  dependencia: string; latitude: number; longitude: number;
  ideb: number; taxa_aprovacao: number | null;
  nota_saeb: number | null; abandono?: number | null;
}
export interface EscolaLista extends EscolaMapa { regiao: string; reprovacao?: number | null; distorcao?: number | null }
export interface EscolaCompleta {
  id_escola: string; nome: string; municipio: string; estado: string; regiao: string;
  dependencia: string;
  indicadores: Record<string, { ideb: number; taxa_aprovacao: number | null; nota_saeb: number | null; abandono: number | null; reprovacao: number | null; distorcao: number | null }>;
  etapas: string[];
  censo?: { matriculas: number | null; porte: string | null; localizacao: string | null; recorte: string | null; infra: Record<string, boolean> };
}
export interface Alerta {
  id_alerta: string; id_escola?: string; nome_escola?: string;
  indicador: string; condicao: string; severidade: 'critico' | 'atencao' | 'info';
  descricao: string; data: string;
}
export interface MsgChat { role: 'user' | 'assistant'; content: string }

// ---------- Chamadas ----------
export const api = {
  registrar: (d: { nome: string; email: string; senha: string; perfil?: string }) =>
    http.post<{ usuario: Conta; token: string }>('/auth/register', d).then((r) => r.data),
  login: (email: string, senha: string) =>
    http.post<{ usuario: Conta; token: string }>('/auth/login', { email, senha }).then((r) => r.data),
  me: () => http.get<{ usuario: Conta }>('/auth/me').then((r) => r.data.usuario),

  indicadoresNacionais: (etapa: EtapaKey) =>
    http.get<IndicadoresNacionais>(`/indicadores/nacionais?etapa=${etapa}`).then((r) => r.data),
  indicadoresRegioes: (etapa: EtapaKey) =>
    http.get<AggRegiao[]>(`/indicadores/regioes?etapa=${etapa}`).then((r) => r.data),
  indicadoresEstados: (etapa: EtapaKey) =>
    http.get<AggRegiao[]>(`/indicadores/estados?etapa=${etapa}`).then((r) => r.data),

  escolas: (p: { etapa: EtapaKey; q?: string; uf?: string; dependencia?: string; desempenho?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    qs.set('etapa', p.etapa);
    if (p.q) qs.set('q', p.q);
    if (p.uf && p.uf !== 'todas') qs.set('uf', p.uf);
    if (p.dependencia && p.dependencia !== 'todas') qs.set('dependencia', p.dependencia);
    if (p.desempenho && p.desempenho !== 'todos') qs.set('desempenho', p.desempenho);
    qs.set('limit', String(p.limit ?? 30));
    return http.get<{ total: number; itens: EscolaLista[] }>(`/escolas?${qs}`).then((r) => r.data);
  },
  mapa: (p: { etapa: EtapaKey; uf?: string; dependencia?: string; desempenho?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    qs.set('etapa', p.etapa);
    if (p.uf && p.uf !== 'todas') qs.set('uf', p.uf);
    if (p.dependencia && p.dependencia !== 'todas') qs.set('dependencia', p.dependencia);
    if (p.desempenho && p.desempenho !== 'todos') qs.set('desempenho', p.desempenho);
    qs.set('limit', String(p.limit ?? 350));
    return http.get<{ total: number; exibidas: number; amostrado: boolean; itens: EscolaMapa[] }>(`/escolas/mapa?${qs}`).then((r) => r.data);
  },
  escola: (id: string) => http.get<EscolaCompleta>(`/escolas/${id}`).then((r) => r.data),
  malhaPais: () => http.get<any>('/geografia/malha-pais').then((r) => r.data),
  alertas: () => http.get<Alerta[]>('/alertas').then((r) => r.data),

  assistente: (mensagens: MsgChat[], etapa: EtapaKey) =>
    http.post<{ resposta: string; indisponivel?: boolean }>('/assistente', { mensagens, etapa }).then((r) => r.data),
};
