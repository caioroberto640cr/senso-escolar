// Consultas de escolas no Postgres (substitui o JSON em memória).
import { q, dbReady } from './db.ts';
import { resolverEtapa, type EscolaProjetada, type EtapaKey } from './store.ts';

const INFRA_VALIDA = new Set([
  'internet', 'internet_alunos', 'lab_informatica', 'lab_ciencias',
  'biblioteca', 'quadra', 'auditorio', 'banheiro_acessivel', 'agua_potavel',
]);

/** Monta o WHERE (sem bbox) a partir dos filtros, começando em $2 ($1 = etapa). */
function montarFiltros(q0: Record<string, any>) {
  const cond: string[] = ['ee.etapa = $1'];
  const params: any[] = [resolverEtapa(q0.etapa)];
  const add = (sql: string, val: any) => { params.push(val); cond.push(sql.replace('?', `$${params.length}`)); };

  if (q0.uf && q0.uf !== 'todas') add('e.estado = ?', String(q0.uf).toUpperCase());
  if (q0.regiao && q0.regiao !== 'todas') add('e.regiao = ?', String(q0.regiao));
  if (q0.dependencia && q0.dependencia !== 'todas') add('e.dependencia = ?', String(q0.dependencia));
  if (q0.localizacao && q0.localizacao !== 'todas') add('e.localizacao = ?', String(q0.localizacao));
  if (q0.recorte && q0.recorte !== 'todas') add('e.recorte = ?', String(q0.recorte));
  if (q0.q) { const t = `%${String(q0.q).trim()}%`; params.push(t); cond.push(`(e.nome ILIKE $${params.length} OR e.municipio ILIKE $${params.length})`); }
  if (q0.infra) {
    for (const f of String(q0.infra).split(',').filter((x) => INFRA_VALIDA.has(x))) {
      cond.push(`(e.infra->>'${f}') = 'true'`);
    }
  }
  const d = q0.desempenho;
  if (d === 'bom') cond.push('ee.ideb >= 6');
  else if (d === 'atencao') cond.push('ee.ideb >= 4.5 AND ee.ideb < 6');
  else if (d === 'critico') cond.push('ee.ideb < 4.5');

  return { where: cond.join(' AND '), params };
}

const SELECT_PROJ = `
  e.id_escola, e.nome, e.municipio, e.estado, e.regiao, e.dependencia, e.etapas,
  e.latitude, e.longitude, e.matriculas, e.porte, e.localizacao, e.recorte, e.infra,
  ee.ideb, ee.taxa_aprovacao, ee.nota_saeb, ee.abandono, ee.distorcao, ee.historico_ideb`;

function linhaParaProjetada(r: any): EscolaProjetada {
  return {
    id_escola: r.id_escola, nome: r.nome, municipio: r.municipio, estado: r.estado,
    regiao: r.regiao, dependencia: r.dependencia, etapas: r.etapas as EtapaKey[],
    latitude: r.latitude, longitude: r.longitude,
    ideb: r.ideb, taxa_aprovacao: r.taxa_aprovacao, nota_saeb: r.nota_saeb,
    abandono: r.abandono ?? null, distorcao: r.distorcao ?? null,
    score_geral: r.ideb, historico_ideb: r.historico_ideb ?? [],
    censo: {
      matriculas: r.matriculas ?? null, porte: r.porte ?? null,
      localizacao: r.localizacao ?? null, recorte: r.recorte ?? null,
      infra: r.infra ?? {},
    },
  };
}

const BASE = 'FROM escola_etapa ee JOIN escolas e USING (id_escola)';

