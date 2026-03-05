// Report Storage Service - handles saving reports with PDFs
import { supabase } from '@/integrations/supabase/client';
import type { ReportCategory } from '@/hooks/useRelatoriosHistorico';

export interface ReportSaveParams {
  report_type: ReportCategory;
  report_subtype: string;
  title: string;
  date_start?: Date | null;
  date_end?: Date | null;
  generated_by?: string;
  filters_applied?: Record<string, unknown>;
  total_records?: number;
  total_value?: number;
}

/**
 * Saves a report to the database and optionally uploads the PDF
 */
export async function saveReportWithPdf(
  params: ReportSaveParams,
  pdfBlob?: Blob
): Promise<{ success: boolean; reportId?: string; pdfUrl?: string; error?: string }> {
  try {
    let pdfPath: string | null = null;
    let pdfUrl: string | null = null;

    // Upload PDF if provided
    if (pdfBlob) {
      const timestamp = Date.now();
      const sanitizedTitle = params.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const filename = `${params.report_type}/${sanitizedTitle}-${timestamp}.pdf`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('relatorios-pdfs')
        .upload(filename, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('[ReportStorage] PDF upload failed:', uploadError);
        // Continue without PDF - don't fail the whole operation
      } else {
        pdfPath = uploadData.path;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('relatorios-pdfs')
          .getPublicUrl(pdfPath);

        pdfUrl = urlData.publicUrl;
      }
    }

    // Insert report metadata - cast types since the enum may not be in generated types yet
    const insertData = {
      report_type: params.report_type as string,
      report_subtype: params.report_subtype,
      title: params.title,
      date_start: params.date_start?.toISOString().split('T')[0] || null,
      date_end: params.date_end?.toISOString().split('T')[0] || null,
      generated_by: params.generated_by || 'sistema',
      filters_applied: params.filters_applied || {},
      total_records: params.total_records || 0,
      total_value: params.total_value || 0,
      pdf_path: pdfPath,
      pdf_url: pdfUrl,
      status: 'generated' as const,
      synced: true,
    };

    const { data, error: insertError } = await supabase
      .from('relatorios_gerados')
      .insert(insertData as any)
      .select('id')
      .single();

    if (insertError) {
      console.error('[ReportStorage] Database insert failed:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('[ReportStorage] Report saved successfully:', data.id);

    return {
      success: true,
      reportId: data.id,
      pdfUrl: pdfUrl || undefined,
    };
  } catch (err) {
    console.error('[ReportStorage] Unexpected error:', err);
    return { success: false, error: 'Erro inesperado ao salvar relatório' };
  }
}

/**
 * Maps common report types to categories
 */
export function getReportCategory(reportType: string): ReportCategory {
  const categoryMap: Record<string, ReportCategory> = {
    // Vendas
    'vendas-periodo': 'vendas',
    'vendas-profissional': 'vendas',
    'vendas-servico': 'vendas',
    'vendas-pagamento': 'vendas',
    'historico': 'vendas',
    'itens-vendidos': 'vendas',
    'ausentes': 'vendas',
    'clientes-lucro': 'vendas',
    'produtos-lucro': 'vendas',
    'lifetime-value': 'vendas',
    // Clientes
    'clientes-novos': 'clientes',
    'clientes-ativos': 'clientes',
    'clientes-inativos': 'clientes',
    'aniversariantes': 'clientes',
    // Profissionais
    'desempenho': 'profissionais',
    'comissoes': 'profissionais',
    'frequencia': 'profissionais',
    'servicos-lucro': 'profissionais',
    'vendas-prof': 'profissionais',
    'vales': 'profissionais',
    'valores-pagar': 'profissionais',
    'pagamentos': 'profissionais',
    // Estoque
    'mais-vendidos': 'estoque',
    'niveis-estoque': 'estoque',
    'margem-lucro': 'estoque',
    // Financeiro
    'dre': 'financeiro',
    'fluxo-caixa': 'financeiro',
    'contas-pagar': 'financeiro',
    'contas-receber': 'financeiro',
    'extrato-cartoes': 'financeiro',
    'lucro-bruto': 'financeiro',
    // Crediário
    'dividas-abertas': 'crediario',
    'dividas-pagar': 'crediario',
    'clientes-confianca': 'crediario',
    'vencimentos': 'crediario',
    // Caixa
    'caixas-fechados': 'caixa',
    'sangrias': 'caixa',
    'reforcos': 'caixa',
    // Consolidado
    'consolidado': 'consolidado',
    'geral': 'consolidado',
  };

  return categoryMap[reportType] || 'vendas';
}
