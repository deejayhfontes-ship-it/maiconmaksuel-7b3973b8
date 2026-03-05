import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Receipt,
  Plus,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Eye,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import NovoValeModal from "./NovoValeModal";
import QuitarValeModal from "./QuitarValeModal";
import DetalhesValeModal from "./DetalhesValeModal";

interface Vale {
  id: string;
  profissional_id: string;
  valor_total: number;
  valor_pago: number;
  saldo_restante: number;
  data_lancamento: string;
  data_quitacao: string | null;
  motivo: string;
  observacoes: string | null;
  forma_desconto: "unico" | "parcelado";
  parcelas_total: number | null;
  parcelas_pagas: number;
  status: "aberto" | "quitado" | "cancelado";
  quitado_por: string | null;
  comprovante_url: string | null;
  created_at: string;
  profissional?: {
    id: string;
    nome: string;
    funcao: string | null;
    foto_url: string | null;
  };
}

interface Profissional {
  id: string;
  nome: string;
  funcao: string | null;
  foto_url: string | null;
}

interface ProfissionalValesTabProps {
  profissional: Profissional;
}

const ProfissionalValesTab = ({ profissional }: ProfissionalValesTabProps) => {
  const [vales, setVales] = useState<Vale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"abertos" | "quitados" | "todos">("abertos");
  const [sortOrder, setSortOrder] = useState<"recente" | "antigo" | "maior">("recente");

  // Modals
  const [isNovoValeOpen, setIsNovoValeOpen] = useState(false);
  const [isQuitarOpen, setIsQuitarOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [selectedVale, setSelectedVale] = useState<Vale | null>(null);

  const { toast } = useToast();

  const fetchVales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vales")
      .select("*")
      .eq("profissional_id", profissional.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar vales", variant: "destructive" });
    } else {
      setVales((data || []) as Vale[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVales();

    const channel = supabase
      .channel(`vales_prof_${profissional.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "vales",
        filter: `profissional_id=eq.${profissional.id}`,
      }, () => {
        fetchVales();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profissional.id]);

  const filteredVales = useMemo(() => {
    let result = [...vales];

    if (statusFilter === "abertos") {
      result = result.filter((v) => v.status === "aberto");
    } else if (statusFilter === "quitados") {
      result = result.filter((v) => v.status === "quitado" || v.status === "cancelado");
    }

    result.sort((a, b) => {
      switch (sortOrder) {
        case "recente":
          return new Date(b.data_lancamento).getTime() - new Date(a.data_lancamento).getTime();
        case "antigo":
          return new Date(a.data_lancamento).getTime() - new Date(b.data_lancamento).getTime();
        case "maior":
          return b.valor_total - a.valor_total;
        default:
          return 0;
      }
    });

    return result;
  }, [vales, statusFilter, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const abertos = vales.filter((v) => v.status === "aberto");
    const quitados = vales.filter((v) => v.status === "quitado");
    const ultimoVale = vales[0];

    return {
      totalAtivo: abertos.reduce((sum, v) => sum + Number(v.saldo_restante), 0),
      qtdQuitados: quitados.length,
      ultimoVale: ultimoVale?.data_lancamento,
      totalRecebido: vales.reduce((sum, v) => sum + Number(v.valor_total), 0),
      mediaVale: vales.length > 0 ? vales.reduce((sum, v) => sum + Number(v.valor_total), 0) / vales.length : 0,
      taxaQuitacao: vales.length > 0 ? (quitados.length / vales.length) * 100 : 0,
    };
  }, [vales]);

  // Chart data - últimos 12 meses
  const chartData = useMemo(() => {
    const data = [];
    const hoje = new Date();

    for (let i = 11; i >= 0; i--) {
      const mesData = subMonths(hoje, i);
      const mesInicio = startOfMonth(mesData);
      const mesLabel = format(mesData, "MMM", { locale: ptBR });

      const lancados = vales.filter((v) => {
        const dataLanc = new Date(v.data_lancamento);
        return dataLanc.getMonth() === mesInicio.getMonth() && dataLanc.getFullYear() === mesInicio.getFullYear();
      });

      const quitados = vales.filter((v) => {
        if (!v.data_quitacao) return false;
        const dataQuit = new Date(v.data_quitacao);
        return dataQuit.getMonth() === mesInicio.getMonth() && dataQuit.getFullYear() === mesInicio.getFullYear();
      });

      data.push({
        mes: mesLabel,
        lancados: lancados.reduce((sum, v) => sum + Number(v.valor_total), 0),
        quitados: quitados.reduce((sum, v) => sum + Number(v.valor_total), 0),
      });
    }

    return data;
  }, [vales]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleQuitar = (vale: Vale) => {
    setSelectedVale({ ...vale, profissional: profissional } as any);
    setIsQuitarOpen(true);
  };

  const handleDetalhes = (vale: Vale) => {
    setSelectedVale({ ...vale, profissional: profissional } as any);
    setIsDetalhesOpen(true);
  };

  const handleModalClose = (refresh?: boolean) => {
    setIsNovoValeOpen(false);
    setIsQuitarOpen(false);
    setIsDetalhesOpen(false);
    setSelectedVale(null);
    if (refresh) fetchVales();
  };

  // Group vales by year and month for timeline
  const groupedVales = useMemo(() => {
    const groups: Record<string, { year: string; months: Record<string, Vale[]> }> = {};

    filteredVales.forEach((vale) => {
      const date = parseISO(vale.data_lancamento);
      const year = format(date, "yyyy");
      const month = format(date, "MMMM", { locale: ptBR });

      if (!groups[year]) {
        groups[year] = { year, months: {} };
      }
      if (!groups[year].months[month]) {
        groups[year].months[month] = [];
      }
      groups[year].months[month].push(vale);
    });

    return Object.values(groups).sort((a, b) => parseInt(b.year) - parseInt(a.year));
  }, [filteredVales]);

  return (
    <div className="space-y-6">
      {/* Header Resumo */}
      <Card className="border-0 shadow-sm" style={{ backgroundColor: "#FFCC0010" }}>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5" style={{ color: "#FFCC00" }} />
                <span className="font-medium">Total em Vales Ativos:</span>
                <span className="text-xl font-bold" style={{ color: stats.totalAtivo > 0 ? "#FF3B30" : "#34C759" }}>
                  {formatCurrency(stats.totalAtivo)}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>📊 Vales quitados (todos): {stats.qtdQuitados}</span>
                {stats.ultimoVale && (
                  <span>📅 Último vale: {format(parseISO(stats.ultimoVale), "dd/MM/yyyy")}</span>
                )}
              </div>
            </div>
            <Button
              onClick={() => setIsNovoValeOpen(true)}
              className="text-foreground font-semibold"
              style={{ backgroundColor: "#34C759" }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Lançar Novo Vale
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="abertos">Abertos</TabsTrigger>
            <TabsTrigger value="quitados">Quitados</TabsTrigger>
            <TabsTrigger value="todos">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
          className="px-3 py-2 rounded-lg border bg-background text-sm"
        >
          <option value="recente">Mais recente</option>
          <option value="antigo">Mais antigo</option>
          <option value="maior">Maior valor</option>
        </select>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredVales.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Receipt}
              title="Nenhum vale lançado"
              description={`Lance o primeiro vale para ${profissional.nome}`}
              action={{
                label: "Lançar Primeiro Vale",
                onClick: () => setIsNovoValeOpen(true),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedVales.map((yearGroup) => (
            <div key={yearGroup.year}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-lg font-bold text-muted-foreground">{yearGroup.year}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {Object.entries(yearGroup.months).map(([month, monthVales]) => (
                <div key={month} className="relative pl-8 pb-6">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

                  {/* Month marker */}
                  <div className="absolute left-0 top-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>

                  <div className="mb-3">
                    <span className="text-sm font-semibold capitalize text-muted-foreground">{month}</span>
                  </div>

                  <div className="space-y-3">
                    {monthVales.map((vale) => (
                      <Card
                        key={vale.id}
                        className={`border-2 transition-all ${
                          vale.status === "aberto"
                            ? "border-amber-400"
                            : "border-success/30"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">{formatCurrency(vale.valor_total)}</span>
                                <Badge
                                  className={
                                    vale.status === "aberto"
                                      ? "bg-amber-500/10 text-amber-600"
                                      : "bg-success/10 text-success"
                                  }
                                >
                                  {vale.status === "aberto" ? "ABERTO" : vale.status === "quitado" ? "QUITADO" : "CANCELADO"}
                                </Badge>
                                {vale.status === "aberto" && <AlertCircle className="h-4 w-4 text-amber-500" />}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{vale.motivo}</p>
                            </div>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {format(parseISO(vale.data_lancamento), "dd/MM")}
                            </span>
                          </div>

                          {vale.forma_desconto === "parcelado" && vale.parcelas_total && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                                <span>
                                  {vale.parcelas_total}x de {formatCurrency(vale.valor_total / vale.parcelas_total)}
                                </span>
                                <span>
                                  {vale.parcelas_pagas}/{vale.parcelas_total} pagas
                                </span>
                              </div>
                              <Progress value={(vale.parcelas_pagas / vale.parcelas_total) * 100} className="h-2" />
                            </div>
                          )}

                          {vale.forma_desconto === "unico" && (
                            <Badge variant="secondary" className="mb-3">Desconto Único</Badge>
                          )}

                          <div className="flex items-center justify-between">
                            <span className={vale.saldo_restante > 0 ? "text-destructive text-sm font-medium" : "text-success text-sm font-medium"}>
                              Saldo: {formatCurrency(vale.saldo_restante)}
                            </span>
                            <div className="flex gap-2">
                              {vale.status === "aberto" && (
                                <Button size="sm" onClick={() => handleQuitar(vale)} style={{ backgroundColor: "#34C759" }} className="text-white">
                                  Quitar
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => handleDetalhes(vale)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {vale.status === "quitado" && vale.data_quitacao && (
                            <p className="text-xs text-success mt-2 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Quitado em: {format(parseISO(vale.data_quitacao), "dd/MM/yyyy")}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {vales.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Histórico nos últimos 12 meses</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  />
                  <Legend />
                  <Bar dataKey="lancados" name="Lançados" fill="#FFCC00" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="quitados" name="Quitados" fill="#34C759" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {vales.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Recebido</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalRecebido)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Média por Vale</p>
              <p className="text-xl font-bold">{formatCurrency(stats.mediaVale)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Taxa Quitação</p>
              <p className="text-xl font-bold">{stats.taxaQuitacao.toFixed(0)}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals */}
      <NovoValeModal
        open={isNovoValeOpen}
        onClose={handleModalClose}
        profissionais={[profissional]}
        preSelectedProfissional={profissional}
      />

      <QuitarValeModal
        open={isQuitarOpen}
        onClose={handleModalClose}
        vale={selectedVale}
      />

      <DetalhesValeModal
        open={isDetalhesOpen}
        onClose={handleModalClose}
        vale={selectedVale}
      />
    </div>
  );
};

export default ProfissionalValesTab;
