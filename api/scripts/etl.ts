/**
 * ETL — EduInsight
 * Processa dados REAIS do INEP (IDEB 2023) e cruza com coordenadas reais
 * dos municípios (dataset derivado do IBGE).
 *
 * Saída: api/data/processed/*.json
 */
import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { UF_REGIAO } from '../src/regioes.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW = join(ROOT, 'data', 'raw');
const OUT = join(ROOT, 'data', 'processed');
mkdirSync(OUT, { recursive: true });

const ANOS = [2017, 2019, 2021, 2023];

// Fontes reais
const FONTES = {
  ideb_em_escolas: {
    url: 'https://download.inep.gov.br/ideb/resultados/divulgacao_ensino_medio_escolas_2023.zip',
    file: 'ideb_em_escolas_2023.zip',
  },
  municipios: {
    url: 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv',
    file: 'municipios.csv',
  },
};

async function baixarSeFaltar(url: string, destino: string) {
  const caminho = join(RAW, destino);
  if (existsSync(caminho)) {
    console.log(`✓ já existe: ${destino}`);
    return caminho;
  }
  console.log(`↓ baixando: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${url} (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(RAW, { recursive: true });
  writeFileSync(caminho, buf);
  console.log(`✓ salvo: ${destino} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
  return caminho;
}

// ---- Coordenadas reais dos municípios (codigo_ibge -> {lat,lng}) ----
function carregarCoordenadas(): Map<number, { lat: number; lng: number; capital: boolean }> {
  const csv = readFileSync(join(RAW, FONTES.municipios.file), 'utf8');
  const linhas = csv.split('\n');
  const header = linhas[0].split(',');
  const iCod = header.indexOf('codigo_ibge');
  const iLat = header.indexOf('latitude');
  const iLng = header.indexOf('longitude');
  const iCap = header.indexOf('capital');
  const mapa = new Map<number, { lat: number; lng: number; capital: boolean }>();
  for (let i = 1; i < linhas.length; i++) {
    const c = linhas[i].split(',');
    if (c.length < 4) continue;
    const cod = Number(c[iCod]);
    const lat = Number(c[iLat]);
    const lng = Number(c[iLng]);
    if (!cod || Number.isNaN(lat) || Number.isNaN(lng)) continue;
    mapa.set(cod, { lat, lng, capital: c[iCap] === '1' });
  }
  console.log(`✓ coordenadas de ${mapa.size} municípios carregadas`);
  return mapa;
}

// jitter determinístico (estável entre execuções) para não sobrepor escolas
function jitter(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return (x - Math.floor(x) - 0.5) * 0.05; // ±0.025°
}

function num(v: unknown): number | null {
  if (v === '-' || v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

const dependenciaDe = (rede: string): string => {
  const r = (rede || '').toLowerCase();
  if (r.includes('federal')) return 'federal';
  if (r.includes('estadual')) return 'estadual';
  if (r.includes('municipal')) return 'municipal';
  if (r.includes('privada') || r.includes('particular')) return 'privada';
  return 'estadual';
};

async function main() {
  console.log('=== ETL EduInsight — dados reais INEP/IBGE ===\n');
  await baixarSeFaltar(FONTES.municipios.url, FONTES.municipios.file);
  await baixarSeFaltar(FONTES.ideb_em_escolas.url, FONTES.ideb_em_escolas.file);

  const coords = carregarCoordenadas();

  // ---- Parse do Excel do INEP ----
  console.log('\n→ lendo planilha do INEP...');
  const zip = new AdmZip(join(RAW, FONTES.ideb_em_escolas.file));
  const entry = zip.getEntries().find((e) => e.entryName.endsWith('.xlsx'));
  if (!entry) throw new Error('xlsx não encontrado no zip');
  const wb = XLSX.read(entry.getData(), { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false });

  // Linha 7 (índice) tem os códigos de coluna
  const codes: string[] = rows[7].map((c: any) => String(c ?? ''));
  const col = (code: string) => codes.indexOf(code);
  const idx = {
    uf: col('SG_UF'),
    cod_mun: col('CO_MUNICIPIO'),
    mun: col('NO_MUNICIPIO'),
    id: col('ID_ESCOLA'),
    nome: col('NO_ESCOLA'),
    rede: col('REDE'),
    aprov2023: col('VL_APROVACAO_2023_SI_4'),
    saeb2023: col('VL_NOTA_MEDIA_2023'),
    ideb: ANOS.map((a) => col(`VL_OBSERVADO_${a}`)),
  };

  const escolas: any[] = [];
  let semCoord = 0;
  for (let i = 8; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[idx.id]) continue;
    const ideb2023 = num(r[idx.ideb[3]]);
    if (ideb2023 == null) continue; // só escolas com IDEB 2023 real

    const codMun = Number(r[idx.cod_mun]);
    const geo = coords.get(codMun);
    if (!geo) {
      semCoord++;
      continue;
    }
    const uf = String(r[idx.uf]);
    const idEscola = String(r[idx.id]);
    const seed = Number(idEscola) || i;
    const historico_ideb = ANOS.map((ano, k) => ({ ano, valor: num(r[idx.ideb[k]]) })).filter(
      (p) => p.valor != null
    ) as { ano: number; valor: number }[];

    const aprov = num(r[idx.aprov2023]);
    escolas.push({
      id_escola: idEscola,
      nome: String(r[idx.nome]),
      municipio: String(r[idx.mun]),
      cod_municipio: codMun,
      estado: uf,
      regiao: UF_REGIAO[uf] ?? 'Sudeste',
      dependencia: dependenciaDe(String(r[idx.rede])),
      etapas: ['medio'],
      latitude: Math.round((geo.lat + jitter(seed)) * 1e5) / 1e5,
      longitude: Math.round((geo.lng + jitter(seed + 1)) * 1e5) / 1e5,
      ideb: ideb2023,
      taxa_aprovacao: aprov,
      nota_saeb: num(r[idx.saeb2023]),
      score_geral: ideb2023,
      historico_ideb,
    });
  }

  console.log(`✓ ${escolas.length} escolas com IDEB 2023 real (descartadas ${semCoord} sem coordenada)`);

  // ---- Agregados reais derivados (nacional, região, estado) ----
  const media = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0;

  const idebTodos = escolas.map((e) => e.ideb);
  const aprovTodos = escolas.map((e) => e.taxa_aprovacao).filter((v: any) => v != null);
  const saebTodos = escolas.map((e) => e.nota_saeb).filter((v: any) => v != null);

  // histórico nacional (média por ano)
  const historicoNacional = ANOS.map((ano) => {
    const vals = escolas
      .map((e) => e.historico_ideb.find((p: any) => p.ano === ano)?.valor)
      .filter((v: any) => v != null) as number[];
    return { ano, valor: media(vals) };
  });

  const porGrupo = (chave: (e: any) => string) => {
    const grupos = new Map<string, number[]>();
    for (const e of escolas) {
      const k = chave(e);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push(e.ideb);
    }
    return [...grupos.entries()].map(([k, v]) => ({
      chave: k,
      ideb: media(v),
      escolas: v.length,
    }));
  };

  const aggRegiao = porGrupo((e) => e.regiao).sort((a, b) => b.ideb - a.ideb);
  const aggEstado = porGrupo((e) => e.estado).sort((a, b) => b.ideb - a.ideb);
  const aggMunicipio = porGrupo((e) => `${e.municipio}|${e.estado}`)
    .sort((a, b) => b.escolas - a.escolas);

  const nacional = {
    ideb: media(idebTodos),
    taxa_aprovacao: media(aprovTodos),
    nota_saeb: media(saebTodos),
    escolas: escolas.length,
    historico_ideb: historicoNacional,
  };

  // ---- Alertas reais derivados (maiores quedas de IDEB 2021->2023) ----
  const comDelta = escolas
    .map((e) => {
      const v21 = e.historico_ideb.find((p: any) => p.ano === 2021)?.valor;
      const v23 = e.historico_ideb.find((p: any) => p.ano === 2023)?.valor;
      return v21 != null && v23 != null ? { e, delta: Math.round((v23 - v21) * 100) / 100 } : null;
    })
    .filter(Boolean) as { e: any; delta: number }[];

  const quedas = [...comDelta].sort((a, b) => a.delta - b.delta).slice(0, 8);
  const alertas = quedas.map((q, i) => ({
    id_alerta: `a${i + 1}`,
    id_escola: q.e.id_escola,
    nome_escola: q.e.nome,
    indicador: 'IDEB',
    condicao: `queda de ${Math.abs(q.delta).toFixed(1)} pts (2021→2023)`,
    severidade: q.delta <= -1 ? 'critico' : q.delta < 0 ? 'atencao' : 'info',
    descricao: `${q.e.nome} (${q.e.municipio}/${q.e.estado}) teve o IDEB de ${
      q.e.historico_ideb.find((p: any) => p.ano === 2021)?.valor
    } para ${q.e.ideb} entre 2021 e 2023.`,
    data: '2024-09-01T00:00:00Z',
    status: 'ativo',
  }));

  // ---- Escrita ----
  const meta = {
    gerado_em: new Date().toISOString(),
    fonte_indicadores: 'INEP — IDEB 2023 (Ensino Médio, por escola)',
    fonte_coordenadas: 'IBGE (via dataset municipios-brasileiros)',
    total_escolas: escolas.length,
    etapa: 'Ensino Médio',
    anos: ANOS,
    observacao:
      'IDEB, Taxa de Aprovação e Nota SAEB são dados reais do INEP (2023). Coordenadas são o centroide real do município (com leve dispersão para não sobrepor).',
  };

  writeFileSync(join(OUT, 'escolas.json'), JSON.stringify(escolas));
  writeFileSync(
    join(OUT, 'agregados.json'),
    JSON.stringify({ nacional, regiao: aggRegiao, estado: aggEstado, municipio: aggMunicipio })
  );
  writeFileSync(join(OUT, 'alertas.json'), JSON.stringify(alertas));
  writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));

  console.log('\n=== Resumo ===');
  console.log(`Escolas: ${escolas.length}`);
  console.log(`IDEB nacional (EM): ${nacional.ideb}`);
  console.log(`Aprovação média: ${nacional.taxa_aprovacao}%`);
  console.log(`Regiões:`, aggRegiao.map((r) => `${r.chave}=${r.ideb}`).join(' '));
  console.log(`\n✓ JSON gravado em api/data/processed/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
