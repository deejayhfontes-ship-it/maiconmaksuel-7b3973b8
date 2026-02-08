import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePerformanceDebug, isDebugPerfActive } from "@/hooks/usePerformanceDebug";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Users, Calendar, UserPlus, TrendingUp, ArrowRight, Clock, Sparkles } from "lucide-react";
import AtalhosRapidos from "@/components/dashboard/AtalhosRapidos";
import { WhatsAppDashboardCard } from "@/components/dashboard/WhatsAppWidget";
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
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePinAuth } from "@/contexts/PinAuthContext";

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  cliente: { nome: string } | null;
  profissional: { nome: string; cor_agenda: string };
  servico: { nome: string };
}

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
  // Auth context - check if notebook role
  const { session } = usePinAuth();
  const isNotebook = session?.role === 'notebook';
  
  // Performance tracking
  const mountTimeRef = useRef(performance.now());
  const dataReadyTimeRef = useRef<number | null>(null);
  const debugActive = isDebugPerfActive();
  
  // Optimized: Single parallel data load via React Query
  const { data: dashboardData, isLoading, refetch } = useDashboardData();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [motivationalMessage] = useState(() => 
    motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
  );
  const [loadMetrics, setLoadMetrics] = useState<{ mountToReady: number } | null>(null);
  
  // Performance debug hook
  const perfDebug = usePerformanceDebug(!isLoading && !!dashboardData);
  
  // Track when data becomes ready
  useEffect(() => {
    if (!isLoading && dashboardData && dataReadyTimeRef.current === null) {
      dataReadyTimeRef.current = performance.now();
      const mountToReady = dataReadyTimeRef.current - mountTimeRef.current;
      setLoadMetrics({ mountToReady });
      
      if (debugActive) {
        console.log("[Dashboard] ⚡ Mount → Data Ready:", mountToReady.toFixed(0), "ms");
        console.log("[Dashboard] API Load Time:", dashboardData.loadTime?.toFixed(0), "ms");
      }
    }
  }, [isLoading, dashboardData, debugActive]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for data updates (imports/resets)
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log("Dashboard: Evento data-updated recebido, recarregando dados...");
      refetch();
    };
    
    window.addEventListener('data-updated', handleDataUpdate);
    return () => window.removeEventListener('data-updated', handleDataUpdate);
  }, [refetch]);

  // Safe defaults
  const data = dashboardData || {
    agendamentosHoje: [],
    atendimentosHoje: [],
    novosClientesMes: 0,
    faturamentoMensal: [],
    servicosMes: [],
    lembretes: [],
  };

  const faturamentoHoje = data.atendimentosHoje.reduce(
    (acc, at) => acc + Number(at.valor_final || 0),
    0
  );

  const allStats = [
    {
      title: "Faturamento Hoje",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(faturamentoHoje),
      change: "+12%",
      changeType: "positive" as const,
      subtitle: "vs ontem",
      icon: DollarSign,
      iconColor: "#34C759",
      iconBg: "rgba(52, 199, 89, 0.12)",
      hideForNotebook: true, // Ocultar faturamento para notebook
    },
    {
      title: "Atendimentos Hoje",
      value: data.atendimentosHoje.length.toString(),
      change: "+8%",
      changeType: "positive" as const,
      subtitle: "vs ontem",
      icon: Users,
      iconColor: "#007AFF",
      iconBg: "rgba(0, 122, 255, 0.12)",
    },
    {
      title: "Agendamentos Hoje",
      value: data.agendamentosHoje.length.toString(),
      change: "",
      changeType: "neutral" as const,
      subtitle: "confirmados",
      icon: Calendar,
      iconColor: "#FF9500",
      iconBg: "rgba(255, 149, 0, 0.12)",
    },
    {
      title: "Novos Clientes",
      value: data.novosClientesMes.toString(),
      change: "",
      changeType: "neutral" as const,
      subtitle: "este mês",
      icon: UserPlus,
      iconColor: "#FF2D55",
      iconBg: "rgba(255, 45, 85, 0.12)",
    },
  ];

  // Filtrar stats baseado no role (notebook não vê faturamento)
  const stats = isNotebook 
    ? allStats.filter(s => !s.hideForNotebook) 
    : allStats;

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

      {/* Agenda de Hoje */}
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
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : data.agendamentosHoje.length > 0 ? (
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
                  {(data.agendamentosHoje as Agendamento[]).map((apt) => (
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

      {/* Atalhos Rápidos */}
      <AtalhosRapidos />

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
        {stats.map((card) => (
          <div
            key={card.title}
            className="relative bg-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow min-h-[130px]"
          >
            {/* Ícone */}
            <div
              className="absolute top-5 right-5 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: card.iconBg }}
            >
              <card.icon size={22} color={card.iconColor} />
            </div>

            {/* Conteúdo */}
            <div className="flex flex-col justify-between h-full pr-14 md:pr-16 min-h-[90px]">
              <p className="text-xs md:text-[13px] font-medium text-muted-foreground truncate">
                {card.title}
              </p>
              <p className="text-2xl md:text-[28px] lg:text-[32px] font-bold text-foreground leading-none truncate">
                {card.value}
              </p>
              <div className="flex items-center gap-1 text-xs md:text-[13px] font-medium">
                {card.changeType === "positive" && card.change ? (
                  <>
                    <TrendingUp size={14} className="text-success shrink-0" />
                    <span className="text-success truncate">{card.change} {card.subtitle}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground truncate">{card.subtitle}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp Widget + Gráficos */}
      <div className={`grid grid-cols-1 gap-4 ${isNotebook ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
        {/* WhatsApp Card */}
        <WhatsAppDashboardCard />
        
        {/* Gráfico de Faturamento - OCULTO para notebook */}
        {!isNotebook && (
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
                <LineChart data={data.faturamentoMensal || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: any) => 
                      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
                    }
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Top Serviços */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Top Serviços
            </CardTitle>
            <p className="text-sm text-muted-foreground">Este mês</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.servicosMes || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {(data.servicosMes || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Load Time Info (Debug) */}
      {(dashboardData?.loadTime || loadMetrics) && (
        <div className="text-xs text-muted-foreground text-right space-x-3">
          {loadMetrics && (
            <span className={loadMetrics.mountToReady < 2500 ? "text-success" : "text-destructive"}>
              Total: {loadMetrics.mountToReady.toFixed(0)}ms
              {loadMetrics.mountToReady < 2500 ? " ✓" : " ✗"}
            </span>
          )}
          {dashboardData?.loadTime && (
            <span>API: {dashboardData.loadTime.toFixed(0)}ms</span>
          )}
          {debugActive && (
            <Badge variant="outline" className="ml-2">DEBUG</Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
