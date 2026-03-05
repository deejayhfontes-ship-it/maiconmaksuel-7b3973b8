import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Share2, 
  ArrowLeft, 
  MessageSquare,
  Mail,
  Phone,
  Calendar,
  Globe,
  Instagram,
  Facebook,
  CheckCircle,
  XCircle,
  ExternalLink,
  Settings,
  Send,
  Save,
  RefreshCw,
  Link,
  Unlink
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ConfiguracoesIntegracoes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("email");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/configuracoes")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6" />
            Integrações
          </h1>
          <p className="text-muted-foreground">
            Configure integrações com serviços externos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">SMS</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Social</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-6 mt-6">
          <WhatsAppIntegrationContent navigate={navigate} />
        </TabsContent>

        <TabsContent value="email" className="space-y-6 mt-6">
          <EmailIntegrationContent />
        </TabsContent>

        <TabsContent value="sms" className="space-y-6 mt-6">
          <SMSIntegrationContent />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6 mt-6">
          <GoogleCalendarIntegrationContent />
        </TabsContent>

        <TabsContent value="social" className="space-y-6 mt-6">
          <RedesSociaisIntegrationContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// WhatsApp Integration
function WhatsAppIntegrationContent({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">WhatsApp Business</h3>
              <p className="text-sm text-muted-foreground">Integração com WhatsApp para mensagens automáticas</p>
            </div>
          </div>
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            Configurar
          </Badge>
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-muted-foreground mb-4">
          A configuração completa do WhatsApp está disponível em uma página dedicada com todos os recursos avançados.
        </p>
        <Button onClick={() => navigate("/configuracoes/whatsapp")}>
          <Settings className="h-4 w-4 mr-2" />
          Ir para Configurações do WhatsApp
        </Button>
      </Card>
    </div>
  );
}

