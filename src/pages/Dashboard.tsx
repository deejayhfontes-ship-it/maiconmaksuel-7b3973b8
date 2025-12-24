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
import { DollarSign, Users, Calendar, UserPlus, TrendingUp, ArrowRight, Clock, Sparkles } from "lucide-react";
import iconeMaicon from "@/assets/icone-maicon.svg";
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

// iOS Status Badges
const getStatusBadge = (status: string) => {
  switch (status) {
    case "confirmado":
      return <Badge variant="success">Confirmado</Badge>;
    case "agendado":
      return <Badge variant="warning">Agendado</Badge>;
    case "concluido":
      return <Badge variant="info">Concluído</Badge>;
    case "cancelado":
      return <Badge variant="destructive">Cancelado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const motivationalMessages = [
  "Cada cliente é uma oportunidade de fazer a diferença!",
  "Seu talento transforma vidas, uma pessoa de cada vez.",
  "Excelência não é um ato, é um hábito. Continue brilhando!",
  "Hoje é um novo dia para superar expectativas.",
  "A beleza que você cria reflete a beleza do seu trabalho.",
  "Sucesso é a soma de pequenos esforços repetidos dia após dia.",
  "Você não está apenas trabalhando, está criando confiança.",
  "Grandes resultados começam com pequenas atitudes positivas.",
  "Sua energia positiva contagia quem passa por aqui.",
  "Faça de cada atendimento uma experiência memorável!",
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
};

const Dashboard = () => {
  const [agendamentosHoje, setAgendamentosHoje] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [motivationalMessage] = useState(() => 
    motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
  );
  const [stats, setStats] = useState({
    faturamentoHoje: 0,
    atendimentosHoje: 0,
    agendamentosHoje: 0,
    novosClientes: 0,
  });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="space-y-4 md:space-y-6">
      {/* Header com Logo, Relógio e Mensagem Motivacional */}
      <div className="flex flex-col gap-4 lg:gap-6">
        {/* Logo e título */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <img 
              src={iconeMaicon} 
              alt="Ícone" 
              className="h-6 w-6 object-contain dark:invert"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Início</h1>
            <p className="text-muted-foreground">Visão geral do seu salão</p>
          </div>
        </div>
        
        {/* Relógio e Mensagem - Responsivo */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 md:p-6">
            {/* Mobile: Layout vertical */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="text-center md:text-left">
                <div className="flex items-baseline justify-center md:justify-start gap-1">
                  <p className="text-3xl md:text-5xl font-bold tracking-tight text-foreground tabular-nums">
                    {format(currentTime, "HH:mm")}
                  </p>
                  <p className="text-lg md:text-2xl font-light text-muted-foreground tabular-nums">
                    {format(currentTime, ":ss")}
                  </p>
                </div>
                <p className="text-xs md:text-sm font-bold text-foreground capitalize mt-1">
                  {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
              <div className="hidden md:block h-16 w-px bg-border" />
              <div className="border-t md:border-t-0 pt-4 md:pt-0">
                <p className="text-base md:text-lg font-semibold text-foreground text-center md:text-left">
                  {getGreeting()}! 👋
                </p>
                <div className="flex items-start justify-center md:justify-start gap-2 mt-1">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs md:text-sm text-muted-foreground italic text-center md:text-left max-w-xs">
                    "{motivationalMessage}"
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agenda de Hoje - PRIMEIRO ITEM */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <div>
            <CardTitle className="text-base md:text-lg font-semibold">
              Agenda de Hoje
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/agenda" className="flex items-center justify-center gap-2">
              Ver Agenda Completa
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : agendamentosHoje.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20 md:w-24">Horário</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">Profissional</TableHead>
                    <TableHead className="hidden md:table-cell">Serviço</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendamentosHoje.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1 md:gap-2">
                          <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                          <span className="text-xs md:text-sm">{format(parseISO(apt.data_hora), "HH:mm")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs md:text-sm">{apt.cliente?.nome || "Sem cliente"}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 md:w-3 md:h-3 rounded-full"
                            style={{ backgroundColor: apt.profissional.cor_agenda }}
                          />
                          <span className="text-xs md:text-sm">{apt.profissional.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {apt.servico.nome}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(apt.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground px-4">
              <Calendar className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm md:text-base">Nenhum agendamento para hoje</p>
              <Button asChild variant="link" className="mt-2">
                <Link to="/agenda">Ir para a Agenda</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                    {card.title}
                  </p>
                  <p className="text-xl md:text-3xl font-bold text-foreground">{card.value}</p>
                  <div className="flex items-center gap-1 text-xs md:text-sm">
                    {card.changeType === "positive" && card.change && (
                      <>
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-success flex-shrink-0" />
                        <span className="text-success font-medium">{card.change}</span>
                      </>
                    )}
                    <span className="text-muted-foreground truncate">{card.subtitle}</span>
                  </div>
                </div>
                <div className={`p-2 md:p-3 rounded-lg flex-shrink-0 ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 md:h-6 md:w-6 ${card.iconColor}`} />
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

    </div>
  );
};

export default Dashboard;
