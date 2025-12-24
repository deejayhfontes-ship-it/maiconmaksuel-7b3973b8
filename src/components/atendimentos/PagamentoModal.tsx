import { useState, useEffect } from "react";
import {
  Banknote,
  CreditCard,
  Smartphone,
  X,
  Printer,
  MessageCircle,
  Layers,
  Check,
  Loader2,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Pagamento {
  id: string;
  forma: string;
  valor: number;
  parcelas: number;
}

interface PagamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroComanda: number;
  clienteNome: string | null;
  totalComanda: number;
  onConfirmar: (pagamentos: Omit<Pagamento, "id">[]) => Promise<void>;
}

type FormaPagamento = "dinheiro" | "debito" | "credito" | "pix" | "multiplas" | null;

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

const formasPagamento = [
  { id: "dinheiro", label: "Dinheiro", icon: Banknote, color: "text-green-600 bg-green-500/10" },
  { id: "debito", label: "Débito", icon: CreditCard, color: "text-blue-600 bg-blue-500/10" },
  { id: "credito", label: "Crédito", icon: CreditCard, color: "text-purple-600 bg-purple-500/10" },
  { id: "pix", label: "PIX", icon: Smartphone, color: "text-teal-600 bg-teal-500/10" },
  { id: "multiplas", label: "Múltiplas", icon: Layers, color: "text-amber-600 bg-amber-500/10" },
];

