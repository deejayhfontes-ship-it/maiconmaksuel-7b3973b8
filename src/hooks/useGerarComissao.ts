import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para gerar automaticamente registros de comissão
 * ao fechar uma comanda/atendimento.
 *
 * Hierarquia de prioridade do percentual (serviços):
 * 1. servico_comissao_profissional.percentual  (% individual do profissional naquele serviço)
 * 2. servicos.comissao_padrao                  (% global do serviço)
 * 3. profissionais.comissao_servicos           (% padrão do profissional para serviços)
 *
 * Para produtos:
 * 1. profissionais.comissao_produtos            (% padrão do profissional para produtos)
 *
 * Respeita configuracoes_rh:
 * - regra_comissao_base: 'valor_bruto' | 'valor_liquido'
 * - arredondamento_comissao: 'centavos' | 'reais' | 'dezena'
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

function aplicarArredondamento(valor: number, regra: string): number {
  switch (regra) {
    case "reais":
      return Math.round(valor);
    case "dezena":
      return Math.round(valor / 10) * 10;
    case "centavos":
    default:
      return Number(valor.toFixed(2));
  }
}

export function useGerarComissao() {
  const gerarComissoesDaComanda = useCallback(
    async (params: {
      comandaId: string;
      profissionalId: string;
      itens: Array<{
        servico_id: string | null;
        produto_id?: string | null;
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

      if (!profissionalId) {
        return { sucesso: false, geradas: 0, ignoradas: 0, erros: ["profissional_id não informado"], avisos: [] };
      }
      if (itens.length === 0) {
        return { sucesso: false, geradas: 0, ignoradas: 0, erros: ["Nenhum item enviado para geração de comissão"], avisos: [] };
      }

      try {
        // 1. Buscar dados do profissional
        const { data: profData, error: profError } = await supabase
          .from("profissionais")
          .select("id, comissao_servicos, comissao_padrao, comissao_produtos")
          .eq("id", profissionalId)
          .single();

        if (profError || !profData) {
          return { sucesso: false, geradas: 0, ignoradas: 0, erros: [`Profissional ${profissionalId} não encontrado: ${profError?.message}`], avisos: [] };
        }

        const profRow = profData as Record<string, unknown>;
        const comissaoProfServicos = Number(profRow?.comissao_servicos ?? profRow?.comissao_padrao ?? 0);
        const comissaoProfProdutos = Number(profRow?.comissao_produtos ?? 0);

        // 2. Buscar config RH (regra comissão base + arredondamento)
        let regraBase = "valor_liquido";
        let regraArredondamento = "centavos";

        const { data: rhConfig } = await db
          .from("configuracoes_rh")
          .select("regra_comissao_base, arredondamento_comissao")
          .limit(1)
          .maybeSingle();

        if (rhConfig) {
          regraBase = rhConfig.regra_comissao_base || "valor_liquido";
          regraArredondamento = rhConfig.arredondamento_comissao || "centavos";
        }

        // 3. Para cada item, resolver % pela hierarquia e calcular
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
          if (item.gera_comissao === false) {
            ignoradas++;
            avisos.push(`Item ${item.nome_servico ?? item.servico_id} marcado como não gera comissão`);
            continue;
          }

          if (item.valor <= 0) {
            ignoradas++;
            erros.push(`Item "${item.nome_servico ?? item.servico_id}" com valor ${item.valor} — possível inconsistência`);
            console.error(`[useGerarComissao] ❌ Item com valor ${item.valor}:`, {
              servico_id: item.servico_id,
              nome: item.nome_servico,
              comandaId,
              profissionalId,
            });
            continue;
          }

          const isProduto = !!item.produto_id && !item.servico_id;

          // Determinar valor base conforme regra RH
          const descontoItem = Number(item.desconto_aplicado ?? 0);
          const valorLiquido = item.valor;
          const valorBruto = valorLiquido + descontoItem;
          const valorBase = regraBase === "valor_bruto" ? valorBruto : valorLiquido;

          // Resolver percentual
          let percentual: number;

          if (isProduto) {
            percentual = comissaoProfProdutos;
          } else {
            percentual = comissaoProfServicos;

            if (!item.servico_id) {
              avisos.push(`Item sem servico_id — usando % padrão do profissional (${comissaoProfServicos}%)`);
            }

            if (item.servico_id) {
              const { data: servicoData } = await supabase
                .from("servicos")
                .select("comissao_padrao, gera_comissao")
                .eq("id", item.servico_id)
                .single();

              const servicoRow = servicoData as Record<string, unknown> | null;

              if (servicoRow) {
                if (servicoRow.gera_comissao === false) {
                  ignoradas++;
                  avisos.push(`Serviço "${item.nome_servico}" tem gera_comissao=false`);
                  continue;
                }

                if (servicoRow.comissao_padrao !== null && servicoRow.comissao_padrao !== undefined) {
                  percentual = Number(servicoRow.comissao_padrao);
                }
              }

              // Prioridade 1: % individual do profissional naquele serviço
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
          }

          if (percentual <= 0) {
            avisos.push(`${isProduto ? "Produto" : "Serviço"} "${item.nome_servico}" sem % de comissão configurado (0%)`);
          }

          const valorComissao = aplicarArredondamento((valorBase * percentual) / 100, regraArredondamento);

          registros.push({
            profissional_id: profissionalId,
            atendimento_id: comandaId,
            servico_id: item.servico_id,
            valor_servico: valorBase,
            percentual,
            valor_comissao: valorComissao,
            desconto_aplicado: Number(descontoItem.toFixed(2)),
            status: "pendente",
            periodo_ref: periodoRef ?? new Date().toISOString().slice(0, 7),
            servico_nome: item.nome_servico ?? null,
          });
        }

        if (registros.length === 0) {
          if (erros.length > 0) {
            return { sucesso: false, geradas: 0, ignoradas, erros, avisos };
          }
          return { sucesso: true, geradas: 0, ignoradas, erros, avisos };
        }

        // 4. Verifica duplicata por profissional+comanda
        const { data: existenteProf } = await db
          .from("comissoes_registro")
          .select("id, status")
          .eq("atendimento_id", comandaId)
          .eq("profissional_id", profissionalId)
          .not("status", "in", "(cancelado,estornado)");

        if (existenteProf && existenteProf.length > 0) {
          const { data: comandaStatus } = await supabase
            .from("atendimentos")
            .select("status")
            .eq("id", comandaId)
            .maybeSingle();

          if (comandaStatus?.status === "reaberta") {
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

        console.log("[useGerarComissao] 📊 Preparando inserção:", {
          comandaId,
          profissionalId,
          regraBase,
          regraArredondamento,
          totalRegistros: registros.length,
          ignoradas,
          registros: registros.map(r => ({
            servico: r.servico_nome,
            valor_servico: r.valor_servico,
            percentual: r.percentual,
            valor_comissao: r.valor_comissao,
          })),
        });

        const { error } = await db
          .from("comissoes_registro")
          .insert(registros);

        if (error) {
          console.error("[useGerarComissao] ❌ Erro ao inserir comissões:", error);
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
