import type { Escola } from '../types';

/** Classe de cor pastel para um score 0–10 (verde/amarelo/coral). */
export function scoreTone(score: number): {
  label: string;
  text: string;
  bg: string;
  hex: string;
} {
  if (score >= 6) {
    return { label: 'Bom', text: 'text-mint-600', bg: 'bg-mint-100', hex: '#57c79a' };
  }
  if (score >= 4.5) {
    return { label: 'Atenção', text: 'text-sun-500', bg: 'bg-sun-100', hex: '#e8c55a' };
  }
  return { label: 'Crítico', text: 'text-peach-600', bg: 'bg-peach-100', hex: '#f0876a' };
}

export function dependenciaLabel(d: Escola['dependencia']): string {
  return { federal: 'Federal', estadual: 'Estadual', municipal: 'Municipal', privada: 'Privada' }[d];
}

export function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
