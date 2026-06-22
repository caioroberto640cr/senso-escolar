// Assistente de IA (chatbot) do EduInsight — proxy para a API da Anthropic (Claude),
// ancorado nos indicadores reais do INEP. Usa "tool use": o modelo pode consultar
// escolas e estatísticas por município/estado antes de responder. A chave fica no servidor.
import type { Request, Response } from 'express';
import { agregados, resolverEtapa, type EtapaKey } from './store.ts';
import * as escolasDb from './escolasDb.ts';

const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODELO = process.env.ASSISTENTE_MODEL || 'claude-haiku-4-5-20251001';

/** Resumo dos agregados (contexto fixo) da etapa. */
function contexto(etapa: EtapaKey): string {
  const a = (agregados as any)[etapa] ?? {};
  const nac = a.nacional ?? {};
  const estados: { chave: string; ideb: number }[] = a.estado ?? [];
  const ord = [...estados].sort((x, y) => (y.ideb ?? 0) - (x.ideb ?? 0));
  const top = ord.slice(0, 5).map((e) => `${e.chave} (${e.ideb})`).join(', ');
  const reg: { chave: string; ideb: number }[] = a.regiao ?? [];
  return [
    `Etapa atual: ${etapa}.`,
    `IDEB nacional: ${nac.ideb ?? '—'} · aprovação ${nac.taxa_aprovacao ?? '—'}% · SAEB ${nac.nota_saeb ?? '—'} · ${nac.escolas ?? '—'} escolas.`,
    reg.length ? `IDEB por região: ${reg.map((r) => `${r.chave} ${r.ideb}`).join(', ')}.` : '',
    estados.length ? `Maiores IDEB (estados): ${top}.` : '',
  ].filter(Boolean).join('\n');
}

// Ferramentas que o modelo pode chamar (dados reais do Postgres)
const TOOLS = [
  {
    name: 'buscar_escolas',
    description: 'Busca escolas reais por nome ou município. Use para perguntas sobre uma escola específica ou para listar escolas de um lugar.',
    input_schema: {
      type: 'object',
      properties: {
        termo: { type: 'string', description: 'Nome da escola OU nome do município.' },
        uf: { type: 'string', description: 'Sigla do estado (ex.: RR), opcional.' },
        etapa: { type: 'string', enum: ['anos_iniciais', 'anos_finais', 'medio'], description: 'Etapa, opcional.' },
      },
      required: ['termo'],
    },
  },
  {
    name: 'estatisticas_local',
    description: 'Estatísticas agregadas (nº de escolas, IDEB médio, aprovação média, distribuição por desempenho e as melhores) de um município e/ou estado.',
    input_schema: {
      type: 'object',
      properties: {
        municipio: { type: 'string', description: 'Nome do município (ex.: Boa Vista), opcional.' },
        uf: { type: 'string', description: 'Sigla do estado (ex.: RR), opcional.' },
        etapa: { type: 'string', enum: ['anos_iniciais', 'anos_finais', 'medio'], description: 'Etapa, opcional.' },
      },
    },
  },
];

async function executarFerramenta(nome: string, input: any, etapaPadrao: EtapaKey): Promise<any> {
  const etapa = resolverEtapa(input?.etapa || etapaPadrao);
  try {
    if (nome === 'buscar_escolas') {
      const r = await escolasDb.listar({ etapa, q: input.termo, uf: input.uf, limit: 8 });
      return {
        etapa,
        encontradas: r.total,
        escolas: r.itens.map((e: any) => ({
          nome: e.nome, municipio: e.municipio, uf: e.estado, dependencia: e.dependencia,
          ideb: e.ideb, aprovacao: e.taxa_aprovacao, abandono: e.abandono, saeb: e.nota_saeb,
        })),
      };
    }
    if (nome === 'estatisticas_local') {
      const r = await escolasDb.estatisticasLocais({ etapa, municipio: input.municipio, uf: input.uf });
      return { etapa, municipio: input.municipio ?? null, uf: input.uf ?? null, ...r };
    }
    return { erro: 'ferramenta desconhecida' };
  } catch (e: any) {
    return { erro: e.message };
  }
}

async function chamarAnthropic(body: any) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Anthropic ${r.status}: ${t.slice(0, 200)}`);
  }
  return r.json() as Promise<any>;
}

export async function assistente(req: Request, res: Response) {
  const etapa = resolverEtapa(req.body?.etapa);
  const entrada = Array.isArray(req.body?.mensagens) ? req.body.mensagens : [];

  if (!API_KEY) {
    return res.json({
      indisponivel: true,
      resposta:
        'O assistente de IA ainda não está ativo neste servidor (falta a variável ANTHROPIC_API_KEY). ' +
        'Assim que a chave for configurada, eu respondo com base nos dados reais do INEP/IDEB 2023.',
    });
  }

  const system =
    'Você é o assistente do EduInsight, um app de indicadores da educação básica do Brasil ' +
    '(dados reais do INEP/IDEB 2023). Responda em português do Brasil, de forma curta, clara e útil. ' +
    'Você tem ferramentas para consultar dados reais por escola e por município/estado — use-as sempre que ' +
    'a pergunta for específica (ex.: uma escola, uma cidade, um estado). Não invente números; se a busca não ' +
    'retornar nada, diga isso. Sua base é apenas o INEP 2023.\n\nDADOS GERAIS:\n' + contexto(etapa);

  const messages: any[] = entrada
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m: any) => ({ role: m.role, content: m.content }));

  if (!messages.length) return res.status(400).json({ erro: 'Envie ao menos uma mensagem.' });

  try {
    for (let passo = 0; passo < 5; passo++) {
      const resp = await chamarAnthropic({ model: MODELO, max_tokens: 800, system, tools: TOOLS, messages });

      if (resp.stop_reason === 'tool_use') {
        const resultados: any[] = [];
        for (const bloco of resp.content) {
          if (bloco.type === 'tool_use') {
            const saida = await executarFerramenta(bloco.name, bloco.input, etapa);
            resultados.push({ type: 'tool_result', tool_use_id: bloco.id, content: JSON.stringify(saida) });
          }
        }
        messages.push({ role: 'assistant', content: resp.content });
        messages.push({ role: 'user', content: resultados });
        continue;
      }

      const texto = (resp.content ?? [])
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n')
        .trim();
      return res.json({ resposta: texto || 'Não consegui gerar uma resposta agora.' });
    }
    res.json({ resposta: 'A consulta ficou complexa demais. Tente reformular a pergunta.' });
  } catch (e: any) {
    console.error('assistente:', e.message);
    res.status(502).json({ erro: 'Falha ao consultar a IA.', detalhe: e.message });
  }
}
