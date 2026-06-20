import './env.ts'; // carrega .env ANTES de qualquer módulo que leia process.env
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { agregados, alertas, meta, resolverEtapa } from './store.ts';
import * as escolasDb from './escolasDb.ts';
import type { DimEscola } from './escolasDb.ts';
import * as ibge from './ibge.ts';
import { initSchema, dbReady } from './db.ts';
import {
  registrar, entrar, eu, sair, autenticar, exigirAdmin,
  listarUsuarios, atualizarUsuario, removerUsuario,
} from './auth.ts';
import { verificarCsrf } from './cookies.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3333;

// Atrás do proxy do Render (TLS terminado lá): permite req.secure refletir HTTPS.
app.set('trust proxy', 1);

// CORS com credenciais (cookies). Em produção front+API são mesma origem, então
// CORS quase não é exercido; ainda assim restringimos a uma allowlist.
const ORIGENS = (process.env.CORS_ORIGINS || 'http://localhost:5173,https://eduinsight-25ys.onrender.com')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    // Sem Origin (navegação/curl/same-origin GET) ou na allowlist → libera com headers CORS.
    // Origem não listada → NÃO derruba a requisição (same-origin não precisa de CORS);
    // apenas não envia os headers, então o navegador bloqueia cross-origin de terceiros.
    cb(null, !origin || ORIGENS.includes(origin));
  },
  credentials: true,
}));
app.use(express.json());
app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next(); });
// Proteção CSRF (double-submit) em todas as rotas de API que alteram estado.
app.use('/api', verificarCsrf);

/** Envolve um handler async, devolvendo 500 em caso de erro (ex.: banco indisponível). */
const rota = (fn: (req: express.Request, res: express.Response) => Promise<any>) =>
  (req: express.Request, res: express.Response) =>
    fn(req, res).catch((e) => {
      console.error(`${req.url}:`, e.message);
      res.status(500).json({ erro: 'Falha ao consultar os dados', detalhe: e.message });
    });

// ---------- Saúde / meta ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, escolas: meta.total_escolas ?? 0 }));
app.get('/api/meta', (_req, res) => res.json(meta));

// ---------- Fontes de dados (status real: contagens no Postgres + ping no IBGE) ----------
const ET_LABEL: Record<string, string> = {
  anos_iniciais: 'Anos Iniciais', anos_finais: 'Anos Finais', medio: 'Ensino Médio',
};
const fmtN = (n: number) => n.toLocaleString('pt-BR');

