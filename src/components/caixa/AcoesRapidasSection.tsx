import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  FileText,
  Heart,
  FileCheck,
  Wallet,
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
import { ChequesListModal } from "./ChequesListModal";

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
  const navigate = useNavigate();
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [gorjetas, setGorjetas] = useState<Gorjeta[]>([]);
  const [chequesPendentes, setChequesPendentes] = useState(0);
  const [totalDividasPendentes, setTotalDividasPendentes] = useState(0);
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
      const mappedDividas = dividasData.map((d: any) => ({
        ...d,
        cliente_nome: d.clientes?.nome || "Cliente",
      }));
      setDividas(mappedDividas);
      setTotalDividasPendentes(mappedDividas.reduce((acc: number, d: any) => acc + Number(d.saldo), 0));
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

    // Buscar cheques pendentes
    const { count: chequesCount } = await supabase
      .from("cheques")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente");
    
    setChequesPendentes(chequesCount || 0);

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
      icon: Wallet,
      label: "Receber Fiado",
      count: dividas.length,
      subtitle: totalDividasPendentes > 0 ? formatPrice(totalDividasPendentes) : null,
      iconBgColor: "bg-emerald-500",
      gradientFrom: "from-emerald-50",
      gradientTo: "to-emerald-100",
      darkGradientFrom: "dark:from-emerald-950/30",
      darkGradientTo: "dark:to-emerald-900/20",
      badgeColor: "bg-red-500",
      onClick: () => navigate("/caixa/dividas"),
      highlight: true,
    },
    {
      icon: FileText,
      label: "Vale",
      count: null,
      subtitle: null,
      iconBgColor: "bg-purple-500",
      gradientFrom: "from-purple-50",
      gradientTo: "to-purple-100",
      darkGradientFrom: "dark:from-purple-950/30",
      darkGradientTo: "dark:to-purple-900/20",
      badgeColor: "bg-purple-500",
      onClick: () => setIsValeOpen(true),
      highlight: false,
    },
    {
      icon: Heart,
      label: "Gorjetas",
      count: gorjetas.length > 0 ? gorjetas.length : null,
      subtitle: null,
      iconBgColor: "bg-pink-500",
      gradientFrom: "from-pink-50",
      gradientTo: "to-pink-100",
      darkGradientFrom: "dark:from-pink-950/30",
      darkGradientTo: "dark:to-pink-900/20",
      badgeColor: "bg-pink-500",
      onClick: () => setIsGorjetasOpen(true),
      highlight: false,
    },
    {
      icon: FileCheck,
      label: "Cheques",
      count: chequesPendentes > 0 ? chequesPendentes : null,
      subtitle: null,
      iconBgColor: "bg-green-500",
      gradientFrom: "from-green-50",
      gradientTo: "to-green-100",
      darkGradientFrom: "dark:from-green-950/30",
      darkGradientTo: "dark:to-green-900/20",
      badgeColor: "bg-orange-500",
      onClick: () => setIsChequesOpen(true),
      highlight: false,
    },
  ];

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "relative flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer transition-all hover:scale-105",
                  "bg-gradient-to-br",
                  action.gradientFrom,
                  action.gradientTo,
                  action.darkGradientFrom,
                  action.darkGradientTo,
                  "border border-transparent hover:border-border shadow-sm hover:shadow-md",
                  action.highlight && "ring-2 ring-emerald-500/50"
                )}
              >
                {action.count !== null && action.count > 0 && (
                  <span className={cn(
                    "absolute top-2 right-2 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center",
                    action.badgeColor
                  )}>
                    {action.count}
                  </span>
                )}
                <div className={cn("p-4 rounded-2xl mb-3", action.iconBgColor)}>
                  <action.icon className="w-8 h-8 text-white" />
                </div>
                <span className="text-sm font-semibold text-foreground">{action.label}</span>
                {action.subtitle && (
                  <span className="text-xs text-muted-foreground mt-1">{action.subtitle}</span>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal Dívidas foi removido - agora usa a página CaixaDividas */}

      {/* Modal Gorjetas */}
      <Dialog open={isGorjetasOpen} onOpenChange={setIsGorjetasOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
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
      <ChequesListModal 
        open={isChequesOpen} 
        onOpenChange={setIsChequesOpen}
        caixaId={caixaId}
      />

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
