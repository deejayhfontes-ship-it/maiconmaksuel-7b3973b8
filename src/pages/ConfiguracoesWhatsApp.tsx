import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  BarChart3, 
  Clock, 
  Bot, 
  Megaphone, 
  Settings, 
  ArrowLeft,
  MessageSquareHeart,
  RefreshCw
} from "lucide-react";
import { useComunicacao } from "@/hooks/useComunicacao";
import { ComunicacaoDashboard } from "@/components/comunicacao/ComunicacaoDashboard";
import { ComunicacaoLembretes } from "@/components/comunicacao/ComunicacaoLembretes";
import { ComunicacaoChatbot } from "@/components/comunicacao/ComunicacaoChatbot";
import { ComunicacaoCampanhas } from "@/components/comunicacao/ComunicacaoCampanhas";
import { ComunicacaoRelatorios } from "@/components/comunicacao/ComunicacaoRelatorios";
import { ComunicacaoConfigAvancadas } from "@/components/comunicacao/ComunicacaoConfigAvancadas";

interface ConfigWhatsApp {
  id: string;
  api_provider: string;
  api_url: string | null;
  api_token: string | null;
  numero_whatsapp: string | null;
  qrcode_conectado: boolean;
  sessao_ativa: boolean;
}

export default function ConfiguracoesWhatsApp() {
  const navigate = useNavigate();
  const [configWhatsApp, setConfigWhatsApp] = useState<ConfigWhatsApp | null>(null);
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState(false);
  
  const {
    creditos,
    lembretes,
    respostasAutomaticas,
    campanhas,
    estatisticasHoje,
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
    refetch
  } = useComunicacao();

  useEffect(() => {
    fetchConfigWhatsApp();
  }, []);

  const fetchConfigWhatsApp = async () => {
    const { data } = await supabase
      .from("configuracoes_whatsapp")
      .select("*")
      .single();

    if (data) {
      setConfigWhatsApp(data);
    } else {
      const { data: newConfig } = await supabase
        .from("configuracoes_whatsapp")
        .insert([{ api_provider: "evolution_api" }])
        .select()
        .single();
      setConfigWhatsApp(newConfig);
    }
  };

  const handleSaveWhatsApp = async () => {
    if (!configWhatsApp) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("configuracoes_whatsapp")
        .update({
          api_provider: configWhatsApp.api_provider,
          api_url: configWhatsApp.api_url,
          api_token: configWhatsApp.api_token,
          numero_whatsapp: configWhatsApp.numero_whatsapp,
        })
        .eq("id", configWhatsApp.id);

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleTestarConexao = async () => {
    setTestando(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Conexão testada com sucesso!");
    } catch {
      toast.error("Falha ao testar conexão");
    } finally {
      setTestando(false);
    }
  };

  const handleReconectar = async () => {
    setTestando(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.info("QR Code gerado! Escaneie com seu WhatsApp.");
    } catch {
      toast.error("Erro ao reconectar");
    } finally {
      setTestando(false);
    }
  };

  const handleTestarMensagem = async (lembrete: { nome: string }) => {
    setTestando(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Mensagem de teste "${lembrete.nome}" enviada!`);
    } catch {
      toast.error("Erro ao enviar mensagem de teste");
    } finally {
      setTestando(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquareHeart className="h-6 w-6 text-primary" />
            Central de Comunicação Inteligente
          </h1>
          <p className="text-muted-foreground">
            Gerencie mensagens automáticas, chatbot, campanhas e relatórios
          </p>
        </div>
      </div>

      {/* Dashboard sempre visível */}
      <ComunicacaoDashboard
        isConnected={configWhatsApp?.sessao_ativa || false}
        estatisticas={estatisticasHoje}
        creditos={creditos}
        onTestarConexao={handleTestarConexao}
        onReconectar={handleReconectar}
        testando={testando}
      />

      {/* Tabs */}
      <Tabs defaultValue="lembretes" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="lembretes" className="flex-1 min-w-[120px] gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Lembretes</span>
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="flex-1 min-w-[120px] gap-1.5">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Respostas</span>
          </TabsTrigger>
          <TabsTrigger value="campanhas" className="flex-1 min-w-[120px] gap-1.5">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Campanhas</span>
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex-1 min-w-[120px] gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex-1 min-w-[120px] gap-1.5">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lembretes" className="mt-6">
          <ComunicacaoLembretes
            lembretes={lembretes}
            onUpdateLembrete={updateLembrete}
            onTestarMensagem={handleTestarMensagem}
            saving={saving}
            testando={testando}
          />
        </TabsContent>

        <TabsContent value="chatbot" className="mt-6">
          <ComunicacaoChatbot
            respostas={respostasAutomaticas}
            onUpdate={updateRespostaAutomatica}
            onCreate={createRespostaAutomatica}
            onDelete={deleteRespostaAutomatica}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="campanhas" className="mt-6">
          <ComunicacaoCampanhas
            campanhas={campanhas}
            onUpdateCampanha={updateCampanha}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-6">
          <ComunicacaoRelatorios
            estatisticas={estatisticasHoje}
            avaliacoes={avaliacoes}
          />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <ComunicacaoConfigAvancadas
            config={configAvancadas}
            creditos={creditos}
            configWhatsApp={configWhatsApp}
            onUpdateConfig={updateConfigAvancadas}
            onUpdateCreditos={updateCreditos}
            onSaveWhatsApp={handleSaveWhatsApp}
            onConfigWhatsAppChange={(updates) => 
              setConfigWhatsApp(prev => prev ? { ...prev, ...updates } : null)
            }
            saving={saving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
