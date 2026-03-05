import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  History,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  Printer,
  Download,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CaixaFechado {
  id: string;
  data_abertura: string;
  data_fechamento: string;
  valor_inicial: number;
  valor_final: number;
  valor_esperado: number;
  diferenca: number;
  observacoes_abertura: string | null;
  observacoes_fechamento: string | null;
  status: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export default function CaixaHistorico() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [caixas, setCaixas] = useState<CaixaFechado[]>([]);
  const [selectedCaixa, setSelectedCaixa] = useState<CaixaFechado | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("caixa")
      .select("*")
      .eq("status", "fechado")
      .order("data_fechamento", { ascending: false })
      .limit(30);

    if (error) {
      toast({ title: "Erro ao carregar histórico", variant: "destructive" });
    } else {
      setCaixas(data || []);
    }

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const verDetalhes = async (caixa: CaixaFechado) => {
    setSelectedCaixa(caixa);

    const { data: movs } = await supabase
      .from("caixa_movimentacoes")
      .select("*")
      .eq("caixa_id", caixa.id)
      .order("data_hora", { ascending: false });

    setMovimentacoes(movs || []);
    setIsDetalhesOpen(true);
  };

  const calcularTotais = () => {
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

    return { entradas, saidas, dinheiro, debito, credito, pix };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/caixa")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Caixas Anteriores</h1>
          <p className="text-muted-foreground">Histórico de fechamentos</p>
        </div>
      </div>

      {/* Lista */}
      {caixas.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum caixa fechado encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {caixas.map((caixa) => {
            const temDiferenca = Math.abs(caixa.diferenca) > 0.01;
            
            return (
              <Card key={caixa.id} className={cn(
                "overflow-hidden",
                temDiferenca && "border-warning/50"
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(parseISO(caixa.data_fechamento), "dd/MM/yyyy", { locale: ptBR })}
                        {temDiferenca ? (
                          <Badge variant="destructive" className="ml-2">
                            <XCircle className="h-3 w-3 mr-1" />
                            Diferença
                          </Badge>
                        ) : (
                          <Badge className="bg-success ml-2">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        Aberto: {format(parseISO(caixa.data_abertura), "HH:mm")} - 
                        Fechado: {format(parseISO(caixa.data_fechamento), "HH:mm")}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {formatPrice(caixa.valor_final)}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="grid grid-cols-4 gap-4 text-center mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Inicial</p>
                      <p className="font-medium">{formatPrice(caixa.valor_inicial)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Esperado</p>
                      <p className="font-medium">{formatPrice(caixa.valor_esperado)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contado</p>
                      <p className="font-medium">{formatPrice(caixa.valor_final)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Diferença</p>
                      <p className={cn(
                        "font-medium",
                        caixa.diferenca > 0 ? "text-success" : 
                        caixa.diferenca < 0 ? "text-destructive" : ""
                      )}>
                        {caixa.diferenca > 0 ? "+" : ""}
                        {formatPrice(caixa.diferenca)}
                      </p>
                    </div>
                  </div>

                  {caixa.observacoes_fechamento && (
                    <p className="text-sm text-muted-foreground mb-4 italic">
                      "{caixa.observacoes_fechamento}"
                    </p>
                  )}

                  <div className="flex gap-2 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => verDetalhes(caixa)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Detalhes */}
      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Detalhes do Caixa
            </DialogTitle>
          </DialogHeader>
          
          {selectedCaixa && (
            <div className="space-y-4">
              {/* Info Geral */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {format(parseISO(selectedCaixa.data_fechamento), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Horário</p>
                      <p className="font-medium">
                        {format(parseISO(selectedCaixa.data_abertura), "HH:mm")} - {format(parseISO(selectedCaixa.data_fechamento), "HH:mm")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Inicial</p>
                      <p className="font-medium">{formatPrice(selectedCaixa.valor_inicial)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Final</p>
                      <p className="font-medium">{formatPrice(selectedCaixa.valor_final)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Totais por Forma */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Formas de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const totais = calcularTotais();
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Dinheiro</span>
                          <span className="font-medium">{formatPrice(totais.dinheiro)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Débito</span>
                          <span className="font-medium">{formatPrice(totais.debito)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Crédito</span>
                          <span className="font-medium">{formatPrice(totais.credito)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>PIX</span>
                          <span className="font-medium">{formatPrice(totais.pix)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t font-bold">
                          <span>Total Entradas</span>
                          <span className="text-success">{formatPrice(totais.entradas)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total Saídas</span>
                          <span className="text-destructive">{formatPrice(totais.saidas)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Diferença */}
              {Math.abs(selectedCaixa.diferenca) > 0.01 && (
                <Card className={cn(
                  selectedCaixa.diferenca > 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
                )}>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Diferença no Fechamento</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      selectedCaixa.diferenca > 0 ? "text-success" : "text-destructive"
                    )}>
                      {selectedCaixa.diferenca > 0 ? "+" : ""}
                      {formatPrice(selectedCaixa.diferenca)}
                    </p>
                    {selectedCaixa.observacoes_fechamento && (
                      <p className="text-sm mt-2 italic">
                        "{selectedCaixa.observacoes_fechamento}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Ações */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
