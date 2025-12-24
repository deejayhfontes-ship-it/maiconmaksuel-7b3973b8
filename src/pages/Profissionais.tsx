import { useState, useEffect, useMemo } from "react";
import { UserCheck, Plus, Search, LayoutGrid, Table as TableIcon } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ProfissionalFormDialog from "@/components/profissionais/ProfissionalFormDialog";
import { ProfissionalCard } from "@/components/profissionais/ProfissionalCard";
import { ProfissionalTable } from "@/components/profissionais/ProfissionalTable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Profissional {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  data_admissao: string | null;
  funcao: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  comissao_servicos: number;
  comissao_produtos: number;
  cor_agenda: string;
  foto_url: string | null;
  pode_vender_produtos: boolean;
  meta_servicos_mes: number;
  meta_produtos_mes: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Calculados
  realizado_servicos?: number;
  realizado_produtos?: number;
}

const Profissionais = () => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [perfServicosFilter, setPerfServicosFilter] = useState("todos");
  const [perfProdutosFilter, setPerfProdutosFilter] = useState("todos");
  const [sortOrder, setSortOrder] = useState("nome-asc");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  const { toast } = useToast();

  const mesAtual = format(new Date(), "MMMM/yyyy", { locale: ptBR });

  const fetchProfissionais = async () => {
    setLoading(true);
    
    // Buscar profissionais
    const { data: profData, error } = await supabase
      .from("profissionais")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar profissionais",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Buscar realizados do mês atual
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Buscar atendimentos fechados com serviços
    const { data: servicosData } = await supabase
      .from("atendimento_servicos")
      .select(`
        profissional_id,
        subtotal,
        atendimento:atendimentos!inner(status, data_hora)
      `)
      .eq("atendimento.status", "fechado")
      .gte("atendimento.data_hora", inicioMes)
      .lte("atendimento.data_hora", fimMes);

    // Buscar produtos vendidos (através de atendimentos)
    const { data: produtosData } = await supabase
      .from("atendimento_produtos")
      .select(`
        subtotal,
        atendimento:atendimentos!inner(status, data_hora, cliente_id)
      `)
      .eq("atendimento.status", "fechado")
      .gte("atendimento.data_hora", inicioMes)
      .lte("atendimento.data_hora", fimMes);

    // Calcular realizados por profissional
    const realizadoServicos: Record<string, number> = {};
    servicosData?.forEach((item: any) => {
      const profId = item.profissional_id;
      if (!realizadoServicos[profId]) realizadoServicos[profId] = 0;
      realizadoServicos[profId] += Number(item.subtotal);
    });

    // Mapear profissionais com dados calculados
    const profissionaisComMetas = (profData || []).map((prof: any) => ({
      ...prof,
      comissao_servicos: Number(prof.comissao_servicos || 30),
      comissao_produtos: Number(prof.comissao_produtos || 10),
      meta_servicos_mes: Number(prof.meta_servicos_mes || 0),
      meta_produtos_mes: Number(prof.meta_produtos_mes || 0),
      realizado_servicos: realizadoServicos[prof.id] || 0,
      realizado_produtos: 0, // Simplificado por enquanto
    }));

    setProfissionais(profissionaisComMetas);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfissionais();
  }, []);

  const filteredProfissionais = useMemo(() => {
    let result = [...profissionais];

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          p.telefone?.includes(term)
      );
    }

    // Filtro de status
    if (statusFilter === "ativos") {
      result = result.filter((p) => p.ativo);
    } else if (statusFilter === "inativos") {
      result = result.filter((p) => !p.ativo);
    }

    // Filtro de performance serviços
    if (perfServicosFilter !== "todos") {
      result = result.filter((p) => {
        if (p.meta_servicos_mes === 0) return perfServicosFilter === "todos";
        const perc = (p.realizado_servicos || 0) / p.meta_servicos_mes * 100;
        return perfServicosFilter === "acima" ? perc >= 100 : perc < 100;
      });
    }

    // Filtro de performance produtos
    if (perfProdutosFilter !== "todos") {
      result = result.filter((p) => {
        if (p.meta_produtos_mes === 0) return perfProdutosFilter === "todos";
        const perc = (p.realizado_produtos || 0) / p.meta_produtos_mes * 100;
        return perfProdutosFilter === "acima" ? perc >= 100 : perc < 100;
      });
    }

    // Ordenação
    result.sort((a, b) => {
      switch (sortOrder) {
        case "nome-asc":
          return a.nome.localeCompare(b.nome);
        case "nome-desc":
          return b.nome.localeCompare(a.nome);
        case "performance": {
          const perfA = a.meta_servicos_mes > 0 ? ((a.realizado_servicos || 0) / a.meta_servicos_mes) : 0;
          const perfB = b.meta_servicos_mes > 0 ? ((b.realizado_servicos || 0) / b.meta_servicos_mes) : 0;
          return perfB - perfA;
        }
        case "vendas": {
          const vendasA = (a.realizado_servicos || 0) + (a.realizado_produtos || 0);
          const vendasB = (b.realizado_servicos || 0) + (b.realizado_produtos || 0);
          return vendasB - vendasA;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [profissionais, searchTerm, statusFilter, perfServicosFilter, perfProdutosFilter, sortOrder]);

  const handleView = (id: string) => {
    toast({ title: "Em breve", description: "Página de detalhes será implementada." });
  };

  const handleEdit = (profissional: Profissional) => {
    setSelectedProfissional(profissional);
    setIsFormOpen(true);
  };

  const handleVendas = (id: string) => {
    toast({ title: "Em breve", description: "Histórico de vendas será implementado." });
  };

  const handleDeleteClick = (id: string) => {
    const prof = profissionais.find(p => p.id === id);
    if (prof) {
      setSelectedProfissional(prof);
      setIsDeleteOpen(true);
    }
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profissionais</h1>
            <p className="text-muted-foreground">
              {filteredProfissionais.length} profissional(is) • {mesAtual}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle View */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="bg-success hover:bg-success/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Profissional
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={perfServicosFilter} onValueChange={setPerfServicosFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Perf. Serviços" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Serviços: Todos</SelectItem>
                  <SelectItem value="acima">Acima da meta</SelectItem>
                  <SelectItem value="abaixo">Abaixo da meta</SelectItem>
                </SelectContent>
              </Select>
              <Select value={perfProdutosFilter} onValueChange={setPerfProdutosFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Perf. Produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Produtos: Todos</SelectItem>
                  <SelectItem value="acima">Acima da meta</SelectItem>
                  <SelectItem value="abaixo">Abaixo da meta</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome-asc">Nome A-Z</SelectItem>
                  <SelectItem value="nome-desc">Nome Z-A</SelectItem>
                  <SelectItem value="performance">Performance Geral</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredProfissionais.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={UserCheck}
              title="Nenhum profissional encontrado"
              description="Cadastre profissionais para gerenciar sua equipe e acompanhar metas."
              action={{
                label: "Novo Profissional",
                onClick: () => setIsFormOpen(true),
              }}
            />
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {filteredProfissionais.map((prof) => (
            <ProfissionalCard
              key={prof.id}
              profissional={prof}
              mesReferencia={mesAtual}
              onEdit={handleEdit}
              onVendas={handleVendas}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        <ProfissionalTable
          profissionais={filteredProfissionais}
          onEdit={handleEdit}
          onVendas={handleVendas}
          onDelete={handleDeleteClick}
        />
      )}

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