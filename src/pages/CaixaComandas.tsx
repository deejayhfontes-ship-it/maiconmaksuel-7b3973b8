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
  RotateCcw,
  Lock,
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
import { useGerarComissao } from "@/hooks/useGerarComissao";
import { useComandaAuditoria, MotivoCategoriaAuditoria } from "@/hooks/useComandaAuditoria";
import { ComandaAuditoriaModal } from "@/components/atendimentos/ComandaAuditoriaModal";
import { startOfDay, endOfDay } from "date-fns";

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
  const { gerarComissoesDaComanda } = useGerarComissao();
  const { reabrirComanda } = useComandaAuditoria();
  
  const [loading, setLoading] = useState(true);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [comandasFechadas, setComandasFechadas] = useState<Comanda[]>([]);
  const [search, setSearch] = useState("");
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false);
  
  // Reabrir comanda
  const [reabrirTarget, setReabrirTarget] = useState<Comanda | null>(null);
  const [isReabrirModalOpen, setIsReabrirModalOpen] = useState(false);
  
  // Form state para finalização
  const [desconto, setDesconto] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<"valor" | "percentual">("valor");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [valorRecebido, setValorRecebido] = useState(0);
  const [imprimirCupom, setImprimirCupom] = useState(false);
  const [enviarWhatsApp, setEnviarWhatsApp] = useState(false);
  const [gorjeta, setGorjeta] = useState(0);
  // Prazo fiado
  const [fiadoPrazo, setFiadoPrazo] = useState<"20" | "30" | "40" | "custom">("30");
  const [fiadoDataCustom, setFiadoDataCustom] = useState("");

  const fetchComandas = useCallback(async () => {
    setLoading(true);

    const { data: atendimentos, error } = await supabase
      .from("atendimentos")
      .select(`
        *,
        cliente:cliente_id (nome, celular)
      `)
      .in("status", ["aberto", "reaberta"])
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

  const fetchFechadas = useCallback(async () => {
    const hoje = new Date();
    const { data } = await supabase
      .from("atendimentos")
      .select(`*, cliente:cliente_id (nome, celular)`)
      .in("status", ["finalizado", "fechado", "cancelado"]) // 'reaberta' NAO aparece aqui
      .gte("data_hora", startOfDay(hoje).toISOString())
      .lte("data_hora", endOfDay(hoje).toISOString())
      .order("data_hora", { ascending: false });

    const fechadas = await Promise.all(
      (data || []).map(async (at) => {
        const { data: servicos } = await supabase
          .from("atendimento_servicos")
          .select(`*, servico:servico_id (nome), profissional:profissional_id (nome)`)
          .eq("atendimento_id", at.id);
        const { data: produtos } = await supabase
          .from("atendimento_produtos")
          .select(`*, produto:produto_id (nome)`)
          .eq("atendimento_id", at.id);
        return { ...at, servicos: servicos || [], produtos: produtos || [] };
      })
    );
    setComandasFechadas(fechadas);
  }, []);

  useEffect(() => {
    fetchComandas();
    fetchFechadas();
  }, [fetchComandas, fetchFechadas]);

  const handleReabrir = (comanda: Comanda) => {
    setReabrirTarget(comanda);
    setIsReabrirModalOpen(true);
  };

  const confirmarReabertura = async (motivo: string, categoria: MotivoCategoriaAuditoria) => {
    if (!reabrirTarget) return;
    const result = await reabrirComanda(
      {
        id: reabrirTarget.id,
        numero_comanda: reabrirTarget.numero_comanda,
        status: reabrirTarget.status,
        subtotal: reabrirTarget.subtotal,
        desconto: reabrirTarget.desconto,
        valor_final: reabrirTarget.valor_final,
        data_hora: reabrirTarget.data_hora,
        cliente_id: reabrirTarget.cliente_id,
        observacoes: reabrirTarget.observacoes,
        cliente: reabrirTarget.cliente,
      },
      motivo,
      categoria
    );
    if (result.success) {
      toast({
        title: `✅ Comanda #${String(reabrirTarget.numero_comanda).padStart(3, '0')} reaberta!`,
        description: 'A comanda voltou para a lista de abertas para edição.',
      });
      setIsReabrirModalOpen(false);
      setReabrirTarget(null);
      // Refresh ambas as listas para mover a comanda de 'fechadas' para 'abertas'
      await fetchComandas();
      await fetchFechadas();
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  const handleFinalizar = (comanda: Comanda) => {
    setSelectedComanda(comanda);
    setDesconto(0);
    setDescontoTipo("valor");
    setFormaPagamento("dinheiro");
    setValorRecebido(0);
    setGorjeta(0);
    setFiadoPrazo("30");
    setFiadoDataCustom("");
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

    // Verificar caixa aberto antes de processar (exceto fiado que não entra no caixa)
    if (formaPagamento !== "fiado") {
      const { data: caixaCheck } = await supabase
        .from("caixa")
        .select("id")
        .eq("status", "aberto")
        .limit(1)
        .maybeSingle();

      if (!caixaCheck) {
        toast({
          title: "Caixa não está aberto",
          description: "Abra o caixa antes de registrar pagamentos para que o valor entre corretamente.",
          variant: "destructive",
        });
        return;
      }
    }

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
      let vencimento: Date;
      if (fiadoPrazo === "custom" && fiadoDataCustom) {
        vencimento = new Date(fiadoDataCustom + "T12:00:00");
      } else {
        vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + Number(fiadoPrazo));
      }

      await supabase.from("dividas").insert([{
        cliente_id: selectedComanda.cliente_id,
        atendimento_id: selectedComanda.id,
        valor_original: total,
        valor_pago: 0,
        saldo: total,
        data_origem: new Date().toISOString().split("T")[0],
        data_vencimento: vencimento.toISOString().split("T")[0],
        status: "aberta",
        observacoes: `Comanda #${String(selectedComanda.numero_comanda).padStart(3, "0")} - Fiado`,
      }]);
    } else {
      // Pagamento real: quitar qualquer dívida em aberto vinculada a esta comanda
      const { data: dividasAbertas } = await supabase
        .from("dividas")
        .select("id, valor_original")
        .eq("atendimento_id", selectedComanda.id)
        .in("status", ["aberta", "parcial"]);

      if (dividasAbertas && dividasAbertas.length > 0) {
        for (const div of dividasAbertas) {
          await supabase.from("dividas").update({
            status: "quitada",
            saldo: 0,
            valor_pago: div.valor_original,
          }).eq("id", div.id);
        }
      }
    }

    // REGRA: fiado NÃO gera comissão no momento do lançamento.
    // Comissão será gerada apenas quando o fiado for quitado (baixa no pagamento).
    if (formaPagamento !== "fiado") {
      const periodoRef = selectedComanda.data_hora
        ? new Date(selectedComanda.data_hora).toISOString().slice(0, 7)
        : new Date().toISOString().slice(0, 7);
      const profissionaisMap = new Map<string, typeof selectedComanda.servicos>();

      for (const s of selectedComanda.servicos) {
        if (!s.profissional_id) continue;
        if (!profissionaisMap.has(s.profissional_id)) {
          profissionaisMap.set(s.profissional_id, []);
        }
        profissionaisMap.get(s.profissional_id)!.push(s);
      }

      let totalComissoesGeradas = 0;
      for (const [profId, servicos] of profissionaisMap.entries()) {
        const resultado = await gerarComissoesDaComanda({
          comandaId: selectedComanda.id,
          profissionalId: profId,
          itens: servicos.map((s) => ({
            servico_id: s.servico_id ?? null,
            nome_servico: s.servico?.nome ?? undefined,
            valor: Number(s.subtotal ?? s.valor_unitario ?? 0),
            gera_comissao: s.gera_comissao !== false,
          })),
          periodoRef,
        });
        totalComissoesGeradas += resultado?.geradas ?? 0;
      }
      if (profissionaisMap.size > 0 && totalComissoesGeradas === 0) {
        toast({
          title: "Aviso: comissões não geradas",
          description: "Verifique se os profissionais têm % de comissão configurado e se os serviços têm valor > 0.",
          variant: "destructive",
        });
      }
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredComandas.map((comanda) => {
            const minutos = differenceInMinutes(new Date(), parseISO(comanda.data_hora));
            
            return (
              <Card key={comanda.id} className="overflow-hidden flex flex-col h-full">
                <CardHeader className="p-4 pb-3 space-y-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                        <span className="whitespace-nowrap">Comanda #{comanda.numero_comanda}</span>
                        <Badge variant="outline" className="font-normal text-xs shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(minutos)}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm font-medium flex items-center gap-2 mt-2 text-muted-foreground">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="truncate">{comanda.cliente?.nome || "Cliente avulso"}</span>
                      </p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-primary whitespace-nowrap shrink-0">
                      {formatPrice(comanda.subtotal)}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex flex-col flex-1">
                  {/* Itens */}
                  <div className="space-y-1.5 mb-4 flex-1 min-h-0">
                    {comanda.servicos.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Scissors className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1 min-w-0">{s.servico?.nome}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[80px] hidden sm:inline">({s.profissional?.nome})</span>
                        <span className="font-medium shrink-0">{formatPrice(s.subtotal)}</span>
                      </div>
                    ))}
                    {comanda.produtos.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <ShoppingBag className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1 min-w-0">{p.quantidade}x {p.produto?.nome}</span>
                        <span className="font-medium shrink-0">{formatPrice(p.subtotal)}</span>
                      </div>
                    ))}
                    {comanda.servicos.length === 0 && comanda.produtos.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Nenhum item adicionado</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t mt-auto">
                    <Button variant="outline" size="sm" className="flex-1 min-w-[100px]" onClick={() => navigate(`/atendimentos?id=${comanda.id}`)}>
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="hidden xs:inline">Adicionar</span>
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-success hover:bg-success/90 flex-1 min-w-[100px]"
                      onClick={() => handleFinalizar(comanda)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Finalizar
                    </Button>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
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
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Total comandas abertas</p>
              <p className="text-xl sm:text-2xl font-bold truncate">{formatPrice(totalValor)}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs sm:text-sm text-muted-foreground">Tempo médio aberto</p>
              <p className="text-base sm:text-lg font-medium">{formatDuration(tempoMedio)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fechadas Hoje */}
      {comandasFechadas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Fechadas Hoje</h2>
            <Badge variant="outline" className="ml-auto">{comandasFechadas.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {comandasFechadas.map((c) => (
              <Card key={c.id} className="opacity-80 hover:opacity-100 transition-opacity">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">Comanda #{c.numero_comanda}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {c.cliente?.nome || 'Avulso'}
                      </p>
                      <div className="mt-1 space-y-0.5">
                        {c.servicos.slice(0, 3).map((s, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                            <Scissors className="h-2.5 w-2.5" />
                            {s.servico?.nome}
                          </p>
                        ))}
                        {c.servicos.length > 3 && (
                          <p className="text-xs text-muted-foreground">+{c.servicos.length - 3} itens</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">{formatPrice(c.valor_final || c.subtotal)}</p>
                      <Badge className="bg-green-100 text-green-800 text-[10px]">Fechada</Badge>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-amber-600 border-amber-200 hover:bg-amber-50"
                      onClick={() => handleReabrir(c)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reabrir Comanda
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal Reabrir */}
      {reabrirTarget && (
        <ComandaAuditoriaModal
          open={isReabrirModalOpen}
          onOpenChange={setIsReabrirModalOpen}
          acao="reaberta"
          numeroComanda={reabrirTarget.numero_comanda}
          clienteNome={reabrirTarget.cliente?.nome}
          valorComanda={reabrirTarget.valor_final || reabrirTarget.subtotal}
          onConfirmar={confirmarReabertura}
        />
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

            {/* Prazo do Fiado */}
            {formaPagamento === "fiado" && (
              <div className="space-y-2">
                <Label>Prazo de Vencimento</Label>
                <div className="flex gap-2">
                  {(["20", "30", "40"] as const).map((dias) => (
                    <Button
                      key={dias}
                      type="button"
                      size="sm"
                      variant={fiadoPrazo === dias ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => { setFiadoPrazo(dias); setFiadoDataCustom(""); }}
                    >
                      {dias}d
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={fiadoPrazo === "custom" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setFiadoPrazo("custom")}
                  >
                    Data
                  </Button>
                </div>
                {fiadoPrazo === "custom" ? (
                  <Input
                    type="date"
                    value={fiadoDataCustom}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setFiadoDataCustom(e.target.value)}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Vence em: {(() => {
                      const d = new Date();
                      d.setDate(d.getDate() + Number(fiadoPrazo));
                      return d.toLocaleDateString("pt-BR");
                    })()}
                  </p>
                )}
              </div>
            )}

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
