import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  Scissors,
  Package,
  X,
  User,
  Clock,
  Trash2,
  Receipt,
  FileText,
  Wifi,
  WifiOff,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PagamentoModal } from "@/components/atendimentos/PagamentoModal";
import { FecharComandaModal } from "@/components/atendimentos/FecharComandaModal";
import { ClienteSelector } from "@/components/atendimentos/ClienteSelector";
import { ProductSearchInput } from "@/components/atendimentos/ProductSearchInput";
import { cn } from "@/lib/utils";
import { useAtendimentos, AtendimentoServico, AtendimentoProduto } from "@/hooks/useAtendimentos";
import { useRealtimeCallback } from "@/hooks/useRealtimeSubscription";

interface Cliente {
  id: string;
  nome: string;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  comissao_padrao: number;
}

interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  estoque_atual: number;
}

interface Profissional {
  id: string;
  nome: string;
  cor_agenda: string;
}

interface Atendimento {
  id: string;
  numero_comanda: number;
  cliente_id: string | null;
  data_hora: string;
  subtotal: number;
  desconto: number;
  valor_final: number;
  status: string;
  cliente?: { nome: string } | null;
}

interface ItemServico {
  id: string;
  servico_id: string;
  profissional_id: string;
  quantidade: number;
  preco_unitario: number;
  comissao_percentual: number;
  comissao_valor: number;
  subtotal: number;
  servico: { nome: string };
  profissional: { nome: string };
}

