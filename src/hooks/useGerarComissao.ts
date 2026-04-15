import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para gerar automaticamente registros de comissão
 * ao fechar uma comanda/atendimento.
 *
 * Hierarquia de prioridade do percentual:
 * 1. servico_comissao_profissional.percentual  (% individual do profissional naquele serviço)
 * 2. servicos.comissao_padrao                  (% global do serviço)
 * 3. profissionais.comissao_servicos           (% padrão do profissional para serviços)
 * 4. 0% fallback
 */
// Usamos supabase como any para tabelas que ainda não estão
// nos tipos gerados automaticamente (ex: comissoes_registro, servico_comissao_profissional)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useGerarComissao() {
  const gerarComissoesDaComanda = useCallback(
    async (params: {
      comandaId: string;
      profissionalId: string;
      itens: Array<{
        servico_id: string | null;
        nome_servico?: string;
        valor: number;
        gera_comissao?: boolean;
      }>;
      periodoRef?: string;
      /** @deprecated — não tem mais efeito; dedup agora é sempre por profissional+comanda */
      forcarGeracao?: boolean;
    }) => {
      const { comandaId, profissionalId, itens, periodoRef } = params;

      if (!profissionalId || itens.length === 0) return;

      try {
        // 1. Buscar dados do profissional (fallback de % padrão)
        const { data: profData } = await supabase
          .from("profissionais")
          .select("id, comissao_servicos, comissao_padrao")
          .eq("id", profissionalId)
          .single();

        const profRow = profData as Record<string, unknown> | null;
        const comissaoProfissional =
          Number(profRow?.comissao_servicos ?? profRow?.comissao_padrao ?? 0);

        // 2. Para cada item que gera comissão, resolver % pela hierarquia
        const registros: Array<{
          profissional_id: string;
          atendimento_id: string;
          servico_id: string | null;
          valor_servico: number;
          percentual: number;
          valor_comissao: number;
          status: string;
          periodo_ref: string | null;
          servico_nome: string | null;
        }> = [];

        for (const item of itens) {
          // Pula itens que não geram comissão
          if (item.gera_comissao === false) continue;
          if (item.valor <= 0) continue;

          // Começa com o % padrão do profissional (prioridade 3)
          let percentual = comissaoProfissional;

          if (item.servico_id) {
            // Busca dados do serviço (prioridade 2 e verificação de flag)
            const { data: servicoData } = await supabase
              .from("servicos")
              .select("comissao_padrao, gera_comissao")
              .eq("id", item.servico_id)
              .single();

            const servicoRow = servicoData as Record<string, unknown> | null;

            if (servicoRow) {
              // Respeita flag gera_comissao do serviço
              if (servicoRow.gera_comissao === false) continue;

              // Prioridade 2: % global do serviço
              if (
                servicoRow.comissao_padrao !== null &&
                servicoRow.comissao_padrao !== undefined
              ) {
                percentual = Number(servicoRow.comissao_padrao);
              }
            }

            // Prioridade 1: % individual do profissional naquele serviço específico
            const { data: scpData } = await db
              .from("servico_comissao_profissional")
              .select("percentual")
              .eq("servico_id", item.servico_id)
              .eq("profissional_id", profissionalId)
              .maybeSingle();

            if (scpData && scpData.percentual !== null && scpData.percentual !== undefined) {
              percentual = Number(scpData.percentual);
            }
          }

          const valorComissao = (item.valor * percentual) / 100;

          registros.push({
            profissional_id: profissionalId,
            atendimento_id: comandaId,
            servico_id: item.servico_id,
            valor_servico: item.valor,
            percentual,
            valor_comissao: Number(valorComissao.toFixed(2)),
            status: "pendente",
            periodo_ref:
              periodoRef ?? new Date().toISOString().slice(0, 7), // "YYYY-MM"
            servico_nome: item.nome_servico ?? null,
          });
        }

        if (registros.length === 0) return;

        // 3. Verifica duplicata por profissional+comanda (não por comanda inteira)
        // Isso permite que múltiplos profissionais na mesma comanda gerem comissões
        // independentemente um do outro.
        const { data: existenteProf } = await db
          .from("comissoes_registro")
          .select("id")
          .eq("atendimento_id", comandaId)
          .eq("profissional_id", profissionalId);

        if (existenteProf && existenteProf.length > 0) {
          // Verifica se a comanda foi reaberta — nesse caso regenera
          const { data: comandaStatus } = await supabase
            .from("atendimentos")
            .select("status")
            .eq("id", comandaId)
            .maybeSingle();

          if (comandaStatus?.status === "reaberta") {
            await db
              .from("comissoes_registro")
              .delete()
              .eq("atendimento_id", comandaId)
              .eq("profissional_id", profissionalId);
            console.log("[useGerarComissao] Reaberta — comissões do profissional removidas para recálculo.");
          } else {
            console.log("[useGerarComissao] Comissão já existe para este profissional nessa comanda, pulando.");
            return;
          }
        }

        // 4. Insere os registros
        const { error } = await db
          .from("comissoes_registro")
          .insert(registros);

        if (error) {
          console.error("[useGerarComissao] Erro ao inserir comissões:", error);
        } else {
          console.log(
            `[useGerarComissao] ✅ ${registros.length} comissão(ões) gerada(s) para comanda ${comandaId}`
          );
        }
      } catch (err) {
        console.error("[useGerarComissao] Erro inesperado:", err);
      }
    },
    []
  );

  return { gerarComissoesDaComanda };
}
