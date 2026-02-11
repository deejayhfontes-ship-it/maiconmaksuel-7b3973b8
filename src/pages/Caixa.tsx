import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Coffee,
  Car,
  Package,
  Sparkles,
  MoreHorizontal,
  AlertTriangle,
  Users,
  DollarSign,
  FileText,
  Gift,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  Monitor,
  Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useCaixa, CaixaMovimentacao } from "@/hooks/useCaixa";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ComandasAbertasSection } from "@/components/caixa/ComandasAbertasSection";
import { AcoesRapidasSection } from "@/components/caixa/AcoesRapidasSection";
import { ChequesListModal } from "@/components/caixa/ChequesListModal";
import { ChequeFormModal } from "@/components/caixa/ChequeFormModal";
import { isFeatureAllowed, getDeviceInfo, DeviceInfo } from "@/lib/deviceType";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

const categoriasDespesa = [
  { value: "cafe", label: "Café/Lanche", icon: Coffee },
  { value: "transporte", label: "Transporte", icon: Car },
  { value: "material", label: "Material", icon: Package },
  { value: "limpeza", label: "Limpeza", icon: Sparkles },
  { value: "outros", label: "Outros", icon: MoreHorizontal },
];

const getCategoriaIcon = (categoria: string) => {
  const cat = categoriasDespesa.find((c) => c.value === categoria);
  return cat?.icon || MoreHorizontal;
};

