import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { localPut, localGetAll, localDelete, localClear, addToSyncQueue, EntityStore } from '@/lib/offlineDb';
import { getOnlineStatus, addOnlineStatusListener } from '@/lib/syncService';
import { toast } from 'sonner';
import { useRealtimeCallback } from '@/hooks/useRealtimeSubscription';

export interface Profissional {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  data_admissao: string | null;
  funcao: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  comissao_servicos: number;
  comissao_produtos: number;
  cor_agenda: string;
  foto_url: string | null;
  pode_vender_produtos: boolean;
  meta_servicos_mes: number;
  meta_produtos_mes: number;
  ativo: boolean;
  pin_acesso: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfissionalComMetas extends Profissional {
  realizado_servicos: number;
  realizado_produtos: number;
  comissao_servicos_valor: number;
  comissao_produtos_valor: number;
  total_atendimentos: number;
}

export interface ComissaoDetalhada {
  id: string;
  data: string;
  tipo: 'servico' | 'produto';
  descricao: string;
  valor_base: number;
  percentual: number;
  valor_comissao: number;
  atendimento_id: string;
  cliente_nome: string | null;
}

export interface DebugInfo {
  remoteCount: number;
  localCount: number;
  lastQuery: string;
  httpStatus: number | null;
  error: string | null;
  timestamp: string;
}

const STORE_NAME: EntityStore = 'profissionais';

export function useProfissionais() {
  const [profissionais, setProfissionais] = useState<ProfissionalComMetas[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    remoteCount: 0, localCount: 0, lastQuery: '', httpStatus: null, error: null, timestamp: ''
  });

  // Auto-refetch on reconnect
  useEffect(() => {
    const unsub = addOnlineStatusListener((online) => {
      if (online) {
        console.log('[PROFISSIONAIS] online_reconnect → refetch');
        fetchProfissionais();
      }
    });
    return unsub;
  }, []);

  const getMonthRange = useCallback(() => {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return { inicioMes, fimMes };
  }, []);

  const calculateMetrics = useCallback(async (profData: Profissional[]): Promise<ProfissionalComMetas[]> => {
    const { inicioMes, fimMes } = getMonthRange();

    const { data: servicosData } = await supabase
      .from('atendimento_servicos')
      .select(`profissional_id, subtotal, comissao_percentual, comissao_valor, atendimento:atendimentos!inner(status, data_hora)`)
      .eq('atendimento.status', 'fechado')
      .gte('atendimento.data_hora', inicioMes)
      .lte('atendimento.data_hora', fimMes);

    const { data: produtosData } = await supabase
      .from('atendimento_produtos')
      .select(`subtotal, atendimento:atendimentos!inner(status, data_hora, atendimento_servicos(profissional_id))`)
      .eq('atendimento.status', 'fechado')
      .gte('atendimento.data_hora', inicioMes)
      .lte('atendimento.data_hora', fimMes);

    const metricas: Record<string, { servicos: number; produtos: number; comissaoServicos: number; comissaoProdutos: number; atendimentos: Set<string> }> = {};

    servicosData?.forEach((item: any) => {
      const profId = item.profissional_id;
      if (!metricas[profId]) metricas[profId] = { servicos: 0, produtos: 0, comissaoServicos: 0, comissaoProdutos: 0, atendimentos: new Set() };
      metricas[profId].servicos += Number(item.subtotal || 0);
      metricas[profId].comissaoServicos += Number(item.comissao_valor || 0);
      if (item.atendimento?.id) metricas[profId].atendimentos.add(item.atendimento.id);
    });

    produtosData?.forEach((item: any) => {
      const profs = item.atendimento?.atendimento_servicos || [];
      const uniqueProfs = [...new Set(profs.map((s: any) => s.profissional_id))] as string[];
      if (uniqueProfs.length > 0) {
        const valorPorProf = Number(item.subtotal || 0) / uniqueProfs.length;
        uniqueProfs.forEach(profId => {
          if (!metricas[profId]) metricas[profId] = { servicos: 0, produtos: 0, comissaoServicos: 0, comissaoProdutos: 0, atendimentos: new Set() };
          metricas[profId].produtos += valorPorProf;
        });
      }
    });

    return profData.map(prof => {
      const m = metricas[prof.id] || { servicos: 0, produtos: 0, comissaoServicos: 0, comissaoProdutos: 0, atendimentos: new Set() };
      return {
        ...prof,
        realizado_servicos: m.servicos,
        realizado_produtos: m.produtos,
        comissao_servicos_valor: m.comissaoServicos,
        comissao_produtos_valor: m.produtos * (prof.comissao_produtos / 100),
        total_atendimentos: m.atendimentos.size,
      };
    });
  }, [getMonthRange]);

