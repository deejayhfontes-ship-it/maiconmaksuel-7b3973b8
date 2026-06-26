/**
 * RH PDF Generation Service
 * Generates professional PDFs for time sheets, commissions, and payments
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface SalonInfo {
  nome_salao: string;
  telefone_principal?: string;
  logo_url?: string;
}

interface PDFOptions {
  title: string;
  subtitle?: string;
  periodo?: { inicio: Date; fim: Date };
  funcionarioNome?: string;
  profissionalNome?: string;
}

// Get salon info for header
async function getSalonInfo(): Promise<SalonInfo> {
  try {
    const { data } = await supabase
      .from('configuracoes_salao')
      .select('nome_salao, telefone_principal, logo_url')
      .limit(1)
      .single();
    
    return data || { nome_salao: 'Salão' };
  } catch {
    return { nome_salao: 'Salão' };
  }
}

// Add header to PDF
async function addHeader(doc: jsPDF, options: PDFOptions) {
  const salonInfo = await getSalonInfo();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo placeholder or name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(salonInfo.nome_salao, 14, 20);
  
  // Title
  doc.setFontSize(16);
  doc.setTextColor(100, 100, 100);
  doc.text(options.title, 14, 30);
  
  // Subtitle or period
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  let yPos = 38;
  
  if (options.subtitle) {
    doc.text(options.subtitle, 14, yPos);
    yPos += 6;
  }
  
  if (options.periodo) {
    const periodoStr = `Período: ${format(options.periodo.inicio, 'dd/MM/yyyy')} a ${format(options.periodo.fim, 'dd/MM/yyyy')}`;
    doc.text(periodoStr, 14, yPos);
    yPos += 6;
  }
  
  if (options.funcionarioNome) {
    doc.text(`Funcionário: ${options.funcionarioNome}`, 14, yPos);
    yPos += 6;
  }
  
  if (options.profissionalNome) {
    doc.text(`Profissional: ${options.profissionalNome}`, 14, yPos);
    yPos += 6;
  }
  
  // Generation date
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const dataGeracao = `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
  doc.text(dataGeracao, pageWidth - 14 - doc.getTextWidth(dataGeracao), 20);
  
  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, yPos + 2, pageWidth - 14, yPos + 2);
  
  return yPos + 10;
}

// Add footer to PDF
function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Format hours
function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}min`;
}

/**
 * Generate Time Sheet PDF
 */
export async function gerarPDFFolhaPonto(
  funcionarioNome: string,
  mesReferencia: Date,
  dados: {
    dias: Array<{
      data: string;
      entrada: string;
      saidaAlmoco: string;
      entradaTarde: string;
      saida: string;
      horasTrabalhadas: number;
      observacao?: string;
    }>;
    totalHoras: number;
    horasExtras: number;
    atrasos: number;
    bancoHoras: number;
    diasTrabalhados: number;
  }
): Promise<Blob> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  
  const startY = await addHeader(doc, {
    title: 'Folha de Ponto',
    subtitle: format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase(),
    funcionarioNome,
  });
  
  // Table with daily records
  autoTable(doc, {
    startY,
    head: [['Data', 'Entrada', 'Almoço', 'Retorno', 'Saída', 'Horas', 'Obs.']],
    body: dados.dias.map(dia => [
      format(new Date(dia.data), 'dd/MM (EEE)', { locale: ptBR }),
      dia.entrada || '--:--',
      dia.saidaAlmoco || '--:--',
      dia.entradaTarde || '--:--',
      dia.saida || '--:--',
      formatHours(dia.horasTrabalhadas),
      dia.observacao || '',
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [80, 80, 80],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      6: { cellWidth: 30 },
    },
  });
  
  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO DO MÊS', 14, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const summaryData = [
    ['Dias Trabalhados', `${dados.diasTrabalhados} dias`],
    ['Total de Horas', formatHours(dados.totalHoras)],
    ['Horas Extras', formatHours(dados.horasExtras)],
    ['Atrasos', `${dados.atrasos} minutos`],
    ['Banco de Horas', `${dados.bancoHoras >= 0 ? '+' : ''}${formatHours(dados.bancoHoras)}`],
  ];
  
  autoTable(doc, {
    startY: finalY + 5,
    body: summaryData,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right' },
    },
    theme: 'plain',
  });
  
  addFooter(doc);
  
  return doc.output('blob');
}

/**
 * Generate Commissions Report PDF
 */
