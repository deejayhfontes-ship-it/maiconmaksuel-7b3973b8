import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Clock,
  User,
  Scissors,
  ShoppingBag,
  Printer,
  X,
  Check,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { format, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Comanda {
  id: string;
  numero_comanda: number;
  data_hora: string;
  cliente_id: string | null;
  cliente?: { nome: string; celular: string };
  status: string;
  subtotal: number;
  desconto: number;
  valor_final: number;
  observacoes: string | null;
  servicos: any[];
  produtos: any[];
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m}min`;
};

export default function CaixaComandas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [search, setSearch] = useState("");
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false);
  
  // Form state para finalização
  const [desconto, setDesconto] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<"valor" | "percentual">("valor");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [valorRecebido, setValorRecebido] = useState(0);
  const [imprimirCupom, setImprimirCupom] = useState(false);
  const [enviarWhatsApp, setEnviarWhatsApp] = useState(false);
  const [gorjeta, setGorjeta] = useState(0);

  const fetchComandas = useCallback(async () => {
    setLoading(true);

    const { data: atendimentos, error } = await supabase
      .from("atendimentos")
      .select(`
        *,
        cliente:cliente_id (nome, celular)
      `)
      .eq("status", "aberto")
      .order("data_hora", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar comandas", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Buscar serviços e produtos de cada atendimento
    const comandasCompletas = await Promise.all(
      (atendimentos || []).map(async (at) => {
        const { data: servicos } = await supabase
          .from("atendimento_servicos")
          .select(`
            *,
            servico:servico_id (nome),
            profissional:profissional_id (nome)
          `)
          .eq("atendimento_id", at.id);

        const { data: produtos } = await supabase
          .from("atendimento_produtos")
          .select(`
            *,
            produto:produto_id (nome)
          `)
          .eq("atendimento_id", at.id);

        return {
          ...at,
          servicos: servicos || [],
          produtos: produtos || [],
        };
      })
    );

    setComandas(comandasCompletas);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchComandas();
  }, [fetchComandas]);

  const handleFinalizar = (comanda: Comanda) => {
    setSelectedComanda(comanda);
    setDesconto(0);
    setDescontoTipo("valor");
    setFormaPagamento("dinheiro");
    setValorRecebido(0);
    setGorjeta(0);
    setIsFinalizarOpen(true);
  };

  const calcularTotal = () => {
    if (!selectedComanda) return 0;
    const subtotal = selectedComanda.subtotal;
    let descontoValor = 0;
    
    if (descontoTipo === "percentual") {
      descontoValor = (subtotal * desconto) / 100;
    } else {
      descontoValor = desconto;
    }
    
    return Math.max(0, subtotal - descontoValor);
  };

  const calcularTroco = () => {
    if (formaPagamento !== "dinheiro") return 0;
    return Math.max(0, valorRecebido - calcularTotal());
  };

  const confirmarFinalizacao = async () => {
    if (!selectedComanda) return;

    const total = calcularTotal();
    const descontoValor = descontoTipo === "percentual" 
      ? (selectedComanda.subtotal * desconto) / 100 
      : desconto;

    // Atualizar atendimento
    const { error: atError } = await supabase
      .from("atendimentos")
      .update({
        status: "finalizado",
        desconto: descontoValor,
        valor_final: total,
      })
      .eq("id", selectedComanda.id);

    if (atError) {
      toast({ title: "Erro ao finalizar", description: atError.message, variant: "destructive" });
      return;
    }

    // Buscar caixa aberto
    const { data: caixa } = await supabase
      .from("caixa")
      .select("id")
      .eq("status", "aberto")
      .limit(1)
      .maybeSingle();

    if (caixa) {
      // Registrar movimentação no caixa
      await supabase.from("caixa_movimentacoes").insert([{
        caixa_id: caixa.id,
        tipo: "entrada",
        descricao: `Venda #${selectedComanda.numero_comanda} - ${selectedComanda.cliente?.nome || "Cliente avulso"}`,
        valor: total,
        forma_pagamento: formaPagamento,
        atendimento_id: selectedComanda.id,
      }]);

      // Registrar gorjeta se houver
      if (gorjeta > 0 && selectedComanda.servicos.length > 0) {
        const profissionalId = selectedComanda.servicos[0]?.profissional_id;
        if (profissionalId) {
          await supabase.from("gorjetas").insert([{
            atendimento_id: selectedComanda.id,
            profissional_id: profissionalId,
            valor: gorjeta,
          }]);
        }
      }
    }

    // Se fiado, criar dívida
    if (formaPagamento === "fiado" && selectedComanda.cliente_id) {
      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + 30); // 30 dias padrão

      await supabase.from("dividas").insert([{
        cliente_id: selectedComanda.cliente_id,
        atendimento_id: selectedComanda.id,
        valor_original: total,
        saldo: total,
        data_vencimento: vencimento.toISOString().split("T")[0],
      }]);
    }

    toast({
      title: "Venda finalizada!",
      description: `${formatPrice(total)} - ${selectedComanda.cliente?.nome || "Cliente avulso"}`,
    });

    setIsFinalizarOpen(false);
    setSelectedComanda(null);
    fetchComandas();
  };

  const filteredComandas = comandas.filter((c) =>
    c.cliente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.numero_comanda.toString().includes(search)
  );

  const totalValor = filteredComandas.reduce((acc, c) => acc + Number(c.subtotal), 0);
  const tempoMedio = filteredComandas.length > 0
    ? Math.round(filteredComandas.reduce((acc, c) => 
        acc + differenceInMinutes(new Date(), parseISO(c.data_hora)), 0
      ) / filteredComandas.length)
    : 0;

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
          <h1 className="text-2xl font-bold">Comandas Abertas</h1>
          <p className="text-muted-foreground">{filteredComandas.length} comandas em andamento</p>
        </div>
        <Button onClick={() => navigate("/atendimentos")}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Comanda
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou número..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Lista de Comandas */}
      {filteredComandas.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">Nenhuma comanda aberta</p>
            <Button className="mt-4" onClick={() => navigate("/atendimentos")}>
              <Plus className="h-4 w-4 mr-2" />
              Iniciar Atendimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredComandas.map((comanda) => {
            const minutos = differenceInMinutes(new Date(), parseISO(comanda.data_hora));
            
            return (
              <Card key={comanda.id} className="overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Comanda #{comanda.numero_comanda}
                      <Badge variant="outline" className="font-normal">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(minutos)}
                      </Badge>
                    </CardTitle>
                    <p className="text-lg font-medium flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" />
                      {comanda.cliente?.nome || "Cliente avulso"}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(comanda.subtotal)}
                  </p>
                </CardHeader>
                <CardContent className="pt-2">
                  {/* Itens */}
                  <div className="space-y-2 mb-4">
                    {comanda.servicos.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Scissors className="h-3 w-3 text-muted-foreground" />
                        <span>{s.servico?.nome}</span>
                        <span className="text-muted-foreground">({s.profissional?.nome})</span>
                        <span className="ml-auto font-medium">{formatPrice(s.subtotal)}</span>
                      </div>
                    ))}
                    {comanda.produtos.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                        <span>{p.quantidade}x {p.produto?.nome}</span>
                        <span className="ml-auto font-medium">{formatPrice(p.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-3 border-t">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/atendimentos?id=${comanda.id}`)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-success hover:bg-success/90 flex-1"
                      onClick={() => handleFinalizar(comanda)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Finalizar
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo */}
      {filteredComandas.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total comandas abertas</p>
              <p className="text-2xl font-bold">{formatPrice(totalValor)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Tempo médio aberto</p>
              <p className="text-lg font-medium">{formatDuration(tempoMedio)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Finalizar */}
      <Dialog open={isFinalizarOpen} onOpenChange={setIsFinalizarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Comanda</DialogTitle>
            <DialogDescription>
              {selectedComanda?.cliente?.nome || "Cliente avulso"} - #{selectedComanda?.numero_comanda}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Resumo */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatPrice(selectedComanda?.subtotal || 0)}</span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Desconto:</span>
                  <span>-{descontoTipo === "percentual" 
                    ? `${desconto}%`
                    : formatPrice(desconto)
                  }</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t mt-2 pt-2">
                <span>Total:</span>
                <span className="text-primary">{formatPrice(calcularTotal())}</span>
              </div>
            </div>

            {/* Desconto */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Desconto</Label>
                <Input
                  type="number"
                  min={0}
                  value={desconto || ""}
                  onChange={(e) => setDesconto(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={descontoTipo} onValueChange={(v: any) => setDescontoTipo(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valor">R$</SelectItem>
                    <SelectItem value="percentual">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <Label>Forma de Pagamento</Label>
              <RadioGroup value={formaPagamento} onValueChange={setFormaPagamento} className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { value: "dinheiro", label: "Dinheiro" },
                  { value: "debito", label: "Débito" },
                  { value: "credito", label: "Crédito" },
                  { value: "pix", label: "PIX" },
                  { value: "cheque", label: "Cheque" },
                  { value: "fiado", label: "Fiado" },
                ].map((fp) => (
                  <div key={fp.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={fp.value} id={fp.value} />
                    <Label htmlFor={fp.value} className="cursor-pointer">{fp.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Dinheiro - Troco */}
            {formaPagamento === "dinheiro" && (
              <div>
                <Label>Valor Recebido</Label>
                <Input
                  type="number"
                  min={0}
                  value={valorRecebido || ""}
                  onChange={(e) => setValorRecebido(Number(e.target.value))}
                />
                {valorRecebido > calcularTotal() && (
                  <p className="text-sm text-success mt-1">
                    Troco: {formatPrice(calcularTroco())}
                  </p>
                )}
              </div>
            )}

            {/* Gorjeta */}
            <div>
              <Label>Gorjeta (opcional)</Label>
              <Input
                type="number"
                min={0}
                value={gorjeta || ""}
                onChange={(e) => setGorjeta(Number(e.target.value))}
              />
            </div>

            {/* Opções */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="cupom" checked={imprimirCupom} onCheckedChange={(c) => setImprimirCupom(!!c)} />
                <Label htmlFor="cupom" className="cursor-pointer">Imprimir cupom</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="whatsapp" checked={enviarWhatsApp} onCheckedChange={(c) => setEnviarWhatsApp(!!c)} />
                <Label htmlFor="whatsapp" className="cursor-pointer">Enviar por WhatsApp</Label>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsFinalizarOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-success hover:bg-success/90"
                onClick={confirmarFinalizacao}
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
