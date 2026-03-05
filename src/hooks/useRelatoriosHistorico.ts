import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ReportCategory = 
  | 'vendas' 
  | 'clientes' 
  | 'profissionais' 
  | 'estoque' 
  | 'financeiro' 
  | 'crediario' 
  | 'caixa' 
  | 'consolidado';

export interface RelatorioGerado {
  id: string;
  report_type: ReportCategory;
  report_subtype: string;
  title: string;
  date_start: string | null;
  date_end: string | null;
  generated_at: string;
  generated_by: string;
  filters_applied: Record<string, unknown>;
  total_records: number;
  total_value: number;
  pdf_path: string | null;
  pdf_url: string | null;
  status: 'generated' | 'failed' | 'pending_sync';
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveReportParams {
  report_type: ReportCategory;
  report_subtype: string;
  title: string;
  date_start?: Date | null;
  date_end?: Date | null;
  generated_by?: string;
  filters_applied?: Record<string, unknown>;
  total_records?: number;
  total_value?: number;
  pdfBlob?: Blob;
}

const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  vendas: 'Vendas',
  clientes: 'Clientes',
  profissionais: 'Profissionais',
  estoque: 'Estoque',
  financeiro: 'Financeiro',
  crediario: 'Crediário',
  caixa: 'Caixa',
  consolidado: 'Consolidado',
};

export function useRelatoriosHistorico() {
  const [relatorios, setRelatorios] = useState<RelatorioGerado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all reports
  const fetchRelatorios = useCallback(async (filters?: {
    category?: ReportCategory;
    dateStart?: Date;
    dateEnd?: Date;
    search?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('relatorios_gerados')
        .select('*')
        .order('generated_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('report_type', filters.category);
      }

      if (filters?.dateStart) {
        query = query.gte('generated_at', filters.dateStart.toISOString());
      }

      if (filters?.dateEnd) {
        query = query.lte('generated_at', filters.dateEnd.toISOString());
      }

      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Cast the data properly
      const typedData = (data || []).map(item => ({
        ...item,
        report_type: item.report_type as ReportCategory,
        status: item.status as 'generated' | 'failed' | 'pending_sync',
        filters_applied: (item.filters_applied || {}) as Record<string, unknown>,
      })) as RelatorioGerado[];

      setRelatorios(typedData);
    } catch (err) {
      console.error('Erro ao buscar relatórios:', err);
      setError('Erro ao carregar histórico de relatórios');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save a new report with optional PDF
  const saveRelatorio = useCallback(async (params: SaveReportParams): Promise<RelatorioGerado | null> => {
    try {
      let pdfPath: string | null = null;
      let pdfUrl: string | null = null;

      // Upload PDF if provided
      if (params.pdfBlob) {
        const timestamp = Date.now();
        const sanitizedTitle = params.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const filename = `${sanitizedTitle}-${timestamp}.pdf`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('relatorios-pdfs')
          .upload(filename, params.pdfBlob, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadError) {
          console.error('Erro no upload do PDF:', uploadError);
          // Continue without PDF
        } else {
          pdfPath = uploadData.path;
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('relatorios-pdfs')
            .getPublicUrl(pdfPath);
          
          pdfUrl = urlData.publicUrl;
        }
      }

      // Insert report metadata - cast report_type since the enum may not be in generated types yet
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
        .select()
        .single();

      if (insertError) throw insertError;

      // Cast the response
      const typedData = {
        ...data,
        report_type: data.report_type as ReportCategory,
        status: data.status as 'generated' | 'failed' | 'pending_sync',
        filters_applied: (data.filters_applied || {}) as Record<string, unknown>,
      } as RelatorioGerado;

      // Update local state
      setRelatorios(prev => [typedData, ...prev]);

      return typedData;
    } catch (err) {
      console.error('Erro ao salvar relatório:', err);
      toast.error('Erro ao salvar histórico do relatório');
      return null;
    }
  }, []);

  // Delete a report
  const deleteRelatorio = useCallback(async (id: string) => {
    try {
      // Find the report to get PDF path
      const report = relatorios.find(r => r.id === id);
      
      // Delete PDF from storage if exists
      if (report?.pdf_path) {
        await supabase.storage
          .from('relatorios-pdfs')
          .remove([report.pdf_path]);
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('relatorios_gerados')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Update local state
      setRelatorios(prev => prev.filter(r => r.id !== id));
      
      toast.success('Relatório excluído com sucesso');
    } catch (err) {
      console.error('Erro ao excluir relatório:', err);
      toast.error('Erro ao excluir relatório');
    }
  }, [relatorios]);

  // Download PDF from storage
  const downloadPdf = useCallback(async (relatorio: RelatorioGerado) => {
    if (!relatorio.pdf_url) {
      toast.error('PDF não disponível para este relatório');
      return;
    }

    try {
      // Open PDF in new tab or trigger download
      window.open(relatorio.pdf_url, '_blank');
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      toast.error('Erro ao baixar PDF');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRelatorios();
  }, [fetchRelatorios]);

  return {
    relatorios,
    loading,
    error,
    fetchRelatorios,
    saveRelatorio,
    deleteRelatorio,
    downloadPdf,
    categoryLabels: REPORT_CATEGORY_LABELS,
  };
}