app.get('/api/fontes', rota(async (_req, res) => {
  const verificado_em = new Date().toISOString();
  const dataInep = String(meta.gerado_em ?? '').slice(0, 10) || '—';
  const cont = await escolasDb.contagemFontes();
  const fontes: any[] = [];
  const erroBanco = { status: 'erro', ultima: '—', registros: 'sem dados' };

  // IDEB — uma fonte por etapa
  for (const key of ['anos_iniciais', 'anos_finais', 'medio']) {
    const row = cont?.etapas.find((e) => e.etapa === key);
    fontes.push({
      id: `ideb_${key}`, categoria: 'INEP',
      nome: `INEP — IDEB 2023 (${ET_LABEL[key]})`,
      ...(row
        ? { status: 'conectado', ultima: dataInep, registros: `${fmtN(row.n)} escolas` }
        : erroBanco),
      detalhe: row
        ? `IDEB, aprovação e proficiência SAEB por escola nesta etapa. Carga do dataset: ${dataInep}.`
        : 'Banco indisponível — rode "npm run etl" e "npm run seed".',
    });
  }

  // SAEB — proficiência (vem junto do IDEB, não há ingestão separada de microdados)
  const saebN = cont ? cont.etapas.reduce((s, e) => s + e.saeb, 0) : 0;
  fontes.push({
    id: 'saeb', categoria: 'SAEB',
    nome: 'SAEB — Proficiência (via INEP/IDEB)',
    ...(saebN > 0
      ? { status: 'conectado', ultima: dataInep, registros: `${fmtN(saebN)} resultados` }
      : erroBanco),
    detalhe: 'A nota SAEB (proficiência média padronizada) é integrada junto ao IDEB — o próprio IDEB é calculado a partir dela. Não há ingestão separada de microdados do SAEB.',
  });

  // Censo Escolar
  const censoN = cont?.escolas.censo ?? 0;
  fontes.push({
    id: 'censo', categoria: 'INEP',
    nome: 'INEP — Censo Escolar 2023',
    ...(censoN > 0
      ? { status: 'conectado', ultima: dataInep, registros: `${fmtN(censoN)} escolas` }
      : erroBanco),
    detalhe: 'Infraestrutura, matrículas, porte e localização por escola.',
  });

  // Rendimento + Distorção idade-série (TDI)
  const abandN = cont ? cont.etapas.reduce((s, e) => s + e.aband, 0) : 0;
  fontes.push({
    id: 'rendimento', categoria: 'INEP',
    nome: 'INEP — Rendimento + Distorção (TDI) 2023',
    ...(abandN > 0
      ? { status: 'conectado', ultima: dataInep, registros: `${fmtN(abandN)} registros` }
      : erroBanco),
    detalhe: 'Taxas de abandono/reprovação e distorção idade-série por escola e etapa.',
  });

  // IBGE — checagem ao vivo
  const ibgeOk = await ibge.disponivel();
  fontes.push({
    id: 'ibge', categoria: 'IBGE',
    nome: 'IBGE — Localidades (API)',
    status: ibgeOk ? 'conectado' : 'erro',
    ultima: ibgeOk ? 'tempo real' : '—',
    registros: '27 UFs · 5.570 municípios',
    detalhe: ibgeOk
      ? 'API pública do IBGE respondendo agora. Usada para geografia e malha de estados (cache de 12h).'
      : 'A API do IBGE não respondeu nesta verificação. Tente novamente em instantes.',
  });

  res.json({ verificado_em, fonte_inep: dataInep, fontes });
}));

// ---------- Indicadores (agregados reais por etapa) ----------
app.get('/api/indicadores/nacionais', (req, res) => res.json(agregados[resolverEtapa(req.query.etapa)]?.nacional ?? {}));
app.get('/api/indicadores/regioes', (req, res) => res.json(agregados[resolverEtapa(req.query.etapa)]?.regiao ?? []));
app.get('/api/indicadores/estados', (req, res) => res.json(agregados[resolverEtapa(req.query.etapa)]?.estado ?? []));

// ---------- Alertas ----------
app.get('/api/alertas', (_req, res) => res.json(alertas));

// ---------- Decomposição (árvore: nº de escolas / matrículas por dimensões) ----------
const DEP_LABEL: Record<string, string> = {
  federal: 'Federal', estadual: 'Estadual', municipal: 'Municipal', privada: 'Privada',
};
const DIMENSOES: Record<string, (e: DimEscola) => string> = {
  regiao: (e) => e.regiao,
  estado: (e) => e.estado,
  dependencia: (e) => DEP_LABEL[e.dependencia] ?? e.dependencia,
  localizacao: (e) => (e.localizacao === 'rural' ? 'Rural' : e.localizacao === 'urbana' ? 'Urbana' : 'Não informado'),
  porte: (e) => e.porte ?? 'Não informado',
  recorte: (e) =>
    e.recorte === 'indigena' ? 'Indígena'
    : e.recorte === 'quilombola' ? 'Quilombola'
    : e.recorte === 'assentamento' ? 'Assentamento'
    : 'Comum',
};
const DIMS_VALIDAS = Object.keys(DIMENSOES);

interface NoArvore { nome: string; escolas: number; matriculas: number; filhos?: NoArvore[] }
function construirArvore(arr: DimEscola[], dims: string[], prof: number): NoArvore[] {
  const fn = DIMENSOES[dims[prof]];
  const grupos = new Map<string, DimEscola[]>();
  for (const e of arr) {
    const k = fn(e);
    let g = grupos.get(k); if (!g) { g = []; grupos.set(k, g); }
    g.push(e);
  }
  const nos: NoArvore[] = [];
  for (const [nome, sub] of grupos) {
    nos.push({
      nome, escolas: sub.length,
      matriculas: sub.reduce((s, e) => s + (e.matriculas ?? 0), 0),
      filhos: prof + 1 < dims.length ? construirArvore(sub, dims, prof + 1) : undefined,
    });
  }
  return nos.sort((a, b) => b.escolas - a.escolas);
}

