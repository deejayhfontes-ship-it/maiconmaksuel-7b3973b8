import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
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
  Archive,
  ArrowUpCircle,
  CheckCircle,
  Trophy,
  ShoppingCart,
  FileDown,
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
type ReportCategory = "vendas" | "clientes" | "profissionais" | "produtos" | "financeiro" | "lucros" | "caixa" | "consolidado";
type VendasReport = "periodo" | "profissional" | "servico" | "forma_pgto" | "historico" | "itens_vendidos" | "clientes_ausentes" | "servicos_lucrativos" | "produtos_lucrativos" | "clientes_lucro";
type ClientesReport = "novos" | "ativos" | "inativos" | "aniversariantes";
type ProfissionaisReport = "performance" | "comissoes" | "atendimentos" | "top_lucro_servicos" | "top_lucro_produtos" | "vales_adiantamentos" | "valores_pagar" | "pagamentos_realizados";
type ProdutosReport = "mais_vendidos" | "estoque" | "margem";
type FinanceiroReport = "dre" | "fluxo" | "contas_pagar" | "contas_receber" | "extrato_cartoes";
type LucrosReport = "lucro_bruto" | "grafico_lucro";
type CaixaReport = "caixas_fechados" | "sangrias" | "reforcos";
type ConsolidadoReport = "completo";

type ReportType = VendasReport | ClientesReport | ProfissionaisReport | ProdutosReport | FinanceiroReport | LucrosReport | CaixaReport | ConsolidadoReport;

interface DateRange {
  from: Date;
  to: Date;
}

const menuItems = {
  vendas: [
    { id: "periodo", label: "Por Período", icon: CalendarIcon },
    { id: "profissional", label: "Por Profissional", icon: UserCheck },
    { id: "servico", label: "Por Serviço", icon: BarChart3 },
    { id: "forma_pgto", label: "Por Forma de Pagamento", icon: CreditCard },
    { id: "historico", label: "Histórico de Vendas", icon: FileText },
    { id: "itens_vendidos", label: "Itens Vendidos", icon: ShoppingBag },
    { id: "clientes_ausentes", label: "Clientes Ausentes", icon: Users },
    { id: "servicos_lucrativos", label: "Serviços Mais Lucrativos", icon: TrendingUp },
    { id: "produtos_lucrativos", label: "Produtos Mais Lucrativos", icon: TrendingUp },
    { id: "clientes_lucro", label: "Clientes que Dão Mais Lucro", icon: DollarSign },
  ],
  clientes: [
    { id: "novos", label: "Novos Clientes", icon: Users },
    { id: "ativos", label: "Clientes Ativos", icon: UserCheck },
    { id: "inativos", label: "Clientes Inativos", icon: Users },
    { id: "aniversariantes", label: "Aniversariantes", icon: Cake },
  ],
  profissionais: [
    { id: "performance", label: "Performance", icon: TrendingUp },
    { id: "comissoes", label: "Comissões", icon: DollarSign },
    { id: "atendimentos", label: "Atendimentos", icon: Activity },
    { id: "top_lucro_servicos", label: "Top Lucro - Serviços", icon: Trophy },
    { id: "top_lucro_produtos", label: "Top Lucro - Produtos", icon: ShoppingCart },
    { id: "vales_adiantamentos", label: "Vales e Adiantamentos", icon: FileText },
    { id: "valores_pagar", label: "Valores a Pagar", icon: Wallet },
    { id: "pagamentos_realizados", label: "Pagamentos Realizados", icon: Check },
  ],
  produtos: [
    { id: "mais_vendidos", label: "Mais Vendidos", icon: ShoppingBag },
    { id: "estoque", label: "Estoque", icon: Package },
    { id: "margem", label: "Margem de Lucro", icon: PieChart },
  ],
  financeiro: [
    { id: "dre", label: "DRE", icon: FileText },
    { id: "fluxo", label: "Fluxo de Caixa", icon: Wallet },
    { id: "contas_pagar", label: "Contas a Pagar", icon: TrendingDown },
    { id: "contas_receber", label: "Contas a Receber", icon: TrendingUp },
    { id: "extrato_cartoes", label: "Extrato de Cartões", icon: CreditCard },
  ],
  lucros: [
    { id: "lucro_bruto", label: "Lucro Bruto", icon: DollarSign },
    { id: "grafico_lucro", label: "Gráfico de Lucro", icon: BarChart3 },
  ],
  caixa: [
    { id: "caixas_fechados", label: "Caixas Fechados", icon: Wallet },
    { id: "sangrias", label: "Relatório de Sangrias", icon: TrendingDown },
    { id: "reforcos", label: "Relatório de Reforços", icon: TrendingUp },
  ],
  consolidado: [
    { id: "completo", label: "Relatório Completo", icon: FileDown },
  ],
};

