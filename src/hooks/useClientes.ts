// Hook especializado para gerenciamento de clientes com offline-first
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  localGet,
  localGetAll,
  localPut,
  localDelete,
  localClear,
  addToSyncQueue,
} from '@/lib/offlineDb';
import {
  getOnlineStatus,
  addOnlineStatusListener,
} from '@/lib/syncService';
import { toast } from 'sonner';

export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  celular: string;
  email: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  foto_url: string | null;
  foto_updated_at: string | null;
  ativo: boolean;
  ultima_visita: string | null;
  total_visitas: number;
  sempre_emitir_nf: boolean;
  receber_mensagens: boolean;
  elegivel_crediario: boolean;
  limite_crediario: number;
  dia_vencimento_crediario: number;
  created_at: string;
  updated_at: string;
}

interface UseClientesOptions {
  filter?: 'todos' | 'ativos' | 'inativos';
  searchTerm?: string;
  orderBy?: 'nome' | 'created_at' | 'ultima_visita';
  orderDirection?: 'asc' | 'desc';
}

interface UseClientesReturn {
  clientes: Cliente[];
  loading: boolean;
  error: Error | null;
  isOnline: boolean;
  refetch: () => Promise<void>;
  create: (data: Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'total_visitas' | 'ultima_visita'>) => Promise<Cliente>;
  update: (id: string, data: Partial<Cliente>) => Promise<Cliente | null>;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => Promise<Cliente | undefined>;
  searchClientes: (term: string) => Promise<Cliente[]>;
  getRecentClientes: (limit?: number) => Promise<Cliente[]>;
}

// Helper seguro para strings - previne crash em campos null/undefined
const safeStr = (v: any): string => (v ?? '').toString();