app.get('/api/decomposicao', rota(async (req, res) => {
  const dims = String(req.query.por ?? 'regiao,dependencia')
    .split(',').map((d) => d.trim()).filter((d) => DIMS_VALIDAS.includes(d)).slice(0, 4);
  if (!dims.length) return res.status(400).json({ erro: 'Informe dimensões válidas em ?por=' });
  const escolas = await escolasDb.dimsEscolas();
  res.json({
    dimensoes: dims,
    total_escolas: escolas.length,
    total_matriculas: escolas.reduce((s, e) => s + (e.matriculas ?? 0), 0),
    arvore: construirArvore(escolas, dims, 0),
  });
}));

// ---------- Escolas (Postgres) ----------
app.get('/api/escolas/mapa', rota(async (req, res) => res.json(await escolasDb.mapa(req.query as any))));
app.get('/api/escolas/export', rota(async (req, res) => {
  const csv = await escolasDb.exportarCSV(req.query as any);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="eduinsight_escolas.csv"');
  res.send(csv);
}));
app.get('/api/escolas/:id', rota(async (req, res) => {
  const e = await escolasDb.escolaPorId(String(req.params.id));
  if (!e) return res.status(404).json({ erro: 'Escola não encontrada' });
  res.json(e);
}));
app.get('/api/escolas', rota(async (req, res) => res.json(await escolasDb.listar(req.query as any))));

// ---------- Autenticação (cadastro/login reais — Postgres/Neon) ----------
app.get('/api/auth/status', (_req, res) => res.json({ disponivel: dbReady }));
app.post('/api/auth/register', registrar);
app.post('/api/auth/login', entrar);
app.post('/api/auth/logout', sair);
app.get('/api/auth/me', autenticar, eu);

// ---------- Gestão de usuários (somente admin) ----------
app.get('/api/usuarios', autenticar, exigirAdmin, listarUsuarios);
app.patch('/api/usuarios/:id', autenticar, exigirAdmin, atualizarUsuario);
app.delete('/api/usuarios/:id', autenticar, exigirAdmin, removerUsuario);

// ---------- Geografia (IBGE ao vivo) ----------
app.get('/api/geografia/estados', async (_req, res) => {
  try { res.json(await ibge.estados()); }
  catch (e: any) { res.status(502).json({ erro: 'IBGE indisponível', detalhe: e.message }); }
});
app.get('/api/geografia/regioes', async (_req, res) => {
  try { res.json(await ibge.regioes()); }
  catch (e: any) { res.status(502).json({ erro: 'IBGE indisponível', detalhe: e.message }); }
});
app.get('/api/geografia/malha-estados', async (_req, res) => {
  try { res.json(await ibge.malhaEstados()); }
  catch (e: any) { res.status(502).json({ erro: 'IBGE indisponível', detalhe: e.message }); }
});
app.get('/api/geografia/malha-pais', async (_req, res) => {
  try { res.json(await ibge.malhaPais()); }
  catch (e: any) { res.status(502).json({ erro: 'IBGE indisponível', detalhe: e.message }); }
});
app.get('/api/geografia/estados/:uf/municipios', async (req, res) => {
  try { res.json(await ibge.municipios(req.params.uf)); }
  catch (e: any) { res.status(502).json({ erro: 'IBGE indisponível', detalhe: e.message }); }
});

// ---------- Servir o site (SPA) em produção ----------
const webDist = join(__dirname, '..', '..', 'web', 'dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ erro: 'Rota de API não encontrada' });
    res.sendFile(join(webDist, 'index.html'));
  });
  console.log('🌐 Servindo site estático de web/dist');
}

initSchema().catch((e) => console.error('Falha ao iniciar schema:', e.message));

app.listen(PORT, () => {
  console.log(`\n🚀 EduInsight em http://localhost:${PORT}`);
  console.log(`   Dados de escolas no Postgres (${meta.total_escolas ?? '?'} escolas).`);
});
