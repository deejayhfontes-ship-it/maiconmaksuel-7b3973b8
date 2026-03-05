import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  ClipboardList,
  Wallet,
  TrendingDown,
  TrendingUp,
  FileText,
  CreditCard,
  Landmark,
  Gift,
  BarChart3,
  Receipt,
  ListOrdered,
  History,
  Lock,
  LineChart,
  Unlock,
  Banknote,
  Smartphone,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CaixaData {
  id: string;
  data_abertura: string;
  data_fechamento: string | null;
  valor_inicial: number;
  valor_final: number | null;
  status: string;
  observacoes_abertura: string | null;
}

interface ActionCard {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  badge?: string | number;
  badgeColor?: string;
  route?: string;
  action?: () => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export default function CaixaPDV() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [caixaAberto, setCaixaAberto] = useState<CaixaData | null>(null);
  const [comandasAbertas, setComandasAbertas] = useState(0);
  const [valorComandas, setValorComandas] = useState(0);
  const [dividasPendentes, setDividasPendentes] = useState(0);
  const [gorjetasPendentes, setGorjetasPendentes] = useState(0);
  const [saldoCaixa, setSaldoCaixa] = useState(0);
  
  // Modals
  const [isAbrirOpen, setIsAbrirOpen] = useState(false);
  const [isSangriaOpen, setIsSangriaOpen] = useState(false);
  const [isReforcoOpen, setIsReforcoOpen] = useState(false);
  
  // Form states
  const [valorInicial, setValorInicial] = useState(0);
  const [obsAbertura, setObsAbertura] = useState("");
  const [sangriaValor, setSangriaValor] = useState(0);
  const [sangriaMotivo, setSangriaMotivo] = useState("");
  const [reforcoValor, setReforcoValor] = useState(0);
  const [reforcoMotivo, setReforcoMotivo] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Buscar caixa aberto
    const { data: aberto } = await supabase
      .from("caixa")
      .select("*")
      .eq("status", "aberto")
      .order("data_abertura", { ascending: false })
      .limit(1)
      .maybeSingle();

    setCaixaAberto(aberto);

    if (aberto) {
      // Buscar movimentações para calcular saldo
      const { data: movs } = await supabase
        .from("caixa_movimentacoes")
        .select("tipo, valor")
        .eq("caixa_id", aberto.id);

      const entradas = (movs || [])
        .filter((m) => m.tipo === "entrada" || m.tipo === "reforco")
        .reduce((acc, m) => acc + Number(m.valor), 0);
      const saidas = (movs || [])
        .filter((m) => m.tipo === "saida" || m.tipo === "sangria")
        .reduce((acc, m) => acc + Number(m.valor), 0);
      
      setSaldoCaixa(Number(aberto.valor_inicial) + entradas - saidas);
    }

    // Buscar comandas abertas (atendimentos abertos)
    const { data: comandas } = await supabase
      .from("atendimentos")
      .select("id, valor_final")
      .eq("status", "aberto");

    setComandasAbertas(comandas?.length || 0);
    setValorComandas(comandas?.reduce((acc, c) => acc + Number(c.valor_final || 0), 0) || 0);

    // Buscar dívidas pendentes
    const { data: dividas } = await supabase
      .from("dividas")
      .select("id")
      .in("status", ["pendente", "parcial", "vencida"]);

    setDividasPendentes(dividas?.length || 0);

    // Buscar gorjetas pendentes
    const { data: gorjetas } = await supabase
      .from("gorjetas")
      .select("id")
      .eq("repassada", false);

    setGorjetasPendentes(gorjetas?.length || 0);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAbrirCaixa = async () => {
    const { error } = await supabase
      .from("caixa")
      .insert([{
        valor_inicial: valorInicial,
        observacoes_abertura: obsAbertura || null,
        status: "aberto",
      }]);

    if (error) {
      toast({ title: "Erro ao abrir caixa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Caixa aberto com sucesso!" });
      setIsAbrirOpen(false);
      setValorInicial(0);
      setObsAbertura("");
      fetchData();
    }
  };

