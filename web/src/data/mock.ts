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

// O status das fontes de dados agora vem da API real (GET /api/fontes) — ver src/pages/Fontes.tsx.