const categoryLabels: Record<ReportCategory, string> = {
  vendas: "De Vendas",
  clientes: "De Clientes",
  profissionais: "De Profissionais",
  produtos: "De Estoque",
  financeiro: "Financeiros",
  lucros: "De Lucros",
  caixa: "Da Gaveta do Caixa",
  consolidado: "Consolidados",
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [category, setCategory] = useState<ReportCategory>("vendas");
  const [reportType, setReportType] = useState<ReportType>("periodo");
  const [expandedCategories, setExpandedCategories] = useState<ReportCategory[]>(["vendas"]);
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
  const [caixas, setCaixas] = useState<any[]>([]);
  const [movimentacoesCaixa, setMovimentacoesCaixa] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [vales, setVales] = useState<any[]>([]);
  const [diasAusencia, setDiasAusencia] = useState(30);

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
        caixasRes,
        movimentacoesRes,
        contasPagarRes,
        contasReceberRes,
        valesRes,
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
        supabase
          .from("caixa")
          .select("*")
          .gte("data_abertura", startDate.toISOString())
          .lte("data_abertura", endDate.toISOString()),
        supabase
          .from("caixa_movimentacoes")
          .select("*, caixa:caixa(data_abertura)")
          .gte("data_hora", startDate.toISOString())
          .lte("data_hora", endDate.toISOString()),
        supabase
          .from("contas_pagar")
          .select("*")
          .gte("data_vencimento", startDate.toISOString())
          .lte("data_vencimento", endDate.toISOString()),
        supabase
          .from("contas_receber")
          .select("*, cliente:clientes(nome)")
          .gte("data_vencimento", startDate.toISOString())
          .lte("data_vencimento", endDate.toISOString()),
        supabase
          .from("vales")
          .select("*, profissional:profissionais(nome, foto_url, cor_agenda)")
          .gte("data_lancamento", format(startDate, "yyyy-MM-dd"))
          .lte("data_lancamento", format(endDate, "yyyy-MM-dd")),
      ]);

      if (atendimentosRes.data) setAtendimentos(atendimentosRes.data);
      if (clientesRes.data) setClientes(clientesRes.data);
      if (profissionaisRes.data) setProfissionais(profissionaisRes.data);
      if (servicosRes.data) setServicos(servicosRes.data);
      if (produtosRes.data) setProdutos(produtosRes.data);
      if (atendimentoServicosRes.data) setAtendimentoServicos(atendimentoServicosRes.data);
      if (atendimentoProdutosRes.data) setAtendimentoProdutos(atendimentoProdutosRes.data);
      if (pagamentosRes.data) setPagamentos(pagamentosRes.data);
      if (caixasRes.data) setCaixas(caixasRes.data);
      if (movimentacoesRes.data) setMovimentacoesCaixa(movimentacoesRes.data);
      if (contasPagarRes.data) setContasPagar(contasPagarRes.data);
      if (contasReceberRes.data) setContasReceber(contasReceberRes.data);
      if (valesRes.data) setVales(valesRes.data);
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
    // Se for relatório completo, navegar para a página dedicada
    if (cat === 'consolidado' && type === 'completo') {
      navigate('/relatorios/completo');
      return;
    }
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

  // Cálculo de Lucro Bruto
  const lucroBruto = useMemo(() => {
    const finalizados = atendimentos.filter((a) => a.status === "finalizado");
    const receitaServicos = atendimentoServicos.reduce((sum, as) => sum + (as.subtotal || 0), 0);
    const receitaProdutos = atendimentoProdutos.reduce((sum, ap) => sum + (ap.subtotal || 0), 0);
    const custoProdutos = atendimentoProdutos.reduce((sum, ap) => {
      const custo = ap.produto?.preco_custo || 0;
      return sum + (custo * (ap.quantidade || 1));
    }, 0);
    const comissoes = atendimentoServicos.reduce((sum, as) => sum + (as.comissao_valor || 0), 0);
    
    const receitaTotal = receitaServicos + receitaProdutos;
    const custoTotal = custoProdutos + comissoes;
    const lucro = receitaTotal - custoTotal;
    const margemLucro = receitaTotal > 0 ? (lucro / receitaTotal) * 100 : 0;

    const porDia: Record<string, { data: string; receita: number; custo: number; lucro: number }> = {};
    finalizados.forEach((a) => {
      const dia = format(new Date(a.data_hora), "dd/MM");
      if (!porDia[dia]) {
        porDia[dia] = { data: dia, receita: 0, custo: 0, lucro: 0 };
      }
      porDia[dia].receita += a.valor_final || 0;
    });

    return {
      receitaServicos,
      receitaProdutos,
      receitaTotal,
      custoProdutos,
      comissoes,
      custoTotal,
      lucro,
      margemLucro,
      porDia: Object.values(porDia).sort((a, b) => a.data.localeCompare(b.data)),
    };
  }, [atendimentos, atendimentoServicos, atendimentoProdutos]);

  // Clientes ausentes há X dias
  const clientesAusentes = useMemo(() => {
    const dataLimite = subDays(new Date(), diasAusencia);
    return clientes.filter((c) => {
      if (!c.ultima_visita) return c.total_visitas > 0;
      const ultimaVisita = new Date(c.ultima_visita);
      return ultimaVisita < dataLimite && c.total_visitas > 0;
    }).sort((a, b) => {
      const dataA = a.ultima_visita ? new Date(a.ultima_visita).getTime() : 0;
      const dataB = b.ultima_visita ? new Date(b.ultima_visita).getTime() : 0;
      return dataA - dataB;
    });
  }, [clientes, diasAusencia]);

  // Clientes que dão mais lucro
  const clientesMaisLucro = useMemo(() => {
    const agrupado: Record<string, { id: string; nome: string; celular: string; totalGasto: number; visitas: number }> = {};
    
    atendimentos.filter(a => a.status === "finalizado" && a.cliente_id).forEach((a) => {
      const clienteId = a.cliente_id;
      const cliente = clientes.find(c => c.id === clienteId);
      if (!agrupado[clienteId]) {
        agrupado[clienteId] = { 
          id: clienteId, 
          nome: cliente?.nome || a.cliente?.nome || "Desconhecido",
          celular: cliente?.celular || a.cliente?.celular || "",
          totalGasto: 0, 
          visitas: 0 
        };
      }
      agrupado[clienteId].totalGasto += a.valor_final || 0;
      agrupado[clienteId].visitas += 1;
    });

    return Object.values(agrupado).sort((a, b) => b.totalGasto - a.totalGasto).slice(0, 50);
  }, [atendimentos, clientes]);

  // Serviços mais lucrativos
  const servicosMaisLucrativos = useMemo(() => {
    const agrupado: Record<string, { nome: string; quantidade: number; receita: number; comissao: number; lucro: number }> = {};
    
    atendimentoServicos.forEach((as) => {
      const servNome = as.servico?.nome || "Desconhecido";
      if (!agrupado[servNome]) {
        agrupado[servNome] = { nome: servNome, quantidade: 0, receita: 0, comissao: 0, lucro: 0 };
      }
      agrupado[servNome].quantidade += as.quantidade || 1;
      agrupado[servNome].receita += as.subtotal || 0;
      agrupado[servNome].comissao += as.comissao_valor || 0;
      agrupado[servNome].lucro = agrupado[servNome].receita - agrupado[servNome].comissao;
    });

    return Object.values(agrupado).sort((a, b) => b.lucro - a.lucro);
  }, [atendimentoServicos]);

  // Produtos mais lucrativos
  const produtosMaisLucrativos = useMemo(() => {
    const agrupado: Record<string, { nome: string; quantidade: number; receita: number; custo: number; lucro: number; margem: number }> = {};
    
    atendimentoProdutos.forEach((ap) => {
      const prodNome = ap.produto?.nome || "Desconhecido";
      const custo = ap.produto?.preco_custo || 0;
      const quantidade = ap.quantidade || 1;
      if (!agrupado[prodNome]) {
        agrupado[prodNome] = { nome: prodNome, quantidade: 0, receita: 0, custo: 0, lucro: 0, margem: 0 };
      }
      agrupado[prodNome].quantidade += quantidade;
      agrupado[prodNome].receita += ap.subtotal || 0;
      agrupado[prodNome].custo += custo * quantidade;
      agrupado[prodNome].lucro = agrupado[prodNome].receita - agrupado[prodNome].custo;
      agrupado[prodNome].margem = agrupado[prodNome].receita > 0 ? (agrupado[prodNome].lucro / agrupado[prodNome].receita) * 100 : 0;
    });

    return Object.values(agrupado).sort((a, b) => b.lucro - a.lucro);
  }, [atendimentoProdutos]);

  // Caixas fechados
  const caixasFechados = useMemo(() => {
    return caixas.filter(c => c.status === "fechado").map(c => ({
      ...c,
      dataAbertura: format(new Date(c.data_abertura), "dd/MM/yyyy HH:mm"),
      dataFechamento: c.data_fechamento ? format(new Date(c.data_fechamento), "dd/MM/yyyy HH:mm") : "-",
    }));
  }, [caixas]);

  // Sangrias e reforços
  const sangrias = useMemo(() => {
    return movimentacoesCaixa.filter(m => m.tipo === "saida" && m.categoria === "sangria");
  }, [movimentacoesCaixa]);

  const reforcos = useMemo(() => {
    return movimentacoesCaixa.filter(m => m.tipo === "entrada" && m.categoria === "reforco");
  }, [movimentacoesCaixa]);

  // Valores a pagar profissionais
  const valoresAPagar = useMemo(() => {
    return comissoesPorProfissional.map(p => ({
      ...p,
      pago: comissoesStatus[p.id] || false,
    }));
  }, [comissoesPorProfissional, comissoesStatus]);

  // Vales e adiantamentos
  const valesRelatorio = useMemo(() => {
    const totalAbertos = vales.filter(v => v.status === "aberto").reduce((sum, v) => sum + Number(v.saldo_restante || 0), 0);
    const totalQuitados = vales.filter(v => v.status === "quitado").reduce((sum, v) => sum + Number(v.valor_total || 0), 0);
    const qtdAbertos = vales.filter(v => v.status === "aberto").length;
    const qtdQuitados = vales.filter(v => v.status === "quitado").length;
    
    // Agrupar por profissional
    const porProfissional: Record<string, { nome: string; foto_url: string | null; cor_agenda: string; total: number; abertos: number; quitados: number; saldo: number }> = {};
    
    vales.forEach(v => {
      const profId = v.profissional_id;
      const profNome = v.profissional?.nome || "Desconhecido";
      if (!porProfissional[profId]) {
        porProfissional[profId] = {
          nome: profNome,
          foto_url: v.profissional?.foto_url || null,
          cor_agenda: v.profissional?.cor_agenda || "#007AFF",
          total: 0,
          abertos: 0,
          quitados: 0,
          saldo: 0,
        };
      }
      porProfissional[profId].total += 1;
      if (v.status === "aberto") {
        porProfissional[profId].abertos += 1;
        porProfissional[profId].saldo += Number(v.saldo_restante || 0);
      } else {
        porProfissional[profId].quitados += 1;
      }
    });

    return {
      totalAbertos,
      totalQuitados,
      qtdAbertos,
      qtdQuitados,
      totalGeral: vales.reduce((sum, v) => sum + Number(v.valor_total || 0), 0),
      porProfissional: Object.entries(porProfissional).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.saldo - a.saldo),
      lista: vales.sort((a, b) => new Date(b.data_lancamento).getTime() - new Date(a.data_lancamento).getTime()),
    };
  }, [vales]);

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
      case "produtos":
        return renderProdutosReport();
      case "financeiro":
        return renderFinanceiroReport();
      case "lucros":
        return renderLucrosReport();
      case "caixa":
        return renderCaixaReport();
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

      case "historico":
        const historicoVendas = atendimentos.filter(a => a.status === "finalizado").sort((a, b) => 
          new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
        );
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Vendas</p>
                      <p className="text-2xl font-bold">{historicoVendas.length}</p>
                    </div>
                    <ShoppingBag className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(historicoVendas.reduce((sum, v) => sum + (v.valor_final || 0), 0))}</p>
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
                      <p className="text-2xl font-bold">{formatCurrency(historicoVendas.length > 0 ? historicoVendas.reduce((sum, v) => sum + (v.valor_final || 0), 0) / historicoVendas.length : 0)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Histórico de Vendas</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(historicoVendas.map(v => ({
                  data: format(new Date(v.data_hora), "dd/MM/yyyy HH:mm"),
                  comanda: v.numero_comanda,
                  cliente: v.cliente?.nome || "Cliente avulso",
                  valor: v.valor_final,
                  status: v.status
                })), "historico-vendas")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Comanda</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicoVendas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma venda encontrada no período selecionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      historicoVendas.slice(0, 50).map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{format(new Date(v.data_hora), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>#{v.numero_comanda}</TableCell>
                          <TableCell>{v.cliente?.nome || "Cliente avulso"}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(v.valor_final || 0)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Finalizado
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "itens_vendidos":
        const todosItens = [
          ...atendimentoServicos.map(as => ({
            tipo: "Serviço",
            nome: as.servico?.nome || "Desconhecido",
            quantidade: as.quantidade || 1,
            valor: as.subtotal || 0,
            data: as.created_at
          })),
          ...atendimentoProdutos.map(ap => ({
            tipo: "Produto",
            nome: ap.produto?.nome || "Desconhecido",
            quantidade: ap.quantidade || 1,
            valor: ap.subtotal || 0,
            data: ap.created_at
          }))
        ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

        const totalServicos = atendimentoServicos.reduce((sum, as) => sum + (as.subtotal || 0), 0);
        const totalProdutosVal = atendimentoProdutos.reduce((sum, ap) => sum + (ap.subtotal || 0), 0);

        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Itens</p>
                      <p className="text-2xl font-bold">{todosItens.length}</p>
                    </div>
                    <ShoppingBag className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Serviços</p>
                      <p className="text-2xl font-bold">{atendimentoServicos.length}</p>
                    </div>
                    <Activity className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Produtos</p>
                      <p className="text-2xl font-bold">{atendimentoProdutos.length}</p>
                    </div>
                    <Package className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Vendido</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalServicos + totalProdutosVal)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Itens Vendidos</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(todosItens.map(i => ({
                  tipo: i.tipo,
                  nome: i.nome,
                  quantidade: i.quantidade,
                  valor: i.valor,
                  data: format(new Date(i.data), "dd/MM/yyyy")
                })), "itens-vendidos")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todosItens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum item vendido no período selecionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      todosItens.slice(0, 100).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="outline" className={item.tipo === "Serviço" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                              {item.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{item.nome}</TableCell>
                          <TableCell className="text-center">{item.quantidade}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valor)}</TableCell>
                          <TableCell>{format(new Date(item.data), "dd/MM/yyyy")}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "clientes_ausentes":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Label>Clientes ausentes há mais de:</Label>
              <Select value={diasAusencia.toString()} onValueChange={(v) => setDiasAusencia(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="180">180 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes Ausentes há +{diasAusencia} dias</p>
                    <p className="text-2xl font-bold">{clientesAusentes.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Lista de Clientes Ausentes</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(clientesAusentes.map(c => ({
                  nome: c.nome,
                  celular: c.celular,
                  email: c.email || "",
                  ultima_visita: c.ultima_visita ? format(new Date(c.ultima_visita), "dd/MM/yyyy") : "Nunca",
                  total_visitas: c.total_visitas
                })), "clientes-ausentes")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Última Visita</TableHead>
                      <TableHead className="text-center">Visitas</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesAusentes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum cliente ausente há mais de {diasAusencia} dias
                        </TableCell>
                      </TableRow>
                    ) : (
                      clientesAusentes.slice(0, 50).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.nome}</TableCell>
                          <TableCell>{c.celular}</TableCell>
                          <TableCell>{c.ultima_visita ? format(new Date(c.ultima_visita), "dd/MM/yyyy") : "Nunca"}</TableCell>
                          <TableCell className="text-center">{c.total_visitas}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <MessageSquare className="h-3 w-3 mr-1" /> Contatar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "servicos_lucrativos":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Serviços</p>
                      <p className="text-2xl font-bold">{servicosMaisLucrativos.length}</p>
                    </div>
                    <Activity className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Receita Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(servicosMaisLucrativos.reduce((sum, s) => sum + s.receita, 0))}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Lucro Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(servicosMaisLucrativos.reduce((sum, s) => sum + s.lucro, 0))}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Serviços Mais Lucrativos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={servicosMaisLucrativos.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                    <YAxis dataKey="nome" type="category" width={120} className="text-xs" />
                    <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Lucro"]} />
                    <Bar dataKey="lucro" fill="#34C759" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalhamento</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(servicosMaisLucrativos, "servicos-lucrativos")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicosMaisLucrativos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum serviço realizado no período selecionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      servicosMaisLucrativos.map((s) => (
                        <TableRow key={s.nome}>
                          <TableCell className="font-medium">{s.nome}</TableCell>
                          <TableCell className="text-center">{s.quantidade}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.receita)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(s.comissao)}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">{formatCurrency(s.lucro)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "produtos_lucrativos":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Produtos Vendidos</p>
                      <p className="text-2xl font-bold">{produtosMaisLucrativos.length}</p>
                    </div>
                    <Package className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Receita Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(produtosMaisLucrativos.reduce((sum, p) => sum + p.receita, 0))}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Lucro Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(produtosMaisLucrativos.reduce((sum, p) => sum + p.lucro, 0))}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Lucrativos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={produtosMaisLucrativos.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                    <YAxis dataKey="nome" type="category" width={120} className="text-xs" />
                    <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Lucro"]} />
                    <Bar dataKey="lucro" fill="#FF9500" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalhamento</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(produtosMaisLucrativos, "produtos-lucrativos")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosMaisLucrativos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum produto vendido no período selecionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      produtosMaisLucrativos.map((p) => (
                        <TableRow key={p.nome}>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell className="text-center">{p.quantidade}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.receita)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(p.custo)}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">{formatCurrency(p.lucro)}</TableCell>
                          <TableCell className="text-right">{p.margem.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "clientes_lucro":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Clientes Analisados</p>
                      <p className="text-2xl font-bold">{clientesMaisLucro.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Faturamento Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(clientesMaisLucro.reduce((sum, c) => sum + c.totalGasto, 0))}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Média por Cliente</p>
                      <p className="text-2xl font-bold">{formatCurrency(clientesMaisLucro.length > 0 ? clientesMaisLucro.reduce((sum, c) => sum + c.totalGasto, 0) / clientesMaisLucro.length : 0)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 Clientes por Faturamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clientesMaisLucro.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                    <YAxis dataKey="nome" type="category" width={120} className="text-xs" />
                    <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Total Gasto"]} />
                    <Bar dataKey="totalGasto" fill="#007AFF" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ranking de Clientes</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(clientesMaisLucro, "clientes-mais-lucro")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead className="text-center">Visitas</TableHead>
                      <TableHead className="text-right">Total Gasto</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesMaisLucro.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum dado de cliente encontrado no período
                        </TableCell>
                      </TableRow>
                    ) : (
                      clientesMaisLucro.map((c, idx) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            {idx < 3 ? (
                              <Badge className={idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : "bg-amber-600"}>
                                {idx + 1}º
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{idx + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{c.nome}</TableCell>
                          <TableCell>{c.celular}</TableCell>
                          <TableCell className="text-center">{c.visitas}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">{formatCurrency(c.totalGasto)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(c.visitas > 0 ? c.totalGasto / c.visitas : 0)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
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
      case "performance":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comissoesPorProfissional}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="nome" className="text-xs" />
                    <YAxis className="text-xs" />
                    <RechartsTooltip />
                    <Bar dataKey="atendimentos" fill="#007AFF" name="Atendimentos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posição</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-center">Atendimentos</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
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
                        <TableCell className="text-right">{formatCurrency(item.atendimentos > 0 ? item.totalServicos / item.atendimentos : 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "comissoes":
        // Calcular vales por profissional para o período
        const valesPorProf: Record<string, number> = {};
        vales.filter(v => v.status === "aberto").forEach(v => {
          if (!valesPorProf[v.profissional_id]) valesPorProf[v.profissional_id] = 0;
          valesPorProf[v.profissional_id] += Number(v.saldo_restante || 0);
        });

        const comissoesComVales = comissoesPorProfissional.map(p => ({
          ...p,
          valesAbertos: valesPorProf[p.id] || 0,
          comissaoLiquida: p.totalComissao - (valesPorProf[p.id] || 0),
        }));

        const totalValesAbertos = Object.values(valesPorProf).reduce((sum, v) => sum + v, 0);

        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
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
                      <p className="text-sm text-muted-foreground">Vales a Descontar</p>
                      <p className="text-2xl font-bold text-amber-600">-{formatCurrency(totalValesAbertos)}</p>
                    </div>
                    <FileText className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Líquido a Pagar</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(comissoesPorProfissional.reduce((sum, p) => sum + p.totalComissao, 0) - totalValesAbertos)}</p>
                    </div>
                    <Wallet className="h-8 w-8 text-primary" />
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
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Comissões por Profissional</CardTitle>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => exportToExcel(comissoesComVales.map(p => ({ profissional: p.nome, atendimentos: p.atendimentos, faturamento: p.totalServicos, comissao_bruta: p.totalComissao, vales: p.valesAbertos, comissao_liquida: p.comissaoLiquida })), "comissoes")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-center">Atend.</TableHead>
                      <TableHead className="text-right">Comissão Bruta</TableHead>
                      <TableHead className="text-right">Vales</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comissoesComVales.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="text-center">{item.atendimentos}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalComissao)}</TableCell>
                        <TableCell className="text-right">
                          {item.valesAbertos > 0 ? (
                            <span className="text-amber-600">-{formatCurrency(item.valesAbertos)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className={cn("text-right font-semibold", item.comissaoLiquida >= 0 ? "text-green-600" : "text-red-600")}>
                          {formatCurrency(item.comissaoLiquida)}
                        </TableCell>
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
                            {comissoesStatus[item.id] ? "Desfazer" : "Pagar"}
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

      case "atendimentos":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Atendimentos por Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comissoesPorProfissional} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="nome" type="category" className="text-xs" width={100} />
                    <RechartsTooltip />
                    <Bar dataKey="atendimentos" fill="#5856D6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      case "top_lucro_servicos":
      case "top_lucro_produtos":
      case "vales_adiantamentos":
      case "valores_pagar":
      case "pagamentos_realizados":
        return (
          <div className="space-y-6">
            {/* Cards de navegação */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card Top Lucro - Serviços */}
              <Card 
                className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg bg-white border-0 shadow-sm relative overflow-hidden"
                onClick={() => selectReport("profissionais", "top_lucro_servicos")}
              >
                <Badge className="absolute top-3 right-3 bg-blue-500 text-white text-xs">Novo</Badge>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: "#FFD70020" }}>
                      <Trophy className="h-6 w-6" style={{ color: "#FFD700" }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Top Lucro - Serviços</h3>
                      <p className="text-sm text-muted-foreground">Ranking por lucro em serviços</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card Top Lucro - Produtos */}
              <Card 
                className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg bg-white border-0 shadow-sm relative overflow-hidden"
                onClick={() => selectReport("profissionais", "top_lucro_produtos")}
              >
                <Badge className="absolute top-3 right-3 bg-blue-500 text-white text-xs">Novo</Badge>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: "#AF52DE20" }}>
                      <ShoppingCart className="h-6 w-6" style={{ color: "#AF52DE" }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Top Lucro - Produtos</h3>
                      <p className="text-sm text-muted-foreground">Ranking por lucro em produtos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card Vales e Adiantamentos */}
              <Card 
                className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg bg-white border-0 shadow-sm"
                onClick={() => selectReport("profissionais", "vales_adiantamentos")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: "#FFCC0020" }}>
                      <FileText className="h-6 w-6" style={{ color: "#FFCC00" }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Vales e Adiantamentos</h3>
                      <p className="text-sm text-muted-foreground">Controle de vales dos profissionais</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conteúdo específico de cada relatório */}
            {reportType === "top_lucro_servicos" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" style={{ color: "#FFD700" }} />
                    Ranking de Lucro por Serviços
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição</TableHead>
                        <TableHead>Profissional</TableHead>
                        <TableHead className="text-right">Faturamento em Serviços</TableHead>
                        <TableHead className="text-right">Comissão Gerada</TableHead>
                        <TableHead className="text-right">Lucro para Empresa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comissoesPorProfissional.map((item, idx) => {
                        const lucroEmpresa = item.totalServicos - item.totalComissao;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Badge 
                                variant={idx === 0 ? "default" : "secondary"}
                                className={idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-600" : ""}
                              >
                                #{idx + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.nome}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalServicos)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(item.totalComissao)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">{formatCurrency(lucroEmpresa)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {reportType === "top_lucro_produtos" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" style={{ color: "#AF52DE" }} />
                    Ranking de Lucro por Produtos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {produtosMaisVendidos.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Posição</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-center">Quantidade Vendida</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {produtosMaisVendidos.map((item, idx) => (
                          <TableRow key={item.nome}>
                            <TableCell>
                              <Badge 
                                variant={idx === 0 ? "default" : "secondary"}
                                className={idx === 0 ? "bg-purple-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-amber-600" : ""}
                              >
                                #{idx + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.nome}</TableCell>
                            <TableCell className="text-center">{item.quantidade}</TableCell>
                            <TableCell className="text-right font-semibold text-purple-600">{formatCurrency(item.valor)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhuma venda de produto no período</p>
                  )}
                </CardContent>
              </Card>
            )}

            {reportType === "vales_adiantamentos" && (
              <div className="space-y-6">
                {/* Cards de resumo */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total em Aberto</p>
                          <p className="text-2xl font-bold text-amber-600">{formatCurrency(valesRelatorio.totalAbertos)}</p>
                        </div>
                        <FileText className="h-8 w-8 text-amber-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Vales Abertos</p>
                          <p className="text-2xl font-bold">{valesRelatorio.qtdAbertos}</p>
                        </div>
                        <Archive className="h-8 w-8 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Vales Quitados</p>
                          <p className="text-2xl font-bold text-green-600">{valesRelatorio.qtdQuitados}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total no Período</p>
                          <p className="text-2xl font-bold">{formatCurrency(valesRelatorio.totalGeral)}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Por profissional */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Vales por Profissional</CardTitle>
                    {valesRelatorio.porProfissional.length > 0 && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => exportToExcel(valesRelatorio.porProfissional.map(p => ({ profissional: p.nome, vales_abertos: p.abertos, vales_quitados: p.quitados, saldo_devedor: p.saldo })), "vales_profissionais")}>
                        <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {valesRelatorio.porProfissional.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Profissional</TableHead>
                            <TableHead className="text-center">Vales Abertos</TableHead>
                            <TableHead className="text-center">Vales Quitados</TableHead>
                            <TableHead className="text-right">Saldo Devedor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {valesRelatorio.porProfissional.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.nome}</TableCell>
                              <TableCell className="text-center">
                                {item.abertos > 0 ? (
                                  <Badge variant="destructive">{item.abertos}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{item.quitados}</Badge>
                              </TableCell>
                              <TableCell className={cn("text-right font-semibold", item.saldo > 0 ? "text-red-600" : "text-green-600")}>
                                {formatCurrency(item.saldo)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Nenhum vale no período selecionado</p>
                    )}
                  </CardContent>
                </Card>

                {/* Lista de vales */}
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Vales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {valesRelatorio.lista.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Profissional</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {valesRelatorio.lista.map((vale) => (
                            <TableRow key={vale.id}>
                              <TableCell>{format(new Date(vale.data_lancamento), "dd/MM/yyyy")}</TableCell>
                              <TableCell className="font-medium">{vale.profissional?.nome || "—"}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{vale.motivo}</TableCell>
                              <TableCell className="text-right">{formatCurrency(vale.valor_total)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(vale.saldo_restante || 0)}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={vale.status === "quitado" ? "default" : "destructive"}>
                                  {vale.status === "quitado" ? "Quitado" : "Aberto"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Nenhum vale registrado no período</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {reportType === "valores_pagar" && (
              <Card>
                <CardHeader>
                  <CardTitle>Valores a Pagar aos Profissionais</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead className="text-center">Atendimentos</TableHead>
                        <TableHead className="text-right">Comissão Pendente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comissoesPorProfissional.filter(p => !comissoesStatus[p.id]).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.nome}</TableCell>
                          <TableCell className="text-center">{item.atendimentos}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{formatCurrency(item.totalComissao)}</TableCell>
                        </TableRow>
                      ))}
                      {comissoesPorProfissional.filter(p => !comissoesStatus[p.id]).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            Nenhum valor pendente para pagamento
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {reportType === "pagamentos_realizados" && (
              <Card>
                <CardHeader>
                  <CardTitle>Pagamentos Realizados</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead className="text-center">Atendimentos</TableHead>
                        <TableHead className="text-right">Valor Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comissoesPorProfissional.filter(p => comissoesStatus[p.id]).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.nome}</TableCell>
                          <TableCell className="text-center">{item.atendimentos}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">{formatCurrency(item.totalComissao)}</TableCell>
                        </TableRow>
                      ))}
                      {comissoesPorProfissional.filter(p => comissoesStatus[p.id]).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            Nenhum pagamento realizado no período
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        );
    }
  };

  const renderProdutosReport = () => {
    switch (reportType) {
      case "mais_vendidos":
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

      case "estoque":
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

  const renderFinanceiroReport = () => {
    const totalReceitas = vendasPorPeriodo.total;
    const totalComissoes = comissoesPorProfissional.reduce((sum, p) => sum + p.totalComissao, 0);
    const lucro = totalReceitas - totalComissoes;
    const contasVencidas = contasPagar.filter(c => c.status === "pendente" && new Date(c.data_vencimento) < new Date()).length;

    // Cards de navegação rápida
    const financeiroCards = (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Card Gaveta do Caixa */}
        <div 
          onClick={() => { setCategory("caixa"); setReportType("caixas_fechados"); }}
          className="relative bg-card rounded-2xl p-5 border shadow-sm cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
        >
          <div className="absolute top-3 right-3">
            <Badge className="bg-red-500 text-white text-[10px] px-2 py-0.5">Essencial</Badge>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(175, 82, 222, 0.12)' }}>
              <Archive className="h-6 w-6" style={{ color: '#AF52DE' }} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-semibold text-foreground">Gaveta do Caixa</h3>
              <p className="text-sm text-muted-foreground mt-1">Controle de caixa e movimentações</p>
            </div>
          </div>
        </div>

        {/* Card Valores a Pagar */}
        <div 
          onClick={() => selectReport("financeiro", "contas_pagar")}
          className="relative bg-card rounded-2xl p-5 border shadow-sm cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
        >
          {contasVencidas > 0 && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-red-500 text-white text-xs px-2">{contasVencidas} vencida{contasVencidas > 1 ? 's' : ''}</Badge>
            </div>
          )}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255, 59, 48, 0.12)' }}>
              <ArrowUpCircle className="h-6 w-6" style={{ color: '#FF3B30' }} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-semibold text-foreground">Valores a Pagar</h3>
              <p className="text-sm text-muted-foreground mt-1">Contas e pagamentos pendentes</p>
            </div>
          </div>
        </div>

        {/* Card Pagamentos Realizados */}
        <div 
          onClick={() => selectReport("profissionais", "pagamentos_realizados")}
          className="relative bg-card rounded-2xl p-5 border shadow-sm cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)' }}>
              <CheckCircle className="h-6 w-6" style={{ color: '#34C759' }} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-semibold text-foreground">Pagamentos Realizados</h3>
              <p className="text-sm text-muted-foreground mt-1">Histórico de pagamentos</p>
            </div>
          </div>
        </div>

        {/* Card Fluxo de Caixa */}
        <div 
          onClick={() => selectReport("financeiro", "fluxo")}
          className="relative bg-card rounded-2xl p-5 border shadow-sm cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0, 122, 255, 0.12)' }}>
              <TrendingUp className="h-6 w-6" style={{ color: '#007AFF' }} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-semibold text-foreground">Fluxo de Caixa</h3>
              <p className="text-sm text-muted-foreground mt-1">Entradas e saídas do período</p>
            </div>
          </div>
        </div>
      </div>
    );

    switch (reportType) {
      case "dre":
        return (
          <div className="space-y-6">
            {financeiroCards}
            <Card>
              <CardHeader>
                <CardTitle>DRE - Demonstrativo de Resultados</CardTitle>
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
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Despesas (Comissões)</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalComissoes)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                    <p className={cn("text-2xl font-bold", lucro >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(lucro)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "fluxo":
        return (
          <div className="space-y-6">
            {financeiroCards}
            <Card>
              <CardHeader>
                <CardTitle>Fluxo de Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={vendasPorPeriodo.porDia}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="data" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} />
                    <Line type="monotone" dataKey="valor" stroke="#34C759" strokeWidth={2} dot={{ fill: "#34C759" }} name="Entradas" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entradas por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Atendimentos</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasPorPeriodo.porDia.map((item) => (
                      <TableRow key={item.data}>
                        <TableCell>{item.data}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(item.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "contas_pagar":
        const totalPagar = contasPagar.reduce((sum, c) => sum + (c.valor || 0), 0);
        const totalPagarPendente = contasPagar.filter(c => c.status === "pendente").reduce((sum, c) => sum + (c.valor || 0), 0);

        return (
          <div className="space-y-6">
            {financeiroCards}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Contas</p>
                      <p className="text-2xl font-bold">{contasPagar.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total a Pagar</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPagar)}</p>
                    </div>
                    <ArrowUpCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pendente</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalPagarPendente)}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Contas a Pagar</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(contasPagar, "contas-pagar")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasPagar.map((conta) => (
                      <TableRow key={conta.id}>
                        <TableCell className="font-medium">{conta.descricao}</TableCell>
                        <TableCell>{conta.categoria}</TableCell>
                        <TableCell>{format(new Date(conta.data_vencimento), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(conta.valor)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={conta.status === "pago" ? "default" : new Date(conta.data_vencimento) < new Date() ? "destructive" : "secondary"}>
                            {conta.status === "pago" ? "Pago" : new Date(conta.data_vencimento) < new Date() ? "Vencido" : "Pendente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {contasPagar.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma conta a pagar no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "contas_receber":
        const totalReceber = contasReceber.reduce((sum, c) => sum + (c.valor || 0), 0);
        const totalReceberPendente = contasReceber.filter(c => c.status === "pendente").reduce((sum, c) => sum + (c.valor || 0), 0);

        return (
          <div className="space-y-6">
            {financeiroCards}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Contas</p>
                      <p className="text-2xl font-bold">{contasReceber.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total a Receber</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceber)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pendente</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalReceberPendente)}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Contas a Receber</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(contasReceber, "contas-receber")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasReceber.map((conta) => (
                      <TableRow key={conta.id}>
                        <TableCell className="font-medium">{conta.descricao}</TableCell>
                        <TableCell>{conta.cliente?.nome || "-"}</TableCell>
                        <TableCell>{format(new Date(conta.data_vencimento), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(conta.valor)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={conta.status === "recebido" ? "default" : new Date(conta.data_vencimento) < new Date() ? "destructive" : "secondary"}>
                            {conta.status === "recebido" ? "Recebido" : new Date(conta.data_vencimento) < new Date() ? "Vencido" : "Pendente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {contasReceber.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma conta a receber no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "extrato_cartoes":
        const pagamentosCartao = pagamentos.filter(p => 
          p.forma_pagamento?.toLowerCase().includes("cartão") || 
          p.forma_pagamento?.toLowerCase().includes("credito") ||
          p.forma_pagamento?.toLowerCase().includes("debito")
        );
        const totalCartoes = pagamentosCartao.reduce((sum, p) => sum + (p.valor || 0), 0);

        return (
          <div className="space-y-6">
            {financeiroCards}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Transações com Cartão</p>
                      <p className="text-2xl font-bold">{pagamentosCartao.length}</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total em Cartões</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCartoes)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Extrato de Cartões</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(pagamentosCartao, "extrato-cartoes")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead className="text-center">Parcelas</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagamentosCartao.map((pgto) => (
                      <TableRow key={pgto.id}>
                        <TableCell>{format(new Date(pgto.data_hora), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>{pgto.forma_pagamento}</TableCell>
                        <TableCell className="text-center">{pgto.parcelas || 1}x</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(pgto.valor)}</TableCell>
                      </TableRow>
                    ))}
                    {pagamentosCartao.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum pagamento com cartão no período
                        </TableCell>
                      </TableRow>
                    )}
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
      case "lucro_bruto":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Receita Total</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(lucroBruto.receitaTotal)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Custo Produtos</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(lucroBruto.custoProdutos)}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Comissões</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(lucroBruto.comissoes)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Lucro Bruto</p>
                      <p className={cn("text-2xl font-bold", lucroBruto.lucro >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(lucroBruto.lucro)}</p>
                    </div>
                    <PieChart className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detalhamento do Lucro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="font-semibold">Receita de Serviços</span>
                    <span className="font-medium text-green-600">{formatCurrency(lucroBruto.receitaServicos)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="font-semibold">Receita de Produtos</span>
                    <span className="font-medium text-green-600">{formatCurrency(lucroBruto.receitaProdutos)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b bg-green-50 dark:bg-green-950/30 px-3 rounded">
                    <span className="font-semibold">= Receita Total</span>
                    <span className="font-bold text-green-600">{formatCurrency(lucroBruto.receitaTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 pl-4">
                    <span className="text-muted-foreground">(-) Custo dos Produtos</span>
                    <span className="text-red-600">{formatCurrency(lucroBruto.custoProdutos)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 pl-4">
                    <span className="text-muted-foreground">(-) Comissões</span>
                    <span className="text-red-600">{formatCurrency(lucroBruto.comissoes)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-t-2 bg-muted/50 px-3 rounded">
                    <span className="font-bold text-lg">= Lucro Bruto</span>
                    <span className={cn("font-bold text-lg", lucroBruto.lucro >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(lucroBruto.lucro)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Margem de Lucro</span>
                    <Badge variant={lucroBruto.margemLucro >= 30 ? "default" : lucroBruto.margemLucro >= 15 ? "secondary" : "destructive"}>
                      {lucroBruto.margemLucro.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "grafico_lucro":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Composição da Receita</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={[
                          { name: "Serviços", value: lucroBruto.receitaServicos },
                          { name: "Produtos", value: lucroBruto.receitaProdutos },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        <Cell fill="#007AFF" />
                        <Cell fill="#34C759" />
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Custos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={[
                          { name: "Custo Produtos", value: lucroBruto.custoProdutos },
                          { name: "Comissões", value: lucroBruto.comissoes },
                          { name: "Lucro", value: lucroBruto.lucro > 0 ? lucroBruto.lucro : 0 },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        <Cell fill="#FF3B30" />
                        <Cell fill="#FF9500" />
                        <Cell fill="#34C759" />
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Evolução do Faturamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={lucroBruto.porDia}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="data" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Receita"]} />
                    <Bar dataKey="receita" fill="#007AFF" radius={[4, 4, 0, 0]} name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  const renderCaixaReport = () => {
    switch (reportType) {
      case "caixas_fechados":
        const totalCaixas = caixasFechados.length;
        const totalMovimentado = caixasFechados.reduce((sum, c) => sum + (c.valor_final || 0), 0);
        const totalDiferenca = caixasFechados.reduce((sum, c) => sum + (c.diferenca || 0), 0);

        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Caixas Fechados</p>
                      <p className="text-2xl font-bold">{totalCaixas}</p>
                    </div>
                    <Wallet className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Movimentado</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(totalMovimentado)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Diferença Total</p>
                      <p className={cn("text-2xl font-bold", totalDiferenca >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(totalDiferenca)}</p>
                    </div>
                    <Activity className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Histórico de Caixas</CardTitle>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => exportToExcel(caixasFechados, "caixas-fechados")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Abertura</TableHead>
                      <TableHead>Fechamento</TableHead>
                      <TableHead className="text-right">Valor Inicial</TableHead>
                      <TableHead className="text-right">Valor Final</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caixasFechados.map((caixa) => (
                      <TableRow key={caixa.id}>
                        <TableCell>{caixa.dataAbertura}</TableCell>
                        <TableCell>{caixa.dataFechamento}</TableCell>
                        <TableCell className="text-right">{formatCurrency(caixa.valor_inicial || 0)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(caixa.valor_final || 0)}</TableCell>
                        <TableCell className={cn("text-right font-medium", (caixa.diferenca || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                          {formatCurrency(caixa.diferenca || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {caixasFechados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum caixa fechado no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "sangrias":
        const totalSangrias = sangrias.reduce((sum, s) => sum + (s.valor || 0), 0);

        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Sangrias</p>
                      <p className="text-2xl font-bold">{sangrias.length}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSangrias)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sangrias Realizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sangrias.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{format(new Date(s.data_hora), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>{s.descricao}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(s.valor)}</TableCell>
                      </TableRow>
                    ))}
                    {sangrias.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Nenhuma sangria no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "reforcos":
        const totalReforcos = reforcos.reduce((sum, r) => sum + (r.valor || 0), 0);

        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Reforços</p>
                      <p className="text-2xl font-bold">{reforcos.length}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReforcos)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Reforços Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reforcos.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{format(new Date(r.data_hora), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>{r.descricao}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(r.valor)}</TableCell>
                      </TableRow>
                    ))}
                    {reforcos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Nenhum reforço no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
                        <SelectValue placeholder={categoryLabels[cat]} />
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
                        <span>{categoryLabels[cat]}</span>
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
