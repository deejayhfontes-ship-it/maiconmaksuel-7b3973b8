import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  RefreshCw,
  Search,
  Filter,
  Unlock,
  XCircle,
  Eye,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useComandaAuditoria, AuditoriaRecord, ComandaFechada } from '@/hooks/useComandaAuditoria';
import { ComandaAuditoriaModal } from '@/components/atendimentos/ComandaAuditoriaModal';
import { cn } from '@/lib/utils';

const formatPrice = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const acaoBadge: Record<string, { cor: string; label: string; icon: React.ReactNode }> = {
  reaberta:   { cor: 'bg-amber-100 text-amber-800 border-amber-200',   label: 'Reaberta',         icon: <Unlock className="h-3 w-3" /> },
  cancelada:  { cor: 'bg-red-100 text-red-800 border-red-200',         label: 'Cancelada',        icon: <XCircle className="h-3 w-3" /> },
  item_removido:   { cor: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Item Removido',    icon: <XCircle className="h-3 w-3" /> },
  item_adicionado: { cor: 'bg-blue-100 text-blue-800 border-blue-200',       label: 'Item Adicionado',  icon: <CheckCircle className="h-3 w-3" /> },
  desconto_alterado: { cor: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Desconto Alterado', icon: <AlertTriangle className="h-3 w-3" /> },
  cliente_alterado:  { cor: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Cliente Alterado',  icon: <User className="h-3 w-3" /> },
};

const statusComandaBadge: Record<string, { cor: string; label: string }> = {
  fechado:    { cor: 'bg-green-100 text-green-800',   label: 'Fechada' },
  finalizado: { cor: 'bg-green-100 text-green-800',   label: 'Finalizada' },
  cancelado:  { cor: 'bg-red-100 text-red-800',       label: 'Cancelada' },
  aberto:     { cor: 'bg-amber-100 text-amber-800',   label: 'Aberta' },
};

export default function AuditoriaComandas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    buscarAuditoria,
    buscarComandasFechadas,
    reabrirComanda,
    cancelarComandaFechada,
  } = useComandaAuditoria();

  const [auditoria, setAuditoria]     = useState<AuditoriaRecord[]>([]);
  const [comandas, setComandas]         = useState<ComandaFechada[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filtroAcao, setFiltroAcao]     = useState('todas');
  const [filtroDias, setFiltroDias]     = useState('30');

  // Modal de ação
  const [modalAberto, setModalAberto]   = useState(false);
  const [acaoAtual, setAcaoAtual]       = useState<'reaberta' | 'cancelada'>('reaberta');
  const [comandaSelecionada, setComandaSelecionada] = useState<ComandaFechada | null>(null);

  // Modal detalhe auditoria
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [registroDetalhe, setRegistroDetalhe] = useState<AuditoriaRecord | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [audit, cmds] = await Promise.all([
      buscarAuditoria({ dias: Number(filtroDias) }),
      buscarComandasFechadas(Number(filtroDias)),
    ]);
    setAuditoria(audit);
    setComandas(cmds);
    setLoading(false);
  }, [buscarAuditoria, buscarComandasFechadas, filtroDias]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirAcao = (comanda: ComandaFechada, acao: 'reaberta' | 'cancelada') => {
    setComandaSelecionada(comanda);
    setAcaoAtual(acao);
    setModalAberto(true);
  };

  const confirmarAcao = async (motivo: string) => {
    if (!comandaSelecionada) return;
    const fn = acaoAtual === 'reaberta' ? reabrirComanda : cancelarComandaFechada;
    const result = await fn(comandaSelecionada, motivo);
    if (result.success) {
      toast({ title: `Comanda #${String(comandaSelecionada.numero_comanda).padStart(3,'0')} ${acaoAtual === 'reaberta' ? 'reaberta' : 'cancelada'}!` });
      carregar();
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  // Filtros
  const auditoriaFiltrada = auditoria.filter(r => {
    const matchSearch = search === '' ||
      String(r.numero_comanda).includes(search) ||
      r.motivo.toLowerCase().includes(search.toLowerCase()) ||
      (r.usuario_nome || '').toLowerCase().includes(search.toLowerCase());
    const matchAcao = filtroAcao === 'todas' || r.acao === filtroAcao;
    return matchSearch && matchAcao;
  });

  const comandasFiltradas = comandas.filter(c =>
    search === '' ||
    String(c.numero_comanda).includes(search) ||
    (c.cliente?.nome || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/atendimentos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Auditoria de Comandas
          </h1>
          <p className="text-muted-foreground text-sm">
            Todas as alterações em comandas fechadas ficam registradas aqui
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Ações</p>
            <p className="text-2xl font-bold">{auditoria.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reabertas</p>
            <p className="text-2xl font-bold text-amber-600">
              {auditoria.filter(a => a.acao === 'reaberta').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Canceladas</p>
            <p className="text-2xl font-bold text-red-600">
              {auditoria.filter(a => a.acao === 'cancelada').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Comandas Fechadas</p>
            <p className="text-2xl font-bold text-green-600">{comandas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por comanda, motivo ou usuário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filtroDias} onValueChange={setFiltroDias}>
          <SelectTrigger className="w-[160px]">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroAcao} onValueChange={setFiltroAcao}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as ações</SelectItem>
            <SelectItem value="reaberta">Reabertas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
            <SelectItem value="item_removido">Item Removido</SelectItem>
            <SelectItem value="item_adicionado">Item Adicionado</SelectItem>
            <SelectItem value="desconto_alterado">Desconto Alterado</SelectItem>
            <SelectItem value="cliente_alterado">Cliente Alterado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="auditoria">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="auditoria">
            <Shield className="h-4 w-4 mr-2" />
            Registro de Auditoria
          </TabsTrigger>
          <TabsTrigger value="comandas">
            <Eye className="h-4 w-4 mr-2" />
            Comandas Fechadas
          </TabsTrigger>
        </TabsList>

        {/* Aba: Registro de Auditoria */}
        <TabsContent value="auditoria">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Ações</CardTitle>
              <CardDescription>
                Toda alteração em comanda fechada fica registrada aqui permanentemente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : auditoriaFiltrada.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum registro de auditoria encontrado</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Comanda</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Por</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead className="text-right">Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditoriaFiltrada.map(r => {
                        const badge = acaoBadge[r.acao] || {
                          cor: 'bg-gray-100 text-gray-800',
                          label: r.acao,
                          icon: null,
                        };
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-bold">
                              #{String(r.numero_comanda).padStart(3, '0')}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn('flex items-center gap-1 w-fit', badge.cor)}
                              >
                                {badge.icon}
                                {badge.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {r.motivo}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1 text-sm">
                                <User className="h-3 w-3" />
                                {r.usuario_nome || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {format(parseISO(r.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setRegistroDetalhe(r); setDetalheAberto(true); }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Comandas Fechadas */}
        <TabsContent value="comandas">
          <Card>
            <CardHeader>
              <CardTitle>Comandas Fechadas</CardTitle>
              <CardDescription>
                Gerencie comandas já finalizadas — toda ação é auditada. Inclui serviços, profissional e pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : comandasFiltradas.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p>Nenhuma comanda encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comandasFiltradas.map(c => {
                    const statusInfo = statusComandaBadge[c.status] || { cor: 'bg-gray-100 text-gray-800', label: c.status };
                    const podeReabrir = c.status !== 'aberto';
                    const formasPgto = (c.pagamentos || []).map(p => p.forma_pagamento).filter(Boolean).join(', ') || '—';
                    return (
                      <Card key={c.id} className="border overflow-hidden">
                        {/* Linha principal */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              <span className="text-base font-bold">
                                #{String(c.numero_comanda).padStart(3, '0')}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate flex items-center gap-1">
                                <User className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                                {c.cliente?.nome || <span className="text-muted-foreground italic">Cliente avulso</span>}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(c.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Pagamento</p>
                              <p className="text-xs font-medium capitalize">{formasPgto}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Valor Total</p>
                              <p className="font-bold text-success">{formatPrice(c.valor_final)}</p>
                            </div>
                            <Badge variant="outline" className={cn('text-xs whitespace-nowrap', statusInfo.cor)}>
                              {statusInfo.label}
                            </Badge>
                            <div className="flex gap-1">
                              {podeReabrir && c.status !== 'cancelado' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                  onClick={() => abrirAcao(c, 'reaberta')}
                                >
                                  <Unlock className="h-3.5 w-3.5 mr-1" />
                                  Reabrir
                                </Button>
                              )}
                              {c.status !== 'cancelado' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => abrirAcao(c, 'cancelada')}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Cancelar
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Serviços realizados */}
                        {(c.servicos || []).length > 0 && (
                          <div className="border-t bg-muted/30 px-4 py-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Serviços realizados</p>
                            <div className="space-y-1">
                              {(c.servicos || []).map((s, idx) => (
                                <div key={s.id || idx} className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground">{s.quantidade ?? 1}×</span>
                                    <span className="font-medium">{s.servico?.nome || '—'}</span>
                                    {s.profissional?.nome && (
                                      <span className="text-muted-foreground">· {s.profissional.nome}</span>
                                    )}
                                  </span>
                                  <span className="font-medium">{formatPrice(s.subtotal || s.preco_unitario * (s.quantidade ?? 1))}</span>
                                </div>
                              ))}
                            </div>
                            {c.desconto > 0 && (
                              <div className="flex justify-between text-xs text-muted-foreground mt-1 pt-1 border-t border-dashed">
                                <span>Desconto</span>
                                <span className="text-red-500">−{formatPrice(c.desconto)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Modal de Ação Auditada */}
      {comandaSelecionada && (
        <ComandaAuditoriaModal
          open={modalAberto}
          onOpenChange={setModalAberto}
          acao={acaoAtual}
          numeroComanda={comandaSelecionada.numero_comanda}
          clienteNome={comandaSelecionada.cliente?.nome}
          valorComanda={comandaSelecionada.valor_final}
          onConfirmar={confirmarAcao}
        />
      )}

      {/* Modal Detalhe da Auditoria */}
      <Dialog open={detalheAberto} onOpenChange={setDetalheAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhe do Registro</DialogTitle>
            <DialogDescription>
              Informações completas do evento auditado
            </DialogDescription>
          </DialogHeader>
          {registroDetalhe && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Comanda</p>
                  <p className="font-bold">#{String(registroDetalhe.numero_comanda).padStart(3,'0')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ação</p>
                  <p className="font-medium capitalize">{registroDetalhe.acao.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Usuário</p>
                  <p className="font-medium">{registroDetalhe.usuario_nome || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">
                    {format(parseISO(registroDetalhe.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Motivo</p>
                <p className="bg-muted/50 rounded p-2 mt-1">{registroDetalhe.motivo}</p>
              </div>
              {registroDetalhe.detalhes && (
                <div>
                  <p className="text-muted-foreground mb-1">Snapshot anterior</p>
                  <pre className="bg-muted/50 rounded p-2 text-xs overflow-auto">
                    {JSON.stringify(registroDetalhe.detalhes, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
