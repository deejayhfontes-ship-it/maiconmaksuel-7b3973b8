import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Coffee,
  Car,
  Package,
  Sparkles,
  MoreHorizontal,
  AlertTriangle,
  Users,
  DollarSign,
  FileText,
  Gift,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ComandasAbertasSection } from "@/components/caixa/ComandasAbertasSection";
import { AcoesRapidasSection } from "@/components/caixa/AcoesRapidasSection";

interface CaixaData {
  id: string;
  data_abertura: string;
  data_fechamento: string | null;
  valor_inicial: number;
  valor_final: number | null;
  status: string;
  observacoes_abertura: string | null;
}

interface Movimentacao {
  id: string;
  caixa_id: string;
  tipo: string;
  categoria: string | null;
  descricao: string;
  valor: number;
  forma_pagamento: string | null;
  data_hora: string;
}

interface DespesaRapida {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data_hora: string;
  pago_por: string;
}

interface ComissaoProfissional {
  id: string;
  nome: string;
  foto_url: string | null;
  cor_agenda: string;
  comissao_servicos: number;
  comissao_produtos: number;
  total_comissao: number;
  vales_abertos: number;
  comissao_liquida: number;
}

interface ValeProfissional {
  id: string;
  profissional_id: string;
  valor_total: number;
  saldo_restante: number;
  status: string;
  motivo: string;
  data_lancamento: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

const categoriasDespesa = [
  { value: "cafe", label: "Café/Lanche", icon: Coffee },
  { value: "transporte", label: "Transporte", icon: Car },
  { value: "material", label: "Material", icon: Package },
  { value: "limpeza", label: "Limpeza", icon: Sparkles },
  { value: "outros", label: "Outros", icon: MoreHorizontal },
];

const getCategoriaIcon = (categoria: string) => {
  const cat = categoriasDespesa.find((c) => c.value === categoria);
  return cat?.icon || MoreHorizontal;
};

const Caixa = () => {
  const [caixaAberto, setCaixaAberto] = useState<CaixaData | null>(null);
  const [ultimoCaixaFechado, setUltimoCaixaFechado] = useState<CaixaData | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [despesas, setDespesas] = useState<DespesaRapida[]>([]);
  const [comissoesProfissionais, setComissoesProfissionais] = useState<ComissaoProfissional[]>([]);
  const [valesProfissionais, setValesProfissionais] = useState<ValeProfissional[]>([]);
  const [descontarVales, setDescontarVales] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [tabAtiva, setTabAtiva] = useState("todas");

  // Modals
  const [isAbrirOpen, setIsAbrirOpen] = useState(false);
  const [isFecharOpen, setIsFecharOpen] = useState(false);
  const [isDespesaOpen, setIsDespesaOpen] = useState(false);
  const [isSangriaOpen, setIsSangriaOpen] = useState(false);
  const [isReforcoOpen, setIsReforcoOpen] = useState(false);

  // Form states
  const [valorInicial, setValorInicial] = useState(0);
  const [obsAbertura, setObsAbertura] = useState("");
  const [valorFechamento, setValorFechamento] = useState(0);
  const [obsFechamento, setObsFechamento] = useState("");
  const [despesaDesc, setDespesaDesc] = useState("");
  const [despesaCat, setDespesaCat] = useState("cafe");
  const [despesaValor, setDespesaValor] = useState(0);
  const [despesaPagoPor, setDespesaPagoPor] = useState("caixa");
  const [despesaObs, setDespesaObs] = useState("");
  const [sangriaValor, setSangriaValor] = useState(0);
  const [sangriaMotivo, setSangriaMotivo] = useState("");
  const [reforcoValor, setReforcoValor] = useState(0);
  const [reforcoMotivo, setReforcoMotivo] = useState("");

  const { toast } = useToast();

  const fetchCaixa = useCallback(async () => {
    setLoading(true);

    // Buscar caixa aberto
    const { data: aberto } = await supabase
      .from("caixa")
      .select("*")
      .eq("status", "aberto")
      .order("data_abertura", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (aberto) {
      setCaixaAberto(aberto);

      // Buscar movimentações do caixa aberto
      const { data: movs } = await supabase
        .from("caixa_movimentacoes")
        .select("*")
        .eq("caixa_id", aberto.id)
        .order("data_hora", { ascending: false });

      setMovimentacoes(movs || []);

      // Buscar despesas do dia
      const hoje = new Date();
      const inicioHoje = new Date(hoje.setHours(0, 0, 0, 0)).toISOString();
      const { data: desps } = await supabase
        .from("despesas_rapidas")
        .select("*")
        .gte("data_hora", inicioHoje)
        .order("data_hora", { ascending: false });

      setDespesas(desps || []);

      // Buscar comissões dos profissionais do dia (atendimentos finalizados)
      const fimHoje = new Date();
      fimHoje.setHours(23, 59, 59, 999);
      
      const { data: atendimentosHoje } = await supabase
        .from("atendimentos")
        .select("id")
        .eq("status", "finalizado")
        .gte("data_hora", inicioHoje)
        .lte("data_hora", fimHoje.toISOString());

      // Buscar vales abertos de todos os profissionais
      const { data: valesAbertos } = await supabase
        .from("vales")
        .select("*")
        .eq("status", "aberto");
      
      setValesProfissionais(valesAbertos || []);

      if (atendimentosHoje && atendimentosHoje.length > 0) {
        const atendimentoIds = atendimentosHoje.map(a => a.id);

        // Buscar serviços com comissões
        const { data: servicosComissoes } = await supabase
          .from("atendimento_servicos")
          .select(`
            profissional_id,
            comissao_valor,
            profissionais:profissional_id (
              id,
              nome,
              foto_url,
              cor_agenda
            )
          `)
          .in("atendimento_id", atendimentoIds);

        // Agrupar por profissional
        const comissoesMap = new Map<string, ComissaoProfissional>();
        
        servicosComissoes?.forEach((item: any) => {
          const prof = item.profissionais;
          if (!prof) return;
          
          if (!comissoesMap.has(prof.id)) {
            // Calcular vales abertos deste profissional
            const valesProf = (valesAbertos || []).filter(v => v.profissional_id === prof.id);
            const totalVales = valesProf.reduce((sum, v) => sum + Number(v.saldo_restante || 0), 0);
            
            comissoesMap.set(prof.id, {
              id: prof.id,
              nome: prof.nome,
              foto_url: prof.foto_url,
              cor_agenda: prof.cor_agenda,
              comissao_servicos: 0,
              comissao_produtos: 0,
              total_comissao: 0,
              vales_abertos: totalVales,
              comissao_liquida: 0,
            });
          }
          
          const existing = comissoesMap.get(prof.id)!;
          existing.comissao_servicos += Number(item.comissao_valor);
          existing.total_comissao += Number(item.comissao_valor);
          existing.comissao_liquida = existing.total_comissao - existing.vales_abertos;
        });

        setComissoesProfissionais(Array.from(comissoesMap.values()));
      } else {
        setComissoesProfissionais([]);
      }
    } else {
      setCaixaAberto(null);
      setMovimentacoes([]);
      setDespesas([]);
      setComissoesProfissionais([]);

      // Buscar último caixa fechado
      const { data: fechado } = await supabase
        .from("caixa")
        .select("*")
        .eq("status", "fechado")
        .order("data_fechamento", { ascending: false })
        .limit(1)
        .maybeSingle();

      setUltimoCaixaFechado(fechado);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCaixa();
  }, [fetchCaixa]);

  // Calcular totais
  const totais = useMemo(() => {
    const entradas = movimentacoes
      .filter((m) => m.tipo === "entrada" || m.tipo === "reforco")
      .reduce((acc, m) => acc + Number(m.valor), 0);

    const saidas = movimentacoes
      .filter((m) => m.tipo === "saida" || m.tipo === "sangria")
      .reduce((acc, m) => acc + Number(m.valor), 0);

    const valorInicialCaixa = Number(caixaAberto?.valor_inicial || 0);
    const saldo = valorInicialCaixa + entradas - saidas;

    const dinheiro = movimentacoes
      .filter((m) => m.forma_pagamento === "dinheiro" && m.tipo === "entrada")
      .reduce((acc, m) => acc + Number(m.valor), 0);

    const debito = movimentacoes
      .filter((m) => m.forma_pagamento === "debito" && m.tipo === "entrada")
      .reduce((acc, m) => acc + Number(m.valor), 0);

    const credito = movimentacoes
      .filter((m) => m.forma_pagamento === "credito" && m.tipo === "entrada")
      .reduce((acc, m) => acc + Number(m.valor), 0);

    const pix = movimentacoes
      .filter((m) => m.forma_pagamento === "pix" && m.tipo === "entrada")
      .reduce((acc, m) => acc + Number(m.valor), 0);

    const despesasTotal = despesas
      .filter((d) => d.pago_por === "caixa")
      .reduce((acc, d) => acc + Number(d.valor), 0);

    const saldoDinheiro = valorInicialCaixa + dinheiro - saidas;

    return { entradas, saidas, saldo, dinheiro, debito, credito, pix, despesasTotal, saldoDinheiro };
  }, [movimentacoes, despesas, caixaAberto]);

  const handleAbrirCaixa = async () => {
    const { data, error } = await supabase
      .from("caixa")
      .insert([{
        valor_inicial: valorInicial,
        observacoes_abertura: obsAbertura || null,
        status: "aberto",
      }])
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao abrir caixa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Caixa aberto com sucesso!" });
      setIsAbrirOpen(false);
      setValorInicial(0);
      setObsAbertura("");
      fetchCaixa();
    }
  };

  const handleFecharCaixa = async () => {
    if (!caixaAberto) return;

    const valorEsperado = totais.saldo;
    const diferenca = valorFechamento - valorEsperado;

    const { error } = await supabase
      .from("caixa")
      .update({
        status: "fechado",
        data_fechamento: new Date().toISOString(),
        valor_final: valorFechamento,
        valor_esperado: valorEsperado,
        diferenca: diferenca,
        observacoes_fechamento: obsFechamento || null,
      })
      .eq("id", caixaAberto.id);

    if (error) {
      toast({ title: "Erro ao fechar caixa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Caixa fechado com sucesso!" });
      setIsFecharOpen(false);
      setValorFechamento(0);
      setObsFechamento("");
      fetchCaixa();
    }
  };

  const handleAddDespesa = async () => {
    if (!despesaDesc || despesaValor <= 0) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    // Criar despesa rápida
    const { error: despError } = await supabase.from("despesas_rapidas").insert([{
      caixa_id: caixaAberto?.id || null,
      descricao: despesaDesc,
      categoria: despesaCat,
      valor: despesaValor,
      pago_por: despesaPagoPor,
      observacoes: despesaObs || null,
    }]);

    if (despError) {
      toast({ title: "Erro ao registrar despesa", description: despError.message, variant: "destructive" });
      return;
    }

    // Se pago do caixa, criar movimentação de saída
    if (despesaPagoPor === "caixa" && caixaAberto) {
      await supabase.from("caixa_movimentacoes").insert([{
        caixa_id: caixaAberto.id,
        tipo: "saida",
        categoria: "despesa",
        descricao: `Despesa: ${despesaDesc}`,
        valor: despesaValor,
        forma_pagamento: "dinheiro",
      }]);
    }

    toast({ title: "Despesa registrada!" });
    setIsDespesaOpen(false);
    setDespesaDesc("");
    setDespesaCat("cafe");
    setDespesaValor(0);
    setDespesaPagoPor("caixa");
    setDespesaObs("");
    fetchCaixa();
  };

  const handleSangria = async () => {
    if (!caixaAberto || sangriaValor <= 0 || !sangriaMotivo) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    if (sangriaValor > totais.saldoDinheiro) {
      toast({ title: "Valor maior que saldo em dinheiro", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("caixa_movimentacoes").insert([{
      caixa_id: caixaAberto.id,
      tipo: "sangria",
      categoria: "sangria",
      descricao: sangriaMotivo,
      valor: sangriaValor,
      forma_pagamento: "dinheiro",
    }]);

    if (error) {
      toast({ title: "Erro ao registrar sangria", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Sangria de ${formatPrice(sangriaValor)} registrada` });
      setIsSangriaOpen(false);
      setSangriaValor(0);
      setSangriaMotivo("");
      fetchCaixa();
    }
  };

  const handleReforco = async () => {
    if (!caixaAberto || reforcoValor <= 0 || !reforcoMotivo) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("caixa_movimentacoes").insert([{
      caixa_id: caixaAberto.id,
      tipo: "reforco",
      categoria: "reforco",
      descricao: reforcoMotivo,
      valor: reforcoValor,
      forma_pagamento: "dinheiro",
    }]);

    if (error) {
      toast({ title: "Erro ao registrar reforço", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Reforço de ${formatPrice(reforcoValor)} registrado` });
      setIsReforcoOpen(false);
      setReforcoValor(0);
      setReforcoMotivo("");
      fetchCaixa();
    }
  };

  const movimentacoesFiltradas = useMemo(() => {
    switch (tabAtiva) {
      case "entradas":
        return movimentacoes.filter((m) => m.tipo === "entrada" || m.tipo === "reforco");
      case "saidas":
        return movimentacoes.filter((m) => m.tipo === "saida" || m.tipo === "sangria");
      default:
        return movimentacoes;
    }
  }, [movimentacoes, tabAtiva]);

  // iOS Status Badges with icons
  const getTipoBadge = (tipo: string, categoria?: string | null) => {
    switch (tipo) {
      case "entrada":
        return (
          <Badge variant="success" className="gap-1">
            <DollarSign className="h-3 w-3" />
            Entrada
          </Badge>
        );
      case "saida":
        return (
          <Badge variant="destructive" className="gap-1">
            <ArrowUpCircle className="h-3 w-3" />
            Saída
          </Badge>
        );
      case "sangria":
        return (
          <Badge variant="warning" className="gap-1">
            <ArrowUpCircle className="h-3 w-3" />
            Sangria
          </Badge>
        );
      case "reforco":
        return (
          <Badge variant="info" className="gap-1">
            <ArrowDownCircle className="h-3 w-3" />
            Reforço
          </Badge>
        );
      default:
        if (categoria === "vale") {
          return (
            <Badge className="bg-purple-500 gap-1">
              <FileText className="h-3 w-3" />
              Vale
            </Badge>
          );
        }
        if (categoria === "gorjeta") {
          return (
            <Badge className="bg-pink-500 gap-1">
              <Gift className="h-3 w-3" />
              Gorjeta
            </Badge>
          );
        }
        return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // === CAIXA FECHADO ===
  if (!caixaAberto) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Caixa Fechado</h2>
                {ultimoCaixaFechado && (
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <p>
                      Último fechamento:{" "}
                      {format(parseISO(ultimoCaixaFechado.data_fechamento!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p>Saldo final: {formatPrice(Number(ultimoCaixaFechado.valor_final))}</p>
                  </div>
                )}
              </div>
              <Button
                size="lg"
                className="w-full bg-success hover:bg-success/90 text-lg h-14"
                onClick={() => setIsAbrirOpen(true)}
              >
                <Unlock className="h-5 w-5 mr-2" />
                Abrir Novo Caixa
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Modal Abertura */}
        <Dialog open={isAbrirOpen} onOpenChange={setIsAbrirOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abertura de Caixa</DialogTitle>
              <DialogDescription>
                {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Valor Inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0,00"
                  value={valorInicial || ""}
                  onChange={(e) => setValorInicial(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Ex: Troco para o dia, fundo inicial..."
                  value={obsAbertura}
                  onChange={(e) => setObsAbertura(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsAbrirOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-success hover:bg-success/90" onClick={handleAbrirCaixa}>
                  Abrir Caixa
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === CAIXA ABERTO ===
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-green-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-[pulse_1s_ease-in-out_infinite]">
            <div className="w-3 h-3 bg-white rounded-full animate-[ping_1s_ease-in-out_infinite]" />
            <span className="font-semibold">CAIXA ABERTO</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Aberto às {format(parseISO(caixaAberto.data_abertura), "HH:mm", { locale: ptBR })}</span>
            </div>
            <p>Valor inicial: {formatPrice(Number(caixaAberto.valor_inicial))}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold" 
            onClick={() => setIsDespesaOpen(true)}
          >
            <Receipt className="h-5 w-5 mr-2" />
            Despesa Rápida
          </Button>
          <Button 
            variant="outline" 
            className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold" 
            onClick={() => setIsSangriaOpen(true)}
          >
            <ArrowDownCircle className="h-5 w-5 mr-2" />
            Sangria
          </Button>
          <Button 
            variant="outline" 
            className="border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 font-semibold" 
            onClick={() => setIsReforcoOpen(true)}
          >
            <ArrowUpCircle className="h-5 w-5 mr-2" />
            Reforço
          </Button>
          <Button 
            className="bg-red-500 hover:bg-red-600 text-white font-semibold" 
            onClick={() => setIsFecharOpen(true)}
          >
            <Lock className="h-5 w-5 mr-2" />
            Fechar Caixa
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-green-500 rounded-xl shadow-sm">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <div className="text-right flex-1 ml-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Entradas</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-400">{formatPrice(totais.entradas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-red-500 rounded-xl shadow-sm">
                <TrendingDown className="w-10 h-10 text-white" />
              </div>
              <div className="text-right flex-1 ml-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Saídas</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-400">{formatPrice(totais.saidas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-blue-500 rounded-xl shadow-sm">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <div className="text-right flex-1 ml-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Saldo em Caixa</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{formatPrice(totais.saldo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-purple-500 rounded-xl shadow-sm">
                <Receipt className="w-10 h-10 text-white" />
              </div>
              <div className="text-right flex-1 ml-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Despesas do Dia</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">{formatPrice(totais.despesasTotal)}</p>
                <p className="text-xs text-muted-foreground">{despesas.filter(d => d.pago_por === "caixa").length} despesas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Formas de Pagamento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-card rounded-2xl shadow-sm border-2 border-green-100 dark:border-green-800/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <Banknote className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dinheiro</p>
              <p className="text-2xl font-bold">{formatPrice(totais.dinheiro)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card rounded-2xl shadow-sm border-2 border-blue-100 dark:border-blue-800/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Débito</p>
              <p className="text-2xl font-bold">{formatPrice(totais.debito)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card rounded-2xl shadow-sm border-2 border-purple-100 dark:border-purple-800/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
              <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Crédito</p>
              <p className="text-2xl font-bold">{formatPrice(totais.credito)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card rounded-2xl shadow-sm border-2 border-cyan-100 dark:border-cyan-800/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl">
              <Smartphone className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PIX</p>
              <p className="text-2xl font-bold">{formatPrice(totais.pix)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comandas Abertas */}
      <ComandasAbertasSection onComandaFinalizada={fetchCaixa} />

      {/* Ações Rápidas */}
      <AcoesRapidasSection caixaId={caixaAberto.id} onActionComplete={fetchCaixa} />

      {/* Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
            <div className="px-6">
              <TabsList>
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="entradas">Entradas</TabsTrigger>
                <TabsTrigger value="saidas">Saídas</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={tabAtiva} className="mt-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Hora</TableHead>
                      <TableHead className="w-24">Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoesFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma movimentação
                        </TableCell>
                      </TableRow>
                    ) : (
                      movimentacoesFiltradas.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell className="font-medium">
                            {format(parseISO(mov.data_hora), "HH:mm")}
                          </TableCell>
                          <TableCell>{getTipoBadge(mov.tipo, mov.categoria)}</TableCell>
                          <TableCell>{mov.descricao}</TableCell>
                          <TableCell>
                            {mov.forma_pagamento && (
                              <Badge variant="outline" className="capitalize">
                                {mov.forma_pagamento}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-semibold",
                            mov.tipo === "entrada" || mov.tipo === "reforco" ? "text-success" : "text-destructive"
                          )}>
                            {mov.tipo === "entrada" || mov.tipo === "reforco" ? "+" : "-"}
                            {formatPrice(Number(mov.valor))}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Despesas Rápidas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Despesas Rápidas de Hoje</CardTitle>
            <p className="text-sm text-muted-foreground">Gastos pequenos do dia a dia</p>
          </div>
          <Button variant="outline" className="text-info" onClick={() => setIsDespesaOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        </CardHeader>
        <CardContent>
          {despesas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma despesa registrada hoje</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {despesas.map((despesa) => {
                const Icon = getCategoriaIcon(despesa.categoria);
                return (
                  <Card key={despesa.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-info/10">
                          <Icon className="h-4 w-4 text-info" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{despesa.descricao}</p>
                          <p className="text-lg font-bold text-info">{formatPrice(Number(despesa.valor))}</p>
                          <p className="text-xs text-muted-foreground">
                            {despesa.pago_por === "caixa" ? "Caixa" : "Próprio"} - {format(parseISO(despesa.data_hora), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {despesas.length > 0 && (
            <div className="mt-4 pt-4 border-t text-right">
              <p className="text-sm text-muted-foreground">Total gasto hoje:</p>
              <p className="text-xl font-bold text-purple-600">{formatPrice(totais.despesasTotal)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de Comissões a Pagar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Comissões a Pagar Hoje
          </CardTitle>
          <p className="text-sm text-muted-foreground">Valores de comissão por profissional dos atendimentos finalizados</p>
        </CardHeader>
        <CardContent>
          {comissoesProfissionais.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma comissão registrada hoje</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {comissoesProfissionais.map((prof) => (
                  <Card key={prof.id} className={cn("bg-muted/30", prof.vales_abertos > 0 && "border-amber-500/50")}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={prof.foto_url || undefined} />
                          <AvatarFallback 
                            className="text-white font-medium"
                            style={{ backgroundColor: prof.cor_agenda }}
                          >
                            {prof.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{prof.nome}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xl font-bold text-success">{formatPrice(prof.total_comissao)}</p>
                          </div>
                          {prof.comissao_servicos > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Serviços: {formatPrice(prof.comissao_servicos)}
                            </p>
                          )}
                          {prof.vales_abertos > 0 && (
                            <div className="mt-2 pt-2 border-t border-dashed">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-amber-600">Vales abertos:</span>
                                <span className="text-xs font-medium text-amber-600">-{formatPrice(prof.vales_abertos)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs font-medium">Líquido:</span>
                                <span className={cn("text-sm font-bold", prof.comissao_liquida >= 0 ? "text-success" : "text-destructive")}>
                                  {formatPrice(prof.comissao_liquida)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div>
                  {comissoesProfissionais.some(p => p.vales_abertos > 0) && (
                    <p className="text-sm text-amber-600">
                      Total em vales: {formatPrice(comissoesProfissionais.reduce((acc, p) => acc + p.vales_abertos, 0))}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total a pagar:</p>
                  <p className="text-xl font-bold text-success">
                    {formatPrice(comissoesProfissionais.reduce((acc, p) => acc + p.total_comissao, 0))}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Fechar Caixa */}
      <AlertDialog open={isFecharOpen} onOpenChange={setIsFecharOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Caixa</AlertDialogTitle>
            <AlertDialogDescription>
              Confira o valor em caixa antes de fechar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Valor inicial:</span>
                <span className="font-medium">{formatPrice(Number(caixaAberto.valor_inicial))}</span>
              </div>
              <div className="flex justify-between">
                <span>Total entradas:</span>
                <span className="font-medium text-success">+{formatPrice(totais.entradas)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total saídas:</span>
                <span className="font-medium text-destructive">-{formatPrice(totais.saidas)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">Saldo esperado:</span>
                <span className="font-bold text-primary">{formatPrice(totais.saldo)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor contado em caixa (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="0,00"
                value={valorFechamento || ""}
                onChange={(e) => setValorFechamento(Number(e.target.value))}
              />
            </div>
            {valorFechamento > 0 && (
              <div className={cn(
                "p-3 rounded-lg text-center",
                valorFechamento === totais.saldo ? "bg-success/10 text-success" :
                valorFechamento > totais.saldo ? "bg-blue-500/10 text-blue-600" :
                "bg-destructive/10 text-destructive"
              )}>
                <p className="text-sm">Diferença:</p>
                <p className="text-xl font-bold">
                  {valorFechamento >= totais.saldo ? "+" : ""}
                  {formatPrice(valorFechamento - totais.saldo)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Observações sobre o fechamento..."
                value={obsFechamento}
                onChange={(e) => setObsFechamento(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFecharCaixa}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirmar Fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Despesa Rápida */}
      <Dialog open={isDespesaOpen} onOpenChange={setIsDespesaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Despesa Rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Café da manhã"
                value={despesaDesc}
                onChange={(e) => setDespesaDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={despesaCat} onValueChange={setDespesaCat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoriasDespesa.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="h-4 w-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="0,00"
                value={despesaValor || ""}
                onChange={(e) => setDespesaValor(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Pago com *</Label>
              <Select value={despesaPagoPor} onValueChange={setDespesaPagoPor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caixa">Dinheiro do caixa</SelectItem>
                  <SelectItem value="proprio">Dinheiro próprio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={despesaObs}
                onChange={(e) => setDespesaObs(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsDespesaOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleAddDespesa}>
                Salvar Despesa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Sangria */}
      <Dialog open={isSangriaOpen} onOpenChange={setIsSangriaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sangria de Caixa</DialogTitle>
            <DialogDescription>Retirada de dinheiro do caixa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-600">
                Saldo em dinheiro atual: {formatPrice(totais.saldoDinheiro)}
              </span>
            </div>
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={totais.saldoDinheiro}
                placeholder="0,00"
                value={sangriaValor || ""}
                onChange={(e) => setSangriaValor(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea
                placeholder="Ex: Pagamento fornecedor, depósito banco..."
                value={sangriaMotivo}
                onChange={(e) => setSangriaMotivo(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsSangriaOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleSangria}>
                Confirmar Sangria
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Reforço */}
      <Dialog open={isReforcoOpen} onOpenChange={setIsReforcoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reforço de Caixa</DialogTitle>
            <DialogDescription>Adicionar dinheiro ao caixa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-blue-600">
                Reforço aumentará o saldo do caixa
              </span>
            </div>
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="0,00"
                value={reforcoValor || ""}
                onChange={(e) => setReforcoValor(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea
                placeholder="Ex: Troco adicional, entrada de sócio..."
                value={reforcoMotivo}
                onChange={(e) => setReforcoMotivo(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsReforcoOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleReforco}>
                Confirmar Reforço
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Caixa;
