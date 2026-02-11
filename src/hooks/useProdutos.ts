import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  localPut, 
  localGetAll, 
  localDelete, 
  localGet,
  localClear,
  localBulkPut,
  addToSyncQueue,
  getSyncQueue,
} from '@/lib/offlineDb';
import { getOnlineStatus, addOnlineStatusListener } from '@/lib/syncService';
import { useRealtimeCallback } from '@/hooks/useRealtimeSubscription';

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  codigo_barras: string | null;
  preco_custo: number | null;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  categoria: string | null;
  foto_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type ProdutoInput = Omit<Produto, 'id' | 'created_at' | 'updated_at'>;

export function useProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Auto-refetch on reconnect
  useEffect(() => {
    const unsub = addOnlineStatusListener((online) => {
      if (online) {
        console.log('[PRODUTOS] online_reconnect → refetch');
        loadProdutos();
      }
    });
    return unsub;
  }, []);

  // Load from local first, then sync with Supabase (remote wins, tombstone-aware)
  const loadProdutos = useCallback(async () => {
    setLoading(true);
    try {
      // Load from IndexedDB first for instant UI
      const localData = await localGetAll<Produto>('produtos');
      
      // Get pending delete tombstones to filter them out
      const queue = await getSyncQueue();
      const deleteTombstoneIds = new Set(
        queue
          .filter(op => op.entity === 'produtos' && op.operation === 'delete')
          .map(op => op.data.id as string)
      );
      
      const filteredLocal = localData.filter(p => !deleteTombstoneIds.has(p.id));
      
      if (filteredLocal.length > 0) {
        setProdutos(filteredLocal.sort((a, b) => a.nome.localeCompare(b.nome)));
        console.log(`[PRODUTO] local_loaded { count: ${filteredLocal.length}, tombstones: ${deleteTombstoneIds.size} }`);
      }

      if (!getOnlineStatus()) {
        console.log('[PRODUTO] offline → using local data');
        if (filteredLocal.length === 0) toast.info('Modo offline: sem dados locais de produtos');
        setLoading(false);
        return;
      }

      // Supabase is source of truth when online
      setSyncing(true);
      const { data: remoteData, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.error('[PRODUTO] supabase_fetch_fail', error);
        toast.error(`Falha ao carregar produtos: ${error.message}`);
      } else if (remoteData) {
        // Filter out tombstoned items (pending offline deletes)
        const finalData = remoteData.filter(p => !deleteTombstoneIds.has(p.id));
        console.log(`[PRODUTO] supabase_fetch_ok { remote: ${remoteData.length}, after_tombstone_filter: ${finalData.length} }`);
        setProdutos(finalData.sort((a, b) => a.nome.localeCompare(b.nome)));

        // Clear local and replace — prevents deleted items from resurrecting
        try {
          await localClear('produtos');
          await localBulkPut('produtos', finalData);
        } catch (cacheErr) {
          console.warn('[PRODUTO] cache_sync_fail', cacheErr);
        }
      }
    } catch (error: any) {
      console.error('[PRODUTO] fetch_error', error);
      toast.error(`Erro ao carregar produtos: ${error.message}`);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  // Create new product
  const createProduto = useCallback(async (data: ProdutoInput): Promise<Produto | null> => {
    const now = new Date().toISOString();
    const newProduto: Produto = { ...data, id: crypto.randomUUID(), created_at: now, updated_at: now };

    try {
      await localPut('produtos', newProduto);
      setProdutos((prev) => [...prev, newProduto].sort((a, b) => a.nome.localeCompare(b.nome)));

      if (getOnlineStatus()) {
        const { data: remoteData, error } = await supabase
          .from('produtos')
          .upsert(newProduto, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (error) {
          console.error('[PRODUTOS] supabase_create_fail', error);
          await addToSyncQueue({ entity: 'produtos', operation: 'create', data: newProduto as unknown as Record<string, unknown>, timestamp: now });
          toast.warning('Sem internet: produto salvo e será sincronizado');
        } else {
          console.info('[PRODUTOS] supabase_create_ok', { id: remoteData?.id });
          if (remoteData) await localPut('produtos', remoteData, true);
          toast.success('Produto criado com sucesso!');
        }
      } else {
        console.log('[PRODUTOS] queued_offline', { localId: newProduto.id });
        await addToSyncQueue({ entity: 'produtos', operation: 'create', data: newProduto as unknown as Record<string, unknown>, timestamp: now });
        toast.info('Sem internet: produto salvo e será sincronizado');
      }

      return newProduto;
    } catch (error: any) {
      console.error('[PRODUTOS] create_fail', error);
      toast.error(`Falha ao criar produto: ${error.message}`);
      return null;
    }
  }, []);

  // Update existing product
  const updateProduto = useCallback(async (id: string, data: Partial<ProdutoInput>): Promise<Produto | null> => {
    const existing = produtos.find((p) => p.id === id) || await localGet<Produto>('produtos', id);
    if (!existing) { toast.error('Produto não encontrado'); return null; }

    const updated: Produto = { ...existing, ...data, updated_at: new Date().toISOString() };

    try {
      await localPut('produtos', updated);
      setProdutos((prev) => prev.map((p) => (p.id === id ? updated : p)).sort((a, b) => a.nome.localeCompare(b.nome)));

      if (getOnlineStatus()) {
        const { error } = await supabase.from('produtos').update({ ...data, updated_at: updated.updated_at }).eq('id', id);

        if (error) {
          console.error('[PRODUTOS] supabase_update_fail', error);
          await addToSyncQueue({ entity: 'produtos', operation: 'update', data: updated as unknown as Record<string, unknown>, timestamp: updated.updated_at });
          toast.warning('Sem internet: alteração salva e será sincronizada');
        } else {
          console.info('[PRODUTOS] supabase_update_ok', { id });
          await localPut('produtos', updated, true);
          toast.success('Produto atualizado com sucesso!');
        }
      } else {
        console.log('[PRODUTOS] queued_offline (update)', { id });
        await addToSyncQueue({ entity: 'produtos', operation: 'update', data: updated as unknown as Record<string, unknown>, timestamp: updated.updated_at });
        toast.info('Sem internet: alteração salva e será sincronizada');
      }

      return updated;
    } catch (error: any) {
      console.error('[PRODUTOS] update_fail', error);
      toast.error(`Falha ao atualizar produto: ${error.message}`);
      return null;
    }
  }, [produtos]);

  // Delete product — with rollback, tombstone, and forced refetch
  const deleteProduto = useCallback(async (id: string): Promise<boolean> => {
    const nome = produtos.find(p => p.id === id)?.nome || id;
    const isOnline = getOnlineStatus();
    console.log('[PRODUTO] delete_start', { id, nome, isOnline });

    // Optimistic UI removal + snapshot for rollback
    const snapshot = [...produtos];
    setProdutos((prev) => prev.filter((p) => p.id !== id));

    try {
      // Remove from local cache
      try { await localDelete('produtos', id); } catch { /* ok if missing */ }
      console.log('[PRODUTO] delete_local_ok', { id });

      if (isOnline) {
        let deleted = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const { data, error } = await supabase
            .from('produtos')
            .delete()
            .eq('id', id)
            .select('id')
            .maybeSingle();

          if (!error) {
            deleted = true;
            if (!data) {
              console.warn('[PRODUTO] delete_supabase_not_found', { id, attempt });
            }
            console.log('[PRODUTO] delete_supabase_ok', { id, attempt });
            break;
          }

          console.warn('[PRODUTO] delete_supabase_retry', { id, attempt, error: error.message });
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 500 * attempt));
          }
        }

        if (deleted) {
          toast.success('Produto excluído');
          await loadProdutos();
        } else {
          console.error('[PRODUTO] delete_supabase_all_retries_failed', { id });
          await addToSyncQueue({
            entity: 'produtos',
            operation: 'delete',
            data: { id } as Record<string, unknown>,
            timestamp: new Date().toISOString(),
          });
          toast.warning('Falha ao excluir no servidor. Será sincronizado depois.');
        }
      } else {
        // Offline: queue tombstone
        console.log('[PRODUTO] delete_queued_offline', { id });
        await addToSyncQueue({
          entity: 'produtos',
          operation: 'delete',
          data: { id } as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
        toast.info('Sem internet: exclusão será sincronizada');
      }

      return true;
    } catch (error: any) {
      console.error('[PRODUTO] delete_fail', { id, error: error.message });
      setProdutos(snapshot);
      toast.error(`Falha ao excluir produto: ${error.message}`);
      return false;
    }
  }, [produtos, loadProdutos]);

  // Deduct stock
  const deductStock = useCallback(async (productId: string, quantity: number): Promise<boolean> => {
    const produto = produtos.find((p) => p.id === productId) || await localGet<Produto>('produtos', productId);
    if (!produto) { console.error('[PRODUTOS] stock_deduct_not_found', productId); return false; }

    const newStock = Math.max(0, produto.estoque_atual - quantity);
    const updated = await updateProduto(productId, { estoque_atual: newStock });
    
    if (updated && newStock < produto.estoque_minimo) {
      toast.warning(`${produto.nome} está abaixo do estoque mínimo.`);
    }
    return !!updated;
  }, [produtos, updateProduto]);

  // Add stock
  const addStock = useCallback(async (productId: string, quantity: number): Promise<boolean> => {
    const produto = produtos.find((p) => p.id === productId) || await localGet<Produto>('produtos', productId);
    if (!produto) return false;
    return !!(await updateProduto(productId, { estoque_atual: produto.estoque_atual + quantity }));
  }, [produtos, updateProduto]);

  // Search products
  const searchProdutos = useCallback((term: string): Produto[] => {
    if (!term) return produtos;
    const lower = term.toLowerCase();
    return produtos.filter((p) => p.nome.toLowerCase().includes(lower) || p.codigo_barras?.includes(term) || p.categoria?.toLowerCase().includes(lower));
  }, [produtos]);

  const getProdutosByCategoria = useCallback((categoria: string): Produto[] => {
    if (!categoria || categoria === 'todas') return produtos;
    return produtos.filter((p) => p.categoria === categoria);
  }, [produtos]);

  const getActiveProdutos = useCallback((): Produto[] => produtos.filter((p) => p.ativo), [produtos]);
  const getLowStockProdutos = useCallback((): Produto[] => produtos.filter((p) => p.estoque_atual < p.estoque_minimo), [produtos]);
  const getProdutoById = useCallback((id: string): Produto | undefined => produtos.find((p) => p.id === id), [produtos]);
  const getProdutoByBarcode = useCallback((barcode: string): Produto | undefined => produtos.find((p) => p.codigo_barras === barcode), [produtos]);

  // Realtime: auto-refresh when produtos change in another tab/device
  useRealtimeCallback('produtos', loadProdutos);

  useEffect(() => { loadProdutos(); }, [loadProdutos]);

  return {
    produtos, loading, syncing, loadProdutos,
    createProduto, updateProduto, deleteProduto,
    deductStock, addStock, searchProdutos,
    getProdutosByCategoria, getActiveProdutos,
    getLowStockProdutos, getProdutoById, getProdutoByBarcode,
  };
}
