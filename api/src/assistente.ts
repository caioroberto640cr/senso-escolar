// Assistente de IA (chatbot) do EduInsight — proxy para a API da Anthropic (Claude),
// ancorado nos indicadores reais do INEP. A chave fica só no servidor.
import type { Request, Response } from 'express';
import { agregados, resolverEtapa, type EtapaKey } from './store.ts';

const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODELO = process.env.ASSISTENTE_MODEL || 'claude-haiku-4-5-20251001';

/** Monta um resumo dos dados reais da etapa para dar contexto ao modelo. */
function contexto(etapa: EtapaKey): string {
  const a = (agregados as any)[etapa] ?? {};
  const nac = a.nacional ?? {};
  const estados: { chave: string; ideb: number }[] = a.estado ?? [];
  const ord = [...estados].sort((x, y) => (y.ideb ?? 0) - (x.ideb ?? 0));
  const top = ord.slice(0, 5).map((e) => `${e.chave} (${e.ideb})`).join(', ');
  const baixo = ord.slice(-5).map((e) => `${e.chave} (${e.ideb})`).join(', ');
  const reg: { chave: string; ideb: number }[] = a.regiao ?? [];
  const regTxt = reg.map((r) => `${r.chave} ${r.ideb}`).join(', ');
  return [
    `Etapa atual: ${etapa}.`,
    `IDEB nacional: ${nac.ideb ?? '—'} · aprovação ${nac.taxa_aprovacao ?? '—'}% · SAEB ${nac.nota_saeb ?? '—'} · ${nac.escolas ?? '—'} escolas.`,
    reg.length ? `IDEB por região: ${regTxt}.` : '',
    estados.length ? `Maiores IDEB (estados): ${top}. Menores: ${baixo}.` : '',
  ].filter(Boolean).join('\n');
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
    'Baseie-se nos dados abaixo; quando não tiver o dado, diga que sua base é apenas o INEP 2023. ' +
    'Não invente números.\n\nDADOS ATUAIS:\n' + contexto(etapa);

  const messages = entrada
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m: any) => ({ role: m.role, content: m.content }));

  if (!messages.length) return res.status(400).json({ erro: 'Envie ao menos uma mensagem.' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODELO, max_tokens: 700, system, messages }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('assistente Anthropic:', r.status, t.slice(0, 300));
      return res.status(502).json({ erro: 'Falha ao consultar a IA.', detalhe: `HTTP ${r.status}` });
    }
    const data: any = await r.json();
    const resposta = (data?.content ?? [])
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n')
      .trim();
    res.json({ resposta: resposta || 'Não consegui gerar uma resposta agora.' });
  } catch (e: any) {
    console.error('assistente:', e.message);
    res.status(502).json({ erro: 'Falha ao consultar a IA.', detalhe: e.message });
  }
}
