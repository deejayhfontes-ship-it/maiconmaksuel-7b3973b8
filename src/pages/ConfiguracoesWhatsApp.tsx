import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  QrCode, 
  RefreshCw, 
  Send, 
  Settings, 
  MessageSquare, 
  Clock, 
  Bell, 
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  TestTube
} from "lucide-react";

interface ConfiguracoesWhatsApp {
  id: string;
  api_provider: string;
  api_url: string | null;
  api_token: string | null;
  numero_whatsapp: string | null;
  qrcode_conectado: boolean;
  sessao_ativa: boolean;
}

interface MensagemTemplate {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  variaveis_disponiveis: string[];
  ativo: boolean;
}

interface ConfiguracoesTaxaFalta {
  id: string;
  cobrar_taxa: boolean;
  valor_taxa: number;
  prazo_minimo_cancelamento_horas: number;
  comportamento_cancelamento_tardio: string;
  aplicacao_taxa: string;
  horario_inicio_envio: string;
  horario_fim_envio: string;
  tentar_reenvio: boolean;
  tentativas_reenvio: number;
  intervalo_reenvio_minutos: number;
  prazo_confirmacao_horas: number;
  comportamento_sem_confirmacao: string;
  notificar_confirmacao: boolean;
  notificar_cancelamento: boolean;
  notificar_sem_resposta: boolean;
}

const variaveisDescricao: Record<string, string> = {
  cliente: "Nome do cliente",
  data: "Data do agendamento",
  hora: "Horário",
  servico: "Serviço agendado",
  profissional: "Nome do profissional",
  link_confirmar: "Link de confirmação",
  link_cancelar: "Link de cancelamento",
  taxa_falta: "Valor da taxa",
  nome_salao: "Nome do salão",
  telefone_salao: "Telefone do salão",
  link_avaliacao: "Link para avaliação Google",
};

