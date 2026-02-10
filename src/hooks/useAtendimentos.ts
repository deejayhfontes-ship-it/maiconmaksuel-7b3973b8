// Offline-first hook for atendimentos (comandas) with Caixa integration
import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  localGet,
  localGetAll,
  localPut,
  localBulkPut,
  localDelete,
  addToSyncQueue,
} from '@/lib/offlineDb';
import {
  getOnlineStatus,
  addOnlineStatusListener,
} from '@/lib/syncService';
import { useToast } from '@/hooks/use-toast';

export interface Cliente {
  id: string;
  nome: string;
  elegivel_crediario?: boolean;
  limite_crediario?: number;
  dia_vencimento_crediario?: number;
}

export interface Servico {
  id: string;
  nome: string;
  preco: number;
  comissao_padrao: number;
}

export interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  estoque_atual: number;
}

export interface Profissional {
  id: string;
  nome: string;
  cor_agenda: string;
}

export interface Atendimento {
  id: string;
  numero_comanda: number;
  cliente_id: string | null;
  data_hora: string;
  subtotal: number;
  desconto: number;
  valor_final: number;
  status: 'aberto' | 'fechado' | 'cancelado';
  observacoes: string | null;
  nota_fiscal_id: string | null;
  nota_fiscal_solicitada: boolean;
  created_at?: string;
  updated_at?: string;
  cliente?: { nome: string } | null;
}

export interface AtendimentoServico {
  id: string;
  atendimento_id: string;
  servico_id: string;
  profissional_id: string;
  quantidade: number;
  preco_unitario: number;
  comissao_percentual: number;
  comissao_valor: number;
  subtotal: number;
  created_at?: string;
  servico?: { nome: string };
  profissional?: { nome: string };
}

export interface AtendimentoProduto {
  id: string;
  atendimento_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  created_at?: string;
  produto?: { nome: string };
}

export interface Pagamento {
  forma: string;
  valor: number;
  parcelas: number;
}

export interface Gorjeta {
  profissional_id: string;
  profissional_nome: string;
  valor: number;
}

interface UseAtendimentosReturn {
  atendimentos: Atendimento[];
  clientes: Cliente[];
  servicos: Servico[];
  produtos: Produto[];
  profissionais: Profissional[];
  loading: boolean;
  isOnline: boolean;
  pendingSync: number;
  refetch: () => Promise<void>;
  createComanda: () => Promise<Atendimento>;
  updateCliente: (atendimentoId: string, clienteId: string | null) => Promise<void>;
  addServico: (atendimentoId: string, data: Omit<AtendimentoServico, 'id' | 'atendimento_id' | 'created_at'>) => Promise<void>;
  addProduto: (atendimentoId: string, data: Omit<AtendimentoProduto, 'id' | 'atendimento_id' | 'created_at'>) => Promise<void>;
  removeServico: (id: string, atendimentoId: string) => Promise<void>;
  removeProduto: (id: string, atendimentoId: string) => Promise<void>;
  updateDesconto: (atendimentoId: string, desconto: number) => Promise<void>;
  fecharComanda: (atendimentoId: string, pagamentos: Pagamento[], gorjetas?: Gorjeta[]) => Promise<void>;
  cancelarComanda: (atendimentoId: string) => Promise<void>;
  getItemsServicos: (atendimentoId: string) => Promise<AtendimentoServico[]>;
  getItemsProdutos: (atendimentoId: string) => Promise<AtendimentoProduto[]>;
  recalcularTotais: (atendimentoId: string) => Promise<{ subtotal: number; valorFinal: number }>;
}

