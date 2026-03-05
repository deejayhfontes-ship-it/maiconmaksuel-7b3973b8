import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { ConversasList } from "@/components/whatsapp/ConversasList";
import { ChatArea } from "@/components/whatsapp/ChatArea";
import { ClienteInfoPanel } from "@/components/whatsapp/ClienteInfoPanel";
import {
  useWhatsAppConversas,
  useWhatsAppMensagens,
  useRespostasRapidas,
  type Conversa,
} from "@/hooks/useWhatsAppConversas";

export default function AtendimentoWhatsApp() {
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const {
    conversas,
    loading: loadingConversas,
    totalNaoLidas,
    refetch: refetchConversas,
    updateConversaStatus,
    updateConversaEtiqueta,
    marcarComoLida,
    arquivarConversa,
    toggleFavorita,
  } = useWhatsAppConversas();

  const {
    mensagens,
    loading: loadingMensagens,
    enviarMensagem,
  } = useWhatsAppMensagens(conversaSelecionada?.id || null);

  const { respostas: respostasRapidas } = useRespostasRapidas();

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      const { data } = await supabase
        .from("configuracoes_whatsapp")
        .select("sessao_ativa, api_url, api_token")
        .single();

      setIsConnected(
        !!(data?.sessao_ativa && data?.api_url && data?.api_token)
      );
    };
    checkConnection();
  }, []);

  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Mark as read when selecting conversation
  useEffect(() => {
    if (conversaSelecionada && conversaSelecionada.nao_lidas > 0) {
      marcarComoLida(conversaSelecionada.id);
    }
  }, [conversaSelecionada?.id]);

  const handleEnviarMensagem = async (texto: string): Promise<boolean> => {
    setEnviando(true);
    try {
      const success = await enviarMensagem(texto);
      if (success) {
        toast.success("Mensagem enviada!");
      }
      return success;
    } finally {
      setEnviando(false);
    }
  };

  const handleSelectConversa = (conversa: Conversa) => {
    setConversaSelecionada(conversa);
  };

  const handleUpdateStatus = (status: Conversa["status"]) => {
    if (conversaSelecionada) {
      updateConversaStatus(conversaSelecionada.id, status);
      setConversaSelecionada({ ...conversaSelecionada, status });
    }
  };

  const handleUpdateEtiqueta = (etiqueta: Conversa["etiqueta"]) => {
    if (conversaSelecionada) {
      updateConversaEtiqueta(conversaSelecionada.id, etiqueta);
      setConversaSelecionada({ ...conversaSelecionada, etiqueta });
    }
  };

  const handleArquivar = () => {
    if (conversaSelecionada) {
      arquivarConversa(conversaSelecionada.id);
      setConversaSelecionada(null);
    }
  };

  const handleToggleFavorita = () => {
    if (conversaSelecionada) {
      toggleFavorita(conversaSelecionada.id);
      setConversaSelecionada({
        ...conversaSelecionada,
        favorita: !conversaSelecionada.favorita,
      });
    }
  };

  // Mobile view: show list or chat
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {conversaSelecionada ? (
          <div className="flex-1 flex flex-col">
            <Button
              variant="ghost"
              className="m-2 self-start"
              onClick={() => setConversaSelecionada(null)}
            >
              ← Voltar
            </Button>
            <ChatArea
              conversa={conversaSelecionada}
              mensagens={mensagens}
              respostasRapidas={respostasRapidas}
              enviando={enviando}
              onEnviarMensagem={handleEnviarMensagem}
              onUpdateStatus={handleUpdateStatus}
              onUpdateEtiqueta={handleUpdateEtiqueta}
              onArquivar={handleArquivar}
              onToggleFavorita={handleToggleFavorita}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10">
                  <MessageSquare className="h-5 w-5 text-[#25D366]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">WhatsApp</h1>
                  <p className="text-xs text-muted-foreground">
                    {totalNaoLidas > 0
                      ? `${totalNaoLidas} não lida${totalNaoLidas > 1 ? "s" : ""}`
                      : "Todas em dia"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-success" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/configuracoes/whatsapp">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <ConversasList
              conversas={conversas}
              conversaSelecionada={conversaSelecionada}
              onSelectConversa={handleSelectConversa}
              onToggleFavorita={(id) => toggleFavorita(id)}
              loading={loadingConversas}
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop view: 3-panel layout
  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366]/10">
            <MessageSquare className="h-6 w-6 text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Atendimento WhatsApp
              {isConnected ? (
                <Badge className="bg-success/20 text-success border-0 gap-1">
                  <Wifi className="h-3 w-3" />
                  Online
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalNaoLidas > 0
                ? `${totalNaoLidas} mensagem${totalNaoLidas > 1 ? "s" : ""} não lida${totalNaoLidas > 1 ? "s" : ""}`
                : "Todas as conversas em dia"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchConversas()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/configuracoes/whatsapp">
              <Settings className="h-4 w-4 mr-1" />
              Configurar
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content - 3 Panel Layout */}
      <Card className="flex-1 flex overflow-hidden">
        {/* Left Panel - Conversations List */}
        <div className="w-80 lg:w-96 shrink-0">
          <ConversasList
            conversas={conversas}
            conversaSelecionada={conversaSelecionada}
            onSelectConversa={handleSelectConversa}
            onToggleFavorita={(id) => toggleFavorita(id)}
            loading={loadingConversas}
          />
        </div>

        {/* Center Panel - Chat Area */}
        <ChatArea
          conversa={conversaSelecionada}
          mensagens={mensagens}
          respostasRapidas={respostasRapidas}
          enviando={enviando}
          onEnviarMensagem={handleEnviarMensagem}
          onUpdateStatus={handleUpdateStatus}
          onUpdateEtiqueta={handleUpdateEtiqueta}
          onArquivar={handleArquivar}
          onToggleFavorita={handleToggleFavorita}
        />

        {/* Right Panel - Client Info */}
        <ClienteInfoPanel conversa={conversaSelecionada} />
      </Card>
    </div>
  );
}
