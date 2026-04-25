import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Percent,
  Users,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
  FileDown,
  Banknote,
  Eye,
  ChevronLeft,
  Scissors,
  User,
  AlertCircle,
  History,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Profissional {
  id: string;
  nome: string;
  foto_url: string | null;
  cor_agenda: string;
  comissao_padrao?: number;
}

interface ComissaoRegistro {
  id: string;
  profissional_id: string;
  atendimento_id: string | null;
  servico_id: string | null;
  servico_nome: string | null;
  valor_servico: number;
  percentual: number;
  valor_comissao: number;
  desconto_aplicado?: number;
  status: string;
  data_pagamento: string | null;
  periodo_ref: string | null;
  created_at: string;
  // Enriquecidos via join
  cliente_nome?: string | null;
  numero_comanda?: number | null;
  data_atendimento?: string;
}

interface Vale {
  id: string;
  profissional_id: string;
  valor_total: number;
  saldo_restante: number;
  motivo: string;
  status: string;
  data_lancamento: string;
}

interface PagamentoHistorico {
  id: string;
  profissional_id: string;
  profissional_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_bruto: number;
  valor_descontos: number;
  valor_liquido: number;
  qtd_itens: number;
  observacao: string | null;
  usuario_nome: string;
  created_at: string;
}

interface ResumoProf {
  profissional: Profissional;
  comissoes: ComissaoRegistro[];
  vales: Vale[];
  total_bruto: number;
  total_vales: number;
  total_liquido: number;
  total_pago: number;
  total_pendente_liquido: number;
  qtd_atendimentos: number;
}

