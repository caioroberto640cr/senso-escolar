// Carrega os dados processados (reais, multi-etapa) do ETL para a memória
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
  localizacao: string | null; // urbana | rural
  recorte: string | null; // indigena | quilombola | assentamento
  infra: Record<string, boolean>;
}

export interface Escola {
  id_escola: string;
  nome: string;
  municipio: string;
  cod_municipio: number;
  estado: string;
  regiao: string;
  dependencia: string;
  etapas: EtapaKey[];
  latitude: number;
  longitude: number;
  indicadores: Partial<Record<EtapaKey, IndicadorEtapa>>;
  censo?: Censo;
}

/** Escola "achatada" para uma etapa específica (o que o frontend de lista/mapa consome). */
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

export function projetar(e: Escola, etapa: EtapaKey): EscolaProjetada | null {
  const ind = e.indicadores[etapa];
  if (!ind) return null;
  return {
    id_escola: e.id_escola,
    nome: e.nome,
    municipio: e.municipio,
    estado: e.estado,
    regiao: e.regiao,
    dependencia: e.dependencia,
    etapas: e.etapas,
    latitude: e.latitude,
    longitude: e.longitude,
    ideb: ind.ideb,
    taxa_aprovacao: ind.taxa_aprovacao,
    nota_saeb: ind.nota_saeb,
    abandono: ind.abandono ?? null,
    distorcao: ind.distorcao ?? null,
    score_geral: ind.ideb,
    historico_ideb: ind.historico_ideb,
    censo: e.censo,
  };
}

export function resolverEtapa(v: unknown): EtapaKey {
  return ETAPAS.includes(v as EtapaKey) ? (v as EtapaKey) : 'anos_iniciais';
}

function ler<T>(arquivo: string, fallback: T): T {
  const p = join(OUT, arquivo);
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

export const escolas = ler<Escola[]>('escolas.json', []);
export const agregados = ler<any>('agregados.json', {});
export const alertas = ler<any[]>('alertas.json', []);
export const meta = ler<any>('meta.json', {});

export const porId = new Map(escolas.map((e) => [e.id_escola, e]));

if (escolas.length === 0) {
  console.warn('⚠ Nenhuma escola carregada. Rode "npm run etl" primeiro.');
}
