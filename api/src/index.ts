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
  registrar, entrar, eu, autenticar, exigirAdmin,
  listarUsuarios, atualizarUsuario, removerUsuario,
} from './auth.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next(); });

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