  const fetchProfissionais = useCallback(async (forceRemote: boolean = false) => {
    setLoading(true);
    
    try {
      const localData = await localGetAll<Profissional>(STORE_NAME);

      if (!getOnlineStatus()) {
        console.log('[PROFISSIONAIS] offline → using local data');
        const profissionaisComMetas = await calculateMetrics(localData);
        setProfissionais(profissionaisComMetas);
        setLoading(false);
        return;
      }

      const { data: remoteData, error, status } = await supabase
        .from('profissionais')
        .select('*')
        .order('nome', { ascending: true });

      setDebugInfo({
        remoteCount: remoteData?.length || 0, localCount: localData.length,
        lastQuery: "SELECT * FROM profissionais ORDER BY nome ASC",
        httpStatus: status, error: error?.message || null, timestamp: new Date().toISOString()
      });

      if (error) {
        console.error('[PROFISSIONAIS] supabase_fetch_fail', { status, error: error.message });
        toast.error(`Falha ao carregar profissionais: ${error.message}`);
        const profissionaisComMetas = await calculateMetrics(localData);
        setProfissionais(profissionaisComMetas);
        return;
      }

      console.log(`[PROFISSIONAIS] supabase_fetch_ok { count: ${remoteData?.length || 0} }`);

      if (remoteData && remoteData.length > 0) {
        // Clear + replace to prevent deleted items resurrecting
        try {
          await localClear(STORE_NAME);
          for (const prof of remoteData) await localPut(STORE_NAME, prof, true);
        } catch { /* ignore */ }
        const profissionaisComMetas = await calculateMetrics(remoteData);
        setProfissionais(profissionaisComMetas);
      } else if (remoteData && remoteData.length === 0 && localData.length > 0 && !forceRemote) {
        console.warn('[PROFISSIONAIS] remote_empty_local_has_data → using local');
        const profissionaisComMetas = await calculateMetrics(localData);
        setProfissionais(profissionaisComMetas);
      } else {
        setProfissionais([]);
      }
    } catch (error: any) {
      console.error('[PROFISSIONAIS] fetch_error', error);
      const localData = await localGetAll<Profissional>(STORE_NAME);
      const profissionaisComMetas = await calculateMetrics(localData);
      setProfissionais(profissionaisComMetas);
    } finally {
      setLoading(false);
    }
  }, [calculateMetrics]);

  const forceReload = useCallback(async () => {
    await localClear(STORE_NAME);
    await fetchProfissionais(true);
  }, [fetchProfissionais]);

  const clearLocalCache = useCallback(async () => {
    await localClear(STORE_NAME);
    setDebugInfo(prev => ({ ...prev, localCount: 0, timestamp: new Date().toISOString() }));
  }, []);

  const getComissoesDetalhadas = useCallback(async (profissionalId: string, mes?: Date): Promise<ComissaoDetalhada[]> => {
    const targetDate = mes || new Date();
    const inicioMes = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString();
    const fimMes = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: servicosData } = await supabase
      .from('atendimento_servicos')
      .select(`id, subtotal, comissao_percentual, comissao_valor, servico:servicos(nome), atendimento:atendimentos!inner(id, data_hora, status, cliente:clientes(nome))`)
      .eq('profissional_id', profissionalId)
      .eq('atendimento.status', 'fechado')
      .gte('atendimento.data_hora', inicioMes)
      .lte('atendimento.data_hora', fimMes)
      .order('atendimento(data_hora)', { ascending: false });

    const comissoes: ComissaoDetalhada[] = [];
    servicosData?.forEach((item: any) => {
      comissoes.push({
        id: item.id, data: item.atendimento?.data_hora, tipo: 'servico',
        descricao: item.servico?.nome || 'Serviço', valor_base: Number(item.subtotal),
        percentual: Number(item.comissao_percentual), valor_comissao: Number(item.comissao_valor),
        atendimento_id: item.atendimento?.id, cliente_nome: item.atendimento?.cliente?.nome || null,
      });
    });

    return comissoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, []);

