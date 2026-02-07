import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ComunicacaoCreditos {
  id: string;
  saldo_creditos: number;
  alerta_creditos_minimo: number;
  custo_por_mensagem: number;
}

export interface ComunicacaoLembrete {
  id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  horas_antes: number;
  horario_envio: string | null;
  template_mensagem: string;
  incluir_endereco: boolean;
}

export interface ComunicacaoRespostaAutomatica {
  id: string;
  palavras_chave: string[];
  tipo_resposta: string;
  mensagem_resposta: string;
  acao: string | null;
  ativo: boolean;
  prioridade: number;
}

export interface ComunicacaoCampanha {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_segmentacao: string;
  criterio_dias_inativo: number | null;
  template_mensagem: string;
  desconto_oferecido: number | null;
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  total_enviados: number;
  total_respondidos: number;
}

export interface ComunicacaoEstatisticas {
  id: string;
  data: string;
  mensagens_enviadas: number;
  mensagens_entregues: number;
  mensagens_lidas: number;
  mensagens_respondidas: number;
  agendamentos_confirmados: number;
  agendamentos_cancelados: number;
  falhas_envio: number;
}

export interface ComunicacaoTemplatePronto {
  id: string;
  nome: string;
  estilo: string;
  tipo: string;
  mensagem: string;
  variaveis: string[];
  ativo: boolean;
}

export interface ComunicacaoConfigAvancadas {
  id: string;
  horario_silencio_inicio: string;
  horario_silencio_fim: string;
  limite_diario_mensagens: number;
  nome_remetente: string | null;
  foto_perfil_url: string | null;
  opt_out_keyword: string;
  fallback_sms: boolean;
  sms_api_key: string | null;
}

export interface ComunicacaoAvaliacao {
  id: string;
  cliente_id: string | null;
  atendimento_id: string | null;
  nota: number;
  comentario: string | null;
  respondida: boolean;
  created_at: string;
}

export function useComunicacao() {
  const [creditos, setCreditos] = useState<ComunicacaoCreditos | null>(null);
  const [lembretes, setLembretes] = useState<ComunicacaoLembrete[]>([]);
  const [respostasAutomaticas, setRespostasAutomaticas] = useState<ComunicacaoRespostaAutomatica[]>([]);
  const [campanhas, setCampanhas] = useState<ComunicacaoCampanha[]>([]);
  const [estatisticasHoje, setEstatisticasHoje] = useState<ComunicacaoEstatisticas | null>(null);
  const [templatesProntos, setTemplatesProntos] = useState<ComunicacaoTemplatePronto[]>([]);
  const [configAvancadas, setConfigAvancadas] = useState<ComunicacaoConfigAvancadas | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<ComunicacaoAvaliacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCreditos(),
        fetchLembretes(),
        fetchRespostasAutomaticas(),
        fetchCampanhas(),
        fetchEstatisticasHoje(),
        fetchTemplatesProntos(),
        fetchConfigAvancadas(),
        fetchAvaliacoes()
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados de comunicação:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditos = async () => {
    const { data } = await supabase
      .from("comunicacao_creditos")
      .select("*")
      .single();
    if (data) setCreditos(data);
  };

  const fetchLembretes = async () => {
    const { data } = await supabase
      .from("comunicacao_lembretes")
      .select("*")
      .order("horas_antes", { ascending: false });
    if (data) setLembretes(data);
  };

  const fetchRespostasAutomaticas = async () => {
    const { data } = await supabase
      .from("comunicacao_respostas_automaticas")
      .select("*")
      .order("prioridade", { ascending: false });
    if (data) setRespostasAutomaticas(data);
  };

  const fetchCampanhas = async () => {
    const { data } = await supabase
      .from("comunicacao_campanhas")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCampanhas(data);
  };

  const fetchEstatisticasHoje = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("comunicacao_estatisticas")
      .select("*")
      .eq("data", today)
      .single();
    if (data) setEstatisticasHoje(data);
  };

  const fetchTemplatesProntos = async () => {
    const { data } = await supabase
      .from("comunicacao_templates_prontos")
      .select("*")
      .order("nome");
    if (data) setTemplatesProntos(data);
  };

  const fetchConfigAvancadas = async () => {
    const { data } = await supabase
      .from("comunicacao_config_avancadas")
      .select("*")
      .single();
    if (data) setConfigAvancadas(data);
  };

  const fetchAvaliacoes = async () => {
    const { data } = await supabase
      .from("comunicacao_avaliacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setAvaliacoes(data);
  };

  const updateCreditos = async (updates: Partial<ComunicacaoCreditos>) => {
    if (!creditos) return;
    const { error } = await supabase
      .from("comunicacao_creditos")
      .update(updates)
      .eq("id", creditos.id);
    if (error) {
      toast.error("Erro ao atualizar créditos");
      throw error;
    }
    setCreditos({ ...creditos, ...updates });
    toast.success("Créditos atualizados!");
  };

  const updateLembrete = async (id: string, updates: Partial<ComunicacaoLembrete>) => {
    const { error } = await supabase
      .from("comunicacao_lembretes")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar lembrete");
      throw error;
    }
    setLembretes(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    toast.success("Lembrete atualizado!");
  };

  const updateRespostaAutomatica = async (id: string, updates: Partial<ComunicacaoRespostaAutomatica>) => {
    const { error } = await supabase
      .from("comunicacao_respostas_automaticas")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar resposta");
      throw error;
    }
    setRespostasAutomaticas(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    toast.success("Resposta atualizada!");
  };

  const createRespostaAutomatica = async (resposta: Omit<ComunicacaoRespostaAutomatica, 'id'>) => {
    const { data, error } = await supabase
      .from("comunicacao_respostas_automaticas")
      .insert([resposta])
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar resposta");
      throw error;
    }
    setRespostasAutomaticas(prev => [data, ...prev]);
    toast.success("Resposta criada!");
    return data;
  };

  const deleteRespostaAutomatica = async (id: string) => {
    const { error } = await supabase
      .from("comunicacao_respostas_automaticas")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao excluir resposta");
      throw error;
    }
    setRespostasAutomaticas(prev => prev.filter(r => r.id !== id));
    toast.success("Resposta excluída!");
  };

  const updateCampanha = async (id: string, updates: Partial<ComunicacaoCampanha>) => {
    const { error } = await supabase
      .from("comunicacao_campanhas")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar campanha");
      throw error;
    }
    setCampanhas(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    toast.success("Campanha atualizada!");
  };

  const updateConfigAvancadas = async (updates: Partial<ComunicacaoConfigAvancadas>) => {
    if (!configAvancadas) return;
    const { error } = await supabase
      .from("comunicacao_config_avancadas")
      .update(updates)
      .eq("id", configAvancadas.id);
    if (error) {
      toast.error("Erro ao atualizar configurações");
      throw error;
    }
    setConfigAvancadas({ ...configAvancadas, ...updates });
    toast.success("Configurações atualizadas!");
  };

  return {
    creditos,
    lembretes,
    respostasAutomaticas,
    campanhas,
    estatisticasHoje,
    templatesProntos,
    configAvancadas,
    avaliacoes,
    loading,
    updateCreditos,
    updateLembrete,
    updateRespostaAutomatica,
    createRespostaAutomatica,
    deleteRespostaAutomatica,
    updateCampanha,
    updateConfigAvancadas,
    refetch: fetchAll
  };
}
