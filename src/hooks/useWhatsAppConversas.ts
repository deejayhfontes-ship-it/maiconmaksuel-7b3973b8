import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Conversa {
  id: string;
  cliente_id: string | null;
  telefone: string;
  nome_contato: string;
  foto_url: string | null;
  status: "ativo" | "aguardando" | "resolvido" | "arquivado";
  etiqueta: "urgente" | "orcamento" | "reclamacao" | "agendamento" | "geral" | null;
  atendente_id: string | null;
  ultima_mensagem: string | null;
  ultima_mensagem_hora: string | null;
  nao_lidas: number;
  favorita: boolean;
  arquivada: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  cliente?: {
    id: string;
    nome: string;
    celular: string;
    foto_url: string | null;
    ultima_visita: string | null;
    total_visitas: number;
  } | null;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  texto: string | null;
  tipo: "texto" | "imagem" | "audio" | "documento" | "localizacao" | "sistema";
  midia_url: string | null;
  midia_nome: string | null;
  enviada: boolean;
  status: "enviando" | "enviada" | "entregue" | "lida" | "erro";
  erro_mensagem: string | null;
  wa_message_id: string | null;
  created_at: string;
}

export interface RespostaRapida {
  id: string;
  titulo: string;
  mensagem: string;
  atalho: string | null;
  categoria: string | null;
  ordem: number;
  ativo: boolean;
}

export function useWhatsAppConversas() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("conversas_whatsapp")
        .select(`
          *,
          cliente:clientes(id, nome, celular, foto_url, ultima_visita, total_visitas)
        `)
        .eq("arquivada", false)
        .order("ultima_mensagem_hora", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setConversas((data as Conversa[]) || []);
    } catch (err) {
      console.error("Erro ao buscar conversas:", err);
      setError("Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConversaStatus = async (
    conversaId: string,
    status: Conversa["status"]
  ) => {
    try {
      const { error } = await supabase
        .from("conversas_whatsapp")
        .update({ status })
        .eq("id", conversaId);

      if (error) throw error;

      setConversas((prev) =>
        prev.map((c) => (c.id === conversaId ? { ...c, status } : c))
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      toast.error("Erro ao atualizar status");
    }
  };

  const updateConversaEtiqueta = async (
    conversaId: string,
    etiqueta: Conversa["etiqueta"]
  ) => {
    try {
      const { error } = await supabase
        .from("conversas_whatsapp")
        .update({ etiqueta })
        .eq("id", conversaId);

      if (error) throw error;

      setConversas((prev) =>
        prev.map((c) => (c.id === conversaId ? { ...c, etiqueta } : c))
      );
    } catch (err) {
      console.error("Erro ao atualizar etiqueta:", err);
      toast.error("Erro ao atualizar etiqueta");
    }
  };

  const marcarComoLida = async (conversaId: string) => {
    try {
      const { error } = await supabase
        .from("conversas_whatsapp")
        .update({ nao_lidas: 0 })
        .eq("id", conversaId);

      if (error) throw error;

      setConversas((prev) =>
        prev.map((c) => (c.id === conversaId ? { ...c, nao_lidas: 0 } : c))
      );
    } catch (err) {
      console.error("Erro ao marcar como lida:", err);
    }
  };

  const arquivarConversa = async (conversaId: string) => {
    try {
      const { error } = await supabase
        .from("conversas_whatsapp")
        .update({ arquivada: true })
        .eq("id", conversaId);

      if (error) throw error;

      setConversas((prev) => prev.filter((c) => c.id !== conversaId));
      toast.success("Conversa arquivada");
    } catch (err) {
      console.error("Erro ao arquivar:", err);
      toast.error("Erro ao arquivar conversa");
    }
  };

  const toggleFavorita = async (conversaId: string) => {
    const conversa = conversas.find((c) => c.id === conversaId);
    if (!conversa) return;

    try {
      const { error } = await supabase
        .from("conversas_whatsapp")
        .update({ favorita: !conversa.favorita })
        .eq("id", conversaId);

      if (error) throw error;

      setConversas((prev) =>
        prev.map((c) =>
          c.id === conversaId ? { ...c, favorita: !c.favorita } : c
        )
      );
    } catch (err) {
      console.error("Erro ao favoritar:", err);
      toast.error("Erro ao favoritar conversa");
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchConversas();

    const channel = supabase
      .channel("conversas_whatsapp_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversas_whatsapp",
        },
        () => {
          fetchConversas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversas]);

  const totalNaoLidas = conversas.reduce((acc, c) => acc + c.nao_lidas, 0);

  return {
    conversas,
    loading,
    error,
    totalNaoLidas,
    refetch: fetchConversas,
    updateConversaStatus,
    updateConversaEtiqueta,
    marcarComoLida,
    arquivarConversa,
    toggleFavorita,
  };
}

export function useWhatsAppMensagens(conversaId: string | null) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMensagens = useCallback(async () => {
    if (!conversaId) {
      setMensagens([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mensagens_whatsapp")
        .select("*")
        .eq("conversa_id", conversaId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMensagens((data as Mensagem[]) || []);
    } catch (err) {
      console.error("Erro ao buscar mensagens:", err);
    } finally {
      setLoading(false);
    }
  }, [conversaId]);

  const enviarMensagem = async (texto: string): Promise<boolean> => {
    if (!conversaId || !texto.trim()) return false;

    const tempId = `temp-${Date.now()}`;
    const novaMensagem: Mensagem = {
      id: tempId,
      conversa_id: conversaId,
      texto,
      tipo: "texto",
      midia_url: null,
      midia_nome: null,
      enviada: true,
      status: "enviando",
      erro_mensagem: null,
      wa_message_id: null,
      created_at: new Date().toISOString(),
    };

    setMensagens((prev) => [...prev, novaMensagem]);

    try {
      // Insert message in database
      const { data: insertedMsg, error: insertError } = await supabase
        .from("mensagens_whatsapp")
        .insert({
          conversa_id: conversaId,
          texto,
          tipo: "texto",
          enviada: true,
          status: "enviada",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update conversation's last message
      await supabase
        .from("conversas_whatsapp")
        .update({
          ultima_mensagem: texto,
          ultima_mensagem_hora: new Date().toISOString(),
        })
        .eq("id", conversaId);

      // Replace temp message with real one
      setMensagens((prev) =>
        prev.map((m) => (m.id === tempId ? (insertedMsg as Mensagem) : m))
      );

      return true;
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      // Mark as error
      setMensagens((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, status: "erro" as const, erro_mensagem: "Falha no envio" }
            : m
        )
      );
      return false;
    }
  };

  useEffect(() => {
    fetchMensagens();

    if (!conversaId) return;

    const channel = supabase
      .channel(`mensagens_${conversaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens_whatsapp",
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          setMensagens((prev) => {
            // Avoid duplicates
            const exists = prev.some((m) => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new as Mensagem];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, fetchMensagens]);

  return {
    mensagens,
    loading,
    enviarMensagem,
    refetch: fetchMensagens,
  };
}

export function useRespostasRapidas() {
  const [respostas, setRespostas] = useState<RespostaRapida[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRespostas = async () => {
      try {
        const { data, error } = await supabase
          .from("respostas_rapidas_whatsapp")
          .select("*")
          .eq("ativo", true)
          .order("ordem", { ascending: true });

        if (error) throw error;
        setRespostas((data as RespostaRapida[]) || []);
      } catch (err) {
        console.error("Erro ao buscar respostas rápidas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRespostas();
  }, []);

  return { respostas, loading };
}
