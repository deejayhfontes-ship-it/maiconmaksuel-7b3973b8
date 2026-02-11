import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  localPut, 
  localGetAll, 
  localDelete, 
  addToSyncQueue 
} from '@/lib/offlineDb';
import { useRealtimeCallback } from '@/hooks/useRealtimeSubscription';

export interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  duracao_minutos: number;
  preco: number;
  comissao_padrao: number;
  ativo: boolean;
  tipo_servico: string;
  apenas_agenda: boolean;
  gera_receita: boolean;
  gera_comissao: boolean;
  aparece_pdv: boolean;
  created_at: string;
  updated_at: string;
}

export type ServicoInput = Omit<Servico, 'id' | 'created_at' | 'updated_at'>;

export function useServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  // Load from local first, then sync with Supabase
  const loadServicos = useCallback(async () => {
    setLoading(true);
    try {
      // Load from IndexedDB first
      const localData = await localGetAll<Servico>('servicos');
      if (localData.length > 0) {
        setServicos(localData.sort((a, b) => a.nome.localeCompare(b.nome)));
      }

      // Then sync with Supabase
      setSyncing(true);
      const { data: remoteData, error } = await supabase
        .from('servicos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.error('Error fetching from Supabase:', error);
        // If remote fails, we still have local data
        if (localData.length === 0) {
          toast({
            title: 'Modo offline',
            description: 'Usando dados locais. Sincronização pendente.',
            variant: 'default',
          });
        }
      } else if (remoteData) {
        // Merge remote with local - remote wins for conflicts
        const mergedData = await mergeWithLocal(remoteData, localData);
        setServicos(mergedData.sort((a, b) => a.nome.localeCompare(b.nome)));
        
        // Update local storage with merged data
        for (const servico of mergedData) {
          await localPut('servicos', servico);
        }
      }
    } catch (error) {
      console.error('Error loading servicos:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [toast]);

  // Merge remote and local data, resolving conflicts by updated_at
  const mergeWithLocal = async (
    remote: Servico[],
    local: Servico[]
  ): Promise<Servico[]> => {
    const remoteMap = new Map(remote.map((s) => [s.id, s]));
    const localMap = new Map(local.map((s) => [s.id, s]));
    const merged: Servico[] = [];

    // Add all remote items, checking for local modifications
    for (const [id, remoteItem] of remoteMap) {
      const localItem = localMap.get(id);
      if (localItem) {
        // Compare updated_at to determine which is newer
        const remoteTime = new Date(remoteItem.updated_at).getTime();
        const localTime = new Date(localItem.updated_at).getTime();
        merged.push(remoteTime >= localTime ? remoteItem : localItem);
      } else {
        merged.push(remoteItem);
      }
    }

    // Add local-only items (created offline)
    for (const [id, localItem] of localMap) {
      if (!remoteMap.has(id)) {
        merged.push(localItem);
        // Queue for sync
        await addToSyncQueue({
          entity: 'servicos',
          operation: 'create',
          data: localItem as unknown as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return merged;
  };

  // Create new service
  const createServico = useCallback(async (data: ServicoInput): Promise<Servico | null> => {
    const now = new Date().toISOString();
    const newServico: Servico = {
      ...data,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };

    try {
      // Save locally first
      await localPut('servicos', newServico);
      setServicos((prev) => [...prev, newServico].sort((a, b) => a.nome.localeCompare(b.nome)));

      // Try to sync with Supabase
      const { data: remoteData, error } = await supabase
        .from('servicos')
        .insert([{
          id: newServico.id,
          nome: newServico.nome,
          descricao: newServico.descricao,
          categoria: newServico.categoria,
          duracao_minutos: newServico.duracao_minutos,
          preco: newServico.preco,
          comissao_padrao: newServico.comissao_padrao,
          ativo: newServico.ativo,
          tipo_servico: newServico.tipo_servico,
          apenas_agenda: newServico.apenas_agenda,
          gera_receita: newServico.gera_receita,
          gera_comissao: newServico.gera_comissao,
          aparece_pdv: newServico.aparece_pdv,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error syncing to Supabase:', error);
        // Queue for later sync
        await addToSyncQueue({
          entity: 'servicos',
          operation: 'create',
          data: newServico as unknown as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
        toast({
          title: 'Salvo localmente',
          description: 'Será sincronizado quando houver conexão.',
        });
      } else if (remoteData) {
        // Update local with server data
        await localPut('servicos', remoteData);
        setServicos((prev) =>
          prev.map((s) => (s.id === remoteData.id ? remoteData : s))
        );
      }

      return newServico;
    } catch (error) {
      console.error('Error creating servico:', error);
      toast({
        title: 'Erro ao criar serviço',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Update existing service
  const updateServico = useCallback(async (
    id: string,
    data: Partial<ServicoInput>
  ): Promise<Servico | null> => {
    // Try to find in local state first, then fetch from DB if not found
    let existing = servicos.find((s) => s.id === id);
    
    if (!existing) {
      // Fetch from Supabase if not in local state
      const { data: fetchedData } = await supabase
        .from('servicos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchedData) {
        existing = fetchedData as Servico;
      }
    }
    
    if (!existing) {
      console.error('Serviço não encontrado:', id);
      toast({
        title: 'Erro ao atualizar',
        description: 'Serviço não encontrado.',
        variant: 'destructive',
      });
      return null;
    }

    const updated: Servico = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    try {
      // Save locally first
      await localPut('servicos', updated);
      setServicos((prev) =>
        prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.nome.localeCompare(b.nome))
      );

      // Try to sync with Supabase
      const { data: remoteData, error } = await supabase
        .from('servicos')
        .update({
          nome: updated.nome,
          descricao: updated.descricao,
          categoria: updated.categoria,
          duracao_minutos: updated.duracao_minutos,
          preco: updated.preco,
          comissao_padrao: updated.comissao_padrao,
          ativo: updated.ativo,
          tipo_servico: updated.tipo_servico,
          apenas_agenda: updated.apenas_agenda,
          gera_receita: updated.gera_receita,
          gera_comissao: updated.gera_comissao,
          aparece_pdv: updated.aparece_pdv,
          updated_at: updated.updated_at,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error syncing update to Supabase:', error);
        await addToSyncQueue({
          entity: 'servicos',
          operation: 'update',
          data: updated as unknown as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
        toast({
          title: 'Atualizado localmente',
          description: 'Será sincronizado quando houver conexão.',
        });
      } else if (remoteData) {
        await localPut('servicos', remoteData);
        setServicos((prev) =>
          prev.map((s) => (s.id === id ? remoteData : s))
        );
      }

      return updated;
    } catch (error) {
      console.error('Error updating servico:', error);
      toast({
        title: 'Erro ao atualizar serviço',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    }
  }, [servicos, toast]);

  // Delete service
  const deleteServico = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Delete locally first
      await localDelete('servicos', id);
      setServicos((prev) => prev.filter((s) => s.id !== id));

      // Try to sync with Supabase
      const { error } = await supabase.from('servicos').delete().eq('id', id);

      if (error) {
        if (error.code === '23503') {
          // Foreign key violation — soft delete instead
          console.warn('[SERVICO] delete_fk_violation → soft_delete', { id });
          const { error: updateErr } = await supabase
            .from('servicos')
            .update({ ativo: false, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (updateErr) {
            console.error('[SERVICO] soft_delete_fail', updateErr);
            toast({
              title: 'Erro ao desativar serviço',
              description: 'Tente novamente.',
              variant: 'destructive',
            });
            return false;
          }

          // Reload to reflect soft-deleted state
          await loadServicos();
          toast({
            title: 'Serviço desativado',
            description: 'Serviço desativado (possui atendimentos vinculados).',
          });
        } else {
          console.error('Error syncing delete to Supabase:', error);
          await addToSyncQueue({
            entity: 'servicos',
            operation: 'delete',
            data: { id } as Record<string, unknown>,
            timestamp: new Date().toISOString(),
          });
          toast({
            title: 'Excluído localmente',
            description: 'Será sincronizado quando houver conexão.',
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting servico:', error);
      toast({
        title: 'Erro ao excluir serviço',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Search services
  const searchServicos = useCallback((term: string): Servico[] => {
    if (!term) return servicos;
    const lower = term.toLowerCase();
    return servicos.filter(
      (s) =>
        s.nome.toLowerCase().includes(lower) ||
        s.descricao?.toLowerCase().includes(lower) ||
        s.categoria?.toLowerCase().includes(lower)
    );
  }, [servicos]);

  // Get services by category
  const getServicosByCategoria = useCallback((categoria: string): Servico[] => {
    if (!categoria || categoria === 'todas') return servicos;
    return servicos.filter((s) => s.categoria === categoria);
  }, [servicos]);

  // Get active services only
  const getActiveServicos = useCallback((): Servico[] => {
    return servicos.filter((s) => s.ativo);
  }, [servicos]);

  // Get services for agenda (excluding PDV-only)
  const getServicosForAgenda = useCallback((): Servico[] => {
    return servicos.filter((s) => s.ativo);
  }, [servicos]);

  // Get services for PDV
  const getServicosForPDV = useCallback((): Servico[] => {
    return servicos.filter((s) => s.ativo && s.aparece_pdv);
  }, [servicos]);

  // Get service by ID
  const getServicoById = useCallback((id: string): Servico | undefined => {
    return servicos.find((s) => s.id === id);
  }, [servicos]);

  // Realtime: auto-refresh when servicos change in another tab/device
  useRealtimeCallback('servicos', loadServicos);

  // Initial load
  useEffect(() => {
    loadServicos();
  }, [loadServicos]);

  return {
    servicos,
    loading,
    syncing,
    loadServicos,
    createServico,
    updateServico,
    deleteServico,
    searchServicos,
    getServicosByCategoria,
    getActiveServicos,
    getServicosForAgenda,
    getServicosForPDV,
    getServicoById,
  };
}
