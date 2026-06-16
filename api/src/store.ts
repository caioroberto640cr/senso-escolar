// Carrega os dados processados (reais) do ETL para a memória
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'processed');

export interface Escola {
  id_escola: string;
  nome: string;
  municipio: string;
  cod_municipio: number;
  estado: string;
  regiao: string;
  dependencia: string;
  etapas: string[];
  latitude: number;
  longitude: number;
  ideb: number;
  taxa_aprovacao: number | null;
  nota_saeb: number | null;
  score_geral: number;
  historico_ideb: { ano: number; valor: number }[];
}

function ler<T>(arquivo: string, fallback: T): T {
  const p = join(OUT, arquivo);
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

export const escolas = ler<Escola[]>('escolas.json', []);
export const agregados = ler<any>('agregados.json', {
  nacional: {},
  regiao: [],
  estado: [],
  municipio: [],
});
export const alertas = ler<any[]>('alertas.json', []);
export const meta = ler<any>('meta.json', {});

// índice por id para acesso O(1)
export const porId = new Map(escolas.map((e) => [e.id_escola, e]));

if (escolas.length === 0) {
  console.warn('⚠ Nenhuma escola carregada. Rode "npm run etl" primeiro.');
}
