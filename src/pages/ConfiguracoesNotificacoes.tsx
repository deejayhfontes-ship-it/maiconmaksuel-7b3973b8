import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, 
  ArrowLeft, 
  Users, 
  Smartphone, 
  Clock, 
  MessageSquare,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Settings,
  Send,
  Save
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function ConfiguracoesNotificacoes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("lembretes");

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
            <Bell className="h-6 w-6" />
            Configurações de Notificações
          </h1>
          <p className="text-muted-foreground">
            Configure lembretes, alertas e notificações push
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lembretes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Lembretes Clientes
          </TabsTrigger>
          <TabsTrigger value="alertas" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas Funcionários
          </TabsTrigger>
          <TabsTrigger value="push" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Notificações Push
          </TabsTrigger>
        </TabsList>

        {/* Lembretes Clientes */}
        <TabsContent value="lembretes" className="space-y-6 mt-6">
          <LembretesClientesContent />
        </TabsContent>

        {/* Alertas Funcionários */}
        <TabsContent value="alertas" className="space-y-6 mt-6">
          <AlertasFuncionariosContent />
        </TabsContent>

        {/* Notificações Push */}
        <TabsContent value="push" className="space-y-6 mt-6">
          <NotificacoesPushContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente Lembretes Clientes
function LembretesClientesContent() {
  const [config, setConfig] = useState({
    lembrete24h: true,
    lembrete2h: true,
    confirmacaoAgendamento: true,
    aniversario: true,
    retorno: false,
    promocoes: false,
  });

  const handleSave = () => {
    toast.success("Configurações de lembretes salvas!");
  };

  return (
    <div className="space-y-6">
      {/* Lembretes de Agendamento */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Lembretes de Agendamento
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Lembrete 24 horas antes</p>
              <p className="text-sm text-muted-foreground">Enviar lembrete um dia antes do agendamento</p>
            </div>
            <Switch 
              checked={config.lembrete24h} 
              onCheckedChange={(checked) => setConfig({...config, lembrete24h: checked})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Lembrete 2 horas antes</p>
              <p className="text-sm text-muted-foreground">Enviar lembrete 2 horas antes do agendamento</p>
            </div>
            <Switch 
              checked={config.lembrete2h} 
              onCheckedChange={(checked) => setConfig({...config, lembrete2h: checked})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Confirmação de Agendamento</p>
              <p className="text-sm text-muted-foreground">Solicitar confirmação do cliente</p>
            </div>
            <Switch 
              checked={config.confirmacaoAgendamento} 
              onCheckedChange={(checked) => setConfig({...config, confirmacaoAgendamento: checked})} 
            />
          </div>
        </div>
      </Card>

      {/* Mensagens Automáticas */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Mensagens Automáticas
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Aniversário</p>
              <p className="text-sm text-muted-foreground">Enviar mensagem de feliz aniversário</p>
            </div>
            <Switch 
              checked={config.aniversario} 
              onCheckedChange={(checked) => setConfig({...config, aniversario: checked})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Lembrete de Retorno</p>
              <p className="text-sm text-muted-foreground">Lembrar cliente após 30 dias sem visita</p>
            </div>
            <Switch 
              checked={config.retorno} 
              onCheckedChange={(checked) => setConfig({...config, retorno: checked})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Promoções e Novidades</p>
              <p className="text-sm text-muted-foreground">Enviar ofertas e promoções do salão</p>
            </div>
            <Switch 
              checked={config.promocoes} 
              onCheckedChange={(checked) => setConfig({...config, promocoes: checked})} 
            />
          </div>
        </div>
      </Card>

      {/* Templates de Mensagem */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Templates de Mensagem</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Lembrete de Agendamento</label>
            <Textarea 
              className="mt-1"
              defaultValue="Olá {nome}! Lembramos que você tem um agendamento amanhã às {hora} para {servico} com {profissional}. Confirme sua presença respondendo SIM."
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Variáveis: {"{nome}"}, {"{hora}"}, {"{data}"}, {"{servico}"}, {"{profissional}"}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Aniversário</label>
            <Textarea 
              className="mt-1"
              defaultValue="🎂 Feliz Aniversário, {nome}! O Maicon Maksuel Salão deseja um dia especial! Venha comemorar conosco e ganhe 10% de desconto no seu próximo serviço!"
              rows={3}
            />
          </div>
        </div>
      </Card>

      {/* Canais de Envio */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Canais de Envio</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer">
            <input type="checkbox" defaultChecked className="h-4 w-4" />
            <MessageSquare className="h-5 w-5 text-green-600" />
            <span>WhatsApp</span>
          </label>
          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer">
            <input type="checkbox" className="h-4 w-4" />
            <Mail className="h-5 w-5 text-blue-600" />
            <span>Email</span>
          </label>
          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer">
            <input type="checkbox" className="h-4 w-4" />
            <Phone className="h-5 w-5 text-purple-600" />
            <span>SMS</span>
          </label>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
        <Button variant="outline">
          <Send className="h-4 w-4 mr-2" />
          Testar Envio
        </Button>
      </div>
    </div>
  );
}

// Componente Alertas Funcionários
function AlertasFuncionariosContent() {
  const [config, setConfig] = useState({
    novoAgendamento: true,
    alteracaoAgendamento: true,
    cancelamento: true,
    metaAtingida: true,
    valeRegistrado: false,
    pontoEletronico: true,
  });

  const handleSave = () => {
    toast.success("Configurações de alertas salvas!");
  };

  return (
    <div className="space-y-6">
      {/* Alertas de Agenda */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Alertas de Agenda
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Novo Agendamento</p>
              <p className="text-sm text-muted-foreground">Notificar quando um novo agendamento for criado</p>
            </div>
            <Switch 
              checked={config.novoAgendamento} 
              onCheckedChange={(checked) => setConfig({...config, novoAgendamento: checked})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Alteração de Agendamento</p>
              <p className="text-sm text-muted-foreground">Notificar quando um agendamento for alterado</p>
            </div>
            <Switch 
              checked={config.alteracaoAgendamento} 
              onCheckedChange={(checked) => setConfig({...config, alteracaoAgendamento: checked})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Cancelamento</p>
              <p className="text-sm text-muted-foreground">Notificar quando um agendamento for cancelado</p>
            </div>
            <Switch 
              checked={config.cancelamento} 
              onCheckedChange={(checked) => setConfig({...config, cancelamento: checked})} 
            />
          </div>
        </div>
      </Card>

      {/* Alertas Financeiros */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Alertas Financeiros e Metas
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Meta Atingida</p>
              <p className="text-sm text-muted-foreground">Notificar quando uma meta for alcançada</p>
            </div>
            <Switch 
              checked={config.metaAtingida} 
              onCheckedChange={(checked) => setConfig({...config, metaAtingida: checked})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Vale Registrado</p>
              <p className="text-sm text-muted-foreground">Notificar quando um vale for lançado</p>
            </div>
            <Switch 
              checked={config.valeRegistrado} 
              onCheckedChange={(checked) => setConfig({...config, valeRegistrado: checked})} 
            />
          </div>
        </div>
      </Card>

      {/* Alertas de Ponto */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Alertas de Ponto
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Lembrete de Ponto</p>
              <p className="text-sm text-muted-foreground">Lembrar de bater o ponto nos horários programados</p>
            </div>
            <Switch 
              checked={config.pontoEletronico} 
              onCheckedChange={(checked) => setConfig({...config, pontoEletronico: checked})} 
            />
          </div>
        </div>
      </Card>

      {/* Destinatários */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Destinatários dos Alertas</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Alertas de Gerência</label>
            <p className="text-xs text-muted-foreground mb-2">Quem recebe alertas administrativos</p>
            <div className="flex gap-2">
              <Input placeholder="Email do gerente" defaultValue="gerente@salao.com" />
              <Button variant="outline" size="sm">+ Adicionar</Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="h-4 w-4" />
              <span className="text-sm">Enviar cópia para todos os administradores</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" />
              <span className="text-sm">Enviar resumo diário por email</span>
            </label>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

// Componente Notificações Push
function NotificacoesPushContent() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [config, setConfig] = useState({
    agendamentos: true,
    financeiro: true,
    sistema: false,
    marketing: false,
  });

  const handleEnablePush = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        toast.success("Notificações push ativadas!");
      } else {
        toast.error("Permissão de notificações negada");
      }
    } else {
      toast.error("Seu navegador não suporta notificações push");
    }
  };

  const handleTestNotification = () => {
    if (pushEnabled && 'Notification' in window) {
      new Notification("Teste de Notificação", {
        body: "Esta é uma notificação de teste do Maicon Maksuel Salão",
        icon: "/favicon.svg"
      });
    } else {
      toast.error("Ative as notificações push primeiro");
    }
  };

  const handleSave = () => {
    toast.success("Configurações de notificações push salvas!");
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${pushEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
              <Smartphone className={`h-6 w-6 ${pushEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Notificações Push</h3>
              <p className="text-sm text-muted-foreground">
                {pushEnabled ? 'Ativadas - Você receberá notificações neste dispositivo' : 'Desativadas - Clique para ativar'}
              </p>
            </div>
          </div>
          <Button onClick={handleEnablePush} variant={pushEnabled ? "outline" : "default"}>
            {pushEnabled ? "Reconfigurar" : "Ativar Notificações"}
          </Button>
        </div>
      </Card>

      {/* Tipos de Notificação */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Tipos de Notificação</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Agendamentos</p>
                <p className="text-sm text-muted-foreground">Novos agendamentos, lembretes e confirmações</p>
              </div>
            </div>
            <Switch 
              checked={config.agendamentos} 
              onCheckedChange={(checked) => setConfig({...config, agendamentos: checked})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Financeiro</p>
                <p className="text-sm text-muted-foreground">Pagamentos, metas e alertas financeiros</p>
              </div>
            </div>
            <Switch 
              checked={config.financeiro} 
              onCheckedChange={(checked) => setConfig({...config, financeiro: checked})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium">Sistema</p>
                <p className="text-sm text-muted-foreground">Atualizações, backup e manutenção</p>
              </div>
            </div>
            <Switch 
              checked={config.sistema} 
              onCheckedChange={(checked) => setConfig({...config, sistema: checked})} 
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium">Marketing</p>
                <p className="text-sm text-muted-foreground">Novidades, promoções e dicas</p>
              </div>
            </div>
            <Switch 
              checked={config.marketing} 
              onCheckedChange={(checked) => setConfig({...config, marketing: checked})} 
            />
          </div>
        </div>
      </Card>

      {/* Horários */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Horário de Notificações</h3>
        
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="h-4 w-4" />
            <span>Não perturbe fora do horário comercial</span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Início</label>
              <Input type="time" defaultValue="08:00" className="mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Fim</label>
              <Input type="time" defaultValue="20:00" className="mt-1" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia, i) => (
              <label key={dia} className="cursor-pointer">
                <input type="checkbox" defaultChecked={i > 0 && i < 6} className="sr-only peer" />
                <div className="px-3 py-1 rounded-full border peer-checked:bg-primary peer-checked:text-primary-foreground text-sm">
                  {dia}
                </div>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Dispositivos */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dispositivos Conectados</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5" />
              <div>
                <p className="font-medium">Este dispositivo</p>
                <p className="text-xs text-muted-foreground">Chrome • Windows • Último acesso: agora</p>
              </div>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Ativo</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
        <Button variant="outline" onClick={handleTestNotification}>
          <Bell className="h-4 w-4 mr-2" />
          Testar Notificação
        </Button>
      </div>
    </div>
  );
}
