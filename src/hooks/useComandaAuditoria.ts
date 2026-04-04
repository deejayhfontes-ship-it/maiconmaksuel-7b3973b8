import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuditoriaRecord {
  id: string;
  atendimento_id: string;
  numero_comanda: number;
  acao: string;
  motivo: string;
  detalhes: Record<string, unknown> | null;
  usuario_nome: string | null;
  created_at: string;
}

export interface ComandaFechadaServico {
  id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  servico?: { nome: string } | null;
  profissional?: { nome: string } | null;
}

export interface ComandaFechadaPagamento {
  id: string;
  forma_pagamento: string;
  valor: number;
  parcelas?: number;
}

export interface ComandaFechada {
  id: string;
  numero_comanda: number;
  data_hora: string;
  status: string;
  subtotal: number;
  desconto: number;
  valor_final: number;
  cliente_id: string | null;
  observacoes: string | null;
  cliente?: { nome: string } | null;
  servicos?: ComandaFechadaServico[];
  pagamentos?: { forma_pagamento: string; valor: number }[];
}

export function useComandaAuditoria() {
  // --------------- Gravar auditoria ---------------
  const gravarAuditoria = useCallback(async (
    atendimentoId: string,
    numeroComanda: number,
    acao: string,
    motivo: string,
    detalhes?: Record<string, unknown>
  ) => {
    const usuarioNome = localStorage.getItem('usuario_nome') || 'Admin';
    const { error } = await supabase.from('atendimentos_auditoria').insert([{
      atendimento_id: atendimentoId,
      numero_comanda: numeroComanda,
      acao,
      motivo,
      detalhes: detalhes || null,
      usuario_nome: usuarioNome,
    }]);
    if (error) console.error('[Auditoria] Erro ao gravar:', error);
  }, []);

  // --------------- Reabrir comanda ---------------
  const reabrirComanda = useCallback(async (
    comanda: ComandaFechada,
    motivo: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Estornar movimentações do caixa
      const { data: caixaAberto } = await supabase
        .from('caixa')
        .select('id')
        .eq('status', 'aberto')
        .maybeSingle();

      if (caixaAberto) {
        const clienteNome = comanda.cliente?.nome || 'Cliente avulso';
        await supabase.from('caixa_movimentacoes').insert([{
          caixa_id: caixaAberto.id,
          tipo: 'saida',
          categoria: 'estorno',
          descricao: `ESTORNO — Comanda #${String(comanda.numero_comanda).padStart(3, '0')} - ${clienteNome} (${motivo})`,
          valor: comanda.valor_final,
          forma_pagamento: 'estorno',
          atendimento_id: comanda.id,
        }]);
      }

      // Mudar status para aberto
      const { error } = await supabase
        .from('atendimentos')
        .update({ status: 'aberto' })
        .eq('id', comanda.id);

      if (error) throw error;

      // Gravar auditoria
      await gravarAuditoria(comanda.id, comanda.numero_comanda, 'reaberta', motivo, {
        status_anterior: comanda.status,
        valor_final: comanda.valor_final,
        cliente: comanda.cliente?.nome || null,
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: msg };
    }
  }, [gravarAuditoria]);

  // --------------- Cancelar comanda fechada ---------------
  const cancelarComandaFechada = useCallback(async (
    comanda: ComandaFechada,
    motivo: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({ status: 'cancelado' })
        .eq('id', comanda.id);

      if (error) throw error;

      await gravarAuditoria(comanda.id, comanda.numero_comanda, 'cancelada', motivo, {
        status_anterior: comanda.status,
        valor_final: comanda.valor_final,
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: msg };
    }
  }, [gravarAuditoria]);

  // --------------- Buscar comandas fechadas ---------------
  const buscarComandasFechadas = useCallback(async (dias = 30): Promise<ComandaFechada[]> => {
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);

    const { data, error } = await supabase
      .from('atendimentos')
      .select(`
        *,
        cliente:clientes(nome),
        servicos:atendimento_servicos(
          id,
          quantidade,
          preco_unitario,
          subtotal,
          servico:servicos(nome),
          profissional:profissionais(nome)
        ),
        pagamentos(id, forma_pagamento, valor, parcelas)
      `)
      .in('status', ['fechado', 'finalizado', 'cancelado'])
      .gte('data_hora', desde.toISOString())
      .order('data_hora', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[Auditoria] Erro ao buscar fechadas:', error);
      return [];
    }
    return (data || []) as unknown as ComandaFechada[];

  }, []);

  // --------------- Buscar auditoria ---------------
  const buscarAuditoria = useCallback(async (filtros?: {
    atendimentoId?: string;
    dias?: number;
  }): Promise<AuditoriaRecord[]> => {
    let query = supabase
      .from('atendimentos_auditoria')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filtros?.atendimentoId) {
      query = query.eq('atendimento_id', filtros.atendimentoId);
    }

    if (filtros?.dias) {
      const desde = new Date();
      desde.setDate(desde.getDate() - filtros.dias);
      query = query.gte('created_at', desde.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Auditoria] Erro ao buscar registros:', error);
      return [];
    }
    return (data || []) as AuditoriaRecord[];
  }, []);

  return {
    gravarAuditoria,
    reabrirComanda,
    cancelarComandaFechada,
    buscarComandasFechadas,
    buscarAuditoria,
  };
}