/** Lista paginada (por etapa + filtros + ordenação). */
export async function listar(q0: Record<string, any>) {
  if (!dbReady) return { total: 0, limit: 0, offset: 0, itens: [] };
  const { where, params } = montarFiltros(q0);
  const limit = Math.min(Number(q0.limit) || 60, 500);
  const offset = Number(q0.offset) || 0;
  const ordem =
    q0.sort === 'nome' ? 'e.nome ASC'
    : q0.sort === 'aprovacao' ? 'ee.taxa_aprovacao DESC NULLS LAST'
    : 'ee.ideb DESC NULLS LAST';

  const [tot, itens] = await Promise.all([
    q<{ n: string }>(`SELECT count(*)::int n ${BASE} WHERE ${where}`, params),
    q<any>(`SELECT ${SELECT_PROJ} ${BASE} WHERE ${where} ORDER BY ${ordem} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]),
  ]);
  return { total: (tot[0] as any).n, limit, offset, itens: itens.map(linhaParaProjetada) };
}

/** Dados para o mapa (por área visível + cap/amostra). */
export async function mapa(q0: Record<string, any>) {
  if (!dbReady) return { total: 0, na_area: 0, exibidas: 0, amostrado: false, itens: [] };
  const { where, params } = montarFiltros(q0);

  // total (casa filtros, ignora bbox)
  const tot = await q<{ n: number }>(`SELECT count(*)::int n ${BASE} WHERE ${where}`, params);

  // bbox = oeste,sul,leste,norte
  const bb = String(q0.bbox ?? '').split(',').map(Number);
  const temBbox = bb.length === 4 && bb.every((n) => !Number.isNaN(n));
  let whereArea = where;
  const paramsArea = [...params];
  if (temBbox) {
    const [w, s, e, n] = bb;
    paramsArea.push(w, e, s, n);
    const base = paramsArea.length;
    whereArea += ` AND e.longitude BETWEEN $${base - 3} AND $${base - 2} AND e.latitude BETWEEN $${base - 1} AND $${base}`;
  }
  const naAreaRes = await q<{ n: number }>(`SELECT count(*)::int n ${BASE} WHERE ${whereArea}`, paramsArea);
  const naArea = (naAreaRes[0] as any).n;

  const cap = temBbox ? 3000 : Number(q0.limit) || 1500;
  const ordem = temBbox ? 'ee.ideb DESC NULLS LAST' : 'random()';
  const itens = await q<any>(
    `SELECT e.id_escola, e.nome, e.municipio, e.estado, e.dependencia, e.latitude, e.longitude,
            ee.ideb, ee.taxa_aprovacao, ee.nota_saeb, ee.abandono, ee.ideb AS score_geral
     ${BASE} WHERE ${whereArea} ORDER BY ${ordem} LIMIT $${paramsArea.length + 1}`,
    [...paramsArea, cap]
  );
  return {
    total: (tot[0] as any).n,
    na_area: naArea,
    exibidas: itens.length,
    amostrado: naArea > itens.length,
    itens,
  };
}

/** Escola completa (todas as etapas) para a tela de detalhe. */
export async function escolaPorId(id: string) {
  if (!dbReady) return null;
  const e = (await q<any>('SELECT * FROM escolas WHERE id_escola = $1', [id]))[0];
  if (!e) return null;
  const ets = await q<any>(
    `SELECT etapa, ideb, taxa_aprovacao, nota_saeb, abandono, reprovacao, distorcao, historico_ideb
     FROM escola_etapa WHERE id_escola = $1`, [id]
  );
  const indicadores: Record<string, any> = {};
  for (const r of ets) {
    indicadores[r.etapa] = {
      ideb: r.ideb, taxa_aprovacao: r.taxa_aprovacao, nota_saeb: r.nota_saeb,
      abandono: r.abandono, reprovacao: r.reprovacao, distorcao: r.distorcao,
      historico_ideb: r.historico_ideb ?? [],
    };
  }
  return {
    id_escola: e.id_escola, nome: e.nome, municipio: e.municipio, cod_municipio: e.cod_municipio,
    estado: e.estado, regiao: e.regiao, dependencia: e.dependencia, etapas: e.etapas,
    latitude: e.latitude, longitude: e.longitude,
    indicadores,
    censo: { matriculas: e.matriculas, porte: e.porte, localizacao: e.localizacao, recorte: e.recorte, infra: e.infra ?? {} },
  };
}

// ---- Dimensões para a árvore de decomposição (carregadas uma vez) ----
export interface DimEscola {
  estado: string; regiao: string; dependencia: string;
  localizacao: string | null; porte: string | null; recorte: string | null; matriculas: number | null;
}
let dimsCache: DimEscola[] | null = null;
export async function dimsEscolas(): Promise<DimEscola[]> {
  if (!dbReady) return [];
  if (dimsCache) return dimsCache;
  dimsCache = await q<DimEscola>(
    'SELECT estado, regiao, dependencia, localizacao, porte, recorte, matriculas FROM escolas'
  );
  return dimsCache;
}

// ---- Exportação CSV (servidor, sem limite de página) ----
const DEP_ROTULO: Record<string, string> = {
  federal: 'Federal', estadual: 'Estadual', municipal: 'Municipal', privada: 'Privada',
};
const ETAPA_ROTULO: Record<string, string> = {
  anos_iniciais: 'Anos Iniciais', anos_finais: 'Anos Finais', medio: 'Ensino Médio',
};
const COLS_METRICA: Record<string, { rotulo: string; campo: string }> = {
  ideb: { rotulo: 'IDEB', campo: 'ideb' },
  aprovacao: { rotulo: 'Aprovação (%)', campo: 'taxa_aprovacao' },
  abandono: { rotulo: 'Abandono (%)', campo: 'abandono' },
  reprovacao: { rotulo: 'Reprovação (%)', campo: 'reprovacao' },
  saeb: { rotulo: 'Nota SAEB', campo: 'nota_saeb' },
  distorcao: { rotulo: 'Distorção idade-série (%)', campo: 'distorcao' },
};

function csvCampo(v: any): string {
  if (v == null) return '';
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportarCSV(q0: Record<string, any>): Promise<string> {
  if (!dbReady) return '';
  const { where, params } = montarFiltros(q0);
  const etapa = resolverEtapa(q0.etapa);
  const colsSel = String(q0.cols ?? 'ideb,aprovacao,abandono,reprovacao,saeb,distorcao')
    .split(',').map((c) => c.trim()).filter((c) => COLS_METRICA[c]);

  const rows = await q<any>(
    `SELECT e.id_escola, e.nome, e.municipio, e.estado, e.regiao, e.dependencia,
            e.matriculas, e.porte, e.localizacao, e.recorte,
            ee.ideb, ee.taxa_aprovacao, ee.abandono, ee.reprovacao, ee.nota_saeb, ee.distorcao
     ${BASE} WHERE ${where} ORDER BY ee.ideb DESC NULLS LAST LIMIT 50000`,
    params
  );

  const header = [
    'Código INEP', 'Escola', 'Município', 'UF', 'Região', 'Dependência', 'Etapa',
    ...colsSel.map((c) => COLS_METRICA[c].rotulo),
    'Matrículas', 'Porte', 'Localização', 'Perfil',
  ];
  const linhas = rows.map((r) => {
    const campos = [
      r.id_escola, r.nome, r.municipio, r.estado, r.regiao,
      DEP_ROTULO[r.dependencia] ?? r.dependencia, ETAPA_ROTULO[etapa],
      ...colsSel.map((c) => r[COLS_METRICA[c].campo]),
      r.matriculas, r.porte, r.localizacao, r.recorte,
    ];
    return campos.map(csvCampo).join(';');
  });
  const BOM = String.fromCharCode(0xfeff);
  return BOM + [header.join(';'), ...linhas].join('\r\n');
}

export async function contarEscolas(): Promise<number> {
  if (!dbReady) return 0;
  const r = await q<{ n: number }>('SELECT count(*)::int n FROM escolas');
  return (r[0] as any).n;
}
