// ===========================================================
// Tipos de domínio — baseados nas entidades do documento
// (Escola, Indicador, Usuário, Alerta)
// ===========================================================

export type DependenciaAdministrativa =
  | 'federal'
  | 'estadual'
  | 'municipal'
  | 'privada';

/** Etapas reais do IDEB (chaves usadas pela API). */
export type EtapaKey = 'anos_iniciais' | 'anos_finais' | 'medio';

export const ETAPAS: { key: EtapaKey; label: string; curto: string }[] = [
  { key: 'anos_iniciais', label: 'Anos Iniciais (EF)', curto: 'Anos Iniciais' },
  { key: 'anos_finais', label: 'Anos Finais (EF)', curto: 'Anos Finais' },
  { key: 'medio', label: 'Ensino Médio', curto: 'Ensino Médio' },
];

export const etapaLabel = (k: EtapaKey): string =>
  ETAPAS.find((e) => e.key === k)?.curto ?? k;

export type Regiao = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul';

export type PerfilUsuario = 'pai' | 'docente' | 'gestor' | 'analista' | 'admin';

/** Ponto histórico de um indicador (ano -> valor) */
export interface PontoHistorico {
  ano: number;
  valor: number;
}

/** Indicadores reais de UMA etapa. */
export interface IndicadorEtapa {
  ideb: number;
  taxa_aprovacao: number | null;
  nota_saeb: number | null;
  historico_ideb: PontoHistorico[];
  abandono?: number | null;
  reprovacao?: number | null;
  distorcao?: number | null;
}

/** Dados do Censo Escolar (nível escola). */
export interface Censo {
  matriculas: number | null;
  porte: string | null;
  localizacao: string | null; // urbana | rural
  recorte: string | null; // indigena | quilombola | assentamento
  infra: Record<string, boolean>;
}

/** Escola "achatada" para uma etapa — usada em listas e mapa. */
export interface EscolaProjetada {
  id_escola: string; // código INEP (real)
  nome: string;
  municipio: string;
  estado: string; // UF
  regiao: Regiao;
  dependencia: DependenciaAdministrativa;
  etapas: EtapaKey[];
  latitude: number;
  longitude: number;
  ideb: number;
  taxa_aprovacao: number | null;
  nota_saeb: number | null;
  abandono: number | null;
  distorcao: number | null;
  score_geral: number; // = IDEB da etapa, usado para colorir o pin
  historico_ideb: PontoHistorico[];
  censo?: Censo;
}

/** Registro completo da escola (todas as etapas) — usado no detalhe. */
export interface EscolaCompleta {
  id_escola: string;
  nome: string;
  municipio: string;
  cod_municipio: number;
  estado: string;
  regiao: Regiao;
  dependencia: DependenciaAdministrativa;
  etapas: EtapaKey[];
  latitude: number;
  longitude: number;
  indicadores: Partial<Record<EtapaKey, IndicadorEtapa>>;
  censo?: Censo;
}

/** Itens de infraestrutura para exibição (rótulo + ícone). */
export const INFRA_ITENS: { key: string; label: string; icon: string }[] = [
  { key: 'internet', label: 'Internet', icon: '🌐' },
  { key: 'internet_alunos', label: 'Internet p/ alunos', icon: '📶' },
  { key: 'lab_informatica', label: 'Lab. de informática', icon: '💻' },
  { key: 'lab_ciencias', label: 'Lab. de ciências', icon: '🔬' },
  { key: 'biblioteca', label: 'Biblioteca', icon: '📚' },
  { key: 'quadra', label: 'Quadra de esportes', icon: '🏀' },
  { key: 'auditorio', label: 'Auditório', icon: '🎭' },
  { key: 'banheiro_acessivel', label: 'Banheiro acessível', icon: '♿' },
  { key: 'agua_potavel', label: 'Água potável', icon: '🚰' },
];

/** Versão enxuta usada no mapa (subset da projetada). */
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
  abandono?: number | null;
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
