// ===========================================================
// Tipos de domínio — baseados nas entidades do documento
// (Escola, Indicador, Usuário, Alerta)
// ===========================================================

export type DependenciaAdministrativa =
  | 'federal'
  | 'estadual'
  | 'municipal'
  | 'privada';

export type EtapaEnsino = 'fundamental' | 'medio';

export type Regiao = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';

export type PerfilUsuario = 'pai' | 'docente' | 'gestor' | 'analista' | 'admin';

/** Ponto histórico de um indicador (ano -> valor) */
export interface PontoHistorico {
  ano: number;
  valor: number;
}

export interface Escola {
  id_escola: string; // código INEP (real)
  nome: string;
  municipio: string;
  cod_municipio?: number;
  estado: string; // UF
  regiao: Regiao;
  dependencia: DependenciaAdministrativa;
  etapas: EtapaEnsino[];
  // Geolocalização (centroide real do município)
  latitude: number;
  longitude: number;
  // Indicadores reais do INEP (IDEB 2023 — Ensino Médio)
  ideb: number;
  taxa_aprovacao: number | null; // %
  nota_saeb: number | null; // nota média padronizada
  score_geral: number; // 0–10 (= IDEB), usado para colorir o pin
  historico_ideb: PontoHistorico[];
}

/** Versão enxuta usada no mapa */
export interface EscolaMapa {
  id_escola: string;
  nome: string;
  municipio: string;
  estado: string;
  dependencia: DependenciaAdministrativa;
  latitude: number;
  longitude: number;
  ideb: number;
  taxa_aprovacao: number | null;
  nota_saeb: number | null;
  score_geral: number;
}

export interface Indicador {
  id_indicador: string;
  nome_indicador: string;
  escopo: 'escola' | 'municipio' | 'estado' | 'nacional';
  ano_referencia: number;
  valor: number;
  unidade_medida: string;
  fonte: string; // INEP, SAEB, Censo Escolar...
  data_atualizacao: string; // ISO
}

export interface Usuario {
  id_usuario: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  favoritos: string[]; // id_escola
  preferencias_notificacao: {
    quedaDesempenho: boolean;
    aumentoEvasao: boolean;
    resumoSemanal: boolean;
  };
}

export type Severidade = 'critico' | 'atencao' | 'info';

export interface Alerta {
  id_alerta: string;
  id_escola?: string;
  id_regiao?: string;
  nome_escola?: string;
  indicador: string;
  condicao: string; // "queda > 10%"
  severidade: Severidade;
  descricao: string;
  data: string; // ISO
  status: 'ativo' | 'inativo';
}
