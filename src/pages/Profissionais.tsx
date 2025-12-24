import { useState, useEffect, useMemo } from "react";
import { UserCheck, Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ProfissionalFormDialog from "@/components/profissionais/ProfissionalFormDialog";

interface Profissional {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  data_admissao: string | null;
  comissao_padrao: number;
  cor_agenda: string;
  foto_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const ITEMS_PER_PAGE = 10;

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const formatPhone = (phone: string | null) => {
  if (!phone) return "-";
  return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

const Profissionais = () => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortOrder, setSortOrder] = useState("nome-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  const { toast } = useToast();

  const fetchProfissionais = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profissionais")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar profissionais",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProfissionais(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfissionais();
  }, []);

  const filteredProfissionais = useMemo(() => {
    let result = [...profissionais];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          p.telefone?.includes(term)
      );
    }

    if (statusFilter === "ativos") {
      result = result.filter((p) => p.ativo);
    } else if (statusFilter === "inativos") {
      result = result.filter((p) => !p.ativo);
    }

    result.sort((a, b) => {
      switch (sortOrder) {
        case "nome-asc":
          return a.nome.localeCompare(b.nome);
        case "nome-desc":
          return b.nome.localeCompare(a.nome);
        case "recentes":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [profissionais, searchTerm, statusFilter, sortOrder]);

  const paginatedProfissionais = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProfissionais.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProfissionais, currentPage]);

  const totalPages = Math.ceil(filteredProfissionais.length / ITEMS_PER_PAGE);

  const handleEdit = (profissional: Profissional) => {
    setSelectedProfissional(profissional);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (profissional: Profissional) => {
    setSelectedProfissional(profissional);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedProfissional) return;

    const { error } = await supabase
      .from("profissionais")
      .delete()
      .eq("id", selectedProfissional.id);

    if (error) {
      toast({
        title: "Erro ao excluir profissional",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profissional excluído",
        description: "O profissional foi removido com sucesso.",
      });
      fetchProfissionais();
    }
    setIsDeleteOpen(false);
    setSelectedProfissional(null);
  };

  const handleFormClose = (refresh?: boolean) => {
    setIsFormOpen(false);
    setSelectedProfissional(null);
    if (refresh) fetchProfissionais();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profissionais</h1>
            <p className="text-muted-foreground">
              {filteredProfissionais.length} profissional(is) encontrado(s)
            </p>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-success hover:bg-success/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Profissional
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v)}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nome-asc">Nome A-Z</SelectItem>
                <SelectItem value="nome-desc">Nome Z-A</SelectItem>
                <SelectItem value="recentes">Recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando profissionais...
            </div>
          ) : paginatedProfissionais.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum profissional encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="hidden md:table-cell">Comissão</TableHead>
                  <TableHead className="hidden lg:table-cell">Cor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProfissionais.map((profissional) => (
                  <TableRow key={profissional.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profissional.foto_url || undefined} />
                        <AvatarFallback
                          className="text-white"
                          style={{ backgroundColor: profissional.cor_agenda }}
                        >
                          {getInitials(profissional.nome)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{profissional.nome}</p>
                    </TableCell>
                    <TableCell>{formatPhone(profissional.telefone)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-semibold">{Number(profissional.comissao_padrao)}%</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-border"
                        style={{ backgroundColor: profissional.cor_agenda }}
                        title={profissional.cor_agenda}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          profissional.ativo
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {profissional.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(profissional)}
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(profissional)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ProfissionalFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        profissional={selectedProfissional}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir profissional?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedProfissional?.nome}</strong>?
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

export default Profissionais;
