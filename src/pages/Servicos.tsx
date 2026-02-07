import { useState, useMemo } from "react";
import { Scissors, Plus, Search, Edit, Trash2, Clock, ClipboardList, Gift, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { useServicos, Servico } from "@/hooks/useServicos";
import ServicoFormDialog from "@/components/servicos/ServicoFormDialog";

// iOS Colors for Service Categories
const categoriaColors: Record<string, string> = {
  Cabelo: "bg-primary/12 text-primary border-primary/20",
  Barba: "bg-warning/12 text-warning border-warning/20",
  Manicure: "bg-[#FF2D55]/12 text-[#FF2D55] border-[#FF2D55]/20",
  Pedicure: "bg-info/12 text-info border-info/20",
  Estética: "bg-success/12 text-success border-success/20",
  Depilação: "bg-warning/12 text-warning border-warning/20",
  Massagem: "bg-[#5AC8FA]/12 text-[#5AC8FA] border-[#5AC8FA]/20",
  Outros: "bg-muted text-muted-foreground border-border",
};

const categorias = ["Cabelo", "Barba", "Manicure", "Pedicure", "Estética", "Depilação", "Massagem", "Outros"];

const formatDuration = (minutes: number) => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes} min`;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

const Servicos = () => {
  const { 
    servicos, 
    loading, 
    syncing, 
    loadServicos, 
    deleteServico 
  } = useServicos();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const { toast } = useToast();

  const filteredServicos = useMemo(() => {
    let result = [...servicos];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.nome.toLowerCase().includes(term) ||
          s.descricao?.toLowerCase().includes(term)
      );
    }

    if (categoriaFilter !== "todas") {
      result = result.filter((s) => s.categoria === categoriaFilter);
    }

    if (tipoFilter !== "todos") {
      result = result.filter((s) => s.tipo_servico === tipoFilter);
    }

    return result;
  }, [servicos, searchTerm, categoriaFilter, tipoFilter]);

  const handleEdit = (servico: Servico) => {
    setSelectedServico(servico);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (servico: Servico) => {
    setSelectedServico(servico);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedServico) return;

    const success = await deleteServico(selectedServico.id);
    if (success) {
      toast({
        title: "Serviço excluído",
        description: "O serviço foi removido com sucesso.",
      });
    }
    setIsDeleteOpen(false);
    setSelectedServico(null);
  };

  const handleFormClose = (refresh?: boolean) => {
    setIsFormOpen(false);
    setSelectedServico(null);
    if (refresh) loadServicos();
  };

  const getTipoBadge = (servico: Servico) => {
    if (servico.tipo_servico === "controle_interno" || servico.apenas_agenda) {
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px] gap-1">
          <ClipboardList className="h-3 w-3" />
          Controle
        </Badge>
      );
    }
    if (servico.tipo_servico === "cortesia") {
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] gap-1">
          <Gift className="h-3 w-3" />
          Cortesia
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Scissors className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Serviços</h1>
            <p className="text-muted-foreground">
              {filteredServicos.length} serviço(s) encontrado(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {syncing && (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Sincronizando
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => loadServicos()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsFormOpen(true)} className="bg-success hover:bg-success/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Serviço
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={categoriaFilter}
              onValueChange={setCategoriaFilter}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={tipoFilter}
              onValueChange={setTipoFilter}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="cortesia">Cortesia</SelectItem>
                <SelectItem value="controle_interno">Controle Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Cards */}
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">
          Carregando serviços...
        </div>
      ) : filteredServicos.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          Nenhum serviço encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServicos.map((servico) => {
            const isControleInterno = servico.tipo_servico === "controle_interno" || servico.apenas_agenda;
            
            return (
              <Card
                key={servico.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  !servico.ativo ? "opacity-60" : ""
                } ${isControleInterno ? "border-dashed border-warning/40" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="space-y-4">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-bold text-lg leading-tight ${isControleInterno ? "text-muted-foreground" : ""}`}>
                            {isControleInterno && <ClipboardList className="h-4 w-4 inline mr-1 text-warning" />}
                            {servico.nome}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={
                              categoriaColors[servico.categoria || "Outros"] ||
                              categoriaColors.Outros
                            }
                          >
                            {servico.categoria || "Outros"}
                          </Badge>
                          {getTipoBadge(servico)}
                        </div>
                      </div>
                      {!servico.ativo && (
                        <Badge variant="secondary" className="shrink-0">
                          Inativo
                        </Badge>
                      )}
                    </div>

                    {/* Descrição */}
                    {servico.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {servico.descricao}
                      </p>
                    )}

                    {/* Duração */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">
                        {formatDuration(servico.duracao_minutos)}
                      </span>
                    </div>

                    {/* Preço e Comissão */}
                    <div className="flex items-end justify-between">
                      <div>
                        {isControleInterno ? (
                          <p className="text-xl font-medium text-muted-foreground">
                            --
                          </p>
                        ) : servico.tipo_servico === "cortesia" ? (
                          <p className="text-xl font-medium text-success">
                            Cortesia
                          </p>
                        ) : (
                          <>
                            <p className="text-2xl font-bold text-success">
                              {formatPrice(Number(servico.preco))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Comissão: {Number(servico.comissao_padrao)}%
                            </p>
                          </>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(servico)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(servico)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ServicoFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        servico={selectedServico}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedServico?.nome}</strong>?
              Esta ação não pode ser desfeita.
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

export default Servicos;