  const saveProfissional = useCallback(async (
    data: Partial<Profissional> & { nome: string }, id?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    setSyncing(true);
    
    try {
      const now = new Date().toISOString();
      
      if (id) {
        const updateData = { ...data, updated_at: now };
        
        if (getOnlineStatus()) {
          const { error } = await supabase.from('profissionais').update(updateData).eq('id', id);
          if (error) {
            console.error('[PROFISSIONAIS] supabase_update_fail', error);
            await addToSyncQueue({ entity: STORE_NAME, operation: 'update', data: { id, ...updateData }, timestamp: now });
            toast.warning('Sem internet: alteração salva e será sincronizada');
          } else {
            console.info('[PROFISSIONAIS] supabase_update_ok', { id });
            toast.success('Profissional atualizado com sucesso!');
          }
        } else {
          await addToSyncQueue({ entity: STORE_NAME, operation: 'update', data: { id, ...updateData }, timestamp: now });
          toast.info('Sem internet: alteração salva e será sincronizada');
        }

        const existing = profissionais.find(p => p.id === id);
        if (existing) await localPut(STORE_NAME, { ...existing, ...updateData } as Profissional);
        return { success: true, id };
      } else {
        if (getOnlineStatus()) {
          const { data: newData, error } = await supabase.from('profissionais').insert([data]).select().single();
          if (error) {
            console.error('[PROFISSIONAIS] supabase_create_fail', error);
            toast.error(`Falha ao criar profissional: ${error.message}`);
            throw error;
          }
          console.info('[PROFISSIONAIS] supabase_create_ok', { id: newData.id });
          await localPut(STORE_NAME, newData);
          toast.success('Profissional criado com sucesso!');
          return { success: true, id: newData.id };
        } else {
          toast.error('Sem internet: não é possível criar profissional offline');
          return { success: false, error: 'Sem conexão' };
        }
      }
    } catch (error: any) {
      console.error('[PROFISSIONAIS] save_fail', error);
      return { success: false, error: error.message };
    } finally {
      setSyncing(false);
      fetchProfissionais();
    }
  }, [profissionais, fetchProfissionais]);

  const deleteProfissional = useCallback(async (id: string): Promise<boolean> => {
    console.log('[PROFISSIONAIS] delete_start', { id });
    setSyncing(true);
    
    try {
      if (getOnlineStatus()) {
        const { error } = await supabase.from('profissionais').delete().eq('id', id);
        if (error) {
          console.error('[PROFISSIONAIS] supabase_delete_fail', error);
          await addToSyncQueue({ entity: STORE_NAME, operation: 'delete', data: { id }, timestamp: new Date().toISOString() });
          toast.warning('Exclusão será sincronizada quando online');
        } else {
          console.info('[PROFISSIONAIS] delete_ok', { id });
          toast.success('Profissional excluído com sucesso!');
        }
      } else {
        await addToSyncQueue({ entity: STORE_NAME, operation: 'delete', data: { id }, timestamp: new Date().toISOString() });
        toast.info('Sem internet: exclusão será sincronizada');
      }

      await localDelete(STORE_NAME, id);
      await fetchProfissionais();
      return true;
    } catch (error: any) {
      console.error('[PROFISSIONAIS] delete_fail', error);
      toast.error(`Falha ao excluir profissional: ${error.message}`);
      return false;
    } finally {
      setSyncing(false);
    }
  }, [fetchProfissionais]);

  const searchProfissionais = useCallback((term: string): ProfissionalComMetas[] => {
    if (!term) return profissionais;
    const searchLower = term.toLowerCase();
    return profissionais.filter(p => 
      p.nome.toLowerCase().includes(searchLower) || p.telefone?.includes(term) || p.cpf?.includes(term) || p.funcao?.toLowerCase().includes(searchLower)
    );
  }, [profissionais]);

  const profissionaisAtivos = useMemo(() => profissionais.filter(p => p.ativo), [profissionais]);
  const profissionaisVendedores = useMemo(() => profissionais.filter(p => p.ativo && p.pode_vender_produtos), [profissionais]);

  // Realtime: auto-refresh when profissionais change in another tab/device
  useRealtimeCallback('profissionais', fetchProfissionais);

  useEffect(() => { fetchProfissionais(); }, []);

  return {
    profissionais, profissionaisAtivos, profissionaisVendedores,
    loading, syncing, debugInfo,
    fetchProfissionais, forceReload, clearLocalCache,
    saveProfissional, deleteProfissional, searchProfissionais,
    getComissoesDetalhadas,
  };
}
