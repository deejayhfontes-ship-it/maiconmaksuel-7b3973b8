import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Receipt,
  Plus,
  Search,
  Download,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  FileText,
  Pencil,
  Trash2,
  Eye,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import NovoValeModal from "@/components/vales/NovoValeModal";
import QuitarValeModal from "@/components/vales/QuitarValeModal";
import DetalhesValeModal from "@/components/vales/DetalhesValeModal";
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

interface Vale {
  id: string;
  profissional_id: string;
  valor_total: number;
  valor_pago: number;
  saldo_restante: number;
  data_lancamento: string;
  data_quitacao: string | null;
  motivo: string;
  observacoes: string | null;
  forma_desconto: "unico" | "parcelado";
  parcelas_total: number | null;
  parcelas_pagas: number;
  status: "aberto" | "quitado" | "cancelado";
  quitado_por: string | null;
  comprovante_url: string | null;
  created_at: string;
  profissional?: {
    id: string;
    nome: string;
    funcao: string | null;
    foto_url: string | null;
  };
}

interface Profissional {
  id: string;
  nome: string;
  funcao: string | null;
  foto_url: string | null;
}

const Vales = () => {
  const navigate = useNavigate();
  const [vales, setVales] = useState<Vale[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"abertos" | "quitados" | "todos">("abertos");
  const [sortOrder, setSortOrder] = useState("data-desc");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  
  // Modals
  const [isNovoValeOpen, setIsNovoValeOpen] = useState(false);
  const [isQuitarOpen, setIsQuitarOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVale, setSelectedVale] = useState<Vale | null>(null);
  const [editingVale, setEditingVale] = useState<Vale | null>(null);
  
  const { toast } = useToast();

  const fetchVales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vales")
      .select(`
        *,
        profissional:profissionais(id, nome, funcao, foto_url)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar vales", variant: "destructive" });
    } else {
      setVales((data || []) as Vale[]);
    }
    setLoading(false);
  };

  const fetchProfissionais = async () => {
    const { data } = await supabase
      .from("profissionais")
      .select("id, nome, funcao, foto_url")
      .eq("ativo", true)
      .order("nome");
    if (data) setProfissionais(data);
  };

  useEffect(() => {
    fetchVales();
    fetchProfissionais();

    // Realtime subscription
    const channel = supabase
      .channel("vales_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "vales" }, () => {
        fetchVales();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredVales = useMemo(() => {
    let result = [...vales];

    // Status filter
    if (statusFilter === "abertos") {
      result = result.filter((v) => v.status === "aberto");
    } else if (statusFilter === "quitados") {
      result = result.filter((v) => v.status === "quitado" || v.status === "cancelado");
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          v.profissional?.nome.toLowerCase().includes(term) ||
          v.motivo.toLowerCase().includes(term) ||
          v.valor_total.toString().includes(term)
      );
    }

    // Date filter
    if (dateStart) {
      result = result.filter((v) => v.data_lancamento >= dateStart);
    }
    if (dateEnd) {
      result = result.filter((v) => v.data_lancamento <= dateEnd);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOrder) {
        case "data-desc":
          return new Date(b.data_lancamento).getTime() - new Date(a.data_lancamento).getTime();
        case "data-asc":
          return new Date(a.data_lancamento).getTime() - new Date(b.data_lancamento).getTime();
        case "valor-desc":
          return b.valor_total - a.valor_total;
        case "valor-asc":
          return a.valor_total - b.valor_total;
        case "profissional":
          return (a.profissional?.nome || "").localeCompare(b.profissional?.nome || "");
        default:
          return 0;
      }
    });

    return result;
  }, [vales, statusFilter, searchTerm, dateStart, dateEnd, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const abertos = vales.filter((v) => v.status === "aberto");
    const mesAtual = new Date();
    const inicioMes = startOfMonth(mesAtual);
    const fimMes = endOfMonth(mesAtual);
    
    const quitadosMes = vales.filter(
      (v) =>
        v.status === "quitado" &&
        v.data_quitacao &&
        new Date(v.data_quitacao) >= inicioMes &&
        new Date(v.data_quitacao) <= fimMes
    );

    const maiorValeAberto = abertos.reduce(
      (max, v) => (v.saldo_restante > (max?.saldo_restante || 0) ? v : max),
      null as Vale | null
    );

    const totalAberto = abertos.reduce((sum, v) => sum + Number(v.saldo_restante), 0);
    const profissionaisComVales = new Set(abertos.map((v) => v.profissional_id)).size;
    const mediaPorProfissional = profissionaisComVales > 0 ? totalAberto / profissionaisComVales : 0;

    return {
      totalAberto,
      qtdAbertos: abertos.length,
      quitadosMes: quitadosMes.length,
      valorQuitadoMes: quitadosMes.reduce((sum, v) => sum + Number(v.valor_total), 0),
      maiorValeAberto,
      mediaPorProfissional,
    };
  }, [vales]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const handleQuitar = (vale: Vale) => {
    setSelectedVale(vale);
    setIsQuitarOpen(true);
  };

  const handleDetalhes = (vale: Vale) => {
    setSelectedVale(vale);
    setIsDetalhesOpen(true);
  };

  const handleEdit = (vale: Vale) => {
    if (vale.parcelas_pagas > 0) {
      toast({
        title: "Não é possível editar",
        description: "Este vale já possui parcelas pagas.",
        variant: "destructive",
      });
      return;
    }
    setEditingVale(vale);
    setIsNovoValeOpen(true);
  };

  const handleDeleteClick = (vale: Vale) => {
    if (vale.parcelas_pagas > 0) {
      toast({
        title: "Não é possível excluir",
        description: "Este vale já possui parcelas pagas. Use a opção de cancelar.",
        variant: "destructive",
      });
      return;
    }
    setSelectedVale(vale);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedVale) return;

    const { error } = await supabase.from("vales").delete().eq("id", selectedVale.id);

    if (error) {
      toast({ title: "Erro ao excluir vale", variant: "destructive" });
    } else {
      toast({ title: "Vale excluído com sucesso!" });
      fetchVales();
    }
    setIsDeleteOpen(false);
    setSelectedVale(null);
  };

  const handleExport = () => {
    toast({ title: "Exportação", description: "Funcionalidade em desenvolvimento." });
  };

  const handleModalClose = (refresh?: boolean) => {
    setIsNovoValeOpen(false);
    setIsQuitarOpen(false);
    setIsDetalhesOpen(false);
    setSelectedVale(null);
    setEditingVale(null);
    if (refresh) fetchVales();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/financeiro")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "#FFCC0020" }}>
            <Receipt className="h-6 w-6" style={{ color: "#FFCC00" }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vales e Adiantamentos</h1>
            <p className="text-muted-foreground">Gestão de adiantamentos dos profissionais</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            onClick={() => setIsNovoValeOpen(true)}
            className="text-foreground font-semibold"
            style={{ backgroundColor: "#34C759" }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Vale
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm min-h-[110px]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">Total Vales Ativos</p>
                <p className="text-xl sm:text-2xl font-bold truncate" style={{ color: "#FF3B30" }}>
                  {formatCurrency(stats.totalAberto)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stats.qtdAbertos} vales abertos</p>
              </div>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#FF3B3010" }}>
                <AlertCircle className="h-5 w-5" style={{ color: "#FF3B30" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm min-h-[110px]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">Quitados Este Mês</p>
                <p className="text-xl sm:text-2xl font-bold truncate" style={{ color: "#34C759" }}>
                  {stats.quitadosMes}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{formatCurrency(stats.valorQuitadoMes)} total</p>
              </div>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#34C75910" }}>
                <CheckCircle className="h-5 w-5" style={{ color: "#34C759" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm min-h-[110px]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">Maior Vale Ativo</p>
                <p className="text-xl sm:text-2xl font-bold truncate" style={{ color: "#FFCC00" }}>
                  {stats.maiorValeAberto ? formatCurrency(stats.maiorValeAberto.saldo_restante) : "R$ 0,00"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {stats.maiorValeAberto?.profissional?.nome || "Nenhum"}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#FFCC0010" }}>
                <TrendingUp className="h-5 w-5" style={{ color: "#FFCC00" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm min-h-[110px]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">Média por Profissional</p>
                <p className="text-xl sm:text-2xl font-bold truncate" style={{ color: "#007AFF" }}>
                  {formatCurrency(stats.mediaPorProfissional)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Cálculo automático</p>
              </div>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#007AFF10" }}>
                <Users className="h-5 w-5" style={{ color: "#007AFF" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar profissional..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-[150px]"
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-[150px]"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="abertos">Abertos</TabsTrigger>
                <TabsTrigger value="quitados">Quitados</TabsTrigger>
                <TabsTrigger value="todos">Todos</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data-desc">Data ↓</SelectItem>
                <SelectItem value="data-asc">Data ↑</SelectItem>
                <SelectItem value="valor-desc">Valor ↓</SelectItem>
                <SelectItem value="valor-asc">Valor ↑</SelectItem>
                <SelectItem value="profissional">Profissional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vales List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredVales.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Receipt}
              title="Nenhum vale cadastrado"
              description="Lance o primeiro vale para um profissional."
              action={{
                label: "Lançar primeiro vale",
                onClick: () => setIsNovoValeOpen(true),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredVales.map((vale) => (
            <Card key={vale.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={vale.profissional?.foto_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(vale.profissional?.nome || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-lg">{vale.profissional?.nome}</p>
                      <p className="text-sm text-muted-foreground">{vale.profissional?.funcao || "Profissional"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(vale.valor_total)}</p>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      <Badge
                        className={
                          vale.status === "aberto"
                            ? "bg-amber-500/10 text-amber-600"
                            : vale.status === "quitado"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {vale.status === "aberto" ? "ABERTO" : vale.status === "quitado" ? "QUITADO" : "CANCELADO"}
                      </Badge>
                      {vale.status === "aberto" && vale.saldo_restante > 0 && (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm border-t border-b py-4 my-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Lançado em: {format(parseISO(vale.data_lancamento), "dd/MM/yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="line-clamp-2">Motivo: {vale.motivo}</span>
                  </div>

                  {vale.forma_desconto === "parcelado" && vale.parcelas_total ? (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          Parcelado em {vale.parcelas_total}x de{" "}
                          {formatCurrency(vale.valor_total / vale.parcelas_total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-xs">
                          Parcelas pagas: {vale.parcelas_pagas}/{vale.parcelas_total}
                        </span>
                      </div>
                      <Progress
                        value={(vale.parcelas_pagas / vale.parcelas_total) * 100}
                        className="h-2 mt-2"
                      />
                    </>
                  ) : (
                    <Badge variant="secondary" className="mt-1">
                      Desconto Único
                    </Badge>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <span className={vale.saldo_restante > 0 ? "text-destructive font-medium" : "text-success font-medium"}>
                      Saldo restante: {formatCurrency(vale.saldo_restante)}
                      {vale.forma_desconto === "parcelado" &&
                        vale.parcelas_total &&
                        vale.saldo_restante > 0 && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            ({vale.parcelas_total - vale.parcelas_pagas} parcelas)
                          </span>
                        )}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {vale.status === "aberto" && (
                    <Button
                      size="sm"
                      onClick={() => handleQuitar(vale)}
                      className="text-white"
                      style={{ backgroundColor: "#34C759" }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Quitar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleDetalhes(vale)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalhes
                  </Button>
                  {vale.status === "aberto" && vale.parcelas_pagas === 0 && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(vale)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(vale)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <NovoValeModal
        open={isNovoValeOpen}
        onClose={handleModalClose}
        profissionais={profissionais}
        editingVale={editingVale}
      />

      <QuitarValeModal
        open={isQuitarOpen}
        onClose={handleModalClose}
        vale={selectedVale}
      />

      <DetalhesValeModal
        open={isDetalhesOpen}
        onClose={handleModalClose}
        vale={selectedVale}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vale?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este vale de{" "}
              <strong>{formatCurrency(selectedVale?.valor_total || 0)}</strong> para{" "}
              <strong>{selectedVale?.profissional?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vales;
