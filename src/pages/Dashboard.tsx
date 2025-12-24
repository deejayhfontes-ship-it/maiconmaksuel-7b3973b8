import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Users, Calendar, UserPlus, TrendingUp, ArrowRight, Clock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  cliente: { nome: string } | null;
  profissional: { nome: string; cor_agenda: string };
  servico: { nome: string };
}

// Dados mockados para o gráfico de faturamento
const revenueData = [
  { day: "01", value: 850 },
  { day: "02", value: 1200 },
  { day: "03", value: 980 },
  { day: "04", value: 1450 },
  { day: "05", value: 1100 },
  { day: "06", value: 1350 },
  { day: "07", value: 890 },
  { day: "08", value: 1500 },
  { day: "09", value: 1680 },
  { day: "10", value: 1420 },
  { day: "11", value: 1250 },
  { day: "12", value: 1890 },
  { day: "13", value: 2100 },
  { day: "14", value: 1750 },
  { day: "15", value: 1600 },
  { day: "16", value: 1950 },
  { day: "17", value: 2200 },
  { day: "18", value: 1800 },
  { day: "19", value: 2050 },
  { day: "20", value: 1700 },
  { day: "21", value: 1550 },
  { day: "22", value: 1900 },
  { day: "23", value: 2300 },
  { day: "24", value: 1234 },
];

// Dados mockados para top serviços
const topServicesData = [
  { name: "Corte Feminino", value: 45 },
  { name: "Escova", value: 38 },
  { name: "Coloração", value: 32 },
  { name: "Manicure", value: 28 },
  { name: "Pedicure", value: 22 },
];

const barColors = ["hsl(239, 84%, 67%)", "hsl(239, 84%, 72%)", "hsl(239, 84%, 77%)", "hsl(239, 84%, 82%)", "hsl(239, 84%, 87%)"];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "confirmado":
      return <Badge className="bg-success/10 text-success">Confirmado</Badge>;
    case "agendado":
      return <Badge className="bg-amber-500/10 text-amber-600">Agendado</Badge>;
    case "concluido":
      return <Badge className="bg-blue-500/10 text-blue-600">Concluído</Badge>;
    case "cancelado":
      return <Badge className="bg-destructive/10 text-destructive">Cancelado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const Dashboard = () => {
  const [agendamentosHoje, setAgendamentosHoje] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    faturamentoHoje: 0,
    atendimentosHoje: 0,
    agendamentosHoje: 0,
    novosClientes: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      // Buscar agendamentos de hoje
      const hoje = new Date();
      const inicioHoje = new Date(hoje.setHours(0, 0, 0, 0)).toISOString();
      const fimHoje = new Date(hoje.setHours(23, 59, 59, 999)).toISOString();

      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data_hora,
          status,
          cliente:clientes(nome),
          profissional:profissionais(nome, cor_agenda),
          servico:servicos(nome)
        `)
        .gte("data_hora", inicioHoje)
        .lte("data_hora", fimHoje)
        .neq("status", "cancelado")
        .order("data_hora", { ascending: true });

      if (agendamentos) {
        setAgendamentosHoje(agendamentos as unknown as Agendamento[]);
        setStats(prev => ({
          ...prev,
          agendamentosHoje: agendamentos.length,
        }));
      }

      // Buscar atendimentos fechados hoje
      const { data: atendimentos } = await supabase
        .from("atendimentos")
        .select("valor_final")
        .eq("status", "fechado")
        .gte("data_hora", inicioHoje)
        .lte("data_hora", fimHoje);

      if (atendimentos) {
        const faturamento = atendimentos.reduce((acc, at) => acc + Number(at.valor_final), 0);
        setStats(prev => ({
          ...prev,
          faturamentoHoje: faturamento,
          atendimentosHoje: atendimentos.length,
        }));
      }

      // Novos clientes este mês
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioMes);

      if (count) {
        setStats(prev => ({
          ...prev,
          novosClientes: count,
        }));
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: "Faturamento Hoje",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.faturamentoHoje),
      change: "+12%",
      changeType: "positive",
      subtitle: "vs ontem",
      icon: DollarSign,
      iconColor: "text-success",
      iconBg: "bg-success/10",
    },
    {
      title: "Atendimentos Hoje",
      value: stats.atendimentosHoje.toString(),
      change: "+8%",
      changeType: "positive",
      subtitle: "vs ontem",
      icon: Users,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      title: "Agendamentos Hoje",
      value: stats.agendamentosHoje.toString(),
      change: "",
      changeType: "neutral",
      subtitle: "confirmados",
      icon: Calendar,
      iconColor: "text-warning",
      iconBg: "bg-warning/10",
    },
    {
      title: "Novos Clientes",
      value: stats.novosClientes.toString(),
      change: "",
      changeType: "neutral",
      subtitle: "este mês",
      icon: UserPlus,
      iconColor: "text-pink-500",
      iconBg: "bg-pink-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu salão</p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  <div className="flex items-center gap-1 text-sm">
                    {card.changeType === "positive" && card.change && (
                      <>
                        <TrendingUp className="h-4 w-4 text-success" />
                        <span className="text-success font-medium">{card.change}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">{card.subtitle}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${card.iconBg}`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de Faturamento */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Faturamento Mensal
            </CardTitle>
            <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="day"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Faturamento"]}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Serviços */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top Serviços</CardTitle>
            <p className="text-sm text-muted-foreground">Mais realizados este mês</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServicesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value} atendimentos`, ""]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {topServicesData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={barColors[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximos Agendamentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Agenda de Hoje
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/agenda" className="flex items-center gap-2">
              Ver Agenda Completa
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : agendamentosHoje.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Horário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendamentosHoje.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {format(parseISO(apt.data_hora), "HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>{apt.cliente?.nome || "Sem cliente"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: apt.profissional.cor_agenda }}
                        />
                        {apt.profissional.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {apt.servico.nome}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(apt.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum agendamento para hoje</p>
              <Button asChild variant="link" className="mt-2">
                <Link to="/agenda">Ir para a Agenda</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
