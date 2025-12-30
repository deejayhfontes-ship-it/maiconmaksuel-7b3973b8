import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  FileText,
  Gift,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Divida {
  id: string;
  cliente_nome: string;
  valor_original: number;
  saldo: number;
  data_vencimento: string;
  status: string;
}

interface Gorjeta {
  id: string;
  profissional_nome: string;
  valor: number;
  data: string;
}

// Note: Cheques table doesn't exist yet, using placeholder
interface Cheque {
  id: string;
  banco: string;
  numero: string;
  valor: number;
  data_bom_para: string;
  cliente_nome: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

interface AcoesRapidasSectionProps {
  caixaId: string;
  onActionComplete: () => void;
}

export const AcoesRapidasSection = ({ caixaId, onActionComplete }: AcoesRapidasSectionProps) => {
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [gorjetas, setGorjetas] = useState<Gorjeta[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [isDividasOpen, setIsDividasOpen] = useState(false);
  const [isGorjetasOpen, setIsGorjetasOpen] = useState(false);
  const [isChequesOpen, setIsChequesOpen] = useState(false);
  const [isValeOpen, setIsValeOpen] = useState(false);
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([]);
  const [selectedProfissional, setSelectedProfissional] = useState("");
  const [valeValor, setValeValor] = useState(0);
  const [valeMotivo, setValeMotivo] = useState("");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    // Buscar dívidas pendentes
    const { data: dividasData } = await supabase
      .from("dividas")
      .select(`
        id,
        valor_original,
        saldo,
        data_vencimento,
        status,
        clientes:cliente_id (nome)
      `)
      .in("status", ["pendente", "parcial"])
      .order("data_vencimento", { ascending: true });

    if (dividasData) {
      setDividas(
        dividasData.map((d: any) => ({
          ...d,
          cliente_nome: d.clientes?.nome || "Cliente",
        }))
      );
    }

    // Buscar gorjetas não repassadas
    const { data: gorjetasData } = await supabase
      .from("gorjetas")
      .select(`
        id,
        valor,
        data,
        profissionais:profissional_id (nome)
      `)
      .eq("repassada", false);

    if (gorjetasData) {
      setGorjetas(
        gorjetasData.map((g: any) => ({
          ...g,
          profissional_nome: g.profissionais?.nome || "Profissional",
        }))
      );
    }

    // Cheques: tabela não existe ainda, deixar vazio por enquanto
    // TODO: Criar tabela de cheques quando necessário
    setCheques([]);

    // Buscar profissionais para vales
    const { data: profsData } = await supabase
      .from("profissionais")
      .select("id, nome")
      .eq("ativo", true);
    setProfissionais(profsData || []);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReceberDivida = async (divida: Divida, formaPagamento: string) => {
    const { error } = await supabase
      .from("dividas")
      .update({
        status: "pago",
        valor_pago: divida.valor_original,
        saldo: 0,
      })
      .eq("id", divida.id);

    if (!error) {
      // Adicionar movimentação no caixa
      await supabase.from("caixa_movimentacoes").insert([{
        caixa_id: caixaId,
        tipo: "entrada",
        categoria: "recebimento_divida",
        descricao: `Recebimento dívida - ${divida.cliente_nome}`,
        valor: divida.saldo,
        forma_pagamento: formaPagamento,
      }]);

      toast({ title: "Dívida recebida com sucesso!" });
      fetchData();
      onActionComplete();
    }
  };

  const handleRepassarGorjeta = async (gorjeta: Gorjeta) => {
    const { error } = await supabase
      .from("gorjetas")
      .update({
        repassada: true,
        data_repasse: new Date().toISOString(),
        forma_repasse: "dinheiro",
      })
      .eq("id", gorjeta.id);

    if (!error) {
      // Adicionar movimentação no caixa
      await supabase.from("caixa_movimentacoes").insert([{
        caixa_id: caixaId,
        tipo: "saida",
        categoria: "gorjeta",
        descricao: `Gorjeta - ${gorjeta.profissional_nome}`,
        valor: gorjeta.valor,
        forma_pagamento: "dinheiro",
      }]);

      toast({ title: "Gorjeta repassada!" });
      fetchData();
      onActionComplete();
    }
  };

  const handleRepassarTodasGorjetas = async () => {
    for (const gorjeta of gorjetas) {
      await handleRepassarGorjeta(gorjeta);
    }
  };

  const handleEmitirVale = async () => {
    if (!selectedProfissional || valeValor <= 0 || !valeMotivo) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("vales").insert([{
      profissional_id: selectedProfissional,
      valor_total: valeValor,
      saldo_restante: valeValor,
      motivo: valeMotivo,
      status: "aberto",
    }]);

    if (!error) {
      // Adicionar movimentação no caixa
      await supabase.from("caixa_movimentacoes").insert([{
        caixa_id: caixaId,
        tipo: "saida",
        categoria: "vale",
        descricao: `Vale - ${valeMotivo}`,
        valor: valeValor,
        forma_pagamento: "dinheiro",
      }]);

      toast({ title: "Vale emitido com sucesso!" });
      setIsValeOpen(false);
      setSelectedProfissional("");
      setValeValor(0);
      setValeMotivo("");
      onActionComplete();
    }
  };

  const actions = [
    {
      icon: CreditCard,
      label: "Dívidas",
      count: dividas.length,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      onClick: () => setIsDividasOpen(true),
    },
    {
      icon: FileText,
      label: "Vale",
      count: null,
      color: "text-info",
      bgColor: "bg-info/10",
      onClick: () => setIsValeOpen(true),
    },
    {
      icon: Gift,
      label: "Gorjetas",
      count: gorjetas.length > 0 ? gorjetas.length : null,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      onClick: () => setIsGorjetasOpen(true),
    },
    {
      icon: Receipt,
      label: "Cheques",
      count: cheques.length > 0 ? cheques.length : null,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      onClick: () => setIsChequesOpen(true),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {actions.map((action) => (
              <div
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "relative flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all hover:scale-105",
                  action.bgColor,
                  "border border-transparent hover:border-border"
                )}
              >
                {action.count !== null && action.count > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-destructive">
                    {action.count}
                  </Badge>
                )}
                <action.icon className={cn("h-8 w-8 mb-2", action.color)} />
                <span className="text-sm font-medium">{action.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal Dívidas */}
      <Dialog open={isDividasOpen} onOpenChange={setIsDividasOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-destructive" />
              Dívidas Pendentes ({dividas.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {dividas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma dívida pendente
              </p>
            ) : (
              <div className="space-y-3">
                {dividas.map((divida) => {
                  const diasVencimento = differenceInDays(
                    parseISO(divida.data_vencimento),
                    new Date()
                  );
                  const isVencida = diasVencimento < 0;

                  return (
                    <div
                      key={divida.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{divida.cliente_nome}</p>
                          <p className="text-lg font-bold text-destructive">
                            {formatPrice(divida.saldo)}
                          </p>
                        </div>
                        <Badge variant={isVencida ? "destructive" : "secondary"}>
                          {isVencida
                            ? "VENCIDO"
                            : `Vence ${format(parseISO(divida.data_vencimento), "dd/MM")}`}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-success hover:bg-success/90"
                          onClick={() => handleReceberDivida(divida, "dinheiro")}
                        >
                          Receber
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {dividas.length > 0 && (
            <div className="pt-3 border-t flex justify-between items-center">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-xl font-bold text-destructive">
                {formatPrice(dividas.reduce((acc, d) => acc + d.saldo, 0))}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Gorjetas */}
      <Dialog open={isGorjetasOpen} onOpenChange={setIsGorjetasOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-500" />
              Gorjetas para Repassar
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {gorjetas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma gorjeta pendente
              </p>
            ) : (
              <div className="space-y-3">
                {gorjetas.map((gorjeta) => (
                  <div
                    key={gorjeta.id}
                    className="p-3 rounded-lg border bg-card flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{gorjeta.profissional_nome}</p>
                      <p className="text-lg font-bold text-pink-500">
                        {formatPrice(gorjeta.valor)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRepassarGorjeta(gorjeta)}
                    >
                      Repassar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {gorjetas.length > 0 && (
            <div className="pt-3 border-t flex justify-between items-center">
              <span className="text-xl font-bold text-pink-500">
                Total: {formatPrice(gorjetas.reduce((acc, g) => acc + g.valor, 0))}
              </span>
              <Button onClick={handleRepassarTodasGorjetas}>
                Repassar Todas
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Cheques */}
      <Dialog open={isChequesOpen} onOpenChange={setIsChequesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-500" />
              Cheques na Gaveta ({cheques.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {cheques.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum cheque na gaveta
              </p>
            ) : (
              <div className="space-y-3">
                {cheques.map((cheque) => {
                  const diasVencer = differenceInDays(
                    parseISO(cheque.data_bom_para),
                    new Date()
                  );

                  return (
                    <div
                      key={cheque.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">
                            #{cheque.numero} - {cheque.banco}
                          </p>
                          <p className="text-lg font-bold">
                            {formatPrice(cheque.valor)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cheque.cliente_nome}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          Vence em {diasVencer}d
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          Depositar
                        </Button>
                        <Button size="sm" variant="ghost">
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal Vale */}
      <Dialog open={isValeOpen} onOpenChange={setIsValeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-info" />
              Emitir Vale
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={selectedProfissional} onValueChange={setSelectedProfissional}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar profissional" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="0,00"
                value={valeValor || ""}
                onChange={(e) => setValeValor(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                placeholder="Ex: Adiantamento, emergência..."
                value={valeMotivo}
                onChange={(e) => setValeMotivo(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsValeOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleEmitirVale}>
                Emitir Vale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
