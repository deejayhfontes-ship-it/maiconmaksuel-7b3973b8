import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { saveReportWithPdf, getReportCategory, type ReportSaveParams } from '@/lib/reportStorageService';

// Types
export interface ExportOptions {
  formato: 'pdf' | 'excel' | 'csv';
  incluirGraficos: boolean;
  incluirCabecalho: boolean;
  incluirRodape: boolean;
  incluirResumo: boolean;
  incluirDetalhes: boolean;
  incluirObservacoes: boolean;
  orientacao: 'portrait' | 'landscape';
  periodoInicio?: Date;
  periodoFim?: Date;
}

export interface ExportData {
  titulo: string;
  subtitulo?: string;
  resumo?: {
    label: string;
    valor: string | number;
  }[];
  colunas: string[];
  dados: (string | number)[][];
  observacoes?: string;
}

// Cores do tema
const CORES = {
  primaria: [0, 122, 255] as [number, number, number],
  primariaEscura: [0, 91, 187] as [number, number, number],
  texto: [0, 0, 0] as [number, number, number],
  cinzaClaro: [245, 245, 247] as [number, number, number],
  branco: [255, 255, 255] as [number, number, number],
};

// Helper para formatar data
const formatarData = (data: Date) => format(data, "dd/MM/yyyy", { locale: ptBR });
const formatarDataHora = (data: Date) => format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

// ==================== PDF EXPORT ====================

export const gerarPDF = async (
  data: ExportData,
  options: ExportOptions,
  logoBase64?: string
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: options.orientacao,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  // Helper para adicionar cabeçalho
  const addCabecalho = () => {
    if (!options.incluirCabecalho) return;

    // Gradiente azul no topo (simulado com retângulo)
    doc.setFillColor(...CORES.primaria);
    doc.rect(0, 0, pageWidth, 25, 'F');

    // Logo (se disponível)
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, 5, 15, 15);
      } catch (e) {
        console.log('Logo não disponível');
      }
    }

    // Nome do salão
    doc.setTextColor(...CORES.branco);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MAICON MAKSUEL GESTÃO', logoBase64 ? margin + 20 : margin, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Alfenas/MG • (35) 99999-9999', logoBase64 ? margin + 20 : margin, 18);

    currentY = 35;
  };

  // Helper para adicionar rodapé
  const addRodape = (pageNum: number, totalPages: number) => {
    if (!options.incluirRodape) return;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Página X de Y
    doc.text(`Página ${pageNum} de ${totalPages}`, margin, pageHeight - 8);

    // Data/hora de geração
    const dataGeracao = formatarDataHora(new Date());
    doc.text(dataGeracao, pageWidth / 2, pageHeight - 8, { align: 'center' });

    // Nome do sistema
    doc.text('Sistema Maicon Maksuel Gestão', pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  // Adicionar cabeçalho
  addCabecalho();

  // Título do relatório
  doc.setTextColor(...CORES.primaria);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.titulo, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // Subtítulo
  if (data.subtitulo) {
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.subtitulo, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
  }

  // Período
  if (options.periodoInicio && options.periodoFim) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    const periodo = `Período: ${formatarData(options.periodoInicio)} a ${formatarData(options.periodoFim)}`;
    doc.text(periodo, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
  }

  // Linha separadora
  doc.setDrawColor(...CORES.primaria);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // Resumo Executivo
  if (options.incluirResumo && data.resumo && data.resumo.length > 0) {
    doc.setTextColor(...CORES.texto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO EXECUTIVO', margin, currentY);
    currentY += 8;

    // Cards de resumo
    const cardWidth = (pageWidth - margin * 2 - 10) / 2;
    let cardX = margin;
    let cardY = currentY;

    data.resumo.forEach((item, index) => {
      // Fundo do card
      doc.setFillColor(...CORES.cinzaClaro);
      doc.roundedRect(cardX, cardY, cardWidth, 15, 2, 2, 'F');

      // Label
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, cardX + 5, cardY + 5);

      // Valor
      doc.setTextColor(...CORES.texto);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.valor), cardX + 5, cardY + 12);

      // Próximo card
      if (index % 2 === 0) {
        cardX = margin + cardWidth + 10;
      } else {
        cardX = margin;
        cardY += 20;
      }
    });

    currentY = cardY + 25;
  }

  // Detalhamento (Tabela)
  if (options.incluirDetalhes && data.dados.length > 0) {
    doc.setTextColor(...CORES.texto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHAMENTO', margin, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      head: [data.colunas],
      body: data.dados,
      theme: 'striped',
      headStyles: {
        fillColor: CORES.primaria,
        textColor: CORES.branco,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: CORES.texto,
      },
      alternateRowStyles: {
        fillColor: CORES.cinzaClaro,
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: 3,
        overflow: 'linebreak',
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Observações
  if (options.incluirObservacoes && data.observacoes) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = margin;
    }

    doc.setTextColor(...CORES.texto);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitText = doc.splitTextToSize(data.observacoes, pageWidth - margin * 2);
    doc.text(splitText, margin, currentY);
  }

  // Adicionar rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addRodape(i, totalPages);
  }

  return doc.output('blob');
};

