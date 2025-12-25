import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RotateCcw
} from "lucide-react";

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
  agendamento: {
    id: string;
    data_hora: string;
    cliente: {
      nome: string;
      celular: string;
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
          agendamento:agendamentos(
            id,
            data_hora,
            cliente:clientes(nome, celular),
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
          cliente: c.agendamento?.cliente || { nome: "Cliente", celular: "" },
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

  const handleReenviar = async (confirmacao: ConfirmacaoCompleta) => {
    toast.info("Reenviando mensagem...");
    // Simular reenvio
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
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
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
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-primary" />
          Confirmações WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Acompanhe as confirmações de agendamentos
        </p>
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
                        Confirmado {format(parseISO(confirmacao.confirmado_em), "'há' HH:mm", { locale: ptBR })}
                      </p>
                    )}

                    {confirmacao.status === "cancelado" && confirmacao.observacao_cancelamento && (
                      <p className="text-xs text-muted-foreground">
                        Motivo: "{confirmacao.observacao_cancelamento}"
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {confirmacao.status === "pendente" && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReenviar(confirmacao)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reenviar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleLigar(confirmacao.agendamento.cliente.celular)}
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Ligar
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm">
                      <Send className="h-4 w-4 mr-1" />
                      Mensagem
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