export async function gerarPDFComissoes(
  profissionalNome: string | null,
  periodo: { inicio: Date; fim: Date },
  comissoes: Array<{
    profissionalNome: string;
    data: string;
    tipo: string;
    descricao: string;
    valorBase: number;
    percentual: number;
    valorComissao: number;
    status: string;
  }>,
  totais: {
    pendente: number;
    pago: number;
    total: number;
  }
): Promise<Blob> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  
  const startY = await addHeader(doc, {
    title: 'Relatório de Comissões',
    periodo,
    profissionalNome: profissionalNome || 'Todos os Profissionais',
  });
  
  // Table with commissions
  autoTable(doc, {
    startY,
    head: [['Data', 'Profissional', 'Tipo', 'Descrição', 'Base', '%', 'Comissão', 'Status']],
    body: comissoes.map(c => [
      format(new Date(c.data), 'dd/MM/yy'),
      c.profissionalNome,
      c.tipo,
      c.descricao || '-',
      formatCurrency(c.valorBase),
      `${c.percentual}%`,
      formatCurrency(c.valorComissao),
      c.status === 'paga' ? '✓ Pago' : '○ Pendente',
    ]),
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [80, 80, 80],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAIS', 14, finalY);
  
  const totalsData = [
    ['Comissões Pendentes', formatCurrency(totais.pendente)],
    ['Comissões Pagas', formatCurrency(totais.pago)],
    ['Total Geral', formatCurrency(totais.total)],
  ];
  
  autoTable(doc, {
    startY: finalY + 5,
    body: totalsData,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    theme: 'plain',
  });
  
  addFooter(doc);
  
  return doc.output('blob');
}

/**
 * Generate Payments Summary PDF
 */
export async function gerarPDFPagamentos(
  mesReferencia: Date,
  pagamentos: Array<{
    nome: string;
    tipo: string;
    salarioBase: number;
    comissoes: number;
    descontos: number;
    liquido: number;
    status: string;
  }>,
  totais: {
    bruto: number;
    descontos: number;
    liquido: number;
  }
): Promise<Blob> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  
  const startY = await addHeader(doc, {
    title: 'Resumo de Pagamentos',
    subtitle: format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase(),
  });
  
  // Table
  autoTable(doc, {
    startY,
    head: [['Nome', 'Tipo', 'Salário Base', 'Comissões', 'Descontos', 'Líquido', 'Status']],
    body: pagamentos.map(p => [
      p.nome,
      p.tipo,
      formatCurrency(p.salarioBase),
      formatCurrency(p.comissoes),
      formatCurrency(p.descontos),
      formatCurrency(p.liquido),
      p.status === 'pago' ? '✓ Pago' : '○ Pendente',
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [80, 80, 80],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  const totalsData = [
    ['Total Bruto', formatCurrency(totais.bruto)],
    ['Total Descontos', formatCurrency(totais.descontos)],
    ['Total Líquido', formatCurrency(totais.liquido)],
  ];
  
  autoTable(doc, {
    startY: finalY + 5,
    body: totalsData,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    theme: 'plain',
  });
  
  addFooter(doc);
  
  return doc.output('blob');
}

/**
 * Save PDF to storage and register in history
 */
export async function salvarPDFNoHistorico(
  pdfBlob: Blob,
  tipo: string,
  subtipo: string | null,
  periodo: { inicio: Date; fim: Date } | null,
  pessoaId: string | null,
  tipoPessoa: 'funcionario' | 'profissional' | null,
  totais: Record<string, number>,
  criadoPor: string
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const fileName = `rh_${tipo}_${timestamp}.pdf`;
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('relatorios-rh')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('relatorios-rh')
      .getPublicUrl(fileName);
    
    const publicUrl = urlData?.publicUrl || null;
    
    // Register in history
    const { error: insertError } = await supabase
      .from('rh_relatorios')
      .insert({
        tipo,
        subtipo,
        periodo_inicio: periodo?.inicio ? format(periodo.inicio, 'yyyy-MM-dd') : null,
        periodo_fim: periodo?.fim ? format(periodo.fim, 'yyyy-MM-dd') : null,
        funcionario_id: tipoPessoa === 'funcionario' ? pessoaId : null,
        profissional_id: tipoPessoa === 'profissional' ? pessoaId : null,
        url_pdf: publicUrl,
        totais,
        criado_por: criadoPor,
      });
    
    if (insertError) throw insertError;
    
    return publicUrl;
  } catch (error) {
    console.error('Error saving PDF to history:', error);
    return null;
  }
}

/**
 * Generate Accountant Commission Report PDF
 */
export async function gerarPDFRelatorioContador(
  mesAno: string,
  dados: Array<{
    nome: string;
    cpf: string;
    totalServicos: number;
    totalProdutos: number;
    totalComissao: number;
    status: string;
  }>,
  grandTotal: { servicos: number; produtos: number; comissao: number }
): Promise<Blob> {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const mesDate = new Date(mesAno + '-01');

  const startY = await addHeader(doc, {
    title: `Relatorio de Comissoes — ${format(mesDate, "MMMM yyyy", { locale: ptBR })}`,
    subtitle: 'Relatorio para Contador',
  });

  autoTable(doc, {
    startY,
    head: [['Profissional', 'CPF', 'Total Servicos (R$)', 'Total Produtos (R$)', 'Total Comissao (R$)', 'Status']],
    body: [
      ...dados.map(d => [
        d.nome,
        d.cpf || '---',
        formatCurrency(d.totalServicos),
        formatCurrency(d.totalProdutos),
        formatCurrency(d.totalComissao),
        d.status,
      ]),
      [
        { content: 'TOTAL', styles: { fontStyle: 'bold' as const } },
        '',
        { content: formatCurrency(grandTotal.servicos), styles: { fontStyle: 'bold' as const } },
        { content: formatCurrency(grandTotal.produtos), styles: { fontStyle: 'bold' as const } },
        { content: formatCurrency(grandTotal.comissao), styles: { fontStyle: 'bold' as const } },
        '',
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  addFooter(doc);
  return doc.output('blob');
}

/**
 * Generate Annual IRPF Commission Report PDF
 */
export async function gerarPDFRelatorioIRPF(
  ano: number,
  dados: Array<{
    nome: string;
    cpf: string;
    meses: number[];
    total: number;
  }>,
  grandTotal: number
): Promise<Blob> {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const startY = await addHeader(doc, {
    title: `Relatorio Anual IRPF — ${ano}`,
    subtitle: 'Rendimentos de Comissoes por Profissional',
  });

  autoTable(doc, {
    startY,
    head: [['Profissional', 'CPF', ...mesesNomes, 'Total Anual']],
    body: [
      ...dados.map(d => [
        d.nome,
        d.cpf || '---',
        ...d.meses.map(v => v > 0 ? formatCurrency(v) : '-'),
        formatCurrency(d.total),
      ]),
      [
        { content: 'TOTAL', styles: { fontStyle: 'bold' as const } },
        '',
        ...Array.from({ length: 12 }, (_, i) => ({
          content: formatCurrency(dados.reduce((s, d) => s + d.meses[i], 0)),
          styles: { fontStyle: 'bold' as const },
        })),
        { content: formatCurrency(grandTotal), styles: { fontStyle: 'bold' as const } },
      ],
    ],
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  addFooter(doc);
  return doc.output('blob');
}

/**
 * Convert number to Brazilian written form (extenso)
 */
function valorPorExtenso(valor: number): string {
  const unidades = ['', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  function porExtensoAte999(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const parts: string[] = [];
    if (c > 0) parts.push(centenas[c]);
    if (resto >= 10 && resto <= 19) {
      parts.push(especiais[resto - 10]);
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      if (d > 0) parts.push(dezenas[d]);
      if (u > 0) parts.push(unidades[u]);
    }
    return parts.join(' e ');
  }

  const partes: string[] = [];
  if (inteiro === 0) {
    partes.push('zero reais');
  } else {
    const milhares = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;
    if (milhares > 0) {
      partes.push(porExtensoAte999(milhares) + ' mil');
    }
    if (resto > 0) {
      partes.push(porExtensoAte999(resto));
    }
    partes.push(inteiro === 1 ? 'real' : 'reais');
  }

  let resultado = partes.join(' ');
  if (centavos > 0) {
    resultado += ` e ${porExtensoAte999(centavos)} centavo${centavos === 1 ? '' : 's'}`;
  }
  return resultado;
}

/**
 * Generate Payment Receipt PDF
 */
export async function gerarReciboPagamento(params: {
  profissionalNome: string;
  profissionalCpf: string;
  valor: number;
  periodo: string;
  dataPagamento: string;
  descricao: string;
  salonNome: string;
  salonCnpj?: string;
}): Promise<Blob> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const salonInfo = await getSalonInfo();
  const nomeExibir = params.salonNome || salonInfo.nome_salao;

  let y = 20;

  // Salon info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(nomeExibir, pageWidth / 2, y, { align: 'center' });
  y += 7;

  if (params.salonCnpj) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`CNPJ: ${params.salonCnpj}`, pageWidth / 2, y, { align: 'center' });
    y += 7;
  }

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 12;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('RECIBO DE PAGAMENTO', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Body
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  const fields = [
    ['Profissional:', params.profissionalNome],
    ['CPF:', params.profissionalCpf || 'Nao informado'],
    ['Periodo de Referencia:', params.periodo],
    ['Data do Pagamento:', params.dataPagamento],
    ['Descricao:', params.descricao],
  ];

  for (const [label, value] of fields) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 75, y);
    y += 8;
  }

  y += 5;

  // Amount
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, y - 5, pageWidth - 40, 22, 2, 2, 'FD');

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Valor:', 25, y + 4);
  doc.setFontSize(16);
  doc.setTextColor(34, 139, 34);
  doc.text(formatCurrency(params.valor), 50, y + 4);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.text(`(${valorPorExtenso(params.valor)})`, 25, y + 13);

  y += 30;

  // Reset color
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // Signature lines
  y += 20;
  const lineWidth = 70;
  const leftX = 25;
  const rightX = pageWidth - 25 - lineWidth;

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);

  doc.line(leftX, y, leftX + lineWidth, y);
  doc.setFontSize(9);
  doc.text('Pagador', leftX + lineWidth / 2, y + 5, { align: 'center' });

  doc.line(rightX, y, rightX + lineWidth, y);
  doc.text('Recebedor', rightX + lineWidth / 2, y + 5, { align: 'center' });

  // Footer
  y += 25;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Este recibo comprova o pagamento descrito acima', pageWidth / 2, y, { align: 'center' });

  // Generation date
  const dataGeracao = `Gerado em: ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`;
  doc.text(dataGeracao, pageWidth / 2, y + 6, { align: 'center' });

  return doc.output('blob');
}

/**
 * Download PDF directly
 */
export function downloadPDF(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
