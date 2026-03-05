/**
 * Alerts History and Action Logs Component
 */
import { useState, useEffect } from "react";
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { NotificationActionLog } from "@/hooks/useNotificationsAlerts";

interface AlertsHistoryProps {
  logs: NotificationActionLog[];
  onExport: () => void;
}

const actionTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  whatsapp: { label: "WhatsApp Enviado", icon: <MessageSquare className="h-4 w-4 text-green-500" /> },
  copy_message: { label: "Mensagem Copiada", icon: <MessageSquare className="h-4 w-4 text-blue-500" /> },
  agendar: { label: "Agendamento Criado", icon: <Calendar className="h-4 w-4 text-primary" /> },
  marcar_resolvido: { label: "Marcado Resolvido", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  marcar_andamento: { label: "Em Andamento", icon: <Clock className="h-4 w-4 text-yellow-500" /> },
  silenciar: { label: "Silenciado", icon: <XCircle className="h-4 w-4 text-muted-foreground" /> }
};

const resultBadges: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  success: { label: "Sucesso", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  pending: { label: "Pendente", variant: "secondary" }
};

export function AlertsHistory({ logs, onExport }: AlertsHistoryProps) {
  const [filteredLogs, setFilteredLogs] = useState(logs);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");

  useEffect(() => {
    let result = [...logs];

    if (searchTerm) {
      result = result.filter(log => 
        log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterChannel !== "all") {
      result = result.filter(log => log.channel === filterChannel);
    }

    if (filterResult !== "all") {
      result = result.filter(log => log.result === filterResult);
    }

    setFilteredLogs(result);
  }, [logs, searchTerm, filterChannel, filterResult]);

  const handleExport = () => {
    // Create CSV content
    const headers = ['Data/Hora', 'Ação', 'Canal', 'Resultado', 'Usuário'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
      actionTypeLabels[log.action_type]?.label || log.action_type,
      log.channel || '-',
      log.result || '-',
      log.user_name || 'Sistema'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico_alertas_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Ações
        </h3>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Canais</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="in_app">In-App</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Usuário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {actionTypeLabels[log.action_type]?.icon}
                      <span className="text-sm">
                        {actionTypeLabels[log.action_type]?.label || log.action_type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {log.channel || '-'}
                  </TableCell>
                  <TableCell>
                    {log.result && resultBadges[log.result] ? (
                      <Badge variant={resultBadges[log.result].variant} className="text-xs">
                        {resultBadges[log.result].label}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">{log.result || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.user_name || 'Sistema'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
