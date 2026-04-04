import { useState } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Phone,
  Calendar,
  ChevronRight,
  Loader2,
  RotateCcw,
  Ban,
  Wifi,
  MessageCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  useWhatsAppLogs,
  WhatsAppLog,
  StatusEnvio,
  StatusInteracao,
  TipoMensagem,
  OrigemFluxo,
  WhatsAppLogFiltros,
} from '@/hooks/useWhatsAppLogs';

// ─── Configs visuais de status ────────────────────────────────────────────────

const STATUS_ENVIO_CONFIG: Record<StatusEnvio, {
  label: string;
  dot: string;
  badge: string;
  icon: React.ReactNode;
}> = {
  enviado:     { label: 'Enviado',     dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',  icon: <CheckCircle2 className="h-3 w-3" /> },
  pendente:    { label: 'Pendente',    dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',   icon: <Clock className="h-3 w-3" /> },
  processando: { label: 'Processando', dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',        icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  falha:       { label: 'Falha',       dot: 'bg-red-500',    badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',             icon: <XCircle className="h-3 w-3" /> },
  cancelado:   { label: 'Resolvido',   dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',           icon: <Ban className="h-3 w-3" /> },
};

const STATUS_INTERACAO_CONFIG: Record<StatusInteracao, {
  label: string;
  badge: string;
}> = {
  sem_interacao: { label: 'Sem interação', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  entregue:      { label: 'Entregue',      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  lido:          { label: 'Lido',          badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  respondeu:     { label: 'Respondeu',     badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  confirmado:    { label: 'Confirmado ✓',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  recusado:      { label: 'Recusado ✗',   badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  erro:          { label: 'Erro',          badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const TIPO_LABELS: Record<TipoMensagem, string> = {
  confirmacao: 'Confirmação',
  lembrete:    'Lembrete',
  avaliacao:   'Avaliação',
  manual:      'Manual',
  chatbot:     'Chatbot',
  reenvio:     'Reenvio',
};

const ORIGEM_LABELS: Record<OrigemFluxo, string> = {
  automatico:     'Automático',
  manual:         'Manual',
  webhook:        'Webhook',
  n8n:            'n8n',
  reenvio_manual: 'Reenvio Manual',
};

// ─── Componente de dot/semáforo ───────────────────────────────────────────────

function StatusDot({ status }: { status: StatusEnvio }) {
  const cfg = STATUS_ENVIO_CONFIG[status];
  return (
    <span className="flex items-center gap-2">
      <span className={cn(
        'inline-block w-2.5 h-2.5 rounded-full shrink-0',
        cfg.dot,
        status === 'processando' && 'animate-pulse',
      )} />
    </span>
  );
}

function BadgeEnvio({ status }: { status: StatusEnvio }) {
  const cfg = STATUS_ENVIO_CONFIG[status];
  return (
    <Badge variant="outline" className={cn('flex items-center gap-1 w-fit text-xs', cfg.badge)}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function BadgeInteracao({ status }: { status: StatusInteracao }) {
  const cfg = STATUS_INTERACAO_CONFIG[status];
  return (
    <Badge variant="outline" className={cn('text-xs w-fit', cfg.badge)}>
      {cfg.label}
    </Badge>
  );
}

// ─── Cards de Resumo ─────────────────────────────────────────────────────────

function CardResumo({
  label, valor, cor, icon,
}: {
  label: string;
  valor: number;
  cor: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', cor)}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{valor}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Modal de Detalhe ─────────────────────────────────────────────────────────

function ModalDetalhe({
  log,
  open,
  onClose,
  onReenviar,
  enviando,
}: {
  log: WhatsAppLog | null;
  open: boolean;
  onClose: () => void;
  onReenviar: (log: WhatsAppLog) => void;
  enviando: string | null;
}) {
  if (!log) return null;
  const cfgEnvio = STATUS_ENVIO_CONFIG[log.status_envio];
  const cfgInteracao = STATUS_INTERACAO_CONFIG[log.status_interacao];
  const ag = log.agendamento;
  const isEnviando = enviando === log.id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Detalhe do Envio
          </DialogTitle>
          <DialogDescription>
            Informações completas desta operação de WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Status em destaque */}
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
            <StatusDot status={log.status_envio} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <BadgeEnvio status={log.status_envio} />
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <BadgeInteracao status={log.status_interacao} />
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {TIPO_LABELS[log.tipo_mensagem]}
            </Badge>
          </div>

          {/* Grid de metadados */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="font-medium flex items-center gap-1">
                <Phone className="h-3 w-3" /> {log.telefone}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Origem</p>
              <p className="font-medium">{ORIGEM_LABELS[log.origem_fluxo]}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tentativa nº</p>
              <p className="font-medium">{log.tentativa_numero}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Reenvio Manual</p>
              <p className="font-medium">{log.enviado_por_manual ? '✅ Sim' : '—'}</p>
            </div>
            {log.enviado_em && (
              <div className="space-y-1 col-span-2">
                <p className="text-xs text-muted-foreground">Enviado em</p>
                <p className="font-medium">
                  {format(parseISO(log.enviado_em), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                </p>
              </div>
            )}
            {log.provider_message_id && (
              <div className="space-y-1 col-span-2">
                <p className="text-xs text-muted-foreground">Message ID ({log.provider})</p>
                <p className="font-mono text-xs bg-muted/50 rounded px-2 py-1">{log.provider_message_id}</p>
              </div>
            )}
          </div>

          {/* Dados do agendamento */}
          {ag && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Agendamento Relacionado
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ag.clientes && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-medium">{ag.clientes.nome}</p>
                    </div>
                  )}
                  {ag.profissionais && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Profissional</p>
                      <p className="font-medium">{ag.profissionais.nome}</p>
                    </div>
                  )}
                  {ag.servicos && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Serviço</p>
                      <p className="font-medium">{ag.servicos.nome}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Data/Hora</p>
                    <p className="font-medium">
                      {format(parseISO(ag.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Mensagem enviada */}
          {log.mensagem_texto && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Mensagem Enviada
                </p>
                <div className="rounded-xl border bg-[#e5ddd5] dark:bg-[#0b141a] p-4">
                  <div className="max-w-[320px] ml-auto">
                    <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg rounded-tr-none p-3 shadow-sm">
                      <p className="text-sm whitespace-pre-wrap text-[#111b21] dark:text-[#e9edef]">
                        {log.mensagem_texto}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Erro detalhado */}
          {log.erro_detalhado && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  Erro Técnico
                </p>
                <pre className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded p-3 text-xs overflow-auto max-h-32">
                  {log.erro_detalhado}
                </pre>
              </div>
            </>
          )}

          {/* Payload de retorno */}
          {log.payload_retorno && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Retorno da Z-API
                </p>
                <pre className="bg-muted/50 rounded p-3 text-xs overflow-auto max-h-32">
                  {JSON.stringify(log.payload_retorno, null, 2)}
                </pre>
              </div>
            </>
          )}

          {/* Ações */}
          <Separator />
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => onReenviar(log)}
              disabled={isEnviando}
              size="sm"
              className="flex-1"
            >
              {isEnviando ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><RotateCcw className="h-4 w-4 mr-2" /> Reenviar Mensagem</>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MonitorWhatsApp() {
  const [filtros, setFiltros] = useState<WhatsAppLogFiltros>({
    statusEnvio: 'todos',
    statusInteracao: 'todos',
    tipoMensagem: 'todos',
    origemFluxo: 'todos',
    busca: '',
  });

  const { logs, loading, resumo, enviando, buscar, reenviarManual, marcarResolvido } =
    useWhatsAppLogs(filtros);

  const [logSelecionado, setLogSelecionado] = useState<WhatsAppLog | null>(null);
  const [confirmReenvio, setConfirmReenvio] = useState<WhatsAppLog | null>(null);

  const updateFiltro = <K extends keyof WhatsAppLogFiltros>(
    key: K,
    value: WhatsAppLogFiltros[K]
  ) => setFiltros(prev => ({ ...prev, [key]: value }));

  const nomeDaCliente = (log: WhatsAppLog) =>
    log.agendamento?.clientes?.nome || '—';

  const dataDoAgendamento = (log: WhatsAppLog) => {
    if (!log.agendamento?.data_hora) return '—';
    return format(parseISO(log.agendamento.data_hora), 'dd/MM/yy', { locale: ptBR });
  };

  const horaDoAgendamento = (log: WhatsAppLog) => {
    if (!log.agendamento?.data_hora) return '—';
    return format(parseISO(log.agendamento.data_hora), 'HH:mm', { locale: ptBR });
  };

  return (
    <div className="space-y-6">

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <CardResumo
          label="Total"
          valor={resumo.total}
          cor="bg-primary/10"
          icon={<MessageSquare className="h-4 w-4 text-primary" />}
        />
        <CardResumo
          label="Enviadas"
          valor={resumo.enviados}
          cor="bg-green-100 dark:bg-green-900/20"
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
        />
        <CardResumo
          label="Falhas"
          valor={resumo.falhas}
          cor="bg-red-100 dark:bg-red-900/20"
          icon={<XCircle className="h-4 w-4 text-red-600" />}
        />
        <CardResumo
          label="Pendentes"
          valor={resumo.pendentes}
          cor="bg-amber-100 dark:bg-amber-900/20"
          icon={<Clock className="h-4 w-4 text-amber-600" />}
        />
        <CardResumo
          label="Com interação"
          valor={resumo.comInteracao}
          cor="bg-violet-100 dark:bg-violet-900/20"
          icon={<MessageCircle className="h-4 w-4 text-violet-600" />}
        />
        <CardResumo
          label="Sem interação"
          valor={resumo.semInteracao}
          cor="bg-gray-100 dark:bg-gray-800"
          icon={<Wifi className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* ── Filtros ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Busca */}
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome do cliente ou telefone..."
                value={filtros.busca || ''}
                onChange={e => updateFiltro('busca', e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status de envio */}
            <Select
              value={filtros.statusEnvio || 'todos'}
              onValueChange={v => updateFiltro('statusEnvio', v as StatusEnvio | 'todos')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status de Envio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="enviado">✅ Enviado</SelectItem>
                <SelectItem value="pendente">⏳ Pendente</SelectItem>
                <SelectItem value="processando">🔄 Processando</SelectItem>
                <SelectItem value="falha">❌ Falha</SelectItem>
                <SelectItem value="cancelado">🚫 Resolvido</SelectItem>
              </SelectContent>
            </Select>

            {/* Tipo de mensagem */}
            <Select
              value={filtros.tipoMensagem || 'todos'}
              onValueChange={v => updateFiltro('tipoMensagem', v as TipoMensagem | 'todos')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de mensagem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="confirmacao">Confirmação</SelectItem>
                <SelectItem value="lembrete">Lembrete</SelectItem>
                <SelectItem value="avaliacao">Avaliação</SelectItem>
                <SelectItem value="reenvio">Reenvio</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>

            {/* Origem */}
            <Select
              value={filtros.origemFluxo || 'todos'}
              onValueChange={v => updateFiltro('origemFluxo', v as OrigemFluxo | 'todos')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as origens</SelectItem>
                <SelectItem value="automatico">Automático</SelectItem>
                <SelectItem value="n8n">n8n</SelectItem>
                <SelectItem value="reenvio_manual">Reenvio Manual</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Datas */}
          <div className="flex gap-2 mt-3">
            <div className="flex-1">
              <Input
                type="date"
                value={filtros.dataInicio || ''}
                onChange={e => updateFiltro('dataInicio', e.target.value)}
                className="text-sm"
              />
            </div>
            <span className="flex items-center text-muted-foreground text-sm px-1">até</span>
            <div className="flex-1">
              <Input
                type="date"
                value={filtros.dataFim || ''}
                onChange={e => updateFiltro('dataFim', e.target.value)}
                className="text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={buscar} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabela ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Histórico de Envios
              {!loading && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {logs.length} registro{logs.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={buscar} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MessageSquare className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-sm">Nenhum registro encontrado</p>
              <p className="text-xs mt-1">Crie um agendamento para ver o envio aqui</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data Agend.</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Envio</TableHead>
                    <TableHead>Interação</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Disparado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => setLogSelecionado(log)}
                    >
                      {/* Semáforo */}
                      <TableCell>
                        <StatusDot status={log.status_envio} />
                      </TableCell>

                      {/* Cliente */}
                      <TableCell className="font-medium max-w-[140px] truncate">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          {nomeDaCliente(log)}
                        </span>
                      </TableCell>

                      {/* Telefone */}
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          {log.telefone}
                        </span>
                      </TableCell>

                      {/* Tipo */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {TIPO_LABELS[log.tipo_mensagem]}
                        </Badge>
                      </TableCell>

                      {/* Data */}
                      <TableCell className="text-sm whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {dataDoAgendamento(log)}
                        </span>
                      </TableCell>

                      {/* Hora */}
                      <TableCell className="text-sm text-muted-foreground">
                        {horaDoAgendamento(log)}
                      </TableCell>

                      {/* Profissional */}
                      <TableCell className="text-sm max-w-[120px] truncate">
                        {log.agendamento?.profissionais?.nome || '—'}
                      </TableCell>

                      {/* Status de envio */}
                      <TableCell>
                        <BadgeEnvio status={log.status_envio} />
                      </TableCell>

                      {/* Status de interação */}
                      <TableCell>
                        <BadgeInteracao status={log.status_interacao} />
                      </TableCell>

                      {/* Origem */}
                      <TableCell className="text-xs text-muted-foreground">
                        {ORIGEM_LABELS[log.origem_fluxo]}
                      </TableCell>

                      {/* Data/hora do disparo */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {log.enviado_em
                          ? format(parseISO(log.enviado_em), "dd/MM HH:mm", { locale: ptBR })
                          : format(parseISO(log.created_at), "dd/MM HH:mm", { locale: ptBR })
                        }
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Ver detalhes"
                            onClick={() => setLogSelecionado(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            title="Reenviar"
                            onClick={() => setConfirmReenvio(log)}
                            disabled={enviando === log.id}
                          >
                            {enviando === log.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Send className="h-4 w-4" />
                            }
                          </Button>
                          {log.status_envio === 'falha' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-muted-foreground"
                              title="Marcar como resolvido"
                              onClick={() => marcarResolvido(log.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal de detalhe ── */}
      <ModalDetalhe
        log={logSelecionado}
        open={!!logSelecionado}
        onClose={() => setLogSelecionado(null)}
        onReenviar={(log) => {
          setLogSelecionado(null);
          setConfirmReenvio(log);
        }}
        enviando={enviando}
      />

      {/* ── Confirmação de reenvio ── */}
      <AlertDialog open={!!confirmReenvio} onOpenChange={() => setConfirmReenvio(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar Mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Será criado um novo registro de reenvio para{' '}
              <strong>{confirmReenvio ? nomeDaCliente(confirmReenvio) : ''}</strong>{' '}
              ({confirmReenvio?.telefone}). O histórico anterior será preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmReenvio) {
                  reenviarManual(confirmReenvio);
                  setConfirmReenvio(null);
                }
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Reenviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