interface ItemProduto {
  id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  produto: { nome: string };
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

const Atendimentos = () => {
  // Use offline-first hook
  const {
    atendimentos,
    clientes,
    servicos,
    produtos,
    profissionais,
    loading,
    isOnline,
    pendingSync,
    refetch,
    createComanda,
    updateCliente,
    addServico,
    addProduto,
    removeServico,
    removeProduto,
    updateDesconto,
    fecharComanda,
    cancelarComanda,
    getItemsServicos,
    getItemsProdutos,
  } = useAtendimentos();

  // Realtime: auto-refresh when atendimentos change in another tab/device
  useRealtimeCallback('atendimentos', refetch);

  // Polling fallback: refresh every 30s
  useEffect(() => {
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [itemsServicos, setItemsServicos] = useState<ItemServico[]>([]);
  const [itemsProdutos, setItemsProdutos] = useState<ItemProduto[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isNfModalOpen, setIsNfModalOpen] = useState(false);
  const [atendimentoParaNf, setAtendimentoParaNf] = useState<Atendimento | null>(null);
  const [clienteCredito, setClienteCredito] = useState<{
    elegivel: boolean;
    limite: number;
    saldoDevedor: number;
  }>({ elegivel: false, limite: 0, saldoDevedor: 0 });

  // Form states para adicionar itens
  const [servicoId, setServicoId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [servicoQtd, setServicoQtd] = useState(1);
  const [servicoPreco, setServicoPreco] = useState(0);
  const [produtoId, setProdutoId] = useState("");
  const [produtoQtd, setProdutoQtd] = useState(1);
  const [produtoPreco, setProdutoPreco] = useState(0);

  const { toast } = useToast();

  const fetchItems = useCallback(async (atendimentoId: string) => {
    const [servicosData, produtosData] = await Promise.all([
      getItemsServicos(atendimentoId),
      getItemsProdutos(atendimentoId),
    ]);
    setItemsServicos(servicosData as unknown as ItemServico[]);
    setItemsProdutos(produtosData as unknown as ItemProduto[]);
  }, [getItemsServicos, getItemsProdutos]);

  // No initial fetch needed - useAtendimentos handles it

  useEffect(() => {
    if (selectedAtendimento) {
      fetchItems(selectedAtendimento.id);
      setDesconto(Number(selectedAtendimento.desconto) || 0);
      
      // Buscar info de crédito do cliente
      if (selectedAtendimento.cliente_id) {
        const fetchClienteCredito = async () => {
          const { data: cliente } = await supabase
            .from("clientes")
            .select("elegivel_crediario, limite_crediario")
            .eq("id", selectedAtendimento.cliente_id)
            .single();
          
          const { data: dividas } = await supabase
            .from("dividas")
            .select("saldo")
            .eq("cliente_id", selectedAtendimento.cliente_id)
            .neq("status", "quitada");
          
          const saldoDevedor = (dividas || []).reduce((acc, d) => acc + Number(d.saldo), 0);
          
          setClienteCredito({
            elegivel: cliente?.elegivel_crediario || false,
            limite: cliente?.limite_crediario || 0,
            saldoDevedor,
          });
        };
        fetchClienteCredito();
      } else {
        setClienteCredito({ elegivel: false, limite: 0, saldoDevedor: 0 });
      }
    } else {
      setItemsServicos([]);
      setItemsProdutos([]);
      setDesconto(0);
      setClienteCredito({ elegivel: false, limite: 0, saldoDevedor: 0 });
    }
  }, [selectedAtendimento, fetchItems]);

  const subtotal = [...itemsServicos, ...itemsProdutos].reduce((acc, item) => acc + Number(item.subtotal), 0);
  const valorFinal = Math.max(0, subtotal - desconto);

  const handleNovaComanda = async () => {
    try {
      const data = await createComanda();
      toast({ title: "Comanda criada!", description: `Comanda #${data.numero_comanda.toString().padStart(3, "0")}` });
      setSelectedAtendimento(data as unknown as Atendimento);
    } catch (error: any) {
      toast({ title: "Erro ao criar comanda", description: error.message, variant: "destructive" });
    }
  };

  const handleClienteChange = async (clienteId: string) => {
    if (!selectedAtendimento) return;

    try {
      await updateCliente(selectedAtendimento.id, clienteId === "anonimo" ? null : clienteId);
      const cliente = clientes.find(c => c.id === clienteId);
      setSelectedAtendimento({
        ...selectedAtendimento,
        cliente_id: clienteId === "anonimo" ? null : clienteId,
        cliente: cliente ? { nome: cliente.nome } : null,
      });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleServicoSelect = (id: string) => {
    setServicoId(id);
    const serv = servicos.find(s => s.id === id);
    if (serv) setServicoPreco(Number(serv.preco));
  };

  const handleProdutoSelect = (id: string) => {
    setProdutoId(id);
    const prod = produtos.find(p => p.id === id);
    if (prod) setProdutoPreco(Number(prod.preco_venda));
  };

  const handleAddServico = async () => {
    if (!selectedAtendimento || !servicoId || !profissionalId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const serv = servicos.find(s => s.id === servicoId);
    if (!serv) return;

    const subtotalItem = servicoPreco * servicoQtd;
    const comissaoValor = (subtotalItem * Number(serv.comissao_padrao)) / 100;

    const { error } = await supabase.from("atendimento_servicos").insert([{
      atendimento_id: selectedAtendimento.id,
      servico_id: servicoId,
      profissional_id: profissionalId,
      quantidade: servicoQtd,
      preco_unitario: servicoPreco,
      comissao_percentual: Number(serv.comissao_padrao),
      comissao_valor: comissaoValor,
      subtotal: subtotalItem,
    }]);

    if (error) {
      toast({ title: "Erro ao adicionar serviço", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço adicionado!" });
      // Trigger recalcula automaticamente no banco - apenas refetch
      await fetchItems(selectedAtendimento.id);
      await refetchAtendimentoTotals();
      setServicoId("");
      setProfissionalId("");
      setServicoQtd(1);
      setServicoPreco(0);
    }
  };

  const handleAddProduto = async () => {
    if (!selectedAtendimento || !produtoId) {
      toast({ title: "Selecione um produto", variant: "destructive" });
      return;
    }

    // Verificar estoque disponível antes de adicionar
    const prod = produtos.find(p => p.id === produtoId);
    if (prod && prod.estoque_atual < produtoQtd) {
      toast({ 
        title: "Estoque insuficiente", 
        description: `${prod.nome} tem apenas ${prod.estoque_atual} unidade(s) em estoque.`,
        variant: "destructive" 
      });
      return;
    }

    const subtotalItem = produtoPreco * produtoQtd;

    const { error } = await supabase.from("atendimento_produtos").insert([{
      atendimento_id: selectedAtendimento.id,
      produto_id: produtoId,
      quantidade: produtoQtd,
      preco_unitario: produtoPreco,
      subtotal: subtotalItem,
    }]);

    if (error) {
      toast({ title: "Erro ao adicionar produto", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Produto adicionado!" });
      // Trigger recalcula automaticamente no banco - apenas refetch
      await fetchItems(selectedAtendimento.id);
      await refetchAtendimentoTotals();
      setProdutoId("");
      setProdutoQtd(1);
      setProdutoPreco(0);
    }
  };

  const handleRemoveServico = async (id: string) => {
    const { error } = await supabase.from("atendimento_servicos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      // Trigger recalcula automaticamente no banco - apenas refetch
      await fetchItems(selectedAtendimento!.id);
      await refetchAtendimentoTotals();
    }
  };

  const handleRemoveProduto = async (id: string) => {
    const { error } = await supabase.from("atendimento_produtos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      // Trigger recalcula automaticamente no banco - apenas refetch
      await fetchItems(selectedAtendimento!.id);
      await refetchAtendimentoTotals();
    }
  };

  // Refetch atendimento totals from database (trigger already updated them)
  const refetchAtendimentoTotals = async () => {
    if (!selectedAtendimento) return;
    
    // Fetch updated atendimento from database
    const { data: updatedAtendimento } = await supabase
      .from("atendimentos")
      .select("*, cliente:clientes(nome)")
      .eq("id", selectedAtendimento.id)
      .single();
    
    if (updatedAtendimento) {
      setSelectedAtendimento(updatedAtendimento as Atendimento);
      // Also update the list
      refetch();
    }
  };

  const handleDescontoChange = async (value: number) => {
    setDesconto(value);
    if (!selectedAtendimento) return;

    try {
      await updateDesconto(selectedAtendimento.id, value);
    } catch (error) {
      console.error('Error updating desconto:', error);
    }
  };

  const handleFecharComanda = () => {
    if (itemsServicos.length === 0 && itemsProdutos.length === 0) {
      toast({ title: "Comanda vazia", description: "Adicione itens antes de fechar", variant: "destructive" });
      return;
    }
    // Alertar se o cliente tem saldo devedor
    if (clienteCredito.saldoDevedor > 0) {
      toast({ 
        title: "⚠️ Cliente com saldo devedor", 
        description: `Este cliente tem R$ ${clienteCredito.saldoDevedor.toFixed(2)} em dívidas pendentes.`,
      });
    }
    setIsPaymentOpen(true);
  };

  const handleConfirmarPagamento = async (
    pagamentos: { forma: string; valor: number; parcelas: number }[],
    gorjetas?: { profissional_id: string; profissional_nome: string; valor: number }[]
  ) => {
    if (!selectedAtendimento) return;

    // Verificar se há caixa aberto
    const { data: caixaAberto } = await supabase
      .from("caixa")
      .select("id")
      .eq("status", "aberto")
      .single();

    // Inserir todos os pagamentos
    for (const pag of pagamentos) {
      await supabase.from("pagamentos").insert([{
        atendimento_id: selectedAtendimento.id,
        forma_pagamento: pag.forma,
        valor: pag.valor,
        parcelas: pag.parcelas,
      }]);

      // Se for fiado, criar registro na tabela de dívidas
      if (pag.forma === "fiado" && selectedAtendimento.cliente_id) {
        // Buscar dia de vencimento do cliente
        const { data: clienteData } = await supabase
          .from("clientes")
          .select("dia_vencimento_crediario")
          .eq("id", selectedAtendimento.cliente_id)
          .single();

        // Calcular data de vencimento (próximo dia de vencimento do cliente)
        const hoje = new Date();
        const diaVencimento = clienteData?.dia_vencimento_crediario || 10;
        let dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
        
        // Se o dia já passou neste mês, pegar o próximo mês
        if (dataVencimento <= hoje) {
          dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento);
        }

        await supabase.from("dividas").insert([{
          cliente_id: selectedAtendimento.cliente_id,
          atendimento_id: selectedAtendimento.id,
          valor_original: pag.valor,
          valor_pago: 0,
          saldo: pag.valor,
          data_origem: new Date().toISOString(),
          data_vencimento: dataVencimento.toISOString(),
          status: "aberta",
          observacoes: `Comanda #${selectedAtendimento.numero_comanda.toString().padStart(3, "0")} - Fiado`,
        }]);
      }

      // Registrar movimentação no caixa se estiver aberto (exceto fiado que não entra no caixa)
      if (caixaAberto && pag.forma !== "fiado") {
        await supabase.from("caixa_movimentacoes").insert([{
          caixa_id: caixaAberto.id,
          tipo: "entrada",
          categoria: "atendimento",
          descricao: `Comanda #${selectedAtendimento.numero_comanda.toString().padStart(3, "0")} - ${pag.forma}`,
          valor: pag.valor,
          forma_pagamento: pag.forma,
          atendimento_id: selectedAtendimento.id,
        }]);
      }
    }

    // Inserir gorjetas se houver
    if (gorjetas && gorjetas.length > 0) {
      for (const gorjeta of gorjetas) {
        await supabase.from("gorjetas").insert([{
          profissional_id: gorjeta.profissional_id,
          atendimento_id: selectedAtendimento.id,
          valor: gorjeta.valor,
          data: new Date().toISOString(),
          repassada: false,
        }]);
      }
    }

    // Atualizar estoque dos produtos vendidos e alertar estoque baixo
    for (const item of itemsProdutos) {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (produto) {
        const novoEstoque = Math.max(0, produto.estoque_atual - item.quantidade);
        await supabase.from("produtos").update({
          estoque_atual: novoEstoque,
        }).eq("id", item.produto_id);

        // Alerta de estoque baixo
        if (novoEstoque < (produto as any).estoque_minimo) {
          toast({ 
            title: "⚠️ Estoque baixo", 
            description: `${produto.nome} está abaixo do estoque mínimo (${novoEstoque} restantes).`,
          });
        }
      }
    }

    // Registrar comissões dos profissionais
    for (const item of itemsServicos) {
      if (item.comissao_valor > 0) {
        await supabase.from("comissoes").insert([{
          profissional_id: item.profissional_id,
          atendimento_id: selectedAtendimento.id,
          atendimento_servico_id: item.id,
          tipo: "servico",
          descricao: `Comanda #${selectedAtendimento.numero_comanda.toString().padStart(3, "0")} - ${item.servico.nome}`,
          valor_base: Number(item.subtotal),
          percentual_comissao: Number(item.comissao_percentual),
          valor_comissao: Number(item.comissao_valor),
          status: "pendente",
          data_referencia: new Date().toISOString().split("T")[0],
        }]);
      }
    }

    // Registrar gorjetas como movimentação separada no caixa
    if (gorjetas && gorjetas.length > 0 && caixaAberto) {
      const totalGorjetas = gorjetas.reduce((acc, g) => acc + g.valor, 0);
      await supabase.from("caixa_movimentacoes").insert([{
        caixa_id: caixaAberto.id,
        tipo: "entrada",
        categoria: "gorjeta",
        descricao: `Gorjetas - Comanda #${selectedAtendimento.numero_comanda.toString().padStart(3, "0")}`,
        valor: totalGorjetas,
        forma_pagamento: "dinheiro",
        atendimento_id: selectedAtendimento.id,
      }]);
    }

    // NÃO fechar o atendimento aqui — isso será feito no FecharComandaModal
    // para garantir que a comanda só feche após confirmação do usuário.
    console.log('[Atendimentos] Pagamento registrado, abrindo modal de NF...');

    // Abrir modal de NF após pagamento
    setIsPaymentOpen(false);
    setAtendimentoParaNf({
      ...selectedAtendimento,
      valor_final: valorFinal,
      status: selectedAtendimento.status, // manter status atual (aberto)
    });
    setIsNfModalOpen(true);
    
    refetch(); // Refresh using the hook
  };

  const handleNfModalClose = () => {
    setIsNfModalOpen(false);
    setAtendimentoParaNf(null);
    setSelectedAtendimento(null);
  };

  const handleCancelarComanda = async () => {
    if (!selectedAtendimento) return;

    try {
      await cancelarComanda(selectedAtendimento.id);
      setIsCancelOpen(false);
      setSelectedAtendimento(null);
    } catch (error: any) {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-7rem)]">
      {/* Lista de Comandas */}
      <Card className="w-full lg:w-80 flex-shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Comandas Abertas
            </CardTitle>
            <Badge variant="secondary">{atendimentos.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col gap-3">
          <Button onClick={handleNovaComanda} className="w-full bg-success hover:bg-success/90">
            <Plus className="h-4 w-4 mr-2" />
            Nova Comanda
          </Button>

          {/* Mobile: Horizontal scroll, Desktop: Vertical scroll */}
          <div className="lg:hidden overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {loading ? (
                <p className="text-center text-muted-foreground py-4 w-full">Carregando...</p>
              ) : atendimentos.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 w-full">Nenhuma comanda aberta</p>
              ) : (
                atendimentos.map((at) => (
                  <Card
                    key={at.id}
                    className={`cursor-pointer transition-all hover:shadow-md flex-shrink-0 w-[200px] ${
                      selectedAtendimento?.id === at.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedAtendimento(at)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">
                          #{at.numero_comanda.toString().padStart(3, "0")}
                        </span>
                        <Badge variant="warning" className="text-xs">Aberta</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {at.cliente?.nome || "Sem cliente"}
                      </p>
                      <span className="font-semibold text-success text-sm">
                        {formatPrice(Number(at.valor_final))}
                      </span>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
          
          {/* Desktop: Vertical scroll */}
          <ScrollArea className="flex-1 hidden lg:block">
            <div className="space-y-2 pr-2">
              {loading ? (
                <p className="text-center text-muted-foreground py-4">Carregando...</p>
              ) : atendimentos.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhuma comanda aberta</p>
              ) : (
                atendimentos.map((at) => (
                  <Card
                    key={at.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedAtendimento?.id === at.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedAtendimento(at)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-lg">
                          #{at.numero_comanda.toString().padStart(3, "0")}
                        </span>
                        <Badge variant="warning">Aberta</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {at.cliente?.nome || "Sem cliente"}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(at.data_hora), "HH:mm", { locale: ptBR })}
                        </span>
                        <span className="font-semibold text-success">
                          {formatPrice(Number(at.valor_final))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detalhes da Comanda */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {!selectedAtendimento ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Selecione uma comanda ou crie uma nova</p>
            </div>
          </div>
        ) : (
          <>
            <CardHeader className="pb-3 border-b space-y-4">
              <CardTitle className="text-xl">
                Comanda #{selectedAtendimento.numero_comanda.toString().padStart(3, "0")}
              </CardTitle>
              <ClienteSelector
                selectedClienteId={selectedAtendimento.cliente_id}
                selectedClienteNome={selectedAtendimento.cliente?.nome}
                onClienteChange={handleClienteChange}
                clientes={clientes}
              />
            </CardHeader>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Adicionar Itens */}
              <Tabs defaultValue="servicos">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="servicos" className="flex items-center gap-2">
                    <Scissors className="h-4 w-4" /> Serviços
                  </TabsTrigger>
                  <TabsTrigger value="produtos" className="flex items-center gap-2">
                    <Package className="h-4 w-4" /> Produtos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="servicos" className="space-y-3 mt-3">
                  <div className="grid grid-cols-5 gap-2 items-end">
                    <div className="col-span-2">
                      <Label className="text-xs">Serviço</Label>
                      <Select value={servicoId} onValueChange={handleServicoSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {servicos.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nome} - {formatPrice(Number(s.preco))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Profissional</Label>
                      <Select value={profissionalId} onValueChange={setProfissionalId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {profissionais.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min={1}
                        value={servicoQtd}
                        onChange={(e) => setServicoQtd(Number(e.target.value))}
                      />
                    </div>
                    <Button onClick={handleAddServico} className="bg-primary">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="produtos" className="space-y-3 mt-3">
                  <div className="grid grid-cols-4 gap-2 items-end">
                    <div className="col-span-2">
                      <Label className="text-xs">Produto (digite para buscar)</Label>
                      <ProductSearchInput
                        produtos={produtos}
                        selectedProdutoId={produtoId}
                        onProductSelect={handleProdutoSelect}
                        onClear={() => {
                          setProdutoId("");
                          setProdutoQtd(1);
                          setProdutoPreco(0);
                        }}
                        placeholder="Nome, código de barras..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min={1}
                        value={produtoQtd}
                        onChange={(e) => setProdutoQtd(Number(e.target.value))}
                      />
                    </div>
                    <Button onClick={handleAddProduto} className="bg-primary">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Lista de Itens */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsServicos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="info">Serviço</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.servico.nome}</TableCell>
                        <TableCell>{item.profissional.nome}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatPrice(Number(item.preco_unitario))}</TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(Number(item.subtotal))}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveServico(item.id)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {itemsProdutos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="success">Produto</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.produto.nome}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatPrice(Number(item.preco_unitario))}</TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(Number(item.subtotal))}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveProduto(item.id)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {itemsServicos.length === 0 && itemsProdutos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum item adicionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Totais e Ações */}
            <div className="border-t p-4 bg-muted/30">
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Desconto (R$):</Label>
                    <Input
                      type="number"
                      min={0}
                      max={subtotal}
                      step={0.01}
                      value={desconto}
                      onChange={(e) => handleDescontoChange(Number(e.target.value))}
                      className="w-24 h-8"
                    />
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>TOTAL:</span>
                    <span className="text-success text-2xl">{formatPrice(valorFinal)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsCancelOpen(true)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleFecharComanda} className="bg-success hover:bg-success/90 px-8">
                    Fechar Comanda
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modal de Pagamento */}
      <PagamentoModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        atendimentoId={selectedAtendimento?.id}
        numeroComanda={selectedAtendimento?.numero_comanda || 0}
        clienteNome={selectedAtendimento?.cliente?.nome || null}
        clienteId={selectedAtendimento?.cliente_id || null}
        clienteElegivelCredito={clienteCredito.elegivel}
        clienteLimiteCredito={clienteCredito.limite}
        clienteSaldoDevedor={clienteCredito.saldoDevedor}
        totalComanda={valorFinal}
        profissionais={profissionais}
        onConfirmar={handleConfirmarPagamento}
      />

      {/* Confirmar Cancelamento */}
      <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar comanda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os itens serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelarComanda} className="bg-destructive hover:bg-destructive/90">
              Cancelar Comanda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Nota Fiscal */}
      <FecharComandaModal
        open={isNfModalOpen}
        onOpenChange={setIsNfModalOpen}
        atendimento={atendimentoParaNf}
        onSuccess={handleNfModalClose}
      />
    </div>
  );
};

export default Atendimentos;
