// Paleta e tokens do EduInsight (alinhados ao app web).
export const cores = {
  brand: '#17a24a',
  brandDark: '#0e7a38',
  brand50: '#e4f5ea',
  brand100: '#bfe9cd',
  gold: '#f4a11e',
  blue: '#1f6fe0',
  coral: '#e2463a',
  coralDark: '#a82e22',
  mint: '#14b88a',
  ink: '#15241b',
  inkSoft: '#4f5e54',
  inkFaint: '#8a968d',
  canvas: '#f4f7f1',
  surface: '#ffffff',
  line: '#e5e9e2',
  branco: '#ffffff',
};

export const ETAPAS = [
  { key: 'anos_iniciais', curto: 'Anos Iniciais' },
  { key: 'anos_finais', curto: 'Anos Finais' },
  { key: 'medio', curto: 'Ensino Médio' },
] as const;

export type EtapaKey = (typeof ETAPAS)[number]['key'];

export const etapaLabel = (k: string) =>
  ETAPAS.find((e) => e.key === k)?.curto ?? k;

/** Faixa de desempenho do IDEB → rótulo + cor. */
export function toneIdeb(v: number | null | undefined) {
  if (v == null) return { label: 'Sem dado', cor: cores.inkFaint };
  if (v >= 6) return { label: 'Bom', cor: cores.brand };
  if (v >= 4.5) return { label: 'Atenção', cor: cores.gold };
  return { label: 'Crítico', cor: cores.coral };
}

export const dependenciaLabel = (d: string) =>
  ({ federal: 'Federal', estadual: 'Estadual', municipal: 'Municipal', privada: 'Privada' } as Record<string, string>)[d] ?? d;

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// bbox do mapa do Brasil (precisa ser IGUAL ao usado para gerar brand/brasil-mapa.png)
export const BBOX_BR = { oeste: -74, leste: -34, sul: -34, norte: 6 };
