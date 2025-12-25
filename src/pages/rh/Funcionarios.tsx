import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FuncionarioFormDialog } from "@/components/rh/FuncionarioFormDialog";
import { toast } from "sonner";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Plus, Search, MoreHorizontal, Eye, Edit, Clock, Calendar, 
  FileText, AlertTriangle, History, UserMinus, Phone, Mail,
  Wallet, Building, CreditCard, Users, BarChart3, Filter
} from "lucide-react";
import { Link } from "react-router-dom";

const cargosLabel: Record<string, string> = {
  secretaria: "Secretária",
  gerente: "Gerente",
  recepcionista: "Recepcionista",
  auxiliar_limpeza: "Aux. Limpeza",
  outro: "Outro",
};

const departamentosLabel: Record<string, string> = {
  administrativo: "Administrativo",
  atendimento: "Atendimento",
  limpeza: "Limpeza",
  gerencia: "Gerência",
};

export default function Funcionarios() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ativos");
  const [cargoFilter, setCargoFilter] = useState<string>("todos");
  const [departamentoFilter, setDepartamentoFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<any>(null);
  const [desligarDialogOpen, setDesligarDialogOpen] = useState(false);
  const [funcionarioToDesligar, setFuncionarioToDesligar] = useState<any>(null);

  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const filteredFuncionarios = funcionarios.filter((f) => {
    const matchesSearch = f.nome.toLowerCase().includes(search.toLowerCase()) ||
      f.cpf?.includes(search);
    const matchesStatus = statusFilter === "todos" ? true :
      statusFilter === "ativos" ? f.ativo && !f.data_demissao :
      !f.ativo || f.data_demissao;
    const matchesCargo = cargoFilter === "todos" || f.cargo === cargoFilter;
    const matchesDepartamento = departamentoFilter === "todos" || f.departamento === departamentoFilter;
    return matchesSearch && matchesStatus && matchesCargo && matchesDepartamento;
  });

  const handleEdit = (funcionario: any) => {
    setSelectedFuncionario(funcionario);
    setDialogOpen(true);
  };

  const handleDesligar = async () => {
    if (!funcionarioToDesligar) return;
    
    try {
      const { error } = await supabase
        .from("funcionarios")
        .update({ 
          ativo: false, 
          data_demissao: new Date().toISOString().split("T")[0] 
        })
        .eq("id", funcionarioToDesligar.id);
      
      if (error) throw error;
      toast.success("Funcionário desligado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
    } catch (error) {
      toast.error("Erro ao desligar funcionário");
    } finally {
      setDesligarDialogOpen(false);
      setFuncionarioToDesligar(null);
    }
  };

  const getTempoEmpresa = (dataAdmissao: string) => {
    const anos = differenceInYears(new Date(), new Date(dataAdmissao));
    const meses = differenceInMonths(new Date(), new Date(dataAdmissao)) % 12;
    if (anos > 0) return `${anos} ano${anos > 1 ? "s" : ""}${meses > 0 ? ` e ${meses}m` : ""}`;
    return `${meses} mês${meses !== 1 ? "es" : ""}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Stats
  const totalAtivos = funcionarios.filter(f => f.ativo && !f.data_demissao).length;
  const custoMensal = funcionarios
    .filter(f => f.ativo && !f.data_demissao)
    .reduce((acc, f) => acc + (Number(f.salario_base) || 0) + (Number(f.vale_transporte) || 0) + (Number(f.vale_refeicao) || 0) + (Number(f.plano_saude) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Funcionários</h1>
          <p className="text-muted-foreground">Funcionários administrativos com salário fixo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/rh/relatorios">
              <BarChart3 className="h-4 w-4 mr-2" />
              Relatórios RH
            </Link>
          </Button>
          <Button onClick={() => { setSelectedFuncionario(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Funcionário
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAtivos}</p>
                <p className="text-xs text-muted-foreground">Funcionários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Wallet className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(custoMensal)}</p>
                <p className="text-xs text-muted-foreground">Custo Mensal Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="demitidos">Demitidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cargoFilter} onValueChange={setCargoFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Cargos</SelectItem>
                <SelectItem value="secretaria">Secretária</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="recepcionista">Recepcionista</SelectItem>
                <SelectItem value="auxiliar_limpeza">Aux. Limpeza</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departamentoFilter} onValueChange={setDepartamentoFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Departamentos</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="atendimento">Atendimento</SelectItem>
                <SelectItem value="limpeza">Limpeza</SelectItem>
                <SelectItem value="gerencia">Gerência</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      ) : filteredFuncionarios.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum funcionário encontrado"
          description={search || statusFilter !== "ativos" ? "Tente ajustar os filtros" : "Cadastre o primeiro funcionário"}
          action={{
            label: "Novo Funcionário",
            onClick: () => { setSelectedFuncionario(null); setDialogOpen(true); }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFuncionarios.map((funcionario) => (
            <Card key={funcionario.id} className={!funcionario.ativo || funcionario.data_demissao ? "opacity-60" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={funcionario.foto_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {funcionario.nome?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold truncate">{funcionario.nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          {funcionario.cargo === "outro" ? funcionario.cargo_customizado : cargosLabel[funcionario.cargo] || funcionario.cargo}
                        </p>
                      </div>
                      <Badge variant={funcionario.ativo && !funcionario.data_demissao ? "default" : "secondary"}>
                        {funcionario.ativo && !funcionario.data_demissao ? "Ativo" : "Desligado"}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 space-y-1 text-sm">
                      {funcionario.telefone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {funcionario.telefone}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{formatCurrency(funcionario.salario_base)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span>
                          {format(new Date(funcionario.data_admissao), "dd/MM/yyyy")}
                          <span className="text-muted-foreground ml-1">({getTempoEmpresa(funcionario.data_admissao)})</span>
                        </span>
                      </div>
                    </div>

                    {(funcionario.vale_transporte > 0 || funcionario.vale_refeicao > 0 || funcionario.plano_saude > 0) && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Benefícios:</p>
                        <div className="flex flex-wrap gap-2">
                          {funcionario.vale_transporte > 0 && (
                            <Badge variant="outline" className="text-xs">
                              VT: {formatCurrency(funcionario.vale_transporte)}
                            </Badge>
                          )}
                          {funcionario.vale_refeicao > 0 && (
                            <Badge variant="outline" className="text-xs">
                              VR: {formatCurrency(funcionario.vale_refeicao)}
                            </Badge>
                          )}
                          {funcionario.plano_saude > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Saúde: {formatCurrency(funcionario.plano_saude)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {funcionario.pix_chave && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <CreditCard className="h-3 w-3" />
                        PIX: {funcionario.pix_chave}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(funcionario)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/rh/ponto?funcionario=${funcionario.id}`}>
                      <Clock className="h-3 w-3 mr-1" />
                      Ponto
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/rh/ferias?funcionario=${funcionario.id}`}>
                      <Calendar className="h-3 w-3 mr-1" />
                      Férias
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <FileText className="h-4 w-4 mr-2" />
                        Documentos
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Ocorrências
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <History className="h-4 w-4 mr-2" />
                        Histórico Pagamentos
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {funcionario.ativo && !funcionario.data_demissao && (
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setFuncionarioToDesligar(funcionario);
                            setDesligarDialogOpen(true);
                          }}
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Desligar Funcionário
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <FuncionarioFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        funcionario={selectedFuncionario}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["funcionarios"] })}
      />

      <AlertDialog open={desligarDialogOpen} onOpenChange={setDesligarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desligar Funcionário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desligar {funcionarioToDesligar?.nome}? 
              Esta ação registrará a data de demissão como hoje.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDesligar} className="bg-destructive text-destructive-foreground">
              Confirmar Desligamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
