/**
 * Hook for RH (Human Resources) module
 * Handles employees, commissions, time sheets, and payments
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';

export interface Funcionario {
  id: string;
  nome: string;
  foto_url: string | null;
  cpf: string;
  cargo: string;
  data_admissao: string;
  tipo_contrato: string;
  salario_base: number;
  ativo: boolean;
  jornada_entrada: string | null;
  jornada_saida: string | null;
}

export interface Profissional {
  id: string;
  nome: string;
  especialidade: string | null;
  ativo: boolean;
  comissao_padrao: number;
}

export interface Comissao {
  id: string;
  profissional_id: string;
  atendimento_id: string | null;
  tipo: string;
  descricao: string | null;
  valor_base: number;
  percentual_comissao: number;
  valor_comissao: number;
  status: string;
  data_referencia: string;
  data_pagamento: string | null;
}

export interface FolhaPontoMensal {
  id: string;
  tipo_pessoa: string;
  pessoa_id: string;
  mes_referencia: string;
  total_horas_trabalhadas: number;
  total_horas_extras: number;
  total_atrasos_minutos: number;
  total_faltas: number;
  dias_trabalhados: number;
  banco_horas_saldo: number;
  status: string;
  fechada_em: string | null;
  fechada_por: string | null;
}

export interface ConfiguracoesRH {
  id: string;
  jornada_padrao_horas: number;
  tolerancia_atraso_minutos: number;
  tolerancia_saida_minutos: number;
  intervalo_minimo_minutos: number;
  habilitar_banco_horas: boolean;
  habilitar_horas_extras: boolean;
  percentual_hora_extra: number;
  regra_comissao_base: string;
  arredondamento_comissao: string;
  fechamento_automatico: boolean;
  dia_fechamento: number;
  modo_kiosk_apenas_batida: boolean;
}

export function useRH() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [folhasPonto, setFolhasPonto] = useState<FolhaPontoMensal[]>([]);
  const [config, setConfig] = useState<ConfiguracoesRH | null>(null);
  const [loading, setLoading] = useState(true);

  // Load all RH data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[RH] load_data_start');
      const [funcRes, profRes, configRes] = await Promise.all([
        supabase.from('funcionarios').select('*').order('nome'),
        supabase.from('profissionais').select('id, nome, especialidade, ativo, comissao_padrao').order('nome'),
        supabase.from('configuracoes_rh').select('*').limit(1).maybeSingle(),
      ]);

      if (funcRes.error) {
        console.error('[RH] supabase_funcionarios_fail', funcRes.error);
        toast.error(`Falha ao carregar funcionários: ${funcRes.error.message}`);
      } else {
        console.info(`[RH] funcionarios_loaded { count: ${funcRes.data?.length || 0} }`);
        setFuncionarios(funcRes.data || []);
      }

      if (profRes.error) {
        console.error('[RH] supabase_profissionais_fail', profRes.error);
      } else {
        setProfissionais((profRes.data as Profissional[]) || []);
      }

      if (configRes.error) {
        console.error('[RH] supabase_config_fail', configRes.error);
      } else if (configRes.data) {
        setConfig(configRes.data as ConfiguracoesRH);
      }
    } catch (error: any) {
      console.error('[RH] load_data_fail', error);
      toast.error(`Erro ao carregar dados RH: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load commissions for a period
  const loadComissoes = useCallback(async (startDate: Date, endDate: Date, profissionalId?: string) => {
    try {
      let query = supabase
        .from('comissoes')
        .select('*')
        .gte('data_referencia', format(startDate, 'yyyy-MM-dd'))
        .lte('data_referencia', format(endDate, 'yyyy-MM-dd'))
        .order('data_referencia', { ascending: false });

      if (profissionalId) query = query.eq('profissional_id', profissionalId);

      const { data, error } = await query;
      if (error) {
        console.error('[RH] comissoes_fetch_fail', error);
        toast.error(`Falha ao carregar comissões: ${error.message}`);
        throw error;
      }
      setComissoes(data || []);
      return data || [];
    } catch (error) {
      console.error('[RH] comissoes_error', error);
      return [];
    }
  }, []);

  // Load time sheets for a month
  const loadFolhasPonto = useCallback(async (mesReferencia: Date) => {
    try {
      const mesStr = format(startOfMonth(mesReferencia), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('folha_ponto_mensal')
        .select('*')
        .eq('mes_referencia', mesStr)
        .order('tipo_pessoa', { ascending: true });

      if (error) {
        console.error('[RH] folhas_ponto_fetch_fail', error);
        toast.error(`Falha ao carregar folhas de ponto: ${error.message}`);
        throw error;
      }
      setFolhasPonto(data || []);
      return data || [];
    } catch (error) {
      console.error('[RH] folhas_ponto_error', error);
      return [];
    }
  }, []);

  // Calculate time sheet from ponto_registros
  const calcularFolhaPonto = useCallback(async (
    tipoPessoa: 'funcionario' | 'profissional',
    pessoaId: string,
    mesReferencia: Date
  ) => {
    try {
      if (!pessoaId) {
        console.error('[RH] blocked_missing_pessoa_id', { tipoPessoa });
        toast.error('Erro: ID da pessoa ausente');
        return null;
      }

      const inicio = startOfMonth(mesReferencia);
      const fim = endOfMonth(mesReferencia);

      const { data: pontos, error } = await supabase
        .from('ponto_registros')
        .select('*')
        .eq('tipo_pessoa', tipoPessoa)
        .eq('pessoa_id', pessoaId)
        .gte('data', format(inicio, 'yyyy-MM-dd'))
        .lte('data', format(fim, 'yyyy-MM-dd'));

      if (error) {
        console.error('[RH] ponto_registros_fetch_fail', error);
        throw error;
      }

      let totalMinutos = 0;
      let diasTrabalhados = 0;
      let totalAtrasos = 0;

      const jornadaPadrao = config?.jornada_padrao_horas || 8;
      const toleranciaAtraso = config?.tolerancia_atraso_minutos || 15;

      (pontos || []).forEach(ponto => {
        if (ponto.entrada_manha && ponto.saida) {
          diasTrabalhados++;
          const entrada = parseISO(`2000-01-01T${ponto.entrada_manha}`);
          const saida = parseISO(`2000-01-01T${ponto.saida}`);
          let minutosDia = differenceInMinutes(saida, entrada);

          if (ponto.saida_almoco && ponto.entrada_tarde) {
            const saidaAlmoco = parseISO(`2000-01-01T${ponto.saida_almoco}`);
            const entradaTarde = parseISO(`2000-01-01T${ponto.entrada_tarde}`);
            minutosDia -= differenceInMinutes(entradaTarde, saidaAlmoco);
          }

          totalMinutos += Math.max(0, minutosDia);

          const horarioPadrao = parseISO(`2000-01-01T08:00`);
          const atraso = differenceInMinutes(entrada, horarioPadrao);
          if (atraso > toleranciaAtraso) totalAtrasos += atraso - toleranciaAtraso;
        }
      });

      const totalHoras = totalMinutos / 60;
      const horasEsperadas = diasTrabalhados * jornadaPadrao;
      const horasExtras = Math.max(0, totalHoras - horasEsperadas);
      const bancoHoras = totalHoras - horasEsperadas;

      return {
        total_horas_trabalhadas: Number(totalHoras.toFixed(2)),
        total_horas_extras: Number(horasExtras.toFixed(2)),
        total_atrasos_minutos: totalAtrasos,
        dias_trabalhados: diasTrabalhados,
        banco_horas_saldo: Number(bancoHoras.toFixed(2)),
        total_faltas: 0,
      };
    } catch (error: any) {
      console.error('[RH] calcular_folha_fail', error);
      toast.error(`Erro ao calcular folha: ${error.message}`);
      return null;
    }
  }, [config]);

  const gerarFolhaPonto = useCallback(async (
    tipoPessoa: 'funcionario' | 'profissional', pessoaId: string, mesReferencia: Date
  ) => {
    const dados = await calcularFolhaPonto(tipoPessoa, pessoaId, mesReferencia);
    if (!dados) return null;

    const mesStr = format(startOfMonth(mesReferencia), 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('folha_ponto_mensal')
        .upsert({ tipo_pessoa: tipoPessoa, pessoa_id: pessoaId, mes_referencia: mesStr, ...dados, status: 'aberta' },
          { onConflict: 'tipo_pessoa,pessoa_id,mes_referencia' })
        .select().single();

      if (error) {
        console.error('[RH] gerar_folha_fail', error);
        toast.error(`Erro ao gerar folha de ponto: ${error.message}`);
        throw error;
      }
      console.info('[RH] gerar_folha_ok', { id: data.id });
      toast.success('Folha de ponto atualizada!');
      return data;
    } catch (error: any) {
      console.error('[RH] gerar_folha_error', error);
      return null;
    }
  }, [calcularFolhaPonto]);

  const fecharFolhaPonto = useCallback(async (folhaId: string, fechadoPor: string) => {
    try {
      const { error } = await supabase.from('folha_ponto_mensal')
        .update({ status: 'fechada', fechada_em: new Date().toISOString(), fechada_por: fechadoPor })
        .eq('id', folhaId);

      if (error) { console.error('[RH] fechar_folha_fail', error); toast.error(`Erro: ${error.message}`); throw error; }
      toast.success('Folha de ponto fechada!');
      return true;
    } catch { return false; }
  }, []);

  const reabrirFolhaPonto = useCallback(async (folhaId: string, motivo: string, reabertoPor: string) => {
    try {
      const { error } = await supabase.from('folha_ponto_mensal')
        .update({ status: 'reaberta', reaberta_em: new Date().toISOString(), reaberta_por: reabertoPor, motivo_reabertura: motivo })
        .eq('id', folhaId);

      if (error) { console.error('[RH] reabrir_folha_fail', error); toast.error(`Erro: ${error.message}`); throw error; }
      toast.success('Folha de ponto reaberta!');
      return true;
    } catch { return false; }
  }, []);

  const pagarComissao = useCallback(async (comissaoId: string) => {
    try {
      const { error } = await supabase.from('comissoes')
        .update({ status: 'paga', data_pagamento: new Date().toISOString() })
        .eq('id', comissaoId);

      if (error) { console.error('[RH] pagar_comissao_fail', error); toast.error(`Erro: ${error.message}`); throw error; }
      toast.success('Comissão marcada como paga!');
      return true;
    } catch { return false; }
  }, []);

  const updateConfig = useCallback(async (updates: Partial<ConfiguracoesRH>) => {
    if (!config) return false;
    try {
      const { error } = await supabase.from('configuracoes_rh').update(updates).eq('id', config.id);
      if (error) { console.error('[RH] update_config_fail', error); toast.error(`Erro: ${error.message}`); throw error; }
      setConfig({ ...config, ...updates });
      toast.success('Configurações atualizadas!');
      return true;
    } catch { return false; }
  }, [config]);

  return {
    funcionarios, profissionais, comissoes, folhasPonto, config, loading,
    loadData, loadComissoes, loadFolhasPonto,
    calcularFolhaPonto, gerarFolhaPonto, fecharFolhaPonto, reabrirFolhaPonto,
    pagarComissao, updateConfig,
  };
}
