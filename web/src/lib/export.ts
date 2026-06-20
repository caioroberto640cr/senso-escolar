// Utilitários de exportação de dados.

function filtros(params: Record<string, string | number | string[] | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const val = Array.isArray(v) ? v.join(',') : v;
    if (val != null && val !== '' && val !== 'todas' && val !== 'todos') qs.set(k, String(val));
  }
  return qs.toString();
}

/** Baixa um Blob com o nome dado. */
function baixar(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exporta escolas (CSV gerado no servidor, sem limite de página) conforme os filtros. */
export function exportarEscolasCSV(params: Record<string, string | number | string[] | undefined>) {
  const a = document.createElement('a');
  a.href = `/api/escolas/export?${filtros(params)}`;
  a.setAttribute('download', 'eduinsight_escolas.csv');
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Gera e baixa um CSV a partir de linhas em memória (ex.: comparativo). */
export function baixarCSVLocal(
  nome: string,
  colunas: { chave: string; rotulo: string }[],
  linhas: Record<string, any>[]
) {
  const esc = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhasCsv = [
    colunas.map((c) => c.rotulo).join(';'),
    ...linhas.map((r) => colunas.map((c) => esc(r[c.chave])).join(';')),
  ];
  const BOM = String.fromCharCode(0xfeff);
  baixar(nome, new Blob([BOM + linhasCsv.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
}
