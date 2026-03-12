import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para gerar automaticamente registros de comissão
 * ao fechar uma comanda/atendimento.
 *
 * Lógica de prioridade do percentual:
 * 1. comissao_padrao do SERVIÇO (específico para aquele serviço)
 * 2. comissao_servicos do PROFISSIONAL (percentual geral do profissional)
 * 3. Fallback: 0%
 */
// Usamos supabase como any para tabelas que ainda não estão
// nos tipos gerados automaticamente (ex: comissoes_registro)
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
    }) => {
      const { comandaId, profissionalId, itens, periodoRef } = params;

      if (!profissionalId || itens.length === 0) return;

      try {
        // 1. Buscar dados do profissional (comissao_servicos = % padrão do profissional)
        const { data: profData } = await supabase
          .from("profissionais")
          .select("id, comissao_servicos, comissao_padrao")
          .eq("id", profissionalId)
          .single();

        const profRow = profData as Record<string, unknown> | null;
        const comissaoProfissional =
          Number(profRow?.comissao_servicos ?? profRow?.comissao_padrao ?? 0);

        // 2. Para cada item que gera comissão, buscar % do serviço (se houver)
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

          let percentual = comissaoProfissional;

          // Tenta pegar a % específica do serviço (comissao_padrao do serviço)
          if (item.servico_id) {
            const { data: servicoData } = await supabase
              .from("servicos")
              .select("comissao_padrao, gera_comissao")
              .eq("id", item.servico_id)
              .single();

            const servicoRow = servicoData as Record<string, unknown> | null;

            if (servicoRow) {
              // Respeita flag gera_comissao do serviço
              if (servicoRow.gera_comissao === false) continue;
              // Usa % do serviço se definido (>= 0)
              if (
                servicoRow.comissao_padrao !== null &&
                servicoRow.comissao_padrao !== undefined
              ) {
                percentual = Number(servicoRow.comissao_padrao);
              }
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

        // 3. Verifica se já existem registros para essa comanda (evita duplicatas)
        const { data: existentes } = await db
          .from("comissoes_registro")
          .select("id")
          .eq("atendimento_id", comandaId);

        if (existentes && existentes.length > 0) {
          console.log(
            "[useGerarComissao] Comissões já existem para essa comanda, pulando."
          );
          return;
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