  const handleSangria = async () => {
    if (!caixaAberto || sangriaValor <= 0 || !sangriaMotivo) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
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
      fetchData();
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
      fetchData();
    }
  };

  const horasAberto = caixaAberto 
    ? differenceInHours(new Date(), parseISO(caixaAberto.data_abertura))
    : 0;

  // Grid de ações
  const actionCards: ActionCard[][] = useMemo(() => [
    // Linha 1 - Vendas
    [
      {
        id: "nova-venda",
        title: "Nova Venda",
        subtitle: comandasAbertas > 0 ? `${comandasAbertas} abertas` : "Criar comanda",
        icon: ShoppingCart,
        iconColor: "text-success",
        bgColor: "bg-success/10",
        badge: comandasAbertas > 0 ? comandasAbertas : undefined,
        badgeColor: "bg-success",
        route: "/atendimentos",
      },
      {
        id: "comandas",
        title: "Comandas Abertas",
        subtitle: valorComandas > 0 ? formatPrice(valorComandas) : "Ver todas",
        icon: ClipboardList,
        iconColor: "text-primary",
        bgColor: "bg-primary/10",
        badge: comandasAbertas > 0 ? comandasAbertas : undefined,
        badgeColor: "bg-primary",
        route: "/caixa/comandas",
      },
      {
        id: "gaveta",
        title: "Gaveta do Caixa",
        subtitle: caixaAberto ? formatPrice(saldoCaixa) : "Ver detalhes",
        icon: Wallet,
        iconColor: "text-info",
        bgColor: "bg-info/10",
        route: "/caixa/gaveta",
      },
    ],
    // Linha 2 - Movimentações
    [
      {
        id: "sangria",
        title: "Sangria",
        subtitle: "Retirar dinheiro",
        icon: TrendingDown,
        iconColor: "text-warning",
        bgColor: "bg-warning/10",
        action: () => setIsSangriaOpen(true),
      },
      {
        id: "reforco",
        title: "Reforço",
        subtitle: "Adicionar dinheiro",
        icon: TrendingUp,
        iconColor: "text-success",
        bgColor: "bg-success/10",
        action: () => setIsReforcoOpen(true),
      },
      {
        id: "vale",
        title: "Emitir Vale",
        subtitle: "Novo vale",
        icon: FileText,
        iconColor: "text-purple-500",
        bgColor: "bg-purple-500/10",
        route: "/financeiro/vales",
      },
    ],
    // Linha 3 - Recebimentos
    [
      {
        id: "dividas",
        title: "Receber Dívidas",
        subtitle: dividasPendentes > 0 ? `${dividasPendentes} pendentes` : "Gerenciar",
        icon: CreditCard,
        iconColor: "text-destructive",
        bgColor: "bg-destructive/10",
        badge: dividasPendentes > 0 ? dividasPendentes : undefined,
        badgeColor: "bg-destructive",
        route: "/caixa/dividas",
      },
      {
        id: "cheques",
        title: "Cheques",
        subtitle: "Gerenciar cheques",
        icon: Landmark,
        iconColor: "text-slate-600",
        bgColor: "bg-slate-600/10",
        route: "/caixa/cheques",
      },
      {
        id: "gorjetas",
        title: "Gorjetas",
        subtitle: gorjetasPendentes > 0 ? `${gorjetasPendentes} pendentes` : "Repassar",
        icon: Gift,
        iconColor: "text-pink-500",
        bgColor: "bg-pink-500/10",
        badge: gorjetasPendentes > 0 ? gorjetasPendentes : undefined,
        badgeColor: "bg-pink-500",
        route: "/caixa/gorjetas",
      },
    ],
    // Linha 4 - Relatórios
    [
      {
        id: "saldo",
        title: "Saldo da Gaveta",
        subtitle: "Resumo detalhado",
        icon: BarChart3,
        iconColor: "text-primary",
        bgColor: "bg-primary/10",
        route: "/caixa/gaveta",
      },
      {
        id: "extrato",
        title: "Extrato",
        subtitle: "Movimentos do dia",
        icon: ListOrdered,
        iconColor: "text-info",
        bgColor: "bg-info/10",
        route: "/caixa/extrato",
      },
      {
        id: "cheques-gaveta",
        title: "Cheques na Gaveta",
        subtitle: "Ver cheques",
        icon: Receipt,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-600/10",
        route: "/caixa/cheques",
      },
    ],
    // Linha 5 - Fechamento
    [
      {
        id: "anteriores",
        title: "Caixas Anteriores",
        subtitle: "Histórico",
        icon: History,
        iconColor: "text-slate-500",
        bgColor: "bg-slate-500/10",
        route: "/caixa/historico",
      },
      {
        id: "fechar",
        title: "Fechar Caixa",
        subtitle: "Finalizar dia",
        icon: Lock,
        iconColor: "text-destructive",
        bgColor: "bg-destructive/10",
        route: "/caixa/fechar",
      },
      {
        id: "fluxo",
        title: "Fluxo de Caixa",
        subtitle: "Análise",
        icon: LineChart,
        iconColor: "text-success",
        bgColor: "bg-success/10",
        route: "/financeiro",
      },
    ],
  ], [comandasAbertas, valorComandas, dividasPendentes, gorjetasPendentes, saldoCaixa, caixaAberto]);

  const handleCardClick = (card: ActionCard) => {
    if (!caixaAberto && card.id !== "anteriores" && card.id !== "abrir") {
      toast({
        title: "Caixa fechado",
        description: "Abra o caixa para acessar esta função",
        variant: "destructive",
      });
      return;
    }

    if (card.action) {
      card.action();
    } else if (card.route) {
      navigate(card.route);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ponto de Venda - PDV</h1>
          <p className="text-muted-foreground">Gerenciamento completo do caixa</p>
        </div>
        
        {/* Status Card */}
        <Card className={cn(
          "px-4 py-3 w-full lg:w-auto",
          caixaAberto ? "bg-success/5 border-success/30" : "bg-muted"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-full",
              caixaAberto ? "bg-success/20" : "bg-muted-foreground/20"
            )}>
              {caixaAberto ? (
                <Unlock className="h-6 w-6 text-success" />
              ) : (
                <Lock className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  Caixa: {caixaAberto ? "ABERTO" : "FECHADO"}
                </span>
                {caixaAberto && (
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                )}
              </div>
              {caixaAberto ? (
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Aberto às {format(parseISO(caixaAberto.data_abertura), "HH:mm")} ({horasAberto}h)
                  </p>
                  <p className="font-medium text-foreground">
                    Saldo: {formatPrice(saldoCaixa)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Abra o caixa para começar
                </p>
              )}
            </div>
            {!caixaAberto && (
              <Button 
                className="bg-success hover:bg-success/90"
                onClick={() => setIsAbrirOpen(true)}
              >
                <Unlock className="h-4 w-4 mr-2" />
                Abrir Caixa
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Alertas */}
      {horasAberto > 12 && (
        <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <AlertCircle className="h-5 w-5 text-warning" />
          <span className="text-sm">
            <strong>Lembrete:</strong> O caixa está aberto há mais de 12 horas. Considere fechá-lo.
          </span>
        </div>
      )}

      {/* Grid de Ações */}
      <div className="space-y-4">
        {actionCards.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {row.map((card) => (
              <Card
                key={card.id}
                className={cn(
                  "relative cursor-pointer transition-all duration-200",
                  "hover:scale-[1.02] hover:shadow-lg",
                  "active:scale-[0.98]",
                  !caixaAberto && card.id !== "anteriores" && "opacity-50"
                )}
                onClick={() => handleCardClick(card)}
              >
                {card.badge && (
                  <Badge 
                    className={cn(
                      "absolute -top-2 -right-2 h-6 min-w-6 flex items-center justify-center",
                      card.badgeColor,
                      "text-white"
                    )}
                  >
                    {card.badge}
                  </Badge>
                )}
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className={cn("p-4 rounded-2xl", card.bgColor)}>
                      <card.icon className={cn("h-8 w-8", card.iconColor)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{card.title}</h3>
                      {card.subtitle && (
                        <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

      {/* Cards de Resumo Rápido */}
      {caixaAberto && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Banknote className="h-8 w-8 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Saldo Atual</p>
                <p className="text-xl font-bold text-success">{formatPrice(saldoCaixa)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Comandas</p>
                <p className="text-xl font-bold text-primary">{comandasAbertas}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4 flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Dívidas</p>
                <p className="text-xl font-bold text-destructive">{dividasPendentes}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-pink-500/5 border-pink-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Gift className="h-8 w-8 text-pink-500" />
              <div>
                <p className="text-xs text-muted-foreground">Gorjetas</p>
                <p className="text-xl font-bold text-pink-500">{gorjetasPendentes}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Abrir Caixa */}
      <Dialog open={isAbrirOpen} onOpenChange={setIsAbrirOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-success" />
              Abertura de Caixa
            </DialogTitle>
            <DialogDescription>
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Valor Inicial (Troco)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  className="pl-10 text-2xl font-bold h-14"
                  placeholder="0,00"
                  value={valorInicial || ""}
                  onChange={(e) => setValorInicial(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Ex: Troco para o dia, valor em notas..."
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
                <Unlock className="h-4 w-4 mr-2" />
                Abrir Caixa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Sangria */}
      <Dialog open={isSangriaOpen} onOpenChange={setIsSangriaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-warning" />
              Sangria - Retirada de Dinheiro
            </DialogTitle>
            <DialogDescription>
              Registrar retirada de dinheiro do caixa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Valor a Retirar *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  className="pl-10 text-2xl font-bold h-14"
                  placeholder="0,00"
                  value={sangriaValor || ""}
                  onChange={(e) => setSangriaValor(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea
                placeholder="Ex: Depósito bancário, pagamento fornecedor..."
                value={sangriaMotivo}
                onChange={(e) => setSangriaMotivo(e.target.value)}
                rows={3}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">Saldo atual: <span className="font-bold text-foreground">{formatPrice(saldoCaixa)}</span></p>
              {sangriaValor > 0 && (
                <p className="text-muted-foreground">Após sangria: <span className="font-bold text-warning">{formatPrice(saldoCaixa - sangriaValor)}</span></p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsSangriaOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-warning hover:bg-warning/90 text-warning-foreground" 
                onClick={handleSangria}
                disabled={sangriaValor <= 0 || !sangriaMotivo}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
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
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Reforço - Entrada de Dinheiro
            </DialogTitle>
            <DialogDescription>
              Adicionar dinheiro ao caixa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Valor a Adicionar *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  className="pl-10 text-2xl font-bold h-14"
                  placeholder="0,00"
                  value={reforcoValor || ""}
                  onChange={(e) => setReforcoValor(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea
                placeholder="Ex: Reposição de troco, troco inicial..."
                value={reforcoMotivo}
                onChange={(e) => setReforcoMotivo(e.target.value)}
                rows={3}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">Saldo atual: <span className="font-bold text-foreground">{formatPrice(saldoCaixa)}</span></p>
              {reforcoValor > 0 && (
                <p className="text-muted-foreground">Após reforço: <span className="font-bold text-success">{formatPrice(saldoCaixa + reforcoValor)}</span></p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsReforcoOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-success hover:bg-success/90" 
                onClick={handleReforco}
                disabled={reforcoValor <= 0 || !reforcoMotivo}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Confirmar Reforço
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
