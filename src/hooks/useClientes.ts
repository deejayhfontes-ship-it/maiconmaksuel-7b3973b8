// Hook especializado para gerenciamento de clientes com offline-first
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  localGet,
  localGetAll,
  localPut,
  localDelete,
  addToSyncQueue,
} from '@/lib/offlineDb';
import {
  getOnlineStatus,
  addOnlineStatusListener,
  syncEntityFromServer,
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

// Função para remover acentos
const removeAccents = (str: string): string => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export function useClientes(options: UseClientesOptions = {}): UseClientesReturn {
  const { filter = 'todos', searchTerm = '', orderBy = 'nome', orderDirection = 'asc' } = options;
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());

  // Listen for online status changes
  useEffect(() => {
    return addOnlineStatusListener(setIsOnline);
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First, get local data
      let localData = await localGetAll<Cliente>('clientes');
      
      // Apply filter
      if (filter === 'ativos') {
        localData = localData.filter(c => c.ativo);
      } else if (filter === 'inativos') {
        localData = localData.filter(c => !c.ativo);
      }
      
      // Apply search
      if (searchTerm) {
        const term = removeAccents(searchTerm.toLowerCase());
        const termNumbers = searchTerm.replace(/\D/g, "");
        
        localData = localData.filter(c => {
          const nomeMatch = removeAccents(c.nome.toLowerCase()).includes(term);
          const emailMatch = c.email?.toLowerCase().includes(term);
          const celularClean = c.celular.replace(/\D/g, "");
          const telefoneClean = c.telefone?.replace(/\D/g, "") || "";
          const telefoneMatch = termNumbers && (celularClean.includes(termNumbers) || telefoneClean.includes(termNumbers));
          const cpfClean = c.cpf?.replace(/\D/g, "") || "";
          const cpfMatch = termNumbers && cpfClean.includes(termNumbers);
          
          return nomeMatch || emailMatch || telefoneMatch || cpfMatch;
        });
      }
      
      // Apply ordering
      localData.sort((a, b) => {
        let comparison = 0;
        
        switch (orderBy) {
          case 'nome':
            comparison = a.nome.localeCompare(b.nome);
            break;
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case 'ultima_visita':
            const aVisita = a.ultima_visita ? new Date(a.ultima_visita).getTime() : 0;
            const bVisita = b.ultima_visita ? new Date(b.ultima_visita).getTime() : 0;
            comparison = aVisita - bVisita;
            break;
        }
        
        return orderDirection === 'asc' ? comparison : -comparison;
      });
      
      setClientes(localData);
      
      // If online, sync from server
      if (isOnline) {
        await syncEntityFromServer<Cliente>('clientes');
        
        // Refetch and re-apply filters
        let updatedData = await localGetAll<Cliente>('clientes');
        
        if (filter === 'ativos') {
          updatedData = updatedData.filter(c => c.ativo);
        } else if (filter === 'inativos') {
          updatedData = updatedData.filter(c => !c.ativo);
        }
        
        if (searchTerm) {
          const term = removeAccents(searchTerm.toLowerCase());
          const termNumbers = searchTerm.replace(/\D/g, "");
          
          updatedData = updatedData.filter(c => {
            const nomeMatch = removeAccents(c.nome.toLowerCase()).includes(term);
            const emailMatch = c.email?.toLowerCase().includes(term);
            const celularClean = c.celular.replace(/\D/g, "");
            const telefoneClean = c.telefone?.replace(/\D/g, "") || "";
            const telefoneMatch = termNumbers && (celularClean.includes(termNumbers) || telefoneClean.includes(termNumbers));
            const cpfClean = c.cpf?.replace(/\D/g, "") || "";
            const cpfMatch = termNumbers && cpfClean.includes(termNumbers);
            
            return nomeMatch || emailMatch || telefoneMatch || cpfMatch;
          });
        }
        
        updatedData.sort((a, b) => {
          let comparison = 0;
          switch (orderBy) {
            case 'nome':
              comparison = a.nome.localeCompare(b.nome);
              break;
            case 'created_at':
              comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              break;
            case 'ultima_visita':
              const aVisita = a.ultima_visita ? new Date(a.ultima_visita).getTime() : 0;
              const bVisita = b.ultima_visita ? new Date(b.ultima_visita).getTime() : 0;
              comparison = aVisita - bVisita;
              break;
          }
          return orderDirection === 'asc' ? comparison : -comparison;
        });
        
        setClientes(updatedData);
      }
    } catch (err) {
      console.error('[useClientes] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm, orderBy, orderDirection, isOnline]);

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
      // Save locally first
      await localPut('clientes', newCliente, false);
      
      // Update state
      setClientes(prev => [newCliente, ...prev]);
      
      if (isOnline) {
        const { error: syncError } = await supabase.from('clientes').insert(newCliente);
        
        if (syncError) {
          console.error('[useClientes] Sync error:', syncError);
          await addToSyncQueue({
            entity: 'clientes',
            operation: 'create',
            data: newCliente as unknown as Record<string, unknown>,
            timestamp: now,
          });
          toast.info('Cliente salvo localmente. Será sincronizado quando online.');
        } else {
          await localPut('clientes', newCliente, true);
          toast.success('Cliente cadastrado com sucesso!');
        }
      } else {
        await addToSyncQueue({
          entity: 'clientes',
          operation: 'create',
          data: newCliente as unknown as Record<string, unknown>,
          timestamp: now,
        });
        toast.info('Cliente salvo localmente. Será sincronizado quando online.');
      }
      
      return newCliente;
    } catch (err) {
      console.error('[useClientes] Create error:', err);
      throw err;
    }
  }, [isOnline]);

  // Update cliente
  const update = useCallback(async (id: string, updates: Partial<Cliente>): Promise<Cliente | null> => {
    const now = new Date().toISOString();
    
    try {
      const current = await localGet<Cliente>('clientes', id);
      if (!current) return null;
      
      const updatedCliente: Cliente = {
        ...current,
        ...updates,
        updated_at: now,
      };
      
      await localPut('clientes', updatedCliente, false);
      
      setClientes(prev => prev.map(c => c.id === id ? updatedCliente : c));
      
      if (isOnline) {
        const { error: syncError } = await supabase
          .from('clientes')
          .update({ ...updates, updated_at: now })
          .eq('id', id);
        
        if (syncError) {
          console.error('[useClientes] Sync error:', syncError);
          await addToSyncQueue({
            entity: 'clientes',
            operation: 'update',
            data: updatedCliente as unknown as Record<string, unknown>,
            timestamp: now,
          });
        } else {
          await localPut('clientes', updatedCliente, true);
        }
      } else {
        await addToSyncQueue({
          entity: 'clientes',
          operation: 'update',
          data: updatedCliente as unknown as Record<string, unknown>,
          timestamp: now,
        });
      }
      
      return updatedCliente;
    } catch (err) {
      console.error('[useClientes] Update error:', err);
      throw err;
    }
  }, [isOnline]);

  // Delete cliente
  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      const cliente = await localGet<Cliente>('clientes', id);
      
      await localDelete('clientes', id);
      setClientes(prev => prev.filter(c => c.id !== id));
      
      if (isOnline) {
        const { error: syncError } = await supabase.from('clientes').delete().eq('id', id);
        
        if (syncError && syncError.code !== 'PGRST116') {
          console.error('[useClientes] Sync error:', syncError);
          if (cliente) {
            await addToSyncQueue({
              entity: 'clientes',
              operation: 'delete',
              data: { id },
              timestamp: new Date().toISOString(),
            });
          }
        }
      } else if (cliente) {
        await addToSyncQueue({
          entity: 'clientes',
          operation: 'delete',
          data: { id },
          timestamp: new Date().toISOString(),
        });
      }
      
      toast.success('Cliente excluído com sucesso!');
    } catch (err) {
      console.error('[useClientes] Delete error:', err);
      throw err;
    }
  }, [isOnline]);

  // Get by ID
  const getById = useCallback(async (id: string): Promise<Cliente | undefined> => {
    try {
      let cliente = await localGet<Cliente>('clientes', id);
      
      if (!cliente && isOnline) {
        const { data: serverData } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', id)
          .single();
        
        if (serverData) {
          cliente = serverData as Cliente;
          await localPut('clientes', cliente, true);
        }
      }
      
      return cliente;
    } catch (err) {
      console.error('[useClientes] GetById error:', err);
      return undefined;
    }
  }, [isOnline]);

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
          const nomeMatch = removeAccents(c.nome.toLowerCase()).includes(normalizedTerm);
          const celularMatch = termNumbers && c.celular.replace(/\D/g, "").includes(termNumbers);
          const cpfMatch = termNumbers && c.cpf?.replace(/\D/g, "").includes(termNumbers);
          return nomeMatch || celularMatch || cpfMatch;
        })
        .slice(0, 10);
    } catch {
      return [];
    }
  }, []);

  // Get recent clientes (for quick selection)
  const getRecentClientes = useCallback(async (limit: number = 8): Promise<Cliente[]> => {
    try {
      const allClientes = await localGetAll<Cliente>('clientes');
      
      return allClientes
        .filter(c => c.ativo && c.ultima_visita)
        .sort((a, b) => {
          const aVisita = new Date(a.ultima_visita!).getTime();
          const bVisita = new Date(b.ultima_visita!).getTime();
          return bVisita - aVisita;
        })
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
