import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Settings,
  Moon,
  MessageSquare,
  User,
  Shield,
  CreditCard,
  QrCode,
  RefreshCw,
  Zap,
  Save,
  Smartphone,
  BookOpen,
  CheckCircle2,
  XCircle,
  Copy,
  Webhook,
  Terminal
} from "lucide-react";
import { Send } from "lucide-react";
import { ComunicacaoConfigAvancadas as ConfigType, ComunicacaoCreditos } from "@/hooks/useComunicacao";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface ConfigWhatsApp {
  api_provider: string;
  api_url: string | null;
  api_token: string | null;
  numero_whatsapp: string | null;
  sessao_ativa?: boolean;
  qrcode_conectado?: boolean;
  instance_name?: string | null;
  instance_id?: string | null;
  client_token?: string | null;
}

interface Props {
  config: ConfigType | null;
  creditos: ComunicacaoCreditos | null;
  configWhatsApp: ConfigWhatsApp | null;
  onUpdateConfig: (updates: Partial<ConfigType>) => Promise<void>;
  onUpdateCreditos: (updates: Partial<ComunicacaoCreditos>) => Promise<void>;
  onSaveWhatsApp: () => Promise<void>;
  onConfigWhatsAppChange: (updates: Partial<ConfigWhatsApp>) => void;
  saving: boolean;
}