const Caixa = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use the offline-first hook
  const {
    caixaAberto,
    movimentacoes,
    despesas,
    totais,
    loading,
    syncing,
    isOnline,
    lastSync,
    abrirCaixa,
    fecharCaixa,
    registrarSangria,
    registrarReforco,
    registrarDespesa,
    refresh,
  } = useCaixa();

  // Polling fallback: refresh every 30s
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Device info for access control
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo());
  const [tabAtiva, setTabAtiva] = useState("todas");

  // Modals
  const [isAbrirOpen, setIsAbrirOpen] = useState(false);
  const [isFecharOpen, setIsFecharOpen] = useState(false);
  const [isDespesaOpen, setIsDespesaOpen] = useState(false);
  const [isSangriaOpen, setIsSangriaOpen] = useState(false);
  const [isReforcoOpen, setIsReforcoOpen] = useState(false);
  const [isChequesListOpen, setIsChequesListOpen] = useState(false);
  const [isNovoChequeOpen, setIsNovoChequeOpen] = useState(false);

  // Form states
  const [valorInicial, setValorInicial] = useState(0);
  const [obsAbertura, setObsAbertura] = useState("");
  const [valorFechamento, setValorFechamento] = useState(0);
  const [obsFechamento, setObsFechamento] = useState("");
  const [despesaDesc, setDespesaDesc] = useState("");
  const [despesaCat, setDespesaCat] = useState("cafe");
  const [despesaValor, setDespesaValor] = useState(0);
  const [despesaPagoPor, setDespesaPagoPor] = useState<"caixa" | "dono">("caixa");
  const [despesaObs, setDespesaObs] = useState("");
  const [sangriaValor, setSangriaValor] = useState(0);
  const [sangriaMotivo, setSangriaMotivo] = useState("");
  const [reforcoValor, setReforcoValor] = useState(0);
  const [reforcoMotivo, setReforcoMotivo] = useState("");

  // Update device info on resize
  useEffect(() => {
    const handleResize = () => setDeviceInfo(getDeviceInfo());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check permissions
  const canOpenCaixa = isFeatureAllowed("abrir-caixa");
  const canCloseCaixa = isFeatureAllowed("fechar-caixa");
  const canSangria = isFeatureAllowed("sangria");
  const canReforco = isFeatureAllowed("reforco");
  const canDespesa = isFeatureAllowed("despesa-rapida");
  const canCheques = isFeatureAllowed("cheques");

  const handleAbrirCaixa = async () => {
    const result = await abrirCaixa(valorInicial, obsAbertura);
    if (result) {
      setIsAbrirOpen(false);
      setValorInicial(0);
      setObsAbertura("");
    }
  };

  const handleFecharCaixa = async () => {
    const result = await fecharCaixa(valorFechamento, obsFechamento);
    if (result) {
      setIsFecharOpen(false);
      setValorFechamento(0);
      setObsFechamento("");
    }
  };

  const handleAddDespesa = async () => {
    if (!despesaDesc || despesaValor <= 0) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const result = await registrarDespesa({
      caixa_id: caixaAberto?.id || null,
      descricao: despesaDesc,
      categoria: despesaCat,
      valor: despesaValor,
      pago_por: despesaPagoPor,
      observacoes: despesaObs || null,
    });

    if (result) {
      setIsDespesaOpen(false);
      setDespesaDesc("");
      setDespesaCat("cafe");
      setDespesaValor(0);
      setDespesaPagoPor("caixa");
      setDespesaObs("");
    }
  };

  const handleSangria = async () => {
    if (sangriaValor <= 0 || !sangriaMotivo) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const result = await registrarSangria(sangriaValor, sangriaMotivo);
    if (result) {
      setIsSangriaOpen(false);
      setSangriaValor(0);
      setSangriaMotivo("");
    }
  };

  const handleReforco = async () => {
    if (reforcoValor <= 0 || !reforcoMotivo) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const result = await registrarReforco(reforcoValor, reforcoMotivo);
    if (result) {
      setIsReforcoOpen(false);
      setReforcoValor(0);
      setReforcoMotivo("");
    }
  };

  const movimentacoesFiltradas = useMemo(() => {
    switch (tabAtiva) {
      case "entradas":
        return movimentacoes.filter((m) => m.tipo === "entrada" || m.tipo === "reforco");
      case "saidas":
        return movimentacoes.filter((m) => m.tipo === "saida" || m.tipo === "sangria");
      default:
        return movimentacoes;
    }
  }, [movimentacoes, tabAtiva]);

  const getTipoBadge = (tipo: string, categoria?: string | null) => {
    switch (tipo) {
      case "entrada":
        return (
          <Badge variant="success" className="gap-1">
            <DollarSign className="h-3 w-3" />
            Entrada
          </Badge>
        );
      case "saida":
        return (
          <Badge variant="destructive" className="gap-1">
            <ArrowUpCircle className="h-3 w-3" />
            Saída
          </Badge>
        );
      case "sangria":
        return (
          <Badge variant="warning" className="gap-1">
            <ArrowUpCircle className="h-3 w-3" />
            Sangria
          </Badge>
        );
      case "reforco":
        return (
          <Badge variant="info" className="gap-1">
            <ArrowDownCircle className="h-3 w-3" />
            Reforço
          </Badge>
        );
      default:
        if (categoria === "vale") {
          return (
            <Badge className="bg-purple-500 gap-1">
              <FileText className="h-3 w-3" />
              Vale
            </Badge>
          );
        }
        if (categoria === "gorjeta") {
          return (
            <Badge className="bg-pink-500 gap-1">
              <Gift className="h-3 w-3" />
              Gorjeta
            </Badge>
          );
        }
        return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  // Sync status indicator
  const SyncIndicator = () => (
    <div className="flex items-center gap-2 text-sm">
      {syncing ? (
        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
      ) : isOnline ? (
        <Wifi className="h-4 w-4 text-success" />
      ) : (
        <WifiOff className="h-4 w-4 text-warning" />
      )}
      <span className="text-muted-foreground">
        {syncing ? "Sincronizando..." : isOnline ? "Online" : "Offline"}
      </span>
      {lastSync && (
        <span className="text-xs text-muted-foreground">
          • Última sync: {format(lastSync, "HH:mm")}
        </span>
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refresh}>
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );

  // Device indicator
  const DeviceIndicator = () => (
    <div className="flex items-center gap-2 text-sm">
      {deviceInfo.type === "kiosk" ? (
        <Tablet className="h-4 w-4 text-info" />
      ) : (
        <Monitor className="h-4 w-4 text-primary" />
      )}
      <span className="text-muted-foreground capitalize">{deviceInfo.type}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando caixa...</p>
        </div>
      </div>
    );
  }

  // === CAIXA FECHADO ===
  if (!caixaAberto) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <SyncIndicator />
          <DeviceIndicator />
        </div>

        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Caixa Fechado</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {!isOnline && "Modo offline ativo. Os dados serão sincronizados quando reconectar."}
                </p>
              </div>
              {canOpenCaixa ? (
                <Button
                  size="lg"
                  className="w-full bg-success hover:bg-success/90 text-lg h-14"
                  onClick={() => setIsAbrirOpen(true)}
                >
                  <Unlock className="h-5 w-5 mr-2" />
                  Abrir Novo Caixa
                </Button>
              ) : (
                <div className="p-4 bg-warning/10 rounded-lg border border-warning/30">
                  <AlertTriangle className="h-6 w-6 text-warning mx-auto mb-2" />
                  <p className="text-sm text-warning">
                    Este dispositivo ({deviceInfo.type}) não tem permissão para abrir o caixa.
                    Use um notebook para esta operação.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal Abertura */}
        <Dialog open={isAbrirOpen} onOpenChange={setIsAbrirOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abertura de Caixa</DialogTitle>
              <DialogDescription>
                {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Valor Inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0,00"
                  value={valorInicial || ""}
                  onChange={(e) => setValorInicial(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Ex: Troco para o dia, fundo inicial..."
                  value={obsAbertura}
                  onChange={(e) => setObsAbertura(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsAbrirOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-success hover:bg-success/90" onClick={handleAbrirCaixa}>
                  Abrir Caixa
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === CAIXA ABERTO ===
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-green-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-[pulse_1s_ease-in-out_infinite]">
            <div className="w-3 h-3 bg-white rounded-full animate-[ping_1s_ease-in-out_infinite]" />
            <span className="font-semibold">CAIXA ABERTO</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Aberto às {format(parseISO(caixaAberto.data_abertura), "HH:mm", { locale: ptBR })}</span>
            </div>
            <p>Valor inicial: {formatPrice(Number(caixaAberto.valor_inicial))}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SyncIndicator />
          <DeviceIndicator />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {canDespesa && (
          <Button 
            variant="outline" 
            className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold" 
            onClick={() => setIsDespesaOpen(true)}
          >
            <Receipt className="h-5 w-5 mr-2" />
            Despesa Rápida
          </Button>
        )}
        {canSangria && (
          <Button 
            variant="outline" 
            className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold" 
            onClick={() => setIsSangriaOpen(true)}
          >
            <ArrowDownCircle className="h-5 w-5 mr-2" />
            Sangria
          </Button>
        )}
        {canReforco && (
          <Button 
            variant="outline" 
            className="border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 font-semibold" 
            onClick={() => setIsReforcoOpen(true)}
          >
            <ArrowUpCircle className="h-5 w-5 mr-2" />
            Reforço
          </Button>
        )}
        {canCheques && (
          <Button 
            variant="outline" 
            className="border-2 border-gray-500 text-gray-600 hover:bg-gray-50 font-semibold" 
            onClick={() => setIsChequesListOpen(true)}
          >
            <FileText className="h-5 w-5 mr-2" />
            Cheques
          </Button>
        )}
        {canCloseCaixa ? (
          <Button 
            className="bg-red-500 hover:bg-red-600 text-white font-semibold" 
            onClick={() => setIsFecharOpen(true)}
          >
            <Lock className="h-5 w-5 mr-2" />
            Fechar Caixa
          </Button>
        ) : (
          <Badge variant="outline" className="px-4 py-2">
            <AlertTriangle className="h-4 w-4 mr-1 text-warning" />
            Fechar caixa disponível apenas no notebook
          </Badge>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow min-h-[120px]">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500 rounded-xl shadow-sm shrink-0">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-1 truncate">Total Entradas</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400 truncate">{formatPrice(totais.entradas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow min-h-[120px]">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500 rounded-xl shadow-sm shrink-0">
                <TrendingDown className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-1 truncate">Total Saídas</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400 truncate">{formatPrice(totais.saidas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow min-h-[120px]">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-xl shadow-sm shrink-0">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-1 truncate">Saldo em Caixa</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 truncate">{formatPrice(totais.saldo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow min-h-[120px]">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500 rounded-xl shadow-sm shrink-0">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-1 truncate">Despesas do Dia</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400 truncate">{formatPrice(totais.despesas)}</p>
                <p className="text-xs text-muted-foreground">{despesas.filter(d => d.pago_por === "caixa").length} despesas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Formas de Pagamento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-card rounded-2xl shadow-sm border-2 border-green-100 dark:border-green-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-green-50 dark:bg-green-900/30 rounded-xl shrink-0">
              <Banknote className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">Dinheiro</p>
              <p className="text-lg font-bold truncate">{formatPrice(totais.dinheiro)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card rounded-2xl shadow-sm border-2 border-blue-100 dark:border-blue-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl shrink-0">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">Débito</p>
              <p className="text-lg font-bold truncate">{formatPrice(totais.debito)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card rounded-2xl shadow-sm border-2 border-purple-100 dark:border-purple-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 rounded-xl shrink-0">
              <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">Crédito</p>
              <p className="text-lg font-bold truncate">{formatPrice(totais.credito)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-card rounded-2xl shadow-sm border-2 border-cyan-100 dark:border-cyan-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl shrink-0">
              <Smartphone className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">PIX</p>
              <p className="text-lg font-bold truncate">{formatPrice(totais.pix)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comandas Abertas */}
      <ComandasAbertasSection onComandaFinalizada={refresh} />

      {/* Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Movimentações do Dia</span>
            <Badge variant="outline">{movimentacoes.length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="entradas">Entradas</TabsTrigger>
              <TabsTrigger value="saidas">Saídas</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[300px]">
              {movimentacoesFiltradas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoesFiltradas.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell className="text-sm">
                          {format(parseISO(mov.data_hora), "HH:mm")}
                        </TableCell>
                        <TableCell>{getTipoBadge(mov.tipo, mov.categoria)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{mov.descricao}</TableCell>
                        <TableCell className="capitalize">{mov.forma_pagamento || "-"}</TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          mov.tipo === "entrada" || mov.tipo === "reforco" 
                            ? "text-success" 
                            : "text-destructive"
                        )}>
                          {mov.tipo === "entrada" || mov.tipo === "reforco" ? "+" : "-"}
                          {formatPrice(mov.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      {caixaAberto && (
        <AcoesRapidasSection caixaId={caixaAberto.id} onActionComplete={refresh} />
      )}

      {/* === MODALS === */}
      
      {/* Modal Fechar Caixa */}
      <AlertDialog open={isFecharOpen} onOpenChange={setIsFecharOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Caixa</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o valor contado em dinheiro na gaveta
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>Saldo esperado em dinheiro: <strong>{formatPrice(totais.saldoDinheiro)}</strong></p>
            </div>
            <div className="space-y-2">
              <Label>Valor contado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="0,00"
                value={valorFechamento || ""}
                onChange={(e) => setValorFechamento(Number(e.target.value))}
              />
            </div>
            {valorFechamento > 0 && (
              <div className={cn(
                "p-3 rounded-lg text-sm",
                Math.abs(valorFechamento - totais.saldoDinheiro) < 0.01
                  ? "bg-success/10 text-success"
                  : valorFechamento > totais.saldoDinheiro
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
              )}>
                {Math.abs(valorFechamento - totais.saldoDinheiro) < 0.01 ? (
                  "✓ Caixa conferido - sem diferenças"
                ) : valorFechamento > totais.saldoDinheiro ? (
                  `Sobra de ${formatPrice(valorFechamento - totais.saldoDinheiro)}`
                ) : (
                  `Falta de ${formatPrice(totais.saldoDinheiro - valorFechamento)}`
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Observações do fechamento..."
                value={obsFechamento}
                onChange={(e) => setObsFechamento(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFecharCaixa}
              disabled={valorFechamento <= 0}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirmar Fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Despesa */}
      <Dialog open={isDespesaOpen} onOpenChange={setIsDespesaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Despesa Rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Café, material de limpeza..."
                value={despesaDesc}
                onChange={(e) => setDespesaDesc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={despesaCat} onValueChange={setDespesaCat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasDespesa.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="h-4 w-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0,00"
                  value={despesaValor || ""}
                  onChange={(e) => setDespesaValor(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pago por</Label>
              <Select value={despesaPagoPor} onValueChange={(v) => setDespesaPagoPor(v as "caixa" | "dono")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="dono">Dono/Pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={despesaObs}
                onChange={(e) => setDespesaObs(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsDespesaOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleAddDespesa}>
                Registrar Despesa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Sangria */}
      <Dialog open={isSangriaOpen} onOpenChange={setIsSangriaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Sangria</DialogTitle>
            <DialogDescription>
              Retirada de dinheiro do caixa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>Saldo disponível em dinheiro: <strong>{formatPrice(totais.saldoDinheiro)}</strong></p>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={totais.saldoDinheiro}
                placeholder="0,00"
                value={sangriaValor || ""}
                onChange={(e) => setSangriaValor(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                placeholder="Ex: Pagamento fornecedor, depósito bancário..."
                value={sangriaMotivo}
                onChange={(e) => setSangriaMotivo(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsSangriaOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-warning hover:bg-warning/90" 
                onClick={handleSangria}
                disabled={sangriaValor > totais.saldoDinheiro}
              >
                Registrar Sangria
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Reforço */}
      <Dialog open={isReforcoOpen} onOpenChange={setIsReforcoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Reforço</DialogTitle>
            <DialogDescription>
              Adicionar dinheiro ao caixa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="0,00"
                value={reforcoValor || ""}
                onChange={(e) => setReforcoValor(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                placeholder="Ex: Troco adicional, reposição..."
                value={reforcoMotivo}
                onChange={(e) => setReforcoMotivo(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsReforcoOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-info hover:bg-info/90" onClick={handleReforco}>
                Registrar Reforço
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cheques Modals */}
      <ChequesListModal 
        open={isChequesListOpen} 
        onOpenChange={setIsChequesListOpen}
      />
      <ChequeFormModal 
        open={isNovoChequeOpen} 
        onOpenChange={setIsNovoChequeOpen}
      />
    </div>
  );
};

export default Caixa;
