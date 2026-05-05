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
 * 4. ERRO — sem percentual configurado
 *
 * RETORNO EXPLÍCITO:
 * { sucesso, geradas, ignoradas, erros, avisos }
 * O chamador DEVE tratar sucesso=false como erro real.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ComissaoResultado {
  sucesso: boolean;
  geradas: number;
  ignoradas: number;
  erros: string[];
  avisos: string[];
}

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
        desconto_aplicado?: number;
      }>;
      periodoRef?: string;
      /** @deprecated — não tem mais efeito; dedup agora é sempre por profissional+comanda */
      forcarGeracao?: boolean;
    }): Promise<ComissaoResultado> => {
      const { comandaId, profissionalId, itens, periodoRef } = params;
      const erros: string[] = [];
      const avisos: string[] = [];
      let ignoradas = 0;

      // Validação de entrada
      if (!profissionalId) {
        return { sucesso: false, geradas: 0, ignoradas: 0, erros: ["profissional_id não informado"], avisos: [] };
      }
      if (itens.length === 0) {
        return { sucesso: false, geradas: 0, ignoradas: 0, erros: ["Nenhum item enviado para geração de comissão"], avisos: [] };
      }

      try {
        // 1. Buscar dados do profissional (fallback de % padrão)
        const { data: profData, error: profError } = await supabase
          .from("profissionais")
          .select("id, comissao_servicos, comissao_padrao")
          .eq("id", profissionalId)
          .single();

        if (profError || !profData) {
          return { sucesso: false, geradas: 0, ignoradas: 0, erros: [`Profissional ${profissionalId} não encontrado: ${profError?.message}`], avisos: [] };
        }

        const profRow = profData as Record<string, unknown>;
        const comissaoProfissional = Number(profRow?.comissao_servicos ?? profRow?.comissao_padrao ?? 0);

        // 2. Para cada item, resolver % pela hierarquia e validar
        const registros: Array<{
          profissional_id: string;
          atendimento_id: string;
          servico_id: string | null;
          valor_servico: number;
          percentual: number;
          valor_comissao: number;
          desconto_aplicado: number;
          status: string;
          periodo_ref: string | null;
          servico_nome: string | null;
        }> = [];

        for (const item of itens) {
          // A) Item marcado como não gera comissão — ignorar legitimamente
          if (item.gera_comissao === false) {
            ignoradas++;
            avisos.push(`Item ${item.nome_servico ?? item.servico_id} marcado como não gera comissão`);
            continue;
          }

          // B) Valor zero — ANALISAR o motivo
          if (item.valor <= 0) {
            ignoradas++;
            // Diferente de antes: NÃO continuar silenciosamente.
            // Registrar como ERRO se valor deveria ser positivo
            erros.push(`Item "${item.nome_servico ?? item.servico_id}" com valor ${item.valor} — possível inconsistência`);
            console.error(`[useGerarComissao] ❌ Item com valor ${item.valor}:`, {
              servico_id: item.servico_id,
              nome: item.nome_servico,
              comandaId,
              profissionalId,
            });
            continue;
          }

          // C) Sem servico_id — avisar
          if (!item.servico_id) {
            avisos.push(`Item sem servico_id — usando % padrão do profissional (${comissaoProfissional}%)`);
          }

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
              if (servicoRow.gera_comissao === false) {
                ignoradas++;
                avisos.push(`Serviço "${item.nome_servico}" tem gera_comissao=false`);
                continue;
              }

              // Prioridade 2: % global do serviço
              if (servicoRow.comissao_padrao !== null && servicoRow.comissao_padrao !== undefined) {
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

          // D) Sem percentual definido em nenhum nível
          if (percentual <= 0) {
            avisos.push(`Serviço "${item.nome_servico}" sem % de comissão configurado (0%)`);
            // Continua com 0% — gera registro com valor_comissao = 0 para rastreabilidade
          }

          const valorComissao = (item.valor * percentual) / 100;

          registros.push({
            profissional_id: profissionalId,
            atendimento_id: comandaId,
            servico_id: item.servico_id,
            valor_servico: item.valor,
            percentual,
            valor_comissao: Number(valorComissao.toFixed(2)),
            desconto_aplicado: Number((item.desconto_aplicado ?? 0).toFixed(2)),
            status: "pendente",
            periodo_ref: periodoRef ?? new Date().toISOString().slice(0, 7),
            servico_nome: item.nome_servico ?? null,
          });
        }

        if (registros.length === 0) {
          // Se ignorou tudo E teve erros, é falha
          if (erros.length > 0) {
            return { sucesso: false, geradas: 0, ignoradas, erros, avisos };
          }
          // Se ignorou tudo mas sem erros, é legítimo (ex: todos gera_comissao=false)
          return { sucesso: true, geradas: 0, ignoradas, erros, avisos };
        }

        // 3. Verifica duplicata por profissional+comanda
        const { data: existenteProf } = await db
          .from("comissoes_registro")
          .select("id, status")
          .eq("atendimento_id", comandaId)
          .eq("profissional_id", profissionalId)
          .not("status", "in", "(cancelado,estornado)");

        if (existenteProf && existenteProf.length > 0) {
          // Verifica se a comanda foi reaberta — nesse caso regenera
          const { data: comandaStatus } = await supabase
            .from("atendimentos")
            .select("status")
            .eq("id", comandaId)
            .maybeSingle();

          if (comandaStatus?.status === "reaberta") {
            // Cancelar comissões anteriores (não deletar, manter histórico)
            await db
              .from("comissoes_registro")
              .update({ status: "estornado" })
              .eq("atendimento_id", comandaId)
              .eq("profissional_id", profissionalId)
              .not("status", "in", "(cancelado,estornado)");

            console.log("[useGerarComissao] Reaberta — comissões anteriores estornadas para recálculo.");
            avisos.push("Comissões anteriores estornadas (reabertura)");
          } else {
            avisos.push("Comissão já existe para este profissional nessa comanda — ignorando");
            return { sucesso: true, geradas: 0, ignoradas, erros, avisos };
          }
        }

        // 4. Log de auditoria antes de inserir
        console.log("[useGerarComissao] 📊 Preparando inserção:", {
          comandaId,
          profissionalId,
          totalRegistros: registros.length,
          ignoradas,
          registros: registros.map(r => ({
            servico: r.servico_nome,
            valor_servico: r.valor_servico,
            percentual: r.percentual,
            valor_comissao: r.valor_comissao,
          })),
        });

        // 5. Insere os registros
        const { error } = await db
          .from("comissoes_registro")
          .insert(registros);

        if (error) {
          console.error("[useGerarComissao] ❌ Erro ao inserir comissões:", error);
          // Tratar erro de constraint única como duplicidade
          if (error.message?.includes("idx_comissao_unica_ativa") || error.code === "23505") {
            return { sucesso: true, geradas: 0, ignoradas, erros: [], avisos: ["Comissão já existia (bloqueada por constraint)"] };
          }
          return { sucesso: false, geradas: 0, ignoradas, erros: [`Erro DB: ${error.message}`], avisos };
        }

        console.log(`[useGerarComissao] ✅ ${registros.length} comissão(ões) gerada(s) para comanda ${comandaId}`);
        return { sucesso: true, geradas: registros.length, ignoradas, erros, avisos };

      } catch (err) {
        console.error("[useGerarComissao] ❌ Erro inesperado:", err);
        return { sucesso: false, geradas: 0, ignoradas: 0, erros: [`Erro inesperado: ${String(err)}`], avisos: [] };
      }
    },
    []
  );

  return { gerarComissoesDaComanda };
}
