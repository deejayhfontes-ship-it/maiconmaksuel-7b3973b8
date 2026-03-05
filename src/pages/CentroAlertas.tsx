/**
 * Centro de Alertas - Main Alerts Center Page
 * Complete notification management with filters, actions, and history
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  RefreshCw,
  Search,
  Filter,
  Cake,
  Calendar,
  Package,
  DollarSign,
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  History as HistoryIcon
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

import { AlertCard } from "@/components/alertas/AlertCard";
import { WhatsAppModal } from "@/components/alertas/WhatsAppModal";
import { AlertsHistory } from "@/components/alertas/AlertsHistory";
import { useNotificationsAlerts, type AlertType, type AlertStatus, type AlertPriority, type NotificationAlert } from "@/hooks/useNotificationsAlerts";
import { supabase } from "@/integrations/supabase/client";

const typeFilters: { value: AlertType | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "Todos", icon: <Bell className="h-4 w-4" /> },
  { value: "aniversario", label: "Aniversários", icon: <Cake className="h-4 w-4" /> },
  { value: "agendamento", label: "Agendamentos", icon: <Calendar className="h-4 w-4" /> },
  { value: "estoque", label: "Estoque", icon: <Package className="h-4 w-4" /> },
  { value: "caixa", label: "Caixa", icon: <DollarSign className="h-4 w-4" /> },
  { value: "sistema", label: "Sistema", icon: <Server className="h-4 w-4" /> }
];

const statusFilters: { value: AlertStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos Status" },
  { value: "novo", label: "Novos" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "resolvido", label: "Resolvidos" },
  { value: "silenciado", label: "Silenciados" }
];

const priorityFilters: { value: AlertPriority | "all"; label: string }[] = [
  { value: "all", label: "Todas Prioridades" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" }
];

export default function CentroAlertas() {
  const navigate = useNavigate();
  const {
    alerts,
    templates,
    actionLogs,
    isLoading,
    fetchAlerts,
    updateAlertStatus,
    silenceAlert,
    deleteAlert,
    logAction,
    fetchActionLogs,
    refreshAllAlerts,
    getAlertStats
  } = useNotificationsAlerts();

  const [activeTab, setActiveTab] = useState("alertas");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<AlertType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<AlertPriority | "all">("all");
  
  // WhatsApp Modal state
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<NotificationAlert | null>(null);

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filterType !== "all" && alert.type !== filterType) return false;
    if (filterStatus !== "all" && alert.status !== filterStatus) return false;
    if (filterPriority !== "all" && alert.priority !== filterPriority) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        alert.title.toLowerCase().includes(search) ||
        alert.entity_name?.toLowerCase().includes(search) ||
        alert.description?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const stats = getAlertStats();

  // Handle alert actions
  const handleAction = useCallback(async (alertId: string, actionType: string, payload?: Record<string, any>) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    switch (actionType) {
      case 'whatsapp':
      case 'whatsapp_lembrete':
        setSelectedAlert(alert);
        setWhatsappModalOpen(true);
        break;

      case 'copy_message':
        // This will be handled by the modal
        toast.success('Abra o modal de WhatsApp para copiar a mensagem');
        setSelectedAlert(alert);
        setWhatsappModalOpen(true);
        break;

      case 'agendar':
        navigate(`/agenda?cliente=${payload?.cliente_id}`);
        await logAction(alertId, 'agendar', 'in_app', payload, 'success');
        break;

      case 'abrir_agenda':
        navigate('/agenda');
        await logAction(alertId, 'abrir_agenda', 'in_app', payload, 'success');
        break;

      case 'ver_produto':
        navigate('/produtos');
        await logAction(alertId, 'ver_produto', 'in_app', payload, 'success');
        break;

      case 'gerar_lista_compra':
        toast.info('Funcionalidade em desenvolvimento');
        break;

      case 'abrir_caixa':
        navigate('/caixa');
        await logAction(alertId, 'abrir_caixa', 'in_app', payload, 'success');
        break;

      case 'fechar_caixa':
        navigate('/caixa/fechar');
        await logAction(alertId, 'fechar_caixa', 'in_app', payload, 'success');
        break;

      case 'ver_detalhes':
        navigate('/configuracoes/sistema');
        await logAction(alertId, 'ver_detalhes', 'in_app', payload, 'success');
        break;

      default:
        console.log('Unknown action:', actionType);
    }
  }, [alerts, navigate, logAction]);

  // Handle WhatsApp send
  const handleWhatsAppSend = useCallback(async (alertId: string, message: string, method: 'api' | 'web') => {
    if (method === 'api') {
      const alert = alerts.find(a => a.id === alertId);
      if (!alert?.metadata?.celular) {
        throw new Error('Número não encontrado');
      }

      // Try to send via edge function
      const { error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          telefone: alert.metadata.celular,
          mensagem: message
        }
      });

      if (error) throw error;
    }

    await logAction(alertId, 'whatsapp', 'whatsapp', { message, method }, 'success');
    await updateAlertStatus(alertId, 'resolvido');
  }, [alerts, logAction, updateAlertStatus]);

  // Handle status change
  const handleStatusChange = useCallback(async (alertId: string, status: AlertStatus) => {
    await updateAlertStatus(alertId, status);
    await logAction(alertId, `marcar_${status}`, 'in_app', {}, 'success');
  }, [updateAlertStatus, logAction]);

  // Handle silence
  const handleSilence = useCallback(async (alertId: string, days: number) => {
    await silenceAlert(alertId, days);
    await logAction(alertId, 'silenciar', 'in_app', { days }, 'success');
  }, [silenceAlert, logAction]);

  // Handle delete
  const handleDelete = useCallback(async (alertId: string) => {
    await deleteAlert(alertId);
  }, [deleteAlert]);

  // Handle export
  const handleExportLogs = useCallback(() => {
    fetchActionLogs();
  }, [fetchActionLogs]);

  // Refresh on mount
  useEffect(() => {
    refreshAllAlerts();
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Centro de Alertas
          </h1>
          <p className="text-muted-foreground">
            Gerencie notificações e tome ações rápidas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/configuracoes/notificacoes')}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
          <Button
            onClick={refreshAllAlerts}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.novos}</p>
              <p className="text-sm text-muted-foreground">Novos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.emAndamento}</p>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolvidos}</p>
              <p className="text-sm text-muted-foreground">Resolvidos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="alertas" className="gap-2">
            <Bell className="h-4 w-4" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <HistoryIcon className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alertas" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alertas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterType} onValueChange={(v) => setFilterType(v as AlertType | "all")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {typeFilters.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    <div className="flex items-center gap-2">
                      {f.icon}
                      {f.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as AlertStatus | "all")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as AlertPriority | "all")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                {priorityFilters.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alerts List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nenhum alerta encontrado"
              description={searchTerm || filterType !== "all" || filterStatus !== "all" 
                ? "Tente ajustar os filtros" 
                : "Tudo em ordem! Não há alertas no momento."}
            />
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {filteredAlerts.map(alert => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAction={handleAction}
                    onStatusChange={handleStatusChange}
                    onSilence={handleSilence}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <AlertsHistory logs={actionLogs} onExport={handleExportLogs} />
        </TabsContent>
      </Tabs>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={whatsappModalOpen}
        onClose={() => {
          setWhatsappModalOpen(false);
          setSelectedAlert(null);
        }}
        alert={selectedAlert}
        templates={templates}
        onSend={handleWhatsAppSend}
      />
    </div>
  );
}
