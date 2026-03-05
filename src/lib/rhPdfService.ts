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
