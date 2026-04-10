import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type StatusEnvio = 'pendente' | 'processando' | 'enviado' | 'falha' | 'cancelado';
export type StatusInteracao = 'sem_interacao' | 'entregue' | 'lido' | 'respondeu' | 'confirmado' | 'recusado' | 'erro';
export type TipoMensagem = 'confirmacao' | 'lembrete' | 'avaliacao' | 'manual' | 'chatbot' | 'reenvio';
export type OrigemFluxo = 'automatico' | 'manual' | 'webhook' | 'n8n' | 'reenvio_manual';

export interface WhatsAppLog {
  id: string;
  agendamento_id: string | null;
  cliente_id: string | null;
  telefone: string;
  tipo_mensagem: TipoMensagem;
  status_envio: StatusEnvio;
  status_interacao: StatusInteracao;
  mensagem_texto: string | null;
  provider: string;
  provider_message_id: string | null;
  tentativa_numero: number;
  erro_detalhado: string | null;
  payload_retorno: Record<string, unknown> | null;
  enviado_em: string | null;
  enviado_por_manual: boolean;
  origem_fluxo: OrigemFluxo;
  usuario_reenvio_id: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionais
  agendamento?: {
    data_hora: string;
    clientes: { nome: string; celular: string } | null;
    profissionais: { nome: string } | null;
    servicos: { nome: string } | null;
  } | null;
}

export interface WhatsAppLogFiltros {
  dataInicio?: string;
  dataFim?: string;
  statusEnvio?: StatusEnvio | 'todos';
  statusInteracao?: StatusInteracao | 'todos';
  tipoMensagem?: TipoMensagem | 'todos';
  origemFluxo?: OrigemFluxo | 'todos';
  busca?: string; // nome do cliente ou telefone
}

