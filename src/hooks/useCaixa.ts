import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  localGetAll,
  localPut,
  localBulkPut,
  addToSyncQueue,
  getMetadata,
  setMetadata,
  EntityStore,
} from '@/lib/offlineDb';
import { useToast } from '@/hooks/use-toast';

// Types
export interface Caixa {
  id: string;
  data_abertura: string;
  data_fechamento: string | null;
  valor_inicial: number;
  valor_final: number | null;
  valor_esperado: number | null;
  diferenca: number | null;
  status: 'aberto' | 'fechado';
  observacoes_abertura: string | null;
  observacoes_fechamento: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaixaMovimentacao {
  id: string;
  caixa_id: string;
  tipo: 'entrada' | 'saida' | 'sangria' | 'reforco';
  categoria: string | null;
  descricao: string;
  valor: number;
  forma_pagamento: 'dinheiro' | 'debito' | 'credito' | 'pix' | 'fiado' | 'cheque' | null;
  atendimento_id: string | null;
  data_hora: string;
}

export interface DespesaRapida {
  id: string;
  caixa_id: string | null;
  descricao: string;
  categoria: string;
  valor: number;
  pago_por: 'caixa' | 'dono';
  observacoes: string | null;
  data_hora: string;
}

export interface CaixaTotais {
  valorInicial: number;
  entradas: number;
  saidas: number;
  saldo: number;
  dinheiro: number;
  debito: number;
  credito: number;
  pix: number;
  fiado: number;
  cheque: number;
  saldoDinheiro: number;
  despesas: number;
  totalVendas: number;
}

interface UseCaixaReturn {
  // State
  caixaAberto: Caixa | null;
  movimentacoes: CaixaMovimentacao[];
  despesas: DespesaRapida[];
  totais: CaixaTotais;
  loading: boolean;
  syncing: boolean;
  isOnline: boolean;
  lastSync: Date | null;
  