// Email Integration
function EmailIntegrationContent() {
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState({
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    senderName: "Maicon Maksuel Salão",
    senderEmail: "",
    useTLS: true,
  });

  const handleTest = () => {
    toast.info("Enviando email de teste...");
    setTimeout(() => {
      toast.success("Email de teste enviado com sucesso!");
    }, 2000);
  };

  const handleSave = () => {
    setConnected(true);
    toast.success("Configurações de email salvas!");
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${connected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
              <Mail className={`h-6 w-6 ${connected ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Integração de Email (SMTP)</h3>
              <p className="text-sm text-muted-foreground">
                {connected ? 'Conectado e funcionando' : 'Configure seu servidor de email'}
              </p>
            </div>
          </div>
          {connected ? (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="outline">Desconectado</Badge>
          )}
        </div>
      </Card>

      {/* Configuração SMTP */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Configuração SMTP</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Servidor SMTP</label>
              <Input 
                placeholder="smtp.gmail.com" 
                value={config.smtpHost}
                onChange={(e) => setConfig({...config, smtpHost: e.target.value})}
                className="mt-1" 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Porta</label>
              <Input 
                placeholder="587" 
                value={config.smtpPort}
                onChange={(e) => setConfig({...config, smtpPort: e.target.value})}
                className="mt-1" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Usuário/Email</label>
              <Input 
                placeholder="seu@email.com" 
                value={config.smtpUser}
                onChange={(e) => setConfig({...config, smtpUser: e.target.value})}
                className="mt-1" 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Senha/App Password</label>
              <Input 
                type="password" 
                placeholder="••••••••"
                value={config.smtpPass}
                onChange={(e) => setConfig({...config, smtpPass: e.target.value})}
                className="mt-1" 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Switch 
              checked={config.useTLS}
              onCheckedChange={(checked) => setConfig({...config, useTLS: checked})}
            />
            <span className="text-sm">Usar TLS/SSL</span>
          </div>
        </div>
      </Card>

      {/* Remetente */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Informações do Remetente</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Nome do Remetente</label>
            <Input 
              placeholder="Nome do Salão" 
              value={config.senderName}
              onChange={(e) => setConfig({...config, senderName: e.target.value})}
              className="mt-1" 
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email do Remetente</label>
            <Input 
              placeholder="contato@salao.com" 
              value={config.senderEmail}
              onChange={(e) => setConfig({...config, senderEmail: e.target.value})}
              className="mt-1" 
            />
          </div>
        </div>
      </Card>

      {/* Templates */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Templates de Email</h3>
        
        <div className="space-y-3">
          {[
            { nome: "Confirmação de Agendamento", status: "ativo" },
            { nome: "Lembrete de Agendamento", status: "ativo" },
            { nome: "Nota Fiscal", status: "ativo" },
            { nome: "Aniversário", status: "inativo" },
          ].map((template, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <span>{template.nome}</span>
              <div className="flex items-center gap-2">
                <Badge variant={template.status === "ativo" ? "default" : "outline"}>
                  {template.status}
                </Badge>
                <Button variant="ghost" size="sm">Editar</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
        <Button variant="outline" onClick={handleTest}>
          <Send className="h-4 w-4 mr-2" />
          Enviar Email de Teste
        </Button>
      </div>
    </div>
  );
}

// SMS Integration
function SMSIntegrationContent() {
  const [provider, setProvider] = useState("");
  const [connected, setConnected] = useState(false);

  const providers = [
    { id: "twilio", nome: "Twilio", logo: "📱" },
    { id: "zenvia", nome: "Zenvia", logo: "💬" },
    { id: "infobip", nome: "Infobip", logo: "📲" },
    { id: "smsdev", nome: "SMSDev", logo: "📨" },
  ];

  const handleSave = () => {
    if (provider) {
      setConnected(true);
      toast.success("Integração SMS configurada!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${connected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
              <Phone className={`h-6 w-6 ${connected ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Integração SMS</h3>
              <p className="text-sm text-muted-foreground">
                {connected ? `Conectado via ${providers.find(p => p.id === provider)?.nome}` : 'Escolha um provedor de SMS'}
              </p>
            </div>
          </div>
          {connected ? (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="outline">Desconectado</Badge>
          )}
        </div>
      </Card>

      {/* Escolher Provedor */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Escolha o Provedor</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {providers.map((prov) => (
            <label key={prov.id} className="cursor-pointer">
              <input 
                type="radio" 
                name="provider" 
                value={prov.id}
                checked={provider === prov.id}
                onChange={(e) => setProvider(e.target.value)}
                className="sr-only peer" 
              />
              <div className="p-4 border-2 rounded-lg peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{prov.logo}</span>
                  <div>
                    <p className="font-medium">{prov.nome}</p>
                    <p className="text-xs text-muted-foreground">Provedor de SMS</p>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Credenciais */}
      {provider && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Credenciais {providers.find(p => p.id === provider)?.nome}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">API Key / Account SID</label>
              <Input placeholder="Sua chave de API" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Auth Token / Secret</label>
              <Input type="password" placeholder="••••••••" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Número Remetente</label>
              <Input placeholder="+5535999999999" className="mt-1" />
            </div>
          </div>
        </Card>
      )}

      {/* Uso */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Uso do SMS</h3>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Confirmação de Agendamento</p>
              <p className="text-sm text-muted-foreground">Enviar SMS para confirmar agendamentos</p>
            </div>
            <Switch />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Lembrete de Agendamento</p>
              <p className="text-sm text-muted-foreground">Enviar SMS de lembrete</p>
            </div>
            <Switch defaultChecked />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Código de Verificação</p>
              <p className="text-sm text-muted-foreground">Enviar códigos 2FA via SMS</p>
            </div>
            <Switch />
          </label>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={!provider}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
        <Button variant="outline" disabled={!connected}>
          <Send className="h-4 w-4 mr-2" />
          Enviar SMS de Teste
        </Button>
      </div>
    </div>
  );
}

// Google Calendar Integration
function GoogleCalendarIntegrationContent() {
  const [connected, setConnected] = useState(false);

  const handleConnect = () => {
    toast.info("Abrindo autenticação Google...");
    setTimeout(() => {
      setConnected(true);
      toast.success("Google Calendar conectado com sucesso!");
    }, 2000);
  };

  const handleDisconnect = () => {
    setConnected(false);
    toast.success("Google Calendar desconectado");
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${connected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
              <Calendar className={`h-6 w-6 ${connected ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Google Calendar</h3>
              <p className="text-sm text-muted-foreground">
                {connected ? 'Sincronizado com sua conta Google' : 'Sincronize agendamentos com o Google Calendar'}
              </p>
            </div>
          </div>
          {connected ? (
            <Button variant="outline" onClick={handleDisconnect}>
              <Unlink className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          ) : (
            <Button onClick={handleConnect}>
              <Link className="h-4 w-4 mr-2" />
              Conectar com Google
            </Button>
          )}
        </div>
      </Card>

      {connected && (
        <>
          {/* Conta Conectada */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Conta Conectada</h3>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold">M</span>
              </div>
              <div>
                <p className="font-medium">maicon@gmail.com</p>
                <p className="text-sm text-muted-foreground">Última sincronização: há 5 minutos</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar
              </Button>
            </div>
          </Card>

          {/* Configurações de Sincronização */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Configurações de Sincronização</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Calendário para Sincronização</label>
                <select className="w-full mt-1 p-2 border rounded-lg">
                  <option>Calendário Principal</option>
                  <option>Salão - Agendamentos</option>
                  <option>Criar novo calendário...</option>
                </select>
              </div>

              <div className="space-y-3 pt-4">
                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Sincronizar Novos Agendamentos</p>
                    <p className="text-sm text-muted-foreground">Criar evento no Google Calendar automaticamente</p>
                  </div>
                  <Switch defaultChecked />
                </label>
                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Sincronizar Alterações</p>
                    <p className="text-sm text-muted-foreground">Atualizar evento quando agendamento mudar</p>
                  </div>
                  <Switch defaultChecked />
                </label>
                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Sincronização Bidirecional</p>
                    <p className="text-sm text-muted-foreground">Importar eventos do Google Calendar</p>
                  </div>
                  <Switch />
                </label>
                <label className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Incluir Detalhes do Cliente</p>
                    <p className="text-sm text-muted-foreground">Nome e telefone na descrição do evento</p>
                  </div>
                  <Switch defaultChecked />
                </label>
              </div>
            </div>
          </Card>
        </>
      )}

      {!connected && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Benefícios da Integração</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Sincronize agendamentos automaticamente
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Receba notificações no seu celular
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Visualize compromissos em qualquer dispositivo
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Compartilhe calendário com a equipe
            </li>
          </ul>
        </Card>
      )}

      {connected && (
        <div className="flex gap-2">
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      )}
    </div>
  );
}

// Redes Sociais Integration
function RedesSociaisIntegrationContent() {
  const [instagram, setInstagram] = useState(false);
  const [facebook, setFacebook] = useState(false);

  return (
    <div className="space-y-6">
      {/* Instagram */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${instagram ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600' : 'bg-muted'}`}>
              <Instagram className={`h-6 w-6 ${instagram ? 'text-white' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Instagram</h3>
              <p className="text-sm text-muted-foreground">
                {instagram ? '@maiconmaksuel_salao' : 'Conecte sua conta do Instagram'}
              </p>
            </div>
          </div>
          {instagram ? (
            <Button variant="outline" onClick={() => setInstagram(false)}>
              <Unlink className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          ) : (
            <Button onClick={() => setInstagram(true)}>
              <Link className="h-4 w-4 mr-2" />
              Conectar
            </Button>
          )}
        </div>

        {instagram && (
          <div className="space-y-3 border-t pt-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Exibir feed no site</span>
              <Switch defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Postar agendamentos confirmados (Stories)</span>
              <Switch />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Responder DMs automaticamente</span>
              <Switch />
            </label>
          </div>
        )}
      </Card>

      {/* Facebook */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${facebook ? 'bg-blue-600' : 'bg-muted'}`}>
              <Facebook className={`h-6 w-6 ${facebook ? 'text-white' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Facebook</h3>
              <p className="text-sm text-muted-foreground">
                {facebook ? 'Maicon Maksuel Salão' : 'Conecte sua página do Facebook'}
              </p>
            </div>
          </div>
          {facebook ? (
            <Button variant="outline" onClick={() => setFacebook(false)}>
              <Unlink className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          ) : (
            <Button onClick={() => setFacebook(true)}>
              <Link className="h-4 w-4 mr-2" />
              Conectar
            </Button>
          )}
        </div>

        {facebook && (
          <div className="space-y-3 border-t pt-4">
            <label className="flex items-center justify-between">
              <span className="text-sm">Sincronizar avaliações</span>
              <Switch defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Responder Messenger automaticamente</span>
              <Switch />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Postar promoções automaticamente</span>
              <Switch />
            </label>
          </div>
        )}
      </Card>

      {/* Links das Redes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Links das Redes Sociais</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Estes links serão exibidos no site e materiais do salão
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Instagram</label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="@seu_salao" defaultValue="@maiconmaksuel_salao" />
              <Button variant="outline" size="icon">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Facebook</label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="facebook.com/seu_salao" />
              <Button variant="outline" size="icon">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">TikTok</label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="@seu_salao" />
              <Button variant="outline" size="icon">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">YouTube</label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="youtube.com/@seu_canal" />
              <Button variant="outline" size="icon">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
