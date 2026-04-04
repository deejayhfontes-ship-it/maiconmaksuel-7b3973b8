import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type MotivoCategoriaAuditoria =
  | 'erro_lancamento'
  | 'solicitacao_cliente'
  | 'correcao_financeira'
  | 'desconto_aplicado'
  | 'item_errado'
  | 'outro';

export interface AuditoriaRecord {
  id: string;
  atendimento_id: string;
  numero_comanda: number;
  acao: string;
  motivo: string;
  motivo_categoria: MotivoCategoriaAuditoria | null;
  detalhes: Record<string, unknown> | null;
  snapshot_antes: Record<string, unknown> | null;
  snapshot_depois: Record<string, unknown> | null;
  status_anterior: string | null;
  status_novo: string | null;
  usuario_nome: string | null;
  usuario_id: string | null;
  created_at: string;
}

export interface ComandaFechadaServico {
  id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  servico_id?: string | null;
  profissional_id?: string | null;
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
  pagamentos?: ComandaFechadaPagamento[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: capturar snapshot completo da comanda
// ─────────────────────────────────────────────────────────────────────────────

async function capturarSnapshot(atendimentoId: string): Promise<Record<string, unknown>> {
  try {
    const { data: at } = await supabase
      .from('atendimentos')
      .select(`
        *,
        cliente:clientes(nome, celular),
        servicos:atendimento_servicos(
          id, quantidade, preco_unitario, subtotal,
          servico:servicos(nome),
          profissional:profissionais(nome)
        ),
        pagamentos(id, forma_pagamento, valor, parcelas)
      `)
      .eq('id', atendimentoId)
      .maybeSingle();

    return {
      capturado_em: new Date().toISOString(),
      atendimento: at || null,
    };
  } catch {
    return { capturado_em: new Date().toISOString(), erro: 'Falha ao capturar snapshot' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

export function useComandaAuditoria() {

  // ── Gravar entrada de auditoria ──────────────────────────────────────────
  const gravarAuditoria = useCallback(async (
    atendimentoId: string,
    numeroComanda: number,
    acao: string,
    motivo: string,
    opcoes?: {
      motivoCategoria?: MotivoCategoriaAuditoria;
      statusAnterior?: string;
      statusNovo?: string;
      snapshotAntes?: Record<string, unknown>;
      snapshotDepois?: Record<string, unknown>;
      detalhes?: Record<string, unknown>;
    }
  ) => {
    const usuarioNome = localStorage.getItem('usuario_nome') || 'Admin';
    const usuarioId   = localStorage.getItem('usuario_id')   || null;

    const registro: Record<string, unknown> = {
      atendimento_id:   atendimentoId,
      numero_comanda:   numeroComanda,
      acao,
      motivo,
      usuario_nome:     usuarioNome,
      usuario_id:       usuarioId,
      motivo_categoria: opcoes?.motivoCategoria ?? null,
      status_anterior:  opcoes?.statusAnterior  ?? null,
      status_novo:      opcoes?.statusNovo      ?? null,
      snapshot_antes:   opcoes?.snapshotAntes   ?? null,
      snapshot_depois:  opcoes?.snapshotDepois  ?? null,
      detalhes:         opcoes?.detalhes        ?? null,
    };

    const { error } = await supabase
      .from('atendimentos_auditoria')
      .insert([registro]);

    if (error) console.error('[Auditoria] Erro ao gravar:', error);
  }, []);

  // ── Reabrir comanda ──────────────────────────────────────────────────────
  const reabrirComanda = useCallback(async (
    comanda: ComandaFechada,
    motivo: string,
    motivoCategoria?: MotivoCategoriaAuditoria
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Capturar snapshot ANTES (estado atual — finalizado)
      const snapshotAntes = await capturarSnapshot(comanda.id);

      // 2. Estornar movimentação do caixa aberto
      const { data: caixaAberto } = await supabase
        .from('caixa')
        .select('id')
        .eq('status', 'aberto')
        .maybeSingle();

      if (caixaAberto) {
        const clienteNome = comanda.cliente?.nome || 'Cliente avulso';
        await supabase.from('caixa_movimentacoes').insert([{
          caixa_id:         caixaAberto.id,
          tipo:             'saida',
          categoria:        'estorno',
          descricao:        `ESTORNO — Comanda #${String(comanda.numero_comanda).padStart(3, '0')} - ${clienteNome} (${motivo})`,
          valor:            comanda.valor_final,
          forma_pagamento:  'estorno',
          atendimento_id:   comanda.id,
        }]);
      }

      // 3. Mudar status para "reaberta" (novo estado controlado)
      const { error } = await supabase
        .from('atendimentos')
        .update({ status: 'reaberta' })
        .eq('id', comanda.id);

      if (error) throw error;

      // 4. Gravar auditoria com snapshot completo
      await gravarAuditoria(
        comanda.id,
        comanda.numero_comanda,
        'reaberta',
        motivo,
        {
          motivoCategoria: motivoCategoria || 'outro',
          statusAnterior:  comanda.status,
          statusNovo:      'reaberta',
          snapshotAntes,
          detalhes: {
            valor_estornado: comanda.valor_final,
            cliente:         comanda.cliente?.nome || null,
            caixa_estorno:   !!caixaAberto,
          },
        }
      );

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: msg };
    }
  }, [gravarAuditoria]);

  // ── Cancelar comanda fechada ─────────────────────────────────────────────
  const cancelarComandaFechada = useCallback(async (
    comanda: ComandaFechada,
    motivo: string,
    motivoCategoria?: MotivoCategoriaAuditoria
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Capturar snapshot antes
      const snapshotAntes = await capturarSnapshot(comanda.id);

      const { error } = await supabase
        .from('atendimentos')
        .update({ status: 'cancelado' })
        .eq('id', comanda.id);

      if (error) throw error;

      await gravarAuditoria(
        comanda.id,
        comanda.numero_comanda,
        'cancelada',
        motivo,
        {
          motivoCategoria: motivoCategoria || 'outro',
          statusAnterior:  comanda.status,
          statusNovo:      'cancelado',
          snapshotAntes,
          detalhes: {
            valor_final: comanda.valor_final,
            cliente:     comanda.cliente?.nome || null,
          },
        }
      );

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: msg };
    }
  }, [gravarAuditoria]);

  // ── Registrar snapshot_depois ao fechar novamente ────────────────────────
  const registrarSnapshotDepois = useCallback(async (
    auditoriaId: string,
    atendimentoId: string
  ) => {
    try {
      const snapshotDepois = await capturarSnapshot(atendimentoId);
      await supabase
        .from('atendimentos_auditoria')
        .update({ snapshot_depois: snapshotDepois })
        .eq('id', auditoriaId);
    } catch (err) {
      console.error('[Auditoria] Erro ao registrar snapshot_depois:', err);
    }
  }, []);

  // ── Buscar comandas fechadas/rebertas ────────────────────────────────────
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
      .in('status', ['fechado', 'finalizado', 'cancelado', 'reaberta'])
      .gte('data_hora', desde.toISOString())
      .order('data_hora', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[Auditoria] Erro ao buscar fechadas:', error);
      return [];
    }
    return (data || []) as unknown as ComandaFechada[];
  }, []);

  // ── Buscar registros de auditoria ────────────────────────────────────────
  const buscarAuditoria = useCallback(async (filtros?: {
    atendimentoId?: string;
    dias?: number;
    acao?: string;
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
    if (filtros?.acao) {
      query = query.eq('acao', filtros.acao);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Auditoria] Erro ao buscar registros:', error);
      return [];
    }
    return (data || []) as AuditoriaRecord[];
  }, []);

  // ── Buscar último id de auditoria de uma comanda ─────────────────────────
  const buscarUltimaAuditoriaId = useCallback(async (
    atendimentoId: string,
    acao: string
  ): Promise<string | null> => {
    const { data } = await supabase
      .from('atendimentos_auditoria')
      .select('id')
      .eq('atendimento_id', atendimentoId)
      .eq('acao', acao)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }, []);

  return {
    gravarAuditoria,
    reabrirComanda,
    cancelarComandaFechada,
    registrarSnapshotDepois,
    buscarComandasFechadas,
    buscarAuditoria,
    buscarUltimaAuditoriaId,
  };
}
