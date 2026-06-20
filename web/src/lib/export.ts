// Utilitários de exportação de dados.
import { etapaLabel, INFRA_ITENS, type EscolaCompleta, type EtapaKey } from '../types';
import { dependenciaLabel } from './utils';

const COL_PDF: Record<string, { rotulo: string; campo: string }> = {
  ideb: { rotulo: 'IDEB', campo: 'ideb' },
  aprovacao: { rotulo: 'Aprov. (%)', campo: 'taxa_aprovacao' },
  abandono: { rotulo: 'Aband. (%)', campo: 'abandono' },
  reprovacao: { rotulo: 'Reprov. (%)', campo: 'reprovacao' },
  saeb: { rotulo: 'SAEB', campo: 'nota_saeb' },
  distorcao: { rotulo: 'Distorção (%)', campo: 'distorcao' },
};
const VERDE: [number, number, number] = [47, 143, 67];
const fmt = (v: any) => (v == null ? '—' : String(v));

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

/** Gera um PDF REAL (tabela de dados, não print da tela) com as escolas filtradas. */
export async function exportarEscolasPDF(
  params: Record<string, string | number | string[] | undefined>,
  cols: string[],
  subtitulo: string
) {
  const res = await fetch(`/api/escolas?${filtros({ ...params, limit: 500, sort: 'ideb' })}`);
  const data = await res.json();
  const itens: any[] = data.itens ?? [];
  const colsSel = cols.filter((c) => COL_PDF[c]);

  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(15);
  doc.setTextColor(30);
  doc.text('EduInsight — Relatório de Escolas', 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(subtitulo, 14, 21);
  const nota = data.total > itens.length
    ? `Mostrando ${itens.length} de ${data.total.toLocaleString('pt-BR')} (use o CSV para a lista completa) · gerado em ${new Date().toLocaleDateString('pt-BR')}`
    : `${itens.length} escolas · gerado em ${new Date().toLocaleDateString('pt-BR')}`;
  doc.text(nota, 14, 26);

  autoTable(doc, {
    startY: 30,
    head: [['Escola', 'Município', 'UF', ...colsSel.map((c) => COL_PDF[c].rotulo)]],
    body: itens.map((e) => [
      e.nome, e.municipio, e.estado, ...colsSel.map((c) => fmt(e[COL_PDF[c].campo])),
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: VERDE },
    alternateRowStyles: { fillColor: [244, 250, 245] },
  });

  doc.save('relatorio_escolas.pdf');
  return data.total as number;
}

/** Gera a ficha de uma escola em PDF (dados por etapa + infraestrutura). */
export async function exportarEscolaPDF(escola: EscolaCompleta) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text(escola.nome, 14, 18, { maxWidth: 180 });
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `${escola.municipio}/${escola.estado} · ${escola.regiao} · ${dependenciaLabel(escola.dependencia)} · INEP ${escola.id_escola}`,
    14, 25, { maxWidth: 180 }
  );

  autoTable(doc, {
    startY: 30,
    head: [['Etapa', 'IDEB', 'Aprovação', 'Abandono', 'Reprovação', 'SAEB', 'Distorção']],
    body: escola.etapas.map((et: EtapaKey) => {
      const i = escola.indicadores[et]!;
      return [etapaLabel(et), fmt(i.ideb), fmt(i.taxa_aprovacao), fmt(i.abandono), fmt(i.reprovacao), fmt(i.nota_saeb), fmt(i.distorcao)];
    }),
    styles: { fontSize: 9 },
    headStyles: { fillColor: VERDE },
  });

  if (escola.censo) {
    const y = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text('Infraestrutura e perfil', 14, y);
    const linhasInfra = INFRA_ITENS.map((it) => [it.label, escola.censo!.infra[it.key] ? 'Sim' : 'Não']);
    autoTable(doc, {
      startY: y + 3,
      body: [
        ['Matrículas', fmt(escola.censo.matriculas)],
        ['Porte', fmt(escola.censo.porte)],
        ['Localização', fmt(escola.censo.localizacao)],
        ...linhasInfra,
      ],
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold' } },
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Fonte: INEP (IDEB/Censo 2023) · gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, (doc as any).lastAutoTable.finalY + 8);
  doc.save(`escola_${escola.id_escola}.pdf`);
}
