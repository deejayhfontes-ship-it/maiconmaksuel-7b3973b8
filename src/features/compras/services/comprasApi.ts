import { supabase } from "@/integrations/supabase/client";
import { ImportNfeResponse, ProcessarEntradaPayload } from "../types/nfe.types";

export const comprasApi = {
  // Chamada para a Edge Function de parse de XML
  async importarXml(file: File): Promise<ImportNfeResponse> {
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const xmlContent = e.target?.result as string;
          
          const { data, error } = await supabase.functions.invoke('importar-nfe-xml', {
            body: { xml: xmlContent }
          });

          if (error) {
            throw new Error(error.message || "Erro ao conectar com o servidor.");
          }

          if (!data.success) {
            throw new Error(data.error || "Erro desconhecido ao processar o XML.");
          }

          resolve(data as ImportNfeResponse);
        } catch (err: any) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo selecionado."));
      reader.readAsText(file);
    });
  },

  // Chamada da RPC transacional
  async processarEntrada(payload: ProcessarEntradaPayload) {
    const { data, error } = await supabase.rpc('processar_entrada_nfe', {
      payload: payload as any // Casting necessário dependendo de como as types foram geradas
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data && typeof data === 'object' && 'success' in data) {
      const response = data as { success: boolean; error?: string };
      if (!response.success) {
        throw new Error(response.error || "Erro ao processar entrada");
      }
      return data;
    }

    return data;
  },

  // Busca do histórico de notas importadas
  async getHistoricoEntradas() {
    const { data, error } = await supabase
      .from('notas_fiscais_entrada')
      .select(`
        id,
        chave_acesso,
        numero,
        data_emissao,
        data_entrada,
        valor_total,
        status,
        fornecedores (
          razao_social,
          nome_fantasia,
          documento
        )
      `)
      .order('data_entrada', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
};
