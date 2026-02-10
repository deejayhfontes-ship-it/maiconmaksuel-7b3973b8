import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  localPut, 
  localGetAll, 
  localDelete, 
  localGet,
  addToSyncQueue 
} from '@/lib/offlineDb';

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
  const { toast } = useToast();

  // Load from local first, then sync with Supabase
  const loadProdutos = useCallback(async () => {
    setLoading(true);
    try {
      // Load from IndexedDB first for instant UI
      const localData = await localGetAll<Produto>('produtos');
      if (localData.length > 0) {
        setProdutos(localData.sort((a, b) => a.nome.localeCompare(b.nome)));
        console.log(`[Produtos] Carregados ${localData.length} do cache local`);
      }

      // Then sync with Supabase (source of truth)
      setSyncing(true);
      const { data: remoteData, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.error('[Produtos] Erro ao buscar do Supabase:', error);
        if (localData.length === 0) {
          toast({
            title: 'Modo offline',
            description: 'Usando dados locais. Sincronização pendente.',
          });
        }
      } else if (remoteData) {
        console.log(`[Produtos] Recebidos ${remoteData.length} do Supabase`);
        // Supabase is the source of truth: use remote data directly
        // and sync IndexedDB to match
        setProdutos(remoteData.sort((a, b) => a.nome.localeCompare(b.nome)));

        // Clear local store and replace with remote data to prevent
        // deleted items from reappearing
        try {
          const { localClear } = await import('@/lib/offlineDb');
          await localClear('produtos');
          for (const produto of remoteData) {
            await localPut('produtos', produto, true);
          }
          console.log(`[Produtos] Cache local sincronizado: ${remoteData.length} itens`);
        } catch (cacheErr) {
          console.warn('[Produtos] Falha ao atualizar cache local:', cacheErr);
        }
      }
    } catch (error) {
      console.error('[Produtos] Erro ao carregar:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [toast]);

  // mergeWithLocal removed — Supabase is source of truth when online

  // Create new product
  const createProduto = useCallback(async (data: ProdutoInput): Promise<Produto | null> => {
    const now = new Date().toISOString();
    const newProduto: Produto = {
      ...data,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };

    try {
      await localPut('produtos', newProduto);
      setProdutos((prev) => [...prev, newProduto].sort((a, b) => a.nome.localeCompare(b.nome)));

      const { data: remoteData, error } = await supabase
        .from('produtos')
        .insert([{
          id: newProduto.id,
          nome: newProduto.nome,
          descricao: newProduto.descricao,
          codigo_barras: newProduto.codigo_barras,
          preco_custo: newProduto.preco_custo,
          preco_venda: newProduto.preco_venda,
          estoque_atual: newProduto.estoque_atual,
          estoque_minimo: newProduto.estoque_minimo,
          categoria: newProduto.categoria,
          foto_url: newProduto.foto_url,
          ativo: newProduto.ativo,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error syncing to Supabase:', error);
        await addToSyncQueue({
          entity: 'produtos',
          operation: 'create',
          data: newProduto as unknown as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
        toast({
          title: 'Salvo localmente',
          description: 'Será sincronizado quando houver conexão.',
        });
      } else if (remoteData) {
        await localPut('produtos', remoteData);
        setProdutos((prev) =>
          prev.map((p) => (p.id === remoteData.id ? remoteData : p))
        );
      }

      return newProduto;
    } catch (error) {
      console.error('Error creating produto:', error);
      toast({
        title: 'Erro ao criar produto',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Update existing product
  const updateProduto = useCallback(async (
    id: string,
    data: Partial<ProdutoInput>
  ): Promise<Produto | null> => {
    const existing = produtos.find((p) => p.id === id);
    if (!existing) return null;

    const updated: Produto = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    try {
      await localPut('produtos', updated);
      setProdutos((prev) =>
        prev.map((p) => (p.id === id ? updated : p)).sort((a, b) => a.nome.localeCompare(b.nome))
      );

      const { data: remoteData, error } = await supabase
        .from('produtos')
        .update({
          nome: updated.nome,
          descricao: updated.descricao,
          codigo_barras: updated.codigo_barras,
          preco_custo: updated.preco_custo,
          preco_venda: updated.preco_venda,
          estoque_atual: updated.estoque_atual,
          estoque_minimo: updated.estoque_minimo,
          categoria: updated.categoria,
          foto_url: updated.foto_url,
          ativo: updated.ativo,
          updated_at: updated.updated_at,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error syncing update to Supabase:', error);
        await addToSyncQueue({
          entity: 'produtos',
          operation: 'update',
          data: updated as unknown as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
        toast({
          title: 'Atualizado localmente',
          description: 'Será sincronizado quando houver conexão.',
        });
      } else if (remoteData) {
        await localPut('produtos', remoteData);
        setProdutos((prev) =>
          prev.map((p) => (p.id === id ? remoteData : p))
        );
      }

      return updated;
    } catch (error) {
      console.error('Error updating produto:', error);
      toast({
        title: 'Erro ao atualizar produto',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    }
  }, [produtos, toast]);

  // Delete product
  const deleteProduto = useCallback(async (id: string): Promise<boolean> => {
    console.log(`[Produtos] Excluindo produto id=${id}`);
    try {
      // 1. Remove from UI immediately (optimistic)
      setProdutos((prev) => prev.filter((p) => p.id !== id));

      // 2. Remove from IndexedDB
      try {
        await localDelete('produtos', id);
        console.log(`[Produtos] Removido do IndexedDB: ${id}`);
      } catch (localErr) {
        console.warn('[Produtos] Falha ao remover do IndexedDB:', localErr);
      }

      // 3. Delete from Supabase
      const { error, count } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) {
        console.error('[Produtos] Erro ao excluir do Supabase:', error);
        await addToSyncQueue({
          entity: 'produtos',
          operation: 'delete',
          data: { id } as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
        toast({
          title: 'Excluído localmente',
          description: 'Será sincronizado quando houver conexão.',
        });
      } else {
        console.log(`[Produtos] Excluído do Supabase com sucesso: ${id}`);
      }

      return true;
    } catch (error) {
      console.error('[Produtos] Erro ao excluir produto:', error);
      toast({
        title: 'Erro ao excluir produto',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Deduct stock when product is sold (called from atendimentos)
  const deductStock = useCallback(async (
    productId: string,
    quantity: number
  ): Promise<boolean> => {
    const produto = produtos.find((p) => p.id === productId) || 
                   await localGet<Produto>('produtos', productId);
    
    if (!produto) {
      console.error('Product not found for stock deduction:', productId);
      return false;
    }

    const newStock = Math.max(0, produto.estoque_atual - quantity);
    const updated = await updateProduto(productId, { estoque_atual: newStock });
    
    if (updated && newStock < produto.estoque_minimo) {
      toast({
        title: 'Estoque baixo',
        description: `${produto.nome} está abaixo do estoque mínimo.`,
        variant: 'default',
      });
    }

    return !!updated;
  }, [produtos, updateProduto, toast]);

  // Add stock (for returns or restocking)
  const addStock = useCallback(async (
    productId: string,
    quantity: number
  ): Promise<boolean> => {
    const produto = produtos.find((p) => p.id === productId) ||
                   await localGet<Produto>('produtos', productId);
    
    if (!produto) {
      console.error('Product not found for stock addition:', productId);
      return false;
    }

    const newStock = produto.estoque_atual + quantity;
    const updated = await updateProduto(productId, { estoque_atual: newStock });
    
    return !!updated;
  }, [produtos, updateProduto]);

  // Search products
  const searchProdutos = useCallback((term: string): Produto[] => {
    if (!term) return produtos;
    const lower = term.toLowerCase();
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(lower) ||
        p.codigo_barras?.includes(term) ||
        p.categoria?.toLowerCase().includes(lower)
    );
  }, [produtos]);

  // Get products by category
  const getProdutosByCategoria = useCallback((categoria: string): Produto[] => {
    if (!categoria || categoria === 'todas') return produtos;
    return produtos.filter((p) => p.categoria === categoria);
  }, [produtos]);

  // Get active products only
  const getActiveProdutos = useCallback((): Produto[] => {
    return produtos.filter((p) => p.ativo);
  }, [produtos]);

  // Get products with low stock
  const getLowStockProdutos = useCallback((): Produto[] => {
    return produtos.filter((p) => p.estoque_atual < p.estoque_minimo);
  }, [produtos]);

  // Get product by ID
  const getProdutoById = useCallback((id: string): Produto | undefined => {
    return produtos.find((p) => p.id === id);
  }, [produtos]);

  // Get product by barcode
  const getProdutoByBarcode = useCallback((barcode: string): Produto | undefined => {
    return produtos.find((p) => p.codigo_barras === barcode);
  }, [produtos]);

  // Initial load
  useEffect(() => {
    loadProdutos();
  }, [loadProdutos]);

  return {
    produtos,
    loading,
    syncing,
    loadProdutos,
    createProduto,
    updateProduto,
    deleteProduto,
    deductStock,
    addStock,
    searchProdutos,
    getProdutosByCategoria,
    getActiveProdutos,
    getLowStockProdutos,
    getProdutoById,
    getProdutoByBarcode,
  };
}
