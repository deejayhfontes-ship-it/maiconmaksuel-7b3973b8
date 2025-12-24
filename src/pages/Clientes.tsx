import { useState, useEffect, useMemo } from "react";
import { Users, Plus, Search, Edit, Trash2, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import ClienteFormDialog from "@/components/clientes/ClienteFormDialog";
import ClienteViewDialog from "@/components/clientes/ClienteViewDialog";

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  celular: string;
  email: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  foto_url: string | null;
  ativo: boolean;
  ultima_visita: string | null;
  total_visitas: number;
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

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-primary",
    "bg-success",
    "bg-warning",
    "bg-pink-500",
    "bg-purple-500",
    "bg-cyan-500",
    "bg-orange-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

const formatPhone = (phone: string) => {
  return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

const cleanPhoneForWhatsApp = (phone: string) => {
  const cleaned = phone.replace(/\D/g, "");
  // Adiciona 55 (Brasil) se não tiver
  return cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
};

const getFrequencyBadge = (totalVisitas: number) => {
  if (totalVisitas >= 20) {
    return { label: "VIP", color: "bg-purple-500/10 text-purple-500" };
  } else if (totalVisitas >= 10) {
    return { label: "Frequente", color: "bg-success/10 text-success" };
  } else if (totalVisitas >= 5) {
    return { label: "Regular", color: "bg-primary/10 text-primary" };
  } else if (totalVisitas >= 1) {
    return { label: "Novo", color: "bg-warning/10 text-warning" };
  }
  return { label: "Prospect", color: "bg-muted text-muted-foreground" };
};

const Clientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortOrder, setSortOrder] = useState("nome-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const { toast } = useToast();

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const filteredClientes = useMemo(() => {
    let result = [...clientes];

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.nome.toLowerCase().includes(term) ||
          c.celular.includes(term) ||
          c.telefone?.includes(term) ||
          c.email?.toLowerCase().includes(term)
      );
    }

    // Filtro de status
    if (statusFilter === "ativos") {
      result = result.filter((c) => c.ativo);
    } else if (statusFilter === "inativos") {
      result = result.filter((c) => !c.ativo);
    }

    // Ordenação
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
  }, [clientes, searchTerm, statusFilter, sortOrder]);

  const paginatedClientes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClientes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClientes, currentPage]);

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsFormOpen(true);
  };

  const handleView = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsViewOpen(true);
  };

  const handleDeleteClick = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", selectedCliente.id);

    if (error) {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cliente excluído",
        description: "O cliente foi removido com sucesso.",
      });
      fetchClientes();
    }
    setIsDeleteOpen(false);
    setSelectedCliente(null);
  };

  const handleFormClose = (refresh?: boolean) => {
    setIsFormOpen(false);
    setSelectedCliente(null);
    if (refresh) fetchClientes();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">
              {filteredClientes.length} cliente(s) encontrado(s)
            </p>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-success hover:bg-success/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
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
              Carregando clientes...
            </div>
          ) : paginatedClientes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Celular</TableHead>
                  <TableHead className="hidden md:table-cell">Visitas</TableHead>
                  <TableHead className="hidden lg:table-cell">Última Visita</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClientes.map((cliente) => {
                  const frequency = getFrequencyBadge(cliente.total_visitas);
                  return (
                    <TableRow key={cliente.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={cliente.foto_url || undefined} />
                          <AvatarFallback
                            className={`${getAvatarColor(cliente.nome)} text-white`}
                          >
                            {getInitials(cliente.nome)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cliente.nome}</p>
                          <p className="text-xs text-muted-foreground hidden md:block">
                            {cliente.email || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatPhone(cliente.celular)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="font-semibold">{cliente.total_visitas}</span>
                        <span className="text-muted-foreground text-sm"> visitas</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {cliente.ultima_visita
                          ? formatDistanceToNow(new Date(cliente.ultima_visita), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        <Badge className={frequency.color}>
                          {frequency.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const phone = cleanPhoneForWhatsApp(cliente.celular);
                                  window.open(`https://wa.me/${phone}`, "_blank");
                                }}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>WhatsApp</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleView(cliente)}
                              >
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalhes</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(cliente)}
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
                                onClick={() => handleDeleteClick(cliente)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
      <ClienteFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        cliente={selectedCliente}
      />

      <ClienteViewDialog
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedCliente(null);
        }}
        cliente={selectedCliente}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedCliente?.nome}</strong>?
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

export default Clientes;
