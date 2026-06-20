/** Ícone "ⓘ" com tooltip de descrição ao passar o mouse. */
export function InfoTip({ texto }: { texto: string }) {
  return (
    <span className="relative inline-flex items-center group align-middle">
      <span className="ml-1 grid place-items-center h-4 w-4 rounded-full bg-brand-100 text-brand-600 text-[10px] font-bold cursor-help leading-none">
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-52 rounded-lg bg-ink text-white text-[11px] leading-snug px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-[1000] shadow-lg text-left font-normal normal-case"
      >
        {texto}
      </span>
    </span>
  );
}

/** Descrições dos indicadores (fonte: definições do INEP). */
export const DESCRICOES: Record<string, string> = {
  ideb: 'IDEB (0–10): combina a taxa de aprovação com o desempenho no SAEB. Quanto maior, melhor.',
  aprovacao: 'Percentual de alunos aprovados ao final do ano letivo.',
  abandono: 'Percentual de alunos que deixaram a escola antes do fim do ano letivo (evasão).',
  reprovacao: 'Percentual de alunos reprovados ao final do ano letivo.',
  saeb: 'Nota média padronizada do SAEB (proficiência em Língua Portuguesa e Matemática).',
  distorcao: 'Distorção idade-série: % de alunos com 2 anos ou mais de atraso em relação à série ideal para a idade.',
};