// Função para remover acentos
const removeAccents = (str: string): string => {
  return safeStr(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export function useClientes(options: UseClientesOptions = {}): UseClientesReturn {
  const { filter = 'todos', searchTerm = '', orderBy = 'nome', orderDirection = 'asc' } = options;
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());

  // Listen for online status changes + auto-refetch on reconnect
  useEffect(() => {
    const unsubscribe = addOnlineStatusListener((online) => {
      setIsOnline(online);
      if (online) {
        console.log('[CLIENTES] online_reconnect → refetch');
        fetchData();
      }
    });
    return unsubscribe;
  }, []);

  // Apply local filters/sort to data
  const applyFiltersAndSort = useCallback((data: Cliente[]): Cliente[] => {
    let result = [...data];

    if (filter === 'ativos') result = result.filter(c => c.ativo);
    else if (filter === 'inativos') result = result.filter(c => !c.ativo);

    if (searchTerm) {
      const term = removeAccents(searchTerm.toLowerCase());
      const termNumbers = searchTerm.replace(/\D/g, "");
      result = result.filter(c => {
        try {
          const nomeMatch = removeAccents(safeStr(c.nome).toLowerCase()).includes(term);
          const emailMatch = safeStr(c.email).toLowerCase().includes(term);
          const celularClean = safeStr(c.celular).replace(/\D/g, "");
          const telefoneClean = safeStr(c.telefone).replace(/\D/g, "");
          const telefoneMatch = termNumbers && (celularClean.includes(termNumbers) || telefoneClean.includes(termNumbers));
          const cpfClean = safeStr(c.cpf).replace(/\D/g, "");
          const cpfMatch = termNumbers && cpfClean.includes(termNumbers);
          return nomeMatch || emailMatch || telefoneMatch || cpfMatch;
        } catch (err) {
          console.error('[CLIENTES] filter_error', { id: c?.id, err });
          return false;
        }
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (orderBy) {
        case 'nome': comparison = safeStr(a.nome).localeCompare(safeStr(b.nome)); break;
        case 'created_at': comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case 'ultima_visita':
          const aV = a.ultima_visita ? new Date(a.ultima_visita).getTime() : 0;
          const bV = b.ultima_visita ? new Date(b.ultima_visita).getTime() : 0;
          comparison = aV - bV; break;
      }
      return orderDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [filter, searchTerm, orderBy, orderDirection]);

  const projectRef = (import.meta.env.VITE_SUPABASE_URL || '').replace(/^https?:\/\//, '').split('.')[0];

  // Fetch data — Supabase is source of truth when online
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (isOnline || getOnlineStatus()) {
        // ONLINE: Fetch from Supabase, clear local, replace
        console.log('[CLIENTE_WEB] fetch_start', { projectRef, filter, searchTerm });
        const { data: remoteData, error: fetchError } = await supabase
          .from('clientes')
          .select('*')
          .order('nome', { ascending: true });

        if (fetchError) {
          console.error('[CLIENTE_WEB] fetch_fail', { error: fetchError, projectRef });
          // Fall back to local
          const localData = await localGetAll<Cliente>('clientes');
          setClientes(applyFiltersAndSort(localData));
        } else {
          console.log('[CLIENTE_WEB] fetch_ok', { count: remoteData?.length || 0, projectRef });
          const data = (remoteData || []) as Cliente[];

          // Clear local and replace — prevents deleted items from resurrecting
          try {
            await localClear('clientes');
            for (const c of data) {
              await localPut('clientes', c, true);
            }
          } catch (cacheErr) {
            console.warn('[CLIENTES] cache_sync_fail', cacheErr);
          }

          setClientes(applyFiltersAndSort(data));
        }
      } else {
        // OFFLINE: Use local data
        console.log('[CLIENTES] fetch_local (offline)');
        const localData = await localGetAll<Cliente>('clientes');
        setClientes(applyFiltersAndSort(localData));
      }
    } catch (err) {
      console.error('[CLIENTES] fetch_error', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Last resort: try local
      try {
        const localData = await localGetAll<Cliente>('clientes');
        setClientes(applyFiltersAndSort(localData));
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }, [isOnline, applyFiltersAndSort]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create cliente
  const create = useCallback(async (data: Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'total_visitas' | 'ultima_visita'>): Promise<Cliente> => {
    const now = new Date().toISOString();
    const newCliente: Cliente = {
      ...data,
      id: crypto.randomUUID(),
      total_visitas: 0,
      ultima_visita: null,
      created_at: now,
      updated_at: now,
    };
    
    try {
      console.log('[CLIENTE] write_start', { id: newCliente.id, nome: newCliente.nome, projectRef, isOnline: getOnlineStatus() });
      // Save locally first
      await localPut('clientes', newCliente, false);
      setClientes(prev => applyFiltersAndSort([newCliente, ...prev]));
      
      if (getOnlineStatus()) {
        const { data: remoteData, error: syncError } = await supabase
          .from('clientes')
          .upsert(newCliente, { onConflict: 'id' })
          .select()
          .maybeSingle();
        
        if (syncError) {
          console.error('[CLIENTE] write_fail', { error: syncError, projectRef });
          await addToSyncQueue({ entity: 'clientes', operation: 'create', data: newCliente as unknown as Record<string, unknown>, timestamp: now });
          toast.warning('Sem internet: cliente salvo e será sincronizado');
        } else {
          console.info('[CLIENTE] write_ok', { id: remoteData?.id || newCliente.id, projectRef });
          await localPut('clientes', (remoteData || newCliente) as Cliente, true);
          toast.success('Cliente cadastrado com sucesso!');
        }
      } else {
        console.log('[CLIENTE] queued_offline', { localId: newCliente.id, projectRef });
        await addToSyncQueue({ entity: 'clientes', operation: 'create', data: newCliente as unknown as Record<string, unknown>, timestamp: now });
        toast.info('Sem internet: cliente salvo e será sincronizado');
      }
      
      return newCliente;
    } catch (err: any) {
      console.error('[CLIENTES] create_fail', err);
      toast.error(`Falha ao salvar cliente: ${err.message || 'Tente novamente'}`);
      throw err;
    }
  }, [applyFiltersAndSort]);

  // Update cliente
  const update = useCallback(async (id: string, updates: Partial<Cliente>): Promise<Cliente | null> => {
    const now = new Date().toISOString();
    
    try {
      console.log('[CLIENTE] write_start', { id, projectRef, isOnline: getOnlineStatus() });
      const current = await localGet<Cliente>('clientes', id);
      if (!current) {
        console.error('[CLIENTE] write_fail', { id, error: 'not_found' });
        toast.error('Cliente não encontrado');
        return null;
      }
      
      const updatedCliente: Cliente = { ...current, ...updates, updated_at: now };
      await localPut('clientes', updatedCliente, false);
      setClientes(prev => prev.map(c => c.id === id ? updatedCliente : c));
      
      if (getOnlineStatus()) {
        const { error: syncError } = await supabase
          .from('clientes')
          .update({ ...updates, updated_at: now })
          .eq('id', id);
        
        if (syncError) {
          console.error('[CLIENTE] write_fail', { id, error: syncError, projectRef });
          await addToSyncQueue({ entity: 'clientes', operation: 'update', data: updatedCliente as unknown as Record<string, unknown>, timestamp: now });
          toast.warning('Sem internet: alteração salva e será sincronizada');
        } else {
          console.info('[CLIENTE] write_ok', { id, projectRef });
          await localPut('clientes', updatedCliente, true);
          toast.success('Cliente atualizado com sucesso!');
        }
      } else {
        console.log('[CLIENTE] queued_offline', { localId: id, projectRef });
        await addToSyncQueue({ entity: 'clientes', operation: 'update', data: updatedCliente as unknown as Record<string, unknown>, timestamp: now });
        toast.info('Sem internet: alteração salva e será sincronizada');
      }
      
      return updatedCliente;
    } catch (err: any) {
      console.error('[CLIENTES] update_fail', err);
      toast.error(`Falha ao atualizar cliente: ${err.message || 'Tente novamente'}`);
      throw err;
    }
  }, []);

  // Delete cliente
  const remove = useCallback(async (id: string): Promise<void> => {
    console.log('[CLIENTES] delete_start', { id });
    try {
      // 1. Optimistic remove from UI
      setClientes(prev => prev.filter(c => c.id !== id));

      // 2. Remove from IndexedDB
      try { await localDelete('clientes', id); } catch { /* ignore */ }
      
      if (getOnlineStatus()) {
        const { error: syncError } = await supabase.from('clientes').delete().eq('id', id);
        
        if (syncError && syncError.code !== 'PGRST116') {
          console.error('[CLIENTES] supabase_delete_fail', syncError);
          await addToSyncQueue({ entity: 'clientes', operation: 'delete', data: { id }, timestamp: new Date().toISOString() });
          toast.warning('Exclusão será sincronizada quando online');
        } else {
          console.info('[CLIENTES] delete_ok', { id });
          toast.success('Cliente excluído com sucesso!');
        }
      } else {
        console.log('[CLIENTES] queued_offline (delete)', { id });
        await addToSyncQueue({ entity: 'clientes', operation: 'delete', data: { id }, timestamp: new Date().toISOString() });
        toast.info('Sem internet: exclusão será sincronizada');
      }
    } catch (err: any) {
      console.error('[CLIENTES] delete_fail', err);
      toast.error(`Falha ao excluir cliente: ${err.message || 'Tente novamente'}`);
      throw err;
    }
  }, []);

  // Get by ID
  const getById = useCallback(async (id: string): Promise<Cliente | undefined> => {
    try {
      let cliente = await localGet<Cliente>('clientes', id);
      
      if (!cliente && getOnlineStatus()) {
        const { data: serverData } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (serverData) {
          cliente = serverData as Cliente;
          await localPut('clientes', cliente, true);
        }
      }
      
      return cliente;
    } catch (err) {
      console.error('[CLIENTES] getById_error', err);
      return undefined;
    }
  }, []);

  // Search clientes (for autocomplete)
  const searchClientes = useCallback(async (term: string): Promise<Cliente[]> => {
    if (term.length < 2) return [];
    
    try {
      const allClientes = await localGetAll<Cliente>('clientes');
      const normalizedTerm = removeAccents(term.toLowerCase());
      const termNumbers = term.replace(/\D/g, "");
      
      return allClientes
        .filter(c => c.ativo)
        .filter(c => {
          try {
            const nomeMatch = removeAccents(safeStr(c.nome).toLowerCase()).includes(normalizedTerm);
            const celularMatch = termNumbers && safeStr(c.celular).replace(/\D/g, "").includes(termNumbers);
            const cpfMatch = termNumbers && safeStr(c.cpf).replace(/\D/g, "").includes(termNumbers);
            return nomeMatch || celularMatch || cpfMatch;
          } catch { return false; }
        })
        .slice(0, 10);
    } catch {
      return [];
    }
  }, []);

  // Get recent clientes
  const getRecentClientes = useCallback(async (limit: number = 8): Promise<Cliente[]> => {
    try {
      const allClientes = await localGetAll<Cliente>('clientes');
      return allClientes
        .filter(c => c.ativo && c.ultima_visita)
        .sort((a, b) => new Date(b.ultima_visita!).getTime() - new Date(a.ultima_visita!).getTime())
        .slice(0, limit);
    } catch {
      return [];
    }
  }, []);

  return {
    clientes,
    loading,
    error,
    isOnline,
    refetch: fetchData,
    create,
    update,
    remove,
    getById,
    searchClientes,
    getRecentClientes,
  };
}
