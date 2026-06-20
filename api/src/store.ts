// Carrega apenas os AGREGADOS pequenos (nacional/região/estado, alertas, meta) em memória.
// As ESCOLAS (64k) agora vivem no Postgres — ver escolasDb.ts.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'processed');

export type EtapaKey = 'anos_iniciais' | 'anos_finais' | 'medio';
export const ETAPAS: EtapaKey[] = ['anos_iniciais', 'anos_finais', 'medio'];

export interface IndicadorEtapa {
  ideb: number;
  taxa_aprovacao: number | null;
  nota_saeb: number | null;
  historico_ideb: { ano: number; valor: number }[];
  abandono?: number | null;
  reprovacao?: number | null;
  distorcao?: number | null;
}

export interface Censo {
  matriculas: number | null;
  porte: string | null;
  localizacao: string | null;
  recorte: string | null;
  infra: Record<string, boolean>;
}

export interface EscolaProjetada {
  id_escola: string;
  nome: string;
  municipio: string;
  estado: string;
  regiao: string;
  dependencia: string;
  etapas: EtapaKey[];
  latitude: number;
  longitude: number;
  ideb: number;
  taxa_aprovacao: number | null;
  nota_saeb: number | null;
  abandono: number | null;
  distorcao: number | null;
  score_geral: number;
  historico_ideb: { ano: number; valor: number }[];
  censo?: Censo;
}

export function resolverEtapa(v: unknown): EtapaKey {
  return ETAPAS.includes(v as EtapaKey) ? (v as EtapaKey) : 'anos_iniciais';
}

function ler<T>(arquivo: string, fallback: T): T {
  const p = join(OUT, arquivo);
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

export const agregados = ler<any>('agregados.json', {});
export const alertas = ler<any[]>('alertas.json', []);
export const meta = ler<any>('meta.json', {});
