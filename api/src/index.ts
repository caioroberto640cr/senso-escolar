import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { escolas, agregados, alertas, meta, porId, type Escola } from './store.ts';
import * as ibge from './ibge.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json());

// log simples
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ---------- Helpers de filtro ----------
type Desempenho = 'bom' | 'atencao' | 'critico';
function classifica(e: Escola): Desempenho {
  if (e.score_geral >= 6) return 'bom';
  if (e.score_geral >= 4.5) return 'atencao';
  return 'critico';
}

function filtrar(q: Record<string, any>): Escola[] {
  const uf = q.uf && q.uf !== 'todas' ? String(q.uf).toUpperCase() : null;
  const regiao = q.regiao && q.regiao !== 'todas' ? String(q.regiao) : null;
  const dep = q.dependencia && q.dependencia !== 'todas' ? String(q.dependencia) : null;
  const desempenho = q.desempenho && q.desempenho !== 'todos' ? String(q.desempenho) : null;
  const termo = q.q ? String(q.q).trim().toLowerCase() : null;

  return escolas.filter((e) => {
    if (uf && e.estado !== uf) return false;
    if (regiao && e.regiao !== regiao) return false;
    if (dep && e.dependencia !== dep) return false;
    if (desempenho && classifica(e) !== desempenho) return false;
    if (termo && !e.nome.toLowerCase().includes(termo) && !e.municipio.toLowerCase().includes(termo))
      return false;
    return true;
  });
}

function ordenar(lista: Escola[], ordem?: string): Escola[] {
  const arr = [...lista];
  if (ordem === 'nome') arr.sort((a, b) => a.nome.localeCompare(b.nome));
  else if (ordem === 'aprovacao')
    arr.sort((a, b) => (b.taxa_aprovacao ?? 0) - (a.taxa_aprovacao ?? 0));
  else arr.sort((a, b) => b.ideb - a.ideb); // default: maior IDEB
  return arr;
}

// ---------- Saúde / meta ----------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, escolas: escolas.length });
});
app.get('/api/meta', (_req, res) => res.json(meta));

// ---------- Indicadores (agregados reais) ----------
app.get('/api/indicadores/nacionais', (_req, res) => res.json(agregados.nacional));
app.get('/api/indicadores/regioes', (_req, res) => res.json(agregados.regiao));
app.get('/api/indicadores/estados', (_req, res) => res.json(agregados.estado));

// ---------- Alertas ----------
app.get('/api/alertas', (_req, res) => res.json(alertas));

// ---------- Escolas: lista paginada ----------
app.get('/api/escolas', (req, res) => {
  const filtradas = ordenar(filtrar(req.query), req.query.sort as string);
  const limit = Math.min(Number(req.query.limit) || 60, 500);
  const offset = Number(req.query.offset) || 0;
  res.json({
    total: filtradas.length,
    limit,
    offset,
    itens: filtradas.slice(offset, offset + limit),
  });
});

// ---------- Escolas: dados para o mapa (payload enxuto + cap) ----------
app.get('/api/escolas/mapa', (req, res) => {
  const filtradas = filtrar(req.query);
  // Sem filtro de UF, limita a uma amostra para não sobrecarregar o mapa
  const temFiltroLocal = (req.query.uf && req.query.uf !== 'todas') ||
    (req.query.regiao && req.query.regiao !== 'todas');
  const cap = temFiltroLocal ? 4000 : Number(req.query.limit) || 1500;

  let lista = filtradas;
  let amostrado = false;
  if (filtradas.length > cap) {
    // amostragem uniforme estável
    const passo = filtradas.length / cap;
    lista = Array.from({ length: cap }, (_, i) => filtradas[Math.floor(i * passo)]);
    amostrado = true;
  }
  res.json({
    total: filtradas.length,
    exibidas: lista.length,
    amostrado,
    itens: lista.map((e) => ({
      id_escola: e.id_escola,
      nome: e.nome,
      municipio: e.municipio,
      estado: e.estado,
      dependencia: e.dependencia,
      latitude: e.latitude,
      longitude: e.longitude,
      ideb: e.ideb,
      taxa_aprovacao: e.taxa_aprovacao,
      nota_saeb: e.nota_saeb,
      score_geral: e.score_geral,
    })),
  });
});

// ---------- Escola por id ----------
app.get('/api/escolas/:id', (req, res) => {
  const e = porId.get(req.params.id);
  if (!e) return res.status(404).json({ erro: 'Escola não encontrada' });
  res.json(e);
});

// ---------- Geografia (IBGE ao vivo) ----------
app.get('/api/geografia/estados', async (_req, res) => {
  try {
    res.json(await ibge.estados());
  } catch (e: any) {
    res.status(502).json({ erro: 'IBGE indisponível', detalhe: e.message });
  }
});
app.get('/api/geografia/regioes', async (_req, res) => {
  try {
    res.json(await ibge.regioes());
  } catch (e: any) {
    res.status(502).json({ erro: 'IBGE indisponível', detalhe: e.message });
  }
});
app.get('/api/geografia/estados/:uf/municipios', async (req, res) => {
  try {
    res.json(await ibge.municipios(req.params.uf));
  } catch (e: any) {
    res.status(502).json({ erro: 'IBGE indisponível', detalhe: e.message });
  }
});

// ---------- Servir o site (SPA) em produção ----------
// O build do frontend (web/dist) é servido pelo mesmo serviço, mesma origem.
const webDist = join(__dirname, '..', '..', 'web', 'dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  // Fallback do React Router: qualquer rota não-API devolve o index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ erro: 'Rota de API não encontrada' });
    }
    res.sendFile(join(webDist, 'index.html'));
  });
  console.log('🌐 Servindo site estático de web/dist');
}

app.listen(PORT, () => {
  console.log(`\n🚀 EduInsight em http://localhost:${PORT}`);
  console.log(`   ${escolas.length} escolas reais carregadas (${meta.etapa ?? '—'})`);
});