  // Actions
  abrirCaixa: (valorInicial: number, observacoes?: string) => Promise<Caixa | null>;
  fecharCaixa: (valorContado: number, observacoes?: string) => Promise<boolean>;
  registrarEntrada: (data: Omit<CaixaMovimentacao, 'id' | 'caixa_id' | 'tipo' | 'data_hora'>) => Promise<boolean>;
  registrarSaida: (data: Omit<CaixaMovimentacao, 'id' | 'caixa_id' | 'tipo' | 'data_hora'>) => Promise<boolean>;
  registrarSangria: (valor: number, motivo: string) => Promise<boolean>;
  registrarReforco: (valor: number, motivo: string) => Promise<boolean>;
  registrarDespesa: (data: Omit<DespesaRapida, 'id' | 'data_hora'>) => Promise<boolean>;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export function useCaixa(): UseCaixaReturn {
  const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<CaixaMovimentacao[]>([]);
  const [despesas, setDespesas] = useState<DespesaRapida[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const { toast } = useToast();

  // Calculate totals
  const totais = useMemo((): CaixaTotais => {
    const valorInicial = Number(caixaAberto?.valor_inicial || 0);
    
    const entradas = movimentacoes
      .filter(m => m.tipo === 'entrada' || m.tipo === 'reforco')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    
    const saidas = movimentacoes
      .filter(m => m.tipo === 'saida' || m.tipo === 'sangria')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    
    const dinheiro = movimentacoes
      .filter(m => m.forma_pagamento === 'dinheiro' && m.tipo === 'entrada')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    
    const debito = movimentacoes
      .filter(m => m.forma_pagamento === 'debito' && m.tipo === 'entrada')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    
    const credito = movimentacoes
      .filter(m => m.forma_pagamento === 'credito' && m.tipo === 'entrada')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    
    const pix = movimentacoes
      .filter(m => m.forma_pagamento === 'pix' && m.tipo === 'entrada')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    
    const fiado = movimentacoes
      .filter(m => m.forma_pagamento === 'fiado' && m.tipo === 'entrada')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    
    const cheque = movimentacoes
      .filter(m => m.forma_pagamento === 'cheque' && m.tipo === 'entrada')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    
    const despesasCaixa = despesas
      .filter(d => d.pago_por === 'caixa')
      .reduce((acc, d) => acc + Number(d.valor), 0);
    
    const saldo = valorInicial + entradas - saidas;
    const saldoDinheiro = valorInicial + dinheiro - saidas;
    const totalVendas = dinheiro + debito + credito + pix + fiado + cheque;
    
    return {
      valorInicial,
      entradas,
      saidas,
      saldo,
      dinheiro,
      debito,
      credito,
      pix,
      fiado,
      cheque,
      saldoDinheiro,
      despesas: despesasCaixa,
      totalVendas,
    };
  }, [caixaAberto, movimentacoes, despesas]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from local storage first, then sync with server
  const loadLocalData = useCallback(async () => {
    try {
      // Load caixa records
      const localCaixas = await localGetAll<Caixa>('caixa');
      const aberto = localCaixas.find(c => c.status === 'aberto');
      setCaixaAberto(aberto || null);
      
      if (aberto) {
        // Load movimentações for open caixa
        const localMovs = await localGetAll<CaixaMovimentacao>('caixa_movimentacoes');
        const caixaMovs = localMovs.filter(m => m.caixa_id === aberto.id);
        setMovimentacoes(caixaMovs);
      }
      
      // Load today's expenses
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const localDespesas = await localGetAll<DespesaRapida>('despesas_rapidas' as EntityStore);
      const despesasHoje = localDespesas.filter(d => new Date(d.data_hora) >= hoje);
      setDespesas(despesasHoje);
      
      // Get last sync time
      const lastSyncTime = await getMetadata('caixa_last_sync') as string;
      if (lastSyncTime) {
        setLastSync(new Date(lastSyncTime));
      }
    } catch (error) {
      console.error('Error loading local caixa data:', error);
    }
  }, []);

  // Sync with server
  const syncWithServer = useCallback(async () => {
    if (!isOnline) return;
    
    setSyncing(true);
    try {
      // Fetch open caixa from server
      const { data: serverCaixa } = await supabase
        .from('caixa')
        .select('*')
        .eq('status', 'aberto')
        .order('data_abertura', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (serverCaixa) {
        await localPut('caixa', serverCaixa as Caixa, true);
        setCaixaAberto(serverCaixa as Caixa);
        
        // Fetch movimentações
        const { data: serverMovs } = await supabase
          .from('caixa_movimentacoes')
          .select('*')
          .eq('caixa_id', serverCaixa.id)
          .order('data_hora', { ascending: false });
        
        if (serverMovs) {
          await localBulkPut('caixa_movimentacoes', serverMovs as CaixaMovimentacao[]);
          setMovimentacoes(serverMovs as CaixaMovimentacao[]);
        }
      } else {
        setCaixaAberto(null);
        setMovimentacoes([]);
      }
      
      // Fetch today's expenses
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const { data: serverDespesas } = await supabase
        .from('despesas_rapidas')
        .select('*')
        .gte('data_hora', hoje.toISOString())
        .order('data_hora', { ascending: false });
      
      if (serverDespesas) {
        setDespesas(serverDespesas as DespesaRapida[]);
      }
      
      // Update last sync time
      const now = new Date();
      await setMetadata('caixa_last_sync', now.toISOString());
      setLastSync(now);
      
    } catch (error) {
      console.error('Error syncing caixa:', error);
    } finally {
      setSyncing(false);
    }
  }, [isOnline]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadLocalData();
      await syncWithServer();
      setLoading(false);
    };
    init();
  }, [loadLocalData, syncWithServer]);

  // Abrir Caixa
  const abrirCaixa = useCallback(async (valorInicial: number, observacoes?: string): Promise<Caixa | null> => {
    const novoCaixa: Caixa = {
      id: crypto.randomUUID(),
      data_abertura: new Date().toISOString(),
      data_fechamento: null,
      valor_inicial: valorInicial,
      valor_final: null,
      valor_esperado: null,
      diferenca: null,
      status: 'aberto',
      observacoes_abertura: observacoes || null,
      observacoes_fechamento: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    try {
      // Save locally
      await localPut('caixa', novoCaixa, false);
      setCaixaAberto(novoCaixa);
      setMovimentacoes([]);
      
      // Add to sync queue
      await addToSyncQueue({
        entity: 'caixa',
        operation: 'create',
        data: novoCaixa as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });
      
      // Try to sync immediately if online
      if (isOnline) {
        const { data, error } = await supabase
          .from('caixa')
          .insert([{
            id: novoCaixa.id,
            valor_inicial: valorInicial,
            observacoes_abertura: observacoes || null,
            status: 'aberto',
          }])
          .select()
          .single();
        
        if (!error && data) {
          await localPut('caixa', data as Caixa, true);
          setCaixaAberto(data as Caixa);
        }
      }
      
      toast({ title: 'Caixa aberto com sucesso!' });
      return novoCaixa;
      
    } catch (error) {
      console.error('Error opening caixa:', error);
      toast({ title: 'Erro ao abrir caixa', variant: 'destructive' });
      return null;
    }
  }, [isOnline, toast]);

  // Fechar Caixa
  const fecharCaixa = useCallback(async (valorContado: number, observacoes?: string): Promise<boolean> => {
    if (!caixaAberto) return false;
    
    const valorEsperado = totais.saldoDinheiro;
    const diferenca = valorContado - valorEsperado;
    
    const updates = {
      status: 'fechado' as const,
      data_fechamento: new Date().toISOString(),
      valor_final: valorContado,
      valor_esperado: valorEsperado,
      diferenca: diferenca,
      observacoes_fechamento: observacoes || null,
      updated_at: new Date().toISOString(),
    };
    
    const caixaFechado: Caixa = { ...caixaAberto, ...updates };
    
    try {
      await localPut('caixa', caixaFechado, false);
      setCaixaAberto(null);
      
      await addToSyncQueue({
        entity: 'caixa',
        operation: 'update',
        data: { id: caixaAberto.id, ...updates } as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });
      
      if (isOnline) {
        await supabase
          .from('caixa')
          .update(updates)
          .eq('id', caixaAberto.id);
      }
      
      toast({ 
        title: 'Caixa fechado com sucesso!',
        description: Math.abs(diferenca) > 0.01 
          ? `Diferença de R$ ${diferenca.toFixed(2)} registrada`
          : 'Fechamento sem diferenças',
      });
      return true;
      
    } catch (error) {
      console.error('Error closing caixa:', error);
      toast({ title: 'Erro ao fechar caixa', variant: 'destructive' });
      return false;
    }
  }, [caixaAberto, totais, isOnline, toast]);

  // Registrar Movimentação
  const registrarMovimentacao = useCallback(async (
    tipo: CaixaMovimentacao['tipo'],
    data: Omit<CaixaMovimentacao, 'id' | 'caixa_id' | 'tipo' | 'data_hora'>
  ): Promise<boolean> => {
    if (!caixaAberto) {
      toast({ title: 'Nenhum caixa aberto', variant: 'destructive' });
      return false;
    }
    
    const novaMovimentacao: CaixaMovimentacao = {
      id: crypto.randomUUID(),
      caixa_id: caixaAberto.id,
      tipo,
      ...data,
      data_hora: new Date().toISOString(),
    };
    
    try {
      await localPut('caixa_movimentacoes', novaMovimentacao, false);
      setMovimentacoes(prev => [novaMovimentacao, ...prev]);
      
      await addToSyncQueue({
        entity: 'caixa_movimentacoes',
        operation: 'create',
        data: novaMovimentacao as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });
      
      if (isOnline) {
        await supabase.from('caixa_movimentacoes').insert([{
          id: novaMovimentacao.id,
          caixa_id: novaMovimentacao.caixa_id,
          tipo: novaMovimentacao.tipo,
          categoria: novaMovimentacao.categoria,
          descricao: novaMovimentacao.descricao,
          valor: novaMovimentacao.valor,
          forma_pagamento: novaMovimentacao.forma_pagamento,
          atendimento_id: novaMovimentacao.atendimento_id,
        }]);
      }
      
      return true;
    } catch (error) {
      console.error('Error registering movimentacao:', error);
      toast({ title: 'Erro ao registrar movimentação', variant: 'destructive' });
      return false;
    }
  }, [caixaAberto, isOnline, toast]);

  const registrarEntrada = useCallback(async (
    data: Omit<CaixaMovimentacao, 'id' | 'caixa_id' | 'tipo' | 'data_hora'>
  ) => {
    const result = await registrarMovimentacao('entrada', data);
    if (result) toast({ title: 'Entrada registrada!' });
    return result;
  }, [registrarMovimentacao, toast]);

  const registrarSaida = useCallback(async (
    data: Omit<CaixaMovimentacao, 'id' | 'caixa_id' | 'tipo' | 'data_hora'>
  ) => {
    const result = await registrarMovimentacao('saida', data);
    if (result) toast({ title: 'Saída registrada!' });
    return result;
  }, [registrarMovimentacao, toast]);

  const registrarSangria = useCallback(async (valor: number, motivo: string) => {
    if (valor > totais.saldoDinheiro) {
      toast({ title: 'Valor maior que saldo em dinheiro', variant: 'destructive' });
      return false;
    }
    const result = await registrarMovimentacao('sangria', {
      categoria: 'sangria',
      descricao: motivo,
      valor,
      forma_pagamento: 'dinheiro',
      atendimento_id: null,
    });
    if (result) toast({ title: `Sangria de R$ ${valor.toFixed(2)} registrada` });
    return result;
  }, [registrarMovimentacao, totais.saldoDinheiro, toast]);

  const registrarReforco = useCallback(async (valor: number, motivo: string) => {
    const result = await registrarMovimentacao('reforco', {
      categoria: 'reforco',
      descricao: motivo,
      valor,
      forma_pagamento: 'dinheiro',
      atendimento_id: null,
    });
    if (result) toast({ title: `Reforço de R$ ${valor.toFixed(2)} registrado` });
    return result;
  }, [registrarMovimentacao, toast]);

  // Registrar Despesa
  const registrarDespesa = useCallback(async (
    data: Omit<DespesaRapida, 'id' | 'data_hora'>
  ): Promise<boolean> => {
    const novaDespesa: DespesaRapida = {
      id: crypto.randomUUID(),
      ...data,
      data_hora: new Date().toISOString(),
    };
    
    try {
      setDespesas(prev => [novaDespesa, ...prev]);
      
      // If paid from caixa, also create a movimentação
      if (data.pago_por === 'caixa' && caixaAberto) {
        await registrarMovimentacao('saida', {
          categoria: 'despesa',
          descricao: `Despesa: ${data.descricao}`,
          valor: data.valor,
          forma_pagamento: 'dinheiro',
          atendimento_id: null,
        });
      }
      
      if (isOnline) {
        await supabase.from('despesas_rapidas').insert([novaDespesa]);
      }
      
      toast({ title: 'Despesa registrada!' });
      return true;
    } catch (error) {
      console.error('Error registering despesa:', error);
      toast({ title: 'Erro ao registrar despesa', variant: 'destructive' });
      return false;
    }
  }, [caixaAberto, registrarMovimentacao, isOnline, toast]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadLocalData();
    await syncWithServer();
    setLoading(false);
  }, [loadLocalData, syncWithServer]);

  const syncNow = useCallback(async () => {
    await syncWithServer();
  }, [syncWithServer]);

  return {
    caixaAberto,
    movimentacoes,
    despesas,
    totais,
    loading,
    syncing,
    isOnline,
    lastSync,
    abrirCaixa,
    fecharCaixa,
    registrarEntrada,
    registrarSaida,
    registrarSangria,
    registrarReforco,
    registrarDespesa,
    refresh,
    syncNow,
  };
}
