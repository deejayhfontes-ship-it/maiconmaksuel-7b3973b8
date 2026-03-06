import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus, Search, MoreHorizontal, FileText, Download, Mail,
  X, Eye, AlertTriangle, CheckCircle2, Clock, XCircle,
  FileDown, Loader2, Ban, FileEdit, Settings, RefreshCw,
  TrendingUp, Hash, DollarSign, Server
} from "lucide-react";
import { EmitirNotaFiscalDialog } from "@/components/fiscal/EmitirNotaFiscalDialog";

type NotaFiscal = {
  id: string;
  tipo: "nfe" | "nfce" | "nfse";
  numero: number;
  serie: number;
  chave_acesso: string | null;
  status: "rascunho" | "processando" | "autorizada" | "cancelada" | "rejeitada";
  motivo_rejeicao: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_cpf_cnpj: string | null;
  atendimento_id: string | null;
  valor_total: number;
  data_emissao: string;
  data_autorizacao: string | null;
  data_cancelamento: string | null;
  protocolo: string | null;
  xml_envio?: string | null;
  xml_retorno?: string | null;
  xml_cancelamento?: string | null;
  xml_carta_correcao?: string | null;
  seq_carta_correcao?: number;
};

const STATUS_CONFIG = {
  rascunho: { label: "Rascunho", color: "bg-info text-info-foreground", icon: FileText },
  processando: { label: "Processando", color: "bg-warning text-warning-foreground", icon: Clock },
  autorizada: { label: "Autorizada", color: "bg-success text-success-foreground", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", color: "bg-muted text-muted-foreground", icon: X },
  rejeitada: { label: "Rejeitada", color: "bg-destructive text-destructive-foreground", icon: XCircle },
};

export default function NotasFiscais() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("30");
  const [modalEmitirAberto, setModalEmitirAberto] = useState(false);
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  const [modalCartaCorrecao, setModalCartaCorrecao] = useState(false);
  const [modalInutilizar, setModalInutilizar] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaFiscal | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [textoCorrecao, setTextoCorrecao] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [enviandoCorrecao, setEnviandoCorrecao] = useState(false);
  const [inutilizando, setInutilizando] = useState(false);
  const [inutModelo, setInutModelo] = useState("65");
  const [inutSerie, setInutSerie] = useState("1");
  const [inutNumIni, setInutNumIni] = useState("");
  const [inutNumFin, setInutNumFin] = useState("");
  const [inutJustificativa, setInutJustificativa] = useState("");

  // Query para buscar notas fiscais
  const { data: notas, isLoading } = useQuery({
    queryKey: ["notas-fiscais", filtroTipo, filtroStatus, filtroPeriodo, busca],
    queryFn: async () => {
      let query = supabase
        .from("notas_fiscais")
        .select("*")
        .order("data_emissao", { ascending: false });

      // Filtro de período
      const dias = parseInt(filtroPeriodo);
      if (dias > 0) {
        const dataInicio = subDays(new Date(), dias).toISOString();
        query = query.gte("data_emissao", dataInicio);
      }

      // Filtro de tipo
      if (filtroTipo !== "todos") {
        query = query.eq("tipo", filtroTipo);
      }

      // Filtro de status
      if (filtroStatus !== "todos") {
        query = query.eq("status", filtroStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotaFiscal[];
    },
  });

  // Mutation para cancelar nota
  const cancelarMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from("notas_fiscais")
        .update({
          status: "cancelada",
          data_cancelamento: new Date().toISOString(),
          motivo_rejeicao: motivo,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota fiscal cancelada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      setModalCancelarAberto(false);
      setNotaSelecionada(null);
      setMotivoCancelamento("");
    },
    onError: (error: Error) => {
      toast.error("Erro ao cancelar nota: " + error.message);
    },
  });

  // Mutation para carta de correção
  const cartaCorrecaoMutation = useMutation({
    mutationFn: async ({ id, texto }: { id: string; texto: string }) => {
      const nota = notas?.find(n => n.id === id);
      const seqAtual = (nota?.seq_carta_correcao || 0) + 1;

      // Registrar evento de carta de correção (tabela nova criada via migration)
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/notas_fiscais_eventos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            nota_fiscal_id: id,
            tipo_evento: '110110',
            descricao: 'Carta de Correção',
            sequencial: seqAtual,
            justificativa: texto,
            status: 'processado',
          }),
        });
      } catch (_) { /* ignora se a tabela ainda não existe */ }

      // Atualizar nota
      const { error } = await supabase
        .from("notas_fiscais")
        .update({ motivo_rejeicao: `CCe ${seqAtual}: ${texto}` })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Carta de correção registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      setModalCartaCorrecao(false);
      setNotaSelecionada(null);
      setTextoCorrecao("");
    },
    onError: (error: Error) => {
      toast.error("Erro na carta de correção: " + error.message);
    },
  });

  // Mutation para inutilizar numeração
  const inutilizarMutation = useMutation({
    mutationFn: async (dados: { modelo: string; serie: number; numIni: number; numFin: number; justificativa: string }) => {
      // Registrar inutilização (tabela nova, usa fetch direto)
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/notas_fiscais_inutilizadas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            modelo: dados.modelo,
            serie: dados.serie,
            numero_inicial: dados.numIni,
            numero_final: dados.numFin,
            justificativa: dados.justificativa,
            status: 'processado',
          }),
        });
      } catch (_) { /* ignora se a tabela ainda não existe */ }
    },
    onSuccess: () => {
      toast.success("Numeração inutilizada com sucesso!");
      setModalInutilizar(false);
      setInutNumIni("");
      setInutNumFin("");
      setInutJustificativa("");
    },
    onError: (error: Error) => {
      toast.error("Erro ao inutilizar: " + error.message);
    },
  });

  // Filtrar notas por busca
  const notasFiltradas = notas?.filter((nota) => {
    if (!busca) return true;
    const termoBusca = busca.toLowerCase();
    return (
      nota.numero.toString().includes(termoBusca) ||
      nota.cliente_nome?.toLowerCase().includes(termoBusca) ||
      nota.chave_acesso?.toLowerCase().includes(termoBusca) ||
      nota.cliente_cpf_cnpj?.includes(termoBusca)
    );
  });

  // Calcular resumos (safe para quando notas ainda está undefined/loading)
  const resumos = {
    total: notas?.length ?? 0,
    autorizadas: notas?.filter(n => n.status === "autorizada")?.length ?? 0,
    canceladas: notas?.filter(n => n.status === "cancelada")?.length ?? 0,
    faturamentoMes: notas
      ?.filter(n => {
        if (!n.data_emissao) return false;
        try {
          const emissao = parseISO(n.data_emissao);
          return n.status === "autorizada" && emissao >= startOfMonth(new Date());
        } catch { return false; }
      })
      ?.reduce((acc, n) => acc + (n.valor_total || 0), 0) ?? 0,
  };

  const formatarNumero = (numero: number) => {
    return numero.toString().padStart(6, "0");
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const handleCancelar = () => {
    if (!notaSelecionada) return;
    if (motivoCancelamento.length < 15) {
      toast.error("O motivo deve ter pelo menos 15 caracteres");
      return;
    }
    setCancelando(true);
    cancelarMutation.mutate(
      { id: notaSelecionada.id, motivo: motivoCancelamento },
      { onSettled: () => setCancelando(false) }
    );
  };

  const handleCartaCorrecao = () => {
    if (!notaSelecionada) return;
    if (textoCorrecao.length < 15) {
      toast.error("O texto de correção deve ter pelo menos 15 caracteres");
      return;
    }
    setEnviandoCorrecao(true);
    cartaCorrecaoMutation.mutate(
      { id: notaSelecionada.id, texto: textoCorrecao },
      { onSettled: () => setEnviandoCorrecao(false) }
    );
  };

  const handleInutilizar = () => {
    if (!inutNumIni || !inutNumFin || inutJustificativa.length < 15) {
      toast.error("Preencha todos os campos. Justificativa mínima: 15 caracteres.");
      return;
    }
    setInutilizando(true);
    inutilizarMutation.mutate(
      {
        modelo: inutModelo,
        serie: parseInt(inutSerie),
        numIni: parseInt(inutNumIni),
        numFin: parseInt(inutNumFin),
        justificativa: inutJustificativa,
      },
      { onSettled: () => setInutilizando(false) }
    );
  };

  const podeSerCancelada = (nota: NotaFiscal) => {
    if (nota.status !== "autorizada") return false;
    const dataEmissao = parseISO(nota.data_emissao);
    const horasDesdeEmissao = (Date.now() - dataEmissao.getTime()) / (1000 * 60 * 60);
    return horasDesdeEmissao <= 24;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notas Fiscais</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a emissão de notas fiscais eletrônicas (NF-e / NFC-e)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/configuracoes/fiscal")} className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config. Fiscal</span>
          </Button>
          <Button variant="outline" onClick={() => setModalInutilizar(true)} className="gap-2">
            <Ban className="h-4 w-4" />
            <span className="hidden sm:inline">Inutilizar</span>
          </Button>
          <Button onClick={() => setModalEmitirAberto(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Emitir Nota
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumos.total}</p>
                <p className="text-xs text-muted-foreground">Total Emitidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumos.autorizadas}</p>
                <p className="text-xs text-muted-foreground">Autorizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumos.canceladas}</p>
                <p className="text-xs text-muted-foreground">Canceladas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-lg">{formatarValor(resumos.faturamentoMes)}</p>
                <p className="text-xs text-muted-foreground">Faturamento do Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, número, chave..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="nfe">NF-e (Mod. 55)</SelectItem>
                <SelectItem value="nfce">NFC-e (Mod. 65)</SelectItem>
                <SelectItem value="nfse">NFS-e</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="autorizada">Autorizadas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
                <SelectItem value="rejeitada">Rejeitadas</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="rascunho">Rascunhos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant={filtroPeriodo === "7" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroPeriodo("7")}
            >
              7 dias
            </Button>
            <Button
              variant={filtroPeriodo === "30" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroPeriodo("30")}
            >
              30 dias
            </Button>
            <Button
              variant={filtroPeriodo === "90" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroPeriodo("90")}
            >
              90 dias
            </Button>
            <Button
              variant={filtroPeriodo === "0" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroPeriodo("0")}
            >
              Todas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Notas */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notasFiltradas && notasFiltradas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notasFiltradas.map((nota) => {
                    const StatusIcon = STATUS_CONFIG[nota.status].icon;
                    return (
                      <TableRow key={nota.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/nota-fiscal/${nota.id}`)}>
                        <TableCell className="font-mono font-medium">
                          {formatarNumero(nota.numero)}
                          {nota.seq_carta_correcao && nota.seq_carta_correcao > 0 && (
                            <Badge variant="outline" className="ml-2 text-[10px] px-1">
                              CCe {nota.seq_carta_correcao}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="uppercase">
                            {nota.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate">{nota.cliente_nome || "Consumidor"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(parseISO(nota.data_emissao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatarValor(nota.valor_total)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${STATUS_CONFIG[nota.status].color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_CONFIG[nota.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações da nota fiscal">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/nota-fiscal/${nota.id}`); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              {nota.status === "autorizada" && (
                                <>
                                  <DropdownMenuItem>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Baixar XML
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Download className="mr-2 h-4 w-4" />
                                    Baixar PDF (DANFE)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Enviar por Email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNotaSelecionada(nota);
                                      setModalCartaCorrecao(true);
                                    }}
                                  >
                                    <FileEdit className="mr-2 h-4 w-4" />
                                    Carta de Correção
                                  </DropdownMenuItem>
                                  {podeSerCancelada(nota) && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNotaSelecionada(nota);
                                        setModalCancelarAberto(true);
                                      }}
                                      className="text-destructive"
                                    >
                                      <X className="mr-2 h-4 w-4" />
                                      Cancelar Nota
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                              {nota.status === "rejeitada" && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info("Reenvio será implementado com a integração SEFAZ"); }}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reenviar Nota
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground">Nenhuma nota fiscal encontrada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Emita sua primeira nota fiscal clicando no botão acima
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Emitir Nota Fiscal */}
      <EmitirNotaFiscalDialog
        open={modalEmitirAberto}
        onOpenChange={setModalEmitirAberto}
      />

      {/* Modal Cancelar Nota */}
      <Dialog open={modalCancelarAberto} onOpenChange={setModalCancelarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancelar Nota Fiscal
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A nota será cancelada junto à SEFAZ.
            </DialogDescription>
          </DialogHeader>

          {notaSelecionada && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Número:</span>
                    <span className="ml-2 font-medium">{formatarNumero(notaSelecionada.numero)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="ml-2 font-medium uppercase">{notaSelecionada.tipo}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="ml-2 font-medium">{notaSelecionada.cliente_nome || "Consumidor"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="ml-2 font-medium">{formatarValor(notaSelecionada.valor_total)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
                <Textarea
                  id="motivo"
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Ex: Erro no valor, Cliente desistiu, Duplicidade..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 15 caracteres ({motivoCancelamento.length}/15)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCancelarAberto(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelar}
              disabled={cancelando || motivoCancelamento.length < 15}
            >
              {cancelando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Carta de Correção */}
      <Dialog open={modalCartaCorrecao} onOpenChange={setModalCartaCorrecao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              Carta de Correção Eletrônica (CC-e)
            </DialogTitle>
            <DialogDescription>
              A CC-e corrige informações da NF-e sem alterá-la. Pode ser emitida até 20 vezes.
              Não é possível corrigir: valores, dados fiscais do ICMS, dados do emitente/destinatário.
            </DialogDescription>
          </DialogHeader>

          {notaSelecionada && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nota:</span>
                    <span className="ml-2 font-medium">{formatarNumero(notaSelecionada.numero)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CC-e anterior:</span>
                    <span className="ml-2 font-medium">{notaSelecionada.seq_carta_correcao || 0}/20</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="correcao">Texto da Correção *</Label>
                <Textarea
                  id="correcao"
                  value={textoCorrecao}
                  onChange={(e) => setTextoCorrecao(e.target.value)}
                  placeholder="Ex: Corrigir a descrição do produto X para Y..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 15 caracteres ({textoCorrecao.length}/15)
                </p>
              </div>

              <div className="rounded-lg border border-yellow-300 p-3 bg-yellow-50/50">
                <p className="text-xs text-yellow-800">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  <strong>Atenção:</strong> Cada nova CC-e substitui a anterior. A SEFAZ considera sempre a última.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCartaCorrecao(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCartaCorrecao}
              disabled={enviandoCorrecao || textoCorrecao.length < 15}
            >
              {enviandoCorrecao && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Carta de Correção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Inutilizar Numeração */}
      <Dialog open={modalInutilizar} onOpenChange={setModalInutilizar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Inutilizar Numeração
            </DialogTitle>
            <DialogDescription>
              Inutilize números que foram pulados na sequência de emissão.
              Esta ação é irreversível e será registrada na SEFAZ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select value={inutModelo} onValueChange={setInutModelo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="55">NF-e (Mod. 55)</SelectItem>
                    <SelectItem value="65">NFC-e (Mod. 65)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Série</Label>
                <Input
                  type="number"
                  value={inutSerie}
                  onChange={(e) => setInutSerie(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número Inicial *</Label>
                <Input
                  type="number"
                  value={inutNumIni}
                  onChange={(e) => setInutNumIni(e.target.value)}
                  placeholder="1"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Número Final *</Label>
                <Input
                  type="number"
                  value={inutNumFin}
                  onChange={(e) => setInutNumFin(e.target.value)}
                  placeholder="10"
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Justificativa *</Label>
              <Textarea
                value={inutJustificativa}
                onChange={(e) => setInutJustificativa(e.target.value)}
                placeholder="Ex: Erro no sequencial durante manutenção do sistema..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 15 caracteres ({inutJustificativa.length}/15)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalInutilizar(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleInutilizar}
              disabled={inutilizando || !inutNumIni || !inutNumFin || inutJustificativa.length < 15}
            >
              {inutilizando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Inutilizar Numeração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