export function useAtendimentos(): UseAtendimentosReturn {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [pendingSync, setPendingSync] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Listen for online status changes
  useEffect(() => {
    return addOnlineStatusListener(setIsOnline);
  }, []);

  // Load related entities from local first
  const loadEntities = useCallback(async () => {
    try {
      // Load from local storage
      const [localClientes, localServicos, localProdutos, localProfissionais] = await Promise.all([
        localGetAll<Cliente>('clientes'),
        localGetAll<Servico>('servicos'),
        localGetAll<Produto>('produtos'),
        localGetAll<Profissional>('profissionais'),
      ]);

      setClientes(localClientes.filter(c => (c as any).ativo !== false));
      setServicos(localServicos.filter(s => (s as any).ativo !== false));
      setProdutos(localProdutos.filter(p => (p as any).ativo !== false));
      setProfissionais(localProfissionais.filter(p => (p as any).ativo !== false));

      // Sync from server if online
      if (isOnline) {
        const [serverClientes, serverServicos, serverProdutos, serverProfissionais] = await Promise.all([
          supabase.from('clientes').select('id, nome, elegivel_crediario, limite_crediario, dia_vencimento_crediario').eq('ativo', true).order('nome'),
          supabase.from('servicos').select('id, nome, preco, comissao_padrao').eq('ativo', true).order('nome'),
          supabase.from('produtos').select('id, nome, preco_venda, estoque_atual').eq('ativo', true).order('nome'),
          supabase.from('profissionais').select('id, nome, cor_agenda').eq('ativo', true).order('nome'),
        ]);

        if (serverClientes.data) {
          await localBulkPut('clientes', serverClientes.data as unknown as (Cliente & { id: string })[]);
          setClientes(serverClientes.data);
        }
        if (serverServicos.data) {
          await localBulkPut('servicos', serverServicos.data as unknown as (Servico & { id: string })[]);
          setServicos(serverServicos.data);
        }
        if (serverProdutos.data) {
          await localBulkPut('produtos', serverProdutos.data as unknown as (Produto & { id: string })[]);
          setProdutos(serverProdutos.data);
        }
        if (serverProfissionais.data) {
          await localBulkPut('profissionais', serverProfissionais.data as unknown as (Profissional & { id: string })[]);
          setProfissionais(serverProfissionais.data);
        }
      }
    } catch (err) {
      console.error('[useAtendimentos] Error loading entities:', err);
    }
  }, [isOnline]);

  // Fetch open comandas
  const fetchAtendimentos = useCallback(async () => {
    setLoading(true);
    
    try {
      // Load from local first
      const localData = await localGetAll<Atendimento>('atendimentos');
      const openLocal = localData.filter(a => a.status === 'aberto');
      
      // Enrich with client names from local storage
      const clientesMap = new Map(clientes.map(c => [c.id, c]));
      const enriched = openLocal.map(a => ({
        ...a,
        cliente: a.cliente_id ? { nome: clientesMap.get(a.cliente_id)?.nome || 'Cliente' } : null,
      }));
      
      setAtendimentos(enriched.sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()));

      // Sync from server if online
      if (isOnline) {
        const { data: serverData, error } = await supabase
          .from('atendimentos')
          .select('*, cliente:clientes(nome)')
          .eq('status', 'aberto')
          .order('data_hora', { ascending: false });

        if (!error && serverData) {
          // Save to local
          await localBulkPut('atendimentos', serverData.map(a => ({ ...a, cliente: undefined })) as unknown as (Atendimento & { id: string })[]);
          setAtendimentos(serverData as Atendimento[]);
        }
      }
    } catch (err) {
      console.error('[useAtendimentos] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isOnline, clientes]);

  // Initial load
  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  useEffect(() => {
    if (clientes.length > 0) {
      fetchAtendimentos();
    }
  }, [fetchAtendimentos, clientes.length]);

  // Create new comanda
  const createComanda = useCallback(async (): Promise<Atendimento> => {
    const now = new Date().toISOString();
    
    // Generate comanda number (simple increment for offline, server will handle sequence)
    const existingNumbers = atendimentos.map(a => a.numero_comanda);
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    
    const newAtendimento: Atendimento = {
      id: crypto.randomUUID(),
      numero_comanda: nextNumber,
      cliente_id: null,
      data_hora: now,
      subtotal: 0,
      desconto: 0,
      valor_final: 0,
      status: 'aberto',
      observacoes: null,
      nota_fiscal_id: null,
      nota_fiscal_solicitada: false,
      created_at: now,
      updated_at: now,
    };

    try {
      // Save locally first
      await localPut('atendimentos', newAtendimento, false);
      setAtendimentos(prev => [newAtendimento, ...prev]);

      if (isOnline) {
        const { data, error } = await supabase
          .from('atendimentos')
          .insert([{
            cliente_id: null,
            status: 'aberto',
          }])
          .select('*, cliente:clientes(nome)')
          .single();

        if (error) {
          console.error('[useAtendimentos] Create sync error:', error);
          await addToSyncQueue({
            entity: 'atendimentos',
            operation: 'create',
            data: newAtendimento as unknown as Record<string, unknown>,
            timestamp: now,
          });
          setPendingSync(prev => prev + 1);
        } else {
          // Update with server-generated data
          await localPut('atendimentos', { ...data, cliente: undefined }, true);
          setAtendimentos(prev => prev.map(a => a.id === newAtendimento.id ? (data as Atendimento) : a));
          return data as Atendimento;
        }
      } else {
        await addToSyncQueue({
          entity: 'atendimentos',
          operation: 'create',
          data: newAtendimento as unknown as Record<string, unknown>,
          timestamp: now,
        });
        setPendingSync(prev => prev + 1);
      }

      return newAtendimento;
    } catch (err) {
      console.error('[useAtendimentos] Create error:', err);
      throw err;
    }
  }, [isOnline, atendimentos]);

  // Update cliente
  const updateCliente = useCallback(async (atendimentoId: string, clienteId: string | null): Promise<void> => {
    const now = new Date().toISOString();
    const cliente = clientes.find(c => c.id === clienteId);

    try {
      const current = await localGet<Atendimento>('atendimentos', atendimentoId);
      if (!current) return;

      const updated = { ...current, cliente_id: clienteId, updated_at: now };
      await localPut('atendimentos', updated, false);
      setAtendimentos(prev => prev.map(a => 
        a.id === atendimentoId 
          ? { ...a, cliente_id: clienteId, cliente: cliente ? { nome: cliente.nome } : null }
          : a
      ));

      if (isOnline) {
        const { error } = await supabase
          .from('atendimentos')
          .update({ cliente_id: clienteId })
          .eq('id', atendimentoId);

        if (error) {
          await addToSyncQueue({
            entity: 'atendimentos',
            operation: 'update',
            data: updated as unknown as Record<string, unknown>,
            timestamp: now,
          });
          setPendingSync(prev => prev + 1);
        } else {
          await localPut('atendimentos', updated, true);
        }
      } else {
        await addToSyncQueue({
          entity: 'atendimentos',
          operation: 'update',
          data: updated as unknown as Record<string, unknown>,
          timestamp: now,
        });
        setPendingSync(prev => prev + 1);
      }
    } catch (err) {
      console.error('[useAtendimentos] Update cliente error:', err);
      throw err;
    }
  }, [isOnline, clientes]);

  // Add servico
  const addServico = useCallback(async (
    atendimentoId: string,
    data: Omit<AtendimentoServico, 'id' | 'atendimento_id' | 'created_at'>
  ): Promise<void> => {
    const now = new Date().toISOString();
    const newItem: AtendimentoServico = {
      ...data,
      id: crypto.randomUUID(),
      atendimento_id: atendimentoId,
      created_at: now,
    };

    try {
      await localPut('atendimento_servicos', newItem, false);

      if (isOnline) {
        const { error } = await supabase.from('atendimento_servicos').insert([{
          atendimento_id: atendimentoId,
          servico_id: data.servico_id,
          profissional_id: data.profissional_id,
          quantidade: data.quantidade,
          preco_unitario: data.preco_unitario,
          comissao_percentual: data.comissao_percentual,
          comissao_valor: data.comissao_valor,
          subtotal: data.subtotal,
        }]);

        if (error) {
          await addToSyncQueue({
            entity: 'atendimento_servicos',
            operation: 'create',
            data: newItem as unknown as Record<string, unknown>,
            timestamp: now,
          });
          setPendingSync(prev => prev + 1);
        } else {
          await localPut('atendimento_servicos', newItem, true);
        }
      } else {
        await addToSyncQueue({
          entity: 'atendimento_servicos',
          operation: 'create',
          data: newItem as unknown as Record<string, unknown>,
          timestamp: now,
        });
        setPendingSync(prev => prev + 1);
      }

      // Recalculate totals
      await recalcularTotais(atendimentoId);
    } catch (err) {
      console.error('[useAtendimentos] Add servico error:', err);
      throw err;
    }
  }, [isOnline]);

  // Add produto
  const addProduto = useCallback(async (
    atendimentoId: string,
    data: Omit<AtendimentoProduto, 'id' | 'atendimento_id' | 'created_at'>
  ): Promise<void> => {
    const now = new Date().toISOString();
    const newItem: AtendimentoProduto = {
      ...data,
      id: crypto.randomUUID(),
      atendimento_id: atendimentoId,
      created_at: now,
    };

    try {
      await localPut('atendimento_produtos', newItem, false);

      if (isOnline) {
        const { error } = await supabase.from('atendimento_produtos').insert([{
          atendimento_id: atendimentoId,
          produto_id: data.produto_id,
          quantidade: data.quantidade,
          preco_unitario: data.preco_unitario,
          subtotal: data.subtotal,
        }]);

        if (error) {
          await addToSyncQueue({
            entity: 'atendimento_produtos',
            operation: 'create',
            data: newItem as unknown as Record<string, unknown>,
            timestamp: now,
          });
          setPendingSync(prev => prev + 1);
        } else {
          await localPut('atendimento_produtos', newItem, true);
        }
      } else {
        await addToSyncQueue({
          entity: 'atendimento_produtos',
          operation: 'create',
          data: newItem as unknown as Record<string, unknown>,
          timestamp: now,
        });
        setPendingSync(prev => prev + 1);
      }

      await recalcularTotais(atendimentoId);
    } catch (err) {
      console.error('[useAtendimentos] Add produto error:', err);
      throw err;
    }
  }, [isOnline]);

  // Remove servico
  const removeServico = useCallback(async (id: string, atendimentoId: string): Promise<void> => {
    try {
      await localDelete('atendimento_servicos', id);

      if (isOnline) {
        const { error } = await supabase.from('atendimento_servicos').delete().eq('id', id);
        if (error) {
          await addToSyncQueue({
            entity: 'atendimento_servicos',
            operation: 'delete',
            data: { id } as Record<string, unknown>,
            timestamp: new Date().toISOString(),
          });
          setPendingSync(prev => prev + 1);
        }
      } else {
        await addToSyncQueue({
          entity: 'atendimento_servicos',
          operation: 'delete',
          data: { id } as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
        setPendingSync(prev => prev + 1);
      }

      await recalcularTotais(atendimentoId);
    } catch (err) {
      console.error('[useAtendimentos] Remove servico error:', err);
      throw err;
    }
  }, [isOnline]);

  // Remove produto
  const removeProduto = useCallback(async (id: string, atendimentoId: string): Promise<void> => {
    try {
      await localDelete('atendimento_produtos', id);

      if (isOnline) {
        const { error } = await supabase.from('atendimento_produtos').delete().eq('id', id);
        if (error) {
          await addToSyncQueue({
            entity: 'atendimento_produtos',
            operation: 'delete',
            data: { id } as Record<string, unknown>,
            timestamp: new Date().toISOString(),
          });
          setPendingSync(prev => prev + 1);
        }
      } else {
        await addToSyncQueue({
          entity: 'atendimento_produtos',
          operation: 'delete',
          data: { id } as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        });
        setPendingSync(prev => prev + 1);
      }

      await recalcularTotais(atendimentoId);
    } catch (err) {
      console.error('[useAtendimentos] Remove produto error:', err);
      throw err;
    }
  }, [isOnline]);

  // Update desconto
  const updateDesconto = useCallback(async (atendimentoId: string, desconto: number): Promise<void> => {
    const now = new Date().toISOString();

    try {
      const current = await localGet<Atendimento>('atendimentos', atendimentoId);
      if (!current) return;

      const valorFinal = Math.max(0, current.subtotal - desconto);
      const updated = { ...current, desconto, valor_final: valorFinal, updated_at: now };
      
      await localPut('atendimentos', updated, false);
      setAtendimentos(prev => prev.map(a => 
        a.id === atendimentoId ? { ...a, desconto, valor_final: valorFinal } : a
      ));

      if (isOnline) {
        const { error } = await supabase
          .from('atendimentos')
          .update({ desconto, valor_final: valorFinal })
          .eq('id', atendimentoId);

        if (!error) {
          await localPut('atendimentos', updated, true);
        }
      }
    } catch (err) {
      console.error('[useAtendimentos] Update desconto error:', err);
    }
  }, [isOnline]);

  // Recalculate totals
  const recalcularTotais = useCallback(async (atendimentoId: string): Promise<{ subtotal: number; valorFinal: number }> => {
    try {
      const [itemsServicos, itemsProdutos] = await Promise.all([
        getItemsServicos(atendimentoId),
        getItemsProdutos(atendimentoId),
      ]);

      const subtotal = [...itemsServicos, ...itemsProdutos].reduce(
        (acc, item) => acc + Number(item.subtotal),
        0
      );

      const current = await localGet<Atendimento>('atendimentos', atendimentoId);
      const desconto = current?.desconto || 0;
      const valorFinal = Math.max(0, subtotal - desconto);

      if (current) {
        const updated = { ...current, subtotal, valor_final: valorFinal, updated_at: new Date().toISOString() };
        await localPut('atendimentos', updated, false);
        setAtendimentos(prev => prev.map(a => 
          a.id === atendimentoId ? { ...a, subtotal, valor_final: valorFinal } : a
        ));

        if (isOnline) {
          await supabase
            .from('atendimentos')
            .update({ subtotal, valor_final: valorFinal })
            .eq('id', atendimentoId);
        }
      }

      return { subtotal, valorFinal };
    } catch (err) {
      console.error('[useAtendimentos] Recalcular totais error:', err);
      return { subtotal: 0, valorFinal: 0 };
    }
  }, [isOnline]);

  // Get items servicos
  const getItemsServicos = useCallback(async (atendimentoId: string): Promise<AtendimentoServico[]> => {
    try {
      // Try local first
      const localItems = await localGetAll<AtendimentoServico>('atendimento_servicos');
      const filtered = localItems.filter(i => i.atendimento_id === atendimentoId);

      if (isOnline) {
        const { data } = await supabase
          .from('atendimento_servicos')
          .select('*, servico:servicos(nome), profissional:profissionais(nome)')
          .eq('atendimento_id', atendimentoId);

        if (data) {
          return data;
        }
      }

      // Enrich with names from local
      const servicosMap = new Map(servicos.map(s => [s.id, s]));
      const profissionaisMap = new Map(profissionais.map(p => [p.id, p]));
      
      return filtered.map(item => ({
        ...item,
        servico: { nome: servicosMap.get(item.servico_id)?.nome || 'Serviço' },
        profissional: { nome: profissionaisMap.get(item.profissional_id)?.nome || 'Profissional' },
      }));
    } catch (err) {
      console.error('[useAtendimentos] Get items servicos error:', err);
      return [];
    }
  }, [isOnline, servicos, profissionais]);

  // Get items produtos
  const getItemsProdutos = useCallback(async (atendimentoId: string): Promise<AtendimentoProduto[]> => {
    try {
      const localItems = await localGetAll<AtendimentoProduto>('atendimento_produtos');
      const filtered = localItems.filter(i => i.atendimento_id === atendimentoId);

      if (isOnline) {
        const { data } = await supabase
          .from('atendimento_produtos')
          .select('*, produto:produtos(nome)')
          .eq('atendimento_id', atendimentoId);

        if (data) {
          return data;
        }
      }

      const produtosMap = new Map(produtos.map(p => [p.id, p]));
      return filtered.map(item => ({
        ...item,
        produto: { nome: produtosMap.get(item.produto_id)?.nome || 'Produto' },
      }));
    } catch (err) {
      console.error('[useAtendimentos] Get items produtos error:', err);
      return [];
    }
  }, [isOnline, produtos]);

  // Fechar comanda with Caixa integration
  const fecharComanda = useCallback(async (
    atendimentoId: string,
    pagamentos: Pagamento[],
    gorjetas?: Gorjeta[]
  ): Promise<void> => {
    const now = new Date().toISOString();

    try {
      const current = await localGet<Atendimento>('atendimentos', atendimentoId);
      if (!current) throw new Error('Atendimento não encontrado');

      const itemsProdutos = await getItemsProdutos(atendimentoId);

      // Check for open caixa
      let caixaId: string | null = null;
      if (isOnline) {
        const { data: caixaAberto } = await supabase
          .from('caixa')
          .select('id')
          .eq('status', 'aberto')
          .single();
        caixaId = caixaAberto?.id || null;
      }

      // Process payments
      for (const pag of pagamentos) {
        const pagamentoData = {
          id: crypto.randomUUID(),
          atendimento_id: atendimentoId,
          forma_pagamento: pag.forma,
          valor: pag.valor,
          parcelas: pag.parcelas,
          data_hora: now,
        };

        await localPut('pagamentos', pagamentoData, false);

        if (isOnline) {
          await supabase.from('pagamentos').insert([{
            atendimento_id: atendimentoId,
            forma_pagamento: pag.forma,
            valor: pag.valor,
            parcelas: pag.parcelas,
          }]);

          // Create divida for fiado
          if (pag.forma === 'fiado' && current.cliente_id) {
            const cliente = clientes.find(c => c.id === current.cliente_id);
            const diaVencimento = cliente?.dia_vencimento_crediario || 10;
            const hoje = new Date();
            let dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
            if (dataVencimento <= hoje) {
              dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento);
            }

            await supabase.from('dividas').insert([{
              cliente_id: current.cliente_id,
              atendimento_id: atendimentoId,
              valor_original: pag.valor,
              valor_pago: 0,
              saldo: pag.valor,
              data_origem: now,
              data_vencimento: dataVencimento.toISOString(),
              status: 'aberta',
              observacoes: `Comanda #${current.numero_comanda.toString().padStart(3, '0')} - Fiado`,
            }]);
          }

          // Register caixa movement (except fiado)
          if (caixaId && pag.forma !== 'fiado') {
            await supabase.from('caixa_movimentacoes').insert([{
              caixa_id: caixaId,
              tipo: 'entrada',
              categoria: 'atendimento',
              descricao: `Comanda #${current.numero_comanda.toString().padStart(3, '0')} - ${pag.forma}`,
              valor: pag.valor,
              forma_pagamento: pag.forma,
              atendimento_id: atendimentoId,
            }]);
          }
        } else {
          await addToSyncQueue({
            entity: 'pagamentos',
            operation: 'create',
            data: pagamentoData as unknown as Record<string, unknown>,
            timestamp: now,
          });
          setPendingSync(prev => prev + 1);
        }
      }

      // Process gorjetas
      if (gorjetas && gorjetas.length > 0) {
        for (const gorjeta of gorjetas) {
          const gorjetaData = {
            id: crypto.randomUUID(),
            profissional_id: gorjeta.profissional_id,
            atendimento_id: atendimentoId,
            valor: gorjeta.valor,
            data: now,
            repassada: false,
          };

          await localPut('gorjetas', gorjetaData, false);

          if (isOnline) {
            await supabase.from('gorjetas').insert([{
              profissional_id: gorjeta.profissional_id,
              atendimento_id: atendimentoId,
              valor: gorjeta.valor,
              data: now,
              repassada: false,
            }]);
          } else {
            await addToSyncQueue({
              entity: 'gorjetas',
              operation: 'create',
              data: gorjetaData as unknown as Record<string, unknown>,
              timestamp: now,
            });
            setPendingSync(prev => prev + 1);
          }
        }
      }

      // Update product stock
      for (const item of itemsProdutos) {
        const produto = produtos.find(p => p.id === item.produto_id);
        if (produto) {
          const newStock = Math.max(0, produto.estoque_atual - item.quantidade);
          
          if (isOnline) {
            await supabase.from('produtos').update({
              estoque_atual: newStock,
            }).eq('id', item.produto_id);
          }

          // Update local stock
          const localProduto = await localGet<Produto>('produtos', item.produto_id);
          if (localProduto) {
            await localPut('produtos', { ...localProduto, estoque_atual: newStock }, false);
          }
        }
      }

      // Update cliente last visit
      if (current.cliente_id && isOnline) {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('total_visitas')
          .eq('id', current.cliente_id)
          .single();

        await supabase.from('clientes').update({
          ultima_visita: now,
          total_visitas: (clienteData?.total_visitas || 0) + 1,
        }).eq('id', current.cliente_id);
      }

      // Close atendimento
      const closed: Atendimento = { ...current, status: 'fechado', updated_at: now };
      await localPut('atendimentos', closed, false);
      setAtendimentos(prev => prev.filter(a => a.id !== atendimentoId));

      if (isOnline) {
        await supabase.from('atendimentos').update({
          status: 'fechado',
          subtotal: current.subtotal,
          desconto: current.desconto,
          valor_final: current.valor_final,
        }).eq('id', atendimentoId);
        
        await localPut('atendimentos', closed, true);
      } else {
        await addToSyncQueue({
          entity: 'atendimentos',
          operation: 'update',
          data: closed as unknown as Record<string, unknown>,
          timestamp: now,
        });
        setPendingSync(prev => prev + 1);
      }

      toast({
        title: `Comanda #${current.numero_comanda.toString().padStart(3, '0')} fechada!`,
        description: `Total: R$ ${current.valor_final.toFixed(2)}`,
      });

      // Invalidate all relevant React Query caches
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['caixa'] });
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['atendimentos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    } catch (err) {
      console.error('[useAtendimentos] Fechar comanda error:', err);
      throw err;
    }
  }, [isOnline, clientes, produtos, getItemsProdutos, toast]);

  // Cancelar comanda
  const cancelarComanda = useCallback(async (atendimentoId: string): Promise<void> => {
    const now = new Date().toISOString();

    try {
      const current = await localGet<Atendimento>('atendimentos', atendimentoId);
      if (!current) return;

      const cancelled: Atendimento = { ...current, status: 'cancelado', updated_at: now };
      await localPut('atendimentos', cancelled, false);
      setAtendimentos(prev => prev.filter(a => a.id !== atendimentoId));

      if (isOnline) {
        await supabase.from('atendimentos').update({ status: 'cancelado' }).eq('id', atendimentoId);
        await localPut('atendimentos', cancelled, true);
      } else {
        await addToSyncQueue({
          entity: 'atendimentos',
          operation: 'update',
          data: cancelled as unknown as Record<string, unknown>,
          timestamp: now,
        });
        setPendingSync(prev => prev + 1);
      }

      toast({ title: 'Comanda cancelada' });
    } catch (err) {
      console.error('[useAtendimentos] Cancelar comanda error:', err);
      throw err;
    }
  }, [isOnline, toast]);

  return {
    atendimentos,
    clientes,
    servicos,
    produtos,
    profissionais,
    loading,
    isOnline,
    pendingSync,
    refetch: fetchAtendimentos,
    createComanda,
    updateCliente,
    addServico,
    addProduto,
    removeServico,
    removeProduto,
    updateDesconto,
    fecharComanda,
    cancelarComanda,
    getItemsServicos,
    getItemsProdutos,
    recalcularTotais,
  };
}
