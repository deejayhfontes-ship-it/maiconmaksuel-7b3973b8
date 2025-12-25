import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FuncionarioFormDialog } from "@/components/rh/FuncionarioFormDialog";
import { format, addYears, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { 
  Users, DollarSign, CheckCircle, Calendar, Plus, Search, 
  Edit, Clock, Plane, Eye, Download, AlertTriangle, FileText
} from "lucide-react";

const cargosLabel: Record<string, string> = {
  secretaria: "Secretária",
  gerente: "Gerente",
  recepcionista: "Recepcionista",
  auxiliar_limpeza: "Aux. Limpeza",
  outro: "Outro",
};

export default function GestaoRH() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cargoFilter, setCargoFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<any>(null);

  // Fetch funcionários
  const { data: funcionarios = [], refetch: refetchFuncionarios } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .eq("ativo", true)
        .is("data_demissao", null)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Fetch pontos de hoje
  const { data: pontosHoje = [] } = useQuery({
    queryKey: ["pontos-hoje"],
    queryFn: async () => {
      const hoje = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("ponto_funcionarios")
        .select("*, funcionario:funcionarios(*)")
        .eq("data", hoje);
      if (error) throw error;
      return data;
    },
  });

  // Fetch folhas de pagamento
  const { data: folhas = [] } = useQuery({
    queryKey: ["folhas-pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folhas_pagamento")
        .select("*, itens:itens_folha_pagamento(count)")
        .order("mes_referencia", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  // Fetch férias
  const { data: ferias = [] } = useQuery({
    queryKey: ["ferias-funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferias_funcionarios")
        .select("*, funcionario:funcionarios(*)")
        .order("data_inicio_ferias", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const calcularPeriodoAquisitivo = (dataAdmissao: string) => {
    const admissao = new Date(dataAdmissao);
    const hoje = new Date();
    const anosCompletos = Math.floor(differenceInDays(hoje, admissao) / 365);
    const inicioAtual = addYears(admissao, anosCompletos);
    const fimAtual = addYears(admissao, anosCompletos + 1);
    return {
      inicio: inicioAtual,
      fim: fimAtual,
      diasRestantes: differenceInDays(fimAtual, hoje),
    };
  };

  // Stats
  const totalFuncionarios = funcionarios.length;
  const custoMensal = funcionarios.reduce((acc, f) => 
    acc + (Number(f.salario_base) || 0) + (Number(f.vale_transporte) || 0) + 
    (Number(f.vale_refeicao) || 0) + (Number(f.plano_saude) || 0), 0);
  
  const presentes = pontosHoje.filter(p => !p.falta).length;
  const percentPresenca = totalFuncionarios > 0 ? Math.round((presentes / totalFuncionarios) * 100) : 0;

  const feriasVencendo = funcionarios.filter(f => {
    const periodo = calcularPeriodoAquisitivo(f.data_admissao);
    return periodo.diasRestantes <= 60 && periodo.diasRestantes > 0;
  });

  // Filtros
  const filteredFuncionarios = funcionarios.filter((f) => {
    const matchesSearch = f.nome.toLowerCase().includes(search.toLowerCase()) || f.cpf?.includes(search);
    const matchesCargo = cargoFilter === "todos" || f.cargo === cargoFilter;
    return matchesSearch && matchesCargo;
  }).slice(0, 4);

  // Ponto data
  const pontoData = funcionarios.map(f => {
    const ponto = pontosHoje.find(p => p.funcionario_id === f.id);
    return { funcionario: f, ponto };
  });

  const handleEdit = (funcionario: any) => {
    setSelectedFuncionario(funcionario);
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "rascunho":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">📝 Rascunho</Badge>;
      case "aprovada":
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">✓ Aprovada</Badge>;
      case "paga":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">✅ Paga</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de RH</h1>
        <p className="text-muted-foreground">Administração de funcionários e folha de pagamento</p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Funcionários Ativos</p>
            <p className="text-3xl font-bold text-foreground">{totalFuncionarios}</p>
            <p className="text-sm text-green-500 font-medium mt-1">Equipe completa</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Folha Mensal</p>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(custoMensal).replace("R$", "R$ ")}</p>
            <p className="text-sm text-green-500 font-medium mt-1">Custo total</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Presença Hoje</p>
            <p className="text-3xl font-bold text-foreground">{percentPresenca}%</p>
            <p className="text-sm text-muted-foreground font-medium mt-1">{presentes} de {totalFuncionarios} presentes</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Férias Vencendo</p>
            <p className="text-3xl font-bold text-foreground">{feriasVencendo.length}</p>
            <p className="text-sm text-amber-500 font-medium mt-1">⚠️ Próximos 60 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Funcionários */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Funcionários</h2>
            <Button 
              onClick={() => { setSelectedFuncionario(null); setDialogOpen(true); }}
              className="bg-green-500 hover:bg-green-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={cargoFilter} onValueChange={setCargoFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos cargos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos cargos</SelectItem>
                <SelectItem value="secretaria">Secretária</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="recepcionista">Recepcionista</SelectItem>
                <SelectItem value="auxiliar_limpeza">Aux. Limpeza</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {filteredFuncionarios.map((funcionario) => (
              <div key={funcionario.id} className="border rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                <Avatar className="h-20 w-20 mx-auto mb-3">
                  <AvatarImage src={funcionario.foto_url || undefined} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-green-500 to-green-600 text-white">
                    {funcionario.nome?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold text-foreground">{funcionario.nome?.split(" ")[0]}</p>
                <p className="text-sm text-muted-foreground mb-2">
                  {funcionario.cargo === "outro" ? funcionario.cargo_customizado : cargosLabel[funcionario.cargo] || funcionario.cargo}
                </p>
                <p className="font-semibold text-foreground mb-2">{formatCurrency(funcionario.salario_base)}</p>
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30 mb-3">● Ativo</Badge>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleEdit(funcionario)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/rh/ponto?funcionario=${funcionario.id}`}>
                      <Clock className="h-3 w-3 mr-1" />
                      Ponto
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/rh/ferias?funcionario=${funcionario.id}`}>
                      <Plane className="h-3 w-3 mr-1" />
                      Férias
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link to="/rh/funcionarios">Ver Todos Funcionários</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Seção Ponto */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Ponto Hoje</h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <Button asChild>
              <Link to="/rh/ponto">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Ponto
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Entrada</TableHead>
                  <TableHead className="text-center">Almoço</TableHead>
                  <TableHead className="text-center">Retorno</TableHead>
                  <TableHead className="text-center">Saída</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pontoData.slice(0, 5).map(({ funcionario, ponto }) => (
                  <TableRow key={funcionario.id}>
                    <TableCell className="font-medium">{funcionario.nome}</TableCell>
                    <TableCell className="text-center">{ponto?.entrada_manha || "--:--"}</TableCell>
                    <TableCell className="text-center">{ponto?.saida_almoco || "--:--"}</TableCell>
                    <TableCell className="text-center">{ponto?.entrada_tarde || "--:--"}</TableCell>
                    <TableCell className="text-center">{ponto?.saida || "--:--"}</TableCell>
                    <TableCell className="text-center">
                      {ponto ? (
                        ponto.falta ? (
                          <Badge variant="destructive">❌ Falta</Badge>
                        ) : ponto.saida ? (
                          <Badge className="bg-green-500/20 text-green-600">✅ {ponto.horas_trabalhadas?.toFixed(0) || 8}h</Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-600">🟡 Em andamento</Badge>
                        )
                      ) : (
                        <Badge variant="secondary">Sem registro</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/rh/ponto">Ver Calendário Mensal</Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/rh/relatorios">Relatório de Ponto</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção Folha de Pagamento */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Folha de Pagamento</h2>
            <Button asChild>
              <Link to="/rh/folha-pagamento">
                <Plus className="h-4 w-4 mr-2" />
                Processar Nova Folha
              </Link>
            </Button>
          </div>

          <div className="space-y-3 mb-4">
            {folhas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma folha processada ainda</p>
              </div>
            ) : (
              folhas.map((folha) => (
                <div key={folha.id} className="border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {format(new Date(folha.mes_referencia), "MMMM/yyyy", { locale: ptBR }).toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {folha.itens?.[0]?.count || 0} funcionários • {formatCurrency(folha.valor_total_liquido || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(folha.status)}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/rh/folha-pagamento">
                          <Eye className="h-4 w-4 mr-1" />
                          Detalhes
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link to="/rh/folha-pagamento">Ver Histórico Completo</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Seção Férias */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Gestão de Férias</h2>
            <Button asChild>
              <Link to="/rh/ferias">
                <Plus className="h-4 w-4 mr-2" />
                Programar Férias
              </Link>
            </Button>
          </div>

          {feriasVencendo.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <div>
                <p className="font-semibold text-amber-600">ATENÇÃO</p>
                <p className="text-sm text-muted-foreground">{feriasVencendo.length} funcionário(s) com férias vencendo nos próximos 60 dias</p>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4">
            {funcionarios.slice(0, 3).map((funcionario) => {
              const periodo = calcularPeriodoAquisitivo(funcionario.data_admissao);
              const feriasProgramadas = ferias.find(f => f.funcionario_id === funcionario.id && f.status === "programadas");
              const isVencendo = periodo.diasRestantes <= 60 && periodo.diasRestantes > 0;

              return (
                <div key={funcionario.id} className="border rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{funcionario.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Período: {format(periodo.inicio, "dd/MM/yyyy")} - {format(periodo.fim, "dd/MM/yyyy")}
                      </p>
                      <p className="text-sm text-foreground">Direito: 30 dias | Gozados: 0 dias</p>
                    </div>
                    {feriasProgramadas ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">✅ Programadas</Badge>
                    ) : isVencendo ? (
                      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">⚠️ Vence em {periodo.diasRestantes} dias</Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">✓ Em dia</Badge>
                    )}
                  </div>
                  <Button className="w-full" variant={feriasProgramadas ? "outline" : "default"} asChild>
                    <Link to={`/rh/ferias?funcionario=${funcionario.id}`}>
                      {feriasProgramadas ? "Ver Detalhes" : "Programar Agora"}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link to="/rh/ferias">Ver Calendário Anual</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Dialog Funcionário */}
      <FuncionarioFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        funcionario={selectedFuncionario}
        onSuccess={() => refetchFuncionarios()}
      />
    </div>
  );
}