// ==================== EXCEL EXPORT ====================

export const gerarExcel = (
  data: ExportData,
  options: ExportOptions
): Blob => {
  const workbook = XLSX.utils.book_new();

  // ---- ABA 1: Resumo ----
  if (options.incluirResumo && data.resumo) {
    const resumoData: (string | number)[][] = [
      [data.titulo],
      [data.subtitulo || ''],
      [''],
    ];

    if (options.periodoInicio && options.periodoFim) {
      resumoData.push([`Período: ${formatarData(options.periodoInicio)} a ${formatarData(options.periodoFim)}`]);
      resumoData.push(['']);
    }

    // Adicionar resumo
    data.resumo.forEach((item) => {
      resumoData.push([item.label, item.valor]);
    });

    resumoData.push(['']);
    resumoData.push([`Gerado em: ${formatarDataHora(new Date())}`]);

    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);

    // Estilização básica (largura das colunas)
    resumoSheet['!cols'] = [{ wch: 30 }, { wch: 25 }];

    XLSX.utils.book_append_sheet(workbook, resumoSheet, '📊 Resumo');
  }

  // ---- ABA 2: Dados Detalhados ----
  if (options.incluirDetalhes && data.dados.length > 0) {
    const dadosCompletos = [data.colunas, ...data.dados];
    const dadosSheet = XLSX.utils.aoa_to_sheet(dadosCompletos);

    // Ajustar largura das colunas
    dadosSheet['!cols'] = data.colunas.map(() => ({ wch: 18 }));

    // Congelar primeira linha
    dadosSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

    XLSX.utils.book_append_sheet(workbook, dadosSheet, '📋 Dados');
  }

  // ---- ABA 3: Observações ----
  if (options.incluirObservacoes && data.observacoes) {
    const obsSheet = XLSX.utils.aoa_to_sheet([
      ['OBSERVAÇÕES'],
      [''],
      [data.observacoes],
    ]);
    obsSheet['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, obsSheet, '📝 Observações');
  }

  // Gerar arquivo
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

// ==================== CSV EXPORT ====================

export const gerarCSV = (data: ExportData): Blob => {
  const rows = [data.colunas, ...data.dados];
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell);
          // Escapar aspas e envolver em aspas se necessário
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');

  // Adicionar BOM para UTF-8
  const bom = '\uFEFF';
  return new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
};

// ==================== DOWNLOAD HELPER ====================

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ==================== EXPORT HANDLER ====================

export interface ExportReportMetadata {
  reportSubtype?: string;
  totalRecords?: number;
  totalValue?: number;
  generatedBy?: string;
  saveToHistory?: boolean;
}

export const exportarRelatorio = async (
  data: ExportData,
  options: ExportOptions,
  nomeArquivo: string,
  logoBase64?: string,
  metadata?: ExportReportMetadata
): Promise<void> => {
  const dataAtual = format(new Date(), 'yyyy-MM-dd');
  const nomeCompleto = `${nomeArquivo}-${dataAtual}`;
  const shouldSave = metadata?.saveToHistory !== false; // Default to true

  switch (options.formato) {
    case 'pdf': {
      const pdfBlob = await gerarPDF(data, options, logoBase64);
      downloadBlob(pdfBlob, `${nomeCompleto}.pdf`);
      
      // Save to history if enabled
      if (shouldSave) {
        const reportParams: ReportSaveParams = {
          report_type: getReportCategory(metadata?.reportSubtype || nomeArquivo),
          report_subtype: metadata?.reportSubtype || nomeArquivo,
          title: data.titulo,
          date_start: options.periodoInicio,
          date_end: options.periodoFim,
          generated_by: metadata?.generatedBy || 'sistema',
          total_records: metadata?.totalRecords || data.dados.length,
          total_value: metadata?.totalValue || 0,
          filters_applied: {
            formato: options.formato,
            orientacao: options.orientacao,
            incluirResumo: options.incluirResumo,
            incluirDetalhes: options.incluirDetalhes,
          },
        };
        
        // Save async - don't block the download
        saveReportWithPdf(reportParams, pdfBlob).then(result => {
          if (result.success) {
            console.log('[Export] Report saved to history:', result.reportId);
          }
        });
      }
      break;
    }
    case 'excel': {
      const excelBlob = gerarExcel(data, options);
      downloadBlob(excelBlob, `${nomeCompleto}.xlsx`);
      break;
    }
    case 'csv': {
      const csvBlob = gerarCSV(data);
      downloadBlob(csvBlob, `${nomeCompleto}.csv`);
      break;
    }
  }
};
