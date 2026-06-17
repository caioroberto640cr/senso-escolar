/**
 * ETL — EduInsight (multi-etapa)
 * Processa dados REAIS do INEP (IDEB 2023) das 3 etapas — Anos Iniciais, Anos Finais
 * e Ensino Médio — e cruza com coordenadas reais dos municípios (IBGE).
 *
 * Como IDEB de etapas diferentes NÃO é comparável, cada escola guarda indicadores
 * SEPARADOS por etapa, e os agregados são calculados por etapa.
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

type EtapaKey = 'anos_iniciais' | 'anos_finais' | 'medio';

const FONTES: Record<EtapaKey, { url: string; file: string; rotulo: string }> = {
  anos_iniciais: {
    url: 'https://download.inep.gov.br/ideb/resultados/divulgacao_anos_iniciais_escolas_2023.zip',
    file: 'ideb_ai_escolas_2023.zip',
    rotulo: 'Anos Iniciais (EF)',
  },
  anos_finais: {
    url: 'https://download.inep.gov.br/ideb/resultados/divulgacao_anos_finais_escolas_2023.zip',
    file: 'ideb_af_escolas_2023.zip',
    rotulo: 'Anos Finais (EF)',
  },
  medio: {
    url: 'https://download.inep.gov.br/ideb/resultados/divulgacao_ensino_medio_escolas_2023.zip',
    file: 'ideb_em_escolas_2023.zip',
    rotulo: 'Ensino Médio',
  },
};

const MUNICIPIOS = {
  url: 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv',
  file: 'municipios.csv',
};

async function baixarSeFaltar(url: string, destino: string) {
  const caminho = join(RAW, destino);
  if (existsSync(caminho)) return caminho;
  console.log(`↓ baixando: ${destino}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${url} (HTTP ${res.status})`);
  writeFileSync(caminho, Buffer.from(await res.arrayBuffer()));
  return caminho;
}

function carregarCoordenadas(): Map<number, { lat: number; lng: number }> {
  const csv = readFileSync(join(RAW, MUNICIPIOS.file), 'utf8');
  const linhas = csv.split('\n');
  const h = linhas[0].split(',');
  const iCod = h.indexOf('codigo_ibge'), iLat = h.indexOf('latitude'), iLng = h.indexOf('longitude');
  const mapa = new Map<number, { lat: number; lng: number }>();
  for (let i = 1; i < linhas.length; i++) {
    const c = linhas[i].split(',');
    if (c.length < 4) continue;
    const cod = Number(c[iCod]), lat = Number(c[iLat]), lng = Number(c[iLng]);
    if (cod && !Number.isNaN(lat) && !Number.isNaN(lng)) mapa.set(cod, { lat, lng });
  }
  return mapa;
}

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

interface EscolaMerge {
  id_escola: string;
  nome: string;
  municipio: string;
  cod_municipio: number;
  estado: string;
  regiao: string;
  dependencia: string;
  latitude: number;
  longitude: number;
  etapas: EtapaKey[];
  indicadores: Partial<Record<EtapaKey, {
    ideb: number;
    taxa_aprovacao: number | null;
    nota_saeb: number | null;
    historico_ideb: { ano: number; valor: number }[];
  }>>;
}

function processarEtapa(
  etapa: EtapaKey,
  escolas: Map<string, EscolaMerge>,
  coords: Map<number, { lat: number; lng: number }>
) {
  const zip = new AdmZip(join(RAW, FONTES[etapa].file));
  const entry = zip.getEntries().find((e) => e.entryName.endsWith('.xlsx'));
  if (!entry) throw new Error(`xlsx não encontrado em ${FONTES[etapa].file}`);
  const wb = XLSX.read(entry.getData(), { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false });

  let hr = -1;
  for (let i = 0; i < 12; i++) if ((rows[i] || []).includes('SG_UF')) { hr = i; break; }
  const codes: string[] = rows[hr].map((c: any) => String(c ?? ''));
  const col = (code: string) => codes.indexOf(code);
  const idx = {
    uf: col('SG_UF'), cod_mun: col('CO_MUNICIPIO'), mun: col('NO_MUNICIPIO'),
    id: col('ID_ESCOLA'), nome: col('NO_ESCOLA'), rede: col('REDE'),
    aprov: col('VL_APROVACAO_2023_SI_4'), saeb: col('VL_NOTA_MEDIA_2023'),
    ideb: ANOS.map((a) => col(`VL_OBSERVADO_${a}`)),
  };

  let add = 0;
  for (let i = hr + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[idx.id]) continue;
    const ideb2023 = num(r[idx.ideb[3]]);
    if (ideb2023 == null) continue;
    const codMun = Number(r[idx.cod_mun]);
    const geo = coords.get(codMun);
    if (!geo) continue;

    const id = String(r[idx.id]);
    const historico = ANOS.map((ano, k) => ({ ano, valor: num(r[idx.ideb[k]]) }))
      .filter((p) => p.valor != null) as { ano: number; valor: number }[];
    const indicador = {
      ideb: ideb2023,
      taxa_aprovacao: num(r[idx.aprov]),
      nota_saeb: num(r[idx.saeb]),
      historico_ideb: historico,
    };

    let e = escolas.get(id);
    if (!e) {
      const uf = String(r[idx.uf]);
      const seed = Number(id) || i;
      e = {
        id_escola: id,
        nome: String(r[idx.nome]),
        municipio: String(r[idx.mun]),
        cod_municipio: codMun,
        estado: uf,
        regiao: UF_REGIAO[uf] ?? 'Sudeste',
        dependencia: dependenciaDe(String(r[idx.rede])),
        latitude: Math.round((geo.lat + jitter(seed)) * 1e5) / 1e5,
        longitude: Math.round((geo.lng + jitter(seed + 1)) * 1e5) / 1e5,
        etapas: [],
        indicadores: {},
      };
      escolas.set(id, e);
    }
    e.etapas.push(etapa);
    e.indicadores[etapa] = indicador;
    add++;
  }
  console.log(`  ${FONTES[etapa].rotulo}: ${add} escolas com IDEB 2023`);
}

function media(arr: number[]) {
  return arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0;
}

function agregarEtapa(escolas: EscolaMerge[], etapa: EtapaKey) {
  const comEtapa = escolas.filter((e) => e.indicadores[etapa]);
  const idebs = comEtapa.map((e) => e.indicadores[etapa]!.ideb);
  const aprov = comEtapa.map((e) => e.indicadores[etapa]!.taxa_aprovacao).filter((v): v is number => v != null);
  const saeb = comEtapa.map((e) => e.indicadores[etapa]!.nota_saeb).filter((v): v is number => v != null);

  const historico = ANOS.map((ano) => {
    const vals = comEtapa
      .map((e) => e.indicadores[etapa]!.historico_ideb.find((p) => p.ano === ano)?.valor)
      .filter((v): v is number => v != null);
    return { ano, valor: media(vals) };
  });

  const porGrupo = (chave: (e: EscolaMerge) => string) => {
    const g = new Map<string, number[]>();
    for (const e of comEtapa) {
      const k = chave(e);
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(e.indicadores[etapa]!.ideb);
    }
    return [...g.entries()].map(([chave, v]) => ({ chave, ideb: media(v), escolas: v.length }));
  };

  return {
    nacional: {
      ideb: media(idebs),
      taxa_aprovacao: media(aprov),
      nota_saeb: media(saeb),
      escolas: comEtapa.length,
      historico_ideb: historico,
    },
    regiao: porGrupo((e) => e.regiao).sort((a, b) => b.ideb - a.ideb),
    estado: porGrupo((e) => e.estado).sort((a, b) => b.ideb - a.ideb),
  };
}

async function main() {
  console.log('=== ETL EduInsight — 3 etapas (Anos Iniciais, Finais, Médio) ===\n');
  await baixarSeFaltar(MUNICIPIOS.url, MUNICIPIOS.file);
  for (const e of Object.values(FONTES)) await baixarSeFaltar(e.url, e.file);

  const coords = carregarCoordenadas();
  console.log(`✓ coordenadas de ${coords.size} municípios\n→ processando etapas...`);

  const escolas = new Map<string, EscolaMerge>();
  (['anos_iniciais', 'anos_finais', 'medio'] as EtapaKey[]).forEach((et) =>
    processarEtapa(et, escolas, coords)
  );

  const lista = [...escolas.values()];
  // ordena etapas de cada escola na ordem pedagógica
  const ordem: EtapaKey[] = ['anos_iniciais', 'anos_finais', 'medio'];
  for (const e of lista) e.etapas = ordem.filter((o) => e.etapas.includes(o));

  // ---- Agregados por etapa ----
  const agregados = {
    anos_iniciais: agregarEtapa(lista, 'anos_iniciais'),
    anos_finais: agregarEtapa(lista, 'anos_finais'),
    medio: agregarEtapa(lista, 'medio'),
  };

  // ---- Alertas: maiores quedas de IDEB 2021->2023, em qualquer etapa ----
  const quedas: { e: EscolaMerge; etapa: EtapaKey; delta: number; v21: number; v23: number }[] = [];
  for (const e of lista) {
    for (const etapa of e.etapas) {
      const h = e.indicadores[etapa]!.historico_ideb;
      const v21 = h.find((p) => p.ano === 2021)?.valor;
      const v23 = h.find((p) => p.ano === 2023)?.valor;
      if (v21 != null && v23 != null) {
        quedas.push({ e, etapa, delta: Math.round((v23 - v21) * 100) / 100, v21, v23 });
      }
    }
  }
  quedas.sort((a, b) => a.delta - b.delta);
  const rotuloEtapa: Record<EtapaKey, string> = {
    anos_iniciais: 'Anos Iniciais', anos_finais: 'Anos Finais', medio: 'Ensino Médio',
  };
  const alertas = quedas.slice(0, 10).map((q, i) => ({
    id_alerta: `a${i + 1}`,
    id_escola: q.e.id_escola,
    nome_escola: q.e.nome,
    etapa: q.etapa,
    indicador: `IDEB · ${rotuloEtapa[q.etapa]}`,
    condicao: `queda de ${Math.abs(q.delta).toFixed(1)} pts (2021→2023)`,
    severidade: q.delta <= -1 ? 'critico' : q.delta < 0 ? 'atencao' : 'info',
    descricao: `${q.e.nome} (${q.e.municipio}/${q.e.estado}) — IDEB de ${q.v21} para ${q.v23} entre 2021 e 2023 (${rotuloEtapa[q.etapa]}).`,
    data: '2024-09-01T00:00:00Z',
    status: 'ativo',
  }));

  const meta = {
    gerado_em: new Date().toISOString(),
    fonte_indicadores: 'INEP — IDEB 2023 (Anos Iniciais, Anos Finais e Ensino Médio, por escola)',
    fonte_coordenadas: 'IBGE (via dataset municipios-brasileiros)',
    total_escolas: lista.length,
    etapas: {
      anos_iniciais: agregados.anos_iniciais.nacional.escolas,
      anos_finais: agregados.anos_finais.nacional.escolas,
      medio: agregados.medio.nacional.escolas,
    },
    anos: ANOS,
    observacao:
      'IDEB, Taxa de Aprovação e Nota SAEB são dados reais do INEP (2023), separados por etapa (não comparáveis entre si). Coordenadas = centroide real do município (com leve dispersão).',
  };

  writeFileSync(join(OUT, 'escolas.json'), JSON.stringify(lista));
  writeFileSync(join(OUT, 'agregados.json'), JSON.stringify(agregados));
  writeFileSync(join(OUT, 'alertas.json'), JSON.stringify(alertas));
  writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));

  console.log('\n=== Resumo ===');
  console.log(`Escolas únicas: ${lista.length}`);
  for (const et of ordem) {
    console.log(`  ${rotuloEtapa[et]}: ${agregados[et].nacional.escolas} escolas · IDEB nac. ${agregados[et].nacional.ideb}`);
  }
  console.log(`\n✓ JSON gravado em api/data/processed/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
