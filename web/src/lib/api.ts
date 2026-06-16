import { useEffect, useState } from 'react';
import type { Escola, EscolaMapa } from '../types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status} em ${path}`);
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
  itens: Escola[];
}

export interface MapaEscolas {
  total: number;
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

export interface EstadoIBGE {
  id: number;
  sigla: string;
  nome: string;
  regiao: string;
}

// ---------- Funções ----------
export const api = {
  meta: () => get<Meta>('/meta'),
  indicadoresNacionais: () => get<IndicadoresNacionais>('/indicadores/nacionais'),
  indicadoresRegioes: () => get<AggRegiao[]>('/indicadores/regioes'),
  indicadoresEstados: () => get<AggRegiao[]>('/indicadores/estados'),
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
  escola: (id: string) => get<Escola>(`/escolas/${id}`),
  estados: () => get<EstadoIBGE[]>('/geografia/estados'),
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
