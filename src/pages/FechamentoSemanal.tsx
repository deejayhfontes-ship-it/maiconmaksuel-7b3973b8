import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarCheck,
  ArrowLeft,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Scissors,
  ShoppingCart,
  Users,
  Check,
  Lock,
  FileText,
  Send,
  Download,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  Loader2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dbExtras } from "@/integrations/supabase/types-extras";
import type {
  FechamentoSemanalRow,
  FechamentoProfissionalRow,
  StatusPagamentoFechamento,
} from "@/integrations/supabase/types-extras";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  parseISO,
  getWeek,
  getYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ─────────────────────────────────────────────
// Tipos locais
// ─────────────────────────────────────────────
interface Profissional {
  id: string;
  nome: string;
  foto_url: string | null;
  funcao: string | null;
}

interface FechamentoProfissionalUI extends FechamentoProfissionalRow {
  profissional: Profissional;
  // dados calculados em tempo real (antes do fechamento)
  total_vales?: number;
  valor_liquido?: number;
  vales_detalhados?: { descricao: string; valor: number }[];
}

// ─────────────────────────────────────────────
// Helpers de status
// ─────────────────────────────────────────────
const badgeConfirmacao = (status: string) => {
  if (status === "confirmado")
    return <Badge className="bg-success/10 text-success">✓ Confirmado</Badge>;
  return <Badge className="bg-amber-500/10 text-amber-600">⏳ Pendente</Badge>;
};

const badgePagamento = (status: StatusPagamentoFechamento) => {
  if (status === "pago")
    return <Badge className="bg-success/10 text-success">💰 Pago</Badge>;
  if (status === "pago_parcial")
    return <Badge className="bg-orange-500/10 text-orange-600">🔶 Parcial</Badge>;
  return <Badge className="bg-muted text-muted-foreground">⏳ A Pagar</Badge>;
};

