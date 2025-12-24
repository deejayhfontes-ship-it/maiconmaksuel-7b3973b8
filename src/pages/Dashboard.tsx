import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Users, Calendar, UserPlus, TrendingUp, TrendingDown } from "lucide-react";
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

// Próximos agendamentos
const upcomingAppointments = [
  { time: "09:00", client: "Maria Silva", professional: "Juliana", service: "Corte Feminino" },
  { time: "09:30", client: "Ana Costa", professional: "Maria", service: "Escova" },
  { time: "10:00", client: "Priscila Lopes", professional: "Daniela", service: "Coloração" },
  { time: "10:30", client: "Carla Mendes", professional: "Juliana", service: "Manicure" },
  { time: "11:00", client: "Fernanda Lima", professional: "Patricia", service: "Pedicure" },
];

const statCards = [
  {
    title: "Faturamento Hoje",
    value: "R$ 1.234,56",
    change: "+12%",
    changeType: "positive",
    subtitle: "vs ontem",
    icon: DollarSign,
    iconColor: "text-success",
    iconBg: "bg-success/10",
  },
  {
    title: "Atendimentos Hoje",
    value: "12",
    change: "+8%",
    changeType: "positive",
    subtitle: "vs ontem",
    icon: Users,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  {
    title: "Agendamentos Hoje",
    value: "8",
    change: "",
    changeType: "neutral",
    subtitle: "confirmados",
    icon: Calendar,
    iconColor: "text-warning",
    iconBg: "bg-warning/10",
  },
  {
    title: "Novos Clientes",
    value: "5",
    change: "",
    changeType: "neutral",
    subtitle: "este mês",
    icon: UserPlus,
    iconColor: "text-pink-500",
    iconBg: "bg-pink-500/10",
  },
];

const barColors = ["hsl(239, 84%, 67%)", "hsl(239, 84%, 72%)", "hsl(239, 84%, 77%)", "hsl(239, 84%, 82%)", "hsl(239, 84%, 87%)"];

const Dashboard = () => {
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
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Próximos Agendamentos
          </CardTitle>
          <p className="text-sm text-muted-foreground">Agendamentos de hoje</p>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Horário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Serviço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingAppointments.map((apt, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{apt.time}</TableCell>
                    <TableCell>{apt.client}</TableCell>
                    <TableCell>{apt.professional}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {apt.service}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum agendamento hoje
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
