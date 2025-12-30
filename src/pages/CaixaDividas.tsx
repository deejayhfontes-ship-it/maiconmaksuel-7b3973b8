import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  CreditCard,
  Clock,
  User,
  Phone,
  AlertCircle,
  Check,
  Calendar,
  History,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Divida {
  id: string;
  cliente_id: string;
  cliente?: { nome: string; celular: string } | null;
  atendimento_id: string | null;
  valor_original: number;
  valor_pago: number;
  saldo: number;
  data_origem: string;
  data_vencimento: string;
  status: string;
  observacoes: string | null;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export default function CaixaDividas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("todas");
  const [selectedDivida, setSelectedDivida] = useState<Divida | null>(null);
  const [isPagarOpen, setIsPagarOpen] = useState(false);
  
  // Form
  const [valorPagamento, setValorPagamento] = useState(0);
  const [tipoPagamento, setTipoPagamento] = useState<"total" | "parcial">("total");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [descontoPagamento, setDescontoPagamento] = useState(0);
  const [jurosPagamento, setJurosPagamento] = useState(0);
  const [obsPagamento, setObsPagamento] = useState("");
  const [enviarComprovante, setEnviarComprovante] = useState(false);

  const fetchDividas = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("dividas")
      .select(`
        *,
        cliente:cliente_id (nome, celular)
      `)
      .order("data_vencimento", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar dívidas", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Atualizar status de vencidas
    const dividasAtualizadas = (data || []).map((d) => {
      if (d.status === "pendente" && isPast(parseISO(d.data_vencimento))) {
        return { ...d, status: "vencida" };
      }
      return d;
    });

    setDividas(dividasAtualizadas);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchDividas();
  }, [fetchDividas]);

  const handlePagar = (divida: Divida) => {
    setSelectedDivida(divida);
    setValorPagamento(divida.saldo);
    setTipoPagamento("total");
    setFormaPagamento("dinheiro");
    setDescontoPagamento(0);
    setJurosPagamento(0);
    setObsPagamento("");
    setIsPagarOpen(true);
  };

  const calcularValorEfetivo = () => {
    const valor = tipoPagamento === "total" ? (selectedDivida?.saldo || 0) : valorPagamento;
    return valor - descontoPagamento + jurosPagamento;
  };

  const confirmarPagamento = async () => {
    if (!selectedDivida) return;

    const valorEfetivo = calcularValorEfetivo();
    const novoValorPago = Number(selectedDivida.valor_pago) + valorEfetivo;
    const novoSaldo = Number(selectedDivida.valor_original) - novoValorPago;
    const novoStatus = novoSaldo <= 0 ? "quitada" : "parcial";

    // Registrar pagamento
    const { error: pagError } = await supabase.from("dividas_pagamentos").insert([{
      divida_id: selectedDivida.id,
      valor: valorEfetivo,
      forma_pagamento: formaPagamento,
      desconto: descontoPagamento,
      juros: jurosPagamento,
      observacoes: obsPagamento || null,
    }]);

    if (pagError) {
      toast({ title: "Erro ao registrar pagamento", description: pagError.message, variant: "destructive" });
      return;
    }

    // Atualizar dívida
    const { error: divError } = await supabase
      .from("dividas")
      .update({
        valor_pago: novoValorPago,
        saldo: Math.max(0, novoSaldo),
        status: novoStatus,
      })
      .eq("id", selectedDivida.id);

    if (divError) {
      toast({ title: "Erro ao atualizar dívida", description: divError.message, variant: "destructive" });
      return;
    }

    // Registrar no caixa se aberto
    const { data: caixa } = await supabase
      .from("caixa")
      .select("id")
      .eq("status", "aberto")
      .limit(1)
      .maybeSingle();

    if (caixa) {
      await supabase.from("caixa_movimentacoes").insert([{
        caixa_id: caixa.id,
        tipo: "entrada",
        descricao: `Recebimento dívida - ${selectedDivida.cliente?.nome}`,
        valor: valorEfetivo,
        forma_pagamento: formaPagamento,
      }]);
    }

    toast({
      title: novoStatus === "quitada" ? "Dívida quitada!" : "Pagamento registrado!",
      description: `${formatPrice(valorEfetivo)} de ${selectedDivida.cliente?.nome}`,
    });

    setIsPagarOpen(false);
    setSelectedDivida(null);
    fetchDividas();
  };

  const filteredDividas = dividas.filter((d) => {
    const matchSearch = d.cliente?.nome?.toLowerCase().includes(search.toLowerCase());
    
    switch (tab) {
      case "vencidas":
        return matchSearch && (d.status === "vencida" || isPast(parseISO(d.data_vencimento)));
      case "avencer":
        return matchSearch && d.status !== "quitada" && !isPast(parseISO(d.data_vencimento));
      case "quitadas":
        return matchSearch && d.status === "quitada";
      default:
        return matchSearch;
    }
  });

  const totalPendente = dividas
    .filter(d => d.status !== "quitada")
    .reduce((acc, d) => acc + Number(d.saldo), 0);

  const totalVencido = dividas
    .filter(d => d.status === "vencida" || (d.status !== "quitada" && isPast(parseISO(d.data_vencimento))))
    .reduce((acc, d) => acc + Number(d.saldo), 0);

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Receber Dívidas</h1>
          <p className="text-muted-foreground">Gerenciar fiados e pagamentos pendentes</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-warning/5 border-warning/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Total Pendente</p>
              <p className="text-xl font-bold text-warning">{formatPrice(totalPendente)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Vencido</p>
              <p className="text-xl font-bold text-destructive">{formatPrice(totalVencido)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="vencidas">Vencidas</TabsTrigger>
          <TabsTrigger value="avencer">A Vencer</TabsTrigger>
          <TabsTrigger value="quitadas">Quitadas</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filteredDividas.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">Nenhuma dívida encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDividas.map((divida) => {
                const diasVencido = differenceInDays(new Date(), parseISO(divida.data_vencimento));
                const vencida = diasVencido > 0 && divida.status !== "quitada";
                
                return (
                  <Card key={divida.id} className={cn(
                    "overflow-hidden",
                    vencida && "border-destructive/50"
                  )}>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {divida.cliente?.nome || "Cliente"}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {divida.cliente?.celular}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {formatPrice(divida.saldo)}
                        </p>
                        <Badge variant={
                          divida.status === "quitada" ? "success" :
                          vencida ? "destructive" : "warning"
                        }>
                          {divida.status === "quitada" ? "Quitada" :
                           vencida ? `Vencida há ${diasVencido} dias` :
                           divida.status === "parcial" ? "Parcial" : "Pendente"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-muted-foreground">Origem</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(divida.data_origem), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vencimento</p>
                          <p className={cn("font-medium flex items-center gap-1", vencida && "text-destructive")}>
                            <Clock className="h-3 w-3" />
                            {format(parseISO(divida.data_vencimento), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valor Original</p>
                          <p className="font-medium">{formatPrice(divida.valor_original)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Já Pago</p>
                          <p className="font-medium text-success">{formatPrice(divida.valor_pago)}</p>
                        </div>
                      </div>

                      {divida.status !== "quitada" && (
                        <div className="flex gap-2 pt-3 border-t">
                          <Button 
                            className="flex-1 bg-success hover:bg-success/90"
                            onClick={() => handlePagar(divida)}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Receber Pagamento
                          </Button>
                          <Button variant="outline" size="icon">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon">
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Pagamento */}
      <Dialog open={isPagarOpen} onOpenChange={setIsPagarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-success" />
              Receber Pagamento
            </DialogTitle>
            <DialogDescription>
              {selectedDivida?.cliente?.nome} - Saldo: {formatPrice(selectedDivida?.saldo || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Tipo de Pagamento */}
            <div>
              <Label>Valor a Receber</Label>
              <RadioGroup 
                value={tipoPagamento} 
                onValueChange={(v: any) => {
                  setTipoPagamento(v);
                  if (v === "total") setValorPagamento(selectedDivida?.saldo || 0);
                }}
                className="grid grid-cols-2 gap-2 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="total" id="total" />
                  <Label htmlFor="total" className="cursor-pointer">
                    Total ({formatPrice(selectedDivida?.saldo || 0)})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parcial" id="parcial" />
                  <Label htmlFor="parcial" className="cursor-pointer">Parcial</Label>
                </div>
              </RadioGroup>
            </div>

            {tipoPagamento === "parcial" && (
              <div>
                <Label>Valor</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    className="pl-10"
                    value={valorPagamento || ""}
                    onChange={(e) => setValorPagamento(Number(e.target.value))}
                    max={selectedDivida?.saldo}
                  />
                </div>
              </div>
            )}

            {/* Forma de Pagamento */}
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desconto / Juros */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Desconto</Label>
                <Input
                  type="number"
                  min={0}
                  value={descontoPagamento || ""}
                  onChange={(e) => setDescontoPagamento(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Juros/Multa</Label>
                <Input
                  type="number"
                  min={0}
                  value={jurosPagamento || ""}
                  onChange={(e) => setJurosPagamento(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Valor Efetivo */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Efetivo:</span>
                <span className="text-success">{formatPrice(calcularValorEfetivo())}</span>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações sobre o pagamento..."
                value={obsPagamento}
                onChange={(e) => setObsPagamento(e.target.value)}
                rows={2}
              />
            </div>

            {/* Opções */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="comprovante" 
                checked={enviarComprovante} 
                onCheckedChange={(c) => setEnviarComprovante(!!c)} 
              />
              <Label htmlFor="comprovante" className="cursor-pointer">
                Enviar comprovante por WhatsApp
              </Label>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsPagarOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-success hover:bg-success/90"
                onClick={confirmarPagamento}
                disabled={calcularValorEfetivo() <= 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
