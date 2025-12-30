import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  Edit,
  Trash2,
  Wallet,
  Receipt,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, addDays, subDays, parseISO, isBefore, startOfWeek, endOfWeek, addMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ContaPagar {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  observacoes: string | null;
}

interface ContaReceber {
  id: string;
  cliente_id: string | null;
  atendimento_id: string | null;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_recebimento: string | null;
  status: string;
  forma_pagamento: string | null;
  observacoes: string | null;
  cliente?: { nome: string } | null;
}

const categoriasPagar = [
  { value: "aluguel", label: "Aluguel" },
  { value: "salarios", label: "Salários" },
  { value: "energia", label: "Energia" },
  { value: "agua", label: "Água" },
  { value: "internet", label: "Internet" },
  { value: "produtos", label: "Produtos" },
  { value: "outros", label: "Outros" },
];

const formasPagamento = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

const Financeiro = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pagar");
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState("mes");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  
  // Form states
  const [isFormPagarOpen, setIsFormPagarOpen] = useState(false);
  const [isFormReceberOpen, setIsFormReceberOpen] = useState(false);
  const [isPagarModalOpen, setIsPagarModalOpen] = useState(false);
  const [isReceberModalOpen, setIsReceberModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingPagar, setEditingPagar] = useState<ContaPagar | null>(null);
  const [editingReceber, setEditingReceber] = useState<ContaReceber | null>(null);
  const [selectedConta, setSelectedConta] = useState<ContaPagar | ContaReceber | null>(null);
  const [deleteType, setDeleteType] = useState<"pagar" | "receber">("pagar");
  
  // Pagar form
  const [formPagar, setFormPagar] = useState({
    descricao: "",
    categoria: "outros",
    valor: "",
    data_vencimento: format(new Date(), "yyyy-MM-dd"),
    observacoes: "",
  });
  
  // Receber form
  const [formReceber, setFormReceber] = useState({
    descricao: "",
    cliente_id: "",
    valor: "",
    data_vencimento: format(new Date(), "yyyy-MM-dd"),
    observacoes: "",
  });

  // Pagamento form
  const [formPagamento, setFormPagamento] = useState({
    data: format(new Date(), "yyyy-MM-dd"),
    forma_pagamento: "pix",
  });

  const [fluxoPeriodo, setFluxoPeriodo] = useState("mes");
  
  const { toast } = useToast();

  const fetchContasPagar = async () => {
    let query = supabase.from("contas_pagar").select("*").order("data_vencimento");
    
    const hoje = new Date();
    if (filtroPeriodo === "mes") {
      query = query.gte("data_vencimento", format(startOfMonth(hoje), "yyyy-MM-dd"))
                   .lte("data_vencimento", format(endOfMonth(hoje), "yyyy-MM-dd"));
    } else if (filtroPeriodo === "30dias") {
      query = query.gte("data_vencimento", format(subDays(hoje, 30), "yyyy-MM-dd"))
                   .lte("data_vencimento", format(addDays(hoje, 30), "yyyy-MM-dd"));
    } else if (filtroPeriodo === "atrasadas") {
      query = query.lt("data_vencimento", format(hoje, "yyyy-MM-dd"))
                   .eq("status", "pendente");
    }
    
    if (filtroStatus !== "todos") {
      query = query.eq("status", filtroStatus);
    }
    
    if (filtroCategoria !== "todos") {
      query = query.eq("categoria", filtroCategoria);
    }
    
    const { data, error } = await query;
    if (error) {
      toast({ title: "Erro ao carregar contas", variant: "destructive" });
    } else {
      // Update status for overdue accounts
      const updated = (data || []).map(conta => {
        if (conta.status === "pendente" && isBefore(parseISO(conta.data_vencimento), hoje)) {
          return { ...conta, status: "atrasado" };
        }
        return conta;
      });
      setContasPagar(updated);
    }
  };

  const fetchContasReceber = async () => {
    let query = supabase.from("contas_receber")
      .select("*, cliente:clientes(nome)")
      .order("data_vencimento");
    
    const hoje = new Date();
    if (filtroPeriodo === "mes") {
      query = query.gte("data_vencimento", format(startOfMonth(hoje), "yyyy-MM-dd"))
                   .lte("data_vencimento", format(endOfMonth(hoje), "yyyy-MM-dd"));
    } else if (filtroPeriodo === "30dias") {
      query = query.gte("data_vencimento", format(subDays(hoje, 30), "yyyy-MM-dd"))
                   .lte("data_vencimento", format(addDays(hoje, 30), "yyyy-MM-dd"));
    } else if (filtroPeriodo === "atrasadas") {
      query = query.lt("data_vencimento", format(hoje, "yyyy-MM-dd"))
                   .eq("status", "pendente");
    }
    
    if (filtroStatus !== "todos") {
      query = query.eq("status", filtroStatus);
    }
    
    const { data, error } = await query;
    if (error) {
      toast({ title: "Erro ao carregar contas", variant: "destructive" });
    } else {
      const updated = (data || []).map(conta => {
        if (conta.status === "pendente" && isBefore(parseISO(conta.data_vencimento), new Date())) {
          return { ...conta, status: "atrasado" };
        }
        return conta;
      });
      setContasReceber(updated as ContaReceber[]);
    }
  };

  const fetchClientes = async () => {
    const { data } = await supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome");
    if (data) setClientes(data);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchContasPagar(), fetchContasReceber(), fetchClientes()]);
      setLoading(false);
    };
    loadData();
  }, [filtroPeriodo, filtroStatus, filtroCategoria]);

  // Stats calculations
  const statsPagar = {
    aPagar: contasPagar.filter(c => c.status === "pendente").reduce((acc, c) => acc + Number(c.valor), 0),
    pago: contasPagar.filter(c => c.status === "pago").reduce((acc, c) => acc + Number(c.valor), 0),
    atrasadas: contasPagar.filter(c => c.status === "atrasado").reduce((acc, c) => acc + Number(c.valor), 0),
    qtdAtrasadas: contasPagar.filter(c => c.status === "atrasado").length,
  };

  const statsReceber = {
    aReceber: contasReceber.filter(c => c.status === "pendente").reduce((acc, c) => acc + Number(c.valor), 0),
    recebido: contasReceber.filter(c => c.status === "recebido").reduce((acc, c) => acc + Number(c.valor), 0),
    atrasadas: contasReceber.filter(c => c.status === "atrasado").reduce((acc, c) => acc + Number(c.valor), 0),
    qtdAtrasadas: contasReceber.filter(c => c.status === "atrasado").length,
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pendente: { label: "Pendente", className: "bg-amber-500/10 text-amber-600" },
      pago: { label: "Pago", className: "bg-success/10 text-success" },
      recebido: { label: "Recebido", className: "bg-success/10 text-success" },
      atrasado: { label: "Atrasado", className: "bg-destructive/10 text-destructive" },
    };
    const config = configs[status] || configs.pendente;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleSavePagar = async () => {
    if (!formPagar.descricao || !formPagar.valor) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    const payload = {
      descricao: formPagar.descricao,
      categoria: formPagar.categoria,
      valor: parseFloat(formPagar.valor),
      data_vencimento: formPagar.data_vencimento,
      observacoes: formPagar.observacoes || null,
    };

    if (editingPagar) {
      const { error } = await supabase.from("contas_pagar").update(payload).eq("id", editingPagar.id);
      if (error) {
        toast({ title: "Erro ao atualizar", variant: "destructive" });
      } else {
        toast({ title: "Conta atualizada!" });
        fetchContasPagar();
      }
    } else {
      const { error } = await supabase.from("contas_pagar").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar conta", variant: "destructive" });
      } else {
        toast({ title: "Conta criada!" });
        fetchContasPagar();
      }
    }
    
    setIsFormPagarOpen(false);
    setEditingPagar(null);
    setFormPagar({ descricao: "", categoria: "outros", valor: "", data_vencimento: format(new Date(), "yyyy-MM-dd"), observacoes: "" });
  };

  const handleSaveReceber = async () => {
    if (!formReceber.descricao || !formReceber.valor) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    const payload = {
      descricao: formReceber.descricao,
      cliente_id: formReceber.cliente_id || null,
      valor: parseFloat(formReceber.valor),
      data_vencimento: formReceber.data_vencimento,
      observacoes: formReceber.observacoes || null,
    };

    if (editingReceber) {
      const { error } = await supabase.from("contas_receber").update(payload).eq("id", editingReceber.id);
      if (error) {
        toast({ title: "Erro ao atualizar", variant: "destructive" });
      } else {
        toast({ title: "Conta atualizada!" });
        fetchContasReceber();
      }
    } else {
      const { error } = await supabase.from("contas_receber").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar conta", variant: "destructive" });
      } else {
        toast({ title: "Conta criada!" });
        fetchContasReceber();
      }
    }
    
    setIsFormReceberOpen(false);
    setEditingReceber(null);
    setFormReceber({ descricao: "", cliente_id: "", valor: "", data_vencimento: format(new Date(), "yyyy-MM-dd"), observacoes: "" });
  };

  const handlePagar = async () => {
    if (!selectedConta) return;
    
    const { error } = await supabase.from("contas_pagar").update({
      status: "pago",
      data_pagamento: formPagamento.data,
      forma_pagamento: formPagamento.forma_pagamento,
    }).eq("id", selectedConta.id);

    if (error) {
      toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
    } else {
      toast({ title: "Pagamento registrado!" });
      fetchContasPagar();
    }
    setIsPagarModalOpen(false);
    setSelectedConta(null);
  };

  const handleReceber = async () => {
    if (!selectedConta) return;
    
    const { error } = await supabase.from("contas_receber").update({
      status: "recebido",
      data_recebimento: formPagamento.data,
      forma_pagamento: formPagamento.forma_pagamento,
    }).eq("id", selectedConta.id);

    if (error) {
      toast({ title: "Erro ao registrar recebimento", variant: "destructive" });
    } else {
      toast({ title: "Recebimento registrado!" });
      fetchContasReceber();
    }
    setIsReceberModalOpen(false);
    setSelectedConta(null);
  };

  const handleDelete = async () => {
    if (!selectedConta) return;
    
    const table = deleteType === "pagar" ? "contas_pagar" : "contas_receber";
    const { error } = await supabase.from(table).delete().eq("id", selectedConta.id);

    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Conta excluída!" });
      if (deleteType === "pagar") fetchContasPagar();
      else fetchContasReceber();
    }
    setIsDeleteOpen(false);
    setSelectedConta(null);
  };

  const openEditPagar = (conta: ContaPagar) => {
    setEditingPagar(conta);
    setFormPagar({
      descricao: conta.descricao,
      categoria: conta.categoria,
      valor: conta.valor.toString(),
      data_vencimento: conta.data_vencimento,
      observacoes: conta.observacoes || "",
    });
    setIsFormPagarOpen(true);
  };

  const openEditReceber = (conta: ContaReceber) => {
    setEditingReceber(conta);
    setFormReceber({
      descricao: conta.descricao,
      cliente_id: conta.cliente_id || "",
      valor: conta.valor.toString(),
      data_vencimento: conta.data_vencimento,
      observacoes: conta.observacoes || "",
    });
    setIsFormReceberOpen(true);
  };

  // Fluxo de Caixa data
  const getFluxoData = () => {
    const hoje = new Date();
    let startDate: Date;
    let endDate: Date;
    
    if (fluxoPeriodo === "semana") {
      startDate = startOfWeek(hoje, { weekStartsOn: 1 });
      endDate = endOfWeek(hoje, { weekStartsOn: 1 });
    } else if (fluxoPeriodo === "mes") {
      startDate = startOfMonth(hoje);
      endDate = endOfMonth(hoje);
    } else {
      startDate = startOfMonth(hoje);
      endDate = endOfMonth(addMonths(hoje, 2));
    }

    const data: { date: string; entradas: number; saidas: number }[] = [];
    let currentDate = startDate;
    
    while (isBefore(currentDate, endDate) || format(currentDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const entradas = contasReceber
        .filter(c => c.data_vencimento === dateStr || c.data_recebimento === dateStr)
        .reduce((acc, c) => acc + Number(c.valor), 0);
      const saidas = contasPagar
        .filter(c => c.data_vencimento === dateStr || c.data_pagamento === dateStr)
        .reduce((acc, c) => acc + Number(c.valor), 0);
      
      data.push({
        date: format(currentDate, "dd/MM"),
        entradas,
        saidas,
      });
      
      currentDate = addDays(currentDate, 1);
    }
    
    return data;
  };

  const fluxoData = getFluxoData();
  const totalEntradas = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0);
  const totalSaidas = contasPagar.reduce((acc, c) => acc + Number(c.valor), 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Gestão de contas a pagar e receber</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === "vales") {
          navigate("/financeiro/vales");
        } else {
          setActiveTab(value);
        }
      }}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="vales">Vales</TabsTrigger>
        </TabsList>

        {/* TAB PAGAR */}
        <TabsContent value="pagar" className="space-y-4">
          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="30dias">30 dias</SelectItem>
                  <SelectItem value="atrasadas">Atrasadas</SelectItem>
                  <SelectItem value="todas">Todas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {categoriasPagar.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setEditingPagar(null); setFormPagar({ descricao: "", categoria: "outros", valor: "", data_vencimento: format(new Date(), "yyyy-MM-dd"), observacoes: "" }); setIsFormPagarOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-destructive">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">A Pagar</p>
                    <p className="text-xl font-bold text-destructive">{formatCurrency(statsPagar.aPagar)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-success">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Check className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pago</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(statsPagar.pago)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Atrasadas ({statsPagar.qtdAtrasadas})</p>
                    <p className="text-xl font-bold text-amber-500">{formatCurrency(statsPagar.atrasadas)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : contasPagar.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma conta encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    contasPagar.map((conta) => (
                      <TableRow key={conta.id}>
                        <TableCell>{getStatusBadge(conta.status)}</TableCell>
                        <TableCell>{format(parseISO(conta.data_vencimento), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">{conta.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categoriasPagar.find(c => c.value === conta.categoria)?.label || conta.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(conta.valor))}</TableCell>
                        <TableCell>
                          {conta.data_pagamento ? format(parseISO(conta.data_pagamento), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {conta.status !== "pago" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-success border-success hover:bg-success/10"
                                onClick={() => { setSelectedConta(conta); setFormPagamento({ data: format(new Date(), "yyyy-MM-dd"), forma_pagamento: "pix" }); setIsPagarModalOpen(true); }}
                              >
                                <Check className="h-3 w-3 mr-1" /> Pagar
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditPagar(conta)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { setSelectedConta(conta); setDeleteType("pagar"); setIsDeleteOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB RECEBER */}
        <TabsContent value="receber" className="space-y-4">
          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="30dias">30 dias</SelectItem>
                  <SelectItem value="atrasadas">Atrasadas</SelectItem>
                  <SelectItem value="todas">Todas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setEditingReceber(null); setFormReceber({ descricao: "", cliente_id: "", valor: "", data_vencimento: format(new Date(), "yyyy-MM-dd"), observacoes: "" }); setIsFormReceberOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">A Receber</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(statsReceber.aReceber)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-success">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Check className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recebido</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(statsReceber.recebido)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Atrasadas ({statsReceber.qtdAtrasadas})</p>
                    <p className="text-xl font-bold text-amber-500">{formatCurrency(statsReceber.atrasadas)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Recebimento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : contasReceber.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma conta encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    contasReceber.map((conta) => (
                      <TableRow key={conta.id}>
                        <TableCell>{getStatusBadge(conta.status)}</TableCell>
                        <TableCell>{format(parseISO(conta.data_vencimento), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{conta.cliente?.nome || "-"}</TableCell>
                        <TableCell className="font-medium">{conta.descricao}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(conta.valor))}</TableCell>
                        <TableCell>
                          {conta.data_recebimento ? format(parseISO(conta.data_recebimento), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {conta.status !== "recebido" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-success border-success hover:bg-success/10"
                                onClick={() => { setSelectedConta(conta); setFormPagamento({ data: format(new Date(), "yyyy-MM-dd"), forma_pagamento: "pix" }); setIsReceberModalOpen(true); }}
                              >
                                <Check className="h-3 w-3 mr-1" /> Receber
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditReceber(conta)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { setSelectedConta(conta); setDeleteType("receber"); setIsDeleteOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB FLUXO */}
        <TabsContent value="fluxo" className="space-y-4">
          <div className="flex justify-end">
            <Select value={fluxoPeriodo} onValueChange={setFluxoPeriodo}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Esta Semana</SelectItem>
                <SelectItem value="mes">Este Mês</SelectItem>
                <SelectItem value="3meses">3 Meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-success">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Entradas</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(totalEntradas)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-destructive">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Saídas</p>
                    <p className="text-xl font-bold text-destructive">{formatCurrency(totalSaidas)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Projetado</p>
                    <p className={`text-xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatCurrency(saldo)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fluxoData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name === "entradas" ? "Entradas" : "Saídas"]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="entradas" stroke="hsl(var(--success))" strokeWidth={2} name="Entradas" />
                    <Line type="monotone" dataKey="saidas" stroke="hsl(var(--destructive))" strokeWidth={2} name="Saídas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Form Pagar */}
      <Dialog open={isFormPagarOpen} onOpenChange={setIsFormPagarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPagar ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={formPagar.descricao} onChange={(e) => setFormPagar({ ...formPagar, descricao: e.target.value })} placeholder="Ex: Conta de luz" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={formPagar.categoria} onValueChange={(v) => setFormPagar({ ...formPagar, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoriasPagar.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={formPagar.valor} onChange={(e) => setFormPagar({ ...formPagar, valor: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Data de Vencimento</Label>
              <Input type="date" value={formPagar.data_vencimento} onChange={(e) => setFormPagar({ ...formPagar, data_vencimento: e.target.value })} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={formPagar.observacoes} onChange={(e) => setFormPagar({ ...formPagar, observacoes: e.target.value })} placeholder="Observações adicionais..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormPagarOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePagar}>{editingPagar ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Form Receber */}
      <Dialog open={isFormReceberOpen} onOpenChange={setIsFormReceberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReceber ? "Editar Conta" : "Nova Conta a Receber"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={formReceber.descricao} onChange={(e) => setFormReceber({ ...formReceber, descricao: e.target.value })} placeholder="Ex: Serviço avulso" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <Select value={formReceber.cliente_id} onValueChange={(v) => setFormReceber({ ...formReceber, cliente_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={formReceber.valor} onChange={(e) => setFormReceber({ ...formReceber, valor: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Data de Vencimento</Label>
              <Input type="date" value={formReceber.data_vencimento} onChange={(e) => setFormReceber({ ...formReceber, data_vencimento: e.target.value })} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={formReceber.observacoes} onChange={(e) => setFormReceber({ ...formReceber, observacoes: e.target.value })} placeholder="Observações adicionais..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormReceberOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveReceber}>{editingReceber ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Pagar */}
      <Dialog open={isPagarModalOpen} onOpenChange={setIsPagarModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Conta</p>
              <p className="font-medium">{(selectedConta as ContaPagar)?.descricao}</p>
              <p className="text-lg font-bold text-primary mt-1">{formatCurrency(Number((selectedConta as ContaPagar)?.valor || 0))}</p>
            </div>
            <div>
              <Label>Data do Pagamento</Label>
              <Input type="date" value={formPagamento.data} onChange={(e) => setFormPagamento({ ...formPagamento, data: e.target.value })} />
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={formPagamento.forma_pagamento} onValueChange={(v) => setFormPagamento({ ...formPagamento, forma_pagamento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPagarModalOpen(false)}>Cancelar</Button>
            <Button onClick={handlePagar} className="bg-success hover:bg-success/90">Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Receber */}
      <Dialog open={isReceberModalOpen} onOpenChange={setIsReceberModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Conta</p>
              <p className="font-medium">{(selectedConta as ContaReceber)?.descricao}</p>
              <p className="text-lg font-bold text-primary mt-1">{formatCurrency(Number((selectedConta as ContaReceber)?.valor || 0))}</p>
            </div>
            <div>
              <Label>Data do Recebimento</Label>
              <Input type="date" value={formPagamento.data} onChange={(e) => setFormPagamento({ ...formPagamento, data: e.target.value })} />
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={formPagamento.forma_pagamento} onValueChange={(v) => setFormPagamento({ ...formPagamento, forma_pagamento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {formasPagamento.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceberModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleReceber} className="bg-success hover:bg-success/90">Confirmar Recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conta será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Financeiro;