import { useState, useEffect, useMemo } from "react";
import { Package, Plus, Search, Edit, Trash2, AlertTriangle } from "lucide-react";
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
import ProdutoFormDialog from "@/components/produtos/ProdutoFormDialog";

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  codigo_barras: string | null;
  preco_custo: number | null;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  categoria: string | null;
  foto_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const ITEMS_PER_PAGE = 10;

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

const calculateMargin = (custo: number | null, venda: number) => {
  if (!custo || custo === 0) return null;
  return ((venda - custo) / custo) * 100;
};

const Produtos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estoqueFilter, setEstoqueFilter] = useState("todos");
  const [sortOrder, setSortOrder] = useState("nome-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const { toast } = useToast();

  const fetchProdutos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProdutos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  const filteredProdutos = useMemo(() => {
    let result = [...produtos];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          p.codigo_barras?.includes(term) ||
          p.categoria?.toLowerCase().includes(term)
      );
    }

    if (estoqueFilter === "ok") {
      result = result.filter((p) => p.estoque_atual >= p.estoque_minimo);
    } else if (estoqueFilter === "baixo") {
      result = result.filter((p) => p.estoque_atual < p.estoque_minimo);
    }

    result.sort((a, b) => {
      switch (sortOrder) {
        case "nome-asc":
          return a.nome.localeCompare(b.nome);
        case "nome-desc":
          return b.nome.localeCompare(a.nome);
        case "estoque-asc":
          return a.estoque_atual - b.estoque_atual;
        case "estoque-desc":
          return b.estoque_atual - a.estoque_atual;
        case "preco-asc":
          return Number(a.preco_venda) - Number(b.preco_venda);
        case "preco-desc":
          return Number(b.preco_venda) - Number(a.preco_venda);
        default:
          return 0;
      }
    });

    return result;
  }, [produtos, searchTerm, estoqueFilter, sortOrder]);

  const paginatedProdutos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProdutos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProdutos, currentPage]);

  const totalPages = Math.ceil(filteredProdutos.length / ITEMS_PER_PAGE);

  const lowStockCount = useMemo(() => {
    return produtos.filter((p) => p.estoque_atual < p.estoque_minimo).length;
  }, [produtos]);

  const handleEdit = (produto: Produto) => {
    setSelectedProduto(produto);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (produto: Produto) => {
    setSelectedProduto(produto);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedProduto) return;

    const { error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", selectedProduto.id);

    if (error) {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Produto excluído",
        description: "O produto foi removido com sucesso.",
      });
      fetchProdutos();
    }
    setIsDeleteOpen(false);
    setSelectedProduto(null);
  };

  const handleFormClose = (refresh?: boolean) => {
    setIsFormOpen(false);
    setSelectedProduto(null);
    if (refresh) fetchProdutos();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
            <p className="text-muted-foreground">
              {filteredProdutos.length} produto(s) encontrado(s)
              {lowStockCount > 0 && (
                <span className="text-destructive font-medium ml-2">
                  • {lowStockCount} com estoque baixo
                </span>
              )}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-success hover:bg-success/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={estoqueFilter}
              onValueChange={(v) => {
                setEstoqueFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Estoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ok">Estoque OK</SelectItem>
                <SelectItem value="baixo">Estoque Baixo</SelectItem>
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
                <SelectItem value="estoque-asc">Menor Estoque</SelectItem>
                <SelectItem value="estoque-desc">Maior Estoque</SelectItem>
                <SelectItem value="preco-asc">Menor Preço</SelectItem>
                <SelectItem value="preco-desc">Maior Preço</SelectItem>
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
              Carregando produtos...
            </div>
          ) : paginatedProdutos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum produto encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Cód. Barras</TableHead>
                  <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead className="hidden md:table-cell">Custo</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead className="hidden lg:table-cell">Margem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProdutos.map((produto) => {
                  const isLowStock = produto.estoque_atual < produto.estoque_minimo;
                  const margin = calculateMargin(Number(produto.preco_custo), Number(produto.preco_venda));

                  return (
                    <TableRow key={produto.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Avatar className="h-10 w-10 rounded-lg">
                          <AvatarImage src={produto.foto_url || undefined} className="object-cover" />
                          <AvatarFallback className="bg-muted rounded-lg">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{produto.nome}</p>
                          {isLowStock && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>Estoque abaixo do mínimo</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {produto.codigo_barras || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {produto.categoria ? (
                          <Badge variant="outline">{produto.categoria}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              isLowStock ? "text-destructive" : "text-success"
                            }`}
                          >
                            {produto.estoque_atual}
                          </span>
                          {isLowStock && (
                            <Badge variant="destructive" className="text-xs">
                              Baixo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {produto.preco_custo ? formatPrice(Number(produto.preco_custo)) : "-"}
                      </TableCell>
                      <TableCell className="font-semibold text-success">
                        {formatPrice(Number(produto.preco_venda))}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {margin !== null ? (
                          <span className={margin > 0 ? "text-success" : "text-destructive"}>
                            {margin.toFixed(1)}%
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(produto)}
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
                                onClick={() => handleDeleteClick(produto)}
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
      <ProdutoFormDialog
        open={isFormOpen}
        onClose={handleFormClose}
        produto={selectedProduto}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedProduto?.nome}</strong>?
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

export default Produtos;
