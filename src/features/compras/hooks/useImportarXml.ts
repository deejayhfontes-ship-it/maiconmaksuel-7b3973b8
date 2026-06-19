import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NfeParseResult } from "../types/nfe.types";

export function useImportarXml() {
  const [isUploading, setIsUploading] = useState(false);

  const processarXml = async (file: File): Promise<NfeParseResult | null> => {
    setIsUploading(true);
    try {
      if (file.type !== "text/xml" && !file.name.toLowerCase().endsWith(".xml")) {
        throw new Error("Formato inválido. Selecione um arquivo XML.");
      }

      // 1. Ler o conteúdo do arquivo
      const xmlString = await file.text();

      // 2. Chamar a Edge Function para fazer o parse seguro
      const { data, error } = await supabase.functions.invoke('importar-nfe-xml', {
        body: { xml: xmlString }
      });

      if (error) {
        throw new Error(error.message || "Erro ao processar o XML na nuvem.");
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Erro desconhecido ao ler a NFe.");
      }

      const result = data.data as NfeParseResult;

      // 3. (Opcional) Poderíamos verificar duplicidade no banco aqui mesmo,
      // mas a Edge Function já pode ter feito isso ou faremos no momento de salvar.
      // O hook apenas retorna os dados prontos para a tela de conferência.

      toast.success(`Nota de ${result.fornecedor.nome} lida com sucesso!`);
      return result;

    } catch (err: any) {
      console.error("Erro importando XML:", err);
      toast.error(err.message || "Falha ao processar arquivo XML.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { processarXml, isUploading };
}
