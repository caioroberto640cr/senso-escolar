/**
 * Seed do Postgres (Neon) — carrega as escolas processadas (escolas.json) para o banco.
 * Roda uma vez por atualização de dados: `npm run seed`.
 * As tabelas escolas + escola_etapa passam a ser a fonte das consultas da API.
 */
import '../src/env.ts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from '../src/db.ts';

if (!pool) {
  console.error('⚠ DATABASE_URL não definido. Configure api/.env antes de rodar o seed.');
  process.exit(1);
}

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'processed');

interface Escola {
  id_escola: string; nome: string; municipio: string; cod_municipio: number;
  estado: string; regiao: string; dependencia: string; etapas: string[];
  latitude: number; longitude: number;
  indicadores: Record<string, any>;
  censo?: { matriculas: number | null; porte: string | null; localizacao: string | null; recorte: string | null; infra: Record<string, boolean> };
}

async function inserir(
  tabela: string,
  colunas: string[],
  jsonbCols: Set<string>,
  linhas: Record<string, any>[]
) {
  const TAM = 400;
  for (let i = 0; i < linhas.length; i += TAM) {
    const lote = linhas.slice(i, i + TAM);
    const params: any[] = [];
    const tuples = lote.map((row) => {
      const ph = colunas.map((c) => {
        const v = row[c] ?? null;
        params.push(jsonbCols.has(c) ? JSON.stringify(v) : v);
        return jsonbCols.has(c) ? `$${params.length}::jsonb` : `$${params.length}`;
      });
      return `(${ph.join(',')})`;
    });
    await pool!.query(`INSERT INTO ${tabela} (${colunas.join(',')}) VALUES ${tuples.join(',')}`, params);
    process.stdout.write(`\r  ${tabela}: ${Math.min(i + TAM, linhas.length)}/${linhas.length}`);
  }
  process.stdout.write('\n');
}

async function main() {
  console.log('=== Seed Postgres (escolas) ===');
  const escolas: Escola[] = JSON.parse(readFileSync(join(OUT, 'escolas.json'), 'utf8'));
  console.log(`Lendo ${escolas.length} escolas do JSON...`);

  console.log('Recriando tabelas...');
  await pool!.query('DROP TABLE IF EXISTS escola_etapa');
  await pool!.query('DROP TABLE IF EXISTS escolas');
  await pool!.query(`
    CREATE TABLE escolas (
      id_escola TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      municipio TEXT,
      cod_municipio INTEGER,
      estado TEXT,
      regiao TEXT,
      dependencia TEXT,
      etapas TEXT[],
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      matriculas INTEGER,
      porte TEXT,
      localizacao TEXT,
      recorte TEXT,
      infra JSONB
    )`);
  await pool!.query(`
    CREATE TABLE escola_etapa (
      id_escola TEXT REFERENCES escolas(id_escola) ON DELETE CASCADE,
      etapa TEXT,
      ideb DOUBLE PRECISION,
      taxa_aprovacao DOUBLE PRECISION,
      nota_saeb DOUBLE PRECISION,
      abandono DOUBLE PRECISION,
      reprovacao DOUBLE PRECISION,
      distorcao DOUBLE PRECISION,
      historico_ideb JSONB,
      PRIMARY KEY (id_escola, etapa)
    )`);

  // Linhas de escolas
  const linhasEsc = escolas.map((e) => ({
    id_escola: e.id_escola, nome: e.nome, municipio: e.municipio, cod_municipio: e.cod_municipio,
    estado: e.estado, regiao: e.regiao, dependencia: e.dependencia, etapas: e.etapas,
    latitude: e.latitude, longitude: e.longitude,
    matriculas: e.censo?.matriculas ?? null, porte: e.censo?.porte ?? null,
    localizacao: e.censo?.localizacao ?? null, recorte: e.censo?.recorte ?? null,
    infra: e.censo?.infra ?? {},
  }));
  await inserir(
    'escolas',
    ['id_escola','nome','municipio','cod_municipio','estado','regiao','dependencia','etapas','latitude','longitude','matriculas','porte','localizacao','recorte','infra'],
    new Set(['infra']),
    linhasEsc
  );

  // Linhas de escola_etapa
  const linhasEt: Record<string, any>[] = [];
  for (const e of escolas) {
    for (const [etapa, ind] of Object.entries(e.indicadores)) {
      linhasEt.push({
        id_escola: e.id_escola, etapa,
        ideb: ind.ideb ?? null, taxa_aprovacao: ind.taxa_aprovacao ?? null, nota_saeb: ind.nota_saeb ?? null,
        abandono: ind.abandono ?? null, reprovacao: ind.reprovacao ?? null, distorcao: ind.distorcao ?? null,
        historico_ideb: ind.historico_ideb ?? [],
      });
    }
  }
  await inserir(
    'escola_etapa',
    ['id_escola','etapa','ideb','taxa_aprovacao','nota_saeb','abandono','reprovacao','distorcao','historico_ideb'],
    new Set(['historico_ideb']),
    linhasEt
  );

  console.log('Criando índices...');
  await pool!.query('CREATE INDEX ix_esc_estado ON escolas(estado)');
  await pool!.query('CREATE INDEX ix_esc_regiao ON escolas(regiao)');
  await pool!.query('CREATE INDEX ix_esc_dep ON escolas(dependencia)');
  await pool!.query('CREATE INDEX ix_esc_lat ON escolas(latitude)');
  await pool!.query('CREATE INDEX ix_esc_lng ON escolas(longitude)');
  await pool!.query('CREATE INDEX ix_ee_etapa_ideb ON escola_etapa(etapa, ideb DESC)');

  const { rows } = await pool!.query('SELECT (SELECT count(*) FROM escolas) e, (SELECT count(*) FROM escola_etapa) ee');
  console.log(`\n✓ Seed concluído: ${rows[0].e} escolas · ${rows[0].ee} registros por etapa.`);
  await pool!.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
