import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { format, parseISO, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  Phone,
  RefreshCw,
  Search,
  Calendar,
  User,
  Scissors,
  MessageSquare,
  TrendingUp,
  RotateCcw,
  Settings,
  Ban,
  CheckCheck,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConfirmacaoCompleta {
  id: string;
  status: string;
  token_confirmacao: string;
  confirmado_em: string | null;
  cancelado_em: string | null;
  observacao_cancelamento: string | null;
  taxa_aplicada: boolean;
  valor_taxa: number;
  created_at: string;
  agendamento_id: string;
  agendamento: {
    id: string;
    data_hora: string;
    cliente: {
      id: string;
      nome: string;
      celular: string;
      receber_mensagens: boolean;
    };
    servico: {
      nome: string;
    };
    profissional: {
      nome: string;
    };
  };
}

interface Stats {
  total: number;
  confirmados: number;
  cancelados: number;
  pendentes: number;
  taxaConfirmacao: number;
  taxaCancelamento: number;
}

export default function ConfirmacoesWhatsApp() {
  const [confirmacoes, setConfirmacoes] = useState<ConfirmacaoCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("amanha");
  const [stats, setStats] = useState<Stats>({
    total: 0,
    confirmados: 0,
    cancelados: 0,
    pendentes: 0,
    taxaConfirmacao: 0,
    taxaCancelamento: 0,
  });

  // Modal de cancelamento manual
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedConfirmacao, setSelectedConfirmacao] = useState<ConfirmacaoCompleta | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [aplicarTaxa, setAplicarTaxa] = useState(false);
  const [valorTaxa, setValorTaxa] = useState(30);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchConfirmacoes();
  }, [activeTab]);

  const fetchConfirmacoes = async () => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      if (activeTab === "hoje") {
        startDate = startOfDay(new Date());
        endDate = endOfDay(new Date());
      } else if (activeTab === "amanha") {
        startDate = startOfDay(addDays(new Date(), 1));
        endDate = endOfDay(addDays(new Date(), 1));
      } else {
        startDate = startOfDay(new Date());
        endDate = endOfDay(addDays(new Date(), 7));
      }

      const { data, error } = await supabase
        .from("confirmacoes_agendamento")
        .select(`
          id,
          status,
          token_confirmacao,
          confirmado_em,
          cancelado_em,
          observacao_cancelamento,
          taxa_aplicada,
          valor_taxa,
          created_at,
          agendamento_id,
          agendamento:agendamentos(
            id,
            data_hora,
            cliente:clientes(id, nome, celular, receber_mensagens),
            servico:servicos(nome),
            profissional:profissionais(nome)
          )
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      const confirmacoesMapped = (data || []).map((c: any) => ({
        ...c,
        agendamento: {
          ...c.agendamento,
          cliente: c.agendamento?.cliente || { id: "", nome: "Cliente", celular: "", receber_mensagens: true },
          servico: c.agendamento?.servico || { nome: "Serviço" },
          profissional: c.agendamento?.profissional || { nome: "Profissional" },
        },
      }));

      setConfirmacoes(confirmacoesMapped);

      // Calcular stats
      const total = confirmacoesMapped.length;
      const confirmados = confirmacoesMapped.filter((c: ConfirmacaoCompleta) => c.status === "confirmado").length;
      const cancelados = confirmacoesMapped.filter((c: ConfirmacaoCompleta) => c.status === "cancelado").length;
      const pendentes = confirmacoesMapped.filter((c: ConfirmacaoCompleta) => c.status === "pendente").length;

      setStats({
        total,
        confirmados,
        cancelados,
        pendentes,
        taxaConfirmacao: total > 0 ? Math.round((confirmados / total) * 100) : 0,
        taxaCancelamento: total > 0 ? Math.round((cancelados / total) * 100) : 0,
      });
    } catch (error) {
      console.error("Erro ao buscar confirmações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarManual = async (confirmacao: ConfirmacaoCompleta) => {
    setProcessing(true);
    try {
      // Atualizar confirmação
      await supabase
        .from("confirmacoes_agendamento")
        .update({
          status: "confirmado",
          confirmado_em: new Date().toISOString(),
        })
        .eq("id", confirmacao.id);

      // Atualizar status do agendamento
      await supabase
        .from("agendamentos")
        .update({ status: "confirmado" })
        .eq("id", confirmacao.agendamento_id);

      toast.success("Agendamento confirmado manualmente!");
      fetchConfirmacoes();
    } catch (error) {
      console.error("Erro ao confirmar:", error);
      toast.error("Erro ao confirmar agendamento");
    } finally {
      setProcessing(false);
    }
  };

  const openCancelModal = (confirmacao: ConfirmacaoCompleta) => {
    setSelectedConfirmacao(confirmacao);
    setMotivoCancelamento("");
    setAplicarTaxa(false);
    setCancelModalOpen(true);
  };

  const handleCancelarManual = async () => {
    if (!selectedConfirmacao) return;
    setProcessing(true);
    try {
      // Atualizar confirmação
      await supabase
        .from("confirmacoes_agendamento")
        .update({
          status: "cancelado",
          cancelado_em: new Date().toISOString(),
          observacao_cancelamento: motivoCancelamento || "Cancelado manualmente",
          taxa_aplicada: aplicarTaxa,
          valor_taxa: aplicarTaxa ? valorTaxa : 0,
        })
        .eq("id", selectedConfirmacao.id);

      // Atualizar status do agendamento
      await supabase
        .from("agendamentos")
        .update({ status: "cancelado" })
        .eq("id", selectedConfirmacao.agendamento_id);

      toast.success("Agendamento cancelado!");
      setCancelModalOpen(false);
      fetchConfirmacoes();
    } catch (error) {
      console.error("Erro ao cancelar:", error);
      toast.error("Erro ao cancelar agendamento");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleEnvioMensagens = async (cliente: { id: string; receber_mensagens: boolean }) => {
    try {
      await supabase
        .from("clientes")
        .update({ receber_mensagens: !cliente.receber_mensagens })
        .eq("id", cliente.id);

      toast.success(cliente.receber_mensagens 
        ? "Envio de mensagens desativado para este cliente" 
        : "Envio de mensagens ativado para este cliente"
      );
      fetchConfirmacoes();
    } catch (error) {
      toast.error("Erro ao atualizar configuração");
    }
  };

  const handleReenviar = async (confirmacao: ConfirmacaoCompleta) => {
    toast.info("Reenviando mensagem...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success("Mensagem reenviada com sucesso!");
  };

  const handleLigar = (telefone: string) => {
    window.open(`tel:${telefone.replace(/\D/g, "")}`, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmado":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmado
          </Badge>
        );
      case "cancelado":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelado
          </Badge>
        );
      case "pendente":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Sem resposta
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredConfirmacoes = confirmacoes.filter((c) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.agendamento.cliente.nome.toLowerCase().includes(searchLower) ||
      c.agendamento.servico.nome.toLowerCase().includes(searchLower) ||
      c.agendamento.profissional.nome.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" />
            Confirmações WhatsApp
          </h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie as confirmações de agendamentos
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/configuracoes/whatsapp">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmados</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmados}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelados</p>
                <p className="text-2xl font-bold text-destructive">{stats.cancelados}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa Confirmação</p>
                <p className="text-2xl font-bold">{stats.taxaConfirmacao}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="amanha">Amanhã</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button variant="outline" onClick={fetchConfirmacoes}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredConfirmacoes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma confirmação encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                As confirmações aparecem quando agendamentos são criados
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredConfirmacoes.map((confirmacao) => (
            <Card key={confirmacao.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{confirmacao.agendamento.cliente.nome}</span>
                      {getStatusBadge(confirmacao.status)}
                      {confirmacao.taxa_aplicada && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          💰 Taxa R$ {confirmacao.valor_taxa.toFixed(2)}
                        </Badge>
                      )}
                      {!confirmacao.agendamento.cliente.receber_mensagens && (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Ban className="h-3 w-3 mr-1" />
                          Sem envio
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(parseISO(confirmacao.agendamento.data_hora), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Scissors className="h-4 w-4" />
                        {confirmacao.agendamento.servico.nome}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {confirmacao.agendamento.profissional.nome}
                      </span>
                    </div>

                    {confirmacao.status === "confirmado" && confirmacao.confirmado_em && (
                      <p className="text-xs text-green-600">
                        Confirmado em {format(parseISO(confirmacao.confirmado_em), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}

                    {confirmacao.status === "cancelado" && confirmacao.observacao_cancelamento && (
                      <p className="text-xs text-muted-foreground">
                        Motivo: "{confirmacao.observacao_cancelamento}"
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 items-center">
                    {confirmacao.status === "pendente" && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleConfirmarManual(confirmacao)}
                          disabled={processing}
                        >
                          <CheckCheck className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => openCancelModal(confirmacao)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {confirmacao.status === "pendente" && (
                          <>
                            <DropdownMenuItem onClick={() => handleReenviar(confirmacao)}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Reenviar Mensagem
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleLigar(confirmacao.agendamento.cliente.celular)}>
                              <Phone className="h-4 w-4 mr-2" />
                              Ligar para Cliente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Mensagem
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleToggleEnvioMensagens(confirmacao.agendamento.cliente)}
                        >
                          {confirmacao.agendamento.cliente.receber_mensagens ? (
                            <>
                              <Ban className="h-4 w-4 mr-2" />
                              Desativar Envio para Cliente
                            </>
                          ) : (
                            <>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Ativar Envio para Cliente
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Cancelamento */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Cancelar Agendamento
            </DialogTitle>
            <DialogDescription>
              Cancelar manualmente o agendamento de {selectedConfirmacao?.agendamento.cliente.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {selectedConfirmacao && format(parseISO(selectedConfirmacao.agendamento.data_hora), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Scissors className="h-4 w-4" />
                {selectedConfirmacao?.agendamento.servico.nome}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo do cancelamento</Label>
              <Textarea
                placeholder="Descreva o motivo..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aplicar taxa de cancelamento</Label>
                <p className="text-xs text-muted-foreground">
                  Cobrar taxa por cancelamento tardio
                </p>
              </div>
              <Switch
                checked={aplicarTaxa}
                onCheckedChange={setAplicarTaxa}
              />
            </div>

            {aplicarTaxa && (
              <div className="space-y-2">
                <Label>Valor da taxa (R$)</Label>
                <Input
                  type="number"
                  value={valorTaxa}
                  onChange={(e) => setValorTaxa(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelarManual}
              disabled={processing}
            >
              {processing ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