export interface WhatsAppResumo {
  total: number;
  enviados: number;
  falhas: number;
  pendentes: number;
  comInteracao: number;
  semInteracao: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarTelefone(tel: string): string {
  const digits = tel.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useWhatsAppLogs(filtros: WhatsAppLogFiltros = {}) {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState<string | null>(null); // id do log em reenvio

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('whatsapp_logs')
        .select(`
          *,
          agendamento:agendamento_id (
            data_hora,
            clientes ( nome, celular ),
            profissionais ( nome ),
            servicos ( nome )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      // Filtros dinâmicos
      if (filtros.statusEnvio && filtros.statusEnvio !== 'todos') {
        query = query.eq('status_envio', filtros.statusEnvio);
      }
      if (filtros.statusInteracao && filtros.statusInteracao !== 'todos') {
        query = query.eq('status_interacao', filtros.statusInteracao);
      }
      if (filtros.tipoMensagem && filtros.tipoMensagem !== 'todos') {
        query = query.eq('tipo_mensagem', filtros.tipoMensagem);
      }
      if (filtros.origemFluxo && filtros.origemFluxo !== 'todos') {
        query = query.eq('origem_fluxo', filtros.origemFluxo);
      }
      if (filtros.dataInicio) {
        query = query.gte('created_at', filtros.dataInicio);
      }
      if (filtros.dataFim) {
        query = query.lte('created_at', filtros.dataFim + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;

      let resultados = (data || []) as WhatsAppLog[];

      // Injeta logs virtuais removido. Agora a tabela refletirá rigorosamente a base real.

      // Filtro client-side por busca (nome/telefone)
      if (filtros.busca && filtros.busca.trim()) {
        const termo = filtros.busca.toLowerCase().trim();
        resultados = resultados.filter(log =>
          log.telefone?.toLowerCase().includes(termo) ||
          (log.agendamento?.clientes?.nome || '').toLowerCase().includes(termo)
        );
      }

      setLogs(resultados);
    } catch (err) {
      console.error('[useWhatsAppLogs] Erro ao buscar:', err);
    } finally {
      setLoading(false);
    }
  }, [
    filtros.statusEnvio,
    filtros.statusInteracao,
    filtros.tipoMensagem,
    filtros.origemFluxo,
    filtros.dataInicio,
    filtros.dataFim,
    filtros.busca
  ]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  // ── Calcular resumo ──────────────────────────────────────────────────────────
  const resumo: WhatsAppResumo = {
    total: logs.length,
    enviados: logs.filter(l => l.status_envio === 'enviado').length,
    falhas: logs.filter(l => l.status_envio === 'falha').length,
    pendentes: logs.filter(l => ['pendente', 'processando'].includes(l.status_envio)).length,
    comInteracao: logs.filter(l => !['sem_interacao', 'erro'].includes(l.status_interacao)).length,
    semInteracao: logs.filter(l => l.status_interacao === 'sem_interacao').length,
  };

  // ── Reenvio manual via Z-API ─────────────────────────────────────────────────
  const reenviarManual = useCallback(async (log: WhatsAppLog) => {
    let telefoneReal = log.telefone;
    if (!telefoneReal && log.agendamento?.clientes?.celular) {
      telefoneReal = log.agendamento.clientes.celular;
    }

    if (!telefoneReal) {
      toast.error('Sem número de telefone para reenvio');
      return;
    }

    setEnviando(log.id);
    try {
      const telefone = formatarTelefone(telefoneReal);

      let mensagem = log.mensagem_texto;
      if (!mensagem && log.tipo_mensagem === 'confirmacao') {
        mensagem = 'Olá {{nome_cliente}}! Seu agendamento está confirmado para {{data_agendamento}} às {{hora_agendamento}}. Serviço: {{nome_servico}}. Com: {{nome_profissional}}. Responda SIM para confirmar. Maicon Maksuel Concept.';
      }
      
      if (!mensagem) {
         toast.error('Erro ao recriar template de mensagem vazia');
         setEnviando(null); return;
      }

      if (log.agendamento) {
        const ag = log.agendamento;
        const dataHora = new Date(ag.data_hora);
        const data = dataHora.toLocaleDateString('pt-BR', {
          weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
          timeZone: 'America/Sao_Paulo'
        });
        const hora = dataHora.toLocaleTimeString('pt-BR', {
          hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
        });
        mensagem = mensagem
          .replace(/{{nome_cliente}}/g, ag.clientes?.nome || '')
          .replace(/{{data_agendamento}}/g, data)
          .replace(/{{hora_agendamento}}/g, hora)
          .replace(/{{nome_servico}}/g, ag.servicos?.nome || 'Serviço')
          .replace(/{{nome_profissional}}/g, ag.profissionais?.nome || 'Profissional');
      }

      // Envio via edge function whatsapp-send (usa configuracoes_whatsapp do banco)
      const { data: sendData, error: sendError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          telefone,
          mensagem,
          cliente_nome: log.agendamento?.clientes?.nome,
          agendamento_id: log.agendamento_id,
          cliente_id: log.cliente_id,
          tipo_mensagem: 'reenvio',
        },
      });

      const resp = { ok: !sendError && sendData?.success !== false };
      const retorno = sendData || { error: sendError?.message };

      // Criar novo log de reenvio (não sobrescreve o original)
      const { error: insertErr } = await supabase.from('whatsapp_logs').insert({
        agendamento_id: log.agendamento_id,
        cliente_id: log.cliente_id,
        telefone: log.telefone,
        tipo_mensagem: 'reenvio' as TipoMensagem,
        status_envio: resp.ok ? 'enviado' : 'falha',
        status_interacao: 'sem_interacao' as StatusInteracao,
        mensagem_texto: mensagem,
        provider: 'z-api',
        provider_message_id: retorno?.messageId || retorno?.zaapId || null,
        payload_retorno: retorno,
        tentativa_numero: log.tentativa_numero + 1,
        erro_detalhado: resp.ok ? null : JSON.stringify(retorno),
        enviado_em: new Date().toISOString(),
        enviado_por_manual: true,
        origem_fluxo: 'reenvio_manual' as OrigemFluxo,
      });

      if (insertErr) throw insertErr;

      if (resp.ok) {
        toast.success('✅ Mensagem reenviada com sucesso!');
      } else {
        toast.error(`Falha no reenvio: ${retorno?.error || 'Erro desconhecido'}`);
      }

      await buscar();
    } catch (err) {
      console.error('[useWhatsAppLogs] Reenvio falhou:', err);
      toast.error('Erro ao reenviar mensagem');
    } finally {
      setEnviando(null);
    }
  }, [buscar]);

  // ── Marcar como resolvido ────────────────────────────────────────────────────
  const marcarResolvido = useCallback(async (logId: string) => {
    const { error } = await supabase
      .from('whatsapp_logs')
      .update({ status_envio: 'cancelado' })
      .eq('id', logId);

    if (error) {
      toast.error('Erro ao marcar registro');
      return;
    }
    toast.success('Registro marcado como resolvido');
    await buscar();
  }, [buscar]);

  return {
    logs,
    loading,
    resumo,
    enviando,
    buscar,
    reenviarManual,
    marcarResolvido,
  };
}
