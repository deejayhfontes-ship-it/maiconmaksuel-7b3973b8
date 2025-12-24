import { useState, useEffect, useMemo } from "react";
import { Scissors, Plus, Search, Edit, Trash2, Clock } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import ServicoFormDialog from "@/components/servicos/ServicoFormDialog";

interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  duracao_minutos: number;
  preco: number;
  comissao_padrao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const categoriaColors: Record<string, string> = {
  Cabelo: "bg-blue-500/10 text-blue-600 border-blue-200",
  Barba: "bg-amber-700/10 text-amber-700 border-amber-200",
  Manicure: "bg-pink-500/10 text-pink-600 border-pink-200",
  Pedicure: "bg-purple-500/10 text-purple-600 border-purple-200",
  Estética: "bg-green-500/10 text-green-600 border-green-200",
  Depilação: "bg-orange-500/10 text-orange-600 border-orange-200",
  Massagem: "bg-teal-500/10 text-teal-600 border-teal-200",
  Outros: "bg-gray-500/10 text-gray-600 border-gray-200",
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
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const { toast } = useToast();

  const fetchServicos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("servicos")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar serviços",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setServicos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServicos();
  }, []);

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

    return result;
  }, [servicos, searchTerm, categoriaFilter]);

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

    const { error } = await supabase
      .from("servicos")
      .delete()
      .eq("id", selectedServico.id);

    if (error) {
      toast({
        title: "Erro ao excluir serviço",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Serviço excluído",
        description: "O serviço foi removido com sucesso.",
      });
      fetchServicos();
    }
    setIsDeleteOpen(false);
    setSelectedServico(null);
  };

  const handleFormClose = (refresh?: boolean) => {
    setIsFormOpen(false);
    setSelectedServico(null);
    if (refresh) fetchServicos();
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
        <Button onClick={() => setIsFormOpen(true)} className="bg-success hover:bg-success/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
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
          {filteredServicos.map((servico) => (
            <Card
              key={servico.id}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                !servico.ativo ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="space-y-4">
                  {/* Header do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-bold text-lg leading-tight">
                        {servico.nome}
                      </h3>
                      <Badge
                        variant="outline"
                        className={
                          categoriaColors[servico.categoria || "Outros"] ||
                          categoriaColors.Outros
                        }
                      >
                        {servico.categoria || "Outros"}
                      </Badge>
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
                      <p className="text-2xl font-bold text-success">
                        {formatPrice(Number(servico.preco))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Comissão: {Number(servico.comissao_padrao)}%
                      </p>
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
          ))}
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
