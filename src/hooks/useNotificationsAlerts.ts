/**
 * Hook for managing notifications alerts with actions
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AlertType = 'aniversario' | 'agendamento' | 'estoque' | 'caixa' | 'financeiro' | 'sistema';
export type AlertStatus = 'novo' | 'em_andamento' | 'resolvido' | 'silenciado';
export type AlertPriority = 'baixa' | 'media' | 'alta';

export interface NotificationAlert {
  id: string;
  type: AlertType;
  title: string;
  description: string | null;
  priority: AlertPriority;
  status: AlertStatus;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, any>;
  assigned_to: string | null;
  silenced_until: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationActionLog {
  id: string;
  alert_id: string;
  action_type: string;
  channel: string | null;
  payload: Record<string, any>;
  result: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  type: AlertType;
  name: string;
  subject: string | null;
  content: string;
  variables: string[];
  is_default: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface UseNotificationsAlertsReturn {
  alerts: NotificationAlert[];
  templates: NotificationTemplate[];
  actionLogs: NotificationActionLog[];
  isLoading: boolean;
  error: Error | null;
  
  // Alert operations
  fetchAlerts: (filters?: AlertFilters) => Promise<void>;
  updateAlertStatus: (alertId: string, status: AlertStatus, resolvedBy?: string) => Promise<void>;
  silenceAlert: (alertId: string, durationDays: number) => Promise<void>;
  deleteAlert: (alertId: string) => Promise<void>;
  
  // Action logging
  logAction: (alertId: string, actionType: string, channel?: string, payload?: Record<string, any>, result?: string) => Promise<void>;
  fetchActionLogs: (alertId?: string) => Promise<void>;
  
  // Templates
  fetchTemplates: (type?: AlertType) => Promise<void>;
  
  // Alert generation
  generateBirthdayAlerts: () => Promise<void>;
  generateStockAlerts: () => Promise<void>;
  generateSystemAlerts: () => Promise<void>;
  refreshAllAlerts: () => Promise<void>;
  
  // Stats
  getAlertStats: () => { total: number; novos: number; emAndamento: number; resolvidos: number; };
}

interface AlertFilters {
  type?: AlertType;
  status?: AlertStatus;
  priority?: AlertPriority;
  dateStart?: string;
  dateEnd?: string;
  search?: string;
}

export function useNotificationsAlerts(): UseNotificationsAlertsReturn {
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [actionLogs, setActionLogs] = useState<NotificationActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch alerts with filters
  const fetchAlerts = useCallback(async (filters?: AlertFilters) => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('notifications_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.dateStart) {
        query = query.gte('created_at', filters.dateStart);
      }
      if (filters?.dateEnd) {
        query = query.lte('created_at', filters.dateEnd);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,entity_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setAlerts((data || []) as NotificationAlert[]);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update alert status
  const updateAlertStatus = useCallback(async (alertId: string, status: AlertStatus, resolvedBy?: string) => {
    try {
      const updateData: Record<string, any> = { status };
      if (status === 'resolvido') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = resolvedBy || null;
      }

      const { error: updateError } = await supabase
        .from('notifications_alerts')
        .update(updateData)
        .eq('id', alertId);

      if (updateError) throw updateError;

      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, ...updateData } : a
      ));

      toast.success('Status atualizado!');
    } catch (err) {
      console.error('Error updating alert status:', err);
      toast.error('Erro ao atualizar status');
    }
  }, []);

  // Silence alert for X days
  const silenceAlert = useCallback(async (alertId: string, durationDays: number) => {
    try {
      const silencedUntil = new Date();
      silencedUntil.setDate(silencedUntil.getDate() + durationDays);

      const { error: updateError } = await supabase
        .from('notifications_alerts')
        .update({ 
          status: 'silenciado' as AlertStatus,
          silenced_until: silencedUntil.toISOString()
        })
        .eq('id', alertId);

      if (updateError) throw updateError;

      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, status: 'silenciado', silenced_until: silencedUntil.toISOString() } : a
      ));

      toast.success(`Alerta silenciado por ${durationDays} dias`);
    } catch (err) {
      console.error('Error silencing alert:', err);
      toast.error('Erro ao silenciar alerta');
    }
  }, []);

  // Delete alert
  const deleteAlert = useCallback(async (alertId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications_alerts')
        .delete()
        .eq('id', alertId);

      if (deleteError) throw deleteError;

      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success('Alerta removido');
    } catch (err) {
      console.error('Error deleting alert:', err);
      toast.error('Erro ao remover alerta');
    }
  }, []);

  // Log action
  const logAction = useCallback(async (
    alertId: string, 
    actionType: string, 
    channel?: string, 
    payload?: Record<string, any>,
    result?: string
  ) => {
    try {
      const { error: insertError } = await supabase
        .from('notifications_actions_log')
        .insert({
          alert_id: alertId,
          action_type: actionType,
          channel: channel || null,
          payload: payload || {},
          result: result || 'success',
          user_name: 'Sistema'
        });

      if (insertError) throw insertError;
    } catch (err) {
      console.error('Error logging action:', err);
    }
  }, []);

  // Fetch action logs
  const fetchActionLogs = useCallback(async (alertId?: string) => {
    try {
      let query = supabase
        .from('notifications_actions_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (alertId) {
        query = query.eq('alert_id', alertId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setActionLogs((data || []) as NotificationActionLog[]);
    } catch (err) {
      console.error('Error fetching action logs:', err);
    }
  }, []);

  // Fetch templates
  const fetchTemplates = useCallback(async (type?: AlertType) => {
    try {
      let query = supabase
        .from('notifications_templates')
        .select('*')
        .eq('ativo', true)
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTemplates((data || []) as NotificationTemplate[]);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, []);

  // Generate birthday alerts
  const generateBirthdayAlerts = useCallback(async () => {
    try {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      // Fetch clients with birthdays
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome, data_nascimento, celular, allow_whatsapp_marketing')
        .eq('ativo', true)
        .not('data_nascimento', 'is', null);

      if (!clientes) return;

      const currentMonth = today.getMonth();
      const currentDay = today.getDate();

      for (const cliente of clientes) {
        if (!cliente.data_nascimento) continue;
        
        const birthDate = new Date(cliente.data_nascimento);
        const birthMonth = birthDate.getMonth();
        const birthDay = birthDate.getDate();

        // Check if birthday is today or within next 7 days
        const birthdayThisYear = new Date(today.getFullYear(), birthMonth, birthDay);
        const diffDays = Math.ceil((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 7) {
          // Check if alert already exists
          const { data: existing } = await supabase
            .from('notifications_alerts')
            .select('id')
            .eq('type', 'aniversario')
            .eq('entity_id', cliente.id)
            .gte('created_at', new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString())
            .maybeSingle();

          if (!existing) {
            const isToday = diffDays === 0;
            const isTomorrow = diffDays === 1;
            
            await supabase.from('notifications_alerts').insert({
              type: 'aniversario' as AlertType,
              title: isToday ? '🎂 Aniversário Hoje!' : isTomorrow ? '🎂 Aniversário Amanhã' : '🎂 Aniversário Próximo',
              description: `${cliente.nome} ${isToday ? 'faz aniversário hoje!' : isTomorrow ? 'faz aniversário amanhã' : `faz aniversário em ${diffDays} dias`}`,
              priority: isToday ? 'alta' : 'media' as AlertPriority,
              status: 'novo' as AlertStatus,
              entity_type: 'cliente',
              entity_id: cliente.id,
              entity_name: cliente.nome,
              metadata: {
                celular: cliente.celular,
                data_nascimento: cliente.data_nascimento,
                dias_ate_aniversario: diffDays,
                allow_marketing: cliente.allow_whatsapp_marketing
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('Error generating birthday alerts:', err);
    }
  }, []);

  // Generate stock alerts
  const generateStockAlerts = useCallback(async () => {
    try {
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome, estoque_atual, estoque_minimo')
        .eq('ativo', true);

      if (!produtos) return;

      for (const produto of produtos) {
        if (produto.estoque_atual <= produto.estoque_minimo) {
          // Check if alert already exists
          const { data: existing } = await supabase
            .from('notifications_alerts')
            .select('id')
            .eq('type', 'estoque')
            .eq('entity_id', produto.id)
            .in('status', ['novo', 'em_andamento'])
            .maybeSingle();

          if (!existing) {
            const isCritical = produto.estoque_atual === 0;
            
            await supabase.from('notifications_alerts').insert({
              type: 'estoque' as AlertType,
              title: isCritical ? '🚨 Produto Esgotado!' : '⚠️ Estoque Baixo',
              description: `${produto.nome}: ${produto.estoque_atual} unidades (mín: ${produto.estoque_minimo})`,
              priority: isCritical ? 'alta' : 'media' as AlertPriority,
              status: 'novo' as AlertStatus,
              entity_type: 'produto',
              entity_id: produto.id,
              entity_name: produto.nome,
              metadata: {
                estoque_atual: produto.estoque_atual,
                estoque_minimo: produto.estoque_minimo
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('Error generating stock alerts:', err);
    }
  }, []);

  // Generate system alerts (cash box, etc)
  const generateSystemAlerts = useCallback(async () => {
    try {
      // Check for open cash boxes for too long
      const { data: caixasAbertos } = await supabase
        .from('caixa')
        .select('id, data_abertura, valor_inicial')
        .eq('status', 'aberto');

      if (caixasAbertos) {
        const now = new Date();
        for (const caixa of caixasAbertos) {
          const abertura = new Date(caixa.data_abertura);
          const horasAberto = (now.getTime() - abertura.getTime()) / (1000 * 60 * 60);

          if (horasAberto > 12) {
            // Check if alert already exists
            const { data: existing } = await supabase
              .from('notifications_alerts')
              .select('id')
              .eq('type', 'caixa')
              .eq('entity_id', caixa.id)
              .in('status', ['novo', 'em_andamento'])
              .maybeSingle();

            if (!existing) {
              await supabase.from('notifications_alerts').insert({
                type: 'caixa' as AlertType,
                title: '⏰ Caixa Aberto Há Muito Tempo',
                description: `O caixa está aberto há mais de ${Math.floor(horasAberto)} horas`,
                priority: horasAberto > 24 ? 'alta' : 'media' as AlertPriority,
                status: 'novo' as AlertStatus,
                entity_type: 'caixa',
                entity_id: caixa.id,
                entity_name: `Caixa ${abertura.toLocaleDateString('pt-BR')}`,
                metadata: {
                  horas_aberto: Math.floor(horasAberto),
                  valor_inicial: caixa.valor_inicial
                }
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error generating system alerts:', err);
    }
  }, []);

  // Refresh all alerts
  const refreshAllAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        generateBirthdayAlerts(),
        generateStockAlerts(),
        generateSystemAlerts()
      ]);
      await fetchAlerts();
      toast.success('Alertas atualizados!');
    } catch (err) {
      console.error('Error refreshing alerts:', err);
      toast.error('Erro ao atualizar alertas');
    } finally {
      setIsLoading(false);
    }
  }, [generateBirthdayAlerts, generateStockAlerts, generateSystemAlerts, fetchAlerts]);

  // Get alert stats
  const getAlertStats = useCallback(() => {
    const total = alerts.length;
    const novos = alerts.filter(a => a.status === 'novo').length;
    const emAndamento = alerts.filter(a => a.status === 'em_andamento').length;
    const resolvidos = alerts.filter(a => a.status === 'resolvido').length;
    return { total, novos, emAndamento, resolvidos };
  }, [alerts]);

  // Initial load
  useEffect(() => {
    fetchAlerts();
    fetchTemplates();
    fetchActionLogs();
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('notifications_alerts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications_alerts' },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  return {
    alerts,
    templates,
    actionLogs,
    isLoading,
    error,
    fetchAlerts,
    updateAlertStatus,
    silenceAlert,
    deleteAlert,
    logAction,
    fetchActionLogs,
    fetchTemplates,
    generateBirthdayAlerts,
    generateStockAlerts,
    generateSystemAlerts,
    refreshAllAlerts,
    getAlertStats
  };
}