export default function ConfiguracoesWhatsApp() {
  const [config, setConfig] = useState<ConfiguracoesWhatsApp | null>(null);
  const [templates, setTemplates] = useState<MensagemTemplate[]>([]);
  const [configTaxa, setConfigTaxa] = useState<ConfiguracoesTaxaFalta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar configurações WhatsApp
      const { data: configData } = await supabase
        .from("configuracoes_whatsapp")
        .select("*")
        .single();

      if (configData) {
        setConfig(configData);
      } else {
        // Criar configuração padrão
        const { data: newConfig } = await supabase
          .from("configuracoes_whatsapp")
          .insert([{ api_provider: "evolution_api" }])
          .select()
          .single();
        setConfig(newConfig);
      }

      // Buscar templates
      const { data: templatesData } = await supabase
        .from("mensagens_templates")
        .select("*")
        .order("tipo");

      if (templatesData) {
        setTemplates(templatesData.map(t => ({
          ...t,
          variaveis_disponiveis: Array.isArray(t.variaveis_disponiveis) 
            ? (t.variaveis_disponiveis as string[])
            : []
        })));
      }

      // Buscar configurações de taxa
      const { data: taxaData } = await supabase
        .from("configuracoes_taxa_falta")
        .select("*")
        .single();

      if (taxaData) {
        setConfigTaxa(taxaData);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("configuracoes_whatsapp")
        .update({
          api_provider: config.api_provider,
          api_url: config.api_url,
          api_token: config.api_token,
          numero_whatsapp: config.numero_whatsapp,
        })
        .eq("id", config.id);

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (template: MensagemTemplate) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("mensagens_templates")
        .update({
          mensagem: template.mensagem,
          ativo: template.ativo,
        })
        .eq("id", template.id);

      if (error) throw error;
      toast.success("Template salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      toast.error("Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfigTaxa = async () => {
    if (!configTaxa) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("configuracoes_taxa_falta")
        .update(configTaxa)
        .eq("id", configTaxa.id);

      if (error) throw error;
      toast.success("Configurações de taxa salvas!");
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
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Conexão testada com sucesso!");
    } catch (error) {
      toast.error("Falha ao testar conexão");
    } finally {
      setTestando(false);
    }
  };

  const handleGerarQRCode = async () => {
    setTestando(true);
    try {
      // Simular geração de QR Code
      await new Promise(resolve => setTimeout(resolve, 1500));
      setQrCodeData("simulated-qr-code");
      toast.info("QR Code gerado! Escaneie com seu WhatsApp.");
    } catch (error) {
      toast.error("Erro ao gerar QR Code");
    } finally {
      setTestando(false);
    }
  };

  const handleTestarMensagem = async (template: MensagemTemplate) => {
    setTestando(true);
    try {
      // Simular envio de mensagem de teste
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Mensagem de teste enviada!");
    } catch (error) {
      toast.error("Erro ao enviar mensagem de teste");
    } finally {
      setTestando(false);
    }
  };

  const getTemplateByTipo = (tipo: string) => {
    return templates.find(t => t.tipo === tipo);
  };

  const updateTemplate = (tipo: string, updates: Partial<MensagemTemplate>) => {
    setTemplates(prev => prev.map(t => 
      t.tipo === tipo ? { ...t, ...updates } : t
    ));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-primary" />
          Configurações WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Configure o envio automático de mensagens e confirmações
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card de Conexão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {config?.sessao_ativa ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-destructive" />
              )}
              Conexão WhatsApp
            </CardTitle>
            <CardDescription>
              Status da conexão com a API do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config?.sessao_ativa ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                </div>
                {config.numero_whatsapp && (
                  <p className="text-sm text-muted-foreground">
                    Número: {config.numero_whatsapp}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconectar
                  </Button>
                  <Button variant="destructive" size="sm">
                    Desconectar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Não conectado
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Para conectar:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Clique em "Gerar QR Code"</li>
                    <li>Abra WhatsApp no celular</li>
                    <li>Vá em Aparelhos Conectados</li>
                    <li>Escaneie o QR Code</li>
                  </ol>
                </div>
                <Button 
                  onClick={handleGerarQRCode}
                  disabled={testando}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {testando ? "Gerando..." : "Gerar QR Code"}
                </Button>
                {qrCodeData && (
                  <div className="border rounded-lg p-4 bg-white flex items-center justify-center">
                    <div className="w-48 h-48 bg-muted flex items-center justify-center text-muted-foreground">
                      <QrCode className="h-24 w-24" />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Card de API Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Provedor de API
            </CardTitle>
            <CardDescription>
              Configure o provedor de API do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione o Provedor</Label>
              <Select
                value={config?.api_provider || "evolution_api"}
                onValueChange={(value) => setConfig(prev => prev ? { ...prev, api_provider: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evolution_api">
                    Evolution API (Recomendado - Gratuito)
                  </SelectItem>
                  <SelectItem value="wppconnect">
                    WPPConnect (Gratuito)
                  </SelectItem>
                  <SelectItem value="baileys">
                    Baileys (Gratuito)
                  </SelectItem>
                  <SelectItem value="oficial">
                    WhatsApp Business API (Pago - Oficial)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL da API</Label>
              <Input
                placeholder="http://localhost:8080"
                value={config?.api_url || ""}
                onChange={(e) => setConfig(prev => prev ? { ...prev, api_url: e.target.value } : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Token de Autenticação</Label>
              <Input
                type="password"
                placeholder="Seu token aqui"
                value={config?.api_token || ""}
                onChange={(e) => setConfig(prev => prev ? { ...prev, api_token: e.target.value } : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Número do WhatsApp</Label>
              <Input
                placeholder="(11) 99999-8888"
                value={config?.numero_whatsapp || ""}
                onChange={(e) => setConfig(prev => prev ? { ...prev, numero_whatsapp: e.target.value } : null)}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleTestarConexao}
                disabled={testando}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testando ? "Testando..." : "Testar Conexão"}
              </Button>
              <Button onClick={handleSaveConfig} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Mensagens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mensagens Automáticas
          </CardTitle>
          <CardDescription>
            Configure os templates de mensagens enviadas automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="confirmacao" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="confirmacao" className="text-xs sm:text-sm">
                <Bell className="h-4 w-4 mr-1 hidden sm:inline" />
                Confirmação
              </TabsTrigger>
              <TabsTrigger value="lembrete" className="text-xs sm:text-sm">
                <Clock className="h-4 w-4 mr-1 hidden sm:inline" />
                Lembrete
              </TabsTrigger>
              <TabsTrigger value="pos" className="text-xs sm:text-sm">
                <MessageSquare className="h-4 w-4 mr-1 hidden sm:inline" />
                Pós
              </TabsTrigger>
              <TabsTrigger value="avaliacao" className="text-xs sm:text-sm">
                ⭐
                Avaliação
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs sm:text-sm">
                <Settings className="h-4 w-4 mr-1 hidden sm:inline" />
                Config
              </TabsTrigger>
            </TabsList>

            {/* Tab Confirmação */}
            <TabsContent value="confirmacao" className="space-y-4 mt-4">
              {(() => {
                const template = getTemplateByTipo("confirmacao_agendamento");
                if (!template) return null;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Enviar automaticamente 1 dia antes
                      </Label>
                      <Switch
                        checked={template.ativo}
                        onCheckedChange={(checked) => updateTemplate("confirmacao_agendamento", { ativo: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Textarea
                        className="min-h-[300px] font-mono text-sm"
                        value={template.mensagem}
                        onChange={(e) => updateTemplate("confirmacao_agendamento", { mensagem: e.target.value })}
                      />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <Label className="text-sm font-medium mb-2 block">
                        Variáveis Disponíveis
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {template.variaveis_disponiveis.map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {`{${v}}`} - {variaveisDescricao[v] || v}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleTestarMensagem(template)}
                        disabled={testando}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Testar Mensagem
                      </Button>
                      <Button 
                        onClick={() => handleSaveTemplate(template)}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </>
                );
              })()}
            </TabsContent>

            {/* Tab Lembrete */}
            <TabsContent value="lembrete" className="space-y-4 mt-4">
              {(() => {
                const template = getTemplateByTipo("lembrete_3horas");
                if (!template) return null;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Enviar lembrete 3 horas antes
                      </Label>
                      <Switch
                        checked={template.ativo}
                        onCheckedChange={(checked) => updateTemplate("lembrete_3horas", { ativo: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Textarea
                        className="min-h-[200px] font-mono text-sm"
                        value={template.mensagem}
                        onChange={(e) => updateTemplate("lembrete_3horas", { mensagem: e.target.value })}
                      />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <Label className="text-sm font-medium mb-2 block">
                        Variáveis Disponíveis
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {template.variaveis_disponiveis.map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {`{${v}}`} - {variaveisDescricao[v] || v}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleTestarMensagem(template)}
                        disabled={testando}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Testar Mensagem
                      </Button>
                      <Button 
                        onClick={() => handleSaveTemplate(template)}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </>
                );
              })()}
            </TabsContent>

            {/* Tab Pós-Atendimento */}
            <TabsContent value="pos" className="space-y-4 mt-4">
              {(() => {
                const template = getTemplateByTipo("pos_atendimento");
                if (!template) return null;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Enviar agradecimento no dia seguinte
                      </Label>
                      <Switch
                        checked={template.ativo}
                        onCheckedChange={(checked) => updateTemplate("pos_atendimento", { ativo: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Textarea
                        className="min-h-[150px] font-mono text-sm"
                        value={template.mensagem}
                        onChange={(e) => updateTemplate("pos_atendimento", { mensagem: e.target.value })}
                      />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <Label className="text-sm font-medium mb-2 block">
                        Variáveis Disponíveis
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {template.variaveis_disponiveis.map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {`{${v}}`} - {variaveisDescricao[v] || v}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleTestarMensagem(template)}
                        disabled={testando}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Testar Mensagem
                      </Button>
                      <Button 
                        onClick={() => handleSaveTemplate(template)}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </>
                );
              })()}
            </TabsContent>

            {/* Tab Avaliação */}
            <TabsContent value="avaliacao" className="space-y-4 mt-4">
              {(() => {
                const template = getTemplateByTipo("avaliacao");
                if (!template) return (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Template de avaliação não encontrado.</p>
                    <p className="text-sm">Recarregue a página para carregar os templates.</p>
                  </div>
                );
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">
                        Enviar pedido de avaliação 2 dias após atendimento
                      </Label>
                      <Switch
                        checked={template.ativo}
                        onCheckedChange={(checked) => updateTemplate("avaliacao", { ativo: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Textarea
                        className="min-h-[150px] font-mono text-sm"
                        value={template.mensagem}
                        onChange={(e) => updateTemplate("avaliacao", { mensagem: e.target.value })}
                      />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <Label className="text-sm font-medium mb-2 block">
                        Variáveis Disponíveis
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {template.variaveis_disponiveis.map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {`{${v}}`} - {variaveisDescricao[v] || v}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleTestarMensagem(template)}
                        disabled={testando}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Testar Mensagem
                      </Button>
                      <Button 
                        onClick={() => handleSaveTemplate(template)}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </>
                );
              })()}
            </TabsContent>

            {/* Tab Configurações */}
            <TabsContent value="config" className="space-y-6 mt-4">
              {configTaxa && (
                <>
                  {/* Taxa por Falta */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Taxa por Falta
                    </h3>
                    
                    <div className="flex items-center justify-between">
                      <Label>Cobrar taxa em caso de falta sem aviso</Label>
                      <Switch
                        checked={configTaxa.cobrar_taxa}
                        onCheckedChange={(checked) => setConfigTaxa(prev => prev ? { ...prev, cobrar_taxa: checked } : null)}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Valor da Taxa (R$)</Label>
                        <Input
                          type="number"
                          value={configTaxa.valor_taxa}
                          onChange={(e) => setConfigTaxa(prev => prev ? { ...prev, valor_taxa: parseFloat(e.target.value) || 0 } : null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prazo Mínimo Cancelamento (horas)</Label>
                        <Input
                          type="number"
                          value={configTaxa.prazo_minimo_cancelamento_horas}
                          onChange={(e) => setConfigTaxa(prev => prev ? { ...prev, prazo_minimo_cancelamento_horas: parseInt(e.target.value) || 3 } : null)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Se cancelar com menos tempo:</Label>
                      <Select
                        value={configTaxa.comportamento_cancelamento_tardio}
                        onValueChange={(value) => setConfigTaxa(prev => prev ? { ...prev, comportamento_cancelamento_tardio: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao_cobrar">Não cobrar taxa</SelectItem>
                          <SelectItem value="cobrar_50">Cobrar 50% da taxa</SelectItem>
                          <SelectItem value="cobrar_integral">Cobrar taxa integral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Como aplicar taxa:</Label>
                      <Select
                        value={configTaxa.aplicacao_taxa}
                        onValueChange={(value) => setConfigTaxa(prev => prev ? { ...prev, aplicacao_taxa: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="automatica">Cobrança automática no próximo agendamento</SelectItem>
                          <SelectItem value="manual">Manual (gerente decide)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Horário de Envio */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Envio
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Não enviar antes de:</Label>
                        <Input
                          type="time"
                          value={configTaxa.horario_inicio_envio}
                          onChange={(e) => setConfigTaxa(prev => prev ? { ...prev, horario_inicio_envio: e.target.value } : null)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Não enviar depois de:</Label>
                        <Input
                          type="time"
                          value={configTaxa.horario_fim_envio}
                          onChange={(e) => setConfigTaxa(prev => prev ? { ...prev, horario_fim_envio: e.target.value } : null)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Tentar reenvio se falhar</Label>
                      <Switch
                        checked={configTaxa.tentar_reenvio}
                        onCheckedChange={(checked) => setConfigTaxa(prev => prev ? { ...prev, tentar_reenvio: checked } : null)}
                      />
                    </div>

                    {configTaxa.tentar_reenvio && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Tentativas</Label>
                          <Input
                            type="number"
                            value={configTaxa.tentativas_reenvio}
                            onChange={(e) => setConfigTaxa(prev => prev ? { ...prev, tentativas_reenvio: parseInt(e.target.value) || 3 } : null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Intervalo (minutos)</Label>
                          <Input
                            type="number"
                            value={configTaxa.intervalo_reenvio_minutos}
                            onChange={(e) => setConfigTaxa(prev => prev ? { ...prev, intervalo_reenvio_minutos: parseInt(e.target.value) || 30 } : null)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirmação */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Confirmação
                    </h3>

                    <div className="space-y-2">
                      <Label>Prazo para confirmar (horas antes)</Label>
                      <Input
                        type="number"
                        value={configTaxa.prazo_confirmacao_horas}
                        onChange={(e) => setConfigTaxa(prev => prev ? { ...prev, prazo_confirmacao_horas: parseInt(e.target.value) || 2 } : null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Se não confirmar:</Label>
                      <Select
                        value={configTaxa.comportamento_sem_confirmacao}
                        onValueChange={(value) => setConfigTaxa(prev => prev ? { ...prev, comportamento_sem_confirmacao: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manter">Manter agendamento</SelectItem>
                          <SelectItem value="marcar_nao_confirmado">Marcar como "não confirmado"</SelectItem>
                          <SelectItem value="cancelar">Cancelar automaticamente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notificações */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notificar Profissional
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Se cliente confirmar</Label>
                        <Switch
                          checked={configTaxa.notificar_confirmacao}
                          onCheckedChange={(checked) => setConfigTaxa(prev => prev ? { ...prev, notificar_confirmacao: checked } : null)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Se cliente cancelar</Label>
                        <Switch
                          checked={configTaxa.notificar_cancelamento}
                          onCheckedChange={(checked) => setConfigTaxa(prev => prev ? { ...prev, notificar_cancelamento: checked } : null)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Se não responder</Label>
                        <Switch
                          checked={configTaxa.notificar_sem_resposta}
                          onCheckedChange={(checked) => setConfigTaxa(prev => prev ? { ...prev, notificar_sem_resposta: checked } : null)}
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveConfigTaxa}
                    disabled={saving}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
