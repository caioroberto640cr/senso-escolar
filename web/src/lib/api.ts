import { useEffect, useState } from 'react';
import type { EscolaProjetada, EscolaCompleta, EscolaMapa, EtapaKey } from '../types';

// ---------- Conta autenticada ----------
export interface Conta {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  criado_em?: string;
}
export interface AuthResp {
  usuario: Conta;
  csrf?: string;
}

const BASE = '/api';

/** Lê o token CSRF do cookie (não-httpOnly) para reenviar nas mutações. */
function csrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)eduinsight_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

/** Lê a mensagem de erro do corpo JSON, quando houver. */
async function erroDe(res: Response, path: string): Promise<Error> {
  try {
    const j = await res.json();
    if (j?.erro) return new Error(j.erro);
  } catch {
    /* corpo não-JSON */
  }
  return new Error(`API ${res.status} em ${path}`);
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw await erroDe(res, path);
  return res.json() as Promise<T>;
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await erroDe(res, path);
  return res.json() as Promise<T>;
}

// ---------- Tipos de resposta ----------
export interface IndicadoresNacionais {
  ideb: number;
  taxa_aprovacao: number;
  nota_saeb: number;
  escolas: number;
  historico_ideb: { ano: number; valor: number }[];
}

export interface AggRegiao {
  chave: string;
  ideb: number;
  escolas: number;
}

export interface Alerta {
  id_alerta: string;
  id_escola?: string;
  nome_escola?: string;
  indicador: string;
  condicao: string;
  severidade: 'critico' | 'atencao' | 'info';
  descricao: string;
  data: string;
  status: string;
}

export interface ListaEscolas {
  total: number;
  limit: number;
  offset: number;
  itens: EscolaProjetada[];
}

export interface MapaEscolas {
  total: number;
  na_area?: number;
  exibidas: number;
  amostrado: boolean;
  itens: EscolaMapa[];
}

export interface Meta {
  fonte_indicadores?: string;
  fonte_coordenadas?: string;
  total_escolas?: number;
  etapa?: string;
  observacao?: string;
  gerado_em?: string;
}

export interface FonteDados {
  id: string;
  categoria: string;
  nome: string;
  status: 'conectado' | 'sincronizando' | 'erro';
  ultima: string;
  registros: string;
  detalhe: string;
}
export interface RespostaFontes {
  verificado_em: string;
  fonte_inep: string;
  fontes: FonteDados[];
}

export interface EstadoIBGE {
  id: number;
  sigla: string;
  nome: string;
  regiao: string;
}

export interface NoArvore {
  nome: string;
  escolas: number;
  matriculas: number;
  filhos?: NoArvore[];
}
export interface Decomposicao {
  dimensoes: string[];
  total_escolas: number;
  total_matriculas: number;
  arvore: NoArvore[];
}

// ---------- Funções ----------
export const api = {
  meta: () => get<Meta>('/meta'),
  fontes: () => get<RespostaFontes>('/fontes'),
  indicadoresNacionais: (etapa: EtapaKey) =>
    get<IndicadoresNacionais>(`/indicadores/nacionais?etapa=${etapa}`),
  indicadoresRegioes: (etapa: EtapaKey) => get<AggRegiao[]>(`/indicadores/regioes?etapa=${etapa}`),
  indicadoresEstados: (etapa: EtapaKey) => get<AggRegiao[]>(`/indicadores/estados?etapa=${etapa}`),
  alertas: () => get<Alerta[]>('/alertas'),
  escolas: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
    return get<ListaEscolas>(`/escolas?${qs}`);
  },
  mapa: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '' && v !== 'todas' && v !== 'todos')
        .map(([k, v]) => [k, String(v)])
    );
    return get<MapaEscolas>(`/escolas/mapa?${qs}`);
  },
  escola: (id: string) => get<EscolaCompleta>(`/escolas/${id}`),
  estados: () => get<EstadoIBGE[]>('/geografia/estados'),
  decomposicao: (por: string[]) => get<Decomposicao>(`/decomposicao?por=${por.join(',')}`),
  malhaEstados: () => get<any>('/geografia/malha-estados'),

  // ---------- Autenticação ----------
  authStatus: () => get<{ disponivel: boolean }>('/auth/status'),
  registrar: (dados: { nome: string; email: string; senha: string; perfil?: string }) =>
    send<AuthResp>('POST', '/auth/register', dados),
  login: (email: string, senha: string) => send<AuthResp>('POST', '/auth/login', { email, senha }),
  logout: () => send<{ ok: true }>('POST', '/auth/logout'),
  me: () => get<{ usuario: Conta }>('/auth/me'),

  // ---------- Gestão de usuários (admin) ----------
  usuarios: () => get<Conta[]>('/usuarios'),
  atualizarUsuario: (id: number, dados: { perfil?: string; ativo?: boolean }) =>
    send<Conta>('PATCH', `/usuarios/${id}`, dados),
  removerUsuario: (id: number) => send<{ ok: true }>('DELETE', `/usuarios/${id}`),
};

// ---------- Hook genérico ----------
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => vivo && setData(d))
      .catch((e) => vivo && setError(e.message))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
