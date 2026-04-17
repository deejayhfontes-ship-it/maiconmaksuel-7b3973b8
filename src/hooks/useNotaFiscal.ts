import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tipos de resposta da Edge Function
interface NotaFiscalResponse {
  success: boolean;
  status?: string;
  numero?: number;
  chave_acesso?: string;
  protocolo?: string;
  provider_ref?: string;
  mensagem?: string;
  codigo?: string;
  pdf_url?: string;
  online?: boolean;
  data?: unknown;
  error?: string;
}

interface EmitirParams {
  nota_id: string;
  tipo: "nfe" | "nfce";
  cliente?: {
    nome?: string;
    cpf_cnpj?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
  itens: Array<{
    numero_item: number;
    codigo_produto: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    icms_origem?: string;
    icms_situacao_tributaria?: string;
  }>;
  pagamento: {
    forma: string;
    valor: number;
  };
  valor_total: number;
  valor_desconto?: number;
  observacoes?: string;
}

// Função auxiliar genérica para chamar Edge Functions
async function invokeEdgeFunction(functionName: string, body: Record<string, unknown>): Promise<NotaFiscalResponse> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    console.error(`[${functionName.toUpperCase()}] Edge Function error:`, error);
    throw new Error(error.message || "Erro ao comunicar com o servidor fiscal");
  }

  return data as NotaFiscalResponse;
}

// Atalho para a Edge Function NF-e/NFC-e
async function invokeNotaFiscal(body: Record<string, unknown>): Promise<NotaFiscalResponse> {
  return invokeEdgeFunction("nota-fiscal", body);
}

/**
 * Hook para operações de Nota Fiscal via Edge Function (Focus NFe)
 */
