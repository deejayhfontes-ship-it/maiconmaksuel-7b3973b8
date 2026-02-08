/**
 * Alert Card Component with action buttons
 */
import { useState } from "react";
import {
  Cake,
  Calendar,
  Package,
  DollarSign,
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Copy,
  CalendarPlus,
  BellOff,
  ExternalLink,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { NotificationAlert, AlertType, AlertStatus, AlertPriority } from "@/hooks/useNotificationsAlerts";

interface AlertCardProps {
  alert: NotificationAlert;
  onAction: (alertId: string, actionType: string, payload?: Record<string, any>) => void;
  onStatusChange: (alertId: string, status: AlertStatus) => void;
  onSilence: (alertId: string, days: number) => void;
  onDelete: (alertId: string) => void;
}

const typeIcons: Record<AlertType, React.ReactNode> = {
  aniversario: <Cake className="h-5 w-5" />,
  agendamento: <Calendar className="h-5 w-5" />,
  estoque: <Package className="h-5 w-5" />,
  caixa: <DollarSign className="h-5 w-5" />,
  financeiro: <DollarSign className="h-5 w-5" />,
  sistema: <Server className="h-5 w-5" />
};

const typeColors: Record<AlertType, string> = {
  aniversario: "text-pink-500 bg-pink-500/10",
  agendamento: "text-blue-500 bg-blue-500/10",
  estoque: "text-orange-500 bg-orange-500/10",
  caixa: "text-green-500 bg-green-500/10",
  financeiro: "text-yellow-500 bg-yellow-500/10",
  sistema: "text-purple-500 bg-purple-500/10"
};

const priorityBadges: Record<AlertPriority, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  baixa: { label: "Baixa", variant: "secondary" },
  media: { label: "Média", variant: "outline" },
  alta: { label: "Alta", variant: "destructive" }
};

const statusBadges: Record<AlertStatus, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-blue-500 text-white" },
  em_andamento: { label: "Em Andamento", className: "bg-yellow-500 text-white" },
  resolvido: { label: "Resolvido", className: "bg-green-500 text-white" },
  silenciado: { label: "Silenciado", className: "bg-gray-500 text-white" }
};

export function AlertCard({ alert, onAction, onStatusChange, onSilence, onDelete }: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderActions = () => {
    switch (alert.type) {
      case 'aniversario':
        return (
          <>
            <Button 
              size="sm" 
              variant="default"
              className="gap-1"
              onClick={() => onAction(alert.id, 'whatsapp', { celular: alert.metadata?.celular })}
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction(alert.id, 'copy_message')}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction(alert.id, 'agendar', { cliente_id: alert.entity_id })}
            >
              <CalendarPlus className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onStatusChange(alert.id, 'resolvido')}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </>
        );
      
      case 'agendamento':
        return (
          <>
            <Button 
              size="sm" 
              variant="default"
              className="gap-1"
              onClick={() => onAction(alert.id, 'abrir_agenda', { data: alert.metadata?.data_hora })}
            >
              <Calendar className="h-4 w-4" />
              Ver Agenda
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction(alert.id, 'whatsapp_lembrete', { celular: alert.metadata?.celular })}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onStatusChange(alert.id, 'resolvido')}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </>
        );

      case 'estoque':
        return (
          <>
            <Button 
              size="sm" 
              variant="default"
              className="gap-1"
              onClick={() => onAction(alert.id, 'ver_produto', { produto_id: alert.entity_id })}
            >
              <ExternalLink className="h-4 w-4" />
              Ver Produto
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction(alert.id, 'gerar_lista_compra', { produto_id: alert.entity_id })}
            >
              Lista de Compra
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onStatusChange(alert.id, 'resolvido')}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </>
        );

      case 'caixa':
        return (
          <>
            <Button 
              size="sm" 
              variant="default"
              className="gap-1"
              onClick={() => onAction(alert.id, 'abrir_caixa')}
            >
              <DollarSign className="h-4 w-4" />
              Ir para Caixa
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction(alert.id, 'fechar_caixa', { caixa_id: alert.entity_id })}
            >
              Fechar Caixa
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onStatusChange(alert.id, 'resolvido')}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </>
        );

      case 'sistema':
        return (
          <>
            <Button 
              size="sm" 
              variant="default"
              className="gap-1"
              onClick={() => onAction(alert.id, 'ver_detalhes')}
            >
              <ExternalLink className="h-4 w-4" />
              Ver Detalhes
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onStatusChange(alert.id, 'resolvido')}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </>
        );

      default:
        return (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => onStatusChange(alert.id, 'resolvido')}
          >
            <CheckCircle className="h-4 w-4" />
            Marcar Resolvido
          </Button>
        );
    }
  };

  return (
    <Card 
      className={cn(
        "p-4 transition-all hover:shadow-md",
        alert.status === 'novo' && "border-l-4 border-l-primary",
        alert.status === 'resolvido' && "opacity-60"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn("p-3 rounded-xl", typeColors[alert.type])}>
          {typeIcons[alert.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium truncate">{alert.title}</h4>
            <Badge variant={priorityBadges[alert.priority].variant} className="text-xs">
              {priorityBadges[alert.priority].label}
            </Badge>
            <Badge className={cn("text-xs", statusBadges[alert.status].className)}>
              {statusBadges[alert.status].label}
            </Badge>
          </div>

          {alert.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {alert.description}
            </p>
          )}

          {alert.entity_name && (
            <p className="text-sm font-medium text-primary mt-1">
              {alert.entity_name}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {renderActions()}
          </div>
        </div>

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onStatusChange(alert.id, 'em_andamento')}>
              <Clock className="h-4 w-4 mr-2" />
              Marcar Em Andamento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(alert.id, 'resolvido')}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar Resolvido
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSilence(alert.id, 1)}>
              <BellOff className="h-4 w-4 mr-2" />
              Silenciar 1 dia
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSilence(alert.id, 7)}>
              <BellOff className="h-4 w-4 mr-2" />
              Silenciar 7 dias
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(alert.id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