// ─────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────
const FechamentoSemanal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [fechamento, setFechamento] = useState<FechamentoSemanalRow | null>(null);
  const [profissionaisData, setProfissionaisData] = useState<FechamentoProfissionalUI[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [selectedProfissionais, setSelectedProfissionais] = useState<string[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fechamentoLoading, setFechamentoLoading] = useState(false);
  const [fechamentoProgress, setFechamentoProgress] = useState<string[]>([]);
  const [historico, setHistorico] = useState<FechamentoSemanalRow[]>([]);

  // Dialog pagamento
  const [showPagarDialog, setShowPagarDialog] = useState(false);
  const [profParaPagar, setProfParaPagar] = useState<FechamentoProfissionalUI | null>(null);
  const [valorPagoInput, setValorPagoInput] = useState("");
  const [pagandoLoading, setPagandoLoading] = useState(false);

  const [formFechamento, setFormFechamento] = useState({
    data_fechamento: format(new Date(), "yyyy-MM-dd"),
    observacoes: "",
    confirmo_revisao: false,
  });

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 });
  const year = getYear(currentWeekStart);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // ─────────────────────────────────────────────
  // Busca dados da semana
  // ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);

    // Profissionais ativos
    const { data: profs } = await supabase
      .from("profissionais")
      .select("id, nome, foto_url, funcao")
      .eq("ativo", true)
      .order("nome");

    if (profs) setProfissionais(profs as Profissional[]);

    // Fechamento existente?
    const { data: fechamentoExistente } = await dbExtras("fechamentos_semanais")
      .select("*")
      .eq("semana_numero", weekNumber)
      .eq("ano", year)
      .maybeSingle();

    if (fechamentoExistente) {
      setFechamento(fechamentoExistente as FechamentoSemanalRow);

      // Itens por profissional com join
      const { data: fechProfs } = await dbExtras("fechamentos_profissionais")
        .select("*, profissional:profissionais(id, nome, foto_url, funcao)")
        .eq("fechamento_semanal_id", fechamentoExistente.id)
        .order("created_at");

      if (fechProfs) {
        setProfissionaisData(fechProfs as FechamentoProfissionalUI[]);
      }
    } else {
      setFechamento(null);
      await calcularDadosSemana(profs || []);
    }

    setLoading(false);
  }, [weekNumber, year]);

  const calcularDadosSemana = async (profs: Profissional[]) => {
    const inicioSemana = format(currentWeekStart, "yyyy-MM-dd");
    const fimSemana = format(weekEnd, "yyyy-MM-dd");

    // Atendimentos fechados — usa comissoes_registro como fonte de verdade
    const { data: comissoes } = await dbExtras("comissoes_registro")
      .select("profissional_id, valor_comissao, valor_servico, servico_nome, created_at")
      .eq("status", "pendente")
      .gte("created_at", `${inicioSemana}T00:00:00`)
      .lte("created_at", `${fimSemana}T23:59:59`);

    // Vales pendentes
    const { data: vales } = await supabase
      .from("vales")
      .select("profissional_id, saldo_restante, valor_total, data_lancamento, motivo")
      .in("status", ["aberto", "parcial"])
      .gte("data_lancamento", inicioSemana)
      .lte("data_lancamento", fimSemana);

    const dadosPorProfissional: Record<string, FechamentoProfissionalUI> = {};

    profs.forEach((prof) => {
      dadosPorProfissional[prof.id] = {
        id: "",
        fechamento_semanal_id: "",
        profissional_id: prof.id,
        profissional: prof,
        total_atendimentos: 0,
        total_faturamento: 0,
        total_comissoes: 0,
        total_vales: 0,
        valor_liquido: 0,
        status: "pendente",
        status_pagamento: "pendente",
        valor_pago: 0,
        data_pagamento: null,
        confirmado_por: null,
        confirmado_em: null,
        observacoes: null,
        created_at: "",
        vales_detalhados: [],
      } as FechamentoProfissionalUI;
    });

    comissoes?.forEach((c: { profissional_id: string; valor_comissao: number; valor_servico: number }) => {
      if (dadosPorProfissional[c.profissional_id]) {
        dadosPorProfissional[c.profissional_id].total_atendimentos++;
        dadosPorProfissional[c.profissional_id].total_faturamento += Number(c.valor_servico);
        dadosPorProfissional[c.profissional_id].total_comissoes += Number(c.valor_comissao);
      }
    });

    vales?.forEach((vale: { profissional_id: string; saldo_restante: number; valor_total: number; data_lancamento: string; motivo: string }) => {
      if (dadosPorProfissional[vale.profissional_id]) {
        const valorDescontar = Number(vale.saldo_restante || vale.valor_total);
        dadosPorProfissional[vale.profissional_id].total_vales =
          (dadosPorProfissional[vale.profissional_id].total_vales ?? 0) + valorDescontar;
        dadosPorProfissional[vale.profissional_id].vales_detalhados?.push({
          descricao: `Vale ${format(parseISO(vale.data_lancamento), "dd/MM")} - ${vale.motivo}`,
          valor: valorDescontar,
        });
      }
    });

    Object.values(dadosPorProfissional).forEach((prof) => {
      prof.valor_liquido = prof.total_comissoes - (prof.total_vales ?? 0);
    });

    const resultado = Object.values(dadosPorProfissional).filter(
      (p) => p.total_atendimentos > 0 || (p.total_vales ?? 0) > 0
    );
    setProfissionaisData(resultado);
  };

  const fetchHistorico = async () => {
    const { data } = await dbExtras("fechamentos_semanais")
      .select("*")
      .order("data_inicio", { ascending: false })
      .limit(20);
    if (data) setHistorico(data as FechamentoSemanalRow[]);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) =>
      direction === "prev" ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
    setExpandedRows([]);
    setSelectedProfissionais([]);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleSelectProfissional = (id: string) => {
    setSelectedProfissionais((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedProfissionais.length === profissionaisData.length) {
      setSelectedProfissionais([]);
    } else {
      setSelectedProfissionais(profissionaisData.map((p) => p.profissional_id));
    }
  };

  // ─────────────────────────────────────────────
  // Confirmar selecionados (só disponível após fechamento)
  // ─────────────────────────────────────────────
  const confirmarSelecionadas = async () => {
    if (!fechamento) return;
    const ids = profissionaisData
      .filter((p) => selectedProfissionais.includes(p.profissional_id) && p.id)
      .map((p) => p.id);

    if (ids.length === 0) {
      toast({ title: "Nenhum item encontrado para confirmar.", variant: "destructive" });
      return;
    }

    const { error } = await dbExtras("fechamentos_profissionais")
      .update({ status: "confirmado", confirmado_em: new Date().toISOString() })
      .in("id", ids);

    if (error) {
      toast({ title: "Erro ao confirmar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `✅ ${ids.length} profissiona${ids.length > 1 ? "is" : "l"} confirmado${ids.length > 1 ? "s" : ""}!` });
    setSelectedProfissionais([]);
    await fetchData();
  };

  // ─────────────────────────────────────────────
  // Fechar semana
  // ─────────────────────────────────────────────
  const handleFecharSemana = async () => {
    setFechamentoLoading(true);
    setFechamentoProgress([]);

    try {
      setFechamentoProgress((p) => [...p, "Verificando duplicidade..."]);

      // Verificar se já existe fechamento para esta semana
      const { data: existente } = await dbExtras("fechamentos_semanais")
        .select("id, status")
        .eq("semana_numero", weekNumber)
        .eq("ano", year)
        .maybeSingle();

      if (existente) {
        toast({
          title: "Semana já fechada",
          description: `Esta semana (${weekNumber}/${year}) já possui um fechamento registrado.`,
          variant: "destructive",
        });
        return;
      }

      setFechamentoProgress((p) =>
        p.map((x) => (x === "Verificando duplicidade..." ? "✓ Sem duplicidade" : x))
      );

      setFechamentoProgress((p) => [...p, "Calculando totais..."]);
      await new Promise((r) => setTimeout(r, 400));

      const totais = profissionaisData.reduce(
        (acc, p) => ({
          faturamento: acc.faturamento + p.total_faturamento,
          servicos: acc.servicos + p.total_atendimentos,
          comissoes: acc.comissoes + p.total_comissoes,
          vales: acc.vales + (p.total_vales ?? 0),
          liquido: acc.liquido + (p.valor_liquido ?? 0),
        }),
        { faturamento: 0, servicos: 0, comissoes: 0, vales: 0, liquido: 0 }
      );

      setFechamentoProgress((p) =>
        p.map((x) => (x === "Calculando totais..." ? "✓ Totais calculados" : x))
      );

      setFechamentoProgress((p) => [...p, "Criando registro de fechamento..."]);

      const { data: novoFechamento, error } = await dbExtras("fechamentos_semanais")
        .insert({
          data_inicio: format(currentWeekStart, "yyyy-MM-dd"),
          data_fim: format(weekEnd, "yyyy-MM-dd"),
          semana_numero: weekNumber,
          ano: year,
          status: "fechada",
          total_faturamento: totais.faturamento,
          total_servicos: totais.servicos,
          total_comissoes: totais.comissoes,
          total_vales: totais.vales,
          total_liquido: totais.liquido,
          observacoes: formFechamento.observacoes || null,
          fechado_em: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setFechamentoProgress((p) =>
        p.map((x) => (x === "Criando registro de fechamento..." ? "✓ Fechamento criado" : x))
      );

      setFechamentoProgress((p) => [...p, `Salvando ${profissionaisData.length} profissionais...`]);

      // Itens por profissional (snapshot de valores)
      for (const prof of profissionaisData) {
        await dbExtras("fechamentos_profissionais").insert({
          fechamento_semanal_id: novoFechamento.id,
          profissional_id: prof.profissional_id,
          total_atendimentos: prof.total_atendimentos,
          total_faturamento: prof.total_faturamento,
          total_comissoes: prof.total_comissoes,
          total_vales: prof.total_vales ?? 0,
          valor_liquido: prof.valor_liquido ?? 0,
          status: "pendente",
          status_pagamento: "pendente",
          valor_pago: 0,
        });
      }

      // Vincular comissoes_registro ao fechamento
      const inicioSemana = format(currentWeekStart, "yyyy-MM-dd");
      const fimSemana = format(weekEnd, "yyyy-MM-dd");
      await dbExtras("comissoes_registro")
        .update({ fechamento_id: novoFechamento.id })
        .eq("status", "pendente")
        .gte("created_at", `${inicioSemana}T00:00:00`)
        .lte("created_at", `${fimSemana}T23:59:59`);

      setFechamentoProgress((p) =>
        p.map((x) =>
          x.startsWith("Salvando") ? `✓ ${profissionaisData.length} profissionais salvos` : x
        )
      );

      toast({
        title: `✅ Semana ${weekNumber}/${year} fechada com sucesso!`,
        description: `${profissionaisData.length} profissionais incluídos. Comissões vinculadas.`,
      });

      setShowFecharModal(false);
      setShowConfirmDialog(false);
      setFormFechamento({ data_fechamento: format(new Date(), "yyyy-MM-dd"), observacoes: "", confirmo_revisao: false });
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao fechar semana", description: msg, variant: "destructive" });
    } finally {
      setFechamentoLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Registrar pagamento de um profissional
  // ─────────────────────────────────────────────
  const abrirPagarDialog = (item: FechamentoProfissionalUI) => {
    setProfParaPagar(item);
    setValorPagoInput(String(item.valor_liquido ?? ""));
    setShowPagarDialog(true);
  };

  const handleRegistrarPagamento = async () => {
    if (!profParaPagar?.id) return;
    setPagandoLoading(true);

    const valorPago = Number(valorPagoInput);
    const valorLiquido = profParaPagar.valor_liquido ?? 0;
    const statusPag: StatusPagamentoFechamento =
      valorPago >= valorLiquido ? "pago" : valorPago > 0 ? "pago_parcial" : "pendente";

    const { error } = await dbExtras("fechamentos_profissionais")
      .update({
        valor_pago: valorPago,
        status_pagamento: statusPag,
        data_pagamento: new Date().toISOString(),
      })
      .eq("id", profParaPagar.id);

    if (error) {
      toast({ title: "Erro ao registrar pagamento", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: `💰 Pagamento registrado — ${profParaPagar.profissional.nome}`,
        description: `${formatCurrency(valorPago)} marcado como ${statusPag === "pago" ? "pago" : "pago parcialmente"}.`,
      });
      setShowPagarDialog(false);
      await fetchData();
    }

    setPagandoLoading(false);
  };

  // ─────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalFaturamento = profissionaisData.reduce((a, p) => a + p.total_faturamento, 0);
    const totalServicos = profissionaisData.reduce((a, p) => a + p.total_atendimentos, 0);
    const totalComissoes = profissionaisData.reduce((a, p) => a + p.total_comissoes, 0);
    const totalVales = profissionaisData.reduce((a, p) => a + (p.total_vales ?? 0), 0);
    const totalLiquido = profissionaisData.reduce((a, p) => a + (p.valor_liquido ?? 0), 0);
    const confirmados = profissionaisData.filter((p) => p.status === "confirmado").length;
    const pagos = profissionaisData.filter((p) => p.status_pagamento === "pago").length;
    const pendentes = profissionaisData.filter((p) => p.status_pagamento !== "pago").length;
    return { totalFaturamento, totalServicos, totalComissoes, totalVales, totalLiquido, confirmados, pagos, pendentes };
  }, [profissionaisData]);

  const isSemanaAberta = !fechamento || fechamento.status === "aberta";

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/financeiro")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "#007AFF20" }}>
            <CalendarCheck className="h-6 w-6" style={{ color: "#007AFF" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Fechamento Semanal</h1>
            <p className="text-muted-foreground">Comissões e pagamentos por semana</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchHistorico(); setShowHistorico(true); }}>
            <Clock className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          {isSemanaAberta && profissionaisData.length > 0 && (
            <Button className="bg-success hover:bg-success/90" onClick={() => setShowFecharModal(true)}>
              <Lock className="h-4 w-4 mr-2" />
              Fechar Semana
            </Button>
          )}
        </div>
      </div>

      {/* Seletor de semana */}
      <Card className="border-2" style={{ borderColor: "#007AFF" }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-5 w-5 mr-1" /> Semana Anterior
            </Button>
            <div className="text-center">
              <p className="text-2xl font-bold">
                SEMANA {format(currentWeekStart, "dd/MM", { locale: ptBR }).toUpperCase()} A{" "}
                {format(weekEnd, "dd/MM/yyyy", { locale: ptBR }).toUpperCase()}
              </p>
              <p className="text-muted-foreground">Segunda a Domingo</p>
              <div className="mt-2">
                {fechamento?.status === "fechada" ? (
                  <Badge className="bg-success/10 text-success">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> FECHADA
                  </Badge>
                ) : (
                  <Badge className="bg-blue-500/10 text-blue-600">🟢 ABERTA</Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigateWeek("next")}>
              Próxima Semana <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Faturamento Total", value: formatCurrency(stats.totalFaturamento), icon: TrendingUp, color: "#007AFF" },
          { label: "Serviços Realizados", value: stats.totalServicos.toString(), icon: Scissors, color: "#34C759", sub: `Ticket médio: ${formatCurrency(stats.totalServicos > 0 ? stats.totalFaturamento / stats.totalServicos : 0)}` },
          { label: "Comissões Totais", value: formatCurrency(stats.totalComissoes), icon: ShoppingCart, color: "#AF52DE", sub: `Vales: -${formatCurrency(stats.totalVales)}` },
          { label: "Profissionais", value: profissionaisData.length.toString(), icon: Users, color: "#FF9500", sub: `${stats.pagos} pagos, ${stats.pendentes} pendentes` },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="h-6 w-6" style={{ color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                  {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela de profissionais */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profissionais da Semana</CardTitle>
          {!!fechamento && selectedProfissionais.length > 0 && (
            <Button size="sm" className="bg-success hover:bg-success/90" onClick={confirmarSelecionadas}>
              <Check className="h-4 w-4 mr-2" /> Confirmar ({selectedProfissionais.length})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : profissionaisData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum atendimento registrado nesta semana</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {!!fechamento && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedProfissionais.length === profissionaisData.length && profissionaisData.length > 0}
                        onCheckedChange={selectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-center">Atend.</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Vales</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead className="text-center">Confirmação</TableHead>
                  <TableHead className="text-center">Pagamento</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {profissionaisData.map((item) => (
                  <Collapsible key={item.profissional_id} open={expandedRows.includes(item.profissional_id)}>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      {!!fechamento && (
                        <TableCell>
                          <Checkbox
                            checked={selectedProfissionais.includes(item.profissional_id)}
                            onCheckedChange={() => toggleSelectProfissional(item.profissional_id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                      )}
                      <TableCell onClick={() => toggleRow(item.profissional_id)}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={item.profissional.foto_url || undefined} />
                            <AvatarFallback>{item.profissional.nome.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{item.profissional.nome}</p>
                            <p className="text-xs text-muted-foreground">{item.profissional.funcao || "Profissional"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center" onClick={() => toggleRow(item.profissional_id)}>
                        {item.total_atendimentos}
                      </TableCell>
                      <TableCell className="text-right" onClick={() => toggleRow(item.profissional_id)}>
                        {formatCurrency(item.total_faturamento)}
                      </TableCell>
                      <TableCell className="text-right text-success font-semibold" onClick={() => toggleRow(item.profissional_id)}>
                        {formatCurrency(item.total_comissoes)}
                      </TableCell>
                      <TableCell className="text-right text-destructive" onClick={() => toggleRow(item.profissional_id)}>
                        {(item.total_vales ?? 0) > 0 ? `-${formatCurrency(item.total_vales ?? 0)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold" onClick={() => toggleRow(item.profissional_id)}>
                        {formatCurrency(item.valor_liquido ?? 0)}
                      </TableCell>
                      <TableCell className="text-center" onClick={() => toggleRow(item.profissional_id)}>
                        {badgeConfirmacao(item.status)}
                      </TableCell>
                      <TableCell className="text-center" onClick={() => toggleRow(item.profissional_id)}>
                        {badgePagamento(item.status_pagamento as StatusPagamentoFechamento)}
                      </TableCell>
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => toggleRow(item.profissional_id)}>
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows.includes(item.profissional_id) ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                    </TableRow>

                    {/* Detalhe expandido */}
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={!!fechamento ? 10 : 9} className="bg-muted/30 p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <h4 className="font-semibold text-sm">Resumo</h4>
                                <p className="text-sm">Serviços: {item.total_atendimentos}</p>
                                <p className="text-sm">Faturamento: {formatCurrency(item.total_faturamento)}</p>
                                <p className="text-sm">Comissão bruta: {formatCurrency(item.total_comissoes)}</p>
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-semibold text-sm">Vales Descontados</h4>
                                {item.vales_detalhados && item.vales_detalhados.length > 0 ? (
                                  item.vales_detalhados.map((vale, i) => (
                                    <p key={i} className="text-sm text-destructive">
                                      • {vale.descricao}: -{formatCurrency(vale.valor)}
                                    </p>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">Nenhum vale</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-semibold text-sm">Pagamento</h4>
                                <p className="text-2xl font-bold text-success">{formatCurrency(item.valor_liquido ?? 0)}</p>
                                {item.valor_pago > 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    Pago: {formatCurrency(item.valor_pago)}
                                    {item.data_pagamento && ` em ${format(parseISO(item.data_pagamento), "dd/MM/yyyy")}`}
                                  </p>
                                )}
                                {item.confirmado_em && (
                                  <p className="text-xs text-muted-foreground">
                                    Confirmado em {format(parseISO(item.confirmado_em), "dd/MM 'às' HH:mm")}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Ações do detalhe */}
                            {!!fechamento && (
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  className="bg-success hover:bg-success/90"
                                  onClick={() => abrirPagarDialog(item)}
                                  disabled={item.status_pagamento === "pago"}
                                >
                                  <Banknote className="h-4 w-4 mr-1" />
                                  {item.status_pagamento === "pago" ? "Pago ✓" : "Registrar Pagamento"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    toast({ title: "📄 Recibo", description: "Funcionalidade de geração de recibo em desenvolvimento." });
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-1" /> Gerar Recibo
                                </Button>
                                <Button size="sm" variant="outline" className="text-success border-success/40">
                                  <Send className="h-4 w-4 mr-1" /> WhatsApp
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rodapé */}
      {profissionaisData.length > 0 && (
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 justify-between items-center">
            <div className="text-lg font-semibold">
              Total Líquido da Semana:{" "}
              <span className="text-success">{formatCurrency(stats.totalLiquido)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" /> Exportar Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Modal Fechar Semana ── */}
      <Dialog open={showFecharModal} onOpenChange={setShowFecharModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Fechar Semana {format(currentWeekStart, "dd/MM")} a {format(weekEnd, "dd/MM")}
            </DialogTitle>
            <DialogDescription>Revise todos os dados antes de fechar a semana</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Pré-validações */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Pré-validações</h4>
              <p className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Comissões calculadas via comissoes_registro
              </p>
              <p className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Vales pendentes considerados
              </p>
              <p className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Verificação anti-duplicidade ativa
              </p>
              {profissionaisData.length === 0 && (
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" /> Nenhum dado para fechar nesta semana
                </p>
              )}
            </div>

            {/* Resumo */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Resumo Geral</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>{profissionaisData.length} profissionais trabalharam</p>
                <p>{stats.totalServicos} serviços realizados</p>
                <p>Comissões: {formatCurrency(stats.totalComissoes)}</p>
                <p>Vales descontados: {formatCurrency(stats.totalVales)}</p>
                <p className="col-span-2 font-bold text-lg">
                  Líquido total: {formatCurrency(stats.totalLiquido)}
                </p>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Ex: Semana com feriado..."
                value={formFechamento.observacoes}
                onChange={(e) => setFormFechamento({ ...formFechamento, observacoes: e.target.value })}
              />
            </div>

            {/* Aviso */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
              <p className="font-semibold flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" /> IMPORTANTE: Após fechar:
              </p>
              <ul className="mt-1 text-muted-foreground list-disc list-inside space-y-0.5">
                <li>Os valores ficam registrados como snapshot permanente</li>
                <li>Não é possível adicionar comissões retroativas</li>
                <li>Pagamentos devem ser registrados na tela de fechamento</li>
              </ul>
            </div>

            {/* Confirmação */}
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Checkbox
                checked={formFechamento.confirmo_revisao}
                onCheckedChange={(c) =>
                  setFormFechamento({ ...formFechamento, confirmo_revisao: !!c })
                }
              />
              <span className="text-sm font-medium">
                Confirmo que revisei todos os dados e autorizo o fechamento
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFecharModal(false)}>Cancelar</Button>
            <Button
              className="bg-success hover:bg-success/90"
              disabled={!formFechamento.confirmo_revisao || fechamentoLoading || profissionaisData.length === 0}
              onClick={() => setShowConfirmDialog(true)}
            >
              {fechamentoLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                <><Lock className="h-4 w-4 mr-2" /> Fechar Semana</>
              )}
            </Button>
          </DialogFooter>

          {fechamentoLoading && fechamentoProgress.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-1">
              {fechamentoProgress.map((p, i) => (
                <p key={i} className={`text-sm ${p.startsWith("✓") ? "text-success" : ""}`}>{p}</p>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirm Dialog ── */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Fechamento da Semana</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação criará um registro permanente. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFecharSemana} className="bg-success hover:bg-success/90">
              Confirmar Fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog Registrar Pagamento ── */}
      <Dialog open={showPagarDialog} onOpenChange={setShowPagarDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-success" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              {profParaPagar?.profissional.nome} — Líquido:{" "}
              {formatCurrency(profParaPagar?.valor_liquido ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Valor pago (R$)</Label>
            <Input
              type="number"
              step={0.01}
              min={0}
              value={valorPagoInput}
              onChange={(e) => setValorPagoInput(e.target.value)}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">
              Se o valor for igual ao líquido → status <strong>Pago</strong>. Se menor → <strong>Parcial</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagarDialog(false)}>Cancelar</Button>
            <Button
              className="bg-success hover:bg-success/90"
              disabled={pagandoLoading || !valorPagoInput || Number(valorPagoInput) <= 0}
              onClick={handleRegistrarPagamento}
            >
              {pagandoLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Banknote className="h-4 w-4 mr-2" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Histórico ── */}
      <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Fechamentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {historico.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum fechamento registrado ainda</p>
            ) : (
              historico.map((item) => (
                <Card key={item.id} className="cursor-pointer hover:border-primary transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          Semana {item.semana_numero}/{item.ano} — {format(parseISO(item.data_inicio), "dd/MM")} a{" "}
                          {format(parseISO(item.data_fim), "dd/MM/yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Fechado em{" "}
                          {item.fechado_em
                            ? format(parseISO(item.fechado_em), "dd/MM/yyyy 'às' HH:mm")
                            : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={item.status === "fechada" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600"}>
                          {item.status === "fechada" ? "FECHADA ✓" : "ABERTA"}
                        </Badge>
                        <p className="text-lg font-bold mt-1">{formatCurrency(item.total_liquido)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FechamentoSemanal;
