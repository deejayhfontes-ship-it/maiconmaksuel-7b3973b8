import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
  UserCheck,
  Cake,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  CalendarIcon,
  ChevronRight,
  Package,
  CreditCard,
  Wallet,
  PieChart,
  Activity,
  Clock,
  Mail,
  MessageSquare,
  Check,
  ArrowUpCircle,
  CheckCircle2,
  Inbox,
  ArrowLeftRight,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Tipos
type ReportCategory = "clientes" | "profissionais" | "cadastros" | "financeiros" | "vendas" | "lucros" | "gaveta_caixa" | "estoque";
type ClientesReport = "novos" | "ativos" | "inativos" | "aniversariantes";
type ProfissionaisReport = "valores_pagar" | "pagamentos_realizados" | "comissoes" | "vales";
type CadastrosReport = "clientes_cadastrados" | "profissionais_cadastrados" | "servicos_cadastrados" | "produtos_cadastrados";
type FinanceirosReport = "dre" | "fluxo_caixa" | "receitas_despesas";
type VendasReport = "periodo" | "profissional" | "servico" | "forma_pgto";
type LucrosReport = "lucros_servicos" | "lucros_produtos";
type GavetaCaixaReport = "movimentacoes" | "sangrias" | "suprimentos";
type EstoqueReport = "posicao_estoque" | "estoque_minimo" | "margem";

type ReportType = ClientesReport | ProfissionaisReport | CadastrosReport | FinanceirosReport | VendasReport | LucrosReport | GavetaCaixaReport | EstoqueReport;

interface DateRange {
  from: Date;
  to: Date;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  color?: string;
  description?: string;
}

const menuItems: Record<ReportCategory, MenuItem[]> = {
  clientes: [
    { id: "novos", label: "Novos Clientes", icon: Users, color: "#007AFF" },
    { id: "ativos", label: "Clientes Ativos", icon: UserCheck, color: "#34C759" },
    { id: "inativos", label: "Clientes Inativos", icon: Users, color: "#FF9500" },
    { id: "aniversariantes", label: "Aniversariantes", icon: Cake, color: "#FF2D55" },
  ],
  profissionais: [
    { id: "valores_pagar", label: "Valores a Pagar", icon: Wallet, color: "#FF3B30" },
    { id: "pagamentos_realizados", label: "Pagamentos Realizados", icon: CheckCircle2, color: "#34C759" },
    { id: "comissoes", label: "Relatório de Comissões", icon: DollarSign, color: "#007AFF" },
    { id: "vales", label: "Relatório de Vales", icon: FileText, color: "#AF52DE" },
  ],
  cadastros: [
    { id: "clientes_cadastrados", label: "Clientes Cadastrados", icon: Users, color: "#007AFF" },
    { id: "profissionais_cadastrados", label: "Profissionais Cadastrados", icon: UserCheck, color: "#34C759" },
    { id: "servicos_cadastrados", label: "Serviços Cadastrados", icon: Activity, color: "#FF9500" },
    { id: "produtos_cadastrados", label: "Produtos Cadastrados", icon: Package, color: "#AF52DE" },
  ],
  financeiros: [
    { id: "dre", label: "DRE - Demonstrativo", icon: BarChart3, color: "#007AFF" },
    { id: "fluxo_caixa", label: "Fluxo de Caixa", icon: ArrowLeftRight, color: "#FF9500" },
    { id: "receitas_despesas", label: "Receitas e Despesas", icon: TrendingUp, color: "#34C759" },
  ],
  vendas: [
    { id: "periodo", label: "Vendas por Período", icon: CalendarIcon, color: "#007AFF" },
    { id: "profissional", label: "Vendas por Profissional", icon: UserCheck, color: "#34C759" },
    { id: "servico", label: "Vendas por Serviço", icon: BarChart3, color: "#FF9500" },
    { id: "forma_pgto", label: "Vendas por Forma de Pagamento", icon: CreditCard, color: "#AF52DE" },
  ],
  lucros: [
    { id: "lucros_servicos", label: "Profissionais que geram mais Lucros (com serviços)", icon: TrendingUp, color: "#34C759" },
    { id: "lucros_produtos", label: "Profissionais que geram mais Lucros (com produtos)", icon: ShoppingBag, color: "#007AFF" },
  ],
  gaveta_caixa: [
    { id: "movimentacoes", label: "Movimentações", icon: Inbox, color: "#AF52DE" },
    { id: "sangrias", label: "Sangrias", icon: TrendingDown, color: "#FF3B30" },
    { id: "suprimentos", label: "Suprimentos", icon: TrendingUp, color: "#34C759" },
  ],
  estoque: [
    { id: "posicao_estoque", label: "Posição de Estoque", icon: Package, color: "#007AFF" },
    { id: "estoque_minimo", label: "Produtos Estoque Mínimo", icon: Package, color: "#FF3B30" },
    { id: "margem", label: "Margem de Lucro", icon: PieChart, color: "#34C759" },
  ],
};