export function ComunicacaoConfigAvancadas({
  config,
  creditos,
  configWhatsApp,
  onUpdateConfig,
  onUpdateCreditos,
  onSaveWhatsApp,
  onConfigWhatsAppChange,
  saving
}: Props) {
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [testEnvio, setTestEnvio] = useState(false);
  const [telefoneTeste, setTelefoneTeste] = useState("");
  const [verificandoConexao, setVerificandoConexao] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  if (!config) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando configurações...
      </div>
    );
  }

  const webhookUrl = `https://hhzvjsrsoyhjzeiuxpep.supabase.co/functions/v1/zapi-webhook`;
  const isZApi = configWhatsApp?.api_provider === 'z_api';

  const handleVerificarConexao = async () => {
    setVerificandoConexao(true);
    setConnectionStatus(null);
    try {
      if (isZApi) {
        // Z-API: checa status da instância
        const instanceId = (configWhatsApp as any)?.instance_id || '3EFBBECF9076D192D3C91E78C95369C2';
        const token = configWhatsApp?.api_token || '4B0D7C7DF8E790BBD1B6122B';
        const clientToken = (configWhatsApp as any)?.client_token || 'Fafa7e4b75c2f4916b191413209fe9d08S';
        const res = await fetch(
          `https://api.z-api.io/instances/${instanceId}/token/${token}/status`,
          { headers: { 'Client-Token': clientToken } }
        );
        const data = await res.json();
        const connected = data?.connected === true || data?.status === 'connected';
        if (connected) {
          setConnectionStatus('open');
          toast.success('✅ Z-API conectada e funcionando!');
          onConfigWhatsAppChange({ sessao_ativa: true, qrcode_conectado: true });
        } else {
          setConnectionStatus('close');
          toast.warning(`Status Z-API: ${JSON.stringify(data)}`);
          onConfigWhatsAppChange({ sessao_ativa: false });
        }
      } else {
        // Evolution API
        if (!configWhatsApp?.api_url || !configWhatsApp?.api_token || !configWhatsApp?.instance_name) {
          toast.error('Preencha URL da API, Token e Nome da Instância primeiro');
          return;
        }
        const url = `${configWhatsApp.api_url}/instance/connectionState/${configWhatsApp.instance_name}`;
        const res = await fetch(url, { headers: { apikey: configWhatsApp.api_token } });
        const data = await res.json();
        const state = data?.instance?.state || data?.state || 'unknown';
        setConnectionStatus(state);
        if (state === 'open') {
          toast.success('✅ WhatsApp conectado!');
          onConfigWhatsAppChange({ sessao_ativa: true, qrcode_conectado: true });
        } else {
          toast.warning(`Status: ${state}`);
          onConfigWhatsAppChange({ sessao_ativa: false, qrcode_conectado: false });
        }
      }
    } catch (err: any) {
      console.error('[WHATSAPP] connection check fail', err);
      toast.error(`Erro ao verificar: ${err.message}`);
      setConnectionStatus('error');
    } finally {
      setVerificandoConexao(false);
    }
  };

  const handleGerarQRCode = async () => {
    if (!configWhatsApp?.api_url || !configWhatsApp?.api_token || !configWhatsApp?.instance_name) {
      toast.error("Preencha URL da API, Token e Nome da Instância primeiro");
      return;
    }
    setGeneratingQR(true);
    setQrCodeData(null);
    try {
      const url = `${configWhatsApp.api_url}/instance/connect/${configWhatsApp.instance_name}`;
      const res = await fetch(url, {
        headers: { apikey: configWhatsApp.api_token },
      });
      const data = await res.json();

      // Evolution API returns base64 QR or pairingCode
      const qrBase64 = data?.base64 || data?.qrcode?.base64 || data?.code;
      if (qrBase64) {
        const imgSrc = qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`;
        setQrCodeData(imgSrc);
        setQrModalOpen(true);
        toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
      } else {
        toast.error("Não foi possível gerar QR Code. Verifique se a instância existe.");
        console.log("[QR] Response:", data);
      }
    } catch (err: any) {
      console.error("[WHATSAPP] QR generation fail", err);
      toast.error(`Erro: ${err.message}`);
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleTestarEnvio = async () => {
    if (!telefoneTeste.trim()) {
      toast.error('Informe um número de telefone para teste');
      return;
    }
    setTestEnvio(true);
    try {
      if (isZApi) {
        // Z-API: chama diretamente
        const instanceId = (configWhatsApp as any)?.instance_id || '3EFBBECF9076D192D3C91E78C95369C2';
        const token = configWhatsApp?.api_token || '4B0D7C7DF8E790BBD1B6122B';
        const clientToken = (configWhatsApp as any)?.client_token || 'Fafa7e4b75c2f4916b191413209fe9d08S';
        const phone = telefoneTeste.replace(/\D/g, '');
        const res = await fetch(
          `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Client-Token': clientToken },
            body: JSON.stringify({ phone, message: '✅ Teste do sistema Maicon Maksuel. Integração Z-API funcionando!' })
          }
        );
        const data = await res.json();
        if (data?.zaapId || data?.messageId || data?.id) {
          toast.success('✅ Mensagem enviada com sucesso!');
        } else {
          toast.error(`Z-API retornou: ${JSON.stringify(data)}`);
        }
      } else {
        // Evolution API via Edge Function
        const { data, error } = await supabase.functions.invoke('whatsapp-send', {
          body: { telefone: telefoneTeste, mensagem: '✅ Teste do sistema Maicon Maksuel!', cliente_nome: 'Teste' }
        });
        if (error) throw error;
        if (data?.success) toast.success('Mensagem enviada!');
        else toast.error(data?.error || 'Falha ao enviar');
      }
    } catch (err: any) {
      console.error('[WHATSAPP] test_send_fail', err);
      toast.error(`Erro: ${err.message || 'Falha ao enviar'}`);
    } finally {
      setTestEnvio(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL do webhook copiada!");
  };

  return (
    <div className="space-y-6">
      {/* Como Configurar - Evolution API Setup Guide */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Como Configurar a Evolution API
          </CardTitle>
          <CardDescription>
            Siga os passos abaixo para conectar seu WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <Badge variant="outline" className="mt-0.5 shrink-0 font-mono">1</Badge>
              <div>
                <p className="text-sm font-medium">Instale a Evolution API via Docker</p>
                <div className="mt-1 bg-muted rounded-md p-2 font-mono text-xs overflow-x-auto flex items-center gap-2">
                  <Terminal className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <code>docker run -d --name evolution-api -p 8080:8080 atendai/evolution-api</code>
                </div>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Badge variant="outline" className="mt-0.5 shrink-0 font-mono">2</Badge>
              <div>
                <p className="text-sm font-medium">Acesse <code className="bg-muted px-1 rounded text-xs">http://localhost:8080</code> e crie uma instância</p>
                <p className="text-xs text-muted-foreground mt-0.5">Escolha um nome para a instância (ex: "meu-salao")</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Badge variant="outline" className="mt-0.5 shrink-0 font-mono">3</Badge>
              <div>
                <p className="text-sm font-medium">Copie a API Key gerada</p>
                <p className="text-xs text-muted-foreground mt-0.5">A chave aparece ao criar a instância no painel</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Badge variant="outline" className="mt-0.5 shrink-0 font-mono">4</Badge>
              <div>
                <p className="text-sm font-medium">Preencha os campos abaixo:</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                  <li><strong>API URL:</strong> http://localhost:8080 (ou IP do servidor)</li>
                  <li><strong>API Token:</strong> a key copiada no passo 3</li>
                  <li><strong>Nome da Instância:</strong> o nome que você criou</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Badge variant="outline" className="mt-0.5 shrink-0 font-mono">5</Badge>
              <div>
                <p className="text-sm font-medium">Clique em "Gerar QR Code" e escaneie com seu WhatsApp</p>
                <p className="text-xs text-muted-foreground mt-0.5">Abra WhatsApp → Aparelhos Conectados → Conectar dispositivo</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Badge variant="outline" className="mt-0.5 shrink-0 font-mono">6</Badge>
              <div>
                <p className="text-sm font-medium">Configure o Webhook no Evolution API</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No painel da Evolution API, configure o webhook da sua instância com a URL abaixo e o evento <code className="bg-muted px-1 rounded">MESSAGES_UPSERT</code>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Provedor + Campos de API */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
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
                value={configWhatsApp?.api_provider || "evolution_api"}
                onValueChange={(value) => onConfigWhatsAppChange({ api_provider: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="z_api">Z-API ✅ (Conectado)</SelectItem>
                  <SelectItem value="evolution_api">Evolution API (Auto-hospedado)</SelectItem>
                  <SelectItem value="wppconnect">WPPConnect (Gratuito)</SelectItem>
                  <SelectItem value="baileys">Baileys (Gratuito)</SelectItem>
                  <SelectItem value="oficial">WhatsApp Business API (Pago)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL da API</Label>
              <Input
                placeholder="http://localhost:8080"
                value={configWhatsApp?.api_url || ""}
                onChange={(e) => onConfigWhatsAppChange({ api_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Token de Autenticação</Label>
              <Input
                type="password"
                placeholder="Sua API Key aqui"
                value={configWhatsApp?.api_token || ""}
                onChange={(e) => onConfigWhatsAppChange({ api_token: e.target.value })}
              />
            </div>

            {isZApi ? (
              <>
                <div className="space-y-2">
                  <Label>Instance ID (Z-API)</Label>
                  <Input
                    placeholder="3EFBBECF9076D..."
                    value={(configWhatsApp as any)?.instance_id || ""}
                    onChange={(e) => onConfigWhatsAppChange({ instance_id: e.target.value } as any)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Token (Z-API)</Label>
                  <Input
                    type="password"
                    placeholder="Fafa7e4b75c2f..."
                    value={(configWhatsApp as any)?.client_token || ""}
                    onChange={(e) => onConfigWhatsAppChange({ client_token: e.target.value } as any)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Nome da Instância</Label>
                <Input
                  placeholder="meu-salao"
                  value={(configWhatsApp as any)?.instance_name || ""}
                  onChange={(e) => onConfigWhatsAppChange({ instance_name: e.target.value } as any)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Número do WhatsApp</Label>
              <Input
                placeholder="(11) 99999-8888"
                value={configWhatsApp?.numero_whatsapp || ""}
                onChange={(e) => onConfigWhatsAppChange({ numero_whatsapp: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={onSaveWhatsApp} disabled={saving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conexão WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-[#25D366]" />
              Conexão WhatsApp
            </CardTitle>
            <CardDescription>
              Verifique a conexão e escaneie o QR Code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              {connectionStatus === "open" ? (
                <Badge className="bg-[#25D366] gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </Badge>
              ) : connectionStatus === "close" || connectionStatus === "error" ? (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> Desconectado
                </Badge>
              ) : (
                <Badge variant={configWhatsApp?.sessao_ativa ? "default" : "secondary"} className={configWhatsApp?.sessao_ativa ? "bg-[#25D366]" : ""}>
                  {configWhatsApp?.sessao_ativa ? "✅ Conectado" : "⏳ Não verificado"}
                </Badge>
              )}
            </div>

            {/* Verificar Conexão */}
            <Button
              variant="outline"
              onClick={handleVerificarConexao}
              disabled={verificandoConexao}
              className="w-full"
            >
              {verificandoConexao ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Verificar Conexão
            </Button>

            {/* Gerar QR Code */}
            <Button
              onClick={handleGerarQRCode}
              disabled={generatingQR}
              className="w-full bg-[#25D366] hover:bg-[#128C7E]"
            >
              {generatingQR ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4 mr-2" />
              )}
              Gerar QR Code
            </Button>

            {/* Inline QR placeholder */}
            <div className="flex justify-center p-4 bg-white rounded-lg border min-h-[160px] items-center">
              <div className="text-center text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Clique em "Gerar QR Code" para conectar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Config */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-5 w-5 text-amber-600" />
            Configuração do Webhook
          </CardTitle>
          <CardDescription>
            {isZApi
              ? 'Webhook configurado automaticamente na Z-API — recebe respostas SIM/NÃO dos clientes'
              : 'Configure este webhook no painel da Evolution API para receber mensagens automaticamente'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Eventos para ativar</Label>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="font-mono text-xs">MESSAGES_UPSERT</Badge>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
            <p><strong>No Evolution API:</strong></p>
            <ol className="list-decimal list-inside space-y-0.5 ml-2">
              <li>Acesse o painel da sua instância</li>
              <li>Vá em "Webhook" ou "Settings"</li>
              <li>Cole a URL acima no campo "Webhook URL"</li>
              <li>Ative o evento <code className="bg-background px-1 rounded">MESSAGES_UPSERT</code></li>
              <li>Salve as configurações</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Testar Envio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Testar Envio de Mensagem
          </CardTitle>
          <CardDescription>
            Envie uma mensagem de teste para verificar se a integração está funcionando
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Número de teste (com DDD)</Label>
            <Input
              placeholder="(11) 99999-8888"
              value={telefoneTeste}
              onChange={(e) => setTelefoneTeste(e.target.value)}
            />
          </div>
          <Button
            onClick={handleTestarEnvio}
            disabled={testEnvio || !telefoneTeste.trim()}
            className="w-full"
          >
            {testEnvio ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {testEnvio ? "Enviando..." : "Testar Envio"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Salve as configurações da API antes de testar.
          </p>
        </CardContent>
      </Card>

      {/* Horário de Silêncio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Horário de Silêncio
          </CardTitle>
          <CardDescription>
            Não enviar mensagens fora do horário comercial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Não enviar depois de:</Label>
              <Input
                type="time"
                value={config.horario_silencio_inicio}
                onChange={(e) => onUpdateConfig({ horario_silencio_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Não enviar antes de:</Label>
              <Input
                type="time"
                value={config.horario_silencio_fim}
                onChange={(e) => onUpdateConfig({ horario_silencio_fim: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Mensagens agendadas fora deste horário serão enviadas no início do próximo período permitido
          </p>
        </CardContent>
      </Card>

      {/* Limites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Limites e Proteção Anti-Spam
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Limite diário de mensagens</Label>
            <Input
              type="number"
              value={config.limite_diario_mensagens}
              onChange={(e) => onUpdateConfig({
                limite_diario_mensagens: parseInt(e.target.value) || 500
              })}
            />
            <p className="text-xs text-muted-foreground">
              Evita envio excessivo e bloqueio da conta
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Palavra-chave para Opt-out</Label>
            <Input
              value={config.opt_out_keyword}
              onChange={(e) => onUpdateConfig({ opt_out_keyword: e.target.value.toUpperCase() })}
            />
            <p className="text-xs text-muted-foreground">
              Clientes podem digitar "{config.opt_out_keyword}" para parar de receber mensagens
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Personalização */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5" />
            Personalização do Remetente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Remetente</Label>
            <Input
              placeholder="Nome do salão"
              value={config.nome_remetente || ""}
              onChange={(e) => onUpdateConfig({ nome_remetente: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>URL da Foto de Perfil</Label>
            <Input
              placeholder="https://..."
              value={config.foto_perfil_url || ""}
              onChange={(e) => onUpdateConfig({ foto_perfil_url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Foto que aparecerá no perfil do WhatsApp Business
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fallback SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Fallback para SMS
          </CardTitle>
          <CardDescription>
            Se WhatsApp falhar, tenta enviar por SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar fallback SMS</Label>
              <p className="text-xs text-muted-foreground">
                Envia SMS se mensagem WhatsApp não for entregue
              </p>
            </div>
            <Switch
              checked={config.fallback_sms}
              onCheckedChange={(checked) => onUpdateConfig({ fallback_sms: checked })}
            />
          </div>

          {config.fallback_sms && (
            <div className="space-y-2">
              <Label>API Key do SMS</Label>
              <Input
                type="password"
                placeholder="Chave da API de SMS"
                value={config.sms_api_key || ""}
                onChange={(e) => onUpdateConfig({ sms_api_key: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Créditos */}
      {creditos && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Configurações de Créditos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Alerta quando créditos abaixo de:</Label>
                <Input
                  type="number"
                  value={creditos.alerta_creditos_minimo}
                  onChange={(e) => onUpdateCreditos({
                    alerta_creditos_minimo: parseInt(e.target.value) || 50
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Custo por mensagem (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={creditos.custo_por_mensagem}
                  onChange={(e) => onUpdateCreditos({
                    custo_por_mensagem: parseFloat(e.target.value) || 0.05
                  })}
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center">
                <span className="text-sm">Saldo atual:</span>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {creditos.saldo_creditos} créditos
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Custo estimado por mês: R$ {(creditos.custo_por_mensagem * 500).toFixed(2)}
                (considerando 500 mensagens)
              </p>
            </div>

            <Button variant="outline" className="w-full">
              💳 Comprar Créditos (Integração Futura)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#25D366]" />
              Escaneie o QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeData ? (
              <img src={qrCodeData} alt="QR Code WhatsApp" className="w-64 h-64 rounded-lg" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Abra o WhatsApp no celular</p>
              <p className="text-xs text-muted-foreground">
                Vá em Aparelhos Conectados → Conectar um dispositivo → Escaneie este código
              </p>
            </div>
            <Button variant="outline" onClick={() => { setQrModalOpen(false); handleVerificarConexao(); }}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Já escaneei, verificar conexão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
