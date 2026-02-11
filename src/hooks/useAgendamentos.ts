// Offline-first hook for agendamentos with status management
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  localGet,
  localGetAll,
  localPut,
  localBulkPut,
  addToSyncQueue,
} from '@/lib/offlineDb';
import {
  getOnlineStatus,
  addOnlineStatusListener,
} from '@/lib/syncService';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeCallback } from '@/hooks/useRealtimeSubscription';

export interface Cliente {
  id: string;
  nome: string;
  celular: string;
  telefone: string | null;
  data_nascimento: string | null;
}

export interface Profissional {
  id: string;
  nome: string;
  cor_agenda: string;
  ativo: boolean;
}

export interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
}

export interface Agendamento {
  id: string;
  cliente_id: string;
  profissional_id: string;
  servico_id: string;
  data_hora: string;
  duracao_minutos: number;
  status: 'agendado' | 'confirmado' | 'atendido' | 'cancelado' | 'faltou';
  observacoes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AgendamentoCompleto extends Agendamento {
  cliente: Cliente;
  profissional: { nome: string; cor_agenda: string };
  servico: { nome: string; preco: number };
}

export type AgendamentoStatus = 'agendado' | 'confirmado' | 'atendido' | 'cancelado' | 'faltou';

interface UseAgendamentosOptions {
  date?: Date;
  profissionalId?: string;
}

interface UseAgendamentosReturn {
  agendamentos: AgendamentoCompleto[];
  profissionais: Profissional[];
  loading: boolean;
  isOnline: boolean;
  pendingSync: number;
  refetch: () => Promise<void>;
  create: (data: Omit<Agendamento, 'id' | 'created_at' | 'updated_at'>) => Promise<Agendamento>;
  update: (id: string, data: Partial<Agendamento>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  updateStatus: (id: string, status: AgendamentoStatus) => Promise<void>;
  confirmAppointment: (id: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  markAttended: (id: string) => Promise<void>;
  markNoShow: (id: string) => Promise<void>;
  getAgendamentosForDate: (date: Date, profissionalId?: string) => AgendamentoCompleto[];
}

export function useAgendamentos(options: UseAgendamentosOptions = {}): UseAgendamentosReturn {
  const { date, profissionalId } = options;
  
  const [agendamentos, setAgendamentos] = useState<AgendamentoCompleto[]>([]);
  const [allAgendamentos, setAllAgendamentos] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Map<string, Cliente>>(new Map());
  const [servicos, setServicos] = useState<Map<string, Servico>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [pendingSync, setPendingSync] = useState(0);
  const { toast } = useToast();
  
  // Mutation lock: skip realtime refetches during local mutations to avoid race conditions
  const mutationLockRef = useRef(false);
  const lockMutation = useCallback(() => {
    mutationLockRef.current = true;
    setTimeout(() => { mutationLockRef.current = false; }, 2000);
  }, []);

  // Listen for online status changes
  useEffect(() => {
    return addOnlineStatusListener(setIsOnline);
  }, []);

  // Load related entities (clientes, profissionais, servicos) from local first
  const loadRelatedEntities = useCallback(async () => {
    try {
      // Load from local first
      const [localClientes, localProfissionais, localServicos] = await Promise.all([
        localGetAll<Cliente>('clientes'),
        localGetAll<Profissional>('profissionais'),
        localGetAll<Servico>('servicos'),
      ]);

      // Set from local
      setClientes(new Map(localClientes.map(c => [c.id, c])));
      setProfissionais(localProfissionais.filter(p => p.ativo));
      setServicos(new Map(localServicos.map(s => [s.id, s])));

      // Sync from server if online
      if (isOnline) {
        const [serverClientes, serverProfissionais, serverServicos] = await Promise.all([
          supabase.from('clientes').select('id, nome, celular, telefone, data_nascimento').eq('ativo', true),
          supabase.from('profissionais').select('id, nome, cor_agenda, ativo').eq('ativo', true).order('nome'),
          supabase.from('servicos').select('id, nome, preco, duracao_minutos').eq('ativo', true),
        ]);

        if (serverClientes.data) {
          await localBulkPut('clientes', serverClientes.data as unknown as (Cliente & { id: string })[]);
          setClientes(new Map(serverClientes.data.map(c => [c.id, c])));
        }
        if (serverProfissionais.data) {
          await localBulkPut('profissionais', serverProfissionais.data as unknown as (Profissional & { id: string })[]);
          setProfissionais(serverProfissionais.data);
        }
        if (serverServicos.data) {
          await localBulkPut('servicos', serverServicos.data as unknown as (Servico & { id: string })[]);
          setServicos(new Map(serverServicos.data.map(s => [s.id, s])));
        }
      }
    } catch (err) {
      console.error('[useAgendamentos] Error loading related entities:', err);
    }
  }, [isOnline]);

  // Fetch agendamentos for a specific date
  const fetchAgendamentos = useCallback(async () => {
    if (!date) return;
    
    setLoading(true);
    
    try {
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      if (isOnline) {
        // Online: fetch directly from server (single state update)
        const { data: serverData, error } = await supabase
          .from('agendamentos')
          .select('*')
          .gte('data_hora', startDate.toISOString())
          .lte('data_hora', endDate.toISOString())
          .order('data_hora');

        if (error) {
          console.error('[useAgendamentos] Server fetch error:', error);
          // Fallback to local
          const localData = await localGetAll<Agendamento>('agendamentos');
          const filteredLocal = localData.filter(ag => {
            const agDate = new Date(ag.data_hora);
            return agDate >= startDate && agDate <= endDate;
          });
          setAllAgendamentos(filteredLocal);
        } else if (serverData) {
          const typedData = serverData as Agendamento[];
          setAllAgendamentos(typedData);
          // Update local storage in background
          localBulkPut('agendamentos', typedData).catch(() => {});
        }
      } else {
        // Offline: load from local
        const localData = await localGetAll<Agendamento>('agendamentos');
        const filteredLocal = localData.filter(ag => {
          const agDate = new Date(ag.data_hora);
          return agDate >= startDate && agDate <= endDate;
        });
        setAllAgendamentos(filteredLocal);
      }
    } catch (err) {
      console.error('[useAgendamentos] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [date, isOnline]);

  // Build complete agendamentos with related data
  const buildCompleteAgendamentos = useCallback(() => {
    const complete: AgendamentoCompleto[] = allAgendamentos
      .map(ag => {
        const cliente = clientes.get(ag.cliente_id);
        const prof = profissionais.find(p => p.id === ag.profissional_id);
        const servico = servicos.get(ag.servico_id);

        if (!cliente || !prof || !servico) return null;

        return {
          ...ag,
          cliente,
          profissional: { nome: prof.nome, cor_agenda: prof.cor_agenda },
          servico: { nome: servico.nome, preco: servico.preco },
        };
      })
      .filter((ag): ag is AgendamentoCompleto => ag !== null)
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

    // Filter by profissional if specified
    const filtered = profissionalId && profissionalId !== 'todos'
      ? complete.filter(ag => ag.profissional_id === profissionalId)
      : complete;

    setAgendamentos(filtered);
  }, [allAgendamentos, clientes, profissionais, servicos, profissionalId]);

  // Load data on mount and when date changes
  useEffect(() => {
    loadRelatedEntities();
  }, [loadRelatedEntities]);

  useEffect(() => {
    if (date) {
      fetchAgendamentos();
    }
  }, [date, fetchAgendamentos]);

  // Rebuild complete agendamentos when related data changes
  useEffect(() => {
    buildCompleteAgendamentos();
  }, [buildCompleteAgendamentos]);

  // Create new agendamento
  const create = useCallback(async (data: Omit<Agendamento, 'id' | 'created_at' | 'updated_at'>): Promise<Agendamento> => {
    const now = new Date().toISOString();
    const newAgendamento: Agendamento = {
      ...data,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };

    try {
      lockMutation();
      // Save locally first
      await localPut('agendamentos', newAgendamento, false);
      
      // Update state
      setAllAgendamentos(prev => [...prev, newAgendamento]);

      if (isOnline) {
        const { error } = await supabase.from('agendamentos').insert(newAgendamento);
        
        if (error) {
          console.error('[useAgendamentos] Create sync error:', error);
          await addToSyncQueue({
            entity: 'agendamentos',
            operation: 'create',
            data: newAgendamento as unknown as Record<string, unknown>,
            timestamp: now,
          });
          setPendingSync(prev => prev + 1);
        } else {
          await localPut('agendamentos', newAgendamento, true);
        }
      } else {
        await addToSyncQueue({
          entity: 'agendamentos',
          operation: 'create',
          data: newAgendamento as unknown as Record<string, unknown>,
          timestamp: now,
        });
        setPendingSync(prev => prev + 1);
      }

      return newAgendamento;
    } catch (err) {
      console.error('[useAgendamentos] Create error:', err);
      throw err;
    }
  }, [isOnline]);

  // Update agendamento
  const update = useCallback(async (id: string, data: Partial<Agendamento>): Promise<void> => {
    const now = new Date().toISOString();
    
    try {
      lockMutation();
      const current = await localGet<Agendamento>('agendamentos', id);
      if (!current) throw new Error('Agendamento não encontrado');

      const updated: Agendamento = {
        ...current,
        ...data,
        updated_at: now,
      };

      await localPut('agendamentos', updated, false);
      setAllAgendamentos(prev => prev.map(ag => ag.id === id ? updated : ag));

      if (isOnline) {
        const { error } = await supabase.from('agendamentos').update(updated).eq('id', id);
        
        if (error) {
          console.error('[useAgendamentos] Update sync error:', error);
          await addToSyncQueue({
            entity: 'agendamentos',
            operation: 'update',
            data: updated as unknown as Record<string, unknown>,
            timestamp: now,
          });
          setPendingSync(prev => prev + 1);
        } else {
          await localPut('agendamentos', updated, true);
        }
      } else {
        await addToSyncQueue({
          entity: 'agendamentos',
          operation: 'update',
          data: updated as unknown as Record<string, unknown>,
          timestamp: now,
        });
        setPendingSync(prev => prev + 1);
      }
    } catch (err) {
      console.error('[useAgendamentos] Update error:', err);
      throw err;
    }
  }, [isOnline]);

  // Delete agendamento
  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      lockMutation();
      const current = await localGet<Agendamento>('agendamentos', id);
      
      // Remove from local
      const { localDelete } = await import('@/lib/offlineDb');
      await localDelete('agendamentos', id);
      setAllAgendamentos(prev => prev.filter(ag => ag.id !== id));

      if (isOnline) {
        const { error } = await supabase.from('agendamentos').delete().eq('id', id);
        
        if (error && error.code !== 'PGRST116') {
          console.error('[useAgendamentos] Delete sync error:', error);
          if (current) {
            await addToSyncQueue({
              entity: 'agendamentos',
              operation: 'delete',
              data: { id } as Record<string, unknown>,
              timestamp: new Date().toISOString(),
            });
            setPendingSync(prev => prev + 1);
          }
        }
      } else if (current) {
        await addToSyncQueue({
          entity: 'agendamentos',
          operation: 'delete',
          data: { id } as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
        setPendingSync(prev => prev + 1);
      }
    } catch (err) {
      console.error('[useAgendamentos] Delete error:', err);
      throw err;
    }
  }, [isOnline]);

  // Status update helper
  const updateStatus = useCallback(async (id: string, status: AgendamentoStatus): Promise<void> => {
    await update(id, { status });
  }, [update]);

  // Convenience methods for status changes
  const confirmAppointment = useCallback(async (id: string): Promise<void> => {
    await updateStatus(id, 'confirmado');
    toast({ title: 'Agendamento confirmado!' });
  }, [updateStatus, toast]);

  const cancelAppointment = useCallback(async (id: string): Promise<void> => {
    await updateStatus(id, 'cancelado');
    toast({ title: 'Agendamento cancelado' });
  }, [updateStatus, toast]);

  const markAttended = useCallback(async (id: string): Promise<void> => {
    await updateStatus(id, 'atendido');
    toast({ title: 'Marcado como atendido!' });
  }, [updateStatus, toast]);

  const markNoShow = useCallback(async (id: string): Promise<void> => {
    await updateStatus(id, 'faltou');
    toast({ title: 'Marcado como falta' });
  }, [updateStatus, toast]);

  // Get agendamentos for a specific date (utility method)
  const getAgendamentosForDate = useCallback((targetDate: Date, filterProfId?: string): AgendamentoCompleto[] => {
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);
    
    return agendamentos.filter(ag => {
      const agDate = new Date(ag.data_hora);
      const dateMatch = agDate >= start && agDate <= end;
      const profMatch = !filterProfId || filterProfId === 'todos' || ag.profissional_id === filterProfId;
      return dateMatch && profMatch;
    });
  }, [agendamentos]);

  // Refetch wrapper - only refetch agendamentos, not all related entities
  const refetch = useCallback(async () => {
    await fetchAgendamentos();
  }, [fetchAgendamentos]);

  // Full reload including related entities (use sparingly)
  const fullReload = useCallback(async () => {
    await loadRelatedEntities();
    await fetchAgendamentos();
  }, [loadRelatedEntities, fetchAgendamentos]);

  // Realtime: auto-refresh when agendamentos change in another tab/device
  // Skip if a local mutation is in progress to avoid race conditions
  // Use higher throttle (3s) to prevent flickering
  const safeRealtimeRefetch = useCallback(() => {
    if (!mutationLockRef.current) {
      refetch();
    }
  }, [refetch]);
  
  useRealtimeCallback('agendamentos', safeRealtimeRefetch, { throttleMs: 3000 });

  return {
    agendamentos,
    profissionais,
    loading,
    isOnline,
    pendingSync,
    refetch,
    create,
    update,
    remove,
    updateStatus,
    confirmAppointment,
    cancelAppointment,
    markAttended,
    markNoShow,
    getAgendamentosForDate,
  };
}
