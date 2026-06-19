import './env.ts'; // carrega .env ANTES de qualquer módulo que leia process.env
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  escolas, agregados, alertas, meta, porId,
  projetar, resolverEtapa, type EscolaProjetada,
} from './store.ts';
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

// ---------- Filtro + ordenação (sobre escolas já projetadas para uma etapa) ----------
type Desempenho = 'bom' | 'atencao' | 'critico';
function classifica(e: EscolaProjetada): Desempenho {
  if (e.score_geral >= 6) return 'bom';
  if (e.score_geral >= 4.5) return 'atencao';
  return 'critico';
}

function projetadasFiltradas(q: Record<string, any>): EscolaProjetada[] {
  const etapa = resolverEtapa(q.etapa);
  const uf = q.uf && q.uf !== 'todas' ? String(q.uf).toUpperCase() : null;
  const regiao = q.regiao && q.regiao !== 'todas' ? String(q.regiao) : null;
  const dep = q.dependencia && q.dependencia !== 'todas' ? String(q.dependencia) : null;
  const desempenho = q.desempenho && q.desempenho !== 'todos' ? String(q.desempenho) : null;
  const termo = q.q ? String(q.q).trim().toLowerCase() : null;
  // novos filtros (Censo)
  const localizacao = q.localizacao && q.localizacao !== 'todas' ? String(q.localizacao) : null;
  const recorte = q.recorte && q.recorte !== 'todas' ? String(q.recorte) : null;
  const infra = q.infra ? String(q.infra).split(',').filter(Boolean) : [];

  const out: EscolaProjetada[] = [];
  for (const e of escolas) {
    if (uf && e.estado !== uf) continue;
    if (regiao && e.regiao !== regiao) continue;
    if (dep && e.dependencia !== dep) continue;
    if (termo && !e.nome.toLowerCase().includes(termo) && !e.municipio.toLowerCase().includes(termo))
      continue;
    if (localizacao && e.censo?.localizacao !== localizacao) continue;
    if (recorte && e.censo?.recorte !== recorte) continue;
    if (infra.length && !infra.every((f) => e.censo?.infra?.[f])) continue;
    const p = projetar(e, etapa);
    if (!p) continue; // não tem essa etapa
    if (desempenho && classifica(p) !== desempenho) continue;
    out.push(p);
  }
  return out;
}

function ordenar(lista: EscolaProjetada[], ordem?: string): EscolaProjetada[] {
  const arr = [...lista];
  if (ordem === 'nome') arr.sort((a, b) => a.nome.localeCompare(b.nome));
  else if (ordem === 'aprovacao') arr.sort((a, b) => (b.taxa_aprovacao ?? 0) - (a.taxa_aprovacao ?? 0));
  else arr.sort((a, b) => b.ideb - a.ideb);
  return arr;
}

// ---------- Saúde / meta ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, escolas: escolas.length }));
app.get('/api/meta', (_req, res) => res.json(meta));

// ---------- Indicadores (agregados reais por etapa) ----------
app.get('/api/indicadores/nacionais', (req, res) => {
  const etapa = resolverEtapa(req.query.etapa);
  res.json(agregados[etapa]?.nacional ?? {});
});
app.get('/api/indicadores/regioes', (req, res) => {
  const etapa = resolverEtapa(req.query.etapa);
  res.json(agregados[etapa]?.regiao ?? []);
});
app.get('/api/indicadores/estados', (req, res) => {
  const etapa = resolverEtapa(req.query.etapa);
  res.json(agregados[etapa]?.estado ?? []);
});

// ---------- Alertas ----------
app.get('/api/alertas', (_req, res) => res.json(alertas));

// ---------- Escolas: lista paginada (por etapa) ----------
app.get('/api/escolas', (req, res) => {
  const filtradas = ordenar(projetadasFiltradas(req.query), req.query.sort as string);
  const limit = Math.min(Number(req.query.limit) || 60, 500);
  const offset = Number(req.query.offset) || 0;
  res.json({ total: filtradas.length, limit, offset, itens: filtradas.slice(offset, offset + limit) });
});

// ---------- Escolas: dados para o mapa (payload enxuto + cap/amostra) ----------
app.get('/api/escolas/mapa', (req, res) => {
  const filtradas = projetadasFiltradas(req.query);
  const temFiltroLocal =
    (req.query.uf && req.query.uf !== 'todas') || (req.query.regiao && req.query.regiao !== 'todas');
  const cap = temFiltroLocal ? 4000 : Number(req.query.limit) || 1500;

  let lista = filtradas;
  let amostrado = false;
  if (filtradas.length > cap) {
    const passo = filtradas.length / cap;
    lista = Array.from({ length: cap }, (_, i) => filtradas[Math.floor(i * passo)]);
    amostrado = true;
  }
  res.json({
    total: filtradas.length,
    exibidas: lista.length,
    amostrado,
    itens: lista.map((e) => ({
      id_escola: e.id_escola, nome: e.nome, municipio: e.municipio, estado: e.estado,
      dependencia: e.dependencia, latitude: e.latitude, longitude: e.longitude,
      ideb: e.ideb, taxa_aprovacao: e.taxa_aprovacao, nota_saeb: e.nota_saeb,
      abandono: e.abandono, score_geral: e.score_geral,
    })),
  });
});

// ---------- Escola por id (registro completo, todas as etapas) ----------
app.get('/api/escolas/:id', (req, res) => {
  const e = porId.get(req.params.id);
  if (!e) return res.status(404).json({ erro: 'Escola não encontrada' });
  res.json(e);
});

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
  console.log(`   ${escolas.length} escolas reais (AI/AF/EM) carregadas`);
});
