import type { Usuario } from '../types';

// ===========================================================
// Dados de APLICAÇÃO (não vêm do INEP).
// Os indicadores/escolas reais agora vêm da API (ver src/lib/api.ts).
// ===========================================================

export const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'] as const;

export const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

// Usuário logado (mock — autenticação real é um próximo passo)
export const usuarioAtual: Usuario = {
  id_usuario: 'u1',
  nome: 'Ramires Machârue',
  email: 'ramiresmacharue@gmail.com',
  perfil: 'gestor',
  favoritos: [],
  preferencias_notificacao: {
    quedaDesempenho: true,
    aumentoEvasao: true,
    resumoSemanal: false,
  },
};

// Fontes de dados — status das integrações (reflete as fontes reais usadas)
export const fontes = [
  { nome: 'INEP — IDEB 2023 (Ensino Médio)', status: 'conectado', ultima: '2024-09-01', registros: '14.457 escolas' },
  { nome: 'INEP — IDEB por município', status: 'conectado', ultima: '2024-09-01', registros: '5.5 mil municípios' },
  { nome: 'IBGE — Localidades (API)', status: 'conectado', ultima: 'tempo real', registros: '27 UFs · 5.570 municípios' },
  { nome: 'INEP — IDEB Anos Iniciais/Finais', status: 'sincronizando', ultima: '2024-09-01', registros: 'pendente ETL' },
  { nome: 'SAEB — Microdados', status: 'erro', ultima: '—', registros: '—' },
];
