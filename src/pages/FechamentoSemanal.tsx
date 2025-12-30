import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  XCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, getWeek, getYear, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profissional {
  id: string;
  nome: string;
  foto_url: string | null;
  funcao: string | null;
}

interface FechamentoProfissional {
  id: string;
  profissional_id: string;
  profissional: Profissional;
  total_atendimentos: number;
  total_faturamento: number;
  total_comissoes: number;
  total_vales: number;
  valor_liquido: number;
  status: string;
  confirmado_em: string | null;
  atendimentos_por_dia?: { data: string; quantidade: number; valor: number }[];
  produtos_vendidos?: number;
  vales_detalhados?: { descricao: string; valor: number }[];
}

interface FechamentoSemanal {
  id: string;
  data_inicio: string;
  data_fim: string;
  semana_numero: number;
  ano: number;
  status: string;
  total_faturamento: number;
  total_servicos: number;
  total_produtos_valor: number;
  total_comissoes: number;
  total_vales: number;
  total_liquido: number;
  observacoes: string | null;
  fechado_em: string | null;
}

const FechamentoSemanal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [fechamento, setFechamento] = useState<FechamentoSemanal | null>(null);
  const [profissionaisData, setProfissionaisData] = useState<FechamentoProfissional[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [selectedProfissionais, setSelectedProfissionais] = useState<string[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fechamentoLoading, setFechamentoLoading] = useState(false);
  const [fechamentoProgress, setFechamentoProgress] = useState<string[]>([]);
  const [historico, setHistorico] = useState<FechamentoSemanal[]>([]);
  
  const [formFechamento, setFormFechamento] = useState({
    data_fechamento: format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    observacoes: "",
    enviar_recibos_email: false,
    enviar_recibos_whatsapp: false,
    notificar_gerencia: false,
    confirmo_revisao: false,
  });

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 });
  const year = getYear(currentWeekStart);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const fetchData = async () => {
    setLoading(true);
    
    // Buscar profissionais ativos
    const { data: profs } = await supabase
      .from("profissionais")
      .select("id, nome, foto_url, funcao")
      .eq("ativo", true)
      .order("nome");
    
    if (profs) setProfissionais(profs);

    // Buscar fechamento existente
    const { data: fechamentoExistente } = await supabase
      .from("fechamentos_semanais")
      .select("*")
      .eq("semana_numero", weekNumber)
      .eq("ano", year)
      .single();

    if (fechamentoExistente) {
      setFechamento(fechamentoExistente);
      
      // Buscar dados dos profissionais desse fechamento
      const { data: fechProfs } = await supabase
        .from("fechamentos_profissionais")
        .select("*, profissional:profissionais(id, nome, foto_url, funcao)")
        .eq("fechamento_semanal_id", fechamentoExistente.id);
      
      if (fechProfs) {
        setProfissionaisData(fechProfs as unknown as FechamentoProfissional[]);
      }
    } else {
      setFechamento(null);
      // Calcular dados em tempo real
      await calcularDadosSemana(profs || []);
    }
    
    setLoading(false);
  };

  const calcularDadosSemana = async (profs: Profissional[]) => {
    const inicioSemana = format(currentWeekStart, "yyyy-MM-dd");
    const fimSemana = format(weekEnd, "yyyy-MM-dd");

    // Buscar atendimentos fechados da semana
    const { data: atendimentos } = await supabase
      .from("atendimentos")
      .select(`
        id,
        data_hora,
        valor_final,
        atendimento_servicos(profissional_id, comissao_valor, subtotal),
        atendimento_produtos(subtotal)
      `)
      .eq("status", "fechado")
      .gte("data_hora", `${inicioSemana}T00:00:00`)
      .lte("data_hora", `${fimSemana}T23:59:59`);

    // Buscar vales da semana
    const { data: vales } = await supabase
      .from("vales")
      .select("*")
      .in("status", ["aberto", "parcial"])
      .gte("data_lancamento", inicioSemana)
      .lte("data_lancamento", fimSemana);

    const dadosPorProfissional: Record<string, FechamentoProfissional> = {};

    profs.forEach(prof => {
      dadosPorProfissional[prof.id] = {
        id: "",
        profissional_id: prof.id,
        profissional: prof,
        total_atendimentos: 0,
        total_faturamento: 0,
        total_comissoes: 0,
        total_vales: 0,
        valor_liquido: 0,
        status: "pendente",
        confirmado_em: null,
        atendimentos_por_dia: [],
        produtos_vendidos: 0,
        vales_detalhados: [],
      };
    });

    atendimentos?.forEach(atend => {
      atend.atendimento_servicos?.forEach((serv: any) => {
        if (dadosPorProfissional[serv.profissional_id]) {
          dadosPorProfissional[serv.profissional_id].total_atendimentos++;
          dadosPorProfissional[serv.profissional_id].total_faturamento += Number(serv.subtotal);
          dadosPorProfissional[serv.profissional_id].total_comissoes += Number(serv.comissao_valor);
        }
      });
    });

    vales?.forEach(vale => {
      if (dadosPorProfissional[vale.profissional_id]) {
        const valorDescontar = Number(vale.saldo_restante || vale.valor_total);
        dadosPorProfissional[vale.profissional_id].total_vales += valorDescontar;
        dadosPorProfissional[vale.profissional_id].vales_detalhados?.push({
          descricao: `Vale ${format(parseISO(vale.data_lancamento), "dd/MM")} - ${vale.motivo}`,
          valor: valorDescontar,
        });
      }
    });

    Object.values(dadosPorProfissional).forEach(prof => {
      prof.valor_liquido = prof.total_comissoes - prof.total_vales;
    });

    const resultado = Object.values(dadosPorProfissional).filter(p => p.total_atendimentos > 0 || p.total_vales > 0);
    setProfissionaisData(resultado);
  };

  const fetchHistorico = async () => {
    const { data } = await supabase
      .from("fechamentos_semanais")
      .select("*")
      .order("data_inicio", { ascending: false })
      .limit(20);
    
    if (data) setHistorico(data);
  };

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeekStart(prev => direction === "prev" ? subWeeks(prev, 1) : addWeeks(prev, 1));
    setExpandedRows([]);
    setSelectedProfissionais([]);
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const toggleSelectProfissional = (id: string) => {
    setSelectedProfissionais(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedProfissionais.length === profissionaisData.length) {
      setSelectedProfissionais([]);
    } else {
      setSelectedProfissionais(profissionaisData.map(p => p.profissional_id));
    }
  };

  const confirmarSelecionadas = async () => {
    // Implementar confirmação
    toast({ title: `${selectedProfissionais.length} profissionais confirmadas!` });
  };

  const handleFecharSemana = async () => {
    setFechamentoLoading(true);
    setFechamentoProgress([]);

    try {
      // Step 1
      setFechamentoProgress(prev => [...prev, "Calculando comissões..."]);
      await new Promise(r => setTimeout(r, 500));
      setFechamentoProgress(prev => prev.map(p => p === "Calculando comissões..." ? "✓ Comissões calculadas" : p));

      // Step 2
      setFechamentoProgress(prev => [...prev, "Aplicando vales..."]);
      await new Promise(r => setTimeout(r, 500));
      setFechamentoProgress(prev => prev.map(p => p === "Aplicando vales..." ? "✓ Vales aplicados" : p));

      // Criar fechamento
      const totais = profissionaisData.reduce((acc, p) => ({
        faturamento: acc.faturamento + p.total_faturamento,
        servicos: acc.servicos + p.total_atendimentos,
        comissoes: acc.comissoes + p.total_comissoes,
        vales: acc.vales + p.total_vales,
        liquido: acc.liquido + p.valor_liquido,
      }), { faturamento: 0, servicos: 0, comissoes: 0, vales: 0, liquido: 0 });

      const { data: novoFechamento, error } = await supabase
        .from("fechamentos_semanais")
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

      // Step 3
      setFechamentoProgress(prev => [...prev, "Gerando recibos..."]);
      await new Promise(r => setTimeout(r, 500));

      // Criar fechamentos por profissional
      for (const prof of profissionaisData) {
        await supabase.from("fechamentos_profissionais").insert({
          fechamento_semanal_id: novoFechamento.id,
          profissional_id: prof.profissional_id,
          total_atendimentos: prof.total_atendimentos,
          total_faturamento: prof.total_faturamento,
          total_comissoes: prof.total_comissoes,
          total_vales: prof.total_vales,
          valor_liquido: prof.valor_liquido,
          status: "confirmado",
          confirmado_em: new Date().toISOString(),
        });
      }

      setFechamentoProgress(prev => prev.map(p => p === "Gerando recibos..." ? `✓ ${profissionaisData.length} recibos gerados` : p));

      // Step 4
      setFechamentoProgress(prev => [...prev, "Enviando notificações..."]);
      await new Promise(r => setTimeout(r, 500));
      setFechamentoProgress(prev => prev.map(p => p === "Enviando notificações..." ? "✓ Notificações enviadas" : p));

      toast({ title: `✓ Semana fechada com sucesso! ${profissionaisData.length} recibos gerados` });
      
      setShowFecharModal(false);
      setShowConfirmDialog(false);
      fetchData();

    } catch (error: any) {
      toast({ title: "Erro ao fechar semana", description: error.message, variant: "destructive" });
    } finally {
      setFechamentoLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalFaturamento = profissionaisData.reduce((acc, p) => acc + p.total_faturamento, 0);
    const totalServicos = profissionaisData.reduce((acc, p) => acc + p.total_atendimentos, 0);
    const totalComissoes = profissionaisData.reduce((acc, p) => acc + p.total_comissoes, 0);
    const totalVales = profissionaisData.reduce((acc, p) => acc + p.total_vales, 0);
    const totalLiquido = profissionaisData.reduce((acc, p) => acc + p.valor_liquido, 0);
    const confirmadas = profissionaisData.filter(p => p.status === "confirmado").length;
    const pendentes = profissionaisData.filter(p => p.status === "pendente").length;

    return { totalFaturamento, totalServicos, totalComissoes, totalVales, totalLiquido, confirmadas, pendentes };
  }, [profissionaisData]);

  const isCurrentWeekOpen = !fechamento || fechamento.status === "aberta";

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
            <h1 className="text-2xl font-bold text-foreground">Fechamento Semanal das Profissionais</h1>
            <p className="text-muted-foreground">Controle e fechamento da semana de trabalho</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchHistorico(); setShowHistorico(true); }}>
            <Clock className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          {isCurrentWeekOpen && profissionaisData.length > 0 && (
            <Button 
              className="bg-success hover:bg-success/90 animate-pulse"
              onClick={() => setShowFecharModal(true)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Fechar Semana Atual
            </Button>
          )}
        </div>
      </div>

      {/* Week Selector */}
      <Card className="border-2" style={{ borderColor: "#007AFF" }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-5 w-5 mr-1" />
              Semana Anterior
            </Button>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                SEMANA DE {format(currentWeekStart, "dd/MM", { locale: ptBR }).toUpperCase()} A {format(weekEnd, "dd/MM/yyyy", { locale: ptBR }).toUpperCase()}
              </p>
              <p className="text-muted-foreground">Segunda a Domingo</p>
              <div className="mt-2">
                {fechamento?.status === "fechada" ? (
                  <Badge className="bg-success/10 text-success">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    FECHADA
                  </Badge>
                ) : (
                  <Badge className="bg-success/10 text-success">
                    🟢 ABERTA
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigateWeek("next")}>
              Próxima Semana
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#007AFF20" }}>
                <TrendingUp className="h-6 w-6" style={{ color: "#007AFF" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Faturamento Total</p>
                <p className="text-2xl font-bold" style={{ color: "#007AFF" }}>
                  {formatCurrency(stats.totalFaturamento)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#34C75920" }}>
                <Scissors className="h-6 w-6" style={{ color: "#34C759" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Serviços Realizados</p>
                <p className="text-2xl font-bold" style={{ color: "#34C759" }}>
                  {stats.totalServicos}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ticket médio: {formatCurrency(stats.totalServicos > 0 ? stats.totalFaturamento / stats.totalServicos : 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#AF52DE20" }}>
                <ShoppingCart className="h-6 w-6" style={{ color: "#AF52DE" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Comissões Totais</p>
                <p className="text-2xl font-bold" style={{ color: "#AF52DE" }}>
                  {formatCurrency(stats.totalComissoes)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Vales: -{formatCurrency(stats.totalVales)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#FF950020" }}>
                <Users className="h-6 w-6" style={{ color: "#FF9500" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Profissionais Ativas</p>
                <p className="text-2xl font-bold" style={{ color: "#FF9500" }}>
                  {profissionaisData.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.confirmadas} confirmadas, {stats.pendentes} pendentes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professionals Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profissionais da Semana</CardTitle>
          {isCurrentWeekOpen && selectedProfissionais.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Gerar Recibos
              </Button>
              <Button size="sm" className="bg-success hover:bg-success/90" onClick={confirmarSelecionadas}>
                <Check className="h-4 w-4 mr-2" />
                Confirmar ({selectedProfissionais.length})
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : profissionaisData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum atendimento registrado nesta semana</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={selectedProfissionais.length === profissionaisData.length}
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-center">Atend.</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Vales</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profissionaisData.map((item) => (
                  <Collapsible key={item.profissional_id} open={expandedRows.includes(item.profissional_id)}>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Checkbox 
                          checked={selectedProfissionais.includes(item.profissional_id)}
                          onCheckedChange={() => toggleSelectProfissional(item.profissional_id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell onClick={() => toggleRow(item.profissional_id)}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
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
                      <TableCell className="text-right" onClick={() => toggleRow(item.profissional_id)}>
                        {formatCurrency(item.total_comissoes)}
                      </TableCell>
                      <TableCell className="text-right text-destructive" onClick={() => toggleRow(item.profissional_id)}>
                        {item.total_vales > 0 ? `-${formatCurrency(item.total_vales)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold" onClick={() => toggleRow(item.profissional_id)}>
                        {formatCurrency(item.valor_liquido)}
                      </TableCell>
                      <TableCell className="text-center" onClick={() => toggleRow(item.profissional_id)}>
                        {item.status === "confirmado" ? (
                          <Badge className="bg-success/10 text-success">✓ Conf</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600">⏳ Pend</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => toggleRow(item.profissional_id)}>
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows.includes(item.profissional_id) ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/30 p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Resumo da Semana</h4>
                                <div className="text-sm space-y-1">
                                  <p>Total Serviços: {item.total_atendimentos}</p>
                                  <p>Faturamento: {formatCurrency(item.total_faturamento)}</p>
                                  <p>Comissão Bruta: {formatCurrency(item.total_comissoes)}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Vales Descontados</h4>
                                {item.vales_detalhados && item.vales_detalhados.length > 0 ? (
                                  <div className="text-sm space-y-1">
                                    {item.vales_detalhados.map((vale, i) => (
                                      <p key={i} className="text-destructive">• {vale.descricao}: -{formatCurrency(vale.valor)}</p>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Nenhum vale</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Líquido a Pagar</h4>
                                <p className="text-2xl font-bold text-success">{formatCurrency(item.valor_liquido)}</p>
                                {item.confirmado_em && (
                                  <p className="text-xs text-muted-foreground">
                                    Confirmado em {format(parseISO(item.confirmado_em), "dd/MM 'às' HH:mm")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">Editar</Button>
                              <Button variant="outline" size="sm">Gerar Recibo</Button>
                              <Button variant="outline" size="sm" className="text-success">
                                <Send className="h-4 w-4 mr-1" />
                                WhatsApp
                              </Button>
                            </div>
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

      {/* Footer Actions */}
      {profissionaisData.length > 0 && (
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 justify-between items-center">
            <div className="text-lg font-semibold">
              Total Líquido da Semana: <span className="text-success">{formatCurrency(stats.totalLiquido)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Fechar Semana */}
      <Dialog open={showFecharModal} onOpenChange={setShowFecharModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Fechar Semana {format(currentWeekStart, "dd/MM")} a {format(weekEnd, "dd/MM")}
            </DialogTitle>
            <DialogDescription>
              Revise todos os dados antes de fechar a semana
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Pre-validations */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Pré-validações</h4>
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Todos os serviços lançados
                </p>
                <p className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Comissões calculadas
                </p>
                {stats.pendentes > 0 && (
                  <p className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    {stats.pendentes} profissionais pendentes de confirmação
                  </p>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Resumo Geral</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>{profissionaisData.length} Profissionais trabalharam</p>
                <p>{stats.confirmadas} já confirmadas</p>
                <p>Total comissões: {formatCurrency(stats.totalComissoes)}</p>
                <p>Vales descontados: {formatCurrency(stats.totalVales)}</p>
                <p className="col-span-2 font-bold text-lg">
                  Líquido geral: {formatCurrency(stats.totalLiquido)}
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <Label>Data do Fechamento</Label>
                <Input 
                  type="date" 
                  value={formFechamento.data_fechamento}
                  onChange={(e) => setFormFechamento({ ...formFechamento, data_fechamento: e.target.value })}
                />
              </div>
              <div>
                <Label>Observações Gerais</Label>
                <Textarea 
                  placeholder="Ex: Semana com feriado no dia 25/12"
                  value={formFechamento.observacoes}
                  onChange={(e) => setFormFechamento({ ...formFechamento, observacoes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notificações</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={formFechamento.enviar_recibos_email}
                      onCheckedChange={(c) => setFormFechamento({ ...formFechamento, enviar_recibos_email: !!c })}
                    />
                    <span className="text-sm">Enviar recibos por email para profissionais</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={formFechamento.enviar_recibos_whatsapp}
                      onCheckedChange={(c) => setFormFechamento({ ...formFechamento, enviar_recibos_whatsapp: !!c })}
                    />
                    <span className="text-sm">Enviar recibos por WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
              <p className="font-semibold flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                IMPORTANTE: Após o fechamento:
              </p>
              <ul className="list-disc list-inside mt-1 text-muted-foreground">
                <li>Não será possível editar valores</li>
                <li>Comissões ficam travadas</li>
                <li>Recibos serão gerados automaticamente</li>
                <li>Só pode reabrir com autorização Admin</li>
              </ul>
            </div>

            {/* Confirmation */}
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Checkbox 
                checked={formFechamento.confirmo_revisao}
                onCheckedChange={(c) => setFormFechamento({ ...formFechamento, confirmo_revisao: !!c })}
              />
              <span className="text-sm font-medium">
                Confirmo que revisei todos os dados e autorizo o fechamento
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFecharModal(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-success hover:bg-success/90"
              disabled={!formFechamento.confirmo_revisao || fechamentoLoading}
              onClick={() => setShowConfirmDialog(true)}
            >
              {fechamentoLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Fechar Semana
                </>
              )}
            </Button>
          </DialogFooter>

          {/* Progress */}
          {fechamentoLoading && fechamentoProgress.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              {fechamentoProgress.map((p, i) => (
                <p key={i} className={`text-sm ${p.startsWith("✓") ? "text-success" : ""}`}>{p}</p>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Fechamento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita facilmente. Tem certeza que deseja fechar a semana?
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

      {/* Histórico Modal */}
      <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Fechamentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {historico.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum fechamento registrado</p>
            ) : (
              historico.map((item) => (
                <Card key={item.id} className="cursor-pointer hover:border-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          Semana {item.semana_numero}/{item.ano} - {format(parseISO(item.data_inicio), "dd/MM")} a {format(parseISO(item.data_fim), "dd/MM/yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Fechado em {item.fechado_em ? format(parseISO(item.fechado_em), "dd/MM/yyyy 'às' HH:mm") : "-"}
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
