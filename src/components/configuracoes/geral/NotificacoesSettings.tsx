/**
 * Full Notifications Settings Component
 * Manages all notification types, channels, and templates
 */

import { useState, useCallback } from "react";
import { 
  Bell, 
  Cake, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Package, 
  Shield,
  MessageSquare,
  Mail,
  Phone,
  Smartphone,
  Clock,
  Save,
  RefreshCw,
  Volume2,
  VolumeX,
  History,
  CheckCircle2,
  XCircle as XCircle2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotificationSettings } from "@/contexts/SalonSettingsContext";
import { toast } from "sonner";

interface NotificationToggleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

function NotificationToggle({ icon, title, description, checked, onCheckedChange }: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted">
          {icon}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function NotificacoesSettings() {
  const { notifications, updateNotifications, isLoading } = useNotificationSettings();
  const [activeTab, setActiveTab] = useState("sistema");
  const [isSaving, setIsSaving] = useState(false);

  // Local form state
  const [formData, setFormData] = useState({
    ...notifications,
  });

  const handleToggle = useCallback(async (field: string, value: boolean) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : prev);
    await updateNotifications({ [field]: value });
  }, [updateNotifications]);

  const handleChange = useCallback((field: string, value: string | number) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : prev);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateNotifications(formData);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !notifications) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configurações de Notificações
        </h2>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="sistema">Sistema</TabsTrigger>
            <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
            <TabsTrigger value="canais">Canais</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          {/* Sistema Tab */}
          <TabsContent value="sistema" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notificações do Sistema</h3>
              
              <NotificationToggle
                icon={<Bell className="h-5 w-5 text-primary" />}
                title="Notificações Ativas"
                description="Ativar/desativar todas as notificações do sistema"
                checked={notifications.sistema_ativo}
                onCheckedChange={(v) => handleToggle('sistema_ativo', v)}
              />

              <NotificationToggle
                icon={notifications.sistema_sons ? 
                  <Volume2 className="h-5 w-5 text-primary" /> : 
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                }
                title="Sons de Notificação"
                description="Reproduzir sons quando novas notificações chegarem"
                checked={notifications.sistema_sons}
                onCheckedChange={(v) => handleToggle('sistema_sons', v)}
              />
            </div>

            {/* Quiet Hours */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário de Silêncio
              </h3>
              
              <NotificationToggle
                icon={<Clock className="h-5 w-5 text-primary" />}
                title="Ativar Horário de Silêncio"
                description="Não enviar notificações durante o período definido"
                checked={notifications.horario_silencio_ativo}
                onCheckedChange={(v) => handleToggle('horario_silencio_ativo', v)}
              />

              {notifications.horario_silencio_ativo && (
                <div className="grid grid-cols-2 gap-4 pl-4">
                  <div>
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={formData?.horario_silencio_inicio?.slice(0, 5) || '22:00'}
                      onChange={(e) => handleChange('horario_silencio_inicio', e.target.value + ':00')}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={formData?.horario_silencio_fim?.slice(0, 5) || '07:00'}
                      onChange={(e) => handleChange('horario_silencio_fim', e.target.value + ':00')}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Agendamentos Tab */}
          <TabsContent value="agendamentos" className="space-y-6">
            {/* Birthday */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Cake className="h-4 w-4" />
                Aniversários
              </h3>

              <NotificationToggle
                icon={<Cake className="h-5 w-5 text-pink-500" />}
                title="Notificações de Aniversário"
                description="Enviar mensagem automática no aniversário do cliente"
                checked={notifications.aniversario_ativo}
                onCheckedChange={(v) => handleToggle('aniversario_ativo', v)}
              />

              {notifications.aniversario_ativo && (
                <div className="space-y-4 pl-4">
                  <div>
                    <Label>Dias de antecedência</Label>
                    <Input
                      type="number"
                      min="0"
                      max="7"
                      value={formData?.aniversario_dias_antes || 0}
                      onChange={(e) => handleChange('aniversario_dias_antes', parseInt(e.target.value))}
                      className="mt-1 w-24"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      0 = no dia, 1 = 1 dia antes, etc.
                    </p>
                  </div>
                  <div>
                    <Label>Template da mensagem</Label>
                    <Textarea
                      value={formData?.aniversario_template || ''}
                      onChange={(e) => handleChange('aniversario_template', e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Variáveis: {"{nome}"}, {"{salao}"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Reminders */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Lembretes de Agendamento
              </h3>

              <NotificationToggle
                icon={<Calendar className="h-5 w-5 text-primary" />}
                title="Lembrete 24 horas antes"
                description="Enviar lembrete um dia antes do agendamento"
                checked={notifications.lembrete_24h}
                onCheckedChange={(v) => handleToggle('lembrete_24h', v)}
              />

              <NotificationToggle
                icon={<Calendar className="h-5 w-5 text-primary" />}
                title="Lembrete 2 horas antes"
                description="Enviar lembrete 2 horas antes do agendamento"
                checked={notifications.lembrete_2h}
                onCheckedChange={(v) => handleToggle('lembrete_2h', v)}
              />

              {(notifications.lembrete_24h || notifications.lembrete_2h) && (
                <div className="pl-4">
                  <Label>Template do lembrete</Label>
                  <Textarea
                    value={formData?.lembrete_template || ''}
                    onChange={(e) => handleChange('lembrete_template', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variáveis: {"{nome}"}, {"{hora}"}, {"{data}"}, {"{servico}"}, {"{profissional}"}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmations */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Confirmação de Agendamento
              </h3>

              <NotificationToggle
                icon={<CheckCircle className="h-5 w-5 text-success" />}
                title="Solicitar Confirmação"
                description="Enviar mensagem pedindo confirmação do cliente"
                checked={notifications.confirmacao_ativa}
                onCheckedChange={(v) => handleToggle('confirmacao_ativa', v)}
              />

              {notifications.confirmacao_ativa && (
                <div className="space-y-4 pl-4">
                  <div>
                    <Label>Horas de antecedência</Label>
                    <Input
                      type="number"
                      min="1"
                      max="72"
                      value={formData?.confirmacao_horas_antes || 24}
                      onChange={(e) => handleChange('confirmacao_horas_antes', parseInt(e.target.value))}
                      className="mt-1 w-24"
                    />
                  </div>
                  <div>
                    <Label>Template da confirmação</Label>
                    <Textarea
                      value={formData?.confirmacao_template || ''}
                      onChange={(e) => handleChange('confirmacao_template', e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cancellations */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Cancelamentos
              </h3>

              <NotificationToggle
                icon={<XCircle className="h-5 w-5 text-destructive" />}
                title="Notificar Cancelamento"
                description="Informar cliente quando agendamento for cancelado"
                checked={notifications.cancelamento_ativo}
                onCheckedChange={(v) => handleToggle('cancelamento_ativo', v)}
              />

              {notifications.cancelamento_ativo && (
                <div className="pl-4">
                  <Label>Template de cancelamento</Label>
                  <Textarea
                    value={formData?.cancelamento_template || ''}
                    onChange={(e) => handleChange('cancelamento_template', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Alertas Tab */}
          <TabsContent value="alertas" className="space-y-6">
            {/* Financial Alerts */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Alertas Financeiros
              </h3>

              <NotificationToggle
                icon={<DollarSign className="h-5 w-5 text-warning" />}
                title="Alerta de Caixa Baixo"
                description="Notificar quando o caixa estiver abaixo do valor definido"
                checked={notifications.alerta_financeiro_ativo}
                onCheckedChange={(v) => handleToggle('alerta_financeiro_ativo', v)}
              />

              {notifications.alerta_financeiro_ativo && (
                <div className="pl-4">
                  <Label>Valor mínimo do caixa (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="10"
                    value={formData?.alerta_caixa_baixo_valor || 100}
                    onChange={(e) => handleChange('alerta_caixa_baixo_valor', parseFloat(e.target.value))}
                    className="mt-1 w-32"
                  />
                </div>
              )}
            </div>

            {/* Stock Alerts */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Alertas de Estoque
              </h3>

              <NotificationToggle
                icon={<Package className="h-5 w-5 text-warning" />}
                title="Alerta de Estoque Baixo"
                description="Notificar quando produtos estiverem com estoque baixo"
                checked={notifications.alerta_estoque_ativo}
                onCheckedChange={(v) => handleToggle('alerta_estoque_ativo', v)}
              />

              {notifications.alerta_estoque_ativo && (
                <div className="pl-4">
                  <Label>Quantidade mínima</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData?.alerta_estoque_minimo || 5}
                    onChange={(e) => handleChange('alerta_estoque_minimo', parseInt(e.target.value))}
                    className="mt-1 w-24"
                  />
                </div>
              )}
            </div>

            {/* Admin Alerts */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Alertas Administrativos
              </h3>

              <NotificationToggle
                icon={<Shield className="h-5 w-5 text-info" />}
                title="Alertas de Administração"
                description="Receber alertas sobre eventos importantes do sistema"
                checked={notifications.alerta_admin_ativo}
                onCheckedChange={(v) => handleToggle('alerta_admin_ativo', v)}
              />
            </div>
          </TabsContent>

          {/* Canais Tab */}
          <TabsContent value="canais" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Canais de Notificação</h3>
              <p className="text-sm text-muted-foreground">
                Escolha como as notificações serão enviadas.
              </p>

              <NotificationToggle
                icon={<Smartphone className="h-5 w-5 text-primary" />}
                title="Notificações In-App"
                description="Mostrar notificações dentro do sistema"
                checked={notifications.canal_in_app}
                onCheckedChange={(v) => handleToggle('canal_in_app', v)}
              />

              <NotificationToggle
                icon={<MessageSquare className="h-5 w-5 text-green-500" />}
                title="WhatsApp"
                description="Enviar notificações via WhatsApp"
                checked={notifications.canal_whatsapp}
                onCheckedChange={(v) => handleToggle('canal_whatsapp', v)}
              />

              <NotificationToggle
                icon={<Mail className="h-5 w-5 text-blue-500" />}
                title="Email"
                description="Enviar notificações por email (futuro)"
                checked={notifications.canal_email}
                onCheckedChange={(v) => handleToggle('canal_email', v)}
              />

              <NotificationToggle
                icon={<Phone className="h-5 w-5 text-purple-500" />}
                title="SMS"
                description="Enviar notificações por SMS (futuro)"
                checked={notifications.canal_sms}
                onCheckedChange={(v) => handleToggle('canal_sms', v)}
              />
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico de Envios
              </h3>
              <p className="text-sm text-muted-foreground">
                Acompanhe o status das notificações enviadas recentemente.
              </p>

              {/* Placeholder for notification logs - would need a new table */}
              <div className="border rounded-lg divide-y">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">Lembrete de agendamento</p>
                      <p className="text-sm text-muted-foreground">Maria Silva - WhatsApp</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-success">Entregue</p>
                    <p className="text-xs text-muted-foreground">Hoje, 14:30</p>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">Confirmação de agendamento</p>
                      <p className="text-sm text-muted-foreground">João Santos - WhatsApp</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-success">Confirmado</p>
                    <p className="text-xs text-muted-foreground">Hoje, 10:15</p>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                      <XCircle2 className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium">Aniversário</p>
                      <p className="text-sm text-muted-foreground">Carlos Oliveira - WhatsApp</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-destructive">Falha</p>
                    <p className="text-xs text-muted-foreground">Ontem, 09:00</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Os logs são mantidos por 30 dias
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex gap-2 pt-6 border-t mt-6">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