const categoryLabels: Record<ReportCategory, { label: string; icon: any }> = {
  clientes: { label: "De Clientes", icon: Users },
  profissionais: { label: "De Profissionais", icon: UserCheck },
  cadastros: { label: "De Cadastros", icon: FileText },
  financeiros: { label: "Financeiros", icon: DollarSign },
  vendas: { label: "De Vendas", icon: BarChart3 },
  lucros: { label: "De Lucros", icon: TrendingUp },
  gaveta_caixa: { label: "Da Gaveta do Caixa", icon: Inbox },
  estoque: { label: "De Estoque", icon: Package },
};

const periodPresets = [
  { label: "Hoje", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Ontem", getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: "Esta Semana", getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: "Este Mês", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Últimos 30 dias", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Mês Anterior", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
];

// iOS Official Colors
const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#FF2D55', '#5AC8FA', '#30D158'];

const Relatorios = () => {
  const { toast } = useToast();
  const [category, setCategory] = useState<ReportCategory>("clientes");
  const [reportType, setReportType] = useState<ReportType>("novos");
  const [expandedCategories, setExpandedCategories] = useState<ReportCategory[]>(["clientes"]);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [loading, setLoading] = useState(false);

  // Data states
  const [atendimentos, setAtendimentos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [atendimentoServicos, setAtendimentoServicos] = useState<any[]>([]);
  const [atendimentoProdutos, setAtendimentoProdutos] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [comissoesStatus, setComissoesStatus] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(dateRange.from);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);

      const [
        atendimentosRes,
        clientesRes,
        profissionaisRes,
        servicosRes,
        produtosRes,
        atendimentoServicosRes,
        atendimentoProdutosRes,
        pagamentosRes,
      ] = await Promise.all([
        supabase
          .from("atendimentos")
          .select("*, cliente:clientes(nome, celular)")
          .gte("data_hora", startDate.toISOString())
          .lte("data_hora", endDate.toISOString()),
        supabase.from("clientes").select("*"),
        supabase.from("profissionais").select("*").eq("ativo", true),
        supabase.from("servicos").select("*").eq("ativo", true),
        supabase.from("produtos").select("*"),
        supabase
          .from("atendimento_servicos")
          .select("*, profissional:profissionais(nome), servico:servicos(nome)")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("atendimento_produtos")
          .select("*, produto:produtos(nome, preco_custo, preco_venda)")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString()),
        supabase
          .from("pagamentos")
          .select("*")
          .gte("data_hora", startDate.toISOString())
          .lte("data_hora", endDate.toISOString()),
      ]);

      if (atendimentosRes.data) setAtendimentos(atendimentosRes.data);
      if (clientesRes.data) setClientes(clientesRes.data);
      if (profissionaisRes.data) setProfissionais(profissionaisRes.data);
      if (servicosRes.data) setServicos(servicosRes.data);
      if (produtosRes.data) setProdutos(produtosRes.data);
      if (atendimentoServicosRes.data) setAtendimentoServicos(atendimentoServicosRes.data);
      if (atendimentoProdutosRes.data) setAtendimentoProdutos(atendimentoProdutosRes.data);
      if (pagamentosRes.data) setPagamentos(pagamentosRes.data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const toggleCategory = (cat: ReportCategory) => {
    setExpandedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const selectReport = (cat: ReportCategory, type: ReportType) => {
    setCategory(cat);
    setReportType(type);
  };

  const applyPreset = (preset: typeof periodPresets[0]) => {
    setDateRange(preset.getValue());
  };

  // Cálculos para relatórios
  const vendasPorPeriodo = useMemo(() => {
    const finalizados = atendimentos.filter((a) => a.status === "finalizado");
    const totalVendas = finalizados.reduce((sum, a) => sum + (a.valor_final || 0), 0);
    const ticketMedio = finalizados.length > 0 ? totalVendas / finalizados.length : 0;

    // Agrupar por dia
    const porDia: Record<string, { data: string; valor: number; quantidade: number }> = {};
    finalizados.forEach((a) => {
      const dia = format(new Date(a.data_hora), "dd/MM");
      if (!porDia[dia]) {
        porDia[dia] = { data: dia, valor: 0, quantidade: 0 };
      }
      porDia[dia].valor += a.valor_final || 0;
      porDia[dia].quantidade += 1;
    });

    return {
      total: totalVendas,
      ticketMedio,
      quantidade: finalizados.length,
      porDia: Object.values(porDia).sort((a, b) => a.data.localeCompare(b.data)),
    };
  }, [atendimentos]);

  const vendasPorProfissional = useMemo(() => {
    const agrupado: Record<string, { nome: string; valor: number; quantidade: number; comissao: number }> = {};
    
    atendimentoServicos.forEach((as) => {
      const profId = as.profissional_id;
      const profNome = as.profissional?.nome || "Desconhecido";
      if (!agrupado[profId]) {
        agrupado[profId] = { nome: profNome, valor: 0, quantidade: 0, comissao: 0 };
      }
      agrupado[profId].valor += as.subtotal || 0;
      agrupado[profId].quantidade += 1;
      agrupado[profId].comissao += as.comissao_valor || 0;
    });

    return Object.values(agrupado).sort((a, b) => b.valor - a.valor);
  }, [atendimentoServicos]);

  const vendasPorServico = useMemo(() => {
    const agrupado: Record<string, { nome: string; valor: number; quantidade: number }> = {};
    
    atendimentoServicos.forEach((as) => {
      const servNome = as.servico?.nome || "Desconhecido";
      if (!agrupado[servNome]) {
        agrupado[servNome] = { nome: servNome, valor: 0, quantidade: 0 };
      }
      agrupado[servNome].valor += as.subtotal || 0;
      agrupado[servNome].quantidade += as.quantidade || 1;
    });

    return Object.values(agrupado).sort((a, b) => b.valor - a.valor);
  }, [atendimentoServicos]);

  const vendasPorFormaPgto = useMemo(() => {
    const agrupado: Record<string, { forma: string; valor: number; quantidade: number }> = {};
    
    pagamentos.forEach((p) => {
      const forma = p.forma_pagamento || "Não informado";
      if (!agrupado[forma]) {
        agrupado[forma] = { forma, valor: 0, quantidade: 0 };
      }
      agrupado[forma].valor += p.valor || 0;
      agrupado[forma].quantidade += 1;
    });

    return Object.values(agrupado).sort((a, b) => b.valor - a.valor);
  }, [pagamentos]);

  const clientesNovos = useMemo(() => {
    return clientes.filter((c) => {
      const createdAt = new Date(c.created_at);
      return isWithinInterval(createdAt, { start: dateRange.from, end: dateRange.to });
    });
  }, [clientes, dateRange]);

  const clientesAtivos = useMemo(() => {
    const trintaDiasAtras = subDays(new Date(), 30);
    return clientes.filter((c) => {
      if (!c.ultima_visita) return false;
      const ultimaVisita = new Date(c.ultima_visita);
      return ultimaVisita >= trintaDiasAtras;
    });
  }, [clientes]);

  const clientesInativos = useMemo(() => {
    const sessentaDiasAtras = subDays(new Date(), 60);
    return clientes.filter((c) => {
      if (!c.ultima_visita) return true;
      const ultimaVisita = new Date(c.ultima_visita);
      return ultimaVisita < sessentaDiasAtras;
    });
  }, [clientes]);

  const aniversariantes = useMemo(() => {
    const mesAtual = new Date().getMonth();
    return clientes.filter((c) => {
      if (!c.data_nascimento) return false;
      const nascimento = parseISO(c.data_nascimento);
      return nascimento.getMonth() === mesAtual;
    }).sort((a, b) => {
      const diaA = parseISO(a.data_nascimento).getDate();
      const diaB = parseISO(b.data_nascimento).getDate();
      return diaA - diaB;
    });
  }, [clientes]);

  const comissoesPorProfissional = useMemo(() => {
    const agrupado: Record<string, { id: string; nome: string; totalServicos: number; totalComissao: number; atendimentos: number }> = {};
    
    atendimentoServicos.forEach((as) => {
      const profId = as.profissional_id;
      const profNome = as.profissional?.nome || "Desconhecido";
      if (!agrupado[profId]) {
        agrupado[profId] = { id: profId, nome: profNome, totalServicos: 0, totalComissao: 0, atendimentos: 0 };
      }
      agrupado[profId].totalServicos += as.subtotal || 0;
      agrupado[profId].totalComissao += as.comissao_valor || 0;
      agrupado[profId].atendimentos += 1;
    });

    return Object.values(agrupado).sort((a, b) => b.totalComissao - a.totalComissao);
  }, [atendimentoServicos]);

  const produtosMaisVendidos = useMemo(() => {
    const agrupado: Record<string, { nome: string; quantidade: number; valor: number }> = {};
    
    atendimentoProdutos.forEach((ap) => {
      const prodNome = ap.produto?.nome || "Desconhecido";
      if (!agrupado[prodNome]) {
        agrupado[prodNome] = { nome: prodNome, quantidade: 0, valor: 0 };
      }
      agrupado[prodNome].quantidade += ap.quantidade || 1;
      agrupado[prodNome].valor += ap.subtotal || 0;
    });

    return Object.values(agrupado).sort((a, b) => b.quantidade - a.quantidade);
  }, [atendimentoProdutos]);

  const estoqueInfo = useMemo(() => {
    return produtos.map((p) => ({
      id: p.id,
      nome: p.nome,
      estoque_atual: p.estoque_atual,
      estoque_minimo: p.estoque_minimo,
      status: p.estoque_atual <= p.estoque_minimo ? "baixo" : p.estoque_atual <= p.estoque_minimo * 2 ? "atencao" : "ok",
    })).sort((a, b) => a.estoque_atual - b.estoque_atual);
  }, [produtos]);

  const margemProdutos = useMemo(() => {
    return produtos.filter(p => p.preco_custo && p.preco_custo > 0).map((p) => {
      const margem = ((p.preco_venda - p.preco_custo) / p.preco_venda) * 100;
      return {
        nome: p.nome,
        custo: p.preco_custo,
        venda: p.preco_venda,
        margem: margem.toFixed(1),
        lucro: p.preco_venda - p.preco_custo,
      };
    }).sort((a, b) => parseFloat(b.margem) - parseFloat(a.margem));
  }, [produtos]);

  // Exportar para Excel
  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast({ title: "Exportado para Excel!" });
  };

  // Exportar para PDF
  const exportToPDF = (title: string, headers: string[], data: any[][], filename: string) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to, "dd/MM/yyyy")}`, 14, 28);
    
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    doc.save(`${filename}.pdf`);
    toast({ title: "Exportado para PDF!" });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  // Render do conteúdo baseado no relatório selecionado
  const renderReportContent = () => {
    switch (category) {
      case "vendas":
        return renderVendasReport();
      case "clientes":
        return renderClientesReport();
      case "profissionais":
        return renderProfissionaisReport();
      case "estoque":
        return renderEstoqueReport();
      case "financeiros":
        return renderFinanceirosReport();
      case "cadastros":
        return renderCadastrosReport();
      case "lucros":
        return renderLucrosReport();
      case "gaveta_caixa":
        return renderGavetaCaixaReport();
      default:
        return null;
    }
  };

  const renderVendasReport = () => {
    switch (reportType) {
      case "periodo":
        return (
          <div className="space-y-6">
            {/* Cards de resumo */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Vendas</p>
                      <p className="text-2xl font-bold">{formatCurrency(vendasPorPeriodo.total)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-2xl font-bold">{formatCurrency(vendasPorPeriodo.ticketMedio)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Atendimentos</p>
                      <p className="text-2xl font-bold">{vendasPorPeriodo.quantidade}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Serviços Realizados</p>
                      <p className="text-2xl font-bold">{atendimentoServicos.length}</p>
                    </div>
                    <Activity className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico */}
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={vendasPorPeriodo.porDia}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="data" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatCurrency(value), "Valor"]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Line type="monotone" dataKey="valor" stroke="#007AFF" strokeWidth={2} dot={{ fill: "#007AFF" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tabela */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalhamento</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="bg-success hover:bg-success/90"
                    onClick={() => exportToExcel(vendasPorPeriodo.porDia, "vendas-periodo")}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => exportToPDF(
                      "Vendas por Período",
                      ["Data", "Quantidade", "Valor", "Média"],
                      vendasPorPeriodo.porDia.map(d => [d.data, d.quantidade.toString(), formatCurrency(d.valor), formatCurrency(d.valor / d.quantidade)]),
                      "vendas-periodo"
                    )}
                  >
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Média</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasPorPeriodo.porDia.map((item) => (
                      <TableRow key={item.data}>
                        <TableCell>{item.data}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valor)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valor / item.quantidade)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "profissional":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Vendas por Profissional</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vendasPorProfissional}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="nome" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                      <RechartsTooltip 
                        formatter={(value: number) => [formatCurrency(value), "Valor"]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="valor" fill="#007AFF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={vendasPorProfissional}
                        dataKey="valor"
                        nameKey="nome"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ nome, percent }) => `${nome} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {vendasPorProfissional.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalhamento por Profissional</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => exportToExcel(vendasPorProfissional, "vendas-profissional")}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-center">Atendimentos</TableHead>
                      <TableHead className="text-right">Total Vendido</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasPorProfissional.map((item) => (
                      <TableRow key={item.nome}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valor)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.comissao)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "servico":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Serviços Mais Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vendasPorServico.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" tickFormatter={(v) => `R$${v}`} />
                    <YAxis dataKey="nome" type="category" className="text-xs" width={120} />
                    <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} />
                    <Bar dataKey="valor" fill="#34C759" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Todos os Serviços</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(vendasPorServico, "vendas-servico")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasPorServico.map((item) => (
                      <TableRow key={item.nome}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "forma_pgto":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Por Forma de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={vendasPorFormaPgto}
                        dataKey="valor"
                        nameKey="forma"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ forma, percent }) => `${forma} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {vendasPorFormaPgto.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Forma</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendasPorFormaPgto.map((item) => (
                        <TableRow key={item.forma}>
                          <TableCell className="font-medium">{item.forma}</TableCell>
                          <TableCell className="text-center">{item.quantidade}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  const renderClientesReport = () => {
    switch (reportType) {
      case "novos":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Novos no Período</p>
                      <p className="text-2xl font-bold">{clientesNovos.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Clientes</p>
                      <p className="text-2xl font-bold">{clientes.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Crescimento</p>
                      <p className="text-2xl font-bold">{clientes.length > 0 ? ((clientesNovos.length / clientes.length) * 100).toFixed(1) : 0}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Novos Clientes</CardTitle>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => exportToExcel(clientesNovos.map(c => ({ nome: c.nome, celular: c.celular, email: c.email, cadastro: format(new Date(c.created_at), "dd/MM/yyyy") })), "clientes-novos")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesNovos.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.celular}</TableCell>
                        <TableCell>{c.email || "-"}</TableCell>
                        <TableCell>{format(new Date(c.created_at), "dd/MM/yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "ativos":
        return (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes Ativos (últimos 30 dias)</p>
                    <p className="text-2xl font-bold">{clientesAtivos.length}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Lista de Clientes Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Última Visita</TableHead>
                      <TableHead className="text-center">Total Visitas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesAtivos.slice(0, 20).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.celular}</TableCell>
                        <TableCell>{c.ultima_visita ? format(new Date(c.ultima_visita), "dd/MM/yyyy") : "-"}</TableCell>
                        <TableCell className="text-center">{c.total_visitas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "inativos":
        return (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes Inativos (+60 dias)</p>
                    <p className="text-2xl font-bold">{clientesInativos.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Clientes que precisam de atenção</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Última Visita</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesInativos.slice(0, 20).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.celular}</TableCell>
                        <TableCell>{c.ultima_visita ? format(new Date(c.ultima_visita), "dd/MM/yyyy") : "Nunca"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="h-3 w-3 mr-1" /> Contatar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "aniversariantes":
        return (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Aniversariantes do Mês</p>
                    <p className="text-2xl font-bold">{aniversariantes.length}</p>
                  </div>
                  <Cake className="h-8 w-8 text-pink-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Lista de Aniversariantes - {format(new Date(), "MMMM", { locale: ptBR })}</CardTitle>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => exportToExcel(aniversariantes.map(c => ({ nome: c.nome, celular: c.celular, aniversario: format(parseISO(c.data_nascimento), "dd/MM") })), "aniversariantes")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {aniversariantes.map((c) => (
                    <Card key={c.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                          <Cake className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{c.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(c.data_nascimento), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          <Mail className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  const renderProfissionaisReport = () => {
    switch (reportType) {
      case "valores_pagar":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 59, 48, 0.12)' }}>
                      <Wallet className="h-6 w-6" style={{ color: '#FF3B30' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Total a Pagar</p>
                    <p className="text-2xl font-bold" style={{ color: '#FF3B30' }}>{formatCurrency(comissoesPorProfissional.reduce((sum, p) => sum + p.totalComissao, 0))}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 122, 255, 0.12)' }}>
                      <Users className="h-6 w-6" style={{ color: '#007AFF' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Profissionais</p>
                    <p className="text-2xl font-bold" style={{ color: '#007AFF' }}>{comissoesPorProfissional.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 149, 0, 0.12)' }}>
                      <Clock className="h-6 w-6" style={{ color: '#FF9500' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold" style={{ color: '#FF9500' }}>{comissoesPorProfissional.filter(p => !comissoesStatus[p.id]).length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Valores a Pagar por Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-center">Atendimentos</TableHead>
                      <TableHead className="text-right">Valor a Pagar</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comissoesPorProfissional.filter(p => !comissoesStatus[p.id]).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="text-center">{item.atendimentos}</TableCell>
                        <TableCell className="text-right font-semibold" style={{ color: '#FF3B30' }}>{formatCurrency(item.totalComissao)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">Pendente</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "pagamentos_realizados":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)' }}>
                      <CheckCircle2 className="h-6 w-6" style={{ color: '#34C759' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Total Pago</p>
                    <p className="text-2xl font-bold" style={{ color: '#34C759' }}>{formatCurrency(comissoesPorProfissional.filter(p => comissoesStatus[p.id]).reduce((sum, p) => sum + p.totalComissao, 0))}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 122, 255, 0.12)' }}>
                      <Users className="h-6 w-6" style={{ color: '#007AFF' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Profissionais Pagos</p>
                    <p className="text-2xl font-bold" style={{ color: '#007AFF' }}>{comissoesPorProfissional.filter(p => comissoesStatus[p.id]).length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Pagamentos Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                {comissoesPorProfissional.filter(p => comissoesStatus[p.id]).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead className="text-center">Atendimentos</TableHead>
                        <TableHead className="text-right">Valor Pago</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comissoesPorProfissional.filter(p => comissoesStatus[p.id]).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.nome}</TableCell>
                          <TableCell className="text-center">{item.atendimentos}</TableCell>
                          <TableCell className="text-right font-semibold" style={{ color: '#34C759' }}>{formatCurrency(item.totalComissao)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default">Pago</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pagamento realizado no período</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "comissoes":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total em Comissões</p>
                      <p className="text-2xl font-bold">{formatCurrency(comissoesPorProfissional.reduce((sum, p) => sum + p.totalComissao, 0))}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Profissionais</p>
                      <p className="text-2xl font-bold">{comissoesPorProfissional.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Média por Profissional</p>
                      <p className="text-2xl font-bold">{formatCurrency(comissoesPorProfissional.length > 0 ? comissoesPorProfissional.reduce((sum, p) => sum + p.totalComissao, 0) / comissoesPorProfissional.length : 0)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Comissões por Profissional</CardTitle>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => exportToExcel(comissoesPorProfissional.map(p => ({ profissional: p.nome, atendimentos: p.atendimentos, faturamento: p.totalServicos, comissao: p.totalComissao })), "comissoes")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-center">Atendimentos</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comissoesPorProfissional.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="text-center">{item.atendimentos}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalServicos)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(item.totalComissao)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={comissoesStatus[item.id] ? "default" : "secondary"}>
                            {comissoesStatus[item.id] ? "Pago" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant={comissoesStatus[item.id] ? "outline" : "default"}
                            onClick={() => setComissoesStatus(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {comissoesStatus[item.id] ? "Desfazer" : "Marcar Pago"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "vales":
        return (
          <div className="space-y-6">
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Relatório de Vales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum vale registrado no período</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  const renderEstoqueReport = () => {
    switch (reportType) {
      case "posicao_estoque":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                {produtosMaisVendidos.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={produtosMaisVendidos.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="nome" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartsTooltip />
                      <Bar dataKey="quantidade" fill="#FF9500" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhuma venda de produto no período</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Lista de Produtos Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosMaisVendidos.map((item) => (
                      <TableRow key={item.nome}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "estoque_minimo":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                      <p className="text-2xl font-bold text-red-600">{estoqueInfo.filter(e => e.status === "baixo").length}</p>
                    </div>
                    <Package className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Atenção</p>
                      <p className="text-2xl font-bold text-amber-600">{estoqueInfo.filter(e => e.status === "atencao").length}</p>
                    </div>
                    <Package className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">OK</p>
                      <p className="text-2xl font-bold text-green-600">{estoqueInfo.filter(e => e.status === "ok").length}</p>
                    </div>
                    <Package className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Situação do Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Estoque Atual</TableHead>
                      <TableHead className="text-center">Estoque Mínimo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estoqueInfo.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="text-center">{item.estoque_atual}</TableCell>
                        <TableCell className="text-center">{item.estoque_minimo}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.status === "ok" ? "default" : item.status === "atencao" ? "secondary" : "destructive"}>
                            {item.status === "ok" ? "OK" : item.status === "atencao" ? "Atenção" : "Baixo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "margem":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Margem de Lucro por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Venda</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {margemProdutos.map((item) => (
                      <TableRow key={item.nome}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.custo)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.venda)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(item.lucro)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={parseFloat(item.margem) >= 50 ? "default" : parseFloat(item.margem) >= 30 ? "secondary" : "destructive"}>
                            {item.margem}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  const renderFinanceirosReport = () => {
    const totalReceitas = vendasPorPeriodo.total;
    const totalComissoes = comissoesPorProfissional.reduce((sum, p) => sum + p.totalComissao, 0);
    const lucro = totalReceitas - totalComissoes;

    switch (reportType) {
      case "dre":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>DRE - Demonstrativo de Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="font-semibold text-lg">Receita Bruta</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(totalReceitas)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 pl-4">
                    <span className="text-muted-foreground">(-) Comissões</span>
                    <span className="text-red-600">{formatCurrency(totalComissoes)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-t border-b bg-muted/30 px-3 rounded">
                    <span className="font-semibold text-lg">Resultado Operacional</span>
                    <span className={cn("text-lg font-bold", lucro >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(lucro)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "fluxo_caixa":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)' }}>
                      <TrendingUp className="h-6 w-6" style={{ color: '#34C759' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Entradas</p>
                    <p className="text-2xl font-bold" style={{ color: '#34C759' }}>{formatCurrency(totalReceitas)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 59, 48, 0.12)' }}>
                      <TrendingDown className="h-6 w-6" style={{ color: '#FF3B30' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Saídas</p>
                    <p className="text-2xl font-bold" style={{ color: '#FF3B30' }}>{formatCurrency(totalComissoes)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 149, 0, 0.12)' }}>
                      <ArrowLeftRight className="h-6 w-6" style={{ color: '#FF9500' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Saldo</p>
                    <p className="text-2xl font-bold" style={{ color: '#FF9500' }}>{formatCurrency(lucro)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Fluxo de Caixa por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={vendasPorPeriodo.porDia}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="data" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} />
                    <Line type="monotone" dataKey="valor" stroke="#FF9500" strokeWidth={2} dot={{ fill: "#FF9500" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      case "receitas_despesas":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="font-semibold text-lg">Receita Bruta</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(totalReceitas)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 pl-4">
                    <span className="text-muted-foreground">(-) Comissões</span>
                    <span className="text-red-600">{formatCurrency(totalComissoes)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-t border-b bg-muted/30 px-3 rounded">
                    <span className="font-semibold text-lg">Resultado Operacional</span>
                    <span className={cn("text-lg font-bold", lucro >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(lucro)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="hover:scale-[1.02] transition-transform cursor-pointer" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)' }}>
                      <TrendingUp className="h-6 w-6" style={{ color: '#34C759' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                    <p className="text-2xl font-bold" style={{ color: '#34C759' }}>{formatCurrency(totalReceitas)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:scale-[1.02] transition-transform cursor-pointer" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 59, 48, 0.12)' }}>
                      <TrendingDown className="h-6 w-6" style={{ color: '#FF3B30' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Despesas (Comissões)</p>
                    <p className="text-2xl font-bold" style={{ color: '#FF3B30' }}>{formatCurrency(totalComissoes)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:scale-[1.02] transition-transform cursor-pointer" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 122, 255, 0.12)' }}>
                      <DollarSign className="h-6 w-6" style={{ color: '#007AFF' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                    <p className={cn("text-2xl font-bold")} style={{ color: lucro >= 0 ? '#34C759' : '#FF3B30' }}>{formatCurrency(lucro)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

    }
  };

  const renderCadastrosReport = () => {
    switch (reportType) {
      case "clientes_cadastrados":
        return (
          <div className="space-y-6">
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Clientes Cadastrados</CardTitle>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => exportToExcel(clientes.map(c => ({ nome: c.nome, celular: c.celular, email: c.email || '', cadastro: format(new Date(c.created_at), "dd/MM/yyyy") })), "clientes-cadastrados")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cadastro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.slice(0, 50).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.celular}</TableCell>
                        <TableCell>{c.email || "-"}</TableCell>
                        <TableCell>{format(new Date(c.created_at), "dd/MM/yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "profissionais_cadastrados":
        return (
          <div className="space-y-6">
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Profissionais Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead className="text-center">Comissão</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profissionais.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell>{p.especialidade || "-"}</TableCell>
                        <TableCell className="text-center">{p.comissao_padrao}%</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "servicos_cadastrados":
        return (
          <div className="space-y-6">
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Serviços Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Duração</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicos.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.nome}</TableCell>
                        <TableCell>{s.categoria || "-"}</TableCell>
                        <TableCell className="text-center">{s.duracao_minutos} min</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.preco)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "produtos_cadastrados":
        return (
          <div className="space-y-6">
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Produtos Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Estoque</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell>{p.categoria || "-"}</TableCell>
                        <TableCell className="text-center">{p.estoque_atual}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.preco_venda)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  const renderLucrosReport = () => {
    switch (reportType) {
      case "lucros_servicos":
        return (
          <div className="space-y-6">
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Profissionais que Geram Mais Lucros (Serviços)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comissoesPorProfissional}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="nome" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Faturamento"]} />
                    <Bar dataKey="totalServicos" fill="#34C759" radius={[4, 4, 0, 0]} name="Faturamento" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Ranking de Lucro por Serviços</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posição</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-center">Atendimentos</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Lucro (- Comissão)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comissoesPorProfissional.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant={idx === 0 ? "default" : "secondary"}>#{idx + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="text-center">{item.atendimentos}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalServicos)}</TableCell>
                        <TableCell className="text-right" style={{ color: '#34C759' }}>{formatCurrency(item.totalServicos - item.totalComissao)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "lucros_produtos":
        return (
          <div className="space-y-6">
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Produtos Mais Lucrativos</CardTitle>
              </CardHeader>
              <CardContent>
                {margemProdutos.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={margemProdutos.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="nome" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                      <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Lucro"]} />
                      <Bar dataKey="lucro" fill="#007AFF" radius={[4, 4, 0, 0]} name="Lucro" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum produto com margem cadastrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  const renderGavetaCaixaReport = () => {
    switch (reportType) {
      case "movimentacoes":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(175, 82, 222, 0.12)' }}>
                      <Inbox className="h-6 w-6" style={{ color: '#AF52DE' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Saldo Atual</p>
                    <p className="text-2xl font-bold" style={{ color: '#AF52DE' }}>R$ 0,00</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)' }}>
                      <TrendingUp className="h-6 w-6" style={{ color: '#34C759' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Entradas</p>
                    <p className="text-2xl font-bold" style={{ color: '#34C759' }}>R$ 0,00</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 59, 48, 0.12)' }}>
                      <TrendingDown className="h-6 w-6" style={{ color: '#FF3B30' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Saídas</p>
                    <p className="text-2xl font-bold" style={{ color: '#FF3B30' }}>R$ 0,00</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:scale-[1.02] transition-transform" style={{ borderRadius: '16px' }}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 122, 255, 0.12)' }}>
                      <CreditCard className="h-6 w-6" style={{ color: '#007AFF' }} />
                    </div>
                    <p className="text-sm text-muted-foreground">Sangrias</p>
                    <p className="text-2xl font-bold" style={{ color: '#007AFF' }}>R$ 0,00</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Movimentações do Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma movimentação registrada</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "sangrias":
        return (
          <div className="space-y-6">
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Sangrias do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma sangria registrada no período</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "suprimentos":
        return (
          <div className="space-y-6">
            <Card style={{ borderRadius: '16px' }}>
              <CardHeader>
                <CardTitle>Suprimentos do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum suprimento registrado no período</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-6rem)]">
      {/* Sidebar de categorias - Mobile: horizontal scroll, Desktop: sidebar */}
      <div className="lg:w-64 lg:flex-shrink-0">
        <Card className="lg:h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {/* Mobile: horizontal scroll */}
            <div className="lg:hidden">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {(Object.keys(menuItems) as ReportCategory[]).map((cat) => (
                    <Select
                      key={cat}
                      value={category === cat ? reportType : ""}
                      onValueChange={(value) => selectReport(cat, value as ReportType)}
                    >
                      <SelectTrigger className="w-[140px] flex-shrink-0">
                        <SelectValue placeholder={categoryLabels[cat].label} />
                      </SelectTrigger>
                      <SelectContent>
                        {menuItems[cat].map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Desktop: sidebar menu */}
            <div className="hidden lg:block">
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="space-y-1">
                  {(Object.keys(menuItems) as ReportCategory[]).map((cat) => (
                    <div key={cat}>
                      <button
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          expandedCategories.includes(cat) ? "bg-muted" : "hover:bg-muted/50"
                        )}
                        onClick={() => toggleCategory(cat)}
                      >
                        <span>{categoryLabels[cat].label}</span>
                        <ChevronRight className={cn("h-4 w-4 transition-transform", expandedCategories.includes(cat) && "rotate-90")} />
                      </button>
                      {expandedCategories.includes(cat) && (
                        <div className="ml-2 mt-1 space-y-1">
                          {menuItems[cat].map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.id}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                                  category === cat && reportType === item.id
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                                )}
                                onClick={() => selectReport(cat, item.id as ReportType)}
                              >
                                <Icon className="h-4 w-4" />
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Filtros globais */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mobile: apenas alguns presets */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              {periodPresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {/* Mobile: select para presets */}
            <div className="sm:hidden">
              <Select onValueChange={(value) => {
                const preset = periodPresets.find(p => p.label === value);
                if (preset) applyPreset(preset);
              }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {periodPresets.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                  </span>
                  <span className="sm:hidden">
                    {format(dateRange.from, "dd/MM")} - {format(dateRange.to, "dd/MM")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={ptBR}
                  numberOfMonths={1}
                  className="max-w-[280px] sm:max-w-none"
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={fetchData} disabled={loading} size="sm">
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>

        {/* Área de conteúdo do relatório */}
        <ScrollArea className="flex-1">
          <div className="pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              renderReportContent()
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Relatorios;
