import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  Banknote,
  CreditCard,
  Smartphone,
  Calculator,
  AlertCircle,
  CheckCircle,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export default function CaixaFechar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [caixa, setCaixa] = useState<CaixaData | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  
  // Contagem física
  const [contDinheiro, setContDinheiro] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [fechando, setFechando] = useState(false);

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
      toast({ title: "Nenhum caixa aberto", variant: "destructive" });
      navigate("/caixa");
      return;
    }

    setCaixa(caixaAberto);

    const { data: movs } = await supabase
      .from("caixa_movimentacoes")
      .select("*")
      .eq("caixa_id", caixaAberto.id);

    setMovimentacoes(movs || []);
    setLoading(false);
  }, [navigate, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totais = useMemo(() => {
    const valorInicial = Number(caixa?.valor_inicial || 0);

    const entradas = movimentacoes
      .filter((m) => m.tipo === "entrada" || m.tipo === "reforco")
      .reduce((acc, m) => acc + Number(m.valor), 0);

    const saidas = movimentacoes
      .filter((m) => m.tipo === "saida" || m.tipo === "sangria")
      .reduce((acc, m) => acc + Number(m.valor), 0);

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

    const saldoEsperado = valorInicial + entradas - saidas;
    const saldoDinheiroEsperado = valorInicial + dinheiro - saidas;

    return {
      valorInicial,
      entradas,
      saidas,
      dinheiro,
      debito,
      credito,
      pix,
      saldoEsperado,
      saldoDinheiroEsperado,
    };
  }, [movimentacoes, caixa]);

  const diferenca = contDinheiro - totais.saldoDinheiroEsperado;
  const temDiferenca = Math.abs(diferenca) > 0.01;

  const handleFechar = async () => {
    if (!caixa) return;
    setFechando(true);

    const { error } = await supabase
      .from("caixa")
      .update({
        status: "fechado",
        data_fechamento: new Date().toISOString(),
        valor_final: contDinheiro,
        valor_esperado: totais.saldoDinheiroEsperado,
        diferenca: diferenca,
        observacoes_fechamento: observacoes || null,
      })
      .eq("id", caixa.id);

    if (error) {
      toast({ title: "Erro ao fechar caixa", description: error.message, variant: "destructive" });
      setFechando(false);
      return;
    }

    toast({
      title: "Caixa fechado com sucesso!",
      description: temDiferenca 
        ? `Diferença de ${formatPrice(diferenca)} registrada`
        : "Fechamento sem diferenças",
    });

    navigate("/caixa");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const horasAberto = caixa 
    ? differenceInHours(new Date(), parseISO(caixa.data_abertura))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/caixa")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Fechar Caixa</h1>
          <p className="text-muted-foreground">
            Aberto há {horasAberto} horas
          </p>
        </div>
      </div>

      {/* Resumo do Dia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Resumo do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Inicial</span>
                <span className="font-medium">{formatPrice(totais.valorInicial)}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>Total Entradas</span>
                <span className="font-medium">+{formatPrice(totais.entradas)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Total Saídas</span>
                <span className="font-medium">-{formatPrice(totais.saidas)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold text-lg">
                <span>Saldo Esperado</span>
                <span className="text-primary">{formatPrice(totais.saldoEsperado)}</span>
              </div>
            </div>
            <div className="space-y-3 pl-4 border-l">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-success" />
                  <span>Dinheiro</span>
                </div>
                <span className="font-medium">{formatPrice(totais.dinheiro)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Débito</span>
                </div>
                <span className="font-medium">{formatPrice(totais.debito)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-info" />
                  <span>Crédito</span>
                </div>
                <span className="font-medium">{formatPrice(totais.credito)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-success" />
                  <span>PIX</span>
                </div>
                <span className="font-medium">{formatPrice(totais.pix)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contagem Física */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Contagem Física (Dinheiro)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base">Valor contado na gaveta</Label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">R$</span>
              <Input
                type="number"
                step="0.01"
                min={0}
                className="pl-12 text-3xl font-bold h-16"
                placeholder="0,00"
                value={contDinheiro || ""}
                onChange={(e) => setContDinheiro(Number(e.target.value))}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Esperado em dinheiro: {formatPrice(totais.saldoDinheiroEsperado)}
            </p>
          </div>

          {/* Diferença */}
          {contDinheiro > 0 && (
            <Card className={cn(
              "p-4",
              temDiferenca 
                ? diferenca > 0 
                  ? "bg-success/10 border-success/30" 
                  : "bg-destructive/10 border-destructive/30"
                : "bg-success/10 border-success/30"
            )}>
              <div className="flex items-center gap-3">
                {temDiferenca ? (
                  <AlertCircle className={cn(
                    "h-8 w-8",
                    diferenca > 0 ? "text-success" : "text-destructive"
                  )} />
                ) : (
                  <CheckCircle className="h-8 w-8 text-success" />
                )}
                <div>
                  <p className="font-medium">
                    {temDiferenca 
                      ? diferenca > 0 ? "Sobra no caixa" : "Falta no caixa"
                      : "Caixa conferido!"
                    }
                  </p>
                  <p className={cn(
                    "text-2xl font-bold",
                    temDiferenca 
                      ? diferenca > 0 ? "text-success" : "text-destructive"
                      : "text-success"
                  )}>
                    {temDiferenca 
                      ? `${diferenca > 0 ? "+" : ""}${formatPrice(diferenca)}`
                      : "Sem diferenças"
                    }
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Observações */}
          <div>
            <Label>Observações do Fechamento</Label>
            <Textarea
              placeholder={temDiferenca 
                ? "Explique a diferença encontrada..."
                : "Observações opcionais..."
              }
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => navigate("/caixa")}
        >
          Cancelar
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          disabled={contDinheiro <= 0}
          onClick={() => setIsConfirmOpen(true)}
        >
          <Lock className="h-4 w-4 mr-2" />
          Fechar Caixa
        </Button>
      </div>

      {/* Confirmação */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Fechamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja fechar o caixa?
              {temDiferenca && (
                <span className={cn(
                  "block mt-2 font-medium",
                  diferenca > 0 ? "text-success" : "text-destructive"
                )}>
                  Será registrada uma diferença de {formatPrice(diferenca)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFechar}
              disabled={fechando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {fechando ? "Fechando..." : "Confirmar Fechamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
