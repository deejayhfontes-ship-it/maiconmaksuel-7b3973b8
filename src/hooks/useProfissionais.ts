import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { localPut, localGetAll, localDelete, addToSyncQueue, EntityStore } from '@/lib/offlineDb';

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

const STORE_NAME: EntityStore = 'profissionais';

export function useProfissionais() {
  const [profissionais, setProfissionais] = useState<ProfissionalComMetas[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Get current month date range
  const getMonthRange = useCallback(() => {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return { inicioMes, fimMes };
  }, []);

  // Calculate realized values and commissions
  const calculateMetrics = useCallback(async (profData: Profissional[]): Promise<ProfissionalComMetas[]> => {
    const { inicioMes, fimMes } = getMonthRange();

    // Fetch services from closed atendimentos
    const { data: servicosData } = await supabase
      .from('atendimento_servicos')
      .select(`
        profissional_id,
        subtotal,
        comissao_percentual,
        comissao_valor,
        atendimento:atendimentos!inner(status, data_hora)
      `)
      .eq('atendimento.status', 'fechado')
      .gte('atendimento.data_hora', inicioMes)
      .lte('atendimento.data_hora', fimMes);

    // Fetch products from closed atendimentos (linked to profissionais via atendimento_servicos)
    const { data: produtosData } = await supabase
      .from('atendimento_produtos')
      .select(`
        subtotal,
        atendimento:atendimentos!inner(
          status, 
          data_hora,
          atendimento_servicos(profissional_id)
        )
      `)
      .eq('atendimento.status', 'fechado')
      .gte('atendimento.data_hora', inicioMes)
      .lte('atendimento.data_hora', fimMes);

    // Aggregate by professional
    const metricas: Record<string, {
      servicos: number;
      produtos: number;
      comissaoServicos: number;
      comissaoProdutos: number;
      atendimentos: Set<string>;
    }> = {};

    // Process services
    servicosData?.forEach((item: any) => {
      const profId = item.profissional_id;
      if (!metricas[profId]) {
        metricas[profId] = { 
          servicos: 0, 
          produtos: 0, 
          comissaoServicos: 0, 
          comissaoProdutos: 0,
          atendimentos: new Set()
        };
      }
      metricas[profId].servicos += Number(item.subtotal || 0);
      metricas[profId].comissaoServicos += Number(item.comissao_valor || 0);
      if (item.atendimento?.id) {
        metricas[profId].atendimentos.add(item.atendimento.id);
      }
    });

    // Process products (distribute among professionals in the atendimento)
    produtosData?.forEach((item: any) => {
      const profissionais = item.atendimento?.atendimento_servicos || [];
      const uniqueProfs = [...new Set(profissionais.map((s: any) => s.profissional_id))] as string[];
      
      if (uniqueProfs.length > 0) {
        const valorPorProf = Number(item.subtotal || 0) / uniqueProfs.length;
        uniqueProfs.forEach(profId => {
          if (!metricas[profId]) {
            metricas[profId] = { 
              servicos: 0, 
              produtos: 0, 
              comissaoServicos: 0, 
              comissaoProdutos: 0,
              atendimentos: new Set()
            };
          }
          metricas[profId].produtos += valorPorProf;
        });
      }
    });

    // Calculate product commissions based on professional's rate
    return profData.map(prof => {
      const m = metricas[prof.id] || { 
        servicos: 0, 
        produtos: 0, 
        comissaoServicos: 0, 
        comissaoProdutos: 0,
        atendimentos: new Set()
      };
      
      // Calculate product commission if not already calculated
      const comissaoProdutosValor = m.produtos * (prof.comissao_produtos / 100);
      
      return {
        ...prof,
        realizado_servicos: m.servicos,
        realizado_produtos: m.produtos,
        comissao_servicos_valor: m.comissaoServicos,
        comissao_produtos_valor: comissaoProdutosValor,
        total_atendimentos: m.atendimentos.size,
      };
    });
  }, [getMonthRange]);

  // Fetch all profissionais with metrics
  const fetchProfissionais = useCallback(async () => {
    setLoading(true);
    
    try {
      // Try to fetch from Supabase first
      const { data: remoteData, error } = await supabase
        .from('profissionais')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      // Store locally for offline use
      for (const prof of remoteData || []) {
        await localPut(STORE_NAME, prof);
      }

      // Calculate metrics
      const profissionaisComMetas = await calculateMetrics(remoteData || []);
      setProfissionais(profissionaisComMetas);
    } catch (error) {
      console.log('Fetching from local storage...');
      // Fallback to local data
      const localData = await localGetAll<Profissional>(STORE_NAME);
      const profissionaisComMetas = await calculateMetrics(localData);
      setProfissionais(profissionaisComMetas);
    } finally {
      setLoading(false);
    }
  }, [calculateMetrics]);

  // Get detailed commissions for a professional
  const getComissoesDetalhadas = useCallback(async (
    profissionalId: string,
    mes?: Date
  ): Promise<ComissaoDetalhada[]> => {
    const targetDate = mes || new Date();
    const inicioMes = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString();
    const fimMes = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: servicosData } = await supabase
      .from('atendimento_servicos')
      .select(`
        id,
        subtotal,
        comissao_percentual,
        comissao_valor,
        servico:servicos(nome),
        atendimento:atendimentos!inner(
          id,
          data_hora,
          status,
          cliente:clientes(nome)
        )
      `)
      .eq('profissional_id', profissionalId)
      .eq('atendimento.status', 'fechado')
      .gte('atendimento.data_hora', inicioMes)
      .lte('atendimento.data_hora', fimMes)
      .order('atendimento(data_hora)', { ascending: false });

    const comissoes: ComissaoDetalhada[] = [];

    servicosData?.forEach((item: any) => {
      comissoes.push({
        id: item.id,
        data: item.atendimento?.data_hora,
        tipo: 'servico',
        descricao: item.servico?.nome || 'Serviço',
        valor_base: Number(item.subtotal),
        percentual: Number(item.comissao_percentual),
        valor_comissao: Number(item.comissao_valor),
        atendimento_id: item.atendimento?.id,
        cliente_nome: item.atendimento?.cliente?.nome || null,
      });
    });

    return comissoes.sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }, []);

  // Create or update a professional
  const saveProfissional = useCallback(async (
    data: Partial<Profissional> & { nome: string },
    id?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    setSyncing(true);
    
    try {
      const now = new Date().toISOString();
      
      if (id) {
        // Update
        const updateData = { ...data, updated_at: now };
        
        const { error } = await supabase
          .from('profissionais')
          .update(updateData)
          .eq('id', id);

        if (error) {
          // Queue for sync
          await addToSyncQueue({
            entity: STORE_NAME,
            operation: 'update',
            data: { id, ...updateData },
            timestamp: now,
          });
        }

        // Update locally
        const existing = profissionais.find(p => p.id === id);
        if (existing) {
          await localPut(STORE_NAME, { ...existing, ...updateData } as Profissional);
        }

        return { success: true, id };
      } else {
        // Create
        const { data: newData, error } = await supabase
          .from('profissionais')
          .insert([data])
          .select()
          .single();

        if (error) throw error;

        await localPut(STORE_NAME, newData);
        return { success: true, id: newData.id };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setSyncing(false);
      fetchProfissionais();
    }
  }, [profissionais, fetchProfissionais]);

  // Delete a professional
  const deleteProfissional = useCallback(async (id: string): Promise<boolean> => {
    setSyncing(true);
    
    try {
      const { error } = await supabase
        .from('profissionais')
        .delete()
        .eq('id', id);

      if (error) {
        // Queue for sync
        await addToSyncQueue({
          entity: STORE_NAME,
          operation: 'delete',
          data: { id },
          timestamp: new Date().toISOString(),
        });
      }

      await localDelete(STORE_NAME, id);
      await fetchProfissionais();
      return true;
    } catch (error) {
      console.error('Error deleting professional:', error);
      return false;
    } finally {
      setSyncing(false);
    }
  }, [fetchProfissionais]);

  // Search profissionais
  const searchProfissionais = useCallback((term: string): ProfissionalComMetas[] => {
    if (!term) return profissionais;
    
    const searchLower = term.toLowerCase();
    return profissionais.filter(p => 
      p.nome.toLowerCase().includes(searchLower) ||
      p.telefone?.includes(term) ||
      p.cpf?.includes(term) ||
      p.funcao?.toLowerCase().includes(searchLower)
    );
  }, [profissionais]);

  // Get active profissionais only
  const profissionaisAtivos = useMemo(() => 
    profissionais.filter(p => p.ativo),
  [profissionais]);

  // Get profissionais that can sell products
  const profissionaisVendedores = useMemo(() => 
    profissionais.filter(p => p.ativo && p.pode_vender_produtos),
  [profissionais]);

  // Initial fetch
  useEffect(() => {
    fetchProfissionais();
  }, []);

  return {
    profissionais,
    profissionaisAtivos,
    profissionaisVendedores,
    loading,
    syncing,
    fetchProfissionais,
    saveProfissional,
    deleteProfissional,
    searchProfissionais,
    getComissoesDetalhadas,
  };
}