export function PagamentoModal({
  open,
  onOpenChange,
  numeroComanda,
  clienteNome,
  totalComanda,
  onConfirmar,
}: PagamentoModalProps) {
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  
  // Estados específicos por forma
  const [valorRecebido, setValorRecebido] = useState<number>(0);
  const [parcelas, setParcelas] = useState(1);
  const [valorParcial, setValorParcial] = useState<number>(0);
  const [formaParcial, setFormaParcial] = useState<string>("dinheiro");
  const [aguardandoPix, setAguardandoPix] = useState(false);

  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const faltando = Math.max(0, totalComanda - totalPago);
  const troco = formaSelecionada === "dinheiro" ? Math.max(0, valorRecebido - faltando) : 0;

  useEffect(() => {
    if (open) {
      setFormaSelecionada(null);
      setPagamentos([]);
      setLoading(false);
      setSucesso(false);
      setValorRecebido(0);
      setParcelas(1);
      setValorParcial(0);
      setFormaParcial("dinheiro");
      setAguardandoPix(false);
    }
  }, [open]);

  const handleSelectForma = (forma: FormaPagamento) => {
    setFormaSelecionada(forma);
    if (forma === "dinheiro") {
      setValorRecebido(faltando);
    }
    if (forma === "multiplas") {
      setValorParcial(faltando);
    }
  };

  const handleAdicionarPagamento = (forma: string, valor: number, numParcelas: number = 1) => {
    if (valor <= 0) return;
    
    const novoPagamento: Pagamento = {
      id: crypto.randomUUID(),
      forma,
      valor: Math.min(valor, faltando),
      parcelas: numParcelas,
    };
    
    setPagamentos([...pagamentos, novoPagamento]);
    setValorParcial(0);
    setFormaParcial("dinheiro");
    setParcelas(1);
    
    if (forma !== "multiplas") {
      setFormaSelecionada("multiplas");
    }
  };

  const handleRemoverPagamento = (id: string) => {
    setPagamentos(pagamentos.filter((p) => p.id !== id));
  };

  const handleConfirmarDinheiro = () => {
    if (valorRecebido >= faltando) {
      handleAdicionarPagamento("dinheiro", faltando, 1);
    }
  };

  const handleConfirmarDebito = () => {
    handleAdicionarPagamento("debito", faltando, 1);
  };

  const handleConfirmarCredito = () => {
    handleAdicionarPagamento("credito", faltando, parcelas);
  };

  const handleConfirmarPix = () => {
    setAguardandoPix(true);
    // Simular confirmação após 2 segundos
    setTimeout(() => {
      setAguardandoPix(false);
      handleAdicionarPagamento("pix", faltando, 1);
    }, 2000);
  };

  const handleFinalizarPagamento = async () => {
    if (faltando > 0.01) return; // Tolerância de 1 centavo
    
    setLoading(true);
    try {
      await onConfirmar(pagamentos.map(({ id, ...rest }) => rest));
      setSucesso(true);
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const mensagem = encodeURIComponent(
      `✅ Recibo - ${clienteNome || "Cliente"}\n\n` +
      `Comanda #${numeroComanda.toString().padStart(3, "0")}\n` +
      `Total: ${formatPrice(totalComanda)}\n\n` +
      `Pagamento:\n` +
      pagamentos.map(p => `- ${p.forma}: ${formatPrice(p.valor)}`).join("\n") +
      `\n\nObrigado pela preferência!`
    );
    window.open(`https://wa.me/?text=${mensagem}`, "_blank");
  };

  const renderFormaContent = () => {
    if (sucesso) {
      return (
        <div className="text-center py-8 space-y-6">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-success" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-success">Comanda Fechada!</h3>
            <p className="text-muted-foreground mt-1">
              #{numeroComanda.toString().padStart(3, "0")} - {clienteNome || "Cliente Anônimo"}
            </p>
          </div>
          <div className="text-3xl font-bold">{formatPrice(totalComanda)}</div>
          
          <div className="flex justify-center gap-3 pt-4">
            <Button variant="outline" onClick={handleImprimir}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={handleWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button onClick={() => onOpenChange(false)} className="bg-success hover:bg-success/90">
              Concluir
            </Button>
          </div>
        </div>
      );
    }

    switch (formaSelecionada) {
      case "dinheiro":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor Recebido</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={valorRecebido || ""}
                onChange={(e) => setValorRecebido(Number(e.target.value))}
                className="text-xl h-12"
                autoFocus
              />
            </div>
            
            {valorRecebido > 0 && (
              <Card className={cn(
                "border-2",
                valorRecebido >= faltando ? "border-success bg-success/5" : "border-destructive bg-destructive/5"
              )}>
                <CardContent className="p-4 text-center">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Recebido</p>
                      <p className="text-xl font-bold">{formatPrice(valorRecebido)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Troco</p>
                      <p className={cn(
                        "text-xl font-bold",
                        troco > 0 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {formatPrice(troco)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setFormaSelecionada(null)}>
                Voltar
              </Button>
              <Button 
                className="flex-1 bg-success hover:bg-success/90" 
                onClick={handleConfirmarDinheiro}
                disabled={valorRecebido < faltando}
              >
                Confirmar
              </Button>
            </div>
          </div>
        );

      case "debito":
        return (
          <div className="space-y-4 text-center">
            <div className="py-6">
              <CreditCard className="h-16 w-16 mx-auto text-blue-600 mb-4" />
              <p className="text-lg">Confirmar pagamento em</p>
              <p className="text-3xl font-bold text-blue-600">{formatPrice(faltando)}</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setFormaSelecionada(null)}>
                Voltar
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleConfirmarDebito}>
                Confirmar Débito
              </Button>
            </div>
          </div>
        );

      case "credito":
        const valorParcela = faltando / parcelas;
        return (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CreditCard className="h-12 w-12 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-600">{formatPrice(faltando)}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Select value={parcelas.toString()} onValueChange={(v) => setParcelas(Number(v))}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}x de {formatPrice(faltando / n)}
                      {n > 1 && " sem juros"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Valor por parcela</p>
                <p className="text-2xl font-bold text-purple-600">
                  {parcelas}x de {formatPrice(valorParcela)}
                </p>
              </CardContent>
            </Card>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setFormaSelecionada(null)}>
                Voltar
              </Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleConfirmarCredito}>
                Confirmar Crédito
              </Button>
            </div>
          </div>
        );

      case "pix":
        return (
          <div className="space-y-4 text-center">
            {aguardandoPix ? (
              <div className="py-8">
                <div className="w-48 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
                  <QrCode className="h-32 w-32 text-teal-600" />
                </div>
                <div className="flex items-center justify-center gap-2 text-teal-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-lg font-medium">Aguardando pagamento...</span>
                </div>
                <p className="text-2xl font-bold mt-2">{formatPrice(faltando)}</p>
                <Button variant="outline" className="mt-4" onClick={() => setAguardandoPix(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <>
                <div className="py-6">
                  <Smartphone className="h-16 w-16 mx-auto text-teal-600 mb-4" />
                  <p className="text-lg">Gerar QR Code PIX</p>
                  <p className="text-3xl font-bold text-teal-600">{formatPrice(faltando)}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setFormaSelecionada(null)}>
                    Voltar
                  </Button>
                  <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={handleConfirmarPix}>
                    Gerar PIX
                  </Button>
                </div>
              </>
            )}
          </div>
        );

      case "multiplas":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Forma</Label>
                <Select value={formaParcial} onValueChange={setFormaParcial}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Valor</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={faltando}
                    value={valorParcial || ""}
                    onChange={(e) => setValorParcial(Number(e.target.value))}
                    placeholder="R$ 0,00"
                  />
                  <Button 
                    onClick={() => handleAdicionarPagamento(formaParcial, valorParcial)}
                    disabled={valorParcial <= 0 || valorParcial > faltando}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {pagamentos.length > 0 && (
              <Card>
                <ScrollArea className="max-h-40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Forma</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagamentos.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="capitalize">
                            <Badge variant="secondary">
                              {p.forma}
                              {p.parcelas > 1 && ` ${p.parcelas}x`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(p.valor)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => handleRemoverPagamento(p.id)}
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            )}
            
            <Button variant="outline" onClick={() => setFormaSelecionada(null)}>
              Voltar
            </Button>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-3 gap-3">
            {formasPagamento.map((forma) => (
              <Button
                key={forma.id}
                variant="outline"
                className={cn(
                  "h-24 flex-col gap-2 hover:scale-105 transition-transform",
                  forma.color
                )}
                onClick={() => handleSelectForma(forma.id as FormaPagamento)}
              >
                <forma.icon className="h-8 w-8" />
                <span className="font-medium">{forma.label}</span>
              </Button>
            ))}
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={sucesso ? () => onOpenChange(false) : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Pagamento - Comanda #{numeroComanda.toString().padStart(3, "0")}</span>
          </DialogTitle>
        </DialogHeader>

        {!sucesso && (
          <div className="text-center py-2 border-b mb-4">
            <p className="text-sm text-muted-foreground">
              {clienteNome || "Cliente Anônimo"}
            </p>
            <p className="text-3xl font-bold text-primary">{formatPrice(totalComanda)}</p>
          </div>
        )}

        {renderFormaContent()}

        {!sucesso && (
          <Card className="mt-4 border-2">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total comanda:</span>
                <span className="font-medium">{formatPrice(totalComanda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total pago:</span>
                <span className="font-medium text-success">{formatPrice(totalPago)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Faltando:</span>
                <span className={faltando > 0.01 ? "text-destructive" : "text-success"}>
                  {formatPrice(faltando)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {!sucesso && pagamentos.length > 0 && faltando <= 0.01 && (
          <Button 
            className="w-full h-12 text-lg bg-success hover:bg-success/90 mt-4"
            onClick={handleFinalizarPagamento}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