export function useNotaFiscalService() {
  /**
   * Emitir NF-e ou NFC-e
   */
  async function emitir(params: EmitirParams): Promise<NotaFiscalResponse> {
    try {
      const resp = await invokeNotaFiscal({
        acao: "emitir",
        ...params,
      });

      if (resp.success) {
        if (resp.status === "autorizada") {
          toast.success(`Nota ${resp.numero} autorizada! Protocolo: ${resp.protocolo}`);
        } else if (resp.status === "processando") {
          toast.info("Nota em processamento. Aguarde alguns segundos.");
        }
      } else {
        toast.error(`Nota rejeitada: ${resp.codigo} - ${resp.mensagem}`);
      }

      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro na emissão: ${msg}`);
      throw e;
    }
  }

  /**
   * Cancelar nota autorizada
   */
  async function cancelar(notaId: string, motivo: string): Promise<NotaFiscalResponse> {
    try {
      const resp = await invokeNotaFiscal({
        acao: "cancelar",
        nota_id: notaId,
        motivo,
      });

      if (resp.success) {
        toast.success("Nota cancelada com sucesso na SEFAZ!");
      } else {
        toast.error(`Erro ao cancelar: ${resp.mensagem}`);
      }

      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro no cancelamento: ${msg}`);
      throw e;
    }
  }

  /**
   * Carta de Correção (CC-e)
   */
  async function cartaCorrecao(notaId: string, textoCorrecao: string): Promise<NotaFiscalResponse> {
    try {
      const resp = await invokeNotaFiscal({
        acao: "corrigir",
        nota_id: notaId,
        texto_correcao: textoCorrecao,
      });

      if (resp.success) {
        toast.success("Carta de correção enviada com sucesso!");
      } else {
        toast.error(`Erro na CC-e: ${resp.mensagem}`);
      }

      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro na carta de correção: ${msg}`);
      throw e;
    }
  }

  /**
   * Inutilizar numeração
   */
  async function inutilizar(params: {
    modelo: string;
    serie: number;
    numero_inicial: number;
    numero_final: number;
    justificativa: string;
  }): Promise<NotaFiscalResponse> {
    try {
      const resp = await invokeNotaFiscal({
        acao: "inutilizar",
        ...params,
      });

      if (resp.success) {
        toast.success("Numeração inutilizada na SEFAZ com sucesso!");
      } else {
        toast.error(`Erro ao inutilizar: ${resp.mensagem}`);
      }

      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro na inutilização: ${msg}`);
      throw e;
    }
  }

  /**
   * Consultar status de uma nota
   */
  async function consultar(notaId: string): Promise<NotaFiscalResponse> {
    try {
      return await invokeNotaFiscal({
        acao: "consultar",
        nota_id: notaId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro na consulta: ${msg}`);
      throw e;
    }
  }

  /**
   * Verificar status SEFAZ
   */
  async function statusSefaz(): Promise<{ online: boolean; status?: string; motivo?: string }> {
    try {
      const resp = await invokeNotaFiscal({ acao: "status_sefaz" });
      const respData = resp.data as Record<string, string> | undefined;
      return {
        online: resp.online || false,
        status: respData?.status_sefaz,
        motivo: respData?.motivo,
      };
    } catch {
      return { online: false };
    }
  }

  /**
   * Baixar DANFE (PDF)
   */
  async function baixarDanfe(notaId: string): Promise<string | null> {
    try {
      const resp = await invokeNotaFiscal({
        acao: "danfe",
        nota_id: notaId,
      });

      if (resp.success && resp.pdf_url) {
        // Abrir PDF em nova aba
        window.open(resp.pdf_url, "_blank");
        return resp.pdf_url;
      } else {
        toast.error("Não foi possível gerar o DANFE");
        return null;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro ao gerar DANFE: ${msg}`);
      return null;
    }
  }

  /**
   * Reenviar nota rejeitada
   */
  async function reenviar(notaId: string): Promise<NotaFiscalResponse> {
    try {
      const resp = await invokeNotaFiscal({
        acao: "consultar",
        nota_id: notaId,
      });

      // Se a nota já foi autorizada no provider, atualizar status
      if (resp.success && resp.data) {
        toast.success("Status atualizado!");
      }

      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro no reenvio: ${msg}`);
      throw e;
    }
  }

  // ===== NFS-e =====

  /**
   * Emitir NFS-e
   */
  async function emitirNfse(params: {
    nota_id: string;
    tomador?: {
      nome?: string;
      cpf_cnpj?: string;
      email?: string;
      endereco?: string;
      bairro?: string;
      cidade?: string;
      uf?: string;
      cep?: string;
    };
    codigo_servico_lc116?: string;
    discriminacao?: string;
    valor_total: number;
    aliquota_iss?: number;
  }): Promise<NotaFiscalResponse> {
    try {
      const resp = await invokeEdgeFunction("emitir-nfse", {
        acao: "emitir",
        ...params,
      });

      if (resp.success) {
        toast.success("NFS-e emitida com sucesso!");
      } else {
        toast.error(`NFS-e rejeitada: ${resp.codigo} - ${resp.mensagem}`);
      }

      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro na emissão NFS-e: ${msg}`);
      throw e;
    }
  }

  /**
   * Cancelar NFS-e
   */
  async function cancelarNfse(notaId: string, motivo: string): Promise<NotaFiscalResponse> {
    try {
      const resp = await invokeEdgeFunction("emitir-nfse", {
        acao: "cancelar",
        nota_id: notaId,
        motivo,
      });

      if (resp.success) {
        toast.success("NFS-e cancelada com sucesso!");
      } else {
        toast.error(`Erro ao cancelar NFS-e: ${resp.mensagem}`);
      }

      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Erro no cancelamento NFS-e: ${msg}`);
      throw e;
    }
  }

  /**
   * Buscar logs fiscais de uma nota
   */
  async function buscarLogs(notaId: string) {
    const { data, error } = await supabase
      .from("fiscal_logs" as string)
      .select("*")
      .eq("nota_fiscal_id", notaId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[FISCAL_LOGS] Erro:", error);
      return [];
    }

    return data || [];
  }

  return {
    emitir,
    cancelar,
    cartaCorrecao,
    inutilizar,
    consultar,
    statusSefaz,
    baixarDanfe,
    reenviar,
    emitirNfse,
    cancelarNfse,
    buscarLogs,
  };
}