type PeriodoFiltro = "hoje" | "semana" | "mes" | "mes_anterior" | "custom";
type Tela = "lista" | "extrato" | "historico";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Comissoes() {
  const { toast } = useToast();

  // Estado de navegação
  const [tela, setTela] = useState<Tela>("lista");
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<ResumoProf | null>(null);

  // Dados
  const [loading, setLoading] = useState(true);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [comissoes, setComissoes] = useState<ComissaoRegistro[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [historico, setHistorico] = useState<PagamentoHistorico[]>([]);

  // Filtros
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [customMes, setCustomMes] = useState(() => format(new Date(), "yyyy-MM"));
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroProf, setFiltroProf] = useState("todos");

  // Modal pagamento
  const [showPagarDialog, setShowPagarDialog] = useState(false);
  const [obsPagamento, setObsPagamento] = useState("");
  const [pagando, setPagando] = useState(false);

  // Seleção parcial
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (pendentes: ComissaoRegistro[]) => {
    if (selectedIds.size === pendentes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendentes.map(c => c.id)));
    }
  };

  // Range de datas
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodo) {
      case "hoje":
        return { from: new Date(new Date().setHours(0, 0, 0, 0)), to: new Date() };
      case "semana":
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case "mes":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "mes_anterior": {
        const m = subMonths(now, 1);
        return { from: startOfMonth(m), to: endOfMonth(m) };
      }
      case "custom": {
        const m = new Date(customMes + "-01");
        return { from: startOfMonth(m), to: endOfMonth(m) };
      }
    }
  }, [periodo, customMes]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Monta filtro correto por período:
      // Para mês/mês anterior usa periodo_ref (YYYY-MM) — evita problema de created_at desatualizado
      // Para hoje/semana usa created_at
      // Monta query de comissões sem join (atendimento_id não tem FK formal no banco)
      const db = supabase as any;
      let comissoesQuery = db
        .from("comissoes_registro")
        .select("*")
        .order("created_at", { ascending: false });

      if (periodo === "mes" || periodo === "mes_anterior" || periodo === "custom") {
        comissoesQuery = comissoesQuery.eq("periodo_ref", format(dateRange.from, "yyyy-MM"));
      } else {
        comissoesQuery = comissoesQuery
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());
      }

      const [profsRes, comissoesRes, valesRes] = await Promise.all([
        supabase
          .from("profissionais")
          .select("id, nome, foto_url, cor_agenda, comissao_padrao")
          .eq("ativo", true)
          .order("nome"),

        comissoesQuery,

        supabase
          .from("vales")
          .select("*")
          .in("status", ["aberto", "parcial"])
          .order("data_lancamento", { ascending: false }),
      ]);

      if (profsRes.data) setProfissionais(profsRes.data as Profissional[]);

      if (comissoesRes.data && comissoesRes.data.length > 0) {
        // Buscar dados de atendimento separadamente para enriquecer com cliente e comanda
        const atendimentoIds = [...new Set(
          (comissoesRes.data as any[])
            .map((c: any) => c.atendimento_id)
            .filter(Boolean)
        )];

        let atendimentoMap: Record<string, { numero_comanda: number; cliente_nome: string; data_atendimento: string }> = {};

        if (atendimentoIds.length > 0) {
          const { data: atendimentos } = await supabase
            .from("atendimentos")
            .select("id, numero_comanda, created_at, status, cliente_id, clientes:cliente_id(nome)")
            .in("id", atendimentoIds);

          if (atendimentos) {
            // IDs de comandas ainda abertas — essas SIM devem ser ocultadas
            const abertosIds = new Set(
              (atendimentos as any[])
                .filter((a) => a.status === "aberto")
                .map((a) => a.id)
            );

            atendimentoMap = Object.fromEntries(
              (atendimentos as any[])
                .filter((a) => a.status !== "aberto")
                .map((a) => [
                  a.id,
                  {
                    numero_comanda: a.numero_comanda,
                    cliente_nome: (a.clientes as any)?.nome || null,
                    data_atendimento: a.created_at,
                  },
                ])
            );

            // Remover comissões de comandas explicitamente abertas
            (comissoesRes.data as any[]).forEach((c) => {
              if (abertosIds.has(c.atendimento_id)) {
                // marca para filtrar
                c.__aberto = true;
              }
            });
          }
        }

        const enriquecidas = (comissoesRes.data as any[])
          .filter((c) => !c.__aberto)
          .map((c) => ({
            ...c,
            cliente_nome: atendimentoMap[c.atendimento_id]?.cliente_nome || null,
            numero_comanda: atendimentoMap[c.atendimento_id]?.numero_comanda || null,
            data_atendimento: atendimentoMap[c.atendimento_id]?.data_atendimento || c.created_at,
          })) as ComissaoRegistro[];

        setComissoes(enriquecidas);
      } else {
        setComissoes([]);
      }

      if (valesRes.data) setVales(valesRes.data as Vale[]);
    } catch (err) {
      console.error("Erro ao buscar comissões:", err);
      setComissoes([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, periodo]);

  const fetchHistorico = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("pagamentos_comissao")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) setHistorico(data as PagamentoHistorico[]);
    } catch {
      setHistorico([]);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (tela === "historico") fetchHistorico(); }, [tela, fetchHistorico]);

  // ── Cálculo do resumo ──────────────────────────────────────────────────────
  const resumos = useMemo((): ResumoProf[] => {
    return profissionais.map((prof) => {
      const comissoesProf = comissoes.filter((c) => c.profissional_id === prof.id);
      const valesProf = vales.filter((v) => v.profissional_id === prof.id);

      const pendentes = comissoesProf.filter((c) => c.status === "pendente");
      const pagas = comissoesProf.filter((c) => c.status === "pago");

      const bruto_pendente = pendentes.reduce((s, c) => s + Number(c.valor_comissao), 0);
      const total_vales_prof = valesProf.reduce((s, v) => s + Number(v.saldo_restante || 0), 0);
      const liquido_pendente = Math.max(0, bruto_pendente - total_vales_prof);

      return {
        profissional: prof,
        comissoes: comissoesProf,
        vales: valesProf,
        total_bruto: comissoesProf.reduce((s, c) => s + Number(c.valor_comissao), 0),
        total_vales: total_vales_prof,
        total_liquido: comissoesProf.reduce((s, c) => s + Number(c.valor_comissao), 0) - total_vales_prof,
        total_pago: pagas.reduce((s, c) => s + Number(c.valor_comissao), 0),
        total_pendente_liquido: liquido_pendente,
        qtd_atendimentos: new Set(comissoesProf.map((c) => c.atendimento_id)).size,
      };
    }).filter((r) => r.comissoes.length > 0);
  }, [profissionais, comissoes, vales]);

  const totaisGerais = useMemo(() => ({
    bruto: resumos.reduce((s, r) => s + r.total_bruto, 0),
    vales: resumos.reduce((s, r) => s + r.total_vales, 0),
    pendente: resumos.reduce((s, r) => s + r.total_pendente_liquido, 0),
    pago: resumos.reduce((s, r) => s + r.total_pago, 0),
  }), [resumos]);

  const resumosFiltrados = useMemo(() => {
    let r = resumos;
    if (searchQuery) r = r.filter((x) => x.profissional.nome.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filtroProf !== "todos") r = r.filter((x) => x.profissional.id === filtroProf);
    return r;
  }, [resumos, searchQuery, filtroProf]);

  const periodoLabel = useMemo(() => {
    switch (periodo) {
      case "hoje": return "Hoje";
      case "semana": return "Esta Semana";
      case "mes": return format(new Date(), "MMMM yyyy", { locale: ptBR });
      case "mes_anterior": return format(subMonths(new Date(), 1), "MMMM yyyy", { locale: ptBR });
      case "custom": return format(new Date(customMes + "-01"), "MMMM yyyy", { locale: ptBR });
    }
  }, [periodo, customMes]);

  // ── Pagar ──────────────────────────────────────────────────────────────────
  const handlePagar = async () => {
    if (!profissionalSelecionado) return;
    setPagando(true);
    const r = profissionalSelecionado;
    try {
      // 1. Marcar comissões como pagas
      const todasPendentes = r.comissoes.filter((c) => c.status === "pendente");
      const pendentesIds = selectedIds.size > 0
        ? todasPendentes.filter(c => selectedIds.has(c.id)).map(c => c.id)
        : todasPendentes.map(c => c.id);

      if (pendentesIds.length === 0) {
        toast({ title: "Nenhuma comissão selecionada", variant: "destructive" });
        return;
      }

      const valorPago = todasPendentes
        .filter(c => pendentesIds.includes(c.id))
        .reduce((s, c) => s + Number(c.valor_comissao), 0);

      const { error } = await (supabase as any)
        .from("comissoes_registro")
        .update({ status: "pago", data_pagamento: new Date().toISOString() })
        .in("id", pendentesIds);

      if (error) throw error;

      // 2. Registrar no histórico (tabela pagamentos_comissao — cria silenciosamente se não existir)
      await (supabase as any).from("pagamentos_comissao").insert([{
        profissional_id: r.profissional.id,
        profissional_nome: r.profissional.nome,
        periodo_inicio: dateRange.from.toISOString(),
        periodo_fim: dateRange.to.toISOString(),
        valor_bruto: r.total_bruto,
        valor_descontos: r.total_vales,
        valor_liquido: valorPago,
        qtd_itens: pendentesIds.length,
        observacao: obsPagamento || null,
        usuario_nome: localStorage.getItem("usuario_nome") || "Admin",
      }]).select();

      toast({
        title: `✅ Pagamento registrado!`,
        description: `${r.profissional.nome} — ${fmt(valorPago)}`,
      });
      setSelectedIds(new Set());

      setShowPagarDialog(false);
      setObsPagamento("");
      await fetchData();
    } catch (err: any) {
      toast({ title: "Erro ao registrar pagamento", description: err.message, variant: "destructive" });
    } finally {
      setPagando(false);
    }
  };

  // ── Exportar Excel ─────────────────────────────────────────────────────────
  const exportarExcel = () => {
    if (tela === "extrato" && profissionalSelecionado) {
      const rows = profissionalSelecionado.comissoes.map((c) => ({
        Data: format(parseISO(c.data_atendimento || c.created_at), "dd/MM/yyyy HH:mm"),
        Comanda: c.numero_comanda ? `#${c.numero_comanda}` : "—",
        Cliente: c.cliente_nome || "—",
        Serviço: c.servico_nome || "—",
        "Valor Serviço": c.valor_servico,
        "Desc. Cliente": c.desconto_aplicado ?? 0,
        "%": c.percentual,
        "Comissão": c.valor_comissao,
        Status: c.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Extrato");
      XLSX.writeFile(wb, `extrato_${profissionalSelecionado.profissional.nome.replace(/\s/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    } else {
      const rows = resumosFiltrados.map((r) => ({
        Profissional: r.profissional.nome,
        Atendimentos: r.qtd_atendimentos,
        "Comissão Bruta": r.total_bruto,
        "Vales/Descontos": r.total_vales,
        "Líquido a Pagar": r.total_pendente_liquido,
        "Já Pago": r.total_pago,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Comissões");
      XLSX.writeFile(wb, `comissoes_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    }
    toast({ title: "📥 Exportado com sucesso!" });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: EXTRATO DETALHADO
  // ─────────────────────────────────────────────────────────────────────────
  if (tela === "extrato" && profissionalSelecionado) {
    const r = profissionalSelecionado;
    const pendentes = r.comissoes.filter((c) => c.status === "pendente");
    const pagas = r.comissoes.filter((c) => c.status === "pago");
    const comissoesOrdenadas = [...pendentes, ...pagas];
    const totalSelecionado = pendentes
      .filter(c => selectedIds.has(c.id))
      .reduce((s, c) => s + Number(c.valor_comissao), 0);
    const valorBotao = selectedIds.size > 0 ? totalSelecionado : r.total_pendente_liquido;
    const labelBotao = selectedIds.size > 0
      ? `Pagar Selecionados ${fmt(totalSelecionado)}`
      : `Pagar ${fmt(r.total_pendente_liquido)}`;

    return (
      <div className="space-y-6">
        {/* Header extrato */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setTela("lista")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-12 w-12 border-2" style={{ borderColor: r.profissional.cor_agenda }}>
              <AvatarImage src={r.profissional.foto_url || undefined} />
              <AvatarFallback style={{ backgroundColor: r.profissional.cor_agenda + "20", color: r.profissional.cor_agenda }}>
                {initials(r.profissional.nome)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{r.profissional.nome}</h1>
              <p className="text-sm text-muted-foreground">Extrato de Comissões • {periodoLabel}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exportarExcel}>
            <FileDown className="h-4 w-4 mr-1" /> Excel
          </Button>
          {r.total_pendente_liquido > 0 && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowPagarDialog(true)}
            >
              <Banknote className="h-4 w-4 mr-1" />
              {labelBotao}
            </Button>
          )}
        </div>

        {/* Cards resumo do extrato */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Comissão Bruta</p>
              <p className="text-xl font-bold">{fmt(r.total_bruto)}</p>
              <p className="text-xs text-muted-foreground">{r.comissoes.length} itens</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Vales / Descontos</p>
              <p className="text-xl font-bold text-destructive">- {fmt(r.total_vales)}</p>
              <p className="text-xs text-muted-foreground">{r.vales.length} vale(s) aberto(s)</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-xl font-bold text-amber-600">{fmt(r.total_pendente_liquido)}</p>
              <p className="text-xs text-muted-foreground">{pendentes.length} itens</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Já Pago</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(r.total_pago)}</p>
              <p className="text-xs text-muted-foreground">{pagas.length} itens</p>
            </CardContent>
          </Card>
        </div>

        {/* Vales em aberto */}
        {r.vales.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Vales em Aberto (serão descontados do pagamento)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {r.vales.map((v) => (
                  <div key={v.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{v.motivo} — {format(parseISO(v.data_lancamento), "dd/MM/yyyy")}</span>
                    <span className="font-medium text-orange-600">- {fmt(Number(v.saldo_restante))}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela detalhada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento por Serviço</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      {pendentes.length > 0 && (
                        <Checkbox
                          checked={selectedIds.size === pendentes.length && pendentes.length > 0}
                          onCheckedChange={() => toggleSelectAll(pendentes)}
                        />
                      )}
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Comanda</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Val. Serviço</TableHead>
                    <TableHead className="text-right text-destructive">Desc. Cliente</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comissoesOrdenadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                        Nenhuma comissão no período
                      </TableCell>
                    </TableRow>
                  ) : (
                    comissoesOrdenadas.map((c) => (
                      <TableRow
                        key={c.id}
                        className={c.status === "pendente" && selectedIds.has(c.id) ? "bg-green-50 dark:bg-green-950/20" : ""}
                      >
                        <TableCell>
                          {c.status === "pendente" && (
                            <Checkbox
                              checked={selectedIds.has(c.id)}
                              onCheckedChange={() => toggleSelected(c.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(parseISO(c.data_atendimento || c.created_at), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {c.numero_comanda ? `#${String(c.numero_comanda).padStart(3, "0")}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[120px] truncate">
                          {c.cliente_nome || <span className="text-muted-foreground italic">Avulso</span>}
                        </TableCell>
                        <TableCell className="text-sm flex items-center gap-1">
                          <Scissors className="h-3 w-3 text-muted-foreground shrink-0" />
                          {c.servico_nome || "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm">{fmt(Number(c.valor_servico))}</TableCell>
                        <TableCell className="text-right text-sm text-destructive">
                          {Number(c.desconto_aplicado ?? 0) > 0 ? `- ${fmt(Number(c.desconto_aplicado))}` : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">{c.percentual}%</TableCell>
                        <TableCell className="text-right text-sm font-bold text-green-600">
                          {fmt(Number(c.valor_comissao))}
                        </TableCell>
                        <TableCell className="text-center">
                          {c.status === "pago" ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Pago
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                              <Clock className="h-3 w-3 mr-1" /> Pendente
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Modal Pagamento */}
        <Dialog open={showPagarDialog} onOpenChange={setShowPagarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>💰 Confirmar Pagamento</DialogTitle>
              <DialogDescription>
                Esta ação será registrada no histórico de pagamentos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Profissional:</span>
                  <span className="font-semibold">{r.profissional.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span>Período:</span>
                  <span>{periodoLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comissão Bruta:</span>
                  <span className="font-medium">{fmt(r.total_bruto)}</span>
                </div>
                {r.total_vales > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Vales / Descontos:</span>
                    <span>- {fmt(r.total_vales)}</span>
                  </div>
                )}
                {selectedIds.size > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Itens selecionados:</span>
                    <span>{selectedIds.size} de {pendentes.length}</span>
                  </div>
                )}
                <div className="h-px bg-border" />
                <div className="flex justify-between text-base">
                  <span className="font-bold">{selectedIds.size > 0 ? "Pagamento Parcial:" : "Líquido a Pagar:"}</span>
                  <span className="font-bold text-green-600">{fmt(valorBotao)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Observação (opcional)</Label>
                <Textarea
                  placeholder="Ex: Pagamento via PIX, quinzena de abril..."
                  value={obsPagamento}
                  onChange={(e) => setObsPagamento(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPagarDialog(false)} disabled={pagando}>
                Cancelar
              </Button>
              <Button onClick={handlePagar} disabled={pagando} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {pagando ? "Registrando..." : "Confirmar Pagamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: HISTÓRICO DE PAGAMENTOS
  // ─────────────────────────────────────────────────────────────────────────
  if (tela === "historico") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setTela("lista")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <History className="h-5 w-5" /> Histórico de Pagamentos
            </h1>
            <p className="text-sm text-muted-foreground">Todos os pagamentos de comissões registrados</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchHistorico}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Descontos</TableHead>
                  <TableHead className="text-right">Líquido Pago</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      Nenhum pagamento registrado ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  historico.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(parseISO(h.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{h.profissional_nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(h.periodo_inicio), "dd/MM")} – {format(parseISO(h.periodo_fim), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-center text-sm">{h.qtd_itens}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(Number(h.valor_bruto))}</TableCell>
                      <TableCell className="text-right text-sm text-destructive">
                        {Number(h.valor_descontos) > 0 ? `- ${fmt(Number(h.valor_descontos))}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {fmt(Number(h.valor_liquido))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> {h.usuario_nome}
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
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: LISTA PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Percent className="h-7 w-7 text-primary" />
            Comissões
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Valores a pagar por profissional • {periodoLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTela("historico")}>
            <History className="h-4 w-4 mr-1" /> Histórico
          </Button>
          <Button variant="outline" size="sm" onClick={exportarExcel}>
            <FileDown className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Cards totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Comissão Bruta</p>
                <p className="text-lg font-bold truncate">{fmt(totaisGerais.bruto)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Vales/Descontos</p>
                <p className="text-lg font-bold text-orange-600 truncate">- {fmt(totaisGerais.vales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">A Pagar (Líquido)</p>
                <p className="text-lg font-bold text-amber-600 truncate">{fmt(totaisGerais.pendente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Já Pago</p>
                <p className="text-lg font-bold text-emerald-600 truncate">{fmt(totaisGerais.pago)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar profissional..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                  <SelectItem value="custom">Escolher Mês...</SelectItem>
                </SelectContent>
              </Select>
              {periodo === "custom" && (
                <Input
                  type="month"
                  value={customMes}
                  onChange={(e) => setCustomMes(e.target.value)}
                  className="w-[160px]"
                />
              )}
            </div>
            <Select value={filtroProf} onValueChange={setFiltroProf}>
              <SelectTrigger className="w-[200px]">
                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profissionais.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela por profissional */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3" />
            Carregando comissões...
          </CardContent>
        </Card>
      ) : resumosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Percent className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma comissão encontrada no período</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              As comissões são geradas automaticamente ao fechar comandas
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-center">Atendimentos</TableHead>
                  <TableHead className="text-right">Comissão Bruta</TableHead>
                  <TableHead className="text-right">Vales</TableHead>
                  <TableHead className="text-right">Líquido a Pagar</TableHead>
                  <TableHead className="text-right">Já Pago</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumosFiltrados.map((r) => (
                  <TableRow key={r.profissional.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 border" style={{ borderColor: r.profissional.cor_agenda }}>
                          <AvatarImage src={r.profissional.foto_url || undefined} />
                          <AvatarFallback className="text-xs" style={{ backgroundColor: r.profissional.cor_agenda + "20", color: r.profissional.cor_agenda }}>
                            {initials(r.profissional.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{r.profissional.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{r.qtd_atendimentos}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmt(r.total_bruto)}</TableCell>
                    <TableCell className="text-right text-sm text-orange-600">
                      {r.total_vales > 0 ? `- ${fmt(r.total_vales)}` : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-600">{fmt(r.total_pendente_liquido)}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-600">{fmt(r.total_pago)}</TableCell>
                    <TableCell className="text-center">
                      {r.total_pendente_liquido > 0 ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                          Pendente
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">
                          Pago
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setProfissionalSelecionado(r);
                            setTela("extrato");
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Extrato
                        </Button>
                        {r.total_pendente_liquido > 0 && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setProfissionalSelecionado(r);
                              setShowPagarDialog(true);
                            }}
                          >
                            <Banknote className="h-3.5 w-3.5 mr-1" /> Pagar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal Pagamento (a partir da lista) */}
      <Dialog open={showPagarDialog} onOpenChange={setShowPagarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>💰 Confirmar Pagamento</DialogTitle>
            <DialogDescription>Esta ação será registrada no histórico de pagamentos.</DialogDescription>
          </DialogHeader>
          {profissionalSelecionado && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Profissional:</span>
                  <span className="font-semibold">{profissionalSelecionado.profissional.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span>Período:</span>
                  <span>{periodoLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comissão Bruta:</span>
                  <span>{fmt(profissionalSelecionado.total_bruto)}</span>
                </div>
                {profissionalSelecionado.total_vales > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Vales / Descontos:</span>
                    <span>- {fmt(profissionalSelecionado.total_vales)}</span>
                  </div>
                )}
                <div className="h-px bg-border" />
                <div className="flex justify-between text-base">
                  <span className="font-bold">Líquido a Pagar:</span>
                  <span className="font-bold text-green-600">{fmt(profissionalSelecionado.total_pendente_liquido)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Observação (opcional)</Label>
                <Textarea
                  placeholder="Ex: Pagamento via PIX, quinzena de abril..."
                  value={obsPagamento}
                  onChange={(e) => setObsPagamento(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagarDialog(false)} disabled={pagando}>
              Cancelar
            </Button>
            <Button onClick={handlePagar} disabled={pagando} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {pagando ? "Registrando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
