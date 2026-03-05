import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Wallet,
  Banknote,
  CreditCard,
  Smartphone,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Printer,
  Download,
  Clock,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CaixaData {
  id: string;
  data_abertura: string;
  valor_inicial: number;
  status: string;
}

interface Movimentacao {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  forma_pagamento: string | null;
  data_hora: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export default function CaixaGaveta() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [caixa, setCaixa] = useState<CaixaData | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: caixaAberto } = await supabase
      .from("caixa")
      .select("*")
      .eq("status", "aberto")
      .order("data_abertura", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!caixaAberto) {
      setCaixa(null);
      setMovimentacoes([]);
      setLoading(false);
      return;
    }

    setCaixa(caixaAberto);

    const { data: movs } = await supabase
      .from("caixa_movimentacoes")
      .select("*")
      .eq("caixa_id", caixaAberto.id)
      .order("data_hora", { ascending: false });

    setMovimentacoes(movs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totais = useMemo(() => {
    const valorInicial = Number(caixa?.valor_inicial || 0);

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

    const entradas = movimentacoes
      .filter((m) => m.tipo === "entrada" || m.tipo === "reforco")
      .reduce((acc, m) => acc + Number(m.valor), 0);

    const saidas = movimentacoes
      .filter((m) => m.tipo === "saida" || m.tipo === "sangria")
      .reduce((acc, m) => acc + Number(m.valor), 0);

    const saldo = valorInicial + entradas - saidas;
    const saldoDinheiro = valorInicial + dinheiro - saidas;

    const total = dinheiro + debito + credito + pix;
    
    return {
      valorInicial,
      dinheiro,
      debito,
      credito,
      pix,
      entradas,
      saidas,
      saldo,
      saldoDinheiro,
      total,
    };
  }, [movimentacoes, caixa]);

  const getPercentual = (valor: number) => {
    if (totais.total === 0) return 0;
    return Math.round((valor / totais.total) * 100);
  };

  const horasAberto = caixa 
    ? differenceInHours(new Date(), parseISO(caixa.data_abertura))
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!caixa) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/caixa")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Gaveta do Caixa</h1>
        </div>
        <Card className="text-center py-12">
          <CardContent>
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Caixa Fechado</p>
            <p className="text-muted-foreground">Abra o caixa para ver o saldo da gaveta</p>
            <Button className="mt-4" onClick={() => navigate("/caixa")}>
              Ir para Caixa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/caixa")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gaveta do Caixa</h1>
            <p className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Aberto às {format(parseISO(caixa.data_abertura), "HH:mm")} ({horasAberto}h)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Saldo Principal */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">SALDO ATUAL DA GAVETA</p>
          <p className="text-5xl font-bold text-primary">{formatPrice(totais.saldo)}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Atualizado em tempo real
          </p>
        </CardContent>
      </Card>

      {/* Breakdown por Forma de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dinheiro */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-success/10">
                  <Banknote className="h-5 w-5 text-success" />
                </div>
                <span className="font-medium">Dinheiro</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatPrice(totais.dinheiro)}</p>
                <p className="text-xs text-muted-foreground">{getPercentual(totais.dinheiro)}%</p>
              </div>
            </div>
            <Progress value={getPercentual(totais.dinheiro)} className="h-2" />
          </div>

          {/* Débito */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">Cartão Débito</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatPrice(totais.debito)}</p>
                <p className="text-xs text-muted-foreground">{getPercentual(totais.debito)}%</p>
              </div>
            </div>
            <Progress value={getPercentual(totais.debito)} className="h-2" />
          </div>

          {/* Crédito */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-info/10">
                  <CreditCard className="h-5 w-5 text-info" />
                </div>
                <span className="font-medium">Cartão Crédito</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatPrice(totais.credito)}</p>
                <p className="text-xs text-muted-foreground">{getPercentual(totais.credito)}%</p>
              </div>
            </div>
            <Progress value={getPercentual(totais.credito)} className="h-2" />
          </div>

          {/* PIX */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-success/10">
                  <Smartphone className="h-5 w-5 text-success" />
                </div>
                <span className="font-medium">PIX</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatPrice(totais.pix)}</p>
                <p className="text-xs text-muted-foreground">{getPercentual(totais.pix)}%</p>
              </div>
            </div>
            <Progress value={getPercentual(totais.pix)} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Movimento do Dia */}
      <Card>
        <CardHeader>
          <CardTitle>Movimento do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-success/5 rounded-lg">
              <TrendingUp className="h-6 w-6 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Entradas</p>
              <p className="text-xl font-bold text-success">{formatPrice(totais.entradas)}</p>
            </div>
            <div className="text-center p-4 bg-destructive/5 rounded-lg">
              <TrendingDown className="h-6 w-6 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Saídas</p>
              <p className="text-xl font-bold text-destructive">{formatPrice(totais.saidas)}</p>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <Wallet className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className="text-xl font-bold text-primary">{formatPrice(totais.saldo)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Últimas Movimentações */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Últimas Movimentações</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/caixa/extrato")}>
            Ver Extrato Completo
          </Button>
        </CardHeader>
        <CardContent>
          {movimentacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma movimentação</p>
          ) : (
            <div className="space-y-3">
              {movimentacoes.slice(0, 5).map((mov) => (
                <div 
                  key={mov.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      mov.tipo === "entrada" || mov.tipo === "reforco"
                        ? "bg-success/10"
                        : "bg-destructive/10"
                    )}>
                      {mov.tipo === "entrada" || mov.tipo === "reforco" ? (
                        <TrendingUp className={cn(
                          "h-4 w-4",
                          mov.tipo === "entrada" || mov.tipo === "reforco"
                            ? "text-success"
                            : "text-destructive"
                        )} />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{mov.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(mov.data_hora), "HH:mm")}
                        {mov.forma_pagamento && ` • ${mov.forma_pagamento}`}
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "font-bold",
                    mov.tipo === "entrada" || mov.tipo === "reforco"
                      ? "text-success"
                      : "text-destructive"
                  )}>
                    {mov.tipo === "entrada" || mov.tipo === "reforco" ? "+" : "-"}
                    {formatPrice(mov.valor)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <Button variant="outline" className="h-20 flex-col" onClick={() => navigate("/caixa")}>
          <TrendingDown className="h-6 w-6 mb-1 text-warning" />
          Sangria
        </Button>
        <Button variant="outline" className="h-20 flex-col" onClick={() => navigate("/caixa")}>
          <TrendingUp className="h-6 w-6 mb-1 text-success" />
          Reforço
        </Button>
        <Button variant="outline" className="h-20 flex-col text-destructive" onClick={() => navigate("/caixa/fechar")}>
          <Lock className="h-6 w-6 mb-1" />
          Fechar Caixa
        </Button>
      </div>
    </div>
  );
}
